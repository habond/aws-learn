#!/usr/bin/env python3
import boto3
import json
import time
import random
from datetime import datetime

kinesis = boto3.client('kinesis')
STREAM_NAME = 'sensor-data-stream'

def generate_sensor_data(sensor_id):
    """Generate simulated sensor data"""
    return {
        'sensor_id': sensor_id,
        'timestamp': datetime.utcnow().isoformat(),
        'temperature': round(random.uniform(15.0, 30.0), 2),
        'humidity': round(random.uniform(30.0, 80.0), 2),
        'location': random.choice(['warehouse-1', 'warehouse-2', 'warehouse-3'])
    }

def send_data():
    """Send data to Kinesis stream"""
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
