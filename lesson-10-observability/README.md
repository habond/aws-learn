# Lesson 10: Observability - Know What's Happening (Before It Breaks) 🔍

**Time**: ~6 hours | **Cost**: ~$2-3

## What You're Building

Build comprehensive observability for your applications using CloudWatch advanced features, X-Ray distributed tracing, and custom dashboards. You'll instrument an application to collect metrics, logs, and traces, then visualize everything to understand system behavior and troubleshoot issues quickly.

## What You'll Learn

- **CloudWatch Metrics**: Custom metrics and dashboards
- **CloudWatch Logs Insights**: Query and analyze logs
- **CloudWatch Alarms**: Alert on problems
- **X-Ray**: Distributed tracing
- **CloudWatch Synthetics**: Proactive monitoring
- **Container Insights**: ECS/EKS monitoring
- **Application Insights**: Auto-discovery and monitoring

## Prerequisites

- [ ] Completed Lessons 1-9
- [ ] Running application to monitor (use from previous lessons)

---

## Part 1: Advanced CloudWatch Metrics (1.5 hours)

### Step 1: Create Custom Metrics Application

Create `monitored-app/index.js`:

```javascript
const express = require('express');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const app = express();
const cloudwatch = new CloudWatchClient({});
const PORT = process.env.PORT || 3000;

// Business metrics
let orderCount = 0;
let totalRevenue = 0;
let requestDuration = [];

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    requestDuration.push(duration);

    // Send custom metric to CloudWatch
    sendMetric('RequestDuration', duration, 'Milliseconds');
  });

  next();
});

async function sendMetric(metricName, value, unit = 'None') {
  try {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'CustomApp',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date()
        }
      ]
    }));
  } catch (error) {
    console.error('Failed to send metric:', error);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/order', express.json(), async (req, res) => {
  const { amount } = req.body;

  orderCount++;
  totalRevenue += amount;

  // Send business metrics
  await sendMetric('OrderCount', 1, 'Count');
  await sendMetric('Revenue', amount, 'None');

  console.log(`Order placed: $${amount}. Total orders: ${orderCount}, Total revenue: $${totalRevenue}`);

  res.json({
    orderId: `ORD-${Date.now()}`,
    amount,
    status: 'success'
  });
});

app.get('/metrics', (req, res) => {
  const avgDuration = requestDuration.length > 0
    ? requestDuration.reduce((a, b) => a + b, 0) / requestDuration.length
    : 0;

  res.json({
    orderCount,
    totalRevenue,
    avgRequestDuration: avgDuration,
    recentRequests: requestDuration.slice(-10)
  });
});

// Endpoint that sometimes fails (for testing alerts)
app.get('/flaky', (req, res) => {
  if (Math.random() < 0.3) {
    throw new Error('Random failure!');
  }
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  sendMetric('Errors', 1, 'Count');

  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Send heartbeat metric every minute
  setInterval(async () => {
    await sendMetric('Heartbeat', 1, 'Count');
  }, 60000);
});
```

Deploy:

```bash
cd monitored-app
npm init -y
npm install express @aws-sdk/client-cloudwatch
node index.js &
export APP_PID=$!

# Generate some traffic
for i in {1..10}; do
  curl -X POST http://localhost:3000/order \
    -H "Content-Type: application/json" \
    -d "{\"amount\": $((RANDOM % 100 + 10))}"
  sleep 1
done

# Check metrics endpoint
curl http://localhost:3000/metrics
```

### Step 2: View Custom Metrics in CloudWatch

```bash
# List custom metrics
aws cloudwatch list-metrics --namespace CustomApp

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace CustomApp \
  --metric-name OrderCount \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Or view in console: CloudWatch → Metrics → CustomApp
```

### Step 3: Create CloudWatch Dashboard

```bash
cat > dashboard-config.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "CustomApp", "OrderCount", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Order Count"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "CustomApp", "Revenue", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Total Revenue"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "CustomApp", "RequestDuration", { "stat": "Average" } ],
          [ "...", { "stat": "Maximum" } ]
        ],
        "period": 300,
        "region": "us-east-1",
        "title": "Request Duration"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "CustomApp", "Errors", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Error Count"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name application-monitoring \
  --dashboard-body file://dashboard-config.json

echo "Dashboard created: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=application-monitoring"
```

---

## Part 2: CloudWatch Logs Insights (1 hour)

### Step 2: Create Log Group and Stream Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /app/monitored-app

# Create log stream
aws logs create-log-stream \
  --log-group-name /app/monitored-app \
  --log-stream-name app-logs-$(date +%Y%m%d)
