import datetime
import hashlib
import json

import psycopg2


def main() -> None:
    inventory = psycopg2.connect("postgresql://postgres:Daily2020.@localhost:5432/logistics_inventory_db")
    rag = psycopg2.connect("postgresql://postgres:Daily2020.@localhost:5432/logistics_rag_db")
    inventory_cur = inventory.cursor()
    rag_cur = rag.cursor()

    rag_cur.execute(
        """
        CREATE TABLE IF NOT EXISTS rag_documents (
            id BIGSERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            embedding DOUBLE PRECISION[] NOT NULL,
            event_type VARCHAR(100),
            entity_type VARCHAR(50),
            entity_id UUID,
            warehouse_id UUID,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            event_timestamp TIMESTAMPTZ,
            content_hash VARCHAR(64) UNIQUE
        )
        """
    )

    inventory_cur.execute(
        """
        SELECT p.product_id, p.sku, p.name, p.reorder_threshold, s.quantity_on_hand
        FROM products p
        JOIN stock_levels s ON s.product_id = p.product_id
        """
    )
    rows = inventory_cur.fetchall()

    inserted = 0
    for product_id, sku, name, threshold, on_hand in rows:
        content = (
            f"Stock snapshot: Product {name} ({sku}) currently has {on_hand} units on hand "
            f"with reorder threshold {threshold}."
        )
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        embedding_seed = sum(ord(c) for c in content)
        embedding = [((embedding_seed + i) % 1000) / 1000 for i in range(384)]
        metadata = {
            "sku": sku,
            "name": name,
            "quantity_on_hand": on_hand,
            "reorder_threshold": threshold,
        }
        rag_cur.execute(
            """
            INSERT INTO rag_documents
                (content, embedding, event_type, entity_type, entity_id, metadata, event_timestamp, content_hash)
            VALUES
                (%s, %s, %s, %s, %s::uuid, %s::jsonb, %s, %s)
            ON CONFLICT (content_hash) DO NOTHING
            """,
            (
                content,
                embedding,
                "inventory.stock.snapshot",
                "product",
                product_id,
                json.dumps(metadata),
                datetime.datetime.utcnow(),
                content_hash,
            ),
        )
        inserted += rag_cur.rowcount

    rag.commit()
    inventory.close()
    rag.close()
    print(f"Inserted {inserted} stock snapshot documents into logistics_rag_db.rag_documents")


if __name__ == "__main__":
    main()

