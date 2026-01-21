# AWS Security Audit Checklist

## Account Security
- [ ] MFA enabled on root account
- [ ] Root account not used for daily tasks
- [ ] Contact information up to date
- [ ] Billing alerts configured
- [ ] CloudTrail enabled in all regions
- [ ] GuardDuty enabled
- [ ] Security Hub enabled
- [ ] AWS Config enabled

## IAM
- [ ] Least privilege policies implemented
- [ ] No long-lived access keys (use temporary credentials)
- [ ] MFA required for sensitive operations
- [ ] Regular access reviews performed
- [ ] Service roles used instead of user credentials
- [ ] Unused credentials removed
- [ ] Password policy enforced
- [ ] IAM Access Analyzer findings addressed

## Data Protection
- [ ] Encryption at rest enabled (KMS)
- [ ] Encryption in transit enforced (TLS)
- [ ] S3 buckets private by default
- [ ] S3 bucket versioning enabled
- [ ] Database encryption enabled
- [ ] Secrets in Secrets Manager (not hardcoded)
- [ ] Backup encryption enabled
- [ ] Key rotation policies implemented

## Network Security
- [ ] Security groups restrictive (least privilege)
- [ ] NACLs configured appropriately
- [ ] WAF on public endpoints
- [ ] VPC Flow Logs enabled
- [ ] Private subnets for databases
- [ ] No direct internet access for databases
- [ ] Bastion hosts or Systems Manager for access
- [ ] VPC endpoints for AWS services

## Monitoring & Logging
- [ ] CloudWatch alarms for security events
- [ ] GuardDuty findings reviewed regularly
- [ ] Config rules monitoring compliance
- [ ] Access Analyzer findings addressed
- [ ] Log retention policies defined
- [ ] Centralized logging implemented
- [ ] Automated alerting configured

## Compute
- [ ] EC2 instances patched regularly
- [ ] ECS task definitions follow security best practices
- [ ] Lambda functions have minimal permissions
- [ ] No hardcoded credentials in code
- [ ] Regular vulnerability scanning
- [ ] Immutable infrastructure preferred

## Compliance
- [ ] Industry-specific compliance requirements met
- [ ] Regular compliance audits performed
- [ ] Documentation maintained
- [ ] Incident response plan documented
- [ ] Disaster recovery plan tested
