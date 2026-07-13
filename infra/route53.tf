# Vorhandene Hosted Zone (die Domain ist bereits gesichert).
data "aws_route53_zone" "site" {
  name         = var.domain_name
  private_zone = false
}

# Apex + www als Alias auf die CloudFront-Distribution (A + AAAA).
locals {
  site_domains = concat([var.domain_name], var.subject_alternative_names)
}

resource "aws_route53_record" "a" {
  for_each = toset(local.site_domains)

  zone_id = data.aws_route53_zone.site.zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "aaaa" {
  for_each = toset(local.site_domains)

  zone_id = data.aws_route53_zone.site.zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
