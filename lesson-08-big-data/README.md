# Lesson 8: Big Data Analytics (Process ALL The Data!) 📈

**Time**: ~7 hours | **Cost**: ~$3-5 (delete resources!)

## What You're Building

Build a real-time analytics pipeline that ingests streaming data, processes it, and makes it queryable via SQL. You'll simulate IoT sensor data (temperature, humidity), stream it through Kinesis, transform it with Glue, and query it with Athena. Real-world use case: IoT analytics, clickstream analysis, log aggregation.

## What You'll Learn

- **Kinesis Data Streams**: Real-time data ingestion
- **Kinesis Firehose**: Delivery to S3/Redshift
- **AWS Glue**: ETL and data catalog
- **Athena**: Serverless SQL queries
- **S3**: Data lake storage
- **Partitioning**: Optimize query performance

## Prerequisites

- [ ] Completed Lessons 1-7
- [ ] AWS CLI configured
- [ ] Python installed (for data generation)

---

## Part 1: Kinesis Data Streams (1.5 hours)

### Step 1: Create Kinesis Stream

```bash
# Create stream for sensor data
aws kinesis create-stream \
  --stream-name sensor-data-stream \
  --shard-count 1

# Wait for stream to be active
aws kinesis wait stream-exists --stream-name sensor-data-stream

# Get stream ARN
export STREAM_ARN=$(aws kinesis describe-stream \
  --stream-name sensor-data-stream \
  --query 'StreamDescription.StreamARN' \
  --output text)

echo "Stream ARN: $STREAM_ARN"
```

### Step 2: Create Data Producer

Create `producer.py`:

```python
import boto3
import json
import time
import random
from datetime import datetime

kinesis = boto3.client('kinesis')
STREAM_NAME = 'sensor-data-stream'

def generate_sensor_data(sensor_id):
    return {
        'sensor_id': sensor_id,
        'timestamp': datetime.utcnow().isoformat(),
        'temperature': round(random.uniform(15.0, 30.0), 2),
        'humidity': round(random.uniform(30.0, 80.0), 2),
        'location': random.choice(['warehouse-1', 'warehouse-2', 'warehouse-3'])
    }

def send_data():
    sensor_ids = [f'sensor-{i:03d}' for i in range(1, 11)]

    print("Starting data producer...")
    try:
        while True:
            for sensor_id in sensor_ids:
                data = generate_sensor_data(sensor_id)

                kinesis.put_record(
                    StreamName=STREAM_NAME,
                    Data=json.dumps(data),
                    PartitionKey=sensor_id
                )

                print(f"Sent: {data}")

            time.sleep(2)
    except KeyboardInterrupt:
        print("\nStopped producer")

if __name__ == '__main__':
    send_data()
```

Install boto3 and run:

```bash
pip3 install boto3

# Run producer (keep it running in background)
python3 producer.py &
export PRODUCER_PID=$!
```

### Step 3: Test Stream with Consumer

```bash
# Get shard iterator
export SHARD_ITERATOR=$(aws kinesis get-shard-iterator \
  --stream-name sensor-data-stream \
  --shard-id shardId-000000000000 \
  --shard-iterator-type LATEST \
  --query 'ShardIterator' \
  --output text)

# Read records
aws kinesis get-records --shard-iterator $SHARD_ITERATOR

# You should see sensor data!
```

---

## Part 2: Kinesis Firehose to S3 (1 hour)

### Step 4: Create S3 Bucket for Data Lake

```bash
export BUCKET_NAME="sensor-data-lake-$(aws sts get-caller-identity --query Account --output text)"

aws s3 mb s3://$BUCKET_NAME

echo "Data Lake Bucket: $BUCKET_NAME"
```

### Step 5: Create Firehose Delivery Stream

```bash
# Create Firehose IAM role
cat > firehose-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "firehose.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name firehose-delivery-role \
  --assume-role-policy-document file://firehose-trust-policy.json

# Create policy for S3 and Kinesis access
cat > firehose-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
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
        "kinesis:DescribeStream",
        "kinesis:GetShardIterator",
        "kinesis:GetRecords"
      ],
      "Resource": "$STREAM_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name firehose-delivery-role \
  --policy-name FirehoseDeliveryPolicy \
  --policy-document file://firehose-policy.json

export FIREHOSE_ROLE_ARN=$(aws iam get-role \
  --role-name firehose-delivery-role \
  --query 'Role.Arn' \
  --output text)

# Wait for role propagation
sleep 10

# Create delivery stream
aws firehose create-delivery-stream \
  --delivery-stream-name sensor-data-delivery \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration \
    "KinesisStreamARN=$STREAM_ARN,RoleARN=$FIREHOSE_ROLE_ARN" \
  --extended-s3-destination-configuration \
    "RoleARN=$FIREHOSE_ROLE_ARN,BucketARN=arn:aws:s3:::$BUCKET_NAME,Prefix=sensor-data/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/,ErrorOutputPrefix=error/,BufferingHints={SizeInMBs=5,IntervalInSeconds=60},CompressionFormat=GZIP"
```

