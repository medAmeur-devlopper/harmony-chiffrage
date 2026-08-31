#!/bin/bash
set -e

echo "=== Harmony Chiffrage — Script de déploiement VPS ==="

# 1. Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "Installation de Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node $(node -v)"

# 2. Installer les dépendances
echo "Installation des dépendances..."
npm ci --omit=dev

# 3. Prisma : générer le client + appliquer les migrations
echo "Configuration de la base de données..."
npx prisma generate
npx prisma migrate deploy

# 4. Seeder (uniquement si la DB est vide)
echo "Seed de la base de données..."
npm run db:seed 2>/dev/null || echo "Seed déjà appliqué ou erreur ignorée"

# 5. Build
echo "Build de l'application..."
npm run build

# 6. Installer PM2 si absent
if ! command -v pm2 &> /dev/null; then
  echo "Installation de PM2..."
  sudo npm install -g pm2
fi

# 7. Lancer / relancer avec PM2
pm2 delete harmony-chiffrage 2>/dev/null || true
pm2 start npm --name harmony-chiffrage -- start
pm2 save

echo ""
echo "=== Déploiement terminé ==="
echo "L'app tourne sur http://localhost:3000"
echo ""
echo "Prochaines étapes :"
echo "  1. Configurer Nginx en reverse proxy (voir nginx.conf)"
echo "  2. Activer HTTPS : sudo certbot --nginx -d votre-domaine.ma"
echo "  3. Activer le démarrage auto : pm2 startup"
