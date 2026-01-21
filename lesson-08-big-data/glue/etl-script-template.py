import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read data from Glue catalog
datasource0 = glueContext.create_dynamic_frame.from_catalog(
    database = "sensor_analytics",
    table_name = "sensor_data"
)

# Transform data
applymapping1 = ApplyMapping.apply(
    frame = datasource0,
    mappings = [
        ("sensor_id", "string", "sensor_id", "string"),
        ("timestamp", "string", "timestamp", "timestamp"),
        ("temperature", "double", "temperature", "double"),
        ("humidity", "double", "humidity", "double"),
        ("location", "string", "location", "string")
    ]
)

# Write to S3
glueContext.write_dynamic_frame.from_options(
    frame = applymapping1,
    connection_type = "s3",
    connection_options = {
        "path": "s3://your-output-bucket/processed-data/"
    },
    format = "parquet"
)

job.commit()
