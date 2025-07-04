provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_eks_cluster" "main" {
  name     = "smart-mcp-cluster"
  role_arn = "arn:aws:iam::123456789012:role/eks-cluster-role" # Replace with actual role ARN

  vpc_config {
    subnet_ids = ["subnet-abcde012", "subnet-bcde012a"] # Replace with actual subnet IDs
  }
}

resource "aws_ecr_repository" "smart_mcp_server" {
  name = "smart-mcp-server"

  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
