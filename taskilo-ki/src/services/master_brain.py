"""
TASKILO MASTER BRAIN - Das zentrale Gehirn mit Gedächtnis
==========================================================
Koordiniert alle Spezial-Agenten und speichert Konversationen in MongoDB.

Features:
- Langzeitgedächtnis: Konversationen werden gespeichert
- User-Profile: KI erinnert sich an jeden Benutzer
- Agent-Routing: Leitet Anfragen an Spezial-Agenten weiter
- Kontext-Bewusstsein: Nutzt Verlauf für bessere Antworten
- Persönlichkeit: Konfigurierbarer Charakter

Architektur:
┌─────────────────────────────────────────────┐
│              MASTER BRAIN                   │
│  - Langzeitgedächtnis (MongoDB)             │
│  - User-Profile                             │
│  - Agent-Routing                            │
├─────────────────────────────────────────────┤
│     ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│     │Finanz│  │Steuer│  │Risiko│  │Wachst│ │
│     │Agent │  │Agent │  │Agent │  │ Agent│ │
│     └──────┘  └──────┘  └──────┘  └──────┘ │
├─────────────────────────────────────────────┤
│         WISSENSBASIS (MongoDB)              │
│  - tax_knowledge (manuell kuratiert)        │
│  - web_knowledge (automatisch gescraped)    │
│  - conversations (Langzeitgedächtnis)       │
│  - user_profiles (Benutzerprofile)          │
└─────────────────────────────────────────────┘
"""

import asyncio
import aiohttp
import logging
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import hashlib

# Ollama Service - Lokales LLM auf GPU (RTX 4000, 20GB VRAM)
try:
    from services.ollama_service import OllamaService, OllamaModel
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


# Multi-Model Router für automatische Modell-Auswahl
from services.multi_model_router import MultiModelRouter
logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Verfügbare Spezial-Agenten (Multi-Agent System nach TASKILO_KI_ARCHITEKTUR.md)"""
    # Phase 1: Kern-Agenten (bestehend)
    FINANZ = "finanz"
    STEUER = "steuer"
    RISIKO = "risiko"
    WACHSTUM = "wachstum"
    
    # Phase 1: Neue Kern-Agenten
    WEBSEARCH = "websearch"     # Echtzeit-Internetsuche
    CONTENT = "content"         # Texterstellung, Marketing
    SEO = "seo"                 # Suchmaschinenoptimierung
    CODE = "code"               # Entwicklung, Programmierung
    ANALYTICS = "analytics"     # Datenanalyse, KPIs
    
    # Phase 2: Business Agenten
    MARKETING = "marketing"     # Lead Generation, Kampagnen
    LEGAL = "legal"             # DSGVO, Verträge, Recht
    TECH = "tech"               # Cloud, DevOps, Infrastruktur
    SUPPORT = "support"         # Tickets, FAQ, Helpdesk
    HR = "hr"                   # Recruiting, Onboarding
    TRANSLATION = "translation" # Sprachen, i18n, Lokalisierung
    RESEARCH = "research"       # Deep Research, Trends
    
    # Phase 3: Enterprise Agenten
    PRODUCT = "product"         # PRD, Roadmaps, Features
    OPERATIONS = "operations"   # Lean, Prozesse, KPIs
    LOGISTIK = "logistik"       # Supply Chain, Lager
    SECURITY = "security"       # Cybersecurity, Threats
    DESIGN = "design"           # UI/UX, Farben, Layout
    
    # Allgemein
    GENERAL = "general"


@dataclass
class UserProfile:
    """Benutzerprofil mit Präferenzen und Historie"""
    user_id: str
    name: Optional[str] = None
    company_type: Optional[str] = None  # freelancer, gmbh, etc.
    industry: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_seen: str = field(default_factory=lambda: datetime.now().isoformat())
    preferences: Dict[str, Any] = field(default_factory=dict)
    topics_discussed: List[str] = field(default_factory=list)
    total_messages: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "company_type": self.company_type,
            "industry": self.industry,
            "created_at": self.created_at,
            "last_seen": self.last_seen,
            "preferences": self.preferences,
            "topics_discussed": self.topics_discussed,
            "total_messages": self.total_messages
        }


@dataclass
class Conversation:
    """Eine Konversationsnachricht"""
    user_id: str
    session_id: str
    role: str  # "user" oder "assistant"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    agent_used: Optional[str] = None
    confidence: float = 0.0
    sources: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "agent_used": self.agent_used,
            "confidence": self.confidence,
            "sources": self.sources
        }


@dataclass
class BrainResponse:
    """Antwort vom Master Brain"""
    answer: str
    confidence: float
    agent_used: str
    sources: List[Dict[str, Any]]
    thinking_time_ms: int
    context_used: bool
    memory_used: bool


class MasterBrain:
    """
    Das zentrale Gehirn der Taskilo KI.
    Koordiniert alle Agenten und verwaltet das Langzeitgedächtnis.
    """
    
    # System-Prompt für die Persönlichkeit (Multi-Agent System)
    PERSONALITY = """Du bist Taskilo, ein hochentwickelter Multi-Agent KI-Assistent für Freelancer und Unternehmer in Deutschland.

