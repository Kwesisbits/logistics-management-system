import hashlib
import json
import math
from datetime import UTC, datetime

from sqlalchemy import text

from app.config import settings
from app import database
from app.database import get_async_session, get_sync_connection
from app.models.schemas import NormalizedDocument, RetrievedDocument


class VectorStoreWriter:
    def store_document(
        self,
        document: NormalizedDocument,
        embedding: list[float],
        event_type: str,
        event_timestamp: str | None,
    ) -> bool:
        content_hash = hashlib.sha256(document.content.encode("utf-8")).hexdigest()
        vector_enabled = database.VECTOR_ENABLED
        sql = """
        INSERT INTO rag_documents (
            content, embedding, event_type, entity_type, entity_id,
            warehouse_id, metadata, event_timestamp, content_hash
        )
        VALUES (%s, %s{cast_suffix}, %s, %s, %s::uuid, %s::uuid, %s::jsonb, %s, %s)
        ON CONFLICT (content_hash) DO NOTHING
        """.format(cast_suffix="::vector" if vector_enabled else "")
        embedding_value = "[" + ",".join(str(v) for v in embedding) + "]" if vector_enabled else embedding
        with get_sync_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql,
                    (
                        document.content,
                        embedding_value,
                        event_type,
                        document.entity_type,
                        document.entity_id,
                        document.warehouse_id,
                        json.dumps(document.metadata),
                        event_timestamp,
                        content_hash,
                    ),
                )
                inserted = cur.rowcount > 0
                conn.commit()
                return inserted


class VectorStoreReader:
    async def similarity_search(
        self,
        query_embedding: list[float],
        top_k: int = 8,
        entity_type: str | None = None,
        warehouse_id: str | None = None,
        min_score: float = 0.3,
    ) -> list[RetrievedDocument]:
        vector_enabled = database.VECTOR_ENABLED
        where = ["1 - (embedding <=> CAST(:embedding AS vector)) > :min_score"]
        if not vector_enabled:
            where = ["1=1"]
        params = {
            "embedding": "[" + ",".join(str(v) for v in query_embedding) + "]",
            "min_score": min_score,
            "top_k": top_k,
        }
        if entity_type:
            where.append("entity_type = :entity_type")
            params["entity_type"] = entity_type
        if warehouse_id:
            where.append("warehouse_id = CAST(:warehouse_id AS uuid)")
            params["warehouse_id"] = warehouse_id

        if vector_enabled:
            sql = text(
                f"""
                SELECT content, metadata, event_type, entity_id::text, created_at,
                       1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
                FROM rag_documents
                WHERE {' AND '.join(where)}
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :top_k
                """
            )
        else:
            sql = text(
                """
                SELECT content, metadata, event_type, entity_id::text, created_at, embedding
                FROM rag_documents
                ORDER BY created_at DESC
                LIMIT 500
                """
            )
        async with get_async_session() as session:
            rows = (await session.execute(sql, params)).mappings().all()
        if not vector_enabled:
            rescored = []
            for row in rows:
                sim = self._cosine_similarity(query_embedding, row["embedding"] or [])
                if sim >= min_score:
                    rescored.append((sim, row))
            rescored.sort(key=lambda x: x[0], reverse=True)
            rows = [r for _, r in rescored[:top_k]]
        return [
            RetrievedDocument(
                content=r["content"],
                metadata=r["metadata"] or {},
                event_type=r["event_type"],
                entity_id=r["entity_id"],
                created_at=r["created_at"] or datetime.now(UTC),
                similarity=float(r.get("similarity") or self._cosine_similarity(query_embedding, r.get("embedding") or [])),
            )
            for r in rows
        ]

    def _cosine_similarity(self, a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(y * y for y in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

