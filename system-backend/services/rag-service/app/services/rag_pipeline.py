import asyncio
import threading
from collections.abc import AsyncIterator

from app.config import settings
from app.services.context_builder import ContextBuilder
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.services.vector_store import VectorStoreReader


class RAGPipeline:
    def __init__(self):
        self.embedding_service = EmbeddingService.get_instance()
        self.vector_store_reader = VectorStoreReader()
        self.context_builder = ContextBuilder()
        self.llm_service = LLMService.get_instance()

    async def process_query(
        self,
        query: str,
        user_role: str,
        warehouse_id: str | None,
        conversation_history: list[dict],
    ) -> AsyncIterator[str]:
        query_embedding = self.embedding_service.embed(query)
        entity_filter = self._classify_query(query)
        retrieved_docs = await self.vector_store_reader.similarity_search(
            query_embedding=query_embedding,
            top_k=settings.retrieval_top_k,
            entity_type=entity_filter,
            warehouse_id=warehouse_id,
            min_score=0.0,
        )
        prompt = self.context_builder.build_prompt_context(retrieved_docs, user_role, warehouse_id)
        history_text = self._format_history(conversation_history[-8:])
        user_message = f"{history_text}\nUser: {query}".strip()

        loop = asyncio.get_event_loop()
        token_queue = asyncio.Queue()

        def run():
            try:
                for token in self.llm_service.generate_stream(prompt, user_message):
                    asyncio.run_coroutine_threadsafe(token_queue.put(token), loop)
            finally:
                asyncio.run_coroutine_threadsafe(token_queue.put(None), loop)

        threading.Thread(target=run, daemon=True).start()
        while True:
            token = await token_queue.get()
            if token is None:
                break
            yield token

    def _classify_query(self, query: str) -> str | None:
        q = query.lower()
        if any(x in q for x in ["order", "shipment", "dispatch", "delivery"]):
            return "order"
        if any(x in q for x in ["stock", "inventory", "product", "sku", "batch"]):
            return "product"
        if any(x in q for x in ["warehouse", "location", "bin", "receipt"]):
            return "warehouse"
        if any(x in q for x in ["supplier", "purchase order", "vendor", "po"]):
            return "supplier"
        return None

    def _format_history(self, history: list[dict]) -> str:
        if not history:
            return ""
        return "\n".join(f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}" for m in history)

