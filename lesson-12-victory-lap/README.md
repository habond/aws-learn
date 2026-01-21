# Lesson 12: Victory Lap - Build Something Amazing! 🎉

**Time**: ~10-20 hours | **Cost**: ~$10-20 (production-ready infrastructure)

## Capstone Project

Congratulations! You've made it through 11 lessons. Now it's time to put everything together and build a complete, production-ready application that combines all the skills you've learned.

## Project Options

Choose one (or create your own!):

### Option 1: Full-Stack Social Media Platform
**Services Used**: S3, CloudFront, API Gateway, Lambda, DynamoDB, Rekognition, SQS, SNS, CloudWatch, WAF

**Features**:
- User authentication (Cognito)
- Image uploads with moderation (Rekognition)
- Posts, comments, likes
- Real-time notifications (WebSocket API)
- Content delivery (CloudFront)
- Event-driven processing (SQS/SNS)

### Option 2: Real-Time Analytics Dashboard
**Services Used**: Kinesis, Lambda, DynamoDB, Athena, S3, CloudWatch, QuickSight

**Features**:
- Streaming data ingestion
- Real-time processing
- Data warehousing
- SQL queries (Athena)
- Visualization (QuickSight)
- Alerting on anomalies

### Option 3: E-Commerce Backend
**Services Used**: API Gateway, Lambda, DynamoDB, RDS, ElastiCache, SQS, Step Functions, SES, Cognito

**Features**:
- Product catalog (DynamoDB)
- Shopping cart (ElastiCache)
- Order processing (Step Functions)
- Payment integration
- Email notifications (SES)
- Inventory management

### Option 4: AI-Powered Content Platform
**Services Used**: S3, Lambda, Bedrock, Rekognition, Comprehend, DynamoDB, API Gateway

**Features**:
- Upload documents/images
- AI analysis and tagging
- Search and discovery
- Content recommendations
- Multi-language support
- Sentiment analysis

## Architecture Requirements

Your project must include:

### Core Services (Required)
- [ ] **Compute**: Lambda, ECS, or EC2
- [ ] **Storage**: S3, DynamoDB or RDS
- [ ] **API**: API Gateway or ALB
- [ ] **Security**: IAM roles, encryption, WAF
- [ ] **Monitoring**: CloudWatch metrics, logs, alarms

### Advanced Features (Choose 3+)
- [ ] Event-driven architecture (SNS/SQS/EventBridge)
- [ ] Caching (ElastiCache or CloudFront)
- [ ] Async processing (Step Functions)
- [ ] Real-time data (Kinesis)
- [ ] AI/ML integration (Rekognition, Bedrock)
- [ ] Containers (ECS/Fargate)
- [ ] Infrastructure as Code (Terraform/CDK)

### Production Readiness (Required)
- [ ] Multi-AZ deployment
- [ ] Automated backups
- [ ] CI/CD pipeline
- [ ] Comprehensive monitoring
- [ ] Security best practices
- [ ] Cost optimization
- [ ] Documentation

---

## Example: Building a Video Processing Platform

Let's build a complete video processing platform as an example capstone project.

### Features
- Upload videos to S3
- Automatic transcoding (MediaConvert)
- Thumbnail generation (Lambda + FFmpeg)
- Metadata extraction
- Content moderation (Rekognition Video)
- Searchable catalog
- CDN delivery

### Architecture

```
User Upload → S3 → EventBridge
                     ↓
              Step Functions
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   MediaConvert  Rekognition  Lambda
   (Transcode)   (Moderate)   (Thumbnail)
        ↓            ↓            ↓
        └────────────┴────────────┘
                     ↓
                 DynamoDB
                     ↓
              API Gateway → Lambda → Query Results
                     ↓
                CloudFront → S3 (Video/Thumbnails)
```

---

## Part 1: Infrastructure Setup (2 hours)

### Step 1: Create Terraform Configuration

