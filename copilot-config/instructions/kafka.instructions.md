---
description: 'Kafka consumer/producer-mønstre — idempotens, feilhåndtering, ytelse'
applyTo: "**/*Kafka*.kt,**/*Consumer*.kt,**/*Producer*.kt,**/*Event*.kt"
---

# Kafka Consumer/Producer Patterns

## Overview

- Team-esyfo uses plain Apache Kafka clients (not Rapids & Rivers)
- Consumers typically run as coroutine-based listeners
- Check existing consumers in the codebase before writing new ones

## Consumer Pattern

```kotlin
class ExampleKafkaConsumer(
    private val kafkaConsumer: KafkaConsumer<String, String>,
    private val service: ExampleService
) {
    // Call from a CoroutineScope that is cancelled on application shutdown
    suspend fun listen() = coroutineScope {
        while (isActive) {
            val records = kafkaConsumer.poll(Duration.ofMillis(1000))
            records.forEach { record ->
                try {
                    service.process(record.key(), record.value())
                } catch (e: Exception) {
                    logger.error("Failed to process record", e)
                    // Dead-letter or retry depending on error type
                }
            }
            kafkaConsumer.commitSync()
        }
    }
}
```

## Producer Pattern

```kotlin
class ExampleKafkaProducer(
    private val kafkaProducer: KafkaProducer<String, String>
) {
    fun send(topic: String, key: String, value: String) {
        kafkaProducer.send(ProducerRecord(topic, key, value)) { metadata, exception ->
            if (exception != null) {
                logger.error("Failed to send to $topic", exception)
            } else {
                logger.info("Sent to ${metadata.topic()} partition ${metadata.partition()}")
            }
        }
    }
}
```

## Idempotency

```kotlin
fun processRecord(record: ConsumerRecord<String, String>) {
    val eventId = extractEventId(record)
    if (repository.alreadyProcessed(eventId)) {
        logger.info("Event $eventId already processed, skipping")
        return
    }
    service.process(record.value())
    repository.markProcessed(eventId)
}
```

## Boundaries

### ✅ Always
- Implement idempotent processing where applicable
- Use structured logging with topic, partition, and offset
- Handle deserialization errors gracefully
- Follow existing consumer patterns in the codebase

### ⚠️ Ask First
- Creating new Kafka topics
- Changing consumer group IDs
- Modifying message schemas (breaking changes)

### 🚫 Never
- Skip error handling in consumers
- Publish PII in message payloads without encryption
- Change consumer group without migration plan
