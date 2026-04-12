# Studelio — installation locale (Windows)
# Exécuter depuis la racine du projet :  powershell -ExecutionPolicy Bypass -File scripts/setup-local.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host "=== Studelio : installation locale ===" -ForegroundColor Cyan
Write-Host ""

# 1) Dépendances npm
Write-Host "[1/5] npm install..." -ForegroundColor Yellow
npm install

# 2) Docker PostgreSQL (recommandé)
$useDocker = $false
try {
    $null = Get-Command docker -ErrorAction Stop
    Write-Host "[2/5] Demarrage de PostgreSQL (Docker)..." -ForegroundColor Yellow
    docker compose up -d
    Start-Sleep -Seconds 4
    $useDocker = $true
} catch {
    Write-Host "[2/5] Docker non disponible. Si PostgreSQL est installe ailleurs, mets DATABASE_URL dans .env." -ForegroundColor DarkYellow
}

# 3) Fichier .env
Write-Host "[3/5] Configuration .env..." -ForegroundColor Yellow
$authSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })

if ($useDocker) {
    $dbUrl = 'postgresql://studelio:studelio@localhost:5432/studelio'
} else {
    # PostgreSQL classique (utilisateur postgres) — change le mot de passe si besoin
    $dbUrl = 'postgresql://postgres:postgres@localhost:5432/studelio'
}

$envPath = Join-Path (Get-Location) ".env"
$lines = @(
    "# Genere par scripts/setup-local.ps1 — tu peux modifier",
    "DATABASE_URL=`"$dbUrl`"",
    "AUTH_SECRET=`"$authSecret`"",
    "NEXTAUTH_SECRET=`"$authSecret`"",
    "AUTH_URL=`"http://localhost:3000`"",
    "NEXTAUTH_URL=`"http://localhost:3000`"",
    ""
)
Set-Content -Path $envPath -Value $lines -Encoding UTF8
Write-Host "      DATABASE_URL = $dbUrl" -ForegroundColor Gray

if (-not $useDocker) {
    Write-Host ""
    Write-Host "IMPORTANT : sans Docker, cree la base 'studelio' et un utilisateur, ou installe Docker Desktop puis relance ce script." -ForegroundColor DarkYellow
    Write-Host "Connexion par defaut dans .env : postgres / postgres (modifie si ton mot de passe superuser est different)." -ForegroundColor DarkYellow
}

# 4) Prisma
Write-Host "[4/5] Prisma (generate + db push)..." -ForegroundColor Yellow
npx prisma generate
npx prisma db push

# 5) Seed
Write-Host "[5/5] Seed (programmes + compte demo)..." -ForegroundColor Yellow
npm run db:seed

Write-Host ""
Write-Host "Termine ! Lance le site avec :  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Compte demo :  demo@studelio.local  /  studelio-local" -ForegroundColor Green
Write-Host ""
