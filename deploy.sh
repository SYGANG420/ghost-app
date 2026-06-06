#!/bin/bash
set -e

cd /opt/ghost-app/ghost-app
git pull origin main

# Python environment
source venv/bin/activate
pip install -r requirements.txt

# Frontend build
cd frontend
npm install
npm run build
cd ..

# Service restart
systemctl restart ghost-control

echo "デプロイ完了"
