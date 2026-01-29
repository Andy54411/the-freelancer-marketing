"""
Multi-Model Router - Automatische Modell-Auswahl für Taskilo-KI
"""
import os
import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")

class ModelCapability(str, Enum):
    GENERAL = "general"
    CODE = "code"
    GERMAN = "german"
    REASONING = "reasoning"
    FAST = "fast"
    CREATIVE = "creative"
    MATH = "math"
    LEGAL = "legal"

class TaskComplexity(str, Enum):
    SIMPLE = "simple"
    MEDIUM = "medium"
    COMPLEX = "complex"
    EXPERT = "expert"

@dataclass
class ModelConfig:
    name: str
    size_gb: float
    capabilities: List[ModelCapability]
    complexity_level: TaskComplexity
    tokens_per_sec: float
    quality_score: float
    context_length: int

MODELS: Dict[str, ModelConfig] = {
    "llama3.3:70b-instruct-q4_K_M": ModelConfig(
        name="llama3.3:70b-instruct-q4_K_M", size_gb=42.0,
        capabilities=[ModelCapability.GENERAL, ModelCapability.REASONING, ModelCapability.GERMAN, ModelCapability.LEGAL, ModelCapability.CREATIVE, ModelCapability.MATH],
        complexity_level=TaskComplexity.EXPERT, tokens_per_sec=25, quality_score=0.95, context_length=131072
    ),
    "qwen2.5:32b": ModelConfig(
        name="qwen2.5:32b", size_gb=19.0,
        capabilities=[ModelCapability.GENERAL, ModelCapability.CODE, ModelCapability.GERMAN, ModelCapability.MATH, ModelCapability.REASONING],
        complexity_level=TaskComplexity.COMPLEX, tokens_per_sec=40, quality_score=0.90, context_length=131072
    ),
    "phi3:14b": ModelConfig(
        name="phi3:14b", size_gb=7.9,
        capabilities=[ModelCapability.GENERAL, ModelCapability.REASONING, ModelCapability.MATH, ModelCapability.CODE],
        complexity_level=TaskComplexity.MEDIUM, tokens_per_sec=60, quality_score=0.82, context_length=128000
    ),
    "codellama:13b": ModelConfig(
        name="codellama:13b", size_gb=7.4,
        capabilities=[ModelCapability.CODE],
        complexity_level=TaskComplexity.COMPLEX, tokens_per_sec=55, quality_score=0.88, context_length=16384
    ),
    "deepseek-coder:6.7b": ModelConfig(
        name="deepseek-coder:6.7b", size_gb=3.8,
        capabilities=[ModelCapability.CODE],
        complexity_level=TaskComplexity.MEDIUM, tokens_per_sec=80, quality_score=0.85, context_length=16384
    ),
    "llama3.1:8b": ModelConfig(
        name="llama3.1:8b", size_gb=4.9,
        capabilities=[ModelCapability.GENERAL, ModelCapability.FAST],
        complexity_level=TaskComplexity.SIMPLE, tokens_per_sec=100, quality_score=0.78, context_length=131072
    ),
    "mistral:7b": ModelConfig(
        name="mistral:7b", size_gb=4.4,
        capabilities=[ModelCapability.GENERAL, ModelCapability.FAST, ModelCapability.CREATIVE],
        complexity_level=TaskComplexity.SIMPLE, tokens_per_sec=110, quality_score=0.80, context_length=32768
    ),
}

TASK_KEYWORDS = {
    ModelCapability.CODE: ["code", "python", "javascript", "typescript", "java", "programmier", "funktion", "klasse", "api", "bug", "debug", "sql", "html", "css", "react", "docker"],
    ModelCapability.GERMAN: ["steuer", "finanzamt", "deutschland", "recht", "gesetz", "dsgvo", "umsatzsteuer", "einkommensteuer", "gmbh", "freiberufler"],
    ModelCapability.MATH: ["berechne", "formel", "mathematik", "prozent", "summe", "durchschnitt", "statistik", "gleichung"],
    ModelCapability.CREATIVE: ["schreib", "text", "blog", "artikel", "kreativ", "idee", "headline", "slogan", "content"],
    ModelCapability.LEGAL: ["vertrag", "agb", "impressum", "haftung", "klausel", "paragraph", "datenschutz"],
    ModelCapability.REASONING: ["analysier", "erkläre", "warum", "vergleich", "zusammenfassung", "strategie", "businessplan"],
}

@dataclass
class RouterResponse:
    content: str
    model_used: str
    capability_matched: ModelCapability
    complexity: TaskComplexity
    tokens_per_second: float
    total_tokens: int
    reasoning: str