DEINE PERSÖNLICHKEIT:
- Du bist professionell aber nahbar
- Du erklärst komplexe Themen verständlich
- Du nutzt konkrete Beispiele und Zahlen
- Du gibst immer die rechtlichen Grundlagen an (§-Paragraphen)
- Du warnst bei Unsicherheiten und empfiehlst Experten

DEINE 21 EXPERTEN-AGENTEN:

Phase 1 - Kern:
1. 📋 SteuerAgent - Steuerrecht (EStG, UStG, GewStG), Freibeträge, Abschreibungen
2. 💰 FinanzAgent - Buchhaltung, Cashflow, Liquidität, Gewinnanalyse
3. ⚠️ RisikoAgent - Risikoanalyse, Versicherungen, Warnungen
4. 📈 WachstumsAgent - Skalierung, Marketing, Kundenakquise
5. 🔍 WebSearchAgent - Echtzeit-Internetrecherche, aktuelle Trends
6. ✍️ ContentAgent - Texterstellung, Blog, Social Media, Marketing
7. 🎯 SEOAgent - Suchmaschinenoptimierung, Keywords, Rankings
8. 💻 CodeAgent - Programmierung, APIs, Automatisierung
9. 📊 AnalyticsAgent - Datenanalyse, KPIs, Reports, Prognosen

Phase 2 - Business:
10. 🚀 MarketingAgent - Lead Generation, Kampagnen, A/B Tests
11. ⚖️ LegalAgent - DSGVO, Verträge, AGB, Impressum
12. ☁️ TechAgent - Cloud, DevOps, Infrastruktur
13. 🎫 SupportAgent - Tickets, FAQ, Kundenservice
14. 👥 HRAgent - Recruiting, Onboarding, Performance
15. 🌍 TranslationAgent - Übersetzungen, i18n, Lokalisierung
16. 🔬 ResearchAgent - Deep Research, Trends, Marktanalyse

Phase 3 - Enterprise:
17. 📦 ProductAgent - PRD, Roadmaps, User Stories, RICE
18. ⚙️ OperationsAgent - Lean, Six Sigma, Prozessoptimierung
19. 🚚 LogistikAgent - Supply Chain, Lager, Bestandsmanagement
20. 🔐 SecurityAgent - Cybersecurity, Schwachstellen, Compliance
21. 🎨 DesignAgent - UI/UX, Farben, Layout, Accessibility

