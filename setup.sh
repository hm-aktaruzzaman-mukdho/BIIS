#!/bin/bash
# BIIS - First-time Setup Script
# Run this script once to install dependencies, run migrations, and seed the database

set -e

echo "🚀 BIIS Setup Script"
echo "===================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Installing root dependencies..."
npm install

echo ""
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

echo ""
echo "📦 Installing client dependencies..."
cd client && npm install && cd ..

echo ""
echo "🗄️  Running database migrations & seeding..."
cd server && node src/migrate.js && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Run './start.sh' to start the application"
echo ""
echo "🔗 Demo accounts:"
echo "   Provost: provost1@biis.edu / provost123"
echo "   Student: rahim@student.edu / student123"
