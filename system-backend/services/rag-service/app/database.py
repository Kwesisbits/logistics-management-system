from contextlib import asynccontextmanager, contextmanager

import psycopg2
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

ASYNC_ENGINE = create_async_engine(settings.async_database_url, future=True, echo=False)
ASYNC_SESSION_FACTORY = async_sessionmaker(ASYNC_ENGINE, class_=AsyncSession, expire_on_commit=False)

VECTOR_ENABLED = True

VECTOR_SETUP_SQL = """
CREATE TABLE IF NOT EXISTS rag_documents (
    id              BIGSERIAL PRIMARY KEY,
    content         TEXT NOT NULL,
    embedding       vector(384) NOT NULL,
    event_type      VARCHAR(100),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    warehouse_id    UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ,
    content_hash    VARCHAR(64) UNIQUE
);

CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
    ON rag_documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rag_documents_event_type_idx
    ON rag_documents(event_type);

CREATE INDEX IF NOT EXISTS rag_documents_entity_idx
    ON rag_documents(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS rag_documents_created_at_idx
    ON rag_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS rag_documents_warehouse_idx
    ON rag_documents(warehouse_id)
    WHERE warehouse_id IS NOT NULL;
"""

FALLBACK_SETUP_SQL = """
CREATE TABLE IF NOT EXISTS rag_documents (
    id              BIGSERIAL PRIMARY KEY,
    content         TEXT NOT NULL,
    embedding       DOUBLE PRECISION[] NOT NULL,
    event_type      VARCHAR(100),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    warehouse_id    UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_timestamp TIMESTAMPTZ,
    content_hash    VARCHAR(64) UNIQUE
);

CREATE INDEX IF NOT EXISTS rag_documents_event_type_idx
    ON rag_documents(event_type);
CREATE INDEX IF NOT EXISTS rag_documents_entity_idx
    ON rag_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS rag_documents_created_at_idx
    ON rag_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS rag_documents_warehouse_idx
    ON rag_documents(warehouse_id)
    WHERE warehouse_id IS NOT NULL;
"""


def _sync_dsn() -> str:
    return settings.database_url.replace("postgresql://", "dbname=").replace("@localhost:5432/", " host=localhost port=5432 ")


async def setup_database() -> None:
    global VECTOR_ENABLED
    conn = psycopg2.connect(settings.database_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                cur.execute(VECTOR_SETUP_SQL)
                VECTOR_ENABLED = True
            except psycopg2.Error:
                VECTOR_ENABLED = False
                cur.execute(FALLBACK_SETUP_SQL)
    finally:
        conn.close()


@asynccontextmanager
async def get_async_session():
    async with ASYNC_SESSION_FACTORY() as session:
        yield session


@contextmanager
def get_sync_connection():
    conn = psycopg2.connect(settings.database_url)
    conn.autocommit = False
    try:
        yield conn
    finally:
        conn.close()

