# SpaceCraft Content Custom Metadata Enhancement Plan

## Overview

This document outlines the plan for enhancing metadata for items in the SpaceCraft content pipeline, starting with the science fiction collection. The goal is to improve discoverability, provide better descriptions, and create a robust tagging system that enhances the user experience in the Unity visualization.

## Current State

The Internet Archive metadata for many items is inconsistent and often poor quality:
- Descriptions are often technical (page counts, ISBN numbers) rather than engaging
- Subject tags are inconsistent and sometimes missing
- No standardized categorization system
- Missing contextual information that would help users discover content

## Proposed Enhancements

### 1. Collection Tags System

Each item will have a `spaceCraftTags` array containing standardized tags from our taxonomy. Collections will have a `spaceCraftTags` field that is the union of all item tags.

#### Tag Taxonomy for Science Fiction

**Genre Tags:**
- `classic-scifi` - Golden age and foundational works (pre-1980)
- `modern-scifi` - Contemporary science fiction (1980-present)
- `hard-scifi` - Focus on scientific accuracy
- `soft-scifi` - Focus on social sciences and philosophy
- `space-opera` - Epic space adventures
- `cyberpunk` - Digital/cyber themes
- `steampunk` - Victorian-era technology themes
- `biopunk` - Biotechnology themes
- `military-scifi` - Military focus
- `dystopian` - Dystopian societies
- `utopian` - Utopian societies
- `post-apocalyptic` - After civilization collapse
- `alternate-history` - Different historical outcomes
- `new-weird` - Genre-bending, strange fiction

**Theme Tags:**
- `time-travel` - Time travel stories
- `parallel-universes` - Multiple/parallel worlds
- `alien-contact` - First contact or alien interaction
- `space-exploration` - Focus on exploration
- `colonization` - Planetary colonization
- `artificial-intelligence` - AI/robot themes
- `genetic-engineering` - Genetic modification
- `virtual-reality` - VR/simulated reality
- `telepathy-psychic` - Mental powers
- `environmental` - Climate/ecology themes
- `social-commentary` - Strong social/political themes
- `survival` - Survival situations
- `conspiracy` - Conspiracy themes
- `transhumanism` - Human enhancement/evolution

**Format Tags:**
- `novel` - Full-length novel
- `novella` - Novella length
- `short-stories` - Short story collection
- `anthology` - Multi-author collection
- `series` - Part of a series
- `standalone` - Standalone work
- `manga` - Japanese comic format
- `graphic-novel` - Western comic format
- `comic-strip` - Comic strip collection

**Audience Tags:**
- `young-adult` - YA fiction
- `middle-grade` - Middle grade readers
- `adult` - Adult fiction
- `all-ages` - Suitable for all

**Award/Recognition Tags:**
- `hugo-award` - Hugo Award winner/nominee
- `nebula-award` - Nebula Award winner/nominee
- `classics` - Recognized classic
- `cult-classic` - Cult following
- `bestseller` - Bestselling work

**Content Warning Tags:**
- `violence` - Contains violence
- `mature-themes` - Adult themes
- `romance` - Romantic elements
- `horror-elements` - Horror elements

### 2. Enhanced Descriptions

Each item should have a compelling, user-friendly description that:
- Provides a brief, engaging plot summary (1-2 sentences)
- Mentions key themes or concepts
- Notes any important context (awards, influence, series info)
- Avoids technical jargon and publication details
- Is written to spark interest

### 3. Custom Item Metadata Structure

```json
{
  "id": "item-id",
  "customMetadata": {
    "enhancedDescription": "Engaging description here",
    "spaceCraftTags": ["space-opera", "classic-scifi", "alien-contact"],
    "recommendedAge": "12+",
    "contentWarnings": ["violence"],
    "seriesInfo": {
      "seriesName": "Foundation",
      "seriesPosition": 1,
      "totalInSeries": 7
    },
    "influence": "Considered one of the most influential works in science fiction",
    "themes": ["psychohistory", "galactic empire", "social prediction"],
    "similarWorks": ["dune0000herb", "starwarstrilogye00geor_0"]
  }
}
```

