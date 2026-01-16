#!/bin/bash
# deploy-vercel.sh - Deploy Timeboxxer to Vercel
# 
# Prerequisites:
# 1. Vercel CLI installed: npm i -g vercel
# 2. Logged into Vercel: vercel login
# 3. Supabase project URL and anon key ready

set -e

echo "🚀 Timeboxxer Vercel Deployment"
echo "================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
echo "📋 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged into Vercel. Running 'vercel login'..."
    vercel login
fi

echo ""
echo "🔧 Environment Variables Required:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "You'll be prompted to add these during first deploy."
echo ""

# First-time setup or deploy
if [ ! -d ".vercel" ]; then
    echo "📦 First-time setup - linking to Vercel..."
    echo "   Follow the prompts to configure your project."
    echo ""
    vercel link
fi

# Deploy
echo ""
echo "🚀 Deploying to Vercel..."
echo ""

# Check if --prod flag was passed
if [ "$1" == "--prod" ]; then
    echo "📍 Production deployment..."
    vercel --prod
else
    echo "📍 Preview deployment (use --prod for production)..."
    vercel
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Set environment variables in Vercel dashboard if not done"
echo "  2. Configure Supabase Auth redirect URLs:"
echo "     - Site URL: your-vercel-url"
echo "     - Redirect URLs: your-vercel-url/**"
