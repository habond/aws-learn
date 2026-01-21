# Lesson 11: Security Deep Dive - Lock Everything Down! 🔒

**Time**: ~8 hours | **Cost**: ~$2-3

## What You're Building

Implement comprehensive security for AWS environment: secure IAM policies, encrypt data with KMS, detect threats with GuardDuty, protect APIs with WAF, audit with CloudTrail, and scan for vulnerabilities. This is the lesson that keeps you employed (and out of the news for security breaches).

## What You'll Learn

- **IAM Best Practices**: Least privilege, policies, roles
- **KMS**: Encryption key management
- **WAF**: Web application firewall
- **GuardDuty**: Threat detection
- **CloudTrail**: Audit logging
- **Secrets Manager**: Credential management
- **Security Hub**: Centralized security findings
- **IAM Access Analyzer**: Find overly permissive access

## Prerequisites

- [ ] Completed Lessons 1-10
- [ ] AWS CLI configured
- [ ] Running application to secure

---

## Part 1: IAM Deep Dive (2 hours)

### Step 1: Audit Current IAM Configuration

```bash
# List all users
aws iam list-users

# Check users without MFA
aws iam list-users --query 'Users[*].[UserName]' --output text | \
  while read user; do
    mfa=$(aws iam list-mfa-devices --user-name $user --query 'MFADevices' --output text)
    if [ -z "$mfa" ]; then
      echo "No MFA: $user"
    fi
  done

# Find overly permissive policies
aws iam list-policies \
  --scope Local \
  --query 'Policies[?contains(PolicyName, `Admin`)].PolicyName'

# Check for unused credentials
aws iam generate-credential-report
sleep 5
aws iam get-credential-report --query 'Content' --output text | base64 -d > credentials-report.csv

# View root account usage (should be minimal!)
aws iam get-account-summary
```

### Step 2: Create Least-Privilege Policies

Example: DynamoDB read-only for specific table:

```bash
cat > dynamodb-readonly-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/my-specific-table"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name DynamoDBReadOnlySpecific \
  --policy-document file://dynamodb-readonly-policy.json
```

### Step 3: Implement IAM Conditions

Example: Require MFA for sensitive operations:

```bash
cat > require-mfa-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "ec2:TerminateInstances",
        "rds:DeleteDBInstance",
        "s3:DeleteBucket"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
EOF
```

### Step 4: Enable IAM Access Analyzer

```bash
# Create analyzer
aws accessanalyzer create-analyzer \
  --analyzer-name account-analyzer \
  --type ACCOUNT

# List findings (overly permissive access)
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:$(aws sts get-caller-identity --query Account --output text):analyzer/account-analyzer

# Check specific resource
aws accessanalyzer list-findings \
  --analyzer-arn arn:aws:access-analyzer:us-east-1:$(aws sts get-caller-identity --query Account --output text):analyzer/account-analyzer \
  --filter "resourceType={eq='AWS::S3::Bucket'}"
```

### Step 5: Implement Service Control Policies (SCPs)

For AWS Organizations (if you have one):

```bash
# Example: Deny ability to disable CloudTrail
cat > deny-cloudtrail-disable.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Apply to organization (if applicable)
# aws organizations create-policy --content file://deny-cloudtrail-disable.json --name DenyCloudTrailDisable --type SERVICE_CONTROL_POLICY
```

---

## Part 2: Data Encryption with KMS (1.5 hours)

### Step 6: Create KMS Keys

```bash
# Create customer-managed key
aws kms create-key \
  --description "Application data encryption key" \
  --key-policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "Enable IAM policies",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::'"$(aws sts get-caller-identity --query Account --output text)"':root"
        },
        "Action": "kms:*",
        "Resource": "*"
      }
    ]
  }'

export KEY_ID=$(aws kms list-keys --query 'Keys[0].KeyId' --output text)

# Create alias
aws kms create-alias \
  --alias-name alias/application-key \
  --target-key-id $KEY_ID

echo "KMS Key ID: $KEY_ID"
```

