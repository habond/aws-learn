#!/usr/bin/env python3
import csv
import random
from datetime import datetime, timedelta

# Sample data
products = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Gadget Z']
regions = ['North', 'South', 'East', 'West']

def generate_sales_data(num_records=100, start_date=None):
    """Generate random sales data"""
    if start_date is None:
        start_date = datetime.now() - timedelta(days=30)

    records = []

    for i in range(num_records):
        record = {
            'date': (start_date + timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d'),
            'product': random.choice(products),
            'quantity': random.randint(10, 200),
            'revenue': round(random.uniform(100, 5000), 2),
            'region': random.choice(regions)
        }
        records.append(record)

    return records

def save_to_csv(records, filename='generated-sales.csv'):
    """Save records to CSV file"""
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = ['date', 'product', 'quantity', 'revenue', 'region']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for record in records:
            writer.writerow(record)

    print(f"Generated {len(records)} records in {filename}")

if __name__ == '__main__':
    records = generate_sales_data(100)
    save_to_csv(records)
