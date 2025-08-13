#!/bin/bash

# Path where your model should be — adjust if different
MODEL_DIR="server/models/finbert-prosus"

echo "🔍 Checking for FinBERT model in: $MODEL_DIR"

# Check if the directory exists
if [ ! -d "$MODEL_DIR" ]; then
    echo "❌ Directory not found: $MODEL_DIR"
    exit 1
fi

# Required model files
REQUIRED_FILES=(
    "config.json"
    "pytorch_model.bin"
    "tokenizer.json"
    "tokenizer_config.json"
    "vocab.txt"
)

MISSING=false
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$MODEL_DIR/$file" ]; then
        echo "❌ Missing: $file"
        MISSING=true
    else
        echo "✅ Found: $file"
    fi
done

if [ "$MISSING" = true ]; then
    echo "⚠️ Some model files are missing — FinBERT may fail to load."
    exit 1
else
    echo "🎉 All required FinBERT model files are present!"
fi
