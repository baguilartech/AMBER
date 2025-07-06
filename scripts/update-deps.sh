#!/bin/bash

# Update Dependencies Script
echo "🔧 Updating dependencies to fix security vulnerabilities..."

# Remove existing node_modules and package-lock.json
echo "📦 Cleaning up existing dependencies..."
rm -rf node_modules package-lock.json

# Reinstall dependencies
echo "🔄 Installing dependencies..."
npm install

# Run audit to check for vulnerabilities
echo "🔍 Running security audit..."
npm audit

# Run tests to ensure everything still works
echo "🧪 Running tests..."
npm test

echo "✅ Dependencies updated successfully!"
echo "📋 Please commit the updated package-lock.json file" 