#!/bin/bash

# taxonomy-add.sh - Add tags to taxonomy.yml from stdin
# Usage: echo "  - new tag" | ./taxonomy-add.sh
#    or: cat newtagsfile.txt | ./taxonomy-add.sh
# 
# Expected input format: one tag per line with "  - " prefix
# Example:
#   - new tag name
#   - another tag

set -e  # Exit on any error

TAXONOMY_FILE="taxonomy.yml"
BACKUP_FILE="taxonomy.yml.backup.$(date +%Y%m%d_%H%M%S)"

# Check if taxonomy.yml exists
if [[ ! -f "$TAXONOMY_FILE" ]]; then
    echo "Error: $TAXONOMY_FILE not found in current directory"
    exit 1
fi

# Create timestamped backup
cp "$TAXONOMY_FILE" "$BACKUP_FILE"
echo "Created backup: $BACKUP_FILE"

# Create temporary files
HEADER_TMP=$(mktemp)
EXISTING_TAGS_TMP=$(mktemp)
NEW_TAGS_TMP=$(mktemp)
COMBINED_TAGS_TMP=$(mktemp)
NEW_TAXONOMY_TMP=$(mktemp)

# Cleanup function
cleanup() {
    rm -f "$HEADER_TMP" "$EXISTING_TAGS_TMP" "$NEW_TAGS_TMP" "$COMBINED_TAGS_TMP" "$NEW_TAXONOMY_TMP"
}
trap cleanup EXIT

# Extract header (first 3 lines: comment lines)
head -3 "$TAXONOMY_FILE" > "$HEADER_TMP"

# Extract existing tags (skip header + "tags:" line)
tail -n +5 "$TAXONOMY_FILE" > "$EXISTING_TAGS_TMP"

# Read new tags from stdin
cat > "$NEW_TAGS_TMP"

# Combine existing and new tags, sort uniquely
cat "$EXISTING_TAGS_TMP" "$NEW_TAGS_TMP" | sort -u > "$COMBINED_TAGS_TMP"

# Rebuild taxonomy file
cat "$HEADER_TMP" > "$NEW_TAXONOMY_TMP"
echo "tags:" >> "$NEW_TAXONOMY_TMP"
cat "$COMBINED_TAGS_TMP" >> "$NEW_TAXONOMY_TMP"

# Verify the new file has content
if [[ ! -s "$NEW_TAXONOMY_TMP" ]]; then
    echo "Error: Generated file is empty"
    exit 1
fi

# Count tags for verification
ORIGINAL_COUNT=$(tail -n +5 "$TAXONOMY_FILE" | wc -l | tr -d ' ')
NEW_TAG_COUNT=$(wc -l < "$NEW_TAGS_TMP" | tr -d ' ')
FINAL_COUNT=$(tail -n +5 "$NEW_TAXONOMY_TMP" | wc -l | tr -d ' ')

echo "Original tags: $ORIGINAL_COUNT"
echo "New tags from stdin: $NEW_TAG_COUNT"
echo "Final unique tags: $FINAL_COUNT"
echo "Added: $((FINAL_COUNT - ORIGINAL_COUNT)) new unique tags"

# Replace original file
mv "$NEW_TAXONOMY_TMP" "$TAXONOMY_FILE"

echo "Successfully updated $TAXONOMY_FILE"
echo "Backup available at: $BACKUP_FILE"

# Show a sample of what was added (if any new tags)
if [[ $((FINAL_COUNT - ORIGINAL_COUNT)) -gt 0 ]]; then
    echo ""
    echo "Sample of final taxonomy (first 5 and last 5 tags):"
    echo "First 5:"
    tail -n +5 "$TAXONOMY_FILE" | head -5
    echo "..."
    echo "Last 5:"
    tail -5 "$TAXONOMY_FILE"
fi 