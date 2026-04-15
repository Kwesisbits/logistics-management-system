from fastapi import APIRouter

from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rag-service"}


@router.get("/actuator/health")
def actuator_health() -> dict[str, object]:
    return {
        "status": "UP",
        "kafka_consumer": "running",
        "llm_loaded": LLMService.get_instance() is not None,
        "embedding_loaded": EmbeddingService.get_instance() is not None,
    }

