import asyncpg
import numpy as np
from app.config import settings


class VectorStoreReader:
    def __init__(self):
        self._pool = None

    async def _get_pool(self):
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                settings.async_database_url,
                min_size=2,
                max_size=10,
            )
        return self._pool

    async def similarity_search(
        self,
        query_embedding: list[float],
        top_k: int = 8,
        entity_type: str | None = None,
        warehouse_id: str | None = None,
        min_score: float = 0.0,
    ) -> list[dict]:
        pool = await self._get_pool()
        
        async with pool.acquire() as conn:
            conditions = ["1=1"]
            params = []
            
            if entity_type:
                conditions.append("entity_type = $" + str(len(params) + 1))
                params.append(entity_type)
            
            if warehouse_id:
                conditions.append("(warehouse_id = $" + str(len(params) + 1) + " OR warehouse_id IS NULL)")
                params.append(warehouse_id)
            
            where_clause = " AND ".join(conditions)
            
            query = f"""
                SELECT id, entity_type, entity_id, content, event_type, 
                       warehouse_id, created_at, embedding <=> $1 as similarity
                FROM event_embeddings
                WHERE {where_clause}
                ORDER BY embedding <=> $1
                LIMIT ${len(params) + 2}
            """
            
            params.insert(0, query_embedding)
            params.append(top_k)
            
            rows = await conn.fetch(query, *params)
            
            docs = []
            for row in rows:
                if row["similarity"] >= min_score:
                    docs.append({
                        "id": row["id"],
                        "entity_type": row["entity_type"],
                        "entity_id": row["entity_id"],
                        "content": row["content"],
                        "event_type": row["event_type"],
                        "warehouse_id": row["warehouse_id"],
                        "created_at": row["created_at"],
                        "score": row["similarity"],
                    })
            
            return docs

    async def get_by_entity(self, entity_type: str, entity_id: str) -> list[dict]:
        pool = await self._get_pool()
        
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM event_embeddings
                WHERE entity_type = $1 AND entity_id = $2
                ORDER BY created_at DESC
                """,
                entity_type,
                entity_id,
            )
            
            return [
                {
                    "id": row["id"],
                    "content": row["content"],
                    "event_type": row["event_type"],
                    "created_at": row["created_at"],
                }
                for row in rows
            ]