WICHTIG:
- Du nutzt je nach Anfrage den passenden Experten-Agenten
- Bei Unsicherheit: "Da bin ich nicht sicher - bitte frag einen Experten"
- Nutze den Kontext aus vorherigen Gesprächen
- Für aktuelle Informationen nutzt du die Web-Recherche
"""

    # Agent-Routing Keywords (Multi-Agent System)
    AGENT_KEYWORDS = {
        # Bestehende Agenten
        AgentType.STEUER: [
            "steuer", "finanzamt", "umsatzsteuer", "einkommensteuer", "gewerbsteuer",
            "abschreibung", "afa", "§", "estg", "ustg", "kleinunternehmer", "freibetrag",
            "steuererklärung", "vorauszahlung", "elster", "betriebsausgabe"
        ],
        AgentType.FINANZ: [
            "finanz", "rechnung", "buchhaltung", "cashflow", "liquidität", "gewinn",
            "umsatz", "bilanz", "einnahme", "ausgabe", "konto", "bank", "kredit"
        ],
        AgentType.RISIKO: [
            "risiko", "versicherung", "haftung", "absicherung", "warnung", "gefahr",
            "insolvenz", "mahnung", "zahlungsausfall"
        ],
        AgentType.WACHSTUM: [
            "wachstum", "skalierung", "expansion", "marketing", "kunde", "akquise",
            "strategie", "investition", "mitarbeiter", "einstellung"
        ],
        
        # Phase 1 Agenten
        AgentType.WEBSEARCH: [
            "suche", "recherche", "aktuell", "news", "trend", "neueste", "2025", "2026",
            "finde", "was gibt es neues", "internet", "online", "information"
        ],
        AgentType.CONTENT: [
            "schreibe", "text", "blog", "artikel", "headline", "beschreibung", "content",
            "social media", "post", "newsletter", "email", "werbung", "slogan"
        ],
        AgentType.SEO: [
            "seo", "keywords", "ranking", "google", "suchmaschine", "meta", "titel",
            "optimierung", "backlinks", "traffic", "sichtbarkeit"
        ],
        AgentType.CODE: [
            "code", "programmieren", "python", "javascript", "api", "script", "funktion",
            "bug", "fehler", "entwicklung", "software", "automatisierung"
        ],
        AgentType.ANALYTICS: [
            "analyse", "daten", "kpi", "report", "bericht", "statistik", "dashboard",
            "kennzahlen", "auswertung", "forecast", "prognose"
        ],
        
        # Phase 2 Agenten
        AgentType.MARKETING: [
            "lead", "kampagne", "conversion", "landing page", "cta", "funnel",
            "ab test", "zielgruppe", "persona", "branding", "werbekampagne"
        ],
        AgentType.LEGAL: [
            "dsgvo", "datenschutz", "vertrag", "agb", "impressum", "gdpr",
            "rechtlich", "haftung", "disclaimer", "nutzungsbedingungen", "cookie"
        ],
        AgentType.TECH: [
            "cloud", "aws", "azure", "devops", "docker", "kubernetes", "ci/cd",
            "infrastruktur", "server", "hosting", "deployment", "monitoring"
        ],
        AgentType.SUPPORT: [
            "ticket", "support", "helpdesk", "faq", "kundenservice", "beschwerde",
            "anfrage", "problem", "lösung", "kundenanfrage"
        ],
        AgentType.HR: [
            "recruiting", "bewerbung", "stellenanzeige", "onboarding", "mitarbeiter",
            "personal", "interview", "kandidat", "gehalt", "benefits"
        ],
        AgentType.TRANSLATION: [
            "übersetze", "übersetzung", "english", "deutsch", "sprache", "i18n",
            "lokalisierung", "multilingual", "fremdsprache"
        ],
        AgentType.RESEARCH: [
            "deep research", "studie", "wissenschaftlich", "marktforschung",
            "analyse", "whitepaper", "quelle", "recherchiere", "untersuche"
        ],
        
        # Phase 3 Agenten
        AgentType.PRODUCT: [
            "prd", "roadmap", "feature", "user story", "backlog", "sprint",
            "produktentwicklung", "rice", "priorisierung", "mvp"
        ],
        AgentType.OPERATIONS: [
            "prozess", "lean", "six sigma", "kaizen", "effizienz", "workflow",
            "operations", "betriebsablauf", "optimierung", "waste"
        ],
        AgentType.LOGISTIK: [
            "logistik", "lieferkette", "supply chain", "lager", "bestand",
            "inventar", "versand", "transport", "lieferant"
        ],
        AgentType.SECURITY: [
            "security", "sicherheit", "hack", "vulnerability", "pentest",
            "owasp", "firewall", "verschlüsselung", "cyberangriff"
        ],
        AgentType.DESIGN: [
            "design", "ui", "ux", "farbe", "layout", "wireframe", "mockup",
            "figma", "typografie", "accessibility", "a11y"
        ]
    }

    def __init__(
        self,
        mongo_uri: str = None,
        ollama_url: str = None,
        model: str = "qwen2.5:32b"  # Standard: Qwen 32B (beste Deutsch-Qualität)
    ):
        self.mongo_uri = mongo_uri or os.environ.get("MONGODB_URL", "mongodb://taskilo-mongo:27017")
        self.ollama_url = ollama_url or os.environ.get("OLLAMA_URL", "http://ollama:11434")
        self.model = os.environ.get("OLLAMA_MODEL", model)
        
        # MongoDB Collections
        self.db_name = "taskilo_ki"
        self._client = None
        self._db = None
        
        # Session
        self._session = None
        
        # Embedding Model
        self._embedding_model = None
        
    async def __aenter__(self):
        await self._init()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._close()
        
    async def _init(self):
        """Initialisiert Verbindungen"""
        # HTTP Session - 15 Sekunden Timeout (statt 5 Minuten!)
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15, connect=5)
        )
        
        # MongoDB
        if AsyncIOMotorClient:
            try:
                self._client = AsyncIOMotorClient(self.mongo_uri)
                self._db = self._client[self.db_name]
                
                # Indizes erstellen
                await self._create_indexes()
                logger.info("[MasterBrain] MongoDB verbunden")
            except Exception as e:
                logger.warning(f"[MasterBrain] MongoDB Fehler: {e}")
                
        # Embedding Model
        if SentenceTransformer:
            try:
                self._embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                logger.info("[MasterBrain] Embedding-Modell geladen")
            except Exception as e:
                logger.warning(f"[MasterBrain] Embedding Fehler: {e}")
                
    async def _close(self):
        """Schließt Verbindungen"""
        if self._session:
            await self._session.close()
        if self._client:
            self._client.close()
            
    async def _create_indexes(self):
        """Erstellt MongoDB-Indizes für schnelle Abfragen"""
        if self._db is None:
            return
            
        try:
            # Conversations Index
            await self._db.conversations.create_index([
                ("user_id", 1),
                ("timestamp", -1)
            ])
            await self._db.conversations.create_index([
                ("session_id", 1),
                ("timestamp", 1)
            ])
            
            # User Profiles Index
            await self._db.user_profiles.create_index("user_id", unique=True)
            
            logger.info("[MasterBrain] Indizes erstellt")
        except Exception as e:
            logger.debug(f"[MasterBrain] Index existiert: {e}")

    # =========================================================================
    # GEDÄCHTNIS - Langzeit-Speicherung
    # =========================================================================
    
    async def save_message(
        self,
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        agent_used: str = None,
        confidence: float = 0.0,
        sources: List[str] = None
    ):
        """Speichert eine Nachricht im Langzeitgedächtnis"""
        if self._db is None:
            return
            
        conversation = Conversation(
            user_id=user_id,
            session_id=session_id,
            role=role,
            content=content,
            agent_used=agent_used,
            confidence=confidence,
            sources=sources or []
        )
        
        try:
            await self._db.conversations.insert_one(conversation.to_dict())
            
            # User-Statistik aktualisieren
            await self._db.user_profiles.update_one(
                {"user_id": user_id},
                {
                    "$inc": {"total_messages": 1},
                    "$set": {"last_seen": datetime.now().isoformat()}
                },
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MasterBrain] Speicherfehler: {e}")
            
    async def load_conversation_history(
        self,
        user_id: str,
        session_id: str = None,
        limit: int = 20
    ) -> List[Dict]:
        """Lädt Konversationsverlauf aus dem Gedächtnis"""
        if self._db is None:
            return []
            
        try:
            query = {"user_id": user_id}
            if session_id:
                query["session_id"] = session_id
                
            cursor = self._db.conversations.find(query).sort("timestamp", -1).limit(limit)
            messages = await cursor.to_list(length=limit)
            
            # Älteste zuerst
            return list(reversed(messages))
        except Exception as e:
            logger.error(f"[MasterBrain] Ladefehler: {e}")
            return []
            
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Lädt oder erstellt Benutzerprofil"""
        if self._db is None:
            return None
            
        try:
            data = await self._db.user_profiles.find_one({"user_id": user_id})
            
            if data:
                return UserProfile(
                    user_id=data.get("user_id"),
                    name=data.get("name"),
                    company_type=data.get("company_type"),
                    industry=data.get("industry"),
                    created_at=data.get("created_at"),
                    last_seen=data.get("last_seen"),
                    preferences=data.get("preferences", {}),
                    topics_discussed=data.get("topics_discussed", []),
                    total_messages=data.get("total_messages", 0)
                )
            else:
                # Neues Profil erstellen
                profile = UserProfile(user_id=user_id)
                await self._db.user_profiles.insert_one(profile.to_dict())
                return profile
        except Exception as e:
            logger.error(f"[MasterBrain] Profilfehler: {e}")
            return None
            
    async def update_user_profile(
        self,
        user_id: str,
        **updates
    ):
        """Aktualisiert Benutzerprofil"""
        if self._db is None:
            return
            
        try:
            await self._db.user_profiles.update_one(
                {"user_id": user_id},
                {"$set": updates},
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MasterBrain] Update-Fehler: {e}")

    # =========================================================================
    # AGENT ROUTING - Leitet an Spezial-Agenten weiter
    # =========================================================================
    
    def _detect_agent(self, message: str) -> AgentType:
        """Erkennt den passenden Spezial-Agenten für die Anfrage"""
        message_lower = message.lower()
        
        scores = {agent: 0 for agent in AgentType}
        
        for agent, keywords in self.AGENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword in message_lower:
                    scores[agent] += 1
                    
        # Höchsten Score finden
        best_agent = max(scores, key=scores.get)
        
        if scores[best_agent] == 0:
            return AgentType.GENERAL
            
        return best_agent
        
    async def _get_agent_context(
        self,
        agent_type: AgentType,
        query_embedding: List[float]
    ) -> str:
        """Holt relevanten Kontext für den Agenten"""
        if self._db is None or not query_embedding:
            return ""
            
        context_parts = []
        
        # 1. Relevante Dokumente aus tax_knowledge
        try:
            docs = await self._db.tax_knowledge.find({}).limit(5).to_list(length=5)
            for doc in docs:
                if doc.get("content"):
                    context_parts.append(f"**{doc.get('title', 'Info')}**\n{doc['content'][:1000]}")
        except Exception as e:
            logger.debug(f"tax_knowledge Fehler: {e}")
            
        # 2. Relevante Dokumente aus web_knowledge
        try:
            docs = await self._db.web_knowledge.find({}).limit(3).to_list(length=3)
            for doc in docs:
                if doc.get("content"):
                    context_parts.append(f"**{doc.get('title', 'Web')}**\n{doc['content'][:500]}")
        except Exception as e:
            logger.debug(f"web_knowledge Fehler: {e}")
            
        return "\n\n---\n\n".join(context_parts) if context_parts else "Keine spezifischen Informationen gefunden."

    # =========================================================================
    # KERN-LOGIK - Hauptverarbeitung
    # =========================================================================
    
    async def think(
        self,
        user_id: str,
        session_id: str,
        message: str,
        include_history: bool = True
    ) -> BrainResponse:
        """
        Hauptmethode: Verarbeitet eine Anfrage und gibt eine Antwort.
        
        1. Benutzer-Nachricht speichern
        2. Agent erkennen
        3. Kontext laden (Wissensbasis + Verlauf)
        4. Mit LLM antworten
        5. Antwort speichern
        """
        start_time = datetime.now()
        
        # 1. Benutzer-Nachricht speichern
        await self.save_message(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=message
        )
        
        # 2. Benutzerprofil laden
        profile = await self.get_user_profile(user_id)
        
        # 3. Agent erkennen
        agent_type = self._detect_agent(message)
        logger.info(f"[MasterBrain] Agent erkannt: {agent_type.value}")
        
        # 4. Embedding erstellen
        query_embedding = []
        if self._embedding_model:
            try:
                query_embedding = self._embedding_model.encode(message).tolist()
            except Exception as e:
                logger.warning(f"[MasterBrain] Embedding-Fehler: {e}")
        
        # 5. Wissensbasis-Kontext laden
        knowledge_context = await self._get_agent_context(agent_type, query_embedding)
        
        # 6. Konversations-Verlauf laden
        history_context = ""
        if include_history:
            history = await self.load_conversation_history(user_id, session_id, limit=10)
            if history:
                history_parts = []
                for msg in history[-5:]:  # Letzte 5 Nachrichten
                    role = "Du" if msg["role"] == "assistant" else "Nutzer"
                    history_parts.append(f"{role}: {msg['content'][:200]}")
                history_context = "\n".join(history_parts)
        
        # 7. Benutzer-Kontext
        user_context = ""
        if profile:
            user_parts = []
            if profile.name:
                user_parts.append(f"Name: {profile.name}")
            if profile.company_type:
                user_parts.append(f"Unternehmensform: {profile.company_type}")
            if profile.total_messages > 0:
                user_parts.append(f"Bisherige Nachrichten: {profile.total_messages}")
            user_context = ", ".join(user_parts) if user_parts else "Neuer Benutzer"
        
        # 8. Vollständigen Prompt bauen
        full_prompt = f"""{self.PERSONALITY}

--- BENUTZER-INFO ---
{user_context}

--- VORHERIGER VERLAUF ---
{history_context if history_context else "(Erste Nachricht in dieser Session)"}

--- WISSENSBASIS ---
{knowledge_context}

--- AKTUELLE FRAGE ---
{message}

--- DEINE ANTWORT ---
Antworte strukturiert und hilfreich. Nutze die Informationen aus der Wissensbasis."""

        # 9. LLM anfragen
        answer = await self._query_ollama(full_prompt)
        
        # 10. Antwort speichern
        await self.save_message(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=answer,
            agent_used=agent_type.value,
            confidence=0.85,
            sources=[]
        )
        
        # 11. Response bauen
        thinking_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return BrainResponse(
            answer=answer,
            confidence=0.85,
            agent_used=agent_type.value,
            sources=[],
            thinking_time_ms=thinking_time,
            context_used=bool(knowledge_context),
            memory_used=bool(history_context)
        )
        
    async def _query_ollama(self, prompt: str, force_model: str = None) -> str:
        """
        Multi-Model Router fuer automatische Modell-Auswahl.
        Waehlt automatisch das beste Modell basierend auf Aufgabe.
        """
        try:
            async with MultiModelRouter(
                ollama_url=self.ollama_url,
                prefer_quality=True,
                fallback_model="mistral:7b"
            ) as router:
                response = await router.generate(
                    prompt=prompt,
                    system=self.PERSONALITY,
                    force_model=force_model,
                    max_tokens=4096,
                    temperature=0.3
                )
                logger.info(f"[MasterBrain] Router: {response.model_used} | {response.capability_matched.value}/{response.complexity.value} | {response.tokens_per_second}t/s")
                return response.content
        except Exception as e:
            logger.error(f"[MasterBrain] Router Fehler: {e}")
            raise

    async def _query_with_model(self, prompt: str, model: str) -> str:
        """Sendet Anfrage an spezifisches Modell"""
        try:
            async with OllamaService(
                base_url=self.ollama_url,
                model=model,
                timeout=90
            ) as ollama:
                response = await ollama.generate(
                    prompt=prompt,
                    system=self.PERSONALITY,
                    max_tokens=2048,
                    temperature=0.3
                )
                return response.content
        except Exception as e:
            logger.error(f"[MasterBrain] Claude Fehler: {e}")
            raise

    # =========================================================================
    # API-KOMPATIBLE METHODEN
    # =========================================================================
    
    async def chat(
        self,
        message: str,
        user_id: str = "anonymous",
        session_id: str = "default"
    ) -> Dict[str, Any]:
        """
        API-kompatible Chat-Methode.
        Für Integration in bestehende Chat-Endpoints.
        """
        response = await self.think(
            user_id=user_id,
            session_id=session_id,
            message=message
        )
        
        return {
            "message": response.answer,
            "confidence": response.confidence,
            "agent": response.agent_used,
            "sources": response.sources,
            "thinking_time_ms": response.thinking_time_ms,
            "memory_used": response.memory_used,
            "source": "master_brain"
        }
        
    async def get_conversation_summary(
        self,
        user_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Gibt eine Zusammenfassung der Konversationen zurück"""
        history = await self.load_conversation_history(user_id, limit=limit)
        profile = await self.get_user_profile(user_id)
        
        # Themen extrahieren
        topics = set()
        for msg in history:
            if msg.get("agent_used"):
                topics.add(msg["agent_used"])
                
        return {
            "user_id": user_id,
            "total_messages": len(history),
            "profile": profile.to_dict() if profile else None,
            "topics_discussed": list(topics),
            "first_message": history[0]["timestamp"] if history else None,
            "last_message": history[-1]["timestamp"] if history else None
        }


# ==============================================================================
# GLOBALE INSTANZ
# ==============================================================================

_brain: Optional[MasterBrain] = None


async def get_master_brain() -> MasterBrain:
    """Gibt Singleton-Instanz zurück"""
    global _brain
    if _brain is None:
        _brain = MasterBrain()
        await _brain._init()
    return _brain


async def chat_with_brain(
    message: str,
    user_id: str = "demo",
    session_id: str = "default"
) -> Dict[str, Any]:
    """Convenience-Funktion für schnelle Chats"""
    async with MasterBrain() as brain:
        return await brain.chat(message, user_id, session_id)


# ==============================================================================
# TEST
# ==============================================================================

if __name__ == "__main__":
    async def test():
        async with MasterBrain() as brain:
            # Test 1: Erster Chat
            print("Test 1: Erster Chat")
            result = await brain.chat(
                "Wie hoch ist der Grundfreibetrag 2024?",
                user_id="test-user",
                session_id="test-session"
            )
            print(f"Antwort: {result['message'][:200]}...")
            print(f"Agent: {result['agent']}")
            print(f"Gedächtnis genutzt: {result['memory_used']}")
            
            # Test 2: Folge-Chat (sollte Kontext haben)
            print("\nTest 2: Folge-Chat")
            result = await brain.chat(
                "Und wie sieht es 2025 aus?",
                user_id="test-user",
                session_id="test-session"
            )
            print(f"Antwort: {result['message'][:200]}...")
            print(f"Gedächtnis genutzt: {result['memory_used']}")
            
            # Test 3: Zusammenfassung
            print("\nTest 3: Konversations-Zusammenfassung")
            summary = await brain.get_conversation_summary("test-user")
            print(f"Gesamt Nachrichten: {summary['total_messages']}")
            print(f"Themen: {summary['topics_discussed']}")
            
    asyncio.run(test())
