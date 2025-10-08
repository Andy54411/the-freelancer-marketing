# AWS Lambda Deployment Configuration
# File: lambda-deployment.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"  # Frankfurt für deutsche Unternehmen
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  default     = "319629020205"  # Bestehende Account ID
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "production"  # Entspricht bestehender Infrastruktur
}

# Verwende bestehenden S3 Bucket
data "aws_s3_bucket" "existing_storage" {
  bucket = "taskilo-file-storage"
}

# S3 Bucket für Lambda Code (falls nicht vorhanden)
resource "aws_s3_bucket" "lambda_code" {
  bucket = "taskilo-lambda-deployments-${var.environment}"
}

resource "aws_s3_bucket_versioning" "lambda_code" {
  bucket = aws_s3_bucket.lambda_code.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_role" {
  name = "tasko-ocr-lambda-role-${var.environment}"

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

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# S3 Access Policy für OCR Files (bestehende Bucket)
resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "taskilo-lambda-s3-access-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::taskilo-file-storage/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::taskilo-file-storage"
        ]
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "ocr_processor" {
  filename         = "lambda-deployment.zip"
  function_name    = "taskilo-ocr-processor-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "dist/handler/lambda-ocr-handler.handler"
  runtime         = "nodejs20.x"
  timeout         = 300  # 5 Minuten für OCR-Verarbeitung
  memory_size     = 1024  # 1GB für PDF-Verarbeitung

  source_code_hash = filebase64sha256("lambda-deployment.zip")

  environment {
    variables = {
      NODE_ENV = var.environment
      AWS_REGION = var.aws_region
      AWS_ACCOUNT_ID = var.aws_account_id
      GEMINI_API_KEY = var.gemini_api_key
      FIREBASE_PROJECT_ID = "tilvo-f142f"
      OCR_DOCUMENTS_BUCKET = "taskilo-file-storage"
      USER_UPLOADS_BUCKET = "taskilo-file-storage"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy.lambda_s3_policy
  ]
}

variable "gemini_api_key" {
  description = "Gemini API Key für OCR"
  type        = string
  sensitive   = true
}

# API Gateway für HTTP-Zugriff
resource "aws_api_gateway_rest_api" "ocr_api" {
  name        = "tasko-ocr-api-${var.environment}"
  description = "Tasko OCR Processing API"
}

resource "aws_api_gateway_resource" "ocr_resource" {
  rest_api_id = aws_api_gateway_rest_api.ocr_api.id
  parent_id   = aws_api_gateway_rest_api.ocr_api.root_resource_id
  path_part   = "ocr"
}

resource "aws_api_gateway_method" "ocr_method" {
  rest_api_id   = aws_api_gateway_rest_api.ocr_api.id
  resource_id   = aws_api_gateway_resource.ocr_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.ocr_api.id
  resource_id = aws_api_gateway_resource.ocr_resource.id
  http_method = aws_api_gateway_method.ocr_method.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.ocr_processor.invoke_arn
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ocr_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ocr_api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "ocr_deployment" {
  depends_on = [
    aws_api_gateway_method.ocr_method,
    aws_api_gateway_integration.lambda_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.ocr_api.id
  stage_name  = var.environment
}

# Outputs
output "api_gateway_url" {
  value = "https://${aws_api_gateway_rest_api.ocr_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}/ocr"
}

output "lambda_function_name" {
  value = aws_lambda_function.ocr_processor.function_name
}