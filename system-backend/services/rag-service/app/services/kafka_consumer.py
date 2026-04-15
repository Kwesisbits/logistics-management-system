import json
import threading
from datetime import datetime

from app.config import settings

try:
    from confluent_kafka import Consumer
except Exception:  # pragma: no cover
    Consumer = None


class LogiFlowKafkaConsumer:
    def __init__(self, embedding_service, vector_store_writer, normalizer):
        self.embedding_service = embedding_service
        self.vector_store_writer = vector_store_writer
        self.normalizer = normalizer
        self._running = False
        self._thread = None
        self.consumer = None
        if Consumer is not None:
            self.consumer = Consumer(
                {
                    "bootstrap.servers": settings.kafka_bootstrap_servers,
                    "group.id": settings.kafka_group_id,
                    "auto.offset.reset": "earliest",
                    "enable.auto.commit": True,
                }
            )
            self.consumer.subscribe(settings.kafka_topics)

    def start(self):
        if self.consumer is None:
            return
        self._running = True
        self._thread = threading.Thread(target=self._consume_loop, daemon=True, name="kafka-rag-consumer")
        self._thread.start()

    def stop(self):
        self._running = False
        if self.consumer is not None:
            self.consumer.close()

    def _consume_loop(self):
        while self._running:
            msg = self.consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                continue
            try:
                value = json.loads(msg.value().decode("utf-8"))
                event_type = value.get("eventType") or msg.topic()
                payload = value.get("payload", value)
                event_timestamp = value.get("timestamp") or datetime.utcnow().isoformat()
                document = self.normalizer.normalize(event_type, payload)
                if document is None:
                    continue
                embedding = self.embedding_service.embed(document.content)
                self.vector_store_writer.store_document(document, embedding, event_type, event_timestamp)
            except Exception:
                continue