### Step 7: Encrypt/Decrypt Data

```bash
# Encrypt data
echo "sensitive-data" | aws kms encrypt \
  --key-id alias/application-key \
  --plaintext fileb:///dev/stdin \
  --output text \
  --query CiphertextBlob > encrypted.txt

# Decrypt data
aws kms decrypt \
  --ciphertext-blob fileb://encrypted.txt \
  --output text \
  --query Plaintext | base64 -d
```

### Step 8: Enable S3 Bucket Encryption

```bash
export SECURE_BUCKET="secure-data-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$SECURE_BUCKET

# Enable default encryption with KMS
aws s3api put-bucket-encryption \
  --bucket $SECURE_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "'"$KEY_ID"'"
        }
      }
    ]
  }'

# Enable versioning (for data protection)
aws s3api put-bucket-versioning \
  --bucket $SECURE_BUCKET \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket $SECURE_BUCKET \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Step 9: Encrypt RDS Database

```bash
# Create encrypted RDS instance
aws rds create-db-instance \
  --db-instance-identifier secure-database \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 20 \
  --storage-encrypted \
  --kms-key-id $KEY_ID \
  --backup-retention-period 7 \
  --no-publicly-accessible
```

---

## Part 3: GuardDuty Threat Detection (1 hour)

### Step 10: Enable GuardDuty

```bash
# Enable GuardDuty
aws guardduty create-detector --enable

export DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)

echo "GuardDuty Detector ID: $DETECTOR_ID"

# Create SNS topic for findings
aws sns create-topic --name guardduty-findings

export GUARDDUTY_TOPIC_ARN=$(aws sns list-topics \
  --query "Topics[?contains(TopicArn, 'guardduty-findings')].TopicArn" \
  --output text)

# Subscribe email
aws sns subscribe \
  --topic-arn $GUARDDUTY_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### Step 11: Create EventBridge Rule for GuardDuty

```bash
# Create rule to forward findings to SNS
aws events put-rule \
  --name guardduty-findings-rule \
  --event-pattern '{
    "source": ["aws.guardduty"],
    "detail-type": ["GuardDuty Finding"]
  }'

# Add SNS as target
aws events put-targets \
  --rule guardduty-findings-rule \
  --targets "Id"="1","Arn"="$GUARDDUTY_TOPIC_ARN"

# Give EventBridge permission to publish to SNS
aws sns set-topic-attributes \
  --topic-arn $GUARDDUTY_TOPIC_ARN \
  --attribute-name Policy \
  --attribute-value '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "events.amazonaws.com"
        },
        "Action": "SNS:Publish",
        "Resource": "'"$GUARDDUTY_TOPIC_ARN"'"
      }
    ]
  }'

# Generate test finding
aws guardduty create-sample-findings \
  --detector-id $DETECTOR_ID \
  --finding-types UnauthorizedAccess:EC2/MaliciousIPCaller.Custom

# Check findings
aws guardduty list-findings --detector-id $DETECTOR_ID
```

---

## Part 4: WAF (Web Application Firewall) (1.5 hours)

### Step 12: Create WAF Web ACL

```bash
# Create web ACL
aws wafv2 create-web-acl \
  --name api-protection-acl \
  --scope REGIONAL \
  --region us-east-1 \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    },
    {
      "Name": "BlockSQLInjection",
      "Priority": 2,
      "Statement": {
        "SqliMatchStatement": {
          "FieldToMatch": {
            "QueryString": {}
          },
          "TextTransformations": [
            {
              "Priority": 0,
              "Type": "URL_DECODE"
            }
          ]
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "BlockSQLInjection"
      }
    }
  ]' \
  --visibility-config \
    SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ApiProtectionACL

export WEB_ACL_ARN=$(aws wafv2 list-web-acls \
  --scope REGIONAL \
  --region us-east-1 \
  --query "WebACLs[?Name=='api-protection-acl'].ARN" \
  --output text)

echo "Web ACL ARN: $WEB_ACL_ARN"
```