### Step 6: Wait and Check S3

```bash
# Wait a few minutes for data to buffer and arrive in S3
sleep 120

# Check S3 for data
aws s3 ls s3://$BUCKET_NAME/sensor-data/ --recursive
```

**Data is flowing into your data lake!** 🎉

---

## Part 3: AWS Glue (Data Catalog) (1.5 hours)

### Step 7: Create Glue Database

```bash
aws glue create-database \
  --database-input '{
    "Name": "sensor_analytics",
    "Description": "Database for sensor data analytics"
  }'
```

### Step 8: Create Glue Crawler

```bash
# Create Glue crawler role
cat > glue-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "glue.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name glue-crawler-role \
  --assume-role-policy-document file://glue-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name glue-crawler-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole

# Add S3 access
cat > glue-s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name glue-crawler-role \
  --policy-name GlueS3Access \
  --policy-document file://glue-s3-policy.json

export GLUE_ROLE_ARN=$(aws iam get-role \
  --role-name glue-crawler-role \
  --query 'Role.Arn' \
  --output text)

# Wait for role
sleep 10

# Create crawler
aws glue create-crawler \
  --name sensor-data-crawler \
  --role $GLUE_ROLE_ARN \
  --database-name sensor_analytics \
  --targets "{\"S3Targets\":[{\"Path\":\"s3://$BUCKET_NAME/sensor-data/\"}]}" \
  --schema-change-policy '{
    "UpdateBehavior": "UPDATE_IN_DATABASE",
    "DeleteBehavior": "LOG"
  }'

# Run crawler
aws glue start-crawler --name sensor-data-crawler

# Wait for crawler to complete (takes 1-2 minutes)
sleep 120

# Check crawler status
aws glue get-crawler --name sensor-data-crawler

# View tables
aws glue get-tables --database-name sensor_analytics
```

---

## Part 4: Athena Queries (1.5 hours)

### Step 9: Create S3 Bucket for Query Results

```bash
export RESULTS_BUCKET="athena-results-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$RESULTS_BUCKET
```

### Step 10: Query Data with Athena

```bash
# Set query result location
aws athena create-work-group \
  --name sensor-analytics-workgroup \
  --configuration "ResultConfiguration={OutputLocation=s3://$RESULTS_BUCKET/}" \
  --description "Work group for sensor analytics"

# Run query to get average temperature by location
aws athena start-query-execution \
  --query-string "SELECT location, AVG(temperature) as avg_temp, AVG(humidity) as avg_humidity, COUNT(*) as reading_count FROM sensor_data GROUP BY location ORDER BY avg_temp DESC" \
  --query-execution-context Database=sensor_analytics \
  --work-group sensor-analytics-workgroup

# Get query execution ID from output
export QUERY_ID="paste-query-id-here"

# Check query status
aws athena get-query-execution --query-execution-id $QUERY_ID

# Get results (wait until query completes)
aws athena get-query-results --query-execution-id $QUERY_ID
```

### Step 11: More Useful Queries

Create `queries.sql`:

```sql
-- High temperature alerts
SELECT
  sensor_id,
  location,
  temperature,
  timestamp
FROM sensor_data
WHERE temperature > 28.0
ORDER BY timestamp DESC
LIMIT 10;

-- Hourly averages
SELECT
  DATE_TRUNC('hour', from_iso8601_timestamp(timestamp)) as hour,
  location,
  AVG(temperature) as avg_temp,
  AVG(humidity) as avg_humidity,
  COUNT(*) as readings
FROM sensor_data
GROUP BY DATE_TRUNC('hour', from_iso8601_timestamp(timestamp)), location
ORDER BY hour DESC, location;

-- Sensor health check (find sensors not reporting)
SELECT
  sensor_id,
  MAX(timestamp) as last_seen,
  COUNT(*) as total_readings
FROM sensor_data
GROUP BY sensor_id
ORDER BY last_seen DESC;
```

Run queries:

```bash
# Query 1: High temperature alerts
aws athena start-query-execution \
  --query-string "SELECT sensor_id, location, temperature, timestamp FROM sensor_data WHERE temperature > 28.0 ORDER BY timestamp DESC LIMIT 10" \
  --query-execution-context Database=sensor_analytics \
  --work-group sensor-analytics-workgroup

# Get results...
```

---

## Part 5: Real-time Processing with Lambda (1 hour)

### Step 12: Create Lambda for Kinesis Processing

