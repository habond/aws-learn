# Lesson 2: Renting Computers in Someone Else's Basement 💻

**Time**: ~8 hours | **Cost**: ~$2-3 (destroy resources when done!)

## What You're Building

Deploy a real web application on EC2 (virtual servers). You'll set up networking, load balancers, auto-scaling, and make something that can handle actual traffic. Build something useful or ridiculous - your choice!

## What You'll Learn

- **EC2**: Virtual servers in the cloud
- **VPC**: Virtual Private Cloud (your own network)
- **Security Groups**: Firewall rules
- **Elastic Load Balancer (ALB)**: Distribute traffic across servers
- **Auto Scaling**: Automatically add/remove servers based on load
- **CloudWatch**: Monitor server health and metrics

## Prerequisites

- [ ] Completed Lesson 1
- [ ] AWS CLI configured
- [ ] SSH key pair ready (or we'll create one)
- [ ] Node.js or Python installed locally (for testing)

---

## Project Ideas

Pick one (or create your own!):

### Option 1: Discord/Slack Bot Dashboard
Web dashboard for a bot you build

### Option 2: Personal API
API that does something useful (weather aggregator, bookmark manager, etc.)

### Option 3: Simple Web App
Todo app, notes app, URL shortener - something with a database

### Option 4: Proxy/Aggregator
Combine multiple APIs into one useful endpoint

**For this lesson, we'll build a simple Node.js app**, but use whatever you're comfortable with!

---

## Part 1: Understand VPC Basics (1 hour)

### What is a VPC?

Your own private network in AWS. Think of it like your home network, but in the cloud.

- **Subnets**: Sections of your network (public vs private)
- **Internet Gateway**: How your VPC connects to the internet
- **Route Tables**: Rules for how traffic flows
- **Security Groups**: Firewall rules for your servers

### Step 1: Explore Default VPC

AWS creates a default VPC for you. Let's use it first to keep things simple.

```bash
# List your VPCs
aws ec2 describe-vpcs

# Get your default VPC ID
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" \
  --output text)

echo "Default VPC: $VPC_ID"

# List subnets in your VPC
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID"
```

**Note the subnet IDs** - you'll need them later.

---

## Part 2: Create SSH Key Pair (15 minutes)

### Step 2: Generate Key Pair

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name my-aws-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/my-aws-key.pem

# Secure the key
chmod 400 ~/.ssh/my-aws-key.pem

# Verify it exists
aws ec2 describe-key-pairs --key-name my-aws-key
```

**Don't lose this key!** It's your only way to SSH into your servers.

---

## Part 3: Launch Your First EC2 Instance (1.5 hours)

### Step 3: Create Security Group

Security groups are like firewall rules.

```bash
# Create security group
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Security group for web servers" \
  --vpc-id $VPC_ID

# Get the security group ID
export SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=web-server-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

echo "Security Group: $SG_ID"

# Allow SSH (port 22) from your IP
# Get your public IP first
MY_IP=$(curl -s https://checkip.amazonaws.com)

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr ${MY_IP}/32

# Allow HTTP (port 80) from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow your app port (e.g., 3000 for Node.js)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0
```

### Step 4: Launch EC2 Instance

```bash
# Find the latest Amazon Linux 2023 AMI
export AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

echo "Using AMI: $AMI_ID"

# Launch instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t2.micro \
  --key-name my-aws-key \
  --security-group-ids $SG_ID \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-server-1}]'

# Get instance ID
export INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-server-1" "Name=instance-state-name,Values=running,pending" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
export PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

### Step 5: SSH Into Your Server

```bash
# Connect to your instance
ssh -i ~/.ssh/my-aws-key.pem ec2-user@$PUBLIC_IP
```

**You're now inside your AWS server!** 🎉

---

## Part 4: Deploy Your Application (2 hours)

### Step 6: Set Up Server

**On your EC2 instance** (via SSH):

```bash
# Update system
sudo yum update -y

# Install Node.js (or Python, your choice)
sudo yum install -y nodejs npm

# Verify installation
node --version
npm --version

# Install git
sudo yum install -y git

# Create app directory
mkdir ~/app
cd ~/app
```

### Step 7: Deploy Sample App

**Option A: Node.js Express App**

```bash
# Initialize Node app
npm init -y

# Install Express
npm install express

# Create app
cat > index.js << 'EOF'
const express = require('express');
const os = require('os');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from EC2!',
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: os.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOF

# Run the app
node index.js
```

**Option B: Python Flask App**

```bash
# Install Python and pip
sudo yum install -y python3 python3-pip

# Install Flask
pip3 install flask

# Create app
cat > app.py << 'EOF'
from flask import Flask, jsonify
import socket
import platform
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': 'Hello from EC2!',
        'hostname': socket.gethostname(),
        'platform': platform.system(),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
EOF

# Run the app
python3 app.py
```

### Step 8: Test Your App

**From your local machine**:

```bash
# Test the app
curl http://$PUBLIC_IP:3000

# Should see JSON response with server info!
```

### Step 9: Run App as Service (so it doesn't stop when you disconnect)

**Back on the EC2 instance**:

```bash
# Create systemd service file
sudo cat > /etc/systemd/system/webapp.service << EOF
[Unit]
Description=My Web App
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
ExecStart=/usr/bin/node /home/ec2-user/app/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start webapp

# Enable to start on boot
sudo systemctl enable webapp

# Check status
sudo systemctl status webapp
```

Now your app runs even when you disconnect! Exit SSH and test again.

---

## Part 5: Load Balancer & Multiple Instances (2 hours)

### Step 10: Create AMI from Your Instance

Make a snapshot of your configured server:

