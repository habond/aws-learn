# Lesson 4: Automate All The Things! 🤖

**Time**: ~7 hours | **Cost**: ~$1 (same infrastructure as Lesson 3)

## What You're Building

Recreate the entire URL shortener from Lesson 3, but this time define everything as Infrastructure as Code (IaC) using Terraform. No more clicking around the console or memorizing CLI commands. Everything lives in version-controlled `.tf` files that you can deploy with a single command.

## What You'll Learn

- **Terraform**: Industry-standard Infrastructure as Code tool
- **IaC Principles**: Why code beats clicking
- **State Management**: How Terraform tracks your infrastructure
- **Variables & Outputs**: Parameterize and reuse configurations
- **Modules**: Organize and share infrastructure code
- **CI/CD Mindset**: Infrastructure automation

## Prerequisites

- [ ] Completed Lessons 1-3
- [ ] Terraform installed (`brew install terraform` or download from terraform.io)
- [ ] AWS CLI configured
- [ ] Git installed
- [ ] Text editor with HCL syntax support

---

## Why Infrastructure as Code?

**The old way** (what we did in Lessons 1-3):
- Click around AWS console
- Run CLI commands manually
- Hard to replicate
- Error-prone
- No history of changes
- Hard to review

**The IaC way**:
- Define infrastructure in code
- Version control everything
- One command to deploy
- Repeatable and consistent
- Easy to review changes
- Can destroy and rebuild anytime

**Real talk**: You'll still use the console for exploration and debugging, but production infrastructure should be code!

---

## Part 1: Terraform Setup (30 minutes)

### Step 1: Install Terraform

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform version
```

### Step 2: Create Project Structure

```bash
# Create project directory
cd lesson-04-automate-all-things
mkdir terraform-url-shortener
cd terraform-url-shortener

# Create basic structure
touch main.tf variables.tf outputs.tf terraform.tfvars
mkdir lambda
```

Your structure:
```
terraform-url-shortener/
├── main.tf           # Main infrastructure definitions
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── terraform.tfvars  # Variable values
└── lambda/           # Lambda function code
```

### Step 3: Configure AWS Provider

Create `main.tf`:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "URLShortener"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

Create `variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "url-shortener"
}
```

Create `terraform.tfvars`:

```hcl
aws_region   = "us-east-1"
environment  = "dev"
project_name = "url-shortener"
```

### Step 4: Initialize Terraform

```bash
# Initialize Terraform (downloads providers)
terraform init

# You should see "Terraform has been successfully initialized!"
```

---

## Part 2: DynamoDB with Terraform (30 minutes)

### Step 5: Define DynamoDB Table

Add to `main.tf`:

```hcl
# DynamoDB table for URL mappings
resource "aws_dynamodb_table" "url_shortener" {
  name         = "${var.project_name}-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "shortCode"

  attribute {
    name = "shortCode"
    type = "S"
  }

  tags = {
    Name = "${var.project_name}-table"
  }
}
```

**That's it!** Compare this to the CLI command from Lesson 3. Much cleaner!

### Step 6: Plan and Apply

```bash
# Preview what Terraform will create
terraform plan

# Create the infrastructure
terraform apply

# Type 'yes' when prompted
```

**Terraform created your DynamoDB table!** Check the AWS console.

```bash
# View what Terraform created
terraform show

