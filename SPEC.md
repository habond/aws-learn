# AWS Learning Curriculum Specification

**Created**: January 16, 2026
**Status**: Active Learning Path

---

## Learning Goals & Requirements

This document captures the interview results and specifications for your personalized AWS learning curriculum.

---

## Learner Profile

### Background & Experience
- **Current Cloud Experience**: Beginner
  - Brief surface-level exposure to AWS and Google Cloud
  - Strong understanding of distributed systems problems from Meta experience

- **Programming Skills**: Advanced
  - **Languages**: JavaScript, Java, Python, SQL, Hack, Rust, C/C++
  - **Comfort Level**: Very comfortable with coding and CLI tools
  - **Terminal Usage**: Expert level

- **Work Context**: Software Engineer at Meta
  - Deep understanding of problems cloud platforms solve
  - Experience with large-scale distributed systems
  - Familiar with infrastructure challenges

### Learning Motivations
1. **Career Development**: Expand skillset for career growth
2. **General Knowledge/Exploration**: Broaden cloud platform understanding
3. **Practical Application**: Build real-world projects

---

## Learning Objectives

### Primary Interests
You want to learn these AWS services and concepts:
- **S3** (Object Storage)
- **Lambda** (Serverless Compute)
- **CloudFront** (CDN)
- **Infrastructure as Code** with Terraform
- **Direct AWS Management** via Console and CLI

### Application Types to Master
Build hands-on projects across all these domains:
- ✅ Static websites and web applications
- ✅ APIs and serverless backends
- ✅ Data processing pipelines
- ✅ Machine learning/AI workloads
- ✅ Observability and monitoring (Grafana integration)
- ❌ Less interested in pure DevOps/infra automation tooling

### Certification Goals
- **None** - Focus is purely on practical knowledge and hands-on skills
- No need to align curriculum with certification exam requirements

---

## Learning Preferences

### Style & Approach
- **Primary Method**: Learn by doing (hands-on from day one)
- **Theory vs Practice**: Minimal theory, maximum building
- **Mistakes**: Encouraged to break things and learn from failures
- **Tone**: Fun and casual, not too serious

### Tools & Methods
- **Console/CLI First**: Build intuition with direct AWS tools
- **Then Terraform**: Codify and automate after understanding services
- **Parallel Learning**: Learn both approaches, but Console/CLI leads

### Time Commitment
- **Hours per Week**: 5-10 hours
- **Pacing**: Steady progress without burnout
- **Flexibility**: Variable timing acceptable

### Budget
- **AWS Costs**: Comfortable with minimal costs ($20-30 total for curriculum)
- **Free Tier**: Not strictly limited to free tier
- **Domain Costs**: Willing to spend on domain names if useful

---

## Curriculum Requirements

### Structure
- **Duration**: 12 weeks
- **Format**: Hands-on projects for each lesson
- **Progression**: Beginner → Intermediate → Advanced → Production-ready

### Phase Breakdown

#### Phase 1: Foundations (Weeks 1-3)
**Goal**: Understand core AWS services through direct interaction
- S3, CloudFront, Route 53 (static websites)
- EC2, VPC, Load Balancers (compute fundamentals)
- Lambda, API Gateway, DynamoDB (serverless basics)
- **Method**: AWS Console + CLI exclusively

#### Phase 2: Infrastructure as Code (Weeks 4-6)
**Goal**: Learn to codify and automate infrastructure
- Terraform fundamentals
- Containerization (Docker, ECS, Fargate)
- Data pipelines (S3 events, RDS, ElastiCache)
- **Method**: Introduce Terraform, rebuild previous projects

#### Phase 3: Advanced Applications (Weeks 7-9)
**Goal**: Build complex, production-like systems
- Event-driven architecture (SNS, SQS, Step Functions)
- Data processing & analytics (Kinesis, Glue, Athena)
- Machine learning services (SageMaker, Rekognition, Bedrock)
- **Method**: Terraform-first for new infrastructure

#### Phase 4: Production Readiness (Weeks 10-12)
**Goal**: Learn observability, security, and best practices
- Comprehensive monitoring (CloudWatch, X-Ray, Grafana)
- Security hardening (IAM, WAF, GuardDuty, KMS)
- Capstone project combining all learnings
- **Method**: Production-grade implementations

### Key Services to Master

