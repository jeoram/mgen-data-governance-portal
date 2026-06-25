#!/bin/bash
# deploy.sh - Script Shell pour initialiser Git et préparer le déploiement sur GitHub

echo -e "\033[0;36m======================================================================\033[0m"
echo -e "\033[0;36m   Initialisation de Git - Portail de Gouvernance MGEN\033[0m"
echo -e "\033[0;36m======================================================================\033[0m"

# Vérifier si git est installé
if ! command -v git &> /dev/null; then
    echo -e "\033[0;31m[ERREUR] Git n'est pas détecté. Veuillez installer Git.\033[0m"
    exit 1
fi

echo -e "\033[0;32m[OK] Git est installé.\033[0m"

# Initialiser le dépôt
if [ ! -d ".git" ]; then
    echo "Initialisation du dépôt Git local..."
    git init
    git branch -M main
else
    echo -e "\033[0;34m[INFO] Dépôt Git local déjà initialisé.\033[0m"
fi

# Ajouter les fichiers et commiter
echo "Ajout des fichiers au suivi Git..."
git add .

echo "Création du premier commit..."
git commit -m "Initial commit: Portail de Gouvernance & Qualité IA MGEN"

# Configurer le dépôt distant
REMOTE_URL="https://github.com/jeoram/mgen-data-governance-portal.git"
if git remote get-url origin &> /dev/null; then
    echo "Mise à jour de l'URL du dépôt distant vers : $REMOTE_URL"
    git remote set-url origin "$REMOTE_URL"
else
    echo "Ajout du dépôt distant : $REMOTE_URL"
    git remote add origin "$REMOTE_URL"
fi

echo -e "\033[0;32m======================================================================\033[0m"
echo -e "\033[0;32m [SUCCÈS] Dépôt Git configuré localement !\033[0m"
echo -e "\033[0;32m======================================================================\033[0m"
echo ""
echo -e "\033[0;33mPour envoyer le projet sur votre GitHub :\033[0m"
echo "1. Créez un dépôt public vide nommé 'mgen-data-governance-portal' sur votre compte GitHub (https://github.com/new)."
echo "2. Exécutez la commande suivante dans votre terminal :"
echo -e "\033[0;36m   git push -u origin main\033[0m"
echo ""
echo "Une fois poussé, allez dans Settings > Pages de votre dépôt GitHub,"
echo "choisissez la branche 'main' et le dossier '/ (root)' pour le mettre en ligne."
echo ""