# List resources Terraform is managing
terraform state list
```

---

## Part 3: Lambda Functions with Terraform (2 hours)

### Step 7: Create Lambda Function Code

Create `lambda/shorten/index.js` (same as Lesson 3):

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

function generateShortCode() {
  return Math.random().toString(36).substring(2, 8);
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body);
    const { url, customCode } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    const shortCode = customCode || generateShortCode();

    const item = {
      shortCode,
      originalUrl: url,
      createdAt: Date.now(),
      clicks: 0
    };

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(shortCode)'
    }));

    const baseUrl = process.env.API_ENDPOINT || 'https://your-api.com';

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        shortCode,
        shortUrl: `${baseUrl}/${shortCode}`,
        originalUrl: url
      })
    };
  } catch (error) {
    console.error('Error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Short code already exists' })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

Create `lambda/shorten/package.json`:

```json
{
  "name": "shorten-function",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
}
```

Do the same for redirect and stats functions (copy from Lesson 3).

### Step 8: Define Lambda IAM Role in Terraform

Add to `main.tf`:

```hcl
# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.url_shortener.arn
      }
    ]
  })
}
```

**Notice**: Instead of hardcoding ARNs, we reference `aws_dynamodb_table.url_shortener.arn`. Terraform handles dependencies!

### Step 9: Package Lambda Functions

Add to `main.tf`:

```hcl
# Archive Lambda function code
data "archive_file" "shorten_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/shorten"
  output_path = "${path.module}/lambda/shorten.zip"
}

data "archive_file" "redirect_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/redirect"
  output_path = "${path.module}/lambda/redirect.zip"
}

data "archive_file" "stats_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/stats"
  output_path = "${path.module}/lambda/stats.zip"
}
```

### Step 10: Define Lambda Functions

Add to `main.tf`:

```hcl
# Shorten Lambda function
resource "aws_lambda_function" "shorten" {
  filename         = data.archive_file.shorten_lambda.output_path
  function_name    = "${var.project_name}-shorten-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256
  source_code_hash = data.archive_file.shorten_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.url_shortener.name
    }
  }
}

# Redirect Lambda function
resource "aws_lambda_function" "redirect" {
  filename         = data.archive_file.redirect_lambda.output_path
  function_name    = "${var.project_name}-redirect-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256
  source_code_hash = data.archive_file.redirect_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.url_shortener.name
    }
  }
}

# Stats Lambda function
resource "aws_lambda_function" "stats" {
  filename         = data.archive_file.stats_lambda.output_path
  function_name    = "${var.project_name}-stats-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256
  source_code_hash = data.archive_file.stats_lambda.output_base64sha256

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.url_shortener.name
    }
  }
}
```

### Step 11: Install Dependencies & Deploy

```bash
# Install Node dependencies for each function
cd lambda/shorten && npm install && cd ../..
cd lambda/redirect && npm install && cd ../..
cd lambda/stats && npm install && cd ../..

# Apply Terraform changes
terraform apply
```

**All three Lambda functions created!** 🎉

---

## Part 4: API Gateway with Terraform (2 hours)

### Step 12: Define REST API

Add to `main.tf`:

```hcl
# API Gateway REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "URL Shortener API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.shorten,
      aws_api_gateway_resource.code,
      aws_api_gateway_resource.stats,
      aws_api_gateway_resource.stats_code,
      aws_api_gateway_method.shorten_post,
      aws_api_gateway_method.code_get,
      aws_api_gateway_method.stats_get,
      aws_api_gateway_integration.shorten,
      aws_api_gateway_integration.redirect,
      aws_api_gateway_integration.stats,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.environment
}
```

### Step 13: Define API Resources and Methods

Add to `main.tf`:

```hcl
# /shorten resource
resource "aws_api_gateway_resource" "shorten" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "shorten"
}

# POST /shorten
resource "aws_api_gateway_method" "shorten_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.shorten.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "shorten" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.shorten.id
  http_method             = aws_api_gateway_method.shorten_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.shorten.invoke_arn
}

# /{shortCode} resource
resource "aws_api_gateway_resource" "code" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{shortCode}"
}

# GET /{shortCode}
resource "aws_api_gateway_method" "code_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.code.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "redirect" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.code.id
  http_method             = aws_api_gateway_method.code_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.redirect.invoke_arn
}

# /stats resource
resource "aws_api_gateway_resource" "stats" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "stats"
}

# /stats/{shortCode} resource
resource "aws_api_gateway_resource" "stats_code" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.stats.id
  path_part   = "{shortCode}"
}