| Category | Services | Priority |
|----------|----------|----------|
| **Compute** | Lambda, EC2, ECS, Fargate | High |
| **Storage** | S3, RDS, DynamoDB, ElastiCache | High |
| **Networking** | VPC, CloudFront, Route 53, ALB | High |
| **Messaging** | SNS, SQS, EventBridge, Step Functions | Medium |
| **Data** | Kinesis, Glue, Athena | Medium |
| **ML/AI** | SageMaker, Rekognition, Comprehend, Bedrock | Medium |
| **Observability** | CloudWatch, X-Ray, Managed Grafana | High |
| **Security** | IAM, WAF, GuardDuty, KMS, Secrets Manager | High |
| **IaC** | Terraform (non-AWS but critical) | High |

### Deliverables

Each lesson must produce:
1. **Working Project**: Deployed and functional
2. **Hands-on Experience**: Not just reading/theory
3. **Reusable Code**: Can be referenced later
4. **Documentation**: Notes on what was learned
5. **Cleanup Scripts**: Avoid unexpected AWS bills

By end of curriculum:
- **12+ Deployed Projects**: Portfolio-ready work
- **Terraform Proficiency**: Can provision any infrastructure
- **AWS Service Selection**: Know which service for which problem
- **Production Skills**: Security, monitoring, best practices
- **Confidence**: Can build and debug AWS applications independently

---

## Success Criteria

### Technical Skills
- ✅ Navigate AWS Console confidently
- ✅ Use AWS CLI proficiently for all major services
- ✅ Write Terraform configurations from scratch
- ✅ Design serverless applications
- ✅ Implement event-driven architectures
- ✅ Set up production-grade monitoring
- ✅ Secure AWS applications properly
- ✅ Debug AWS issues independently
- ✅ Make informed service selection decisions

### Practical Outcomes
- ✅ Portfolio of 12+ real projects
- ✅ Deep understanding of AWS service ecosystem
- ✅ Ability to architect full-stack applications on AWS
- ✅ Confidence to build production systems
- ✅ Understanding of cost optimization
- ✅ Knowledge of security best practices

### Soft Skills
- ✅ Comfortable with AWS documentation
- ✅ Can explain AWS concepts to others
- ✅ Knows when to use AWS vs build custom solutions
- ✅ Understands tradeoffs between services
- ✅ Can estimate AWS costs for projects

---

## Constraints & Guidelines

### What to Avoid
- ❌ Certification-focused content (unnecessary)
- ❌ Pure theory without hands-on practice
- ❌ Serious/boring corporate training tone
- ❌ Complex projects that take weeks
- ❌ Expensive AWS services outside budget

### What to Emphasize
- ✅ Fun, engaging projects
- ✅ Real-world use cases
- ✅ Breaking things on purpose to learn
- ✅ Quick wins and visible progress
- ✅ Practical skills over theoretical knowledge
- ✅ Customization and personalization
- ✅ Cost awareness and cleanup

### Teaching Philosophy
- **Learn by doing**: Build first, understand later
- **Fail fast**: Mistakes are learning opportunities
- **Ship it**: Done is better than perfect
- **Have fun**: Learning should be enjoyable
- **Stay practical**: Focus on real-world applications
- **Build intuition**: Understand "why" not just "how"

---

## Non-Functional Requirements

### Documentation Style
- Casual, conversational tone
- Clear step-by-step instructions
- Code snippets ready to copy-paste
- Troubleshooting sections
- Optional challenges for depth

### Project Ideas
- Personal/fun projects preferred over generic examples
- Encourage customization and creativity
- Real utility when possible
- "Showable" results (can demo to friends)

### Cost Management
- Clear cost estimates per lesson
- Free tier usage where possible
- Cleanup instructions mandatory
- Monthly cost tracking template
- Warning for expensive operations

### Time Management
- 5-10 hours per lesson (1 week)
- Flexible pacing allowed
- Can skip optional sections
- Core path vs bonus content clearly marked

---

## Notes

This specification ensures the curriculum stays aligned with your goals:
- Practical, hands-on learning
- Fun and engaging projects
- Console/CLI foundation before IaC
- Broad AWS service coverage
- Real-world applicable skills
- Manageable time and cost commitment

Any curriculum adjustments should reference back to this spec to ensure alignment with your learning objectives.
