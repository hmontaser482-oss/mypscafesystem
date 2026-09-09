#!/bin/bash

# 🚀 PS Lounge - Automated Deployment Script
# This script will guide you through deploying to Railway

set -e

echo "════════════════════════════════════════════════════════════════"
echo "   🎮 PS Lounge - Automated Deployment to Railway"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null
then
    echo -e "${YELLOW}⚠️  Railway CLI not found${NC}"
    echo ""
    echo "Installing Railway CLI..."
    echo ""
    
    # Install Railway CLI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install railway
    else
        # Linux/Windows
        bash <(curl -fsSL https://railway.app/install.sh)
    fi
    
    echo -e "${GREEN}✅ Railway CLI installed!${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "   Step 1: Railway Login"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Opening browser for Railway login..."
echo ""

railway login

echo ""
echo -e "${GREEN}✅ Logged in to Railway!${NC}"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "   Step 2: Initialize Railway Project"
echo "════════════════════════════════════════════════════════════════"
echo ""

railway init

echo ""
echo -e "${GREEN}✅ Project initialized!${NC}"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "   Step 3: Set Environment Variables"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="ps_lounge_secret_key_$(openssl rand -hex 16)"
railway variables set CORS_ORIGIN="*"

echo ""
echo -e "${GREEN}✅ Environment variables set!${NC}"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "   Step 4: Deploy to Railway 🚀"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Deploying your application..."
echo "This may take 2-3 minutes..."
echo ""

railway up

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "   ✅ DEPLOYMENT SUCCESSFUL! 🎉"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Get the deployment URL
RAILWAY_URL=$(railway domain 2>/dev/null || echo "Check Railway dashboard for your URL")

echo ""
echo -e "${GREEN}🌐 Your app is live at:${NC}"
echo -e "${BLUE}   $RAILWAY_URL${NC}"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "   🔑 Login Credentials"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Admin Access:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo -e "${YELLOW}Cashier Access:${NC}"
echo "   Username: cashier"
echo "   Password: cashier123"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ All done! Open the URL above to start using PS Lounge!${NC}"
echo ""
echo "📞 Support: WhatsApp 01275984405 | Instagram @zo__tech"
echo ""
