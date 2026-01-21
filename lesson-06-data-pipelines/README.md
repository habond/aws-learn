# Lesson 6: Data Pipelines - Because Excel Spreadsheets Don't Scale 📊

**Time**: ~7 hours | **Cost**: ~$3-4 (delete resources when done!)

## What You're Building

Build an automated data processing pipeline that processes uploaded files, stores results in a database, and caches frequently accessed data. You'll create a system that automatically:
- Watches S3 for new CSV uploads
- Processes data with Lambda
- Stores results in RDS (PostgreSQL)
- Caches hot data in ElastiCache (Redis)
- Exposes API to query results

Real-world use case: Log processing, data ingestion, ETL pipelines, analytics preprocessing.

## What You'll Learn

- **S3 Events**: Trigger actions on file uploads
- **Lambda**: Process data serverlessly
- **RDS**: Managed relational database (PostgreSQL)
- **ElastiCache**: Managed Redis cache
- **VPC**: Networking for databases
- **Secrets Manager**: Secure credential storage
- **Event-driven architecture**: Reacting to data changes

## Prerequisites

- [ ] Completed Lessons 1-5
- [ ] AWS CLI configured
- [ ] Node.js or Python installed
- [ ] Basic SQL knowledge
- [ ] Understanding of Redis (helpful)

---

## Architecture Overview

```
CSV Upload → S3 Bucket
                ↓ (S3 Event)
           Lambda Function
                ↓
        ┌───────┴──────┐
        ↓              ↓
    RDS (PostgreSQL)   ElastiCache (Redis)
        ↓              ↓
    API Lambda ←───────┘
        ↓
   API Gateway
```

---

## Part 1: Set Up Networking (VPC) (1 hour)

### Step 1: Create VPC for Databases

```bash
# We'll use default VPC for simplicity
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" \
  --output text)

echo "VPC ID: $VPC_ID"

# Get subnet IDs in different AZs
export SUBNET_1=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[0].SubnetId" \
  --output text)

export SUBNET_2=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[1].SubnetId" \
  --output text)

echo "Subnets: $SUBNET_1, $SUBNET_2"
```

### Step 2: Create Security Groups

```bash
# Security group for Lambda functions
aws ec2 create-security-group \
  --group-name data-pipeline-lambda-sg \
  --description "Security group for data pipeline Lambda functions" \
  --vpc-id $VPC_ID

export LAMBDA_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=data-pipeline-lambda-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Security group for RDS
aws ec2 create-security-group \
  --group-name data-pipeline-rds-sg \
  --description "Security group for RDS database" \
  --vpc-id $VPC_ID

export RDS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=data-pipeline-rds-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Security group for ElastiCache
aws ec2 create-security-group \
  --group-name data-pipeline-redis-sg \
  --description "Security group for ElastiCache Redis" \
  --vpc-id $VPC_ID

export REDIS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=data-pipeline-redis-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Allow Lambda to access RDS (PostgreSQL port 5432)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $LAMBDA_SG

# Allow Lambda to access Redis (port 6379)
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG \
  --protocol tcp \
  --port 6379 \
  --source-group $LAMBDA_SG

echo "Lambda SG: $LAMBDA_SG"
echo "RDS SG: $RDS_SG"
echo "Redis SG: $REDIS_SG"
```

---

## Part 2: RDS PostgreSQL Database (1.5 hours)

### Step 3: Create DB Subnet Group

```bash
# Create subnet group (required for RDS)
aws rds create-db-subnet-group \
  --db-subnet-group-name data-pipeline-subnet-group \
  --db-subnet-group-description "Subnet group for data pipeline RDS" \
  --subnet-ids $SUBNET_1 $SUBNET_2
```

### Step 4: Generate Database Password

```bash
# Generate random password
export DB_PASSWORD=$(openssl rand -base64 32)
echo "DB Password: $DB_PASSWORD"
# SAVE THIS PASSWORD! You'll need it.
```

### Step 5: Create RDS Instance

```bash
# Create PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier data-pipeline-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name data-pipeline-subnet-group \
  --backup-retention-period 1 \
  --no-multi-az \
  --publicly-accessible

# This takes 5-10 minutes
echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier data-pipeline-db

# Get endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier data-pipeline-db \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"
```

### Step 6: Store Credentials in Secrets Manager

