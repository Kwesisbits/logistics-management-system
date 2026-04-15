from fastapi import APIRouter

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_pipeline import RAGPipeline

router = APIRouter(prefix="/api/rag", tags=["rag"])
pipeline = RAGPipeline()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    tokens: list[str] = []
    async for token in pipeline.process_query(
        query=payload.question,
        user_role="ADMIN",
        warehouse_id=None,
        conversation_history=[],
    ):
        tokens.append(token)
    return ChatResponse(answer="".join(tokens).strip(), sources=[], model="mistral-7b-or-fallback")

