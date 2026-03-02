---
applyTo: "**/*River*.kt,**/*Kafka*.kt,**/*Consumer*.kt,**/*Producer*.kt,**/*Event*.kt,**/*rapids*.kt"
---

# Kafka — Rapids & Rivers Patterns

## Overview

- **Rapid**: The Kafka topic where all events flow
- **River**: A consumer listening to specific event types
- **Need/Demand/Require**: Validation predicates

## River Template

```kotlin
class ExampleRiver(
    rapidsConnection: RapidsConnection,
    private val service: ExampleService
) : River.PacketListener {

    init {
        River(rapidsConnection).apply {
            validate { it.demandValue("@event_name", "example_event") }
            validate { it.requireKey("id", "data") }
        }.register(this)
    }

    override fun onPacket(packet: JsonMessage, context: MessageContext) {
        val id = packet["id"].asText()
        service.process(id, packet["data"])
    }

    override fun onError(problems: MessageProblems, context: MessageContext) {
        logger.error("Validation failed: ${problems.toExtendedReport()}")
    }
}
```

## Event Design

### Standard Metadata
```json
{
  "@event_name": "user_created",
  "@id": "unique-uuid",
  "@created_at": "2025-01-01T12:00:00Z",
  "user_id": "...",
  "data": {}
}
```

### Naming Conventions
- Past tense for events: `user_created`, `payment_processed`
- Snake_case for all field names
- Include `@id` for idempotency

## Idempotency Pattern

```kotlin
override fun onPacket(packet: JsonMessage, context: MessageContext) {
    val eventId = packet["@id"].asText()
    if (eventRepository.exists(eventId)) {
        logger.info("Event $eventId already processed, skipping")
        return
    }
    service.process(packet)
    eventRepository.markProcessed(eventId)
}
```

## Testing (TestRapid)

```kotlin
private val testRapid = TestRapid()

@Test
fun `should publish event after processing`() {
    testRapid.sendTestMessage("""{"@event_name": "test_event", "field": "value"}""")
    testRapid.inspektør.size shouldBe 1
    testRapid.inspektør.message(0)["@event_name"].asText() shouldBe "response_event"
}
```

## Boundaries

### ✅ Always
- Past tense event names (`user_created`, not `create_user`)
- Include `@event_name`, `@id`, `@created_at` metadata
- Implement idempotency (check `@id`)
- Write TestRapid tests for all Rivers
- Log with `event_id` for traceability

### ⚠️ Ask First
- Creating new Kafka topics
- Changing consumer group IDs
- Modifying event schemas (breaking changes)

### 🚫 Never
- Imperative event names
- Skip the `@id` field
- Publish PII in event payloads without encryption
- Change consumer group without migration plan
