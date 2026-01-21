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
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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
