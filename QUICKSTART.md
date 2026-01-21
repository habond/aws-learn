# Quick Start Guide ⚡

**Want to jump right in? Follow these 5 steps.**

## Step 1: AWS Account Setup (10 min)

```bash
# 1. Create AWS account at aws.amazon.com
# 2. Set up billing alerts (IMPORTANT!)
#    → AWS Console → Billing → Set $10 alert
```

## Step 2: Install & Configure AWS CLI (5 min)

```bash
# Install (macOS)
brew install awscli

# Configure
aws configure
# Enter your Access Key ID & Secret (get from IAM console)
# Region: us-east-1
# Output: json

# Verify it works
aws sts get-caller-identity
```

## Step 3: Set Up Environment (2 min)

```bash
cd /Users/henrybond/Developer/aws-learn

# Load helpful aliases and environment variables
source resources/setup-env.sh
```

## Step 4: Start Lesson 1 (NOW!)

```bash
cd lesson-01-first-internet-empire
open README.md

# Or just start reading:
# lesson-01-first-internet-empire/README.md
```

## Step 5: Have Fun! 🚀

Build your first AWS project:
- Deploy a website to S3
- Add CloudFront CDN
- Set up custom domain
- Monitor with CloudWatch

**Time**: ~6 hours
**Cost**: ~$1-2

---

## Essential Commands

```bash
# Check who you are
aws sts get-caller-identity

# Check this month's costs
awscost  # (if you sourced setup-env.sh)

# List running EC2 instances
awsls

# Emergency cleanup (deletes EVERYTHING!)
./resources/cleanup-all.sh
```

## Need More Details?

- **Full setup guide**: [GETTING-STARTED.md](GETTING-STARTED.md)
- **Curriculum overview**: [README.md](README.md)
- **Your learning profile**: [SPEC.md](SPEC.md)

## Resources

- **AWS Cheatsheet**: [resources/aws-cheatsheet.md](resources/aws-cheatsheet.md)
- **Cost Tracker**: [resources/cost-tracker.md](resources/cost-tracker.md)
- **Cleanup Script**: [resources/cleanup-all.sh](resources/cleanup-all.sh)

---

**Ready? Go to [Lesson 1](lesson-01-first-internet-empire/README.md) and start building!** 🎉
