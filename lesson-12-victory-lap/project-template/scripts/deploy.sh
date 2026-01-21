#!/bin/bash

# Deployment script for capstone project
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-dev}

echo "Deploying to environment: $ENVIRONMENT"

# Deploy infrastructure
echo "Deploying infrastructure..."
cd infrastructure
terraform init
terraform workspace select $ENVIRONMENT || terraform workspace new $ENVIRONMENT
terraform apply -auto-approve

# Get outputs
API_ENDPOINT=$(terraform output -raw api_endpoint)
echo "API Endpoint: $API_ENDPOINT"

# Deploy backend (if using Lambda)
echo "Deploying backend services..."
cd ../backend
# Add your backend deployment commands here

# Deploy frontend
echo "Deploying frontend..."
cd ../frontend
# Update API endpoint in config
sed -i.bak "s|YOUR_API_ENDPOINT_HERE|$API_ENDPOINT|g" index.html

# Upload to S3 (if static site)
# aws s3 sync . s3://your-frontend-bucket/ --delete

echo "Deployment complete!"
echo "Visit: $API_ENDPOINT"
