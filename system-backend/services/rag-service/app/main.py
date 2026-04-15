from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import setup_database
from app.routers.chat import router as chat_router
from app.routers.health import router as health_router
from app.services.embedding_service import EmbeddingService
from app.services.event_normalizer import EventNormalizer
from app.services.kafka_consumer import LogiFlowKafkaConsumer
from app.services.llm_service import LLMService
from app.services.rag_pipeline import RAGPipeline
from app.services.vector_store import VectorStoreWriter


embedding_service = EmbeddingService.get_instance()
llm_service = LLMService.get_instance()
kafka_consumer = LogiFlowKafkaConsumer(embedding_service, VectorStoreWriter(), EventNormalizer())
rag_pipeline = RAGPipeline()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await setup_database()
    kafka_consumer.start()
    yield
    kafka_consumer.stop()

app = FastAPI(
    title="Logistics RAG Service",
    version="0.1.0",
    description="FastAPI service for logistics RAG chat endpoints.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    conversation_history = []
    try:
        auth_message = await websocket.receive_json()
        if auth_message.get("type") != "auth":
            await websocket.send_json({"type": "error", "content": "First message must be auth"})
            await websocket.close()
            return

        user_role = auth_message.get("role", "VIEWER")
        warehouse_id = auth_message.get("warehouseId")
        await websocket.send_json({"type": "connected", "content": "LogiFlow AI ready"})

        while True:
            message = await websocket.receive_json()
            m_type = message.get("type")
            if m_type == "query":
                query = (message.get("content") or "").strip()
                if not query:
                    continue
                await websocket.send_json({"type": "thinking"})
                full_response = ""
                async for token in rag_pipeline.process_query(query, user_role, warehouse_id, conversation_history):
                    full_response += token
                    await websocket.send_json({"type": "token", "content": token})
                await websocket.send_json({"type": "done"})
                conversation_history.extend(
                    [
                        {"role": "user", "content": query},
                        {"role": "assistant", "content": full_response},
                    ]
                )
                if len(conversation_history) > 8:
                    conversation_history = conversation_history[-8:]
            elif m_type == "clear":
                conversation_history = []
                await websocket.send_json({"type": "cleared"})
    except WebSocketDisconnect:
        return

