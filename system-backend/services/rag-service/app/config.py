from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    database_url: str = (
        "postgresql://postgres:Daily2020.@localhost:5432/logistics_rag_db"
    )
    async_database_url: str = (
        "postgresql+asyncpg://postgres:Daily2020.@localhost:5432/logistics_rag_db"
    )

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

    groq_api_key: str = ""

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    retrieval_top_k: int = 8
    retrieval_min_score: float = 0.3

    max_context_tokens: int = 2048
    context_recency_weight: float = 0.3

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        env_key = os.environ.get("GROQ_API_KEY", "")
        if env_key and not self.groq_api_key:
            self.groq_api_key = env_key


settings = Settings()