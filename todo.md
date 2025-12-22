# NEON SIGNS - Project TODO

## Database Schema
- [x] Weekly Roundups table (all 11 form fields + metadata)
- [x] Archive Entries table (historical entries with phrase tags)
- [x] Pattern Matches table (links roundups to archive matches)

## Backend API
- [x] POST /api/roundups - Submit weekly form with Sunday validation
- [x] GET /api/roundups/:weekNumber - Fetch specific week
- [x] GET /api/roundups/all - Fetch all weeks with pagination
- [x] GET /api/patterns/:weekNumber - Pattern archaeology for week
- [x] GET /api/neon-reading/:weekNumber - AI-generated Neon's Mirror response
- [x] GET /api/trends - Aggregate stats for dashboard
- [x] Rate limiting (max 1 submission per Sunday)

## Weekly Intake Form (11 Fields)
- [x] Weather report (free text, 2-3 sentences)
- [x] Studio hours (number input)
- [x] Works made (text description)
- [x] Jester activity slider (0-10 with color gradient)
- [x] Energy level dropdown (hot/sustainable/depleted with emoji)
- [x] Walking engine checkbox + expandable text area
- [x] Partnership/solitude temperature (text)
- [x] One thing that worked (text)
- [x] One thing that resisted (text)
- [x] Somatic state (text with placeholder)
- [x] Door intention whisper (optional text)
- [x] Real-time field validation
- [x] localStorage draft saving
- [x] Sunday-only submit button (Bangkok time UTC+7)
- [x] Grayed out button with tooltip on non-Sundays

## Pattern Archaeology Engine
- [x] Phrase matching from weather report + text fields
- [x] Emotional state parallel detection
- [x] Phase-DNA resonance identification
- [x] Color-coded timeline display (red=phrase, orange=emotional, blue=phase)
- [x] Top 5 matches with relevance scores

## Neon's Mirror (AI Integration)
- [x] LLM prompt template implementation
- [x] Quote weather report directly
- [x] Name archive mirrors
- [x] State phase-pressure
- [x] Ask one sharp closing question
- [x] Precise-poetic tone (not generic)

## Dashboard
- [x] Week X of 52 progress bar
- [x] Days until next check-in countdown
- [x] Last roundup date display
- [x] Jester trend sparkline
- [x] Total studio hours accumulated
- [x] Average energy level trend
- [x] Average jester activity

## Results Page
- [x] Section 1: Intake confirmation (immediate)
- [x] Section 2: Pattern archaeology (3-second delay)
- [x] Section 3: Neon's Mirror (6-second delay)
- [x] Cascading reveal animation

## History/Trends Page
- [x] Week-by-week table (week, weather, hours, jester, energy, phase-DNA)
- [x] Jester activity trend line chart
- [x] Energy level visualization
- [x] Studio hours bar chart
- [x] 52-week timeline with "you are here" marker
- [x] CSV export functionality

## UI/UX Design
- [x] Dark mode theme
- [x] Neon aesthetic (cyan, magenta, electric blue accents)
- [x] Mobile-first responsive design
- [x] Thumb-friendly navigation
- [x] Elegant serif font for Neon's Mirror

## Archive Seeding
- [x] Seed script for ~500 historical entries (50 entries loaded)
- [x] Phrase extraction and tagging
- [x] Emotional state classification
- [x] Phase-DNA assignments (PH1-NE)

## Authentication & Security
- [x] Single user authentication
- [x] Protected API routes
- [x] SQL injection prevention (parameterized queries)


## Archive Enrichment (New Request)
- [x] Read and analyze FULL_PHASE_A1_A5_NEON_MASTER.txt
- [x] Read and analyze PRIMARY_SOURCE_WRITING_MASTER.txt
- [x] Extract phase transitions, somatic states, Jester moments, breakthrough points
- [x] Structure entries with: phase_dna, somatic_state, jester_activity_level, emotional_resonance, pattern_tag
- [x] Create seed script for new historical entries
- [x] Load enriched archive into database
- [x] Verify data integrity and counts

## Bug Fixes
- [x] Fix week counter to show Crucible Year progress (Week 0/1) instead of calendar year (Week 52)

## Data Import
- [x] Import Week 0 baseline roundup from WEEKLY_ROUNDUP_CONTINUOUS_LOG.txt

## Admin Settings & Edit Features
- [x] Create user_settings database table for Crucible Year configuration
- [x] Add API endpoints for settings CRUD operations
- [x] Build Admin Settings page UI (start date, check-in day, timezone)
- [x] Add edit functionality for past roundups
- [x] Update week calculation to use user settings instead of hardcoded values
- [x] Add reset/new cycle option
