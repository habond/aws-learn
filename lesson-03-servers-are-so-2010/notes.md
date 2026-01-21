# Lesson 3 Notes: Serverless Architecture

## Key Concepts

### Lambda
- Functions as a Service (FaaS)
- Pay only for execution time (100ms increments)
- Auto-scales from 0 to thousands of concurrent executions
- Max execution time: 15 minutes
- Cold starts: first invocation is slower

### API Gateway
- Managed HTTP endpoints for Lambda
- Handles authentication, rate limiting, caching
- AWS_PROXY integration = Lambda handles full request/response
- Deployment stages (dev, staging, prod)

### DynamoDB
- NoSQL key-value database
- Partition key (hash key) required
- Sort key (range key) optional
- PAY_PER_REQUEST vs provisioned capacity
- Single-digit millisecond latency

## Architecture Patterns

### API + Lambda + DynamoDB
- Most common serverless pattern
- Fully managed, no servers
- Scales automatically
- Very cost-effective

### Lambda Best Practices
- Keep functions small and focused
- Use environment variables for config
- Reuse connections (DB, HTTP clients)
- Use layers for shared dependencies
- Enable X-Ray for debugging

## My Notes

(Add your own notes here as you work through the lesson)