```bash
# Create AMI
aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name "web-app-ami-$(date +%Y%m%d)" \
  --description "Web app with Node.js"

# Get AMI ID
export MY_AMI=$(aws ec2 describe-images \
  --owners self \
  --filters "Name=name,Values=web-app-ami-*" \
  --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" \
  --output text)

echo "AMI ID: $MY_AMI"

# Wait for AMI to be available
aws ec2 wait image-available --image-ids $MY_AMI
```

### Step 11: Create Target Group

```bash
# Create target group
aws elbv2 create-target-group \
  --name web-app-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --health-check-path /health

# Get target group ARN
export TG_ARN=$(aws elbv2 describe-target-groups \
  --names web-app-tg \
  --query "TargetGroups[0].TargetGroupArn" \
  --output text)

echo "Target Group ARN: $TG_ARN"
```

### Step 12: Create Application Load Balancer

```bash
# Get subnet IDs (need at least 2 in different AZs)
export SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[0:2].SubnetId" \
  --output text | tr '\t' ' ')

# Create ALB
aws elbv2 create-load-balancer \
  --name web-app-alb \
  --subnets $SUBNET_IDS \
  --security-groups $SG_ID

# Get ALB ARN and DNS
export ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names web-app-alb \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text)

export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names web-app-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Create listener (forwards traffic to target group)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

### Step 13: Register Instances with Target Group

```bash
# Register your existing instance
aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=$INSTANCE_ID

# Wait a minute, then test
sleep 60

# Test ALB
curl http://$ALB_DNS
```

**Your app is now behind a load balancer!**

---

## Part 6: Auto Scaling (1.5 hours)

### Step 14: Create Launch Template

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name web-app-template \
  --version-description "v1" \
  --launch-template-data "{
    \"ImageId\": \"$MY_AMI\",
    \"InstanceType\": \"t2.micro\",
    \"KeyName\": \"my-aws-key\",
    \"SecurityGroupIds\": [\"$SG_ID\"]
  }"
```

### Step 15: Create Auto Scaling Group

```bash
# Get ALL subnet IDs for ASG
export ALL_SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text | tr '\t' ',')

# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name web-app-asg \
  --launch-template LaunchTemplateName=web-app-template \
  --min-size 2 \
  --max-size 4 \
  --desired-capacity 2 \
  --target-group-arns $TG_ARN \
  --vpc-zone-identifier "$ALL_SUBNETS" \
  --health-check-type ELB \
  --health-check-grace-period 300
```

**Wait a few minutes** for instances to launch.

```bash
# Check instances
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names web-app-asg

# Test load balancer (should round-robin between instances)
for i in {1..10}; do
  curl http://$ALB_DNS | jq .hostname
  sleep 1
done
```

**You should see different hostnames!** Traffic is being distributed across multiple servers.

### Step 16: Test Auto Scaling

**Create scaling policies based on CPU:**

```bash
# Scale up when CPU > 70%
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name web-app-asg \
  --policy-name scale-up \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity

# Scale down when CPU < 30%
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name web-app-asg \
  --policy-name scale-down \
  --scaling-adjustment -1 \
  --adjustment-type ChangeInCapacity
```

**To test** (load testing):

```bash
# Install stress testing tool on EC2 instances and run load
# Or use: ab -n 10000 -c 100 http://$ALB_DNS/
```

---

## Part 7: CloudWatch Monitoring (30 minutes)

### Step 17: Set Up Alarms

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu-alarm \
  --alarm-description "Alert when CPU is high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Check alarms
aws cloudwatch describe-alarms
```

### Step 18: View Metrics

1. Go to CloudWatch console
2. Click "Metrics" → "All metrics"
3. Choose EC2 → Per-Instance Metrics
4. Select your instances and view:
   - CPUUtilization
   - NetworkIn/Out
   - DiskRead/WriteBytes

---

## Challenges (Optional)

### Easy
- [ ] Add HTTPS support with a certificate
- [ ] Create a custom CloudWatch dashboard
- [ ] Add more endpoints to your app

### Medium
- [ ] Set up CloudWatch Logs for application logs
- [ ] Create SNS topic for alarm notifications
- [ ] Add health check endpoint that checks database connectivity

### Hard
- [ ] Deploy to multiple availability zones
- [ ] Set up Blue/Green deployment
- [ ] Create custom metrics from your application

---

## Cleanup (IMPORTANT!)

**These resources cost money!** Clean up when done:

```bash
# Delete Auto Scaling Group
aws autoscaling delete-auto-scaling-group \
  --auto-scaling-group-name web-app-asg \
  --force-delete

# Wait for instances to terminate
sleep 60

# Delete load balancer
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Wait for ALB to delete
sleep 120

# Delete target group
aws elbv2 delete-target-group --target-group-arn $TG_ARN

# Terminate original instance
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Delete launch template
aws ec2 delete-launch-template --launch-template-name web-app-template

# Deregister AMI
aws ec2 deregister-image --image-id $MY_AMI

# Delete security group (wait until all instances terminated)
sleep 60
aws ec2 delete-security-group --group-id $SG_ID

# Delete key pair
aws ec2 delete-key-pair --key-name my-aws-key
rm ~/.ssh/my-aws-key.pem
```

---

## What You Learned

- ✅ Launched and configured EC2 instances
- ✅ Understood VPC, subnets, security groups
- ✅ Deployed application to EC2
- ✅ Created Application Load Balancer
- ✅ Set up Auto Scaling for high availability
- ✅ Monitored with CloudWatch
- ✅ Created AMIs for reproducible deployments
- ✅ Managed infrastructure via CLI

---

## Next Steps

Ready for [Lesson 3: Servers Are So 2010](../lesson-03-servers-are-so-2010/) where you'll build the same thing... but serverless! No servers to manage, automatic scaling, and way cheaper. 🚀