### Step 13: Associate WAF with API Gateway

```bash
# Get API Gateway stage ARN
export API_STAGE_ARN="arn:aws:apigateway:us-east-1::/restapis/$API_ID/stages/prod"

# Associate WAF with API Gateway
aws wafv2 associate-web-acl \
  --web-acl-arn $WEB_ACL_ARN \
  --resource-arn $API_STAGE_ARN \
  --region us-east-1
```

### Step 14: Add AWS Managed WAF Rules

```bash
# Add AWS managed rule groups
aws wafv2 update-web-acl \
  --name api-protection-acl \
  --scope REGIONAL \
  --region us-east-1 \
  --id $(echo $WEB_ACL_ARN | cut -d'/' -f3) \
  --lock-token $(aws wafv2 get-web-acl --name api-protection-acl --scope REGIONAL --region us-east-1 --id $(echo $WEB_ACL_ARN | cut -d'/' -f3) --query 'LockToken' --output text) \
  --default-action Allow={} \
  --visibility-config \
    SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ApiProtectionACL \
  --rules '[
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesCommonRuleSet"
      }
    }
  ]'
```

---

## Part 5: CloudTrail Auditing (1 hour)

### Step 15: Enable CloudTrail

```bash
# Create S3 bucket for CloudTrail logs
export TRAIL_BUCKET="cloudtrail-logs-$(aws sts get-caller-identity --query Account --output text)"
aws s3 mb s3://$TRAIL_BUCKET

# Apply bucket policy
cat > trail-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSCloudTrailAclCheck",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::$TRAIL_BUCKET"
    },
    {
      "Sid": "AWSCloudTrailWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::$TRAIL_BUCKET/AWSLogs/$(aws sts get-caller-identity --query Account --output text)/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket $TRAIL_BUCKET \
  --policy file://trail-bucket-policy.json

# Create trail
aws cloudtrail create-trail \
  --name security-audit-trail \
  --s3-bucket-name $TRAIL_BUCKET \
  --include-global-service-events \
  --is-multi-region-trail

# Start logging
aws cloudtrail start-logging --name security-audit-trail

# Enable log file validation (integrity)
aws cloudtrail update-trail \
  --name security-audit-trail \
  --enable-log-file-validation
```

### Step 16: Query CloudTrail Events

```bash
# Look up recent events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=CreateBucket \
  --max-results 10

# Find who accessed secrets
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-results 10

# Find unauthorized access attempts
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=UnauthorizedAccess
```

---

## Part 6: Security Hub (1 hour)

### Step 17: Enable Security Hub

```bash
# Enable Security Hub
aws securityhub enable-security-hub

# Enable security standards
aws securityhub batch-enable-standards \
  --standards-subscription-requests \
    StandardsArn=arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0 \
    StandardsArn=arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0

# Get findings
aws securityhub get-findings --max-results 10

# Get compliance summary
aws securityhub get-compliance-summary-by-compliance-status
```

### Step 18: Review and Fix Findings

```bash
# Get high-severity findings
aws securityhub get-findings \
  --filters '{"SeverityLabel":[{"Value":"HIGH","Comparison":"EQUALS"}]}' \
  --query 'Findings[*].[Title,Id]' \
  --output table

# Common findings and fixes:
# 1. S3 buckets without encryption → Enable default encryption
# 2. RDS without backups → Enable automated backups
# 3. Unused access keys → Remove/rotate
# 4. Security groups too open → Restrict rules
# 5. No MFA on root account → Enable MFA!
```

---

## Part 7: Secrets Rotation (45 minutes)

### Step 19: Set Up Secrets Manager with Rotation

```bash
# Create secret with rotation
aws secretsmanager create-secret \
  --name app/database/credentials \
  --secret-string '{"username":"admin","password":"'"$(openssl rand -base64 32)"'"}' \
  --description "Database credentials with automatic rotation"

# Create Lambda for rotation (simplified version)
# In production, use AWS-provided rotation templates

# Enable rotation (requires rotation Lambda)
# aws secretsmanager rotate-secret \
#   --secret-id app/database/credentials \
#   --rotation-lambda-arn $ROTATION_LAMBDA_ARN \
#   --rotation-rules AutomaticallyAfterDays=30
```

