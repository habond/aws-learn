# AWS CLI Cheatsheet

Quick reference for common AWS CLI commands used throughout the curriculum.

## General

```bash
# Configure AWS CLI
aws configure

# Check your identity
aws sts get-caller-identity

# Set default region
export AWS_DEFAULT_REGION=us-east-1

# Get account ID
aws sts get-caller-identity --query Account --output text
```

## S3

```bash
# List buckets
aws s3 ls

# Create bucket
aws s3 mb s3://bucket-name

# Upload file
aws s3 cp file.txt s3://bucket-name/

# Upload directory
aws s3 sync ./local-dir s3://bucket-name/

# Download file
aws s3 cp s3://bucket-name/file.txt ./

# Delete file
aws s3 rm s3://bucket-name/file.txt

# Empty bucket
aws s3 rm s3://bucket-name --recursive

# Delete bucket
aws s3 rb s3://bucket-name

# Make bucket public
aws s3api put-bucket-policy --bucket bucket-name --policy file://policy.json

# Enable website hosting
aws s3 website s3://bucket-name --index-document index.html --error-document error.html
```

## EC2

```bash
# List instances
aws ec2 describe-instances

# List running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"

# Launch instance
aws ec2 run-instances --image-id ami-xxx --instance-type t2.micro --key-name my-key

# Stop instance
aws ec2 stop-instances --instance-ids i-xxxxx

# Start instance
aws ec2 start-instances --instance-ids i-xxxxx

# Terminate instance
aws ec2 terminate-instances --instance-ids i-xxxxx

# Create key pair
aws ec2 create-key-pair --key-name my-key --query 'KeyMaterial' --output text > my-key.pem

# List security groups
aws ec2 describe-security-groups

# Create security group
aws ec2 create-security-group --group-name my-sg --description "My SG" --vpc-id vpc-xxx

# Add ingress rule
aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 22 --cidr 0.0.0.0/0

# List AMIs (your own)
aws ec2 describe-images --owners self

# Create AMI
aws ec2 create-image --instance-id i-xxx --name "my-ami"
```

## Lambda

```bash
# List functions
aws lambda list-functions

# Create function
aws lambda create-function \
  --function-name my-function \
  --runtime nodejs18.x \
  --role arn:aws:iam::xxx:role/lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip

# Update function code
aws lambda update-function-code --function-name my-function --zip-file fileb://function.zip

# Invoke function
aws lambda invoke --function-name my-function output.txt

# Delete function
aws lambda delete-function --function-name my-function

# Get function logs
aws logs tail /aws/lambda/my-function --follow
```

## DynamoDB

```bash
# List tables
aws dynamodb list-tables

# Create table
aws dynamodb create-table \
  --table-name my-table \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Put item
aws dynamodb put-item --table-name my-table --item '{"id":{"S":"123"},"name":{"S":"test"}}'

# Get item
aws dynamodb get-item --table-name my-table --key '{"id":{"S":"123"}}'

# Scan table
aws dynamodb scan --table-name my-table

# Delete table
aws dynamodb delete-table --table-name my-table
```

## IAM

```bash
# List users
aws iam list-users

# Create user
aws iam create-user --user-name my-user

# Create access key
aws iam create-access-key --user-name my-user

# Attach policy to user
aws iam attach-user-policy --user-name my-user --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# List roles
aws iam list-roles

# Create role
aws iam create-role --role-name my-role --assume-role-policy-document file://trust-policy.json

# Attach policy to role
aws iam attach-role-policy --role-name my-role --policy-arn arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole
```

## CloudFront

```bash
# List distributions
aws cloudfront list-distributions

# Create invalidation
aws cloudfront create-invalidation --distribution-id DISTID --paths "/*"

# Get distribution
aws cloudfront get-distribution --id DISTID
```

## Route 53

```bash
# List hosted zones
aws route53 list-hosted-zones

# Create hosted zone
aws route53 create-hosted-zone --name example.com --caller-reference $(date +%s)

# List record sets
aws route53 list-resource-record-sets --hosted-zone-id ZONE-ID
```

## CloudWatch

```bash
# List metrics
aws cloudwatch list-metrics

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# List alarms
aws cloudwatch describe-alarms

# List log groups
aws logs describe-log-groups

# Tail logs
aws logs tail /aws/lambda/my-function --follow

# Filter logs
aws logs filter-log-events --log-group-name /aws/lambda/my-function --filter-pattern "ERROR"
```

## RDS

```bash
# List instances
aws rds describe-db-instances

# Create instance
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password mypassword \
  --allocated-storage 20

# Delete instance
aws rds delete-db-instance --db-instance-identifier mydb --skip-final-snapshot
```

## ECS

```bash
# List clusters
aws ecs list-clusters

# Create cluster
aws ecs create-cluster --cluster-name my-cluster

# List services
aws ecs list-services --cluster my-cluster

# List tasks
aws ecs list-tasks --cluster my-cluster

# Run task
aws ecs run-task --cluster my-cluster --task-definition my-task
```

## Load Balancers

```bash
# List load balancers
aws elbv2 describe-load-balancers

# List target groups
aws elbv2 describe-target-groups

# Register targets
aws elbv2 register-targets --target-group-arn arn --targets Id=i-xxx
```

## Auto Scaling

```bash
# List auto scaling groups
aws autoscaling describe-auto-scaling-groups

# Set desired capacity
aws autoscaling set-desired-capacity --auto-scaling-group-name my-asg --desired-capacity 3

# Delete auto scaling group
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name my-asg --force-delete
```

## VPC

```bash
# List VPCs
aws ec2 describe-vpcs

# List subnets
aws ec2 describe-subnets

# List route tables
aws ec2 describe-route-tables

# List internet gateways
aws ec2 describe-internet-gateways
```

## Cost Explorer

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost"

# Get costs by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Useful Filters and Queries

```bash
# Get all running instances with their IPs
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].[InstanceId,PublicIpAddress,PrivateIpAddress]" \
  --output table

# Get all Lambda functions and their runtimes
aws lambda list-functions \
  --query "Functions[].[FunctionName,Runtime]" \
  --output table

# Get all S3 buckets with creation date
aws s3api list-buckets \
  --query "Buckets[].[Name,CreationDate]" \
  --output table
```

## Pro Tips

```bash
# Use jq for better JSON formatting
aws ec2 describe-instances | jq

# Use --output table for readable output
aws ec2 describe-instances --output table

# Use --query to filter results
aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name]"

# Use --dry-run to test commands without executing
aws ec2 run-instances --dry-run --image-id ami-xxx --instance-type t2.micro

# Use environment variables
export AWS_DEFAULT_REGION=us-east-1
export AWS_PROFILE=myprofile
```

## Helpful Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
alias awswho='aws sts get-caller-identity'
alias awsregion='echo $AWS_DEFAULT_REGION'
alias awsls='aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,PublicIpAddress]" --output table'
alias awscost='aws ce get-cost-and-usage --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) --granularity MONTHLY --metrics "UnblendedCost"'
```
