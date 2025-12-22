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