---

## Challenges (Optional)

### Easy
- [ ] Enable MFA on all IAM users
- [ ] Review and reduce IAM permissions
- [ ] Enable CloudTrail in all regions

### Medium
- [ ] Implement automated incident response
- [ ] Create custom Config rules
- [ ] Set up VPC Flow Logs analysis
- [ ] Build security dashboard

### Hard
- [ ] Implement zero-trust architecture
- [ ] Create automated remediation workflows
- [ ] Build custom threat detection rules
- [ ] Implement data loss prevention (DLP)

---

## Security Checklist

### Account Security
- [ ] MFA enabled on root account
- [ ] Root account not used for daily tasks
- [ ] Billing alerts configured
- [ ] CloudTrail enabled in all regions
- [ ] GuardDuty enabled
- [ ] Security Hub enabled

### IAM
- [ ] Least privilege policies
- [ ] No long-lived access keys
- [ ] MFA for sensitive operations
- [ ] Regular access reviews
- [ ] Service roles instead of user credentials

### Data Protection
- [ ] Encryption at rest (KMS)
- [ ] Encryption in transit (TLS)
- [ ] S3 buckets private by default
- [ ] Database encryption enabled
- [ ] Secrets in Secrets Manager

### Network Security
- [ ] Security groups restrictive
- [ ] NACLs configured
- [ ] WAF on public endpoints
- [ ] VPC Flow Logs enabled
- [ ] Private subnets for databases

### Monitoring
- [ ] CloudWatch alarms for security events
- [ ] GuardDuty findings reviewed
- [ ] Config rules monitoring compliance
- [ ] Access Analyzer findings addressed
- [ ] Regular security audits

---

## Cleanup

```bash
# Disable GuardDuty
aws guardduty delete-detector --detector-id $DETECTOR_ID

# Disable Security Hub
aws securityhub disable-security-hub

# Delete WAF Web ACL
aws wafv2 disassociate-web-acl --resource-arn $API_STAGE_ARN --region us-east-1
aws wafv2 delete-web-acl --name api-protection-acl --scope REGIONAL --region us-east-1 --id $(echo $WEB_ACL_ARN | cut -d'/' -f3) --lock-token $(aws wafv2 get-web-acl --name api-protection-acl --scope REGIONAL --region us-east-1 --id $(echo $WEB_ACL_ARN | cut -d'/' -f3) --query 'LockToken' --output text)

# Stop CloudTrail
aws cloudtrail stop-logging --name security-audit-trail
aws cloudtrail delete-trail --name security-audit-trail

# Delete S3 buckets
aws s3 rm s3://$TRAIL_BUCKET --recursive
aws s3 rb s3://$TRAIL_BUCKET
aws s3 rm s3://$SECURE_BUCKET --recursive
aws s3 rb s3://$SECURE_BUCKET

# Delete KMS key (schedule deletion)
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
```

---

## What You Learned

- ✅ Implemented IAM best practices
- ✅ Encrypted data with KMS
- ✅ Protected APIs with WAF
- ✅ Detected threats with GuardDuty
- ✅ Audited activity with CloudTrail
- ✅ Managed secrets securely
- ✅ Centralized security with Security Hub
- ✅ Found overly permissive access

---

## Security = Layers

No single security measure is enough. Use defense in depth:
- **Network**: VPC, security groups, WAF
- **IAM**: Least privilege, MFA
- **Data**: Encryption at rest and in transit
- **Detection**: GuardDuty, CloudTrail
- **Response**: Automated remediation
- **Audit**: Regular reviews and compliance checks

---

## Next Steps

Head to [Lesson 12: Victory Lap - Capstone Project](../lesson-12-victory-lap/) to build a complete production-ready application combining everything you've learned! 🎉
