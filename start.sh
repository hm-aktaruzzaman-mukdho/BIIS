#!/bin/bash
# BIIS - Start Script
# Runs both the backend server and frontend dev server concurrently

set -e

echo "🚀 Starting BIIS..."
echo "==================="
echo ""
echo "📡 Backend:  http://localhost:5001"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev
