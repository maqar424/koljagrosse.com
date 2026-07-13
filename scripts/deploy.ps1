<#
.SYNOPSIS
  Synchronisiert ./site nach S3 und invalidiert den CloudFront-Cache.

.DESCRIPTION
  Liest Bucket-Name und Distribution-ID aus den Terraform-Outputs.
  Voraussetzung: AWS CLI konfiguriert, `terraform apply` bereits gelaufen.

.EXAMPLE
  ./scripts/deploy.ps1
#>

[CmdletBinding()]
param(
  [string]$SiteDir = "$PSScriptRoot/../site",
  [string]$InfraDir = "$PSScriptRoot/../infra"
)

$ErrorActionPreference = "Stop"

Write-Host "Lese Terraform-Outputs..." -ForegroundColor Cyan
$bucket = terraform -chdir="$InfraDir" output -raw bucket_name
$distId = terraform -chdir="$InfraDir" output -raw distribution_id

if (-not $bucket -or -not $distId) {
  throw "Konnte bucket_name / distribution_id nicht aus Terraform lesen. Erst 'terraform apply' ausführen."
}

Write-Host "Sync '$SiteDir' -> s3://$bucket ..." -ForegroundColor Cyan

# HTML: keine lange Cache-Zeit (immer frisch), --delete entfernt alte Objekte.
aws s3 sync $SiteDir "s3://$bucket" `
  --delete `
  --exclude "*.html" `
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync $SiteDir "s3://$bucket" `
  --exclude "*" `
  --include "*.html" `
  --cache-control "public,max-age=0,must-revalidate" `
  --content-type "text/html; charset=utf-8"

Write-Host "Invalidiere CloudFront-Cache ($distId)..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $distId --paths "/*" | Out-Null

Write-Host "Fertig." -ForegroundColor Green