# GET /stats/{shortCode}
resource "aws_api_gateway_method" "stats_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.stats_code.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stats" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.stats_code.id
  http_method             = aws_api_gateway_method.stats_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.stats.invoke_arn
}
```

### Step 14: Grant API Gateway Permission to Invoke Lambdas

Add to `main.tf`:

```hcl
# Lambda permissions for API Gateway
resource "aws_lambda_permission" "shorten" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.shorten.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "redirect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.redirect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "stats" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stats.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}
```

### Step 15: Define Outputs

Create `outputs.tf`:

```hcl
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.url_shortener.name
}

output "lambda_functions" {
  description = "Lambda function names"
  value = {
    shorten  = aws_lambda_function.shorten.function_name
    redirect = aws_lambda_function.redirect.function_name
    stats    = aws_lambda_function.stats.function_name
  }
}
```

### Step 16: Deploy Everything

```bash
# Apply all changes
terraform apply

# Get outputs
terraform output

# Save API endpoint to variable
export API_ENDPOINT=$(terraform output -raw api_endpoint)
echo $API_ENDPOINT
```

---

## Part 5: Test & Iterate (1 hour)

### Step 17: Test Your Infrastructure

```bash
# Create short URL
curl -X POST $API_ENDPOINT/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://terraform.io"}'

# Test redirect
curl -I $API_ENDPOINT/abc123

# Check stats
curl $API_ENDPOINT/stats/abc123
```

**It works!** And you did it all with Terraform.

### Step 18: Make Changes and Re-deploy

Try changing something:

```hcl
# In main.tf, change Lambda memory
resource "aws_lambda_function" "shorten" {
  # ... other config
  memory_size = 512  # Changed from 256
}
```

```bash
# See what will change
terraform plan

# Apply changes
terraform apply
```

**Terraform only updates what changed!** This is the power of IaC.

---

## Part 6: Advanced Terraform (1.5 hours)

### Step 19: Add Environments with Workspaces

```bash
# Create production workspace
terraform workspace new prod

# List workspaces
terraform workspace list

# Switch between workspaces
terraform workspace select dev
terraform workspace select prod

# Deploy to prod
terraform apply
```

Now you have separate dev and prod environments!

### Step 20: Use Remote State (S3 Backend)

Create `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"  # Change this!
    key            = "url-shortener/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

```bash
# Create S3 bucket for state
aws s3 mb s3://my-terraform-state-bucket-YOUR-NAME

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Migrate to remote state
terraform init -migrate-state
```

**Why?**
- Team collaboration (shared state)
- State locking (prevents conflicts)
- Secure (state might contain secrets)

### Step 21: Create Reusable Module

Create module structure:

```bash
mkdir -p modules/lambda-function
```

Create `modules/lambda-function/main.tf`:

```hcl
resource "aws_lambda_function" "this" {
  filename         = var.filename
  function_name    = var.function_name
  role            = var.role_arn
  handler         = var.handler
  runtime         = var.runtime
  timeout         = var.timeout
  memory_size     = var.memory_size
  source_code_hash = var.source_code_hash

  environment {
    variables = var.environment_variables
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = var.api_gateway_execution_arn
}
```

Create `modules/lambda-function/variables.tf`:

```hcl
variable "filename" {
  type = string
}

variable "function_name" {
  type = string
}

variable "role_arn" {
  type = string
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "timeout" {
  type    = number
  default = 10
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "source_code_hash" {
  type = string
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "api_gateway_execution_arn" {
  type = string
}
```

Create `modules/lambda-function/outputs.tf`:

```hcl
output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "invoke_arn" {
  value = aws_lambda_function.this.invoke_arn
}

output "function_arn" {
  value = aws_lambda_function.this.arn
}
```

Use module in `main.tf`:

