const express = require('express');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from EC2! 🚀',
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    loadavg: os.loadavg(),
    totalmem: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freemem: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    cpus: os.cpus().length,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version
    },
    request: {
      ip: req.ip,
      headers: req.headers
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Hostname: ${os.hostname()}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
