---
description: Set up a Kafka topic and River consumer for team-esyfo
---

# Set Up Kafka Topic and Consumer

Create a new Kafka topic configuration and River consumer.

## Steps

1. Read existing NAIS manifest for Kafka pool configuration
2. Search codebase for existing River implementations to follow patterns
3. Use Context7 to verify Rapids & Rivers API

## Checklist

- [ ] Add Kafka pool to NAIS manifest (if not already present)
- [ ] Create River class with proper validation (`demandValue`, `requireKey`)
- [ ] Include standard metadata fields (`@event_name`, `@id`, `@created_at`)
- [ ] Implement idempotency check on `@id`
- [ ] Add error handling in `onError`
- [ ] Add metrics (events processed counter, processing duration timer)
- [ ] Add structured logging with `event_id`
- [ ] Write TestRapid test
