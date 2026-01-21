# Lesson 5 Notes: Containers and ECS

## Key Concepts

### Docker
- Container = lightweight, isolated runtime environment
- Image = blueprint for container
- Dockerfile = recipe to build image
- Layer caching speeds up builds
- Multi-stage builds reduce image size

### ECR (Elastic Container Registry)
- AWS's Docker registry (like Docker Hub)
- Private by default
- Integrated with ECS/EKS
- Image scanning for vulnerabilities
- Lifecycle policies for cleanup

### ECS (Elastic Container Service)
- AWS container orchestration platform
- Task Definition = how to run container(s)
- Service = keeps tasks running, handles load balancing
- Cluster = logical grouping of tasks

### Fargate
- Serverless container runtime
- No EC2 instances to manage
- Pay per task (vCPU and memory)
- Automatic scaling
- More expensive than EC2, but easier

### Task Definitions
- Container configurations (image, CPU, memory, ports)
- Environment variables
- IAM roles for tasks
- Logging configuration
- Health checks

## Architecture Patterns

### ALB + ECS + Fargate
- Most common pattern for web apps
- ALB distributes traffic across tasks
- Fargate runs containers
- Auto-scaling based on metrics

### Task vs Service
- Task = single running container(s)
- Service = ensures N tasks always running
- Service handles rolling deployments
- Service integrates with ALB

## Docker Best Practices

### Image Size
- Use alpine base images (smaller)
- Multi-stage builds
- Don't include unnecessary files (.dockerignore)
- Minimize layers

### Security
- Don't run as root user
- Scan images for vulnerabilities
- Use specific version tags (not :latest in production)
- Keep base images updated

### Performance
- Leverage layer caching
- COPY package files before code (better caching)
- Use .dockerignore
- Health checks for faster recovery

## ECS Best Practices

### Task Definitions
- Set CPU and memory limits
- Use task IAM roles (not container env vars)
- Configure health checks
- Use awslogs for logging

### Services
- Set deployment configuration (min/max %)
- Configure health check grace period
- Use auto-scaling policies
- Blue/green deployments for zero downtime

## My Notes

(Add your own notes here as you work through the lesson)
