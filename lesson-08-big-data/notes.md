# Lesson 8 Notes: Big Data Analytics

## Key Concepts

### Kinesis Data Streams
- Real-time data ingestion
- Shards determine throughput
- Data retention: 24h - 365 days
- Consumers pull data

### Kinesis Firehose
- Simplified data delivery
- Automatic scaling
- Buffers data (time/size)
- Delivers to S3, Redshift, ElasticSearch

### AWS Glue
- Managed ETL service
- Data Catalog (metadata)
- Crawlers discover schema
- Spark-based jobs

### Athena
- Serverless SQL queries on S3
- Pay per query (TB scanned)
- Supports Parquet, ORC, JSON, CSV
- Partition data to save costs

## Architecture Patterns

### Lambda Architecture
- Batch layer (historical data)
- Speed layer (real-time)
- Serving layer (queries)

### Data Lake
- Store all data in S3 (raw)
- Catalog with Glue
- Query with Athena
- Process with Lambda/Glue

## Optimization Tips

### Reduce Athena Costs
- Partition data (year/month/day)
- Use columnar formats (Parquet)
- Compress data (GZIP, Snappy)
- Limit scanned data with WHERE

### Kinesis Performance
- More shards = more throughput
- Batch writes when possible
- Use partition keys wisely
- Monitor shard metrics

## My Notes

(Your notes here)
