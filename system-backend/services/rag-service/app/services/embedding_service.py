from typing import Any

from app.config import settings


class EmbeddingService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._model: Any | None = None
        self._fallback = True
        self._attempted_load = True

    def _ensure_model(self) -> None:
        if self._attempted_load:
            return
        self._attempted_load = True
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(settings.embedding_model)
        except Exception:
            self._fallback = True

    def embed(self, text: str) -> list[float]:
        text = text.strip()
        self._ensure_model()
        if self._model is None:
            # Deterministic lightweight fallback for local smoke tests.
            seed = sum(ord(c) for c in text) % 997
            return [((seed + i) % 1000) / 1000 for i in range(settings.embedding_dim)]
        embedding = self._model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if self._model is None:
            return [self.embed(t) for t in texts]
        embeddings = self._model.encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
        return embeddings.tolist()

