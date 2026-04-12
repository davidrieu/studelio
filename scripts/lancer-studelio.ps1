# Lance Studelio en local (Windows, y compris PC ARM)
# Clic droit > Exécuter avec PowerShell  OU  dans le dossier du projet :  powershell -ExecutionPolicy Bypass -File scripts/lancer-studelio.ps1

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Host ""
Write-Host "=== Studelio — demarrage local ===" -ForegroundColor Cyan
Write-Host ""

# Verifier Docker
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "ERREUR : Docker ne repond pas." -ForegroundColor Red
    Write-Host "1) Ouvre Docker Desktop et attends la barre verte (Docker est pret)." -ForegroundColor Yellow
    Write-Host "2) Redemarre Docker Desktop si besoin." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/4] Demarrage de PostgreSQL (Docker)..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Si le port 5432 est deja pris, vois SETUP-LOCAL.txt section 'Conflit de port'." -ForegroundColor Yellow
    exit 1
}

Write-Host "      Attente que PostgreSQL soit pret (15 s max)..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    docker exec studelio-postgres pg_isready -U studelio -d studelio 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    Write-Host "PostgreSQL met du temps. Regarde les logs : docker compose logs db" -ForegroundColor Yellow
}

Write-Host "[2/4] Prisma (schema dans la base)..." -ForegroundColor Yellow
npx prisma db push

Write-Host "[3/4] Donnees de test (programmes + compte demo)..." -ForegroundColor Yellow
npm run db:seed

Write-Host "[4/4] Serveur web Next.js..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Ouvre le navigateur : http://localhost:3000" -ForegroundColor Green
Write-Host "Compte demo : demo@studelio.local  /  studelio-local" -ForegroundColor Green
Write-Host ""
npm run dev
