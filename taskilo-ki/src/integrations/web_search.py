"""
TASKILO WEB SEARCH SERVICE
===========================
Durchsucht offizielle deutsche Steuer- und Finanzquellen direkt.
KEINE Google-Abhängigkeit - eigenständiges Scraping!

Quellen (direkt gescraped):
- BMF.de (Bundesfinanzministerium - offizielle Steuerinfos)
- dejure.org (Gesetzestexte)
- gesetze-im-internet.de (Bundesgesetze)
- IHK.de (Wirtschaftsinfos)
- haufe.de (Steuernews)
- DuckDuckGo HTML (Fallback, kein API-Key nötig)
"""

import asyncio
import aiohttp
import hashlib
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, urljoin
import re
import logging

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Einzelnes Suchergebnis"""
    title: str
    url: str
    snippet: str
    source: str  # Quelle: google, bmf, ihk, etc.
    date: Optional[date] = None
    relevance_score: float = 0.5
    content: Optional[str] = None  # Volltext falls gescraped
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
            "source": self.source,
            "date": self.date.isoformat() if self.date else None,
            "relevance_score": self.relevance_score,
            "content": self.content[:500] if self.content else None,
            "metadata": self.metadata,
        }


@dataclass
class WebSearchResponse:
    """Gesamte Suchantwort"""
    query: str
    results: List[SearchResult]
    total_found: int
    search_time_ms: int
    sources_used: List[str]
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "results": [r.to_dict() for r in self.results],
            "total_found": self.total_found,
            "search_time_ms": self.search_time_ms,
            "sources_used": self.sources_used,
            "timestamp": self.timestamp.isoformat(),
        }


class WebSearchService:
    """
    Web-Suchservice für Steuer- und Finanzinformationen.
    
    Features:
    - Multi-Source-Suche (Google, BMF, IHK, etc.)
    - Intelligent Scraping für Volltext
    - Caching zur Performance-Optimierung
    - Relevanz-Scoring basierend auf Kontext
    """
    
    # Vertrauenswürdige Quellen für Steuerinformationen
    TRUSTED_SOURCES = {
        "bundesfinanzministerium.de": {"trust": 1.0, "type": "official"},
        "dejure.org": {"trust": 0.95, "type": "legal"},
        "gesetze-im-internet.de": {"trust": 1.0, "type": "legal"},
        "ihk.de": {"trust": 0.9, "type": "business"},
        "haufe.de": {"trust": 0.85, "type": "expert"},
        "steuerberater.de": {"trust": 0.8, "type": "expert"},
        "steuertipps.de": {"trust": 0.75, "type": "info"},
        "finanztip.de": {"trust": 0.8, "type": "info"},
        "elster.de": {"trust": 1.0, "type": "official"},
        "smartsteuer.de": {"trust": 0.75, "type": "service"},
    }
    
    # Steuer-Keywords für Relevanz-Scoring
    TAX_KEYWORDS = {
        "high": [
            "steuer", "absetzen", "finanzamt", "einkommensteuer", "umsatzsteuer",
            "gewerbesteuer", "kleinunternehmer", "vorsteuer", "betriebsausgaben",
            "abschreibung", "afa", "steuererklärung", "elster", "§", "paragraph",
            "gesetz", "bmf", "urteil", "bfh"
        ],
        "medium": [
            "sparen", "optimierung", "frist", "termin", "pflicht", "anmeldung",
            "vorauszahlung", "bescheid", "einspruch", "freibetrag", "pauschale"
        ],
        "low": [
            "geld", "firma", "unternehmen", "selbstständig", "freiberufler"
        ]
    }
    
    def __init__(
        self,
        cache_dir: str = "/opt/taskilo/cache/web-search",
        cache_ttl_hours: int = 24,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        await self._init_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close_session()
    
    async def _init_session(self):
        if self._session is None:
            # Nutze einen echten Browser User-Agent (manche Seiten blockieren Bots)
            self._session = aiohttp.ClientSession(
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                }
            )
    
    async def _close_session(self):
        if self._session:
            await self._session.close()
            self._session = None
    
    async def _get_response_text(self, response: aiohttp.ClientResponse) -> str:
        """Liest Response-Text mit Encoding-Fallback (UTF-8 → Latin-1 → ignore)"""
        try:
            return await response.text(encoding='utf-8')
        except UnicodeDecodeError:
            try:
                # Viele deutsche Seiten nutzen noch Latin-1
                raw = await response.read()
                return raw.decode('latin-1')
            except Exception:
                # Letzte Rettung: ignoriere ungültige Zeichen
                raw = await response.read()
                return raw.decode('utf-8', errors='ignore')
    
    def _get_cache_key(self, query: str) -> str:
        """Generiert Cache-Key für Query"""
        return hashlib.sha256(query.lower().strip().encode()).hexdigest()[:16]
    
    def _get_cached(self, query: str) -> Optional[WebSearchResponse]:
        """Holt gecachte Suchergebnisse"""
        cache_key = self._get_cache_key(query)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file) as f:
                    data = json.load(f)
                    cached_time = datetime.fromisoformat(data["timestamp"])
                    
                    # Prüfe TTL
                    if datetime.now() - cached_time < self.cache_ttl:
                        results = [
                            SearchResult(
                                title=r["title"],
                                url=r["url"],
                                snippet=r["snippet"],
                                source=r["source"],
                                date=date.fromisoformat(r["date"]) if r.get("date") else None,
                                relevance_score=r.get("relevance_score", 0.5),
                                content=r.get("content"),
                                metadata=r.get("metadata", {}),
                            )
                            for r in data["results"]
                        ]
                        return WebSearchResponse(
                            query=data["query"],
                            results=results,
                            total_found=data["total_found"],
                            search_time_ms=data["search_time_ms"],
                            sources_used=data["sources_used"],
                            timestamp=cached_time,
                        )
            except Exception:
                pass
        return None
    
    def _save_to_cache(self, response: WebSearchResponse):
        """Speichert Suchergebnisse im Cache"""
        cache_key = self._get_cache_key(response.query)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        with open(cache_file, "w") as f:
            json.dump(response.to_dict(), f, ensure_ascii=False, indent=2)
    
    def _calculate_relevance(self, text: str, query: str) -> float:
        """Berechnet Relevanz-Score basierend auf Keywords"""
        text_lower = text.lower()
        query_lower = query.lower()
        score = 0.0
        
        # Query-Match
        query_words = query_lower.split()
        for word in query_words:
            if word in text_lower:
                score += 0.2
        
        # Keyword-Match
        for keyword in self.TAX_KEYWORDS["high"]:
            if keyword in text_lower:
                score += 0.1
        
        for keyword in self.TAX_KEYWORDS["medium"]:
            if keyword in text_lower:
                score += 0.05
        
        return min(1.0, score)
    
    def _get_source_trust(self, url: str) -> float:
        """Gibt Trust-Score für eine URL zurück"""
        for domain, info in self.TRUSTED_SOURCES.items():
            if domain in url:
                return info["trust"]
        return 0.5  # Unknown sources
    
    async def search_duckduckgo(self, query: str, num_results: int = 10) -> List[SearchResult]:
        """
        Sucht über DuckDuckGo HTML (kein API-Key nötig).
        Fallback wenn direkte Quellen nicht ausreichen.
        """
        await self._init_session()
        
        results = []
        enhanced_query = f"{query} steuern deutschland site:bundesfinanzministerium.de OR site:dejure.org OR site:haufe.de"
        
        try:
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(enhanced_query)}"
            
            async with self._session.get(url, timeout=15) as response:
                if response.status != 200:
                    return results
                
                html = await self._get_response_text(response)
                soup = BeautifulSoup(html, "html.parser")
                
                for result_div in soup.find_all("div", class_="result", limit=num_results):
                    title_elem = result_div.find("a", class_="result__a")
                    snippet_elem = result_div.find("a", class_="result__snippet")
                    
                    if title_elem:
                        href = title_elem.get("href", "")
                        title = title_elem.get_text(strip=True)
                        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                        
                        result = SearchResult(
                            title=title,
                            url=href,
                            snippet=snippet,
                            source="duckduckgo",
                            relevance_score=self._calculate_relevance(
                                title + " " + snippet, query
                            ) * self._get_source_trust(href),
                        )
                        results.append(result)
                        
        except Exception as e:
            logger.warning(f"[WebSearch] DuckDuckGo-Suche fehlgeschlagen: {e}")
        
        return results
    
    async def scrape_bmf(self, query: str) -> List[SearchResult]:
        """
        Scrapt mehrere offizielle Steuerquellen.
        BMF nutzt JavaScript, daher nutzen wir alternative öffentliche Quellen.
        """
        await self._init_session()
        
        results = []
        
        # 1. gesetze-im-internet.de - Offizielle Gesetzestexte
        try:
            # Mapping von Keywords zu Gesetzeskürzeln
            gesetz_mapping = {
                "einkommensteuer": "estg",
                "einkommen": "estg",
                "lohnsteuer": "estg",
                "umsatzsteuer": "ustg",
                "mehrwertsteuer": "ustg",
                "mwst": "ustg",
                "gewerbesteuer": "gewstg",
                "körperschaftsteuer": "kstg",
                "abgabenordnung": "ao",
                "steuer": "estg",
            }
            
            query_lower = query.lower()
            target_gesetz = "estg"  # Default: Einkommensteuergesetz
            for keyword, gesetz in gesetz_mapping.items():
                if keyword in query_lower:
                    target_gesetz = gesetz
                    break
            
            gesetz_url = f"https://www.gesetze-im-internet.de/{target_gesetz}/index.html"
            
            async with self._session.get(gesetz_url, timeout=15) as response:
                if response.status == 200:
                    html = await self._get_response_text(response)
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Finde Titel des Gesetzes
                    title_elem = soup.find("h1") or soup.find("title")
                    title = title_elem.get_text(strip=True)[:100] if title_elem else target_gesetz.upper()
                    
                    result = SearchResult(
                        title=f"Gesetzestext: {title}",
                        url=gesetz_url,
                        snippet=f"Offizieller Gesetzestext auf gesetze-im-internet.de - Aktuelle Fassung",
                        source="gesetze-im-internet",
                        relevance_score=0.95,
                    )
                    results.append(result)
                    
        except Exception as e:
            logger.warning(f"[WebSearch] gesetze-im-internet.de Fehler: {e}")
        
        # 2. Finanzministerium Startseite als Fallback
        try:
            async with self._session.get("https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/steuern.html", timeout=15) as response:
                if response.status == 200:
                    result = SearchResult(
                        title="Bundesfinanzministerium - Thema Steuern",
                        url="https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/steuern.html",
                        snippet="Offizielle Informationen des Bundesfinanzministeriums zu Steuerthemen",
                        source="bmf",
                        relevance_score=0.9,
                    )
                    results.append(result)
        except Exception as e:
            pass
                                
        return results[:5]
    
    def _is_relevant_to_query(self, text: str, query: str) -> bool:
        """Prüft ob Text relevant zur Suchanfrage ist"""
        text_lower = text.lower()
        query_words = [w for w in query.lower().split() if len(w) > 2]
        
        matches = sum(1 for word in query_words if word in text_lower)
        return matches >= len(query_words) * 0.3 or matches >= 2
    
    async def scrape_dejure(self, query: str) -> List[SearchResult]:
        """Scrapt dejure.org für Gesetzestexte"""
        await self._init_session()
        
        results = []
        
        # Mapping für bekannte Steuergesetze
        gesetz_mapping = {
            "einkommensteuer": ("EStG", "Einkommensteuergesetz"),
            "einkommen": ("EStG", "Einkommensteuergesetz"),
            "lohnsteuer": ("EStG", "Einkommensteuergesetz"),
            "steuer sparen": ("EStG", "Einkommensteuergesetz"),
            "steuern sparen": ("EStG", "Einkommensteuergesetz"),
            "umsatzsteuer": ("UStG", "Umsatzsteuergesetz"),
            "mehrwertsteuer": ("UStG", "Umsatzsteuergesetz"),
            "mwst": ("UStG", "Umsatzsteuergesetz"),
            "vorsteuer": ("UStG", "Umsatzsteuergesetz"),
            "gewerbesteuer": ("GewStG", "Gewerbesteuergesetz"),
            "körperschaftsteuer": ("KStG", "Körperschaftsteuergesetz"),
            "abgabenordnung": ("AO", "Abgabenordnung"),
            "kleinunternehmer": ("UStG", "Umsatzsteuergesetz § 19"),
            "abschreibung": ("EStG", "Einkommensteuergesetz - AfA"),
            "steuer": ("EStG", "Einkommensteuergesetz"),
        }
        
        query_lower = query.lower()
        
        try:
            # Finde passendes Gesetz
            for keyword, (gesetz_kuerzel, gesetz_name) in gesetz_mapping.items():
                if keyword in query_lower:
                    url = f"https://dejure.org/gesetze/{gesetz_kuerzel}"
                    
                    async with self._session.get(url, timeout=15) as response:
                        if response.status == 200:
                            result = SearchResult(
                                title=f"dejure.org - {gesetz_name}",
                                url=url,
                                snippet=f"Vollständiger Gesetzestext des {gesetz_name} mit Paragraphen-Übersicht",
                                source="dejure",
                                relevance_score=0.9,
                            )
                            results.append(result)
                            break
            
            # Default: EStG wenn nichts passt
            if not results:
                result = SearchResult(
                    title="dejure.org - Einkommensteuergesetz (EStG)",
                    url="https://dejure.org/gesetze/EStG",
                    snippet="Vollständiger Gesetzestext des Einkommensteuergesetzes",
                    source="dejure",
                    relevance_score=0.85,
                )
                results.append(result)
                
        except Exception as e:
            logger.warning(f"[WebSearch] Dejure-Scraping fehlgeschlagen: {e}")
        
        return results
    
    async def scrape_finanztip(self, query: str) -> List[SearchResult]:
        """Scrapt finanztip.de für verständliche Steuer-Ratgeber"""
        await self._init_session()
        
        results = []
        
        # Bekannte Finanztip-Seiten zu Steuerthemen
        finanztip_pages = {
            "steuer": "https://www.finanztip.de/steuern/",
            "einkommensteuer": "https://www.finanztip.de/einkommensteuertarif/",
            "grundfreibetrag": "https://www.finanztip.de/grundfreibetrag/",
            "steuererklaerung": "https://www.finanztip.de/steuererklaerung/",
            "steuererklärung": "https://www.finanztip.de/steuererklaerung/",
            "werbungskosten": "https://www.finanztip.de/werbungskosten/",
            "homeoffice": "https://www.finanztip.de/homeoffice-pauschale/",
            "home office": "https://www.finanztip.de/homeoffice-pauschale/",
            "sonderausgaben": "https://www.finanztip.de/sonderausgaben/",
            "absetzen": "https://www.finanztip.de/werbungskosten/",
            "kleinunternehmer": "https://www.finanztip.de/kleinunternehmerregelung/",
        }
        
        query_lower = query.lower()
        matched_url = None
        
        for keyword, url in finanztip_pages.items():
            if keyword in query_lower:
                matched_url = url
                break
        
        if not matched_url:
            matched_url = "https://www.finanztip.de/steuern/"
        
        try:
            async with self._session.get(matched_url, timeout=15) as response:
                if response.status == 200:
                    html = await self._get_response_text(response)
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Hole Titel und Meta-Description
                    title_elem = soup.find("h1") or soup.find("title")
                    title = title_elem.get_text(strip=True)[:80] if title_elem else "Finanztip Steuer-Ratgeber"
                    
                    meta_desc = soup.find("meta", attrs={"name": "description"})
                    snippet = meta_desc.get("content", "")[:200] if meta_desc else "Unabhängiger Steuer-Ratgeber"
                    
                    result = SearchResult(
                        title=f"Finanztip: {title}",
                        url=matched_url,
                        snippet=snippet,
                        source="finanztip",
                        relevance_score=0.85,
                    )
                    results.append(result)
                    
        except Exception as e:
            logger.warning(f"[WebSearch] Finanztip-Scraping fehlgeschlagen: {e}")
        
        return results
    
    async def scrape_haufe(self, query: str) -> List[SearchResult]:
        """Scrapt haufe.de für aktuelle Steuernews"""
        await self._init_session()
        
        results = []
        
        # Haufe Steuern-Startseite hat strukturierte Teaser
        urls_to_try = [
            "https://www.haufe.de/steuern",
            f"https://www.haufe.de/suche?query={quote_plus(query)}&filter=steuern"
        ]
        
        try:
            for url in urls_to_try:
                async with self._session.get(url, timeout=15) as response:
                    if response.status != 200:
                        continue
                    
                    html = await self._get_response_text(response)
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Haufe nutzt "teaser-v2" Container
                    for teaser in soup.find_all("div", class_=re.compile(r"teaser-v2|article-highlight"), limit=10):
                        title_elem = teaser.find(class_=re.compile(r"teaser-v2__title|article-highlight__header"))
                        text_elem = teaser.find(class_=re.compile(r"teaser-v2__text"))
                        link_elem = teaser.find("a", href=True)
                        
                        if title_elem and link_elem:
                            title = title_elem.get_text(strip=True)
                            href = link_elem.get("href", "")
                            snippet = text_elem.get_text(strip=True)[:200] if text_elem else ""
                            
                            if title and len(title) > 5:
                                full_url = urljoin("https://www.haufe.de", href)
                                
                                # Prüfe Relevanz zur Query
                                if self._is_relevant_to_query(title + " " + snippet, query) or len(results) < 3:
                                    result = SearchResult(
                                        title=title,
                                        url=full_url,
                                        snippet=snippet,
                                        source="haufe",
                                        relevance_score=0.85,
                                    )
                                    results.append(result)
                    
                    if results:
                        break  # Genug Ergebnisse gefunden
                        
        except Exception as e:
            logger.warning(f"[WebSearch] Haufe-Scraping fehlgeschlagen: {e}")
        
        return results[:5]
    
    async def scrape_vlh(self, query: str) -> List[SearchResult]:
        """Scrapt VLH (Vereinigte Lohnsteuerhilfe) - verständliche Steuer-Artikel"""
        await self._init_session()
        
        results = []
        
        # VLH Steuer-ABC Mapping
        vlh_pages = {
            "kinderfreibetrag": "https://www.vlh.de/wissen-service/steuer-abc/kinderfreibetrag.html",
            "werbungskosten": "https://www.vlh.de/arbeiten-pendeln/beruf/werbungskosten.html",
            "steuererklärung": "https://www.vlh.de/wissen-service/steuer-abc/steuererklaerung-abgeben.html",
            "homeoffice": "https://www.vlh.de/arbeiten-pendeln/beruf/homeoffice-pauschale.html",
            "home office": "https://www.vlh.de/arbeiten-pendeln/beruf/homeoffice-pauschale.html",
            "pendlerpauschale": "https://www.vlh.de/arbeiten-pendeln/pendeln/pendlerpauschale.html",
            "sonderausgaben": "https://www.vlh.de/wissen-service/steuer-abc/sonderausgaben.html",
            "außergewöhnliche belastungen": "https://www.vlh.de/krankheit-pflege/krankheit/aussergewoehnliche-belastungen.html",
            "steuer": "https://www.vlh.de/wissen-service/steuer-abc.html",
        }
        
        query_lower = query.lower()
        matched_url = "https://www.vlh.de/wissen-service/steuer-abc.html"  # Default
        
        for keyword, url in vlh_pages.items():
            if keyword in query_lower:
                matched_url = url
                break
        
        try:
            async with self._session.get(matched_url, timeout=15) as response:
                if response.status == 200:
                    html = await self._get_response_text(response)
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Hole Titel
                    title_elem = soup.find("h1") or soup.find("title")
                    title = title_elem.get_text(strip=True)[:80] if title_elem else "VLH Steuer-Ratgeber"
                    
                    # Hole ersten Artikel-Absatz
                    intro = soup.find("p", class_=re.compile(r"intro|lead|text"))
                    snippet = intro.get_text(strip=True)[:200] if intro else "Verständliche Steuertipps von der VLH"
                    
                    result = SearchResult(
                        title=f"VLH: {title}",
                        url=matched_url,
                        snippet=snippet,
                        source="vlh",
                        relevance_score=0.85,
                    )
                    results.append(result)
                    
                    # Hole weitere Artikel von der Seite
                    for tile in soup.find_all("h3", class_=re.compile(r"tile__headline"), limit=5):
                        tile_title = tile.get_text(strip=True)
                        parent_link = tile.find_parent("a")
                        if parent_link and parent_link.get("href"):
                            href = parent_link.get("href")
                            full_url = f"https://www.vlh.de{href}" if href.startswith("/") else href
                            
                            result = SearchResult(
                                title=tile_title,
                                url=full_url,
                                snippet="",
                                source="vlh",
                                relevance_score=0.8,
                            )
                            results.append(result)
                            
        except Exception as e:
            logger.warning(f"[WebSearch] VLH-Scraping fehlgeschlagen: {e}")
        
        return results[:5]
    
    async def scrape_buzer(self, query: str) -> List[SearchResult]:
        """Scrapt buzer.de für Gesetzestexte mit Änderungshistorie"""
        await self._init_session()
        
        results = []
        
        # Mapping von Stichworten zu Gesetzes-IDs auf buzer.de
        gesetz_ids = {
            "einkommensteuer": ("4499", "EStG"),
            "einkommen": ("4499", "EStG"),
            "lohnsteuer": ("4499", "EStG"),
            "umsatzsteuer": ("4605", "UStG"),
            "mehrwertsteuer": ("4605", "UStG"),
            "gewerbesteuer": ("4622", "GewStG"),
            "körperschaftsteuer": ("4498", "KStG"),
            "abgabenordnung": ("4614", "AO"),
            "steuer": ("4499", "EStG"),  # Default
        }
        
        query_lower = query.lower()
        gesetz_id, gesetz_name = "4499", "EStG"  # Default: EStG
        
        for keyword, (gid, gname) in gesetz_ids.items():
            if keyword in query_lower:
                gesetz_id, gesetz_name = gid, gname
                break
        
        try:
            url = f"https://www.buzer.de/gesetz/{gesetz_id}/index.htm"
            
            async with self._session.get(url, timeout=15) as response:
                if response.status == 200:
                    html = await self._get_response_text(response)
                    soup = BeautifulSoup(html, "html.parser")
                    
                    title_elem = soup.find("title")
                    title = title_elem.get_text(strip=True) if title_elem else gesetz_name
                    
                    result = SearchResult(
                        title=f"buzer.de - {title} (mit Änderungshistorie)",
                        url=url,
                        snippet=f"Kompletter Gesetzestext mit allen Änderungen und Historie für {gesetz_name}",
                        source="buzer",
                        relevance_score=0.9,
                    )
                    results.append(result)
                    
        except Exception as e:
            logger.warning(f"[WebSearch] buzer.de-Scraping fehlgeschlagen: {e}")
        
        return results
    
    async def scrape_url(self, url: str) -> Optional[str]:
        """
        Scrapt den Volltext einer URL.
        Nützlich um Details zu einem Suchergebnis zu holen.
        """
        await self._init_session()
        
        try:
            async with self._session.get(url, timeout=15) as response:
                if response.status != 200:
                    return None
                
                html = await self._get_response_text(response)
                soup = BeautifulSoup(html, "html.parser")
                
                # Entferne Script und Style
                for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                    script.decompose()
                
                # Spezielle Selektoren für bekannte Seiten
                main_content = None
                
                if "haufe.de" in url:
                    # Haufe: Artikel-Content in article-body
                    main_content = soup.find("div", class_="article-body") or soup.find("article")
                elif "finanztip.de" in url:
                    # Finanztip: Content in article
                    main_content = soup.find("article") or soup.find("main")
                elif "vlh.de" in url:
                    # VLH: Content im Hauptbereich
                    main_content = soup.find("main") or soup.find("article")
                elif "bundesfinanzministerium.de" in url:
                    # BMF: Content-Bereich
                    main_content = soup.find("div", class_="content") or soup.find("main")
                elif "dejure.org" in url:
                    # dejure: Gesetzestext
                    main_content = soup.find("div", id="inhalt") or soup.find("article")
                else:
                    # Generisch
                    main_content = soup.find("main") or soup.find("article") or soup.find("body")
                
                if main_content:
                    text = main_content.get_text(separator="\n", strip=True)
                    # Bereinige Text
                    text = re.sub(r'\n{3,}', '\n\n', text)
                    text = re.sub(r' {2,}', ' ', text)
                    return text[:10000]  # Limit auf 10k Zeichen
        except Exception as e:
            logger.warning(f"[WebSearch] URL-Scraping fehlgeschlagen für {url}: {e}")
        
        return None
    
    async def search(
        self,
        query: str,
        num_results: int = 10,
        use_cache: bool = True,
        include_content: bool = False,
    ) -> WebSearchResponse:
        """
        Führt Multi-Source-Suche durch.
        
        Args:
            query: Suchanfrage
            num_results: Maximale Anzahl Ergebnisse
            use_cache: Cache nutzen
            include_content: Volltext scrapen (langsamer)
        
        Returns:
            WebSearchResponse mit allen Ergebnissen
        """
        import time
        start_time = time.time()
        
        # Check Cache
        if use_cache:
            cached = self._get_cached(query)
            if cached:
                return cached
        
        # Parallel alle Quellen durchsuchen (KEIN Google!)
        search_tasks = [
            self.scrape_bmf(query),             # Offizielle Gesetze (gesetze-im-internet.de)
            self.scrape_dejure(query),          # Gesetzestexte (dejure.org)
            self.scrape_buzer(query),           # Gesetze mit Änderungshistorie (buzer.de)
            self.scrape_haufe(query),           # Aktuelle Steuernews (haufe.de)
            self.scrape_finanztip(query),       # Verständliche Ratgeber (finanztip.de)
            self.scrape_vlh(query),             # VLH Steuer-ABC (vlh.de)
            self.search_duckduckgo(query, num_results // 3),  # Fallback für aktuelle News
        ]
        
        results_lists = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Ergebnisse zusammenführen
        all_results: List[SearchResult] = []
        sources_used = []
        source_names = ["gesetze-im-internet", "dejure", "buzer", "haufe", "finanztip", "vlh", "duckduckgo"]
        
        for i, results in enumerate(results_lists):
            if isinstance(results, Exception):
                logger.warning(f"[WebSearch] Quelle {source_names[i]} fehlgeschlagen: {results}")
                continue
            if results:
                sources_used.append(source_names[i])
                all_results.extend(results)
        
        # Nach Relevanz sortieren
        all_results.sort(key=lambda r: r.relevance_score, reverse=True)
        
        # Duplikate entfernen (basierend auf URL)
        seen_urls = set()
        unique_results = []
        for result in all_results:
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                unique_results.append(result)
        
        # Optional: Volltext scrapen für Top-Ergebnisse
        if include_content and unique_results:
            for result in unique_results[:3]:  # Top 3
                content = await self.scrape_url(result.url)
                if content:
                    result.content = content
        
        # Auf num_results limitieren
        final_results = unique_results[:num_results]
        
        search_time_ms = int((time.time() - start_time) * 1000)
        
        response = WebSearchResponse(
            query=query,
            results=final_results,
            total_found=len(all_results),
            search_time_ms=search_time_ms,
            sources_used=sources_used,
        )
        
        # Cache speichern
        if use_cache and final_results:
            self._save_to_cache(response)
        
        return response
    
    async def answer_tax_question(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Beantwortet eine Steuerfrage basierend auf Web-Recherche.
        
        Args:
            question: Die Steuerfrage
            context: Optionaler Kontext (Rechtsform, Umsatz, etc.)
        
        Returns:
            Dict mit Antwort und Quellen
        """
        # Suche durchführen
        search_response = await self.search(
            query=question,
            num_results=5,
            include_content=True,
        )
        
        if not search_response.results:
            return {
                "answer": "Leider konnte ich keine relevanten Informationen zu Ihrer Frage finden.",
                "confidence": 0.3,
                "sources": [],
            }
        
        # Baue Antwort aus den Top-Ergebnissen
        top_results = search_response.results[:3]
        
        # Extrahiere relevante Snippets
        answer_parts = []
        for result in top_results:
            if result.content:
                # Finde relevante Absätze im Content
                paragraphs = result.content.split("\n")
                for para in paragraphs:
                    if len(para) > 100 and self._is_relevant_paragraph(para, question):
                        answer_parts.append(para)
                        break
            elif result.snippet:
                answer_parts.append(result.snippet)
        
        formatted_answer = self._format_answer(question, answer_parts, top_results)
        
        return {
            "answer": formatted_answer,
            "confidence": min(0.95, top_results[0].relevance_score + 0.2),
            "sources": [
                {"title": r.title, "url": r.url, "relevance": r.relevance_score}
                for r in top_results
            ],
            "search_time_ms": search_response.search_time_ms,
        }
    
    def _is_relevant_paragraph(self, paragraph: str, question: str) -> bool:
        """Prüft ob ein Absatz relevant für die Frage ist"""
        question_words = set(question.lower().split())
        paragraph_words = set(paragraph.lower().split())
        
        # Mindestens 20% der Fragewörter sollten im Absatz vorkommen
        overlap = len(question_words & paragraph_words)
        return overlap >= len(question_words) * 0.2
    
    def _format_answer(
        self,
        question: str,
        answer_parts: List[str],
        sources: List[SearchResult]
    ) -> str:
        """Formatiert die Antwort aus den recherchierten Teilen"""
        # Falls keine answer_parts, nutze snippets
        if not answer_parts:
            answer_parts = [s.snippet for s in sources if s.snippet and len(s.snippet) > 30]
        
        if not answer_parts:
            return "Ich konnte keine spezifische Antwort finden. Bitte konsultieren Sie einen Steuerberater."
        
        # Kombiniere die besten Teile
        answer = " ".join(answer_parts[:3])
        
        # Kürze auf sinnvolle Länge
        if len(answer) > 1000:
            answer = answer[:1000] + "..."
        
        # Füge Quellenhinweis hinzu
        if sources:
            source_names = [s.source for s in sources[:2]]
            answer += f"\n\n(Quellen: {', '.join(set(source_names))})"
        
        return answer


# Globale Instanz
_web_search: Optional[WebSearchService] = None


def get_web_search() -> WebSearchService:
    """Gibt Singleton-Instanz zurück"""
    global _web_search
    if _web_search is None:
        _web_search = WebSearchService()
    return _web_search


async def search_tax_info(query: str, include_content: bool = False) -> WebSearchResponse:
    """Convenience-Funktion für Steuersuche"""
    async with WebSearchService() as service:
        return await service.search(query, include_content=include_content)


async def answer_tax_question(question: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """Convenience-Funktion für Frage-Antwort"""
    async with WebSearchService() as service:
        return await service.answer_tax_question(question, context)
