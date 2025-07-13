# SpaceCraft Custom Metadata Enhancement Plan

## Overview
Plan for implementing custom metadata pipeline to enhance item discovery and enable keyword-based search in SpaceCraft.

## Pipeline Integration 
- Implement custom item metadata injection in content pipeline
- Generate clean keyword list in index-deep.json
- Spacecraft simulator.js will read keywords and share via Supabase state
- Controllers will access keyword list from Supabase for UI presentation

## Search System Design
- Support `#keyword` prefix for direct keyword/tag matching
- Join multiple controller search strings with spaces
- Let fuzzy search handle combined queries intelligently
- Enable magic search commands for hidden feature activation

## Implementation Steps
1. Integrate custom metadata handling into existing pipeline
2. Export keyword list within index-deep.json structure
3. Update spacecraft simulator to share keywords via Supabase
4. Implement keyword menu UI in controllers
5. Add search string aggregation from multiple controllers
6. Deploy #keyword prefix matching in search function 