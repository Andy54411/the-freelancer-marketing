"""
Ollama Service für Taskilo-KI
==============================
Lokales LLM auf GPU-Server (RTX 4000, 20GB VRAM)
Keine externen APIs - volle Kontrolle!

Verfügbare Modelle auf unserem Server:
- llama3.1:8b (4.9GB) - Schnell, gut für einfache Aufgaben
- llama3.3:70b-instruct-q4_K_M (~40GB) - Beste Qualität
- qwen2.5:32b (~18GB) - Exzellent für Code & Deutsch
- mistral:7b (4.1GB) - Schnell & effizient
- codellama:13b - Spezialist für Code
- deepseek-coder:6.7b - Code-Experte
"""

import os
import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

# Ollama Konfiguration (GPU-Server)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")


class OllamaModel(str, Enum):
    """Verfügbare Ollama-Modelle nach Einsatzzweck"""
    
    # Schnelle Modelle (< 5GB, < 2s Antwort)
    LLAMA_8B = "llama3.1:8b"
    MISTRAL_7B = "mistral:7b"
    
    # Qualitäts-Modelle (10-20GB, 3-5s Antwort)
    QWEN_32B = "qwen2.5:32b"
    
    # Premium-Modelle (>30GB, 5-10s Antwort)
    LLAMA_70B = "llama3.3:70b-instruct-q4_K_M"
    
    # Spezialisten
    CODELLAMA = "codellama:13b"
    DEEPSEEK_CODER = "deepseek-coder:6.7b"
    
    # Embedding
    NOMIC_EMBED = "nomic-embed-text:latest"


# Modell-Empfehlungen nach Aufgabe
MODEL_RECOMMENDATIONS = {
    "schnell": OllamaModel.LLAMA_8B,
    "standard": OllamaModel.QWEN_32B,
    "qualität": OllamaModel.LLAMA_70B,
    "code": OllamaModel.CODELLAMA,
    "steuer": OllamaModel.QWEN_32B,  # Gut für Deutsch
    "content": OllamaModel.QWEN_32B,
    "analyse": OllamaModel.LLAMA_70B,
    "chat": OllamaModel.LLAMA_8B,
}


@dataclass
class OllamaResponse:
    """Antwort von Ollama"""
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    eval_duration_ms: int
    tokens_per_second: float