### 4. Implementation Plan

#### Phase 1: Manual Metadata Creation (Current)
1. Create custom item JSON files in `Content/collections/scifi/custom-items/`
2. Manually write enhanced descriptions for high-priority items
3. Apply tags based on the taxonomy above
4. Test integration with existing pipeline

#### Phase 2: Pipeline Integration (Next)
1. Modify pipeline to check for custom item metadata
2. Merge custom metadata with Internet Archive data
3. Include in index-deep.json export
4. Update Unity to display enhanced metadata

#### Phase 3: Automation (Future)
1. Use LLM to generate initial descriptions from IA metadata
2. Implement tag suggestion based on existing metadata
3. Create validation tools to ensure consistency
4. Build UI for metadata editing

### 5. Priority Items for Enhancement

High-priority items to enhance first (based on popularity and poor IA descriptions):

1. **dune0000herb** - Classic that needs better description
2. **foundationtrilog00isaa** - Asimov's masterwork
3. **hitchhikerssguid00doug** - Popular but technical description
4. **endersgameenderw00orso** - YA favorite
5. **snowcrash00step** - Cyberpunk classic
6. **1984** - If we have it, essential dystopian work
7. **neuromancer** - Cyberpunk foundation
8. **the-martian_201808** - Modern popular work
9. **wool0000howe** - Modern success story
10. **readyplayerone** - If available, popular modern work

### 6. Collection-Level Metadata

For `collection.json`:
```json
{
  "id": "scifi",
  "name": "Science Fiction",
  "enhancedDescription": "Journey through time, space, and imagination with classic and contemporary science fiction. From the golden age masters to modern visionaries, explore stories that ask 'what if?' and push the boundaries of human possibility.",
  "spaceCraftTags": ["union of all item tags"],
  "themes": ["space exploration", "future societies", "technology", "human nature"]
}
```

### 7. Benefits

- **Improved Discovery**: Users can filter by tags to find exactly what they want
- **Better Understanding**: Clear descriptions help users choose books
- **Contextual Information**: Series info, awards, and influence provide context
- **Content Warnings**: Help users avoid content they don't want
- **Cross-References**: Similar works help users find more content they'll enjoy

### 8. Next Steps

1. Review and refine the tag taxonomy
2. Create the first batch of custom item metadata files
3. Test with a few items to ensure the structure works
4. Document the process for contributors
5. Begin systematic enhancement of all items in the collection

## Example Enhanced Item

### Before (from Internet Archive):
```json
{
  "id": "dune0000herb",
  "title": "Dune",
  "description": "xxvi, 687 pages : 24 cm\nFuture space fantasy concerning...",
  "subject": ["Science fiction", "Dune (Imaginary place)"]
}
```

### After (with enhancements):
```json
{
  "id": "dune0000herb",
  "title": "Dune",
  "enhancedDescription": "On the desert planet Arrakis, young Paul Atreides becomes embroiled in a cosmic struggle for control of the universe's most valuable resource - the spice melange. Frank Herbert's masterpiece blends politics, religion, and ecology into an epic tale of power, betrayal, and destiny that redefined science fiction.",
  "spaceCraftTags": [
    "classic-scifi",
    "space-opera",
    "environmental",
    "political",
    "novel",
    "series",
    "hugo-award",
    "nebula-award",
    "adult"
  ],
  "themes": ["ecology", "religion", "politics", "prophecy", "power"],
  "influence": "One of the best-selling science fiction novels of all time, inspired countless works including Star Wars",
  "seriesInfo": {
    "seriesName": "Dune Chronicles",
    "seriesPosition": 1,
    "totalInSeries": 6
  }
}
```

## Conclusion

This metadata enhancement plan will transform the SpaceCraft content from a simple catalog into a rich, discoverable, and engaging library. By starting with manual enhancements and building toward automation, we can immediately improve the user experience while developing sustainable long-term solutions. 