# deploy.ps1 - Script PowerShell pour initialiser Git et préparer le déploiement sur GitHub

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   Initialisation de Git - Portail de Gouvernance MGEN" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Vérifier si git est installé
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Git est installé." -ForegroundColor Green
} else {
    Write-Host "[ERREUR] Git n'est pas détecté. Veuillez installer Git pour Windows." -ForegroundColor Red
    Exit
}

# 2. Initialiser le dépôt
if (-not (Test-Path .git)) {
    Write-Host "Initialisation du dépôt Git local..." -ForegroundColor Yellow
    git init
    git branch -M main
} else {
    Write-Host "[INFO] Dépôt Git local déjà initialisé." -ForegroundColor Blue
}

# 3. Ajouter les fichiers et commiter
Write-Host "Ajout des fichiers au suivi Git..." -ForegroundColor Yellow
git add .

Write-Host "Création du premier commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Portail de Gouvernance & Qualité IA MGEN"

# 4. Configurer le dépôt distant
$remoteUrl = "https://github.com/jeoram/mgen-data-governance-portal.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "Mise à jour de l'URL du dépôt distant vers : $remoteUrl" -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
} else {
    Write-Host "Ajout du dépôt distant : $remoteUrl" -ForegroundColor Yellow
    git remote add origin $remoteUrl
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " [SUCCÈS] Dépôt Git configuré localement !" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour envoyer le projet sur votre GitHub :" -ForegroundColor Yellow
Write-Host "1. Créez un dépôt public vide nommé 'mgen-data-governance-portal' sur votre compte GitHub (https://github.com/new)." -ForegroundColor White
Write-Host "2. Exécutez la commande suivante dans votre terminal :" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "Une fois poussé, allez dans Settings > Pages de votre dépôt GitHub," -ForegroundColor White
Write-Host "choisissez la branche 'main' et le dossier '/ (root)' pour le mettre en ligne." -ForegroundColor White
Write-Host ""
