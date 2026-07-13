# koljagrosse.com

Persönliche Website — minimalistisch, statisches HTML/CSS, gehostet auf
AWS S3 + CloudFront. Infrastruktur als Code mit Terraform.

## Struktur

```
site/                Statische Website (Deploy-Ziel)
  index.html         Landing Page mit Links zu den Unterseiten
  lebenslauf.html
  interessen.html    "Persönliche Interessen"
  projekte.html      "Private Projekte"
  server-setup.html  "Mein Server Setup"
  404.html
  css/style.css
infra/               Terraform: S3 + CloudFront + ACM + Route 53
  cloudfront-rewrite.js   Clean-URL-Rewrite (viewer-request Function)
scripts/
  deploy.ps1         Sync nach S3 + CloudFront-Invalidierung
```

## Lokale Vorschau

Reines HTML/CSS, kein Build-Schritt. Einfach eine Datei im Browser öffnen
oder einen kleinen Server starten:

```powershell
cd site
python -m http.server 8000
# http://localhost:8000
```

## Infrastruktur (einmalig)

Voraussetzungen: AWS CLI konfiguriert, Terraform ≥ 1.5, die Hosted Zone
für `koljagrosse.com` existiert bereits in Route 53.

```powershell
cd infra
terraform init
terraform apply
```

Terraform legt an: privater S3-Bucket, CloudFront-Distribution mit OAC,
ACM-Zertifikat (us-east-1, DNS-validiert), Route-53-Alias-Records für
Apex und `www`.

## Deployen

```powershell
./scripts/deploy.ps1
```

Lädt `site/` in den Bucket und invalidiert den CloudFront-Cache.
