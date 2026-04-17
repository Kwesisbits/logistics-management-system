from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question for RAG assistant")
    company_id: str | None = Field(default=None, description="Optional tenant/company identifier")
    context: dict | None = Field(default=None, description="Optional UI-supplied context payload")


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    model: str = "placeholder-rag-v1"


class NormalizedDocument(BaseModel):
    content: str
    entity_type: str | None = None
    entity_id: str | None = None
    warehouse_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievedDocument(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    event_type: str | None = None
    entity_id: str | None = None
    created_at: datetime
    similarity: float