class MultiModelRouter:
    def __init__(self, ollama_url: str = None, prefer_quality: bool = True, fallback_model: str = "mistral:7b"):
        self.ollama_url = ollama_url or OLLAMA_URL
        self.prefer_quality = prefer_quality
        self.fallback_model = fallback_model
        self._session = None
        self._available_models: List[str] = []
    
    async def __aenter__(self):
        self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=120))
        await self._load_available_models()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()
    
    async def _load_available_models(self):
        try:
            async with self._session.get(f"{self.ollama_url}/api/tags") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self._available_models = [m["name"] for m in data.get("models", [])]
                    logger.info(f"[Router] {len(self._available_models)} Modelle verfügbar")
        except Exception as e:
            logger.warning(f"[Router] Modelle laden fehlgeschlagen: {e}")
            self._available_models = [self.fallback_model]
    
    def _detect_task(self, message: str) -> Tuple[ModelCapability, TaskComplexity]:
        message_lower = message.lower()
        capability_scores = {cap: 0 for cap in ModelCapability}
        for capability, keywords in TASK_KEYWORDS.items():
            for keyword in keywords:
                if keyword in message_lower:
                    capability_scores[capability] += 1
        best_capability = max(capability_scores, key=capability_scores.get)
        if capability_scores[best_capability] == 0:
            best_capability = ModelCapability.GENERAL
        complexity = TaskComplexity.SIMPLE
        if len(message) > 500:
            complexity = TaskComplexity.COMPLEX
        elif len(message) > 200:
            complexity = TaskComplexity.MEDIUM
        for kw in ["analysier", "erkläre ausführlich", "vergleich", "strategie", "businessplan", "detailliert"]:
            if kw in message_lower:
                complexity = TaskComplexity.COMPLEX if complexity != TaskComplexity.EXPERT else complexity
        return best_capability, complexity
    
    def _select_model(self, capability: ModelCapability, complexity: TaskComplexity) -> Tuple[str, str]:
        candidates = []
        for model_name, config in MODELS.items():
            if model_name not in self._available_models:
                continue
            if capability in config.capabilities:
                candidates.append((model_name, config))
        if not candidates:
            for model_name, config in MODELS.items():
                if model_name not in self._available_models:
                    continue
                if ModelCapability.GENERAL in config.capabilities:
                    candidates.append((model_name, config))
        if not candidates:
            return self.fallback_model, "Fallback"
        if self.prefer_quality and complexity in [TaskComplexity.COMPLEX, TaskComplexity.EXPERT]:
            candidates.sort(key=lambda x: x[1].quality_score, reverse=True)
        else:
            candidates.sort(key=lambda x: x[1].quality_score * 0.5 + (x[1].tokens_per_sec / 120) * 0.5, reverse=True)
        best = candidates[0]
        return best[0], f"{capability.value}/{complexity.value} → {best[0]} (Q:{best[1].quality_score:.0%})"
    
    async def generate(self, prompt: str, system: str = None, force_model: str = None, max_tokens: int = 2048, temperature: float = 0.3) -> RouterResponse:
        if not self._session:
            self._session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=120))
            await self._load_available_models()
        capability, complexity = self._detect_task(prompt)
        if force_model and force_model in self._available_models:
            model = force_model
            reasoning = f"Forced: {force_model}"
        else:
            model, reasoning = self._select_model(capability, complexity)
        logger.info(f"[Router] {reasoning}")
        payload = {"model": model, "prompt": prompt, "stream": False, "options": {"temperature": temperature, "num_predict": max_tokens}}
        if system:
            payload["system"] = system
        try:
            async with self._session.post(f"{self.ollama_url}/api/generate", json=payload) as response:
                if response.status != 200:
                    raise Exception(f"Ollama Error: {response.status}")
                data = await response.json()
                eval_duration = data.get("eval_duration", 0) / 1_000_000
                eval_count = data.get("eval_count", 0)
                tokens_per_sec = (eval_count / (eval_duration / 1000)) if eval_duration > 0 else 0
                return RouterResponse(
                    content=data.get("response", ""),
                    model_used=model,
                    capability_matched=capability,
                    complexity=complexity,
                    tokens_per_second=round(tokens_per_sec, 1),
                    total_tokens=data.get("prompt_eval_count", 0) + eval_count,
                    reasoning=reasoning
                )
        except Exception as e:
            logger.error(f"[Router] Error: {e}")
            raise
    
    async def generate_with_best(self, prompt: str, system: str = None, max_tokens: int = 4096, temperature: float = 0.3) -> RouterResponse:
        best_model = max((m for m in self._available_models if m in MODELS), key=lambda x: MODELS[x].quality_score, default=self.fallback_model)
        return await self.generate(prompt=prompt, system=system, force_model=best_model, max_tokens=max_tokens, temperature=temperature)
    
    async def generate_fast(self, prompt: str, system: str = None, max_tokens: int = 1024, temperature: float = 0.3) -> RouterResponse:
        fastest = max((m for m in self._available_models if m in MODELS), key=lambda x: MODELS[x].tokens_per_sec, default=self.fallback_model)
        return await self.generate(prompt=prompt, system=system, force_model=fastest, max_tokens=max_tokens, temperature=temperature)
    
    async def generate_code(self, prompt: str, language: str = "python", max_tokens: int = 2048) -> RouterResponse:
        for model in ["codellama:13b", "deepseek-coder:6.7b", "qwen2.5:32b"]:
            if model in self._available_models:
                return await self.generate(prompt=prompt, system=f"Du bist ein {language} Experte.", force_model=model, max_tokens=max_tokens, temperature=0.2)
        return await self.generate(prompt=prompt, max_tokens=max_tokens)
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        result = []
        for model_name in self._available_models:
            if model_name in MODELS:
                config = MODELS[model_name]
                result.append({"name": model_name, "size_gb": config.size_gb, "quality": config.quality_score, "speed": config.tokens_per_sec, "capabilities": [c.value for c in config.capabilities]})
        return result

_router: Optional[MultiModelRouter] = None

async def get_router() -> MultiModelRouter:
    global _router
    if _router is None:
        _router = MultiModelRouter()
        await _router._load_available_models()
    return _router
