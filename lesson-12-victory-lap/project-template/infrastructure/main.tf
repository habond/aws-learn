terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# TODO: Add your infrastructure resources here
# Examples:
# - S3 buckets
# - DynamoDB tables
# - Lambda functions
# - API Gateway
# - ECS clusters
# - RDS databases
# - ElastiCache clusters
# - CloudFront distributions
