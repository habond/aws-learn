# Lesson 5: Containers Are Taking Over 🐳

**Time**: ~8 hours | **Cost**: ~$2-3 (delete resources when done!)

## What You're Building

Containerize a web application with Docker and deploy it to AWS using ECS (Elastic Container Service) with Fargate. You'll build a simple task manager API, package it in a container, push it to ECR (Elastic Container Registry), and run it on Fargate (serverless containers). No servers to manage, just containers that scale.

## What You'll Learn

- **Docker**: Containerization basics
- **ECR**: AWS's container registry
- **ECS**: Container orchestration service
- **Fargate**: Serverless container runtime
- **Application Load Balancer**: Route traffic to containers
- **Task Definitions**: Define container configurations
- **Services**: Keep containers running

## Prerequisites

- [ ] Completed Lessons 1-4
- [ ] Docker installed (`docker --version`)
- [ ] AWS CLI configured
- [ ] Node.js or Python installed
- [ ] Basic understanding of containers (helpful but not required)

---

## Why Containers?

**The problem**:
- "Works on my machine" syndrome
- Dependency conflicts
- Environment inconsistencies
- Hard to scale applications

**Containers solve this**:
- Package app + dependencies together
- Consistent across dev, staging, production
- Fast to start (seconds, not minutes)
- Easy to scale (spin up more containers)
- Portable (run anywhere)

**AWS container options**:
- **ECS**: AWS's container orchestration
- **Fargate**: Serverless (no EC2 to manage)
- **EKS**: Managed Kubernetes (advanced, not in this lesson)

---

## Part 1: Docker Basics (1.5 hours)

### Step 1: Install Docker

```bash
# macOS/Windows: Download Docker Desktop
# https://www.docker.com/products/docker-desktop

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker run hello-world
```

### Step 2: Build a Simple App

Create a task manager API. Create `app/` directory:

```bash
mkdir task-manager-app
cd task-manager-app
```

Create `package.json`:

```json
{
  "name": "task-manager",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

Create `index.js`:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory task storage
let tasks = [
  { id: 1, title: 'Learn Docker', completed: false },
  { id: 2, title: 'Deploy to ECS', completed: false }
];
let nextId = 3;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// Get single task
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create task
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const task = {
    id: nextId++,
    title,
    completed: false
  };
  tasks.push(task);
  res.status(201).json(task);
});

// Update task
app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.completed !== undefined) task.completed = req.body.completed;

  res.json(task);
});

// Delete task
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Manager API running on port ${PORT}`);
});
```

Test locally:

```bash
npm install
npm start

# In another terminal
curl http://localhost:3000/health
curl http://localhost:3000/tasks
```

### Step 3: Create Dockerfile

Create `Dockerfile`:

```dockerfile
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run application
CMD ["npm", "start"]
```

Create `.dockerignore`:

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
```

### Step 4: Build and Test Docker Image

```bash
# Build image
docker build -t task-manager:latest .

# Check image size
docker images task-manager

# Run container locally
docker run -d -p 3000:3000 --name task-manager-test task-manager:latest

# Test it
curl http://localhost:3000/health
curl http://localhost:3000/tasks

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Containerize everything"}'

# View logs
docker logs task-manager-test

# Stop and remove container
docker stop task-manager-test
docker rm task-manager-test
```

**Your app is now containerized!** 🎉

---

## Part 2: Push to ECR (1 hour)

### Step 5: Create ECR Repository

```bash
# Create repository
aws ecr create-repository \
  --repository-name task-manager \
  --image-scanning-configuration scanOnPush=true

# Get repository URI
export ECR_REPO=$(aws ecr describe-repositories \
  --repository-names task-manager \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "ECR Repository: $ECR_REPO"
```

### Step 6: Authenticate Docker to ECR

```bash
# Get authentication token and login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_REPO

# You should see "Login Succeeded"
```

### Step 7: Tag and Push Image

```bash
# Tag image for ECR
docker tag task-manager:latest $ECR_REPO:latest
docker tag task-manager:latest $ECR_REPO:v1.0.0

# Push to ECR
docker push $ECR_REPO:latest
docker push $ECR_REPO:v1.0.0

# Verify images in ECR
aws ecr list-images --repository-name task-manager
```

**Your container is now in AWS!** 🚀

---

## Part 3: ECS Cluster with Fargate (2 hours)

### Step 8: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name task-manager-cluster

# Verify cluster
aws ecs describe-clusters --clusters task-manager-cluster
```

### Step 9: Create Task Execution Role

ECS needs permissions to pull images from ECR and write logs.

```bash
# Create trust policy
cat > ecs-task-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Get role ARN
export EXECUTION_ROLE_ARN=$(aws iam get-role \
  --role-name ecsTaskExecutionRole \
  --query 'Role.Arn' \
  --output text)

echo "Execution Role ARN: $EXECUTION_ROLE_ARN"
```

### Step 10: Create CloudWatch Log Group

```bash
# Create log group for container logs
aws logs create-log-group --log-group-name /ecs/task-manager