Create `main.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 buckets
resource "aws_s3_bucket" "uploads" {
  bucket = "video-uploads-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "processed" {
  bucket = "video-processed-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# DynamoDB table
resource "aws_dynamodb_table" "videos" {
  name           = "video-catalog"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "videoId"

  attribute {
    name = "videoId"
    type = "S"
  }

  attribute {
    name = "uploadedAt"
    type = "N"
  }

  global_secondary_index {
    name            = "UploadedAtIndex"
    hash_key        = "uploadedAt"
    projection_type = "ALL"
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "video_cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.processed.bucket_regional_domain_name
    origin_id   = "S3-processed-videos"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-processed-videos"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

data "aws_caller_identity" "current" {}

output "upload_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "cdn_domain" {
  value = aws_cloudfront_distribution.video_cdn.domain_name
}
```

Deploy:

```bash
terraform init
terraform apply
```

---

## Part 2: Video Processing Pipeline (3 hours)

### Step 2: Create Processing Lambda Functions

Create `thumbnail-generator/index.js`:

```javascript
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const s3 = new S3Client({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  const { videoId, bucket, key } = event;

  const inputPath = `/tmp/${videoId}.mp4`;
  const outputPath = `/tmp/${videoId}-thumb.jpg`;

  try {
    // Download video
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const videoData = await s3.send(getCommand);

    fs.writeFileSync(inputPath, videoData.Body);

    // Generate thumbnail at 2 second mark
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['2'],
          filename: path.basename(outputPath),
          folder: '/tmp'
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Upload thumbnail
    const thumbnailData = fs.readFileSync(outputPath);
    const thumbnailKey = `thumbnails/${videoId}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.PROCESSED_BUCKET,
      Key: thumbnailKey,
      Body: thumbnailData,
      ContentType: 'image/jpeg'
    }));

    // Update DynamoDB
    await ddb.send(new UpdateCommand({
      TableName: 'video-catalog',
      Key: { videoId },
      UpdateExpression: 'SET thumbnailUrl = :url',
      ExpressionAttributeValues: {
        ':url': `https://${process.env.CDN_DOMAIN}/${thumbnailKey}`
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ thumbnailUrl: thumbnailKey })
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    // Cleanup
    [inputPath, outputPath].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  }
};
```

### Step 3: Create Step Functions Workflow

```json
{
  "Comment": "Video processing workflow",
  "StartAt": "ExtractMetadata",
  "States": {
    "ExtractMetadata": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:extract-metadata",
      "Next": "ParallelProcessing"
    },
    "ParallelProcessing": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "GenerateThumbnail",
          "States": {
            "GenerateThumbnail": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:generate-thumbnail",
              "End": true
            }
          }
        },
        {
          "StartAt": "ModerateContent",
          "States": {
            "ModerateContent": {
              "Type": "Task",
              "Resource": "arn:aws:states:::aws-sdk:rekognition:startContentModeration",
              "Parameters": {
                "Video": {
                  "S3Object": {
                    "Bucket.$": "$.bucket",
                    "Name.$": "$.key"
                  }
                }
              },
              "End": true
            }
          }
        },
        {
          "StartAt": "TranscodeVideo",
          "States": {
            "TranscodeVideo": {
              "Type": "Task",
              "Resource": "arn:aws:states:::mediaconvert:createJob.sync",
              "End": true
            }
          }
        }
      ],
      "Next": "UpdateCatalog"
    },
    "UpdateCatalog": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:update-catalog",
      "Next": "SendNotification"
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:ACCOUNT:video-processed",
        "Message.$": "$.notification"
      },
      "End": true
    }
  }
}
```

---

## Part 3: API Layer (2 hours)

### Step 4: Create REST API

```javascript
// api/videos.js
const { DynamoDBClient, QueryCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

// List videos
exports.listVideos = async (event) => {
  const result = await ddb.send(new QueryCommand({
    TableName: 'video-catalog',
    IndexName: 'UploadedAtIndex',
    Limit: 20,
    ScanIndexForward: false
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items)
  };
};

// Get video details
exports.getVideo = async (event) => {
  const { videoId } = event.pathParameters;

  const result = await ddb.send(new GetItemCommand({
    TableName: 'video-catalog',
    Key: { videoId: { S: videoId } }
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Video not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item)
  };
};

// Get upload URL
exports.getUploadUrl = async (event) => {
  const { filename } = JSON.parse(event.body);
  const videoId = `video-${Date.now()}`;
  const key = `uploads/${videoId}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.UPLOAD_BUCKET,
    Key: key
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    body: JSON.stringify({
      videoId,
      uploadUrl,
      key
    })
  };
};
```

---

## Part 4: Frontend Integration (2 hours)

### Step 5: Build Simple Upload Interface

Create `frontend/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Video Platform</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .upload-section {
      border: 2px dashed #ccc;
      padding: 40px;
      text-align: center;
      margin-bottom: 40px;
    }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .video-card {
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 8px;
    }
    .video-card img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <h1>Video Platform</h1>

  <div class="upload-section">
    <h2>Upload Video</h2>
    <input type="file" id="fileInput" accept="video/*">
    <button onclick="uploadVideo()">Upload</button>
    <div id="uploadStatus"></div>
  </div>

  <div class="video-grid" id="videoGrid"></div>

  <script>
    const API_ENDPOINT = 'YOUR_API_ENDPOINT';

    async function uploadVideo() {
      const file = document.getElementById('fileInput').files[0];
      if (!file) return;

      const statusDiv = document.getElementById('uploadStatus');
      statusDiv.textContent = 'Getting upload URL...';

      // Get presigned URL
      const response = await fetch(`${API_ENDPOINT}/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ filename: file.name })
      });

      const { uploadUrl, videoId } = await response.json();

      statusDiv.textContent = 'Uploading...';

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file
      });

      statusDiv.textContent = 'Upload complete! Processing...';

      // Refresh video list
      setTimeout(loadVideos, 5000);
    }

    async function loadVideos() {
      const response = await fetch(`${API_ENDPOINT}/videos`);
      const videos = await response.json();

      const grid = document.getElementById('videoGrid');
      grid.innerHTML = videos.map(video => `
        <div class="video-card">
          <img src="${video.thumbnailUrl}" alt="${video.title}">
          <h3>${video.title}</h3>
          <p>Uploaded: ${new Date(video.uploadedAt).toLocaleDateString()}</p>
        </div>
      `).join('');
    }

    // Load videos on page load
    loadVideos();
  </script>
</body>
</html>
```

---

## Part 5: CI/CD Pipeline (2 hours)

### Step 6: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd api
          npm install

      - name: Run tests
        run: |
          cd api
          npm test

      - name: Deploy with Terraform
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve

      - name: Deploy Lambda functions
        run: |
          for func in thumbnail-generator extract-metadata update-catalog; do
            cd $func
            zip -r function.zip .
            aws lambda update-function-code \
              --function-name $func \
              --zip-file fileb://function.zip
            cd ..
          done

      - name: Deploy frontend
        run: |
          cd frontend
          aws s3 sync . s3://YOUR-FRONTEND-BUCKET
          aws cloudfront create-invalidation \
            --distribution-id YOUR-DISTRIBUTION-ID \
            --paths "/*"
```

---

## Part 6: Monitoring & Observability (2 hours)

### Step 7: Create Comprehensive Dashboard

```bash
# Create CloudWatch dashboard
cat > dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Video Uploads",
        "metrics": [
          [ "AWS/S3", "NumberOfObjects", { "stat": "Average" } ]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Processing Duration",
        "metrics": [
          [ "AWS/States", "ExecutionTime", { "stat": "Average" } ]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "API Latency",
        "metrics": [
          [ "AWS/ApiGateway", "Latency", { "stat": "p99" } ]
        ]
      }
    },
    {
      "type": "log",
      "properties": {
        "title": "Recent Errors",
        "query": "SOURCE '/aws/lambda/thumbnail-generator' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name video-platform \
  --dashboard-body file://dashboard.json
```

---

## Part 7: Cost Optimization (1 hour)

### Step 8: Implement Cost-Saving Measures

```bash
# S3 Lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
  --bucket video-uploads-$ACCOUNT_ID \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "DeleteOldUploads",
        "Status": "Enabled",
        "Prefix": "uploads/",
        "Expiration": {
          "Days": 7
        }
      },
      {
        "Id": "TransitionToIA",
        "Status": "Enabled",
        "Prefix": "processed/",
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          }
        ]
      }
    ]
  }'

# Enable S3 Intelligent-Tiering
# DynamoDB auto-scaling already handled by PAY_PER_REQUEST
# Lambda: Use ARM64 architecture for 20% cost savings
# CloudFront: Enable compression
```

---

## Deliverables

Your capstone project should include:

### 1. Working Application
- Deployed and accessible
- All features functional
- Production-ready

### 2. Infrastructure as Code
- Terraform/CDK configurations
- Reproducible deployments
- Version controlled

### 3. Documentation
- Architecture diagram
- Setup instructions
- API documentation
- Troubleshooting guide

### 4. Monitoring
- CloudWatch dashboards
- Alarms configured
- Logs centralized
- Tracing enabled

### 5. Security
- IAM roles properly scoped
- Data encrypted
- WAF configured
- Security scan passed

### 6. CI/CD
- Automated testing
- Automated deployment
- Rollback capability

---

## Evaluation Criteria

### Architecture (25%)
- [ ] Well-designed and scalable
- [ ] Appropriate service choices
- [ ] Cost-effective
- [ ] Follows AWS best practices

### Implementation (30%)
- [ ] Code quality
- [ ] Error handling
- [ ] Performance optimization
- [ ] Security implementation

### Operations (20%)
- [ ] Comprehensive monitoring
- [ ] Proper logging
- [ ] Automated deployments
- [ ] Documentation quality

### Bonus Points (25%)
- [ ] Innovation/creativity
- [ ] Advanced features
- [ ] Cost optimization
- [ ] User experience

---

## Show Your Work!

Share your capstone project:
- Blog post about what you built
- GitHub repository (make it public!)
- Video demo
- Architecture diagram
- Lessons learned

**Tag it**: #AWSCapstone #CloudNative #AWSLearning

---

## What You've Accomplished

Looking back at all 12 lessons:

1. ✅ **Static Website**: S3, CloudFront, Route 53
2. ✅ **EC2 Infrastructure**: VPC, Load Balancers, Auto Scaling
3. ✅ **Serverless API**: Lambda, API Gateway, DynamoDB
4. ✅ **Infrastructure as Code**: Terraform
5. ✅ **Containers**: Docker, ECS, Fargate
6. ✅ **Data Pipelines**: S3 Events, RDS, ElastiCache
7. ✅ **Event-Driven**: SNS, SQS, EventBridge, Step Functions
8. ✅ **Big Data**: Kinesis, Glue, Athena
9. ✅ **AI/ML**: Rekognition, Bedrock
10. ✅ **Observability**: CloudWatch, X-Ray
11. ✅ **Security**: IAM, KMS, GuardDuty, WAF
12. ✅ **Capstone**: Everything together!

---

## You're Now an AWS Developer!

**What's Next?**

### Keep Learning
- AWS Solutions Architect certification
- Advanced services (EKS, AppSync, Aurora Serverless)
- Multi-region deployments
- Cost optimization techniques

### Build More
- Open source contributions
- Personal projects
- Freelance work
- Start your own SaaS

### Join the Community
- AWS re:Post
- Local AWS user groups
- Twitter/LinkedIn
- Blog about your journey

---

## Thank You!

Thank you for completing this AWS learning journey. You've built real projects, learned industry best practices, and gained hands-on experience with 30+ AWS services.

**Now go build something amazing!** 🚀

The cloud is your playground. The possibilities are endless.

Happy building!
