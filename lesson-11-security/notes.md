# Lesson 11 Notes: AWS Security

## IAM Best Practices

### Least Privilege
- Grant only permissions needed
- Use managed policies when possible
- Review permissions regularly
- Use IAM Access Analyzer

### Authentication
- MFA for all users (especially root!)
- Rotate credentials regularly
- No long-lived access keys
- Use temporary credentials (STS)

### Authorization
- Use roles, not users, for applications
- Service-specific roles
- Conditions in policies (IP, MFA, time)
- Resource-level permissions

## Encryption

### At Rest
- KMS for key management
- S3 default encryption
- RDS/EBS encryption
- Encrypted backups

### In Transit
- TLS/SSL for all connections
- Certificate Manager for certs
- Enforce HTTPS
- VPN for internal traffic

## Threat Detection

### GuardDuty
- Monitors VPC Flow Logs, CloudTrail, DNS logs
- ML-powered threat detection
- Findings by severity
- Automated response via EventBridge

### Security Hub
- Centralized security findings
- Compliance standards (CIS, PCI-DSS)
- Integration with many services
- Prioritized findings

## Monitoring & Audit

### CloudTrail
- API call logging
- Multi-region trails
- Log file validation
- Integrate with CloudWatch

### Config
- Resource configuration tracking
- Compliance rules
- Configuration history
- Remediation

## My Notes

(Your notes here)
