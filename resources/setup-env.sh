#!/bin/bash

# Setup common environment variables for AWS learning curriculum
# Usage: source setup-env.sh

echo "Setting up AWS learning environment..."

# Set default region
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
echo "✓ AWS Region: $AWS_DEFAULT_REGION"

# Get account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✓ AWS Account ID: $AWS_ACCOUNT_ID"
else
    echo "⚠ Could not get AWS Account ID. Is AWS CLI configured?"
fi

# Get current user
export AWS_USER=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✓ AWS User: $AWS_USER"
fi

# Set project tag (for cost tracking)
export PROJECT_TAG="aws-learn"
echo "✓ Project Tag: $PROJECT_TAG"

# Get default VPC
export DEFAULT_VPC=$(aws ec2 describe-vpcs \
    --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" \
    --output text 2>/dev/null)
if [ $? -eq 0 ] && [ "$DEFAULT_VPC" != "None" ]; then
    echo "✓ Default VPC: $DEFAULT_VPC"
fi

# Helper functions
alias awswho='aws sts get-caller-identity'
alias awsregion='echo $AWS_DEFAULT_REGION'
alias awscost='aws ce get-cost-and-usage --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) --granularity MONTHLY --metrics "UnblendedCost"'
alias awsls='aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress,Tags[?Key=='\''Name'\''].Value|[0]]" --output table'

echo ""
echo "Useful aliases added:"
echo "  awswho     - Show current AWS identity"
echo "  awsregion  - Show current region"
echo "  awscost    - Show current month's costs"
echo "  awsls      - List EC2 instances"
echo ""
echo "Environment ready! 🚀"
