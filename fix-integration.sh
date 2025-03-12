#!/bin/bash

# Fix the integration between LLM-generated activities and the shop interface
echo "============================================"
echo "Fixing LLM Activity Integration with Shop"
echo "============================================"

# Run the scripts in sequence
echo "Step 1: Fixing LLM-generated activities format..."
npx tsx scripts/fix-llm-activities.ts

echo "Step 2: Adding search keywords to activities..."
npx tsx scripts/sync-search-keywords.ts

echo "============================================"
echo "Integration complete! The LLM-generated activities should now be searchable"
echo "in the shop interface. Try searching for 'raft' to find the Rafting Adventure."
echo "============================================"