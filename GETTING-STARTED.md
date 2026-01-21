# Getting Started with Your AWS Learning Journey 🚀

Welcome! You're about to start a 12-week hands-on journey to AWS mastery. This guide will help you get set up and ready for Lesson 1.

## Before You Start

### 1. Create AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the signup process
4. **Add a credit card** (required, but we'll keep costs minimal)
5. Choose the **Free Tier** plan

**Important**: You'll get 12 months of free tier access!

### 2. Install Required Tools

#### AWS CLI

**macOS** (you're on Mac):
```bash
# Using Homebrew
brew install awscli

# Verify installation
aws --version
```

**Or download from**: https://aws.amazon.com/cli/

#### Node.js (for serverless lessons)
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

#### Python 3 (for Lambda and scripts)
```bash
# Should already be installed on macOS
python3 --version

# Install pip if needed
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py
```

#### Code Editor
You probably already have one, but if not:
- [VS Code](https://code.visualstudio.com/) (recommended)
- Or use whatever you prefer!

### 3. Configure AWS CLI

After creating your AWS account:

```bash
# Run AWS configure
aws configure

# You'll be prompted for:
# - AWS Access Key ID: (get from IAM console)
# - AWS Secret Access Key: (get from IAM console)
# - Default region name: us-east-1 (or your preferred region)
# - Default output format: json
```

**To get your Access Keys:**
1. Go to AWS Console → IAM
2. Click on your username → Security credentials
3. Create access key → CLI
4. **Copy and save both keys** (you won't see them again!)

### 4. Verify Everything Works

```bash
# Check AWS CLI is working
aws sts get-caller-identity

# Should show your account ID and user ARN
```

If this works, you're ready! 🎉

## Set Up Your Learning Environment

```bash
# Navigate to the curriculum directory
cd /Users/henrybond/Developer/aws-learn

# Set up environment variables (recommended)
source resources/setup-env.sh

# This sets up helpful aliases and environment variables
```

## Your First Steps

### 1. Set Up Billing Alerts (CRITICAL!)

This prevents surprise bills:

1. Go to AWS Console → Billing Dashboard
2. Click "Billing preferences"
3. Check "Receive Free Tier Usage Alerts"
4. Check "Receive Billing Alerts"
5. Enter your email
6. Save preferences

Then create a CloudWatch billing alarm:
1. Go to CloudWatch → Alarms → Billing
2. Create alarm
3. Set threshold: $10 (or your comfort level)
4. Add your email for notifications

**Do this BEFORE starting Lesson 1!**

### 2. Understand the Cost Model

- **Free Tier**: Most lessons use free tier services
- **Estimated Total Cost**: $20-30 for entire curriculum
- **Per Lesson**: Usually $0-3
- **Key**: Always clean up resources after each lesson!

Track your costs in [resources/cost-tracker.md](resources/cost-tracker.md)

### 3. Read the Curriculum Overview

Check out [README.md](README.md) for:
- Full curriculum overview
- What you'll learn
- Progress tracking
- Service reference guide

## Start Lesson 1!

You're ready to begin! Head to:

**[Lesson 1: Your First Internet Empire](lesson-01-first-internet-empire/README.md)**

This lesson takes ~6 hours and will teach you:
- S3 (storage)
- CloudFront (CDN)
- Route 53 (DNS)
- AWS CLI basics

You'll deploy your own website to AWS with a custom domain!

## Learning Tips

### 1. Take Notes
Each lesson has a `notes.md` file. Use it! Write down:
- Things you learned
- Confusing parts
- Aha moments
- Questions

### 2. Don't Skip Cleanup
**ALWAYS run the cleanup section** at the end of each lesson. This:
- Prevents unexpected costs
- Teaches you resource management
- Keeps your account clean

### 3. Experiment!
- Try breaking things on purpose
- Modify the code
- Build something different
- Make mistakes and learn from them

### 4. Use the Resources
- [resources/aws-cheatsheet.md](resources/aws-cheatsheet.md) - Quick CLI reference
- [resources/cost-tracker.md](resources/cost-tracker.md) - Track spending
- [resources/setup-env.sh](resources/setup-env.sh) - Environment setup
- [resources/cleanup-all.sh](resources/cleanup-all.sh) - Emergency cleanup

### 5. Time Management
- **Target**: 5-10 hours per week
- **Flexible**: Go at your own pace
- **Don't Rush**: Understanding > Speed
- **One Lesson at a Time**: Complete before moving on

## Your Learning Path

```
Week 1  → Lesson 1: S3, CloudFront, Route 53
Week 2  → Lesson 2: EC2, VPC, Load Balancers
Week 3  → Lesson 3: Lambda, API Gateway, DynamoDB
Week 4  → Lesson 4: Terraform Fundamentals
Week 5  → Lesson 5: Docker, ECS, Containers
Week 6  → Lesson 6: Data Pipelines
Week 7  → Lesson 7: Event-Driven Architecture
Week 8  → Lesson 8: Big Data & Analytics
Week 9  → Lesson 9: Machine Learning
Week 10 → Lesson 10: Observability & Monitoring
Week 11 → Lesson 11: Security & Compliance
Week 12 → Lesson 12: Capstone Project
```

## Helpful Resources

### AWS Documentation
- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)

### Community Support
- [AWS re:Post](https://repost.aws/) - Official AWS forum
- [r/aws](https://reddit.com/r/aws) - Reddit community
- [Stack Overflow](https://stackoverflow.com/questions/tagged/amazon-web-services)

### When You Get Stuck
1. Read the error message carefully
2. Check the troubleshooting section in the lesson
3. Search AWS documentation
4. Google the exact error
5. Ask me (Claude) for help!

## Quick Reference

### Useful Commands
```bash
# Check your AWS identity
aws sts get-caller-identity

# Check current region
echo $AWS_DEFAULT_REGION

# Check this month's costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost"

# List running EC2 instances
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --output table
```

### Emergency Cleanup
If you forget to clean up resources:
```bash
./resources/cleanup-all.sh
```
**Warning**: This deletes EVERYTHING! Use with caution.

## Ready to Start?

Everything set up? Great!

👉 **Go to [Lesson 1](lesson-01-first-internet-empire/README.md) and start building!**

Remember:
- ✅ Set up billing alerts first
- ✅ Have fun and experiment
- ✅ Take notes
- ✅ Clean up resources
- ✅ Track your costs
- ✅ Go at your own pace

**Let's build your AWS empire! 🚀**

---

## Need Help?

Having issues? Check:
1. Your lesson's troubleshooting section
2. [AWS CLI Cheatsheet](resources/aws-cheatsheet.md)
3. AWS documentation
4. Or just ask - I'm here to help!

Good luck! You're about to learn a TON about AWS. 🎉
