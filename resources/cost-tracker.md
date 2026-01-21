# AWS Cost Tracker

Track your spending for each lesson to stay within budget.

## Monthly Budget Target: $30

| Week | Lesson | Estimated | Actual | Notes | Status |
|------|--------|-----------|--------|-------|--------|
| 1 | Lesson 1: First Internet Empire | $1-2 | | | ⬜ |
| 2 | Lesson 2: Renting Computers | $2-3 | | | ⬜ |
| 3 | Lesson 3: Serverless | <$1 | | | ⬜ |
| 4 | Lesson 4: Terraform | <$1 | | | ⬜ |
| 5 | Lesson 5: Containers | $2-3 | | | ⬜ |
| 6 | Lesson 6: Data Pipelines | $2-3 | | | ⬜ |
| 7 | Lesson 7: Event-Driven | <$1 | | | ⬜ |
| 8 | Lesson 8: Big Data | $1-2 | | | ⬜ |
| 9 | Lesson 9: AI/ML | $2-5 | | | ⬜ |
| 10 | Lesson 10: Observability | $1-2 | | | ⬜ |
| 11 | Lesson 11: Security | <$1 | | | ⬜ |
| 12 | Lesson 12: Capstone | $3-5 | | | ⬜ |

**Total Estimated**: $18-29

## Check Your Current Costs

```bash
# Current month's costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost"

# By service
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Cost-Saving Tips

### Always Clean Up
- Delete resources immediately after lesson completion
- Use cleanup scripts provided in each lesson
- Check AWS Console to verify deletion

### Use Free Tier Wisely
- **EC2**: 750 hours/month of t2.micro
- **Lambda**: 1M requests/month + 400,000 GB-seconds
- **S3**: 5GB storage, 20,000 GET requests
- **RDS**: 750 hours/month of db.t2.micro
- **CloudFront**: 50GB data transfer out

### Set Up Billing Alerts
```bash
# Create SNS topic for billing alerts
aws sns create-topic --name billing-alerts

# Subscribe to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR-ACCOUNT-ID:billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### Tag Everything
Tag all resources with lesson name for cost tracking:
```bash
aws ec2 create-tags \
  --resources RESOURCE-ID \
  --tags Key=Lesson,Value=lesson-01 Key=Project,Value=aws-learn
```

## Most Expensive Services to Watch

1. **EC2 Instances** - Don't leave running overnight
2. **RDS Databases** - Delete when not in use
3. **NAT Gateways** - $0.045/hour = $32/month if left running
4. **Elastic IPs** - Not attached to running instance = charges
5. **Data Transfer** - Outbound data from AWS
6. **Load Balancers** - $0.025/hour = $18/month

## Weekly Cost Review Checklist

- [ ] Check current month's total spend
- [ ] Verify all lesson resources are deleted
- [ ] Review Cost Explorer for anomalies
- [ ] Check for idle resources (unattached EIPs, etc.)
- [ ] Update this tracker with actual costs
- [ ] Adjust budget if needed

## Emergency: Costs Too High?

1. **Stop all running EC2 instances**:
   ```bash
   aws ec2 stop-instances --instance-ids $(aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId' --output text)
   ```

2. **Delete expensive resources**:
   - Load Balancers
   - NAT Gateways
   - RDS instances
   - Elastic IPs not in use

3. **Run cleanup script**:
   ```bash
   ./resources/cleanup-all.sh
   ```

4. **Contact AWS Support** if you think there's an error

## Notes

Keep track of any unexpected costs or learnings about AWS pricing here:

```
Date | Service | Cost | Reason | Lesson Learned
-----|---------|------|--------|---------------




```
