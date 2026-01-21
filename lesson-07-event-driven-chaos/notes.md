# Lesson 7 Notes: Event-Driven Architecture

## Key Concepts

### SNS (Simple Notification Service)
- Pub/Sub messaging (one-to-many)
- Topics and subscriptions
- Multiple protocols: Email, SMS, HTTP, Lambda, SQS
- Fan-out pattern for parallel processing

### SQS (Simple Queue Service)
- Message queue (point-to-point)
- At-least-once delivery
- Dead Letter Queues for error handling
- Visibility timeout prevents duplicate processing

### EventBridge
- Serverless event bus
- Event routing with patterns
- Schema registry
- Integrates with 90+ AWS services

### Step Functions
- Visual workflow orchestration
- State machines (JSON definition)
- Built-in error handling and retries
- Parallel and sequential execution
- Long-running workflows (up to 1 year)

## Architecture Patterns

### Fan-Out
- SNS → multiple SQS queues
- Parallel processing of same event
- Each subscriber processes independently

### Saga Pattern
- Distributed transactions
- Compensating actions on failure
- Step Functions coordinates

### Event Sourcing
- Store events, not state
- Replay events to rebuild state
- Audit trail

## My Notes

(Your notes here)