```bash
# Create secret for database credentials
aws secretsmanager create-secret \
  --name data-pipeline/db-credentials \
  --secret-string "{\"username\":\"admin\",\"password\":\"$DB_PASSWORD\",\"host\":\"$DB_ENDPOINT\",\"port\":5432,\"database\":\"postgres\"}"

export SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id data-pipeline/db-credentials \
  --query ARN \
  --output text)

echo "Secret ARN: $SECRET_ARN"
```

### Step 7: Initialize Database Schema

Install PostgreSQL client if needed:

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

Connect and create schema:

```bash
# Connect to database
psql -h $DB_ENDPOINT -U admin -d postgres

# Enter password when prompted
```

In psql:

```sql
-- Create table for processed data
CREATE TABLE sales_data (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10,2) NOT NULL,
  region VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_date ON sales_data(date);
CREATE INDEX idx_product ON sales_data(product);
CREATE INDEX idx_region ON sales_data(region);

-- Verify
\dt
\d sales_data

-- Exit
\q
```

---

## Part 3: ElastiCache Redis (1 hour)

### Step 8: Create Redis Subnet Group

```bash
# Create subnet group for Redis
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name data-pipeline-redis-subnet \
  --cache-subnet-group-description "Subnet group for data pipeline Redis" \
  --subnet-ids $SUBNET_1 $SUBNET_2
```

### Step 9: Create Redis Cluster

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id data-pipeline-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name data-pipeline-redis-subnet \
  --security-group-ids $REDIS_SG

# Wait for cluster to be available (takes 3-5 minutes)
echo "Waiting for Redis cluster to be available..."
aws elasticache wait cache-cluster-available --cache-cluster-id data-pipeline-redis

# Get endpoint
export REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id data-pipeline-redis \
  --show-cache-node-info \
  --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" \
  --output text)

echo "Redis Endpoint: $REDIS_ENDPOINT"
```

---

## Part 4: S3 Bucket for Data Upload (30 minutes)

### Step 10: Create S3 Bucket

```bash
# Create bucket
export BUCKET_NAME="data-pipeline-uploads-$(aws sts get-caller-identity --query Account --output text)"

aws s3 mb s3://$BUCKET_NAME

echo "S3 Bucket: $BUCKET_NAME"
```

### Step 11: Create Sample CSV Data

Create `sample-sales.csv`:

```csv
date,product,quantity,revenue,region
2024-01-01,Widget A,100,1500.00,North
2024-01-01,Widget B,75,1125.50,South
2024-01-01,Gadget X,50,2500.00,East
2024-01-02,Widget A,120,1800.00,North
2024-01-02,Gadget Y,30,900.00,West
2024-01-03,Widget B,200,3000.00,South
```

---

## Part 5: Lambda Data Processor (2 hours)

### Step 12: Create Lambda Execution Role

```bash
# Create trust policy
cat > lambda-trust-policy.json << 'EOF'
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

# Create role
aws iam create-role \
  --role-name data-pipeline-lambda-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach basic execution policy
aws iam attach-role-policy \
  --role-name data-pipeline-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Attach VPC execution policy (needed to access RDS/Redis)
aws iam attach-role-policy \
  --role-name data-pipeline-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

# Create custom policy for S3, Secrets Manager
cat > lambda-permissions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "$SECRET_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name data-pipeline-lambda-role \
  --policy-name DataPipelinePermissions \
  --policy-document file://lambda-permissions-policy.json

# Get role ARN
export LAMBDA_ROLE_ARN=$(aws iam get-role \
  --role-name data-pipeline-lambda-role \
  --query 'Role.Arn' \
  --output text)

echo "Lambda Role ARN: $LAMBDA_ROLE_ARN"
```

### Step 13: Create Processor Lambda Function

Create `processor/index.js`:

```javascript
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
```

Create `processor/package.json`:

```json
{
  "name": "data-processor",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/client-secrets-manager": "^3.0.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0"
  }
}
```

### Step 14: Package and Deploy Processor

```bash
cd processor
npm install
zip -r ../processor.zip .
cd ..

# Create Lambda function
aws lambda create-function \
  --function-name data-pipeline-processor \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://processor.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment "Variables={SECRET_ARN=$SECRET_ARN,REDIS_ENDPOINT=$REDIS_ENDPOINT}" \
  --vpc-config SubnetIds=$SUBNET_1,$SUBNET_2,SecurityGroupIds=$LAMBDA_SG

