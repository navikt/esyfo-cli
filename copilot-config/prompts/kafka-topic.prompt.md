---
description: Set up a Kafka topic and consumer for team-esyfo
---

# Set Up Kafka Topic and Consumer

Create a new Kafka topic configuration and consumer.

## Steps

1. Read existing NAIS manifest for Kafka pool configuration
2. Search codebase for existing Kafka consumer implementations to follow patterns (e.g. `@KafkaListener`)
3. Use Context7 to verify the Kafka library API used in this repo

## Checklist

- [ ] Add Kafka pool to NAIS manifest (if not already present)
- [ ] Create consumer class following existing patterns in the repo
- [ ] Define message payload and key types matching the topic schema
- [ ] Implement idempotent processing where needed
- [ ] Add error handling and logging consistent with existing consumers
- [ ] Add metrics (events processed counter, processing duration timer)
- [ ] Add structured logging with relevant identifiers
- [ ] Write tests following existing Kafka test patterns in the repo
