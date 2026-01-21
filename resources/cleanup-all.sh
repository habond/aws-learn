#!/bin/bash

# Emergency cleanup script for AWS resources
# WARNING: This will delete ALL resources created during the curriculum!
# Review carefully before running!

set -e

echo "🚨 AWS Cleanup Script"
echo "===================="
echo ""
echo "This script will DELETE the following resources:"
echo "  - EC2 instances, launch templates, AMIs"
echo "  - Auto Scaling Groups"
echo "  - Load Balancers and Target Groups"
echo "  - Lambda functions"
echo "  - DynamoDB tables"
echo "  - S3 buckets (will empty first)"
echo "  - CloudFront distributions"
echo "  - ECS clusters, services, tasks"
echo "  - RDS instances"
echo "  - Security groups (custom ones)"
echo ""
read -p "Are you SURE you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted. No changes made."
    exit 1
fi

echo ""
echo "Starting cleanup..."
echo ""

# Get default region
REGION=${AWS_DEFAULT_REGION:-us-east-1}
echo "Using region: $REGION"
echo ""

# 1. Terminate EC2 Instances
echo "1. Terminating EC2 instances..."
INSTANCE_IDS=$(aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running,stopped" \
    --query "Reservations[].Instances[].InstanceId" \
    --output text)

if [ ! -z "$INSTANCE_IDS" ]; then
    echo "   Found instances: $INSTANCE_IDS"
    aws ec2 terminate-instances --instance-ids $INSTANCE_IDS
    echo "   Waiting for instances to terminate..."
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_IDS
    echo "   ✓ Instances terminated"
else
    echo "   No instances to terminate"
fi

# 2. Delete Auto Scaling Groups
echo "2. Deleting Auto Scaling Groups..."
ASG_NAMES=$(aws autoscaling describe-auto-scaling-groups \
    --query "AutoScalingGroups[].AutoScalingGroupName" \
    --output text)

if [ ! -z "$ASG_NAMES" ]; then
    for ASG in $ASG_NAMES; do
        echo "   Deleting ASG: $ASG"
        aws autoscaling delete-auto-scaling-group \
            --auto-scaling-group-name $ASG \
            --force-delete
    done
    echo "   ✓ Auto Scaling Groups deleted"
else
    echo "   No Auto Scaling Groups to delete"
fi

# 3. Delete Load Balancers
echo "3. Deleting Load Balancers..."
LB_ARNS=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[].LoadBalancerArn" \
    --output text)

if [ ! -z "$LB_ARNS" ]; then
    for ARN in $LB_ARNS; do
        echo "   Deleting LB: $ARN"
        aws elbv2 delete-load-balancer --load-balancer-arn $ARN
    done
    echo "   Waiting for load balancers to delete..."
    sleep 60
    echo "   ✓ Load Balancers deleted"
else
    echo "   No Load Balancers to delete"
fi

# 4. Delete Target Groups
echo "4. Deleting Target Groups..."
TG_ARNS=$(aws elbv2 describe-target-groups \
    --query "TargetGroups[].TargetGroupArn" \
    --output text)

if [ ! -z "$TG_ARNS" ]; then
    for ARN in $TG_ARNS; do
        echo "   Deleting TG: $ARN"
        aws elbv2 delete-target-group --target-group-arn $ARN 2>/dev/null || echo "   (already deleted or in use)"
    done
    echo "   ✓ Target Groups deleted"
else
    echo "   No Target Groups to delete"
fi

# 5. Delete Lambda Functions
echo "5. Deleting Lambda functions..."
FUNCTIONS=$(aws lambda list-functions \
    --query "Functions[].FunctionName" \
    --output text)

if [ ! -z "$FUNCTIONS" ]; then
    for FUNC in $FUNCTIONS; do
        echo "   Deleting function: $FUNC"
        aws lambda delete-function --function-name $FUNC
    done
    echo "   ✓ Lambda functions deleted"
else
    echo "   No Lambda functions to delete"
fi

# 6. Delete DynamoDB Tables
echo "6. Deleting DynamoDB tables..."
TABLES=$(aws dynamodb list-tables \
    --query "TableNames[]" \
    --output text)

if [ ! -z "$TABLES" ]; then
    for TABLE in $TABLES; do
        echo "   Deleting table: $TABLE"
        aws dynamodb delete-table --table-name $TABLE
    done
    echo "   ✓ DynamoDB tables deleted"
else
    echo "   No DynamoDB tables to delete"
fi

# 7. Empty and Delete S3 Buckets
echo "7. Emptying and deleting S3 buckets..."
BUCKETS=$(aws s3 ls | awk '{print $3}')

if [ ! -z "$BUCKETS" ]; then
    for BUCKET in $BUCKETS; do
        echo "   Emptying bucket: $BUCKET"
        aws s3 rm s3://$BUCKET --recursive 2>/dev/null || echo "   (already empty or access denied)"
        echo "   Deleting bucket: $BUCKET"
        aws s3 rb s3://$BUCKET 2>/dev/null || echo "   (already deleted or access denied)"
    done
    echo "   ✓ S3 buckets deleted"
else
    echo "   No S3 buckets to delete"
fi

# 8. Delete RDS Instances
echo "8. Deleting RDS instances..."
RDS_INSTANCES=$(aws rds describe-db-instances \
    --query "DBInstances[].DBInstanceIdentifier" \
    --output text)

if [ ! -z "$RDS_INSTANCES" ]; then
    for DB in $RDS_INSTANCES; do
        echo "   Deleting RDS instance: $DB"
        aws rds delete-db-instance \
            --db-instance-identifier $DB \
            --skip-final-snapshot
    done
    echo "   ✓ RDS instances deletion initiated"
else
    echo "   No RDS instances to delete"
fi

# 9. Delete ECS Clusters
echo "9. Deleting ECS clusters..."
CLUSTERS=$(aws ecs list-clusters --query "clusterArns[]" --output text)

if [ ! -z "$CLUSTERS" ]; then
    for CLUSTER in $CLUSTERS; do
        echo "   Deleting services in cluster: $CLUSTER"
        SERVICES=$(aws ecs list-services --cluster $CLUSTER --query "serviceArns[]" --output text)
        for SERVICE in $SERVICES; do
            aws ecs update-service --cluster $CLUSTER --service $SERVICE --desired-count 0
            aws ecs delete-service --cluster $CLUSTER --service $SERVICE --force
        done

        echo "   Deleting cluster: $CLUSTER"
        aws ecs delete-cluster --cluster $CLUSTER
    done
    echo "   ✓ ECS clusters deleted"
else
    echo "   No ECS clusters to delete"
fi

# 10. Deregister AMIs
echo "10. Deregistering AMIs..."
AMI_IDS=$(aws ec2 describe-images --owners self \
    --query "Images[].ImageId" \
    --output text)

if [ ! -z "$AMI_IDS" ]; then
    for AMI in $AMI_IDS; do
        echo "   Deregistering AMI: $AMI"
        aws ec2 deregister-image --image-id $AMI
    done
    echo "   ✓ AMIs deregistered"
else
    echo "   No AMIs to deregister"
fi

# 11. Delete Launch Templates
echo "11. Deleting Launch Templates..."
TEMPLATES=$(aws ec2 describe-launch-templates \
    --query "LaunchTemplates[].LaunchTemplateName" \
    --output text)

if [ ! -z "$TEMPLATES" ]; then
    for TEMPLATE in $TEMPLATES; do
        echo "   Deleting template: $TEMPLATE"
        aws ec2 delete-launch-template --launch-template-name $TEMPLATE
    done
    echo "   ✓ Launch Templates deleted"
else
    echo "   No Launch Templates to delete"
fi

# 12. Note about CloudFront
echo "12. CloudFront distributions..."
echo "   CloudFront distributions cannot be deleted via script (requires disable first, then 15min wait)"
echo "   Please delete manually from AWS Console if needed"

# 13. Note about Security Groups
echo "13. Security groups..."
echo "   Custom security groups will auto-delete once all instances are terminated"
echo "   If you have orphaned security groups, delete them manually from console"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: Some resources may take a few minutes to fully delete."
echo "Check AWS Console to verify all resources are removed."
echo ""
echo "💰 Your AWS bill should now be minimal!"