class OllamaService:
    """
    Ollama API Service für lokales LLM auf GPU.
    
    Vorteile gegenüber Groq:
    - Keine API-Kosten
    - Kein Rate-Limit
    - Volle Datenkontrolle (DSGVO!)
    - Schneller bei 70B-Modellen
    - Eigene Fine-Tuning möglich
    """
    
    def __init__(
        self,
        base_url: str = None,
        model: str = None,
        timeout: int = 60,  # Länger für große Modelle
    ):
        self.base_url = base_url or OLLAMA_URL
        self.model = model or OllamaModel.QWEN_32B.value  # Standard: Qwen 32B
        self.timeout = timeout
        self._session = None
    
    async def __aenter__(self):
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()
    
    async def generate(
        self,
        prompt: str,
        system: str = None,
        model: str = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        stream: bool = False
    ) -> OllamaResponse:
        """
        Generiert eine Antwort mit Ollama.
        
        Args:
            prompt: Die Benutzer-Nachricht
            system: System-Prompt (optional)
            model: Modell überschreiben (optional)
            max_tokens: Maximale Antwortlänge
            temperature: Kreativität (0-1)
            stream: Streaming aktivieren
            
        Returns:
            OllamaResponse mit der generierten Antwort
        """
        if not self._session:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        
        use_model = model or self.model
        
        payload = {
            "model": use_model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        if system:
            payload["system"] = system
        
        try:
            async with self._session.post(
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"[Ollama] API Fehler {response.status}: {error_text}")
                    raise Exception(f"Ollama API Fehler: {response.status}")
                
                data = await response.json()
                
                # Performance-Metriken
                eval_duration = data.get("eval_duration", 0) / 1_000_000  # ns -> ms
                eval_count = data.get("eval_count", 0)
                tokens_per_sec = (eval_count / (eval_duration / 1000)) if eval_duration > 0 else 0
                
                return OllamaResponse(
                    content=data.get("response", ""),
                    model=data.get("model", use_model),
                    prompt_tokens=data.get("prompt_eval_count", 0),
                    completion_tokens=eval_count,
                    total_tokens=data.get("prompt_eval_count", 0) + eval_count,
                    eval_duration_ms=int(eval_duration),
                    tokens_per_second=round(tokens_per_sec, 1)
                )
                
        except asyncio.TimeoutError:
            logger.error(f"[Ollama] Timeout nach {self.timeout}s")
            raise Exception(f"Ollama Timeout nach {self.timeout}s")
        except aiohttp.ClientError as e:
            logger.error(f"[Ollama] Verbindungsfehler: {e}")
            raise Exception(f"Ollama nicht erreichbar: {e}")
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system: str = None,
        model: str = None,
        max_tokens: int = 2048,
        temperature: float = 0.3
    ) -> OllamaResponse:
        """
        Multi-Turn Chat mit Ollama.
        
        Args:
            messages: Liste von {"role": "user/assistant", "content": "..."}
            system: System-Prompt
            model: Modell überschreiben
            max_tokens: Maximale Antwortlänge
            temperature: Kreativität
            
        Returns:
            OllamaResponse
        """
        if not self._session:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        
        use_model = model or self.model
        
        # Ollama Chat API Format
        ollama_messages = []
        if system:
            ollama_messages.append({"role": "system", "content": system})
        ollama_messages.extend(messages)
        
        payload = {
            "model": use_model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        try:
            async with self._session.post(
                f"{self.base_url}/api/chat",
                json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Ollama Chat Fehler: {response.status}")
                
                data = await response.json()
                
                message = data.get("message", {})
                eval_duration = data.get("eval_duration", 0) / 1_000_000
                eval_count = data.get("eval_count", 0)
                tokens_per_sec = (eval_count / (eval_duration / 1000)) if eval_duration > 0 else 0
                
                return OllamaResponse(
                    content=message.get("content", ""),
                    model=data.get("model", use_model),
                    prompt_tokens=data.get("prompt_eval_count", 0),
                    completion_tokens=eval_count,
                    total_tokens=data.get("prompt_eval_count", 0) + eval_count,
                    eval_duration_ms=int(eval_duration),
                    tokens_per_second=round(tokens_per_sec, 1)
                )
                
        except asyncio.TimeoutError:
            raise Exception(f"Ollama Chat Timeout nach {self.timeout}s")
        except aiohttp.ClientError as e:
            raise Exception(f"Ollama nicht erreichbar: {e}")
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """Listet alle verfügbaren Modelle"""
        if not self._session:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10)
            )
        
        try:
            async with self._session.get(f"{self.base_url}/api/tags") as response:
                if response.status != 200:
                    return []
                data = await response.json()
                return data.get("models", [])
        except Exception as e:
            logger.error(f"[Ollama] Modelle abrufen fehlgeschlagen: {e}")
            return []
    
    async def health_check(self) -> bool:
        """Prüft ob Ollama erreichbar ist"""
        try:
            if not self._session:
                self._session = aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=5)
                )
            async with self._session.get(f"{self.base_url}/api/tags") as response:
                return response.status == 200
        except Exception:
            return False
    
    async def pull_model(self, model_name: str) -> bool:
        """Lädt ein Modell herunter"""
        if not self._session:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=3600)  # 1 Stunde für große Modelle
            )
        
        try:
            payload = {"name": model_name, "stream": False}
            async with self._session.post(
                f"{self.base_url}/api/pull",
                json=payload
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"[Ollama] Modell {model_name} herunterladen fehlgeschlagen: {e}")
            return False
    
    def get_recommended_model(self, task: str) -> str:
        """Gibt das empfohlene Modell für eine Aufgabe zurück"""
        task_lower = task.lower()
        
        for key, model in MODEL_RECOMMENDATIONS.items():
            if key in task_lower:
                return model.value
        
        return self.model  # Standard-Modell


# Singleton
_ollama_service: Optional[OllamaService] = None


async def get_ollama_service() -> OllamaService:
    """Gibt Singleton-Instanz zurück"""
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service


async def quick_generate(
    prompt: str,
    system: str = None,
    model: str = None
) -> str:
    """
    Schnelle Generierung ohne Kontext-Manager.
    """
    async with OllamaService() as ollama:
        response = await ollama.generate(prompt, system, model=model)
        return response.content


# Kompatibilitäts-Alias für bestehenden Code
GroqService = OllamaService
GroqResponse = OllamaResponse


# Test
if __name__ == "__main__":
    async def test():
        print("=== Ollama Service Test ===\n")
        
        async with OllamaService() as ollama:
            # Health Check
            healthy = await ollama.health_check()
            print(f"Ollama erreichbar: {healthy}")
            
            if not healthy:
                print("Ollama nicht erreichbar!")
                return
            
            # Modelle auflisten
            models = await ollama.list_models()
            print(f"\nInstallierte Modelle: {len(models)}")
            for m in models:
                print(f"  - {m.get('name')} ({m.get('size', 0) / 1e9:.1f}GB)")
            
            # Test-Generierung
            print("\n--- Test: Steuer-Frage ---")
            response = await ollama.generate(
                prompt="Was ist der Grundfreibetrag 2025 in Deutschland?",
                system="Du bist ein deutscher Steuerexperte. Antworte präzise."
            )
            print(f"Antwort: {response.content[:300]}...")
            print(f"Tokens: {response.prompt_tokens} in, {response.completion_tokens} out")
            print(f"Speed: {response.tokens_per_second} tokens/sec")
            print(f"Modell: {response.model}")
    
    asyncio.run(test())