echo "Processor Lambda created!"
```

### Step 15: Configure S3 Event Trigger

```bash
# Add permission for S3 to invoke Lambda
aws lambda add-permission \
  --function-name data-pipeline-processor \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::$BUCKET_NAME

# Create notification configuration
cat > s3-notification.json << EOF
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "$(aws lambda get-function --function-name data-pipeline-processor --query 'Configuration.FunctionArn' --output text)",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".csv"
            }
          ]
        }
      }
    }
  ]
}
EOF

# Apply notification configuration
aws s3api put-bucket-notification-configuration \
  --bucket $BUCKET_NAME \
  --notification-configuration file://s3-notification.json
```

### Step 16: Test the Pipeline

```bash
# Upload sample CSV
aws s3 cp sample-sales.csv s3://$BUCKET_NAME/sales-2024-01.csv

# Check Lambda logs
sleep 10
aws logs tail /aws/lambda/data-pipeline-processor --follow

# Verify data in database
psql -h $DB_ENDPOINT -U admin -d postgres -c "SELECT * FROM sales_data;"
```

**Your automated data pipeline is working!** 🎉

---

## Part 6: Query API with Caching (1.5 hours)

### Step 17: Create Query Lambda Function

Create `query-api/index.js`:

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { Client } = require('pg');
const Redis = require('ioredis');

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

async function getTotalSales(dbClient, redisClient) {
  const cacheKey = 'sales:total';

  // Try cache first
  let cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('Cache hit for total sales');
    return { ...JSON.parse(cached), cached: true };
  }

  // Query database
  const result = await dbClient.query(
    'SELECT COUNT(*) as total_orders, SUM(revenue) as total_revenue FROM sales_data'
  );

  const data = result.rows[0];

  // Cache for 5 minutes
  await redisClient.setex(cacheKey, 300, JSON.stringify(data));

  return { ...data, cached: false };
}

async function getSalesByProduct(dbClient, redisClient) {
  const cacheKey = 'sales:by_product';

  let cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('Cache hit for sales by product');
    return { data: JSON.parse(cached), cached: true };
  }

  const result = await dbClient.query(
    'SELECT product, SUM(quantity) as total_quantity, SUM(revenue) as total_revenue FROM sales_data GROUP BY product ORDER BY total_revenue DESC'
  );

  // Cache for 5 minutes
  await redisClient.setex(cacheKey, 300, JSON.stringify(result.rows));

  return { data: result.rows, cached: false };
}

async function getSalesByRegion(dbClient, redisClient) {
  const cacheKey = 'sales:by_region';

  let cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('Cache hit for sales by region');
    return { data: JSON.parse(cached), cached: true };
  }

  const result = await dbClient.query(
    'SELECT region, SUM(quantity) as total_quantity, SUM(revenue) as total_revenue FROM sales_data GROUP BY region ORDER BY total_revenue DESC'
  );

  await redisClient.setex(cacheKey, 300, JSON.stringify(result.rows));

  return { data: result.rows, cached: false };
}

exports.handler = async (event) => {
  const path = event.path || event.requestContext?.http?.path || '/';

  try {
    const { dbClient, redisClient } = await initializeConnections();

    let response;

    switch (path) {
      case '/total':
        response = await getTotalSales(dbClient, redisClient);
        break;
      case '/by-product':
        response = await getSalesByProduct(dbClient, redisClient);
        break;
      case '/by-region':
        response = await getSalesByRegion(dbClient, redisClient);
        break;
      default:
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not found' })
        };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

Package and deploy:

```bash
cd query-api
cp ../processor/package.json .
npm install
zip -r ../query-api.zip .
cd ..

aws lambda create-function \
  --function-name data-pipeline-query-api \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://query-api.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={SECRET_ARN=$SECRET_ARN,REDIS_ENDPOINT=$REDIS_ENDPOINT}" \
  --vpc-config SubnetIds=$SUBNET_1,$SUBNET_2,SecurityGroupIds=$LAMBDA_SG
