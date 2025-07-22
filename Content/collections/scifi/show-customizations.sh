#!/bin/bash

# Show all custom metadata files in the science fiction collection
# Usage: ./show-customizations.sh

echo "=== SPACECRAFT SCIENCE FICTION COLLECTION CUSTOMIZATIONS ==="
echo "=============================================================="
echo ""

count=0

# Loop through all item-custom.json files in items subdirectories
for custom_file in items/*/item-custom.json; do
    if [ -f "$custom_file" ]; then
        count=$((count + 1))
        echo "[$count] $custom_file"
        echo "----------------------------------------"
        cat "$custom_file"
        echo ""
        echo "=========================================="
        echo ""
    fi
done

echo "Total custom metadata files found: $count"
echo ""
echo "=== END OF CUSTOMIZATIONS ===" 