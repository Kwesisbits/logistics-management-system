package com.logistics.ordermanagementservice.infrastructure.messaging;

import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OutboxEventEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OutboxEventJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxEventRelay {

    private final OutboxEventJpaRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Value("${app.kafka.enabled:true}")
    private boolean kafkaEnabled = true;

    @Value("${app.kafka.retry.enabled:true}")
    private boolean retryEnabled = true;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void relayPendingEvents() {
        if (!kafkaEnabled) {
            log.debug("Kafka disabled, skipping outbox relay");
            return;
        }

        if (!retryEnabled) {
            log.debug("Kafka retry disabled, skipping outbox relay");
            return;
        }

        List<OutboxEventEntity> pending = outboxRepository
            .findTop50ByStatusOrderByCreatedAtAsc("PENDING");

        if (pending.isEmpty()) {
            log.debug("No pending events to relay");
            return;
        }

        log.info("Relaying {} pending events", pending.size());

        for (OutboxEventEntity event : pending) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getCorrelationId().toString(), event.getPayload())
                    .get();
                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
                log.debug("Event published: outboxId={}, topic={}", event.getOutboxId(), event.getTopic());
            } catch (Exception e) {
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() >= 5) {
                    event.setStatus("FAILED");
                    log.error("Event permanently failed: outboxId={}, topic={}", event.getOutboxId(), event.getTopic(), e);
                } else {
                    log.warn("Event publish failed (attempt {}): outboxId={}, topic={}, error={}",
                        event.getRetryCount(), event.getOutboxId(), event.getTopic(), e.getMessage());
                }
            }
            outboxRepository.save(event);
        }
    }
}