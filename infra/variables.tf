variable "aws_region" {
  description = "AWS-Region für den S3-Origin-Bucket."
  type        = string
  default     = "eu-central-1"
}

variable "domain_name" {
  description = "Apex-Domain der Website."
  type        = string
  default     = "koljagrosse.com"
}

variable "subject_alternative_names" {
  description = "Weitere Domains im Zertifikat / als CloudFront-Alias (z. B. www)."
  type        = list(string)
  default     = ["www.koljagrosse.com"]
}

variable "price_class" {
  description = "CloudFront Price Class. PriceClass_100 = günstigste (US/EU)."
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Tags für alle Ressourcen."
  type        = map(string)
  default = {
    Project = "koljagrosse.com"
    Managed = "terraform"
  }
}
