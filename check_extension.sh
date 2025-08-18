#!/bin/bash

echo "🔍 Chrome Extension Pre-Submission Check"
echo "========================================"

# Navigate to extension directory (adjust if needed)
cd extension

echo "📋 Checking manifest.json permissions..."

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found. Installing via brew..."
    brew install jq
fi

# Expected permissions based on your code analysis
used_permissions=("activeTab" "contextMenus")

# Extract permissions from manifest.json
manifest_perms=$(jq -r '.permissions[]' manifest.json 2>/dev/null || echo "ERROR: manifest.json not found or invalid JSON")

if [[ "$manifest_perms" == "ERROR"* ]]; then
    echo "❌ manifest.json error: $manifest_perms"
    exit 1
fi

echo "✅ Expected permissions: ${used_permissions[*]}"
echo "📄 Found in manifest: $(echo $manifest_perms | tr '\n' ' ')"

# Check for extra permissions that should be removed
extra_perms=()
for perm in $manifest_perms; do
    if [[ ! " ${used_permissions[@]} " =~ " $perm " ]]; then
        extra_perms+=("$perm")
    fi
done

if [ ${#extra_perms[@]} -eq 0 ]; then
    echo "✅ Permissions check PASSED - No extra permissions found"
else
    echo "❌ EXTRA permissions found (must remove): ${extra_perms[*]}"
    echo "   Remove these from manifest.json before resubmitting!"
    exit 1
fi

echo ""
echo "📁 Checking required files..."

# Check required files exist
required_files=(manifest.json background.js content.js popup.html styles.css)
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file found"
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ Missing files: ${missing_files[*]}"
    exit 1
fi

echo ""
echo "🔍 Checking for unused permission usage in code..."

# Double-check that removed permissions aren't used
if grep -r --include="*.js" 'chrome\.storage' . > /dev/null; then
    echo "❌ Found chrome.storage usage - need 'storage' permission!"
    exit 1
fi

if grep -r --include="*.js" 'chrome\.scripting' . > /dev/null; then
    echo "❌ Found chrome.scripting usage - need 'scripting' permission!"
    exit 1
fi

echo "✅ No usage of removed permissions found"

echo ""
echo "📦 Creating submission ZIP..."

# Clean up any old ZIP
rm -f ../reddit-stock-sentiment-tracker-extension.zip

# Create new ZIP excluding unnecessary files
zip -r ../reddit-stock-sentiment-tracker-extension.zip . \
    -x "*.DS_Store*" "*.git*" "*node_modules*" "*.log*" "*cache*"

if [ $? -eq 0 ]; then
    echo "✅ ZIP created: ../reddit-stock-sentiment-tracker-extension.zip"
    
    # Show ZIP contents for verification
    echo ""
    echo "📋 ZIP contents:"
    unzip -l ../reddit-stock-sentiment-tracker-extension.zip
    
    # Check ZIP size
    zip_size=$(du -h ../reddit-stock-sentiment-tracker-extension.zip | cut -f1)
    echo ""
    echo "📊 ZIP size: $zip_size (must be under 10MB for Chrome Web Store)"
    
    echo ""
    echo "🎉 All checks passed! Your extension is ready for resubmission."
    echo "📤 Upload: ../reddit-stock-sentiment-tracker-extension.zip"
else
    echo "❌ Failed to create ZIP file"
    exit 1
fi