# Verify
aws logs describe-log-groups --log-group-name-prefix /ecs/task-manager
```

### Step 11: Create Task Definition

```bash
# Get AWS account ID
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create task definition
cat > task-definition.json << EOF
{
  "family": "task-manager",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "task-manager",
      "image": "$ECR_REPO:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/task-manager",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Verify
aws ecs describe-task-definition --task-definition task-manager
```

### Step 12: Create Security Group for ECS Tasks

```bash
# Get default VPC
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" \
  --output text)

# Create security group
aws ec2 create-security-group \
  --group-name task-manager-ecs-sg \
  --description "Security group for Task Manager ECS tasks" \
  --vpc-id $VPC_ID

# Get security group ID
export ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=task-manager-ecs-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Allow inbound traffic on port 3000 from anywhere (we'll restrict this with ALB later)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

echo "ECS Security Group: $ECS_SG_ID"
```

### Step 13: Run Task

```bash
# Get subnet IDs
export SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[0:2].SubnetId" \
  --output text | tr '\t' ',')

# Run task
aws ecs run-task \
  --cluster task-manager-cluster \
  --task-definition task-manager \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}"

# Get task ID
export TASK_ARN=$(aws ecs list-tasks \
  --cluster task-manager-cluster \
  --query 'taskArns[0]' \
  --output text)

# Wait for task to be running
aws ecs wait tasks-running \
  --cluster task-manager-cluster \
  --tasks $TASK_ARN

# Get task details including public IP
aws ecs describe-tasks \
  --cluster task-manager-cluster \
  --tasks $TASK_ARN

# Extract public IP (this is a bit complex)
export TASK_IP=$(aws ecs describe-tasks \
  --cluster task-manager-cluster \
  --tasks $TASK_ARN \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text | xargs -I {} aws ec2 describe-network-interfaces \
  --network-interface-ids {} \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Task IP: $TASK_IP"

# Test the task
curl http://$TASK_IP:3000/health
curl http://$TASK_IP:3000/tasks
```

**Your container is running on Fargate!** 🎉

---

## Part 4: Application Load Balancer (1.5 hours)

### Step 14: Create ALB Security Group

```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name task-manager-alb-sg \
  --description "Security group for Task Manager ALB" \
  --vpc-id $VPC_ID

export ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=task-manager-alb-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Update ECS security group to only allow traffic from ALB
aws ec2 revoke-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID
```

### Step 15: Create Application Load Balancer

```bash
# Get all subnets (ALB requires 2+ AZs)
export ALL_SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text | tr '\t' ' ')

# Create ALB
aws elbv2 create-load-balancer \
  --name task-manager-alb \
  --subnets $ALL_SUBNETS \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application

# Get ALB ARN and DNS
export ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names task-manager-alb \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)

export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names task-manager-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "ALB DNS: $ALB_DNS"
```

### Step 16: Create Target Group

```bash
# Create target group
aws elbv2 create-target-group \
  --name task-manager-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Get target group ARN
export TG_ARN=$(aws elbv2 describe-target-groups \
  --names task-manager-tg \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

# Create listener (forward HTTP:80 to target group)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

---

## Part 5: ECS Service (1.5 hours)

### Step 17: Create ECS Service

```bash
# Stop the manually-run task first
aws ecs stop-task \
  --cluster task-manager-cluster \
  --task $TASK_ARN

# Create service
aws ecs create-service \
  --cluster task-manager-cluster \
  --service-name task-manager-service \
  --task-definition task-manager \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=task-manager,containerPort=3000" \
  --health-check-grace-period-seconds 60

# Wait for service to be stable (takes a few minutes)
aws ecs wait services-stable \
  --cluster task-manager-cluster \
  --services task-manager-service

# Check service status
aws ecs describe-services \
  --cluster task-manager-cluster \
  --services task-manager-service
```

### Step 18: Test via Load Balancer

```bash
# Wait for ALB to be active and targets healthy (may take 2-3 minutes)
sleep 120

# Test the API
curl http://$ALB_DNS/health
curl http://$ALB_DNS/tasks

# Create tasks
curl -X POST http://$ALB_DNS/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn ECS"}'

curl -X POST http://$ALB_DNS/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy with Fargate"}'

# Get all tasks
curl http://$ALB_DNS/tasks

# Test load balancing (should see different container hostnames)
for i in {1..10}; do
  curl -s http://$ALB_DNS/health | jq .timestamp
  sleep 1
done
```

**You have a fully managed containerized application!** 🎉

---

## Part 6: Scaling and Updates (1 hour)

### Step 19: Scale Service

```bash
# Scale to 4 tasks
aws ecs update-service \
  --cluster task-manager-cluster \
  --service task-manager-service \
  --desired-count 4

# Watch tasks starting
aws ecs list-tasks --cluster task-manager-cluster

# Check service
aws ecs describe-services \
  --cluster task-manager-cluster \
  --services task-manager-service \
  --query 'services[0].{Running:runningCount,Desired:desiredCount}'
```

### Step 20: Update Application

Make a change to `index.js`:

```javascript
// Add at the top
const VERSION = '2.0.0';

// Update health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});
```

Deploy update:

```bash
# Rebuild image
docker build -t task-manager:v2 .

# Tag and push
docker tag task-manager:v2 $ECR_REPO:v2.0.0
docker tag task-manager:v2 $ECR_REPO:latest
docker push $ECR_REPO:v2.0.0
docker push $ECR_REPO:latest

# Force new deployment (pulls latest image)
aws ecs update-service \
  --cluster task-manager-cluster \
  --service task-manager-service \
  --force-new-deployment

# Watch deployment
aws ecs wait services-stable \
  --cluster task-manager-cluster \
  --services task-manager-service

# Test new version
curl http://$ALB_DNS/health
```

**Rolling deployment complete!** Old containers replaced with new ones.

### Step 21: Enable Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/task-manager-cluster/task-manager-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy (target tracking based on CPU)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/task-manager-cluster/task-manager-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://<(cat <<EOF
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 60
}
EOF
)
```

**Your service now auto-scales based on CPU!**

---

## Part 7: Monitoring (30 minutes)

### Step 22: View Logs

```bash
# View logs for all tasks
aws logs tail /ecs/task-manager --follow