```

Update app to send logs:

```javascript
// Add to monitored-app/index.js
const { CloudWatchLogsClient, PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const logsClient = new CloudWatchLogsClient({});

async function logToCloudWatch(message, level = 'INFO') {
  try {
    await logsClient.send(new PutLogEventsCommand({
      logGroupName: '/app/monitored-app',
      logStreamName: `app-logs-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      logEvents: [
        {
          message: JSON.stringify({ level, message, timestamp: new Date().toISOString() }),
          timestamp: Date.now()
        }
      ]
    }));
  } catch (error) {
    console.error('Failed to send logs:', error);
  }
}

// Use in order endpoint
app.post('/order', express.json(), async (req, res) => {
  // ... existing code
  await logToCloudWatch(`Order placed: ${amount}`);
  // ...
});
```

### Step 3: Query Logs with CloudWatch Insights

```bash
# Query logs for errors
aws logs start-query \
  --log-group-name /app/monitored-app \
  --start-time $(date -u -v-1H +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter level = "ERROR" | sort @timestamp desc | limit 20'

# Get query ID from output
export QUERY_ID="paste-query-id"

# Get results (wait a moment for query to complete)
aws logs get-query-results --query-id $QUERY_ID
```

Common queries:

```sql
-- Find slow requests
fields @timestamp, requestDuration
| filter requestDuration > 1000
| sort requestDuration desc
| limit 20

-- Count errors by hour
stats count() by bin(1h) as hour
| filter level = "ERROR"

-- Find high revenue orders
fields @timestamp, amount
| filter amount > 100
| sort amount desc
```

---

## Part 3: CloudWatch Alarms (45 minutes)

### Step 4: Create Alarms for Key Metrics

```bash
# Create SNS topic for alerts
aws sns create-topic --name monitoring-alerts

export ALERT_TOPIC_ARN=$(aws sns list-topics \
  --query "Topics[?contains(TopicArn, 'monitoring-alerts')].TopicArn" \
  --output text)

# Subscribe email
aws sns subscribe \
  --topic-arn $ALERT_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com

# Confirm subscription in email!

# Create alarm for high error rate
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --metric-name Errors \
  --namespace CustomApp \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $ALERT_TOPIC_ARN

# Create alarm for slow requests
aws cloudwatch put-metric-alarm \
  --alarm-name slow-requests \
  --alarm-description "Alert when requests are slow" \
  --metric-name RequestDuration \
  --namespace CustomApp \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $ALERT_TOPIC_ARN

# Create alarm for low order count (possible issue)
aws cloudwatch put-metric-alarm \
  --alarm-name low-order-count \
  --alarm-description "Alert when no orders in 15 minutes" \
  --metric-name OrderCount \
  --namespace CustomApp \
  --statistic Sum \
  --period 900 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --alarm-actions $ALERT_TOPIC_ARN \
  --treat-missing-data notBreaching
```

### Step 5: Test Alarms

```bash
# Generate errors to trigger alarm
for i in {1..10}; do
  curl http://localhost:3000/flaky || true
  sleep 1
done

# Check alarm state
aws cloudwatch describe-alarms --alarm-names high-error-rate

# Check your email for alert!
```

---

## Part 4: X-Ray Distributed Tracing (1.5 hours)

### Step 6: Enable X-Ray in Application

Install X-Ray SDK:

```bash
npm install aws-xray-sdk-core
```

Update `index.js`:

```javascript
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Enable X-Ray for Express
const XRayExpress = require('aws-xray-sdk-express');
app.use(XRayExpress.openSegment('MonitoredApp'));

// Your routes here...

app.use(XRayExpress.closeSegment());

// Wrap async operations
app.post('/order', express.json(), async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('ProcessOrder');

  try {
    // Your order processing logic
    subsegment.addAnnotation('amount', req.body.amount);
    subsegment.addMetadata('orderId', `ORD-${Date.now()}`);

    // Simulate external call
    const externalSegment = subsegment.addNewSubsegment('ExternalAPI');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    externalSegment.close();

    // ... rest of code
  } finally {
    subsegment.close();
  }
});
```

### Step 7: Run X-Ray Daemon

```bash
# Download X-Ray daemon (or use Docker)
# macOS/Linux
curl https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-linux-3.x.zip -o xray-daemon.zip
unzip xray-daemon.zip
./xray &

# Restart app to send traces
kill $APP_PID
node index.js &
export APP_PID=$!

# Generate traffic
for i in {1..20}; do
  curl -X POST http://localhost:3000/order \
    -H "Content-Type: application/json" \
    -d "{\"amount\": $((RANDOM % 100 + 10))}"
  sleep 0.5
done
```

### Step 8: View Traces in X-Ray Console

```bash
# List traces via CLI
aws xray get-trace-summaries \
  --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# Or view in console: X-Ray → Traces
# See service map showing dependencies
```

---

## Part 5: CloudWatch Synthetics (Canaries) (45 minutes)

### Step 9: Create Synthetic Monitor

```bash
# Create S3 bucket for canary artifacts
export CANARY_BUCKET="canary-artifacts-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$CANARY_BUCKET

# Create IAM role for canary
cat > canary-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name canary-execution-role \
  --assume-role-policy-document file://canary-trust-policy.json

aws iam attach-role-policy \
  --role-name canary-execution-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess

export CANARY_ROLE_ARN=$(aws iam get-role \
  --role-name canary-execution-role \
  --query 'Role.Arn' \
  --output text)

# Create canary script
cat > canary-script.js << 'EOF'
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const apiCanaryBlueprint = async function () {
  const url = process.env.API_URL;

  let requestOptions = {
    hostname: url.replace('http://', '').replace('https://', ''),
    method: 'GET',
    path: '/health',
    port: 3000
  };

  let stepConfig = {
    includeRequestHeaders: true,
    includeResponseHeaders: true,
    includeRequestBody: true,
    includeResponseBody: true
  };

  await synthetics.executeHttpStep('Verify health endpoint', requestOptions, null, stepConfig);
};

exports.handler = async () => {
  return await apiCanaryBlueprint();
};
EOF

# Note: Synthetics canaries require console creation for full setup
# Or use AWS CDK/CloudFormation for complex canaries
```

---

## Part 6: Container Insights (30 minutes)

### Step 10: Enable Container Insights for ECS

```bash
# Enable Container Insights on cluster (if you have one from Lesson 5)
aws ecs put-account-setting \
  --name containerInsights \
  --value enabled

# For existing cluster
aws ecs update-cluster-settings \
  --cluster task-manager-cluster \
  --settings name=containerInsights,value=enabled

# View metrics in CloudWatch:
# CloudWatch → Container Insights → Performance monitoring
```

---

## Challenges (Optional)

### Easy
- [ ] Create composite alarms (multiple conditions)
- [ ] Add more custom metrics
- [ ] Create weekly metric reports

### Medium
- [ ] Set up anomaly detection with CloudWatch
- [ ] Create Lambda for custom log processing
- [ ] Build Grafana dashboard connected to CloudWatch
- [ ] Implement distributed tracing for microservices

### Hard
- [ ] Create ML-powered anomaly detection
- [ ] Build custom metric correlation analysis
- [ ] Implement auto-remediation with Lambda
- [ ] Create cost attribution by metric

---

## Troubleshooting

**Custom metrics not appearing?**
- Wait 1-2 minutes for metric to appear
- Check namespace is correct
- Verify IAM permissions
- Check CloudWatch API limits

**X-Ray traces not showing?**
- Verify X-Ray daemon is running
- Check IAM permissions
- Ensure app is instrumented correctly
- Check UDP port 2000 is accessible

**Logs not appearing?**
- Verify log group exists
- Check log stream name
- Ensure IAM permissions
- Check for API throttling

---

## Cleanup

```bash
# Stop app
kill $APP_PID

# Delete alarms
aws cloudwatch delete-alarms --alarm-names high-error-rate slow-requests low-order-count

# Delete dashboard
aws cloudwatch delete-dashboards --dashboard-names application-monitoring

# Delete log group
aws logs delete-log-group --log-group-name /app/monitored-app

# Delete SNS topic
aws sns delete-topic --topic-arn $ALERT_TOPIC_ARN

# Delete S3 bucket
aws s3 rb s3://$CANARY_BUCKET --force
```

---

## What You Learned

- ✅ Created custom CloudWatch metrics
- ✅ Built comprehensive dashboards
- ✅ Queried logs with Logs Insights
- ✅ Set up CloudWatch alarms
- ✅ Implemented distributed tracing with X-Ray
- ✅ Created synthetic monitors
- ✅ Enabled Container Insights
- ✅ Understood observability best practices

---

## The Three Pillars of Observability

### Metrics
- What happened (counts, rates, durations)
- Aggregated data
- Good for alerting

### Logs
- Why it happened (detailed events)
- Full context
- Good for debugging

### Traces
- How it happened (request flow)
- Distributed systems
- Good for performance analysis

**Use all three together for complete observability!**

---

## Next Steps

Head to [Lesson 11: Security Deep Dive](../lesson-11-security/) to lock down your AWS environment with IAM, WAF, GuardDuty, KMS, and security best practices! 🔒
