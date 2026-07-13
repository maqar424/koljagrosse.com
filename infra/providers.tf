terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Remote-State in S3. Auskommentiert lassen, bis ein
  # State-Bucket existiert.
  #
  # backend "s3" {
  #   bucket = "koljagrosse-tfstate"
  #   key    = "website/terraform.tfstate"
  #   region = "eu-central-1"
  # }
}

# Standard-Provider (Region frei wählbar — S3-Bucket landet hier).
provider "aws" {
  region = var.aws_region
}

# CloudFront-Zertifikate müssen in us-east-1 liegen.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
