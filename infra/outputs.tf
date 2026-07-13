output "bucket_name" {
  description = "Name des Origin-Buckets (Deploy-Ziel)."
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "CloudFront-Distribution-ID (für Cache-Invalidierung)."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront-Domain (*.cloudfront.net)."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Öffentliche URL der Website."
  value       = "https://${var.domain_name}"
}
