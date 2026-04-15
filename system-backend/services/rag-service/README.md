# rag-service

LogiFlow RAG microservice (FastAPI, Kafka ingestion, pgvector retrieval, LLM generation).

## Local run

1. Create virtual env and install dependencies.
2. Ensure `logistics_rag_db` exists.
3. Optionally download Mistral GGUF:
   - `python scripts/download_model.py`
4. Run:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload`

## Health

- `GET /actuator/health`
- `GET /health`

## Chat

- WebSocket: `/ws/chat`
- HTTP fallback: `POST /api/rag/chat`

