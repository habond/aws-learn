# Lesson 10 Notes: Observability

## Key Concepts

### CloudWatch Metrics
- Standard vs custom metrics
- Dimensions for filtering
- Statistics (sum, avg, min, max, percentiles)
- Metric math for calculations

### CloudWatch Logs
- Log groups and streams
- Retention policies
- Logs Insights query language
- Metric filters (extract metrics from logs)

### CloudWatch Alarms
- Metric-based alerts
- Composite alarms (multiple conditions)
- Anomaly detection
- Action types (SNS, Auto Scaling, EC2)

### X-Ray
- Segments and subsegments
- Annotations (indexed, searchable)
- Metadata (not indexed)
- Service map visualization

## Best Practices

### Metrics
- Use appropriate units
- Add dimensions for filtering
- Set retention as needed
- Use high-resolution when needed (1-second)

### Logs
- Structured logging (JSON)
- Consistent log format
- Appropriate log levels
- Set retention policies

### Alarms
- Set appropriate thresholds
- Use multiple evaluation periods
- Test alarms regularly
- Document runbooks

### Tracing
- Trace all requests
- Add custom segments for key operations
- Use annotations for searchable data
- Sample strategically for cost

## My Notes

(Your notes here)
