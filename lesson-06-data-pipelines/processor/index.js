const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Client } = require('pg');
const Redis = require('ioredis');

const s3 = new S3Client({});
const secretsManager = new SecretsManagerClient({});

let dbClient;
let redisClient;

async function getDbCredentials() {
  const response = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN })
  );
  return JSON.parse(response.SecretString);
}

async function initializeConnections() {
  if (!dbClient) {
    const creds = await getDbCredentials();
    dbClient = new Client({
      host: creds.host,
      port: creds.port,
      database: creds.database,
      user: creds.username,
      password: creds.password
    });
    await dbClient.connect();
  }

  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_ENDPOINT,
      port: 6379
    });
  }

  return { dbClient, redisClient };
}

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header.trim()] = values[index]?.trim();
      return obj;
    }, {});
  });
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const { dbClient, redisClient } = await initializeConnections();

    // Get S3 object details from event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: s3://${bucket}/${key}`);

    // Download file from S3
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const csvContent = await response.Body.transformToString();

    // Parse CSV
    const records = parseCSV(csvContent);
    console.log(`Parsed ${records.length} records`);

    // Insert into database
    for (const record of records) {
      await dbClient.query(
        'INSERT INTO sales_data (date, product, quantity, revenue, region) VALUES ($1, $2, $3, $4, $5)',
        [record.date, record.product, parseInt(record.quantity), parseFloat(record.revenue), record.region]
      );
    }

    console.log(`Inserted ${records.length} records into database`);

    // Invalidate cache for affected queries
    await redisClient.del('sales:total');
    await redisClient.del('sales:by_product');
    await redisClient.del('sales:by_region');

    console.log('Cache invalidated');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed file',
        recordsProcessed: records.length,
        file: key
      })
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
