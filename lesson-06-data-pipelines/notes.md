# Lesson 6 Notes: Data Pipelines

## Key Concepts

### Event-Driven Architecture
- React to events (file uploads, data changes)
- Loose coupling between components
- Automatic scaling
- No polling required

### S3 Events
- Trigger on object creation, deletion, etc.
- Filter by prefix/suffix
- Can trigger Lambda, SQS, SNS
- Near real-time processing

### RDS (Relational Database Service)
- Managed PostgreSQL, MySQL, etc.
- Automated backups
- Multi-AZ for high availability
- Requires VPC configuration

### ElastiCache (Redis)
- In-memory cache
- Dramatically reduces database load
- Cache invalidation strategies
- Sub-millisecond latency

### Secrets Manager
- Secure credential storage
- Automatic rotation
- Fine-grained access control
- Better than environment variables

## Architecture Patterns

### ETL Pipeline
- Extract: Read from S3
- Transform: Process with Lambda
- Load: Store in RDS

### Cache-Aside Pattern
- Check cache first
- If miss, query database
- Store result in cache
- Set TTL for expiration

### VPC Lambda
- Lambda in VPC can access RDS/Redis
- Requires VPC execution role
- Cold starts slightly slower
- NAT Gateway for internet access

## Best Practices

### Database
- Use connection pooling
- Reuse connections across invocations
- Index frequently queried columns
- Use read replicas for queries

### Caching
- Cache expensive queries
- Set appropriate TTLs
- Invalidate on data changes
- Monitor hit rates

### Lambda in VPC
- Minimize cold starts (provisioned concurrency)
- Keep functions warm with CloudWatch Events
- Use RDS Proxy for connection management

## My Notes

(Add your own notes here)
