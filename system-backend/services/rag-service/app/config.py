from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:Daily2020.@localhost:5432/logistics_rag_db"
    async_database_url: str = "postgresql+asyncpg://postgres:Daily2020.@localhost:5432/logistics_rag_db"

    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_group_id: str = "rag-service"
    kafka_topics: list[str] = [
        "inventory.stock.reserved",
        "inventory.stock.reservation_failed",
        "inventory.stock.released",
        "inventory.stock.adjusted",
        "inventory.stock.low_stock_alert",
        "inventory.product.created",
        "inventory.product.updated",
        "warehouse.goods.received",
        "warehouse.goods.dispatched",
        "warehouse.stock.moved",
        "warehouse.location.capacity_exceeded",
        "order.created",
        "order.status.changed",
        "order.cancelled",
        "order.assigned",
        "order.delayed",
        "procurement.purchase_order.created",
        "procurement.purchase_order.submitted",
        "procurement.purchase_order.received",
        "procurement.delivery.delayed",
        "identity.user.created",
        "identity.user.deactivated",
    ]

    model_path: str = "models/mistral-7b-instruct-v0.3.Q4_K_M.gguf"
    model_n_ctx: int = 4096
    model_n_threads: int = 4
    model_max_tokens: int = 512
    model_temperature: float = 0.1
    model_top_p: float = 0.9

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    retrieval_top_k: int = 8
    retrieval_min_score: float = 0.3

    max_context_tokens: int = 2048
    context_recency_weight: float = 0.3

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")


settings = Settings()

