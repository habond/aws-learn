# AWS Learning Curriculum: The Fun Edition 🚀

**Your 12-Week Hands-On Journey to AWS Mastery**

📖 **[View Interactive Course Website](https://habond.github.io/aws-learn/)**

---

## About This Curriculum

This is your personalized AWS learning path designed for:
- **Learning style**: Hands-on, learn by doing
- **Time commitment**: 5-10 hours/week
- **Approach**: Console/CLI first for intuition, then Terraform
- **Focus**: Build real projects, have fun, break things productively

**The vibe**: Learn by building cool stuff, not by reading boring tutorials. Make mistakes. Break things. Fix them. Ship projects. Have fun.

---

## Your Learning Profile

- **Background**: Strong programming (JavaScript, Python, Java, Rust, C/C++), Meta experience
- **Goals**: Career development & knowledge exploration
- **Interests**: Web apps, serverless, APIs, data processing, ML, observability
- **Cloud experience**: Beginner (brief AWS/GCP exposure)

---

## Curriculum Overview

### Phase 1: Foundations (Weeks 1-3)
- [Lesson 1: Your First Internet Empire](./lesson-01-first-internet-empire/) - S3, CloudFront, Route 53
- [Lesson 2: Renting Computers](./lesson-02-renting-computers/) - EC2, VPC, Load Balancers
- [Lesson 3: Servers Are So 2010](./lesson-03-servers-are-so-2010/) - Lambda, API Gateway, DynamoDB

### Phase 2: Infrastructure as Code (Weeks 4-6)
- [Lesson 4: Automate All Things](./lesson-04-automate-all-things/) - Terraform fundamentals
- [Lesson 5: Containers](./lesson-05-containers/) - Docker, ECS, Fargate
- [Lesson 6: Data Pipelines](./lesson-06-data-pipelines/) - S3 events, RDS, ElastiCache

### Phase 3: Getting Fancy (Weeks 7-9)
- [Lesson 7: Event-Driven Chaos](./lesson-07-event-driven-chaos/) - SNS, SQS, Step Functions
- [Lesson 8: Big Data](./lesson-08-big-data/) - Kinesis, Glue, Athena
- [Lesson 9: AI/ML Buzzwords](./lesson-09-ai-ml-buzzwords/) - SageMaker, Rekognition, Bedrock

### Phase 4: Production Ready (Weeks 10-12)
- [Lesson 10: Observability](./lesson-10-observability/) - CloudWatch, X-Ray, Grafana
- [Lesson 11: Security](./lesson-11-security/) - IAM, WAF, GuardDuty, KMS
- [Lesson 12: Victory Lap](./lesson-12-victory-lap/) - Capstone project

---

## Progress Tracker

### Phase 1: Foundations
- [ ] **Lesson 1**: Your First Internet Empire (Week 1, ~6 hours)
- [ ] **Lesson 2**: Renting Computers (Week 2, ~8 hours)
- [ ] **Lesson 3**: Servers Are So 2010 (Week 3, ~6 hours)

### Phase 2: Infrastructure as Code
- [ ] **Lesson 4**: Automate All Things (Week 4, ~7 hours)
- [ ] **Lesson 5**: Containers (Week 5, ~8 hours)
- [ ] **Lesson 6**: Data Pipelines (Week 6, ~7 hours)

### Phase 3: Getting Fancy
- [ ] **Lesson 7**: Event-Driven Chaos (Week 7, ~8 hours)
- [ ] **Lesson 8**: Big Data (Week 8, ~7 hours)
- [ ] **Lesson 9**: AI/ML Buzzwords (Week 9, ~6 hours)

### Phase 4: Production Ready
- [ ] **Lesson 10**: Observability (Week 10, ~6 hours)
- [ ] **Lesson 11**: Security (Week 11, ~8 hours)
- [ ] **Lesson 12**: Victory Lap (Week 12, ~10-20 hours)

**Total Progress**: 0/12 lessons completed

---

## Quick Reference: AWS Services You'll Master

| Service | What It Does | When You Learn It |
|---------|-------------|-------------------|
| **S3** | Object storage (files in the cloud) | Lesson 1, 6, 7, 8 |
| **CloudFront** | CDN (make things fast globally) | Lesson 1 |
| **Route 53** | DNS (domain management) | Lesson 1 |
| **EC2** | Virtual servers | Lesson 2 |
| **VPC** | Private networks | Lesson 2, 11 |
| **ALB** | Load balancers | Lesson 2, 5 |
| **Lambda** | Serverless functions | Lesson 3, 6, 7 |
| **API Gateway** | REST APIs | Lesson 3, 9 |
| **DynamoDB** | NoSQL database | Lesson 3 |
| **RDS** | SQL databases | Lesson 6 |
| **ElastiCache** | Redis/Memcached | Lesson 6 |
| **SNS/SQS** | Messaging/queues | Lesson 7 |
| **Step Functions** | Workflow orchestration | Lesson 7 |
| **Kinesis** | Real-time data streams | Lesson 8 |
| **Athena** | Query S3 with SQL | Lesson 8 |
| **SageMaker** | Machine learning | Lesson 9 |
| **CloudWatch** | Monitoring/logging | All lessons |
| **X-Ray** | Distributed tracing | Lesson 10 |
| **Grafana** | Visualization | Lesson 10 |
| **IAM** | Permissions/security | All lessons |
| **WAF** | Web application firewall | Lesson 11 |
| **Terraform** | Infrastructure as code | Lessons 4-12 |

---

## Cost Tracking

Keep track of your AWS spending to avoid surprises!

| Week | Lesson | Estimated Cost | Actual Cost | Notes |
|------|--------|----------------|-------------|-------|
| 1 | Lesson 1 | ~$1-2 | | Domain registration (optional) |
| 2 | Lesson 2 | ~$2-3 | | EC2 instances (destroy after!) |
| 3 | Lesson 3 | <$1 | | Serverless is cheap! |
| 4 | Lesson 4 | <$1 | | Infrastructure rebuild |
| 5 | Lesson 5 | ~$2-3 | | ECS/Fargate |
| 6 | Lesson 6 | ~$2-3 | | RDS (destroy after!) |
| 7 | Lesson 7 | <$1 | | Event-driven is cheap |
| 8 | Lesson 8 | ~$1-2 | | Data processing |
| 9 | Lesson 9 | ~$2-5 | | ML endpoints can add up |
| 10 | Lesson 10 | ~$1-2 | | Monitoring overhead |
| 11 | Lesson 11 | <$1 | | Security tools (mostly free) |
| 12 | Lesson 12 | ~$3-5 | | Full stack app |

**Total Estimated**: ~$20-30 for entire curriculum (if you clean up resources!)

**Pro tip**: Always destroy resources when done with a lesson to minimize costs!

---

## Repository Structure

This repository contains everything you need for your AWS learning journey:

```
aws-learn/
├── lesson-01-first-internet-empire/   # S3, CloudFront, Route 53
├── lesson-02-renting-computers/       # EC2, VPC, Load Balancers
├── lesson-03-servers-are-so-2010/     # Lambda, API Gateway, DynamoDB
├── lesson-04-automate-all-things/     # Terraform fundamentals
├── lesson-05-containers/              # Docker, ECS, Fargate
├── lesson-06-data-pipelines/          # S3 events, RDS, ElastiCache
├── lesson-07-event-driven-chaos/      # SNS, SQS, Step Functions
├── lesson-08-big-data/                # Kinesis, Glue, Athena
├── lesson-09-ai-ml-buzzwords/         # SageMaker, Rekognition, Bedrock
├── lesson-10-observability/           # CloudWatch, X-Ray, Grafana
├── lesson-11-security/                # IAM, WAF, GuardDuty, KMS
├── lesson-12-victory-lap/             # Capstone project
├── docs/                              # Interactive course website
├── resources/                         # Shared resources
├── GETTING-STARTED.md                 # Initial setup guide
├── QUICKSTART.md                      # Jump right in
└── SPEC.md                           # Curriculum specification
```

Each lesson directory contains:
- `README.md` - Complete lesson instructions and project details
- `notes.md` - Space for your learning notes
- Code templates and configuration files
- Any lesson-specific resources

**Note**: When working through lessons, you'll create additional files (policies, configs, etc.). These are ignored by git as they're personal to your learning journey.

---

## Prerequisites & Setup

### Before Starting Lesson 1:
1. **AWS Account** - Create a free account at aws.amazon.com
2. **AWS CLI** - Install from aws.amazon.com/cli
3. **Code Editor** - VS Code recommended
4. **Terminal** - You're comfortable here already!
5. **Git** - For version control (optional but recommended)

### Recommended Tools (Install as needed):
- **Terraform** - Install from terraform.io (needed for Lesson 4+)
- **Docker** - Install from docker.com (needed for Lesson 5+)
- **Node.js** - For serverless development
- **Python 3** - For Lambda functions and scripts

---

## Learning Tips

### 1. Start with Lesson 1 Today
Don't overthink it. Jump in and start building. The best way to learn is by doing.

### 2. Take Notes
Each lesson has a `notes.md` file. Write down:
- Things that confused you
- Aha moments
- Interesting discoveries
- Things you want to explore more

### 3. Break Things on Purpose
Seriously. Delete a security group rule and see what breaks. It's the fastest way to learn.

### 4. Share Your Progress
Tweet about it, show friends, write blog posts. Teaching others solidifies your learning.

### 5. Don't Skip Cleanup
Always run the cleanup steps at the end of each lesson. Future you will thank you when the AWS bill arrives.

### 6. Customize Projects
The lesson ideas are suggestions. Build something YOU want to use. It's more fun that way.

### 7. Ask for Help
- AWS Documentation (actually pretty good)
- AWS re:Post (community forum)
- Stack Overflow
- Reddit r/aws
- Me (Claude) - I'm here to help!

---

## Bonus Side Quests

Once you finish (or while you're learning), explore:
- Cost optimization speedrun
- CI/CD pipelines (CodePipeline, GitHub Actions)
- Multi-region deployments
- EKS (Kubernetes on AWS)
- Chaos engineering with AWS FIS
- Advanced Terraform patterns

---

## Success Metrics

By the end of this curriculum, you'll be able to:
- ✅ Navigate AWS Console confidently
- ✅ Use AWS CLI proficiently
- ✅ Provision infrastructure with Terraform
- ✅ Design and deploy serverless applications
- ✅ Build event-driven architectures
- ✅ Implement proper monitoring and observability
- ✅ Secure AWS applications
- ✅ Make informed service selection decisions
- ✅ Debug AWS issues independently
- ✅ Build production-ready applications

**Most importantly**: You'll have 12+ projects you can show off!

---

## Ready to Start?

Head over to [Lesson 1: Your First Internet Empire](./lesson-01-first-internet-empire/) and let's get building!

Remember: The goal is to have fun while learning. Don't stress about perfection. Ship stuff. Break things. Learn. Repeat.

**Let's go! 🚀**