Create `processor/index.js`:

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} records`);

  const alerts = [];

  for (const record of event.Records) {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    const data = JSON.parse(payload);

    console.log('Processing:', data);

    // Alert on high temperature
    if (data.temperature > 28.0) {
      alerts.push({
        sensor_id: data.sensor_id,
        location: data.location,
        temperature: data.temperature,
        timestamp: data.timestamp,
        alert_type: 'HIGH_TEMPERATURE'
      });
    }

    // Alert on high humidity
    if (data.humidity > 75.0) {
      alerts.push({
        sensor_id: data.sensor_id,
        location: data.location,
        humidity: data.humidity,
        timestamp: data.timestamp,
        alert_type: 'HIGH_HUMIDITY'
      });
    }
  }

  // Save alerts to S3
  if (alerts.length > 0) {
    const alertFile = `alerts/${new Date().toISOString()}.json`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: alertFile,
      Body: JSON.stringify(alerts, null, 2),
      ContentType: 'application/json'
    }));

    console.log(`Saved ${alerts.length} alerts to ${alertFile}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: event.Records.length,
      alerts: alerts.length
    })
  };
};
```

Deploy:

```bash
cd processor
npm init -y
npm install @aws-sdk/client-s3
zip -r function.zip .

# Create role (or reuse existing)
# Deploy function
aws lambda create-function \
  --function-name sensor-stream-processor \
  --runtime nodejs20.x \
  --role $LAMBDA_ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --environment "Variables={BUCKET_NAME=$BUCKET_NAME}"

# Create event source mapping
aws lambda create-event-source-mapping \
  --function-name sensor-stream-processor \
  --event-source-arn $STREAM_ARN \
  --starting-position LATEST \
  --batch-size 100
```

### Step 13: Monitor Processing

```bash
# Check Lambda logs
aws logs tail /aws/lambda/sensor-stream-processor --follow

# Check for alerts in S3
aws s3 ls s3://$BUCKET_NAME/alerts/
```

---

## Challenges (Optional)

### Easy
- [ ] Create CloudWatch dashboard for stream metrics
- [ ] Query data by date partition
- [ ] Add more sensor types

### Medium
- [ ] Set up CloudWatch alarms for anomalies
- [ ] Create Glue ETL job to clean data
- [ ] Build QuickSight dashboard for visualization
- [ ] Implement data retention policy

### Hard
- [ ] Add machine learning anomaly detection (SageMaker)
- [ ] Implement late-arriving data handling
- [ ] Create real-time aggregations with Kinesis Analytics
- [ ] Build Lambda data enrichment pipeline

---

## Troubleshooting

**Kinesis stream not receiving data?**
- Check producer is running
- Verify AWS credentials
- Check stream exists

**Firehose not delivering to S3?**
- Check IAM role permissions
- Verify S3 bucket exists
- Wait for buffer time (60 seconds)

**Glue crawler not finding data?**
- Verify S3 path is correct
- Check data format (JSON)
- Ensure IAM role has S3 access

**Athena queries failing?**
- Check table schema in Glue catalog
- Verify S3 result location
- Check query syntax

---

## Cleanup

```bash
# Stop producer
kill $PRODUCER_PID

# Delete event source mapping
aws lambda list-event-source-mappings \
  --function-name sensor-stream-processor \
  --query 'EventSourceMappings[0].UUID' \
  --output text | xargs -I {} aws lambda delete-event-source-mapping --uuid {}

# Delete Lambda
aws lambda delete-function --function-name sensor-stream-processor

# Delete Firehose
aws firehose delete-delivery-stream --delivery-stream-name sensor-data-delivery

# Delete Kinesis stream
aws kinesis delete-stream --stream-name sensor-data-stream

# Delete Glue resources
aws glue delete-crawler --name sensor-data-crawler
aws glue delete-database --name sensor_analytics

# Delete S3 buckets
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3 rb s3://$BUCKET_NAME
aws s3 rm s3://$RESULTS_BUCKET --recursive
aws s3 rb s3://$RESULTS_BUCKET

# Delete Athena workgroup
aws athena delete-work-group --work-group sensor-analytics-workgroup

# Delete IAM roles and policies
# (cleanup commands...)
```

---

## What You Learned

- ✅ Ingested streaming data with Kinesis
- ✅ Delivered data to S3 with Firehose
- ✅ Cataloged data with Glue
- ✅ Queried data with Athena (serverless SQL)
- ✅ Processed streams in real-time with Lambda
- ✅ Built complete analytics pipeline
- ✅ Implemented data lake architecture

---

## Next Steps

Head to [Lesson 9: AI/ML Buzzwords](../lesson-09-ai-ml-buzzwords/) to add machine learning to your applications with SageMaker, Rekognition, or Bedrock! 🤖