# Or in CloudWatch console
# CloudWatch → Log groups → /ecs/task-manager
```

### Step 23: Check Metrics

```bash
# View CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=task-manager-service Name=ClusterName,Value=task-manager-cluster \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# View in console: ECS → Clusters → task-manager-cluster → Services → Metrics
```

---

## Challenges (Optional)

### Easy
- [ ] Add environment variables for configuration
- [ ] Add container insights for advanced monitoring
- [ ] Create a custom dashboard in CloudWatch

### Medium
- [ ] Add HTTPS with ALB and ACM certificate
- [ ] Deploy with Terraform (combine with Lesson 4!)
- [ ] Add health check endpoint that checks dependencies
- [ ] Set up CI/CD with GitHub Actions

### Hard
- [ ] Implement blue/green deployment
- [ ] Add service discovery with AWS Cloud Map
- [ ] Create multi-region deployment
- [ ] Add RDS database and persist tasks

---

## Troubleshooting

**Task not starting?**
- Check CloudWatch logs for errors
- Verify ECR image exists and is accessible
- Check task execution role has ECR permissions
- Verify security groups allow traffic

**Can't pull image from ECR?**
- Re-authenticate Docker to ECR
- Check task execution role permissions
- Verify image tag is correct

**Health checks failing?**
- Check health check path is correct
- Verify container is listening on correct port
- Check security groups allow traffic
- View container logs for errors

**ALB returning 503?**
- Wait for targets to be healthy (takes 1-2 minutes)
- Check target group health in console
- Verify security groups allow ALB → ECS traffic

---

## Cleanup (IMPORTANT!)

```bash
# Delete ECS service
aws ecs update-service \
  --cluster task-manager-cluster \
  --service task-manager-service \
  --desired-count 0

aws ecs delete-service \
  --cluster task-manager-cluster \
  --service task-manager-service \
  --force

# Delete cluster
aws ecs delete-cluster --cluster task-manager-cluster

# Delete ALB
export LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)

aws elbv2 delete-listener --listener-arn $LISTENER_ARN
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Wait for ALB to delete
sleep 30

# Delete target group
aws elbv2 delete-target-group --target-group-arn $TG_ARN

# Delete security groups
aws ec2 delete-security-group --group-id $ECS_SG_ID
aws ec2 delete-security-group --group-id $ALB_SG_ID

# Delete ECR repository
aws ecr delete-repository --repository-name task-manager --force

# Delete CloudWatch log group
aws logs delete-log-group --log-group-name /ecs/task-manager

# Delete IAM role
aws iam detach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam delete-role --role-name ecsTaskExecutionRole
```

---

## What You Learned

- ✅ Built and containerized applications with Docker
- ✅ Pushed images to ECR
- ✅ Deployed containers to ECS with Fargate
- ✅ Set up Application Load Balancer
- ✅ Created ECS services for high availability
- ✅ Implemented rolling deployments
- ✅ Configured auto-scaling
- ✅ Monitored containers with CloudWatch

---

## Containers vs Serverless vs VMs

### Use Containers (ECS/Fargate) when:
- Need full control over runtime environment
- Long-running processes
- Microservices architecture
- Want portability across clouds
- Need predictable performance

### Use Serverless (Lambda) when:
- Event-driven workloads
- Unpredictable traffic
- Want zero infrastructure management
- Short tasks (< 15 minutes)
- Cost optimization for low traffic

### Use VMs (EC2) when:
- Legacy applications
- Specific OS/kernel requirements
- Very high sustained traffic
- Need GPU/specialized hardware
- Maximum control needed

---

## Next Steps

Head to [Lesson 6: Data Pipelines](../lesson-06-data-pipelines/) to learn how to build data processing systems with S3, Lambda, RDS, and ElastiCache. You'll process files automatically and build a real data pipeline! 🚀