```hcl
module "shorten_lambda" {
  source = "./modules/lambda-function"

  filename         = data.archive_file.shorten_lambda.output_path
  function_name    = "${var.project_name}-shorten-${var.environment}"
  role_arn        = aws_iam_role.lambda_role.arn
  source_code_hash = data.archive_file.shorten_lambda.output_base64sha256

  environment_variables = {
    TABLE_NAME = aws_dynamodb_table.url_shortener.name
  }

  api_gateway_execution_arn = aws_api_gateway_rest_api.api.execution_arn
}
```

**Modules = reusable infrastructure components!**

---

## Part 7: Destroy and Rebuild (30 minutes)

### Step 22: The Magic of IaC

```bash
# Destroy EVERYTHING
terraform destroy

# Type 'yes' to confirm
```

**Everything is gone!** DynamoDB table, Lambda functions, API Gateway - all deleted.

**Now rebuild it**:

```bash
# Recreate everything
terraform apply
```

**Back in business!** Same exact infrastructure, recreated in minutes.

**This is the power of IaC**: reproducible infrastructure you can destroy and recreate anytime.

---

## Challenges (Optional)

### Easy
- [ ] Add CloudWatch alarms for Lambda errors
- [ ] Add API Gateway access logging
- [ ] Create a staging environment using workspaces

### Medium
- [ ] Add custom domain with Route 53 and ACM certificate
- [ ] Create a Terraform module for the entire API
- [ ] Add API Gateway usage plans and API keys
- [ ] Set up CloudWatch dashboard via Terraform

### Hard
- [ ] Set up CI/CD pipeline (GitHub Actions + Terraform)
- [ ] Implement blue/green deployment for Lambda
- [ ] Create multi-region deployment
- [ ] Add automated testing for Terraform code (terratest)

---

## Troubleshooting

**Terraform init fails?**
- Check internet connection (downloads providers)
- Verify AWS credentials are configured

**Apply fails with dependency errors?**
- Terraform usually handles this automatically
- Check resource references are correct
- Try `terraform plan` to see what's happening

**State locked?**
- Someone else is running Terraform
- Or previous run crashed
- Fix: `terraform force-unlock LOCK_ID`

**Changes not applying?**
- Check you're in the right workspace
- Verify terraform.tfvars values
- Use `terraform plan` to debug

---

## Cleanup

```bash
# Destroy everything
terraform destroy

# Delete state files (if not using remote state)
rm -rf .terraform terraform.tfstate*

# Delete zipped Lambda functions
rm lambda/*.zip
```

---

## What You Learned

- ✅ Defined infrastructure as code with Terraform
- ✅ Managed state and dependencies automatically
- ✅ Created reusable modules
- ✅ Used workspaces for multiple environments
- ✅ Set up remote state in S3
- ✅ Understood IaC best practices
- ✅ Can destroy and rebuild infrastructure confidently

---

## Terraform Best Practices

### Do:
- Use version control (Git) for Terraform code
- Use remote state (S3) for team collaboration
- Use variables for everything that might change
- Use modules for reusable components
- Lock provider versions
- Use `terraform fmt` to format code
- Use `terraform validate` before applying
- Review `terraform plan` carefully

### Don't:
- Hardcode values (use variables)
- Commit `.terraform` directory
- Commit `terraform.tfvars` with secrets
- Manually modify resources Terraform manages
- Skip `terraform plan`
- Use default workspace for production

---

## IaC Philosophy

**Pets vs Cattle**:
- Pets: servers you name, care for, manually maintain
- Cattle: numbered servers you can kill and replace

**With IaC, infrastructure is cattle**: destroy and recreate anytime!

**Manual changes are evil**: if you click around the console, Terraform doesn't know about it. Everything should be in code.

**Version control everything**: infrastructure changes should be reviewed like code changes.

---

## Next Steps

Head to [Lesson 5: Containers Are Taking Over](../lesson-05-containers/) to learn Docker, ECR, and ECS. You'll containerize applications and deploy them with infrastructure as code!

You now know how to automate infrastructure. Time to automate application deployment! 🚀