```

### Step 18: Create API Gateway

```bash
# Create HTTP API (simpler than REST API)
aws apigatewayv2 create-api \
  --name data-pipeline-api \
  --protocol-type HTTP \
  --target $(aws lambda get-function --function-name data-pipeline-query-api --query 'Configuration.FunctionArn' --output text)

export API_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='data-pipeline-api'].ApiId" \
  --output text)

# Give API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name data-pipeline-query-api \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*"

# Get API endpoint
export API_ENDPOINT=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='data-pipeline-api'].ApiEndpoint" \
  --output text)

echo "API Endpoint: $API_ENDPOINT"
```

### Step 19: Test Query API

```bash
# Test endpoints
curl $API_ENDPOINT/total
curl $API_ENDPOINT/by-product
curl $API_ENDPOINT/by-region

# Test caching (second request should be faster and show cached: true)
time curl $API_ENDPOINT/total
time curl $API_ENDPOINT/total
```

**You have a complete data pipeline with caching!** 🎉

---

## Challenges (Optional)

### Easy
- [ ] Add more CSV files and watch automatic processing
- [ ] Query database directly to explore data
- [ ] Monitor cache hit rates in Redis

### Medium
- [ ] Add error handling and dead letter queue
- [ ] Create CloudWatch dashboard for pipeline metrics
- [ ] Add data validation in processor Lambda
- [ ] Implement different cache TTLs per endpoint

### Hard
- [ ] Add support for different file formats (JSON, Parquet)
- [ ] Implement incremental updates (upserts instead of inserts)
- [ ] Add data partitioning by date in S3
- [ ] Create data quality checks and alerts

---

## Troubleshooting

**Lambda can't connect to RDS?**
- Check security groups allow Lambda SG → RDS SG
- Verify Lambda is in same VPC as RDS
- Check subnet routing and NAT gateway if needed

**Redis connection issues?**
- Verify Lambda can reach ElastiCache endpoint
- Check security groups
- Test Redis endpoint from within VPC

**S3 trigger not working?**
- Check Lambda permissions for S3
- Verify notification configuration
- Check CloudWatch Logs for errors

**Secrets Manager access denied?**
- Verify Lambda role has secretsmanager:GetSecretValue
- Check secret ARN is correct

---

## Cleanup

```bash
# Delete API
aws apigatewayv2 delete-api --api-id $API_ID

# Delete Lambda functions
aws lambda delete-function --function-name data-pipeline-processor
aws lambda delete-function --function-name data-pipeline-query-api

# Delete ElastiCache
aws elasticache delete-cache-cluster --cache-cluster-id data-pipeline-redis

# Delete RDS (skip final snapshot for dev)
aws rds delete-db-instance \
  --db-instance-identifier data-pipeline-db \
  --skip-final-snapshot

# Empty and delete S3 bucket
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3 rb s3://$BUCKET_NAME

# Delete secrets
aws secretsmanager delete-secret \
  --secret-id data-pipeline/db-credentials \
  --force-delete-without-recovery

# Delete security groups (after RDS/Redis deleted)
sleep 300  # Wait for resources to fully delete
aws ec2 delete-security-group --group-id $LAMBDA_SG
aws ec2 delete-security-group --group-id $RDS_SG
aws ec2 delete-security-group --group-id $REDIS_SG

# Delete subnet groups
aws rds delete-db-subnet-group --db-subnet-group-name data-pipeline-subnet-group
aws elasticache delete-cache-subnet-group --cache-subnet-group-name data-pipeline-redis-subnet

# Delete IAM role
aws iam delete-role-policy --role-name data-pipeline-lambda-role --policy-name DataPipelinePermissions
aws iam detach-role-policy --role-name data-pipeline-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam detach-role-policy --role-name data-pipeline-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam delete-role --role-name data-pipeline-lambda-role
```

---

## What You Learned

- ✅ Built event-driven data pipeline with S3 triggers
- ✅ Processed data automatically with Lambda
- ✅ Stored data in RDS PostgreSQL
- ✅ Implemented caching with ElastiCache Redis
- ✅ Secured credentials with Secrets Manager
- ✅ Configured VPC networking for databases
- ✅ Created query API with cache invalidation

---

## Next Steps

Head to [Lesson 7: Event-Driven Chaos](../lesson-07-event-driven-chaos/) to learn SNS, SQS, EventBridge, and Step Functions. You'll build complex event-driven workflows that can handle anything! 🚀
