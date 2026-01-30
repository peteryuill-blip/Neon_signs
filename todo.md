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
- [x] Rate limiting (max 7 submissions per week, at least 1 on Sunday)

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
- [x] Multi-entry submit button (Bangkok time UTC+7)
- [x] Entry counter showing X/7 this week
- [x] Sunday required for first entry, any day for subsequent entries

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

## Visual Overhaul - Cyberpunk Sacred Aesthetic
- [x] Update color system (cyan #00f0ff, magenta #ff1493, amber #ff6b35, true black #000000)
- [x] Add glow and luminosity effects (box-shadow, text-shadow)
- [x] Apply wet/glossy material appearance to cards
- [x] Add sacred geometry background patterns (5% opacity)
- [x] Update form container with magenta glow border and chamfered corners
- [x] Update input fields with cyan focus glow
- [x] Update buttons with dual-glow hover effects
- [x] Update archive/pattern results with amber borders and floating cards
- [x] Update Neon's Mirror response with cyan frame and animated reveal
- [x] Update dashboard stats with gradient progress bars and geometric lines
- [x] Add intricate tattoo-style decorative borders
- [x] Verify accessibility and readability


## Feature 2: Roundup History Refinement
- [ ] Replace table view with card-based week browser
- [ ] Create swipeable/scrollable card layout for mobile
- [ ] Each card shows: week number, date, energy level, jester activity, studio hours, somatic preview
- [ ] Add "View Full" button to see complete roundup with Neon's response
- [ ] Add filters: phase, somatic state, energy level
- [ ] Add quick-edit modal for past roundups
- [ ] Highlight current week
- [ ] Animated transitions between weeks
- [ ] Desktop grid view with card layout

## Feature 3: CSV + PDF Export
- [ ] Add "Export Year" button on dashboard
- [ ] Implement CSV export with all roundup data
- [ ] Implement PDF export with cover page
- [ ] PDF Executive Summary page (stats, trends)
- [ ] PDF Weekly Data section (one page per week)
- [ ] PDF Trends Analysis pages with charts
- [ ] Server-side file generation
- [ ] Proper file naming convention

## Feature 1: Manual Step Tracking
- [x] Add daily_steps JSON column to weekly_roundups table
- [x] Create 7-day step input UI on roundup form (Mon-Sun)
- [x] Calculate weekly total and daily average
- [x] Auto-suggest Walking Engine yes/no based on threshold (>8000 avg = yes)
- [x] Display step summary on form
- [ ] Show step trends in History charts
- [ ] Include steps in CSV/PDF export


## Feature: Expanded Work Input Section
- [x] Add worksData JSON column to weekly_roundups table
- [x] Create TypeScript types for WorkEntry structure
- [x] Update roundup.submit API to accept worksData
- [x] Update roundup.update API to handle worksData
- [x] Build expandable Works Made UI with toggle
- [x] Create WorkCard component with all sub-fields (medium, emotional temp, counts, etc.)
- [x] Implement repeating work cards with "+ Add Another Work" button
- [x] Auto-generate worksMade summary text from structured data
- [x] Validate: emotionalTemp required if started/finished > 0
- [x] Update Pattern Archaeology to search by medium and emotional temperature
- [x] Update Neon's Mirror prompt to reference work details
- [x] Add emotional temperature filter to History page
- [ ] Update CSV/PDF export to include work details


## Feature: Multi-Roundup Per Week
- [x] Add entryNumber column to weekly_roundups table (1-7 within each week)
- [x] Update canSubmit logic to allow any-day submissions (not just Sunday)
- [x] Add 7-per-week rate limit (replace 1-per-Sunday limit)
- [x] Keep Sunday as required check-in (at least 1 entry must be on Sunday)
- [x] Update submit mutation to calculate entry number within week
- [x] Update Dashboard to show "X entries this week" count
- [x] Update History to group/display multiple entries per week
- [x] Update Results page to show entry number (e.g., "Week 3, Entry 2")
- [x] Test multi-entry submission flow (17 tests passing)


## Bug Fix: Step Counter Feature
- [x] Verify daily step inputs (Mon-Sun) are visible on RoundupForm
- [x] Ensure step data is saved correctly to database
- [x] Display step data in Results page after submission
- [x] Show weekly total and daily average in results


## Bug Fix: Step Counter Edit & Walking Engine Toggle
- [x] Add step counter inputs to Edit Roundup page
- [x] Remove "Did you use the walking engine" toggle switch
- [x] Keep step tracking always active (no optional switch needed)
- [x] Update Walking Insights to be a simple text field without toggle dependency


## Feature: Step Counter Visual Display
- [x] Add step stats card to Dashboard (total steps this week, daily average)
- [x] Add step trend sparkline/chart to Dashboard (7-day bar chart)
- [x] Add step data display to History roundup cards (mini bar chart)
- [x] Add step trend line chart to History trends section (Steps tab)
- [x] Color-code step values based on thresholds (cyan 8k+, amber 5k+, magenta below)


## Feature: Quick Notes Scratchpad
- [x] Add quickNotes table to database schema (userId, content, createdAt)
- [x] Create CRUD API endpoints for quick notes
- [x] Add Quick Notes widget to Dashboard with add/view/delete functionality
- [ ] Auto-populate notes into roundup form Weather Report field

## Feature: Weather Integration
- [x] Add city field to roundup form
- [x] Add weatherData JSON field to weekly_roundups table (temp, conditions, humidity)
- [x] Integrate weather API to fetch real weather data based on city (Open-Meteo, free)
- [x] Display weather data in Results page
- [ ] Display weather data in History cards
- [ ] Store default city in user settings

### Feature: Comparison View
- [x] Add "This Week vs Last Week" comparison section to Dashboard
- [x] Compare studio hours, jester activity, energy level, steps
- [x] Show delta indicators (up/down arrows) for changes
- [x] Show change summary badges
- [x] Handle case when no previous week data exists


## Feature: Crucible Artwork Module
### Database Schema
- [x] Create materials table (material_id, material_type, display_name, aliases, first_used_date, notes)
- [x] Add Surface-specific fields (reactivity_profile, edge_behavior, absorption_curve, consistency_pattern, practice_role)
- [x] Add Medium-specific fields (viscosity_band, chromatic_force, reactivation_tendency, forgiveness_window, dilution_sensitivity, sedimentation_behavior)
- [x] Add Tool-specific fields (contact_mode, control_bias, repeatability)
- [x] Create works_core table (code, date, surface_id, medium_id, tool_id, technical_intent, discovery, rating, disposition, photo_url)

### Materials Library Page
- [x] Materials list view with filtering by type (Surface/Medium/Tool)
- [x] Add Material form with dynamic fields based on material_type
- [x] Searchable dropdown components for material selection
- [x] No edit/delete after material is used in a work (lock icon shown)

### Crucible Intake Form
- [x] Auto-generate work code (T_001, T_002...)
- [x] Date picker (default today via auto-timestamp)
- [x] Surface dropdown (searchable, shows material ID)
- [x] Medium dropdown (searchable, shows material ID)
- [x] Tool dropdown (optional, searchable)
- [x] Technical Intent text (140 chars max)
- [x] Discovery notes (280 chars max)
- [x] Rating selector (1-5 with semantic labels)
- [x] Disposition selector (Trash/Probably Trash/Save)
- [x] Photo upload UI ready (S3 integration pending)
- [x] Quick submit form design (target 60 seconds)

### Crucible Analysis Dashboard
- [x] Summary stats (total trials, materials counts, weekly average)
- [x] Trash rate as velocity signal visualization
- [x] Discovery density percentage
- [x] Surface-medium pair outcomes table
- [x] Glitch harvests list (low rating + high discovery)

### Navigation Integration
- [x] Add Crucible section to main dashboard (action card)
- [x] Add Materials Library link (header nav)
- [x] Add Crucible Intake link (action card)
- [x] Add Crucible Analysis link (header nav)


## UI: Header Navigation Redesign
- [x] Create styled icon buttons matching the N logo style (cyan border, glow effect)
- [x] Add buttons for: History, Materials, Analytics, Crucible Intake, Settings
- [x] Optimize layout for mobile (responsive, compact)
- [x] Arrange in clean horizontal row
- [x] Remove text labels, use icons with tooltips


## Feature: Crucible Intake Size & Date
- [x] Add size fields (height_cm, width_cm) to works_core table
- [x] Add date field to works_core table (already existed)
- [x] Update API to accept size and date inputs
- [x] Add size inputs (height x width in cm) to Crucible Intake form
- [x] Add date picker to Crucible Intake form
- [ ] Display size and date in analytics/results


## Feature: Material Fields from Google Sheets
- [x] Add code field (custom material code like MB1, MB2) to materials table
- [x] Add brand field (manufacturer/brand name)
- [x] Add specs field (specifications/description)
- [x] Add size field (physical dimensions)
- [x] Add purchaseLocation field (where to buy/link)
- [x] Add cost field (price)
- [x] Update Materials page form with all new fields
- [x] Optimize form for mobile (smaller inputs, better spacing, scrollable)
- [ ] Display new fields in material cards

## Bug Fix: Materials Input Performance & Mobile UX
- [x] Fix laggy input fields on Materials page (simplified form)
- [x] Optimize form rendering for mobile devices (max-height, overflow-y-auto)
- [x] Improve touch targets and spacing for mobile (smaller h-9 inputs, compact spacing)
- [x] Reduce unnecessary re-renders (removed complex logic)
- [x] Simplify material form layout for smaller screens (single column behavioral properties)


## Feature: Photo Upload with Automatic Optimization
- [x] Add photoUrl and photoKey fields to materials table
- [x] Create image optimization utility (compress + convert to WebP)
- [x] Add photo upload to Materials form with preview
- [x] Implement S3 upload for material photos with optimization
- [x] Complete photo upload for Crucible Intake with optimization
- [ ] Display photos in material cards and work detail views
- [x] Ensure all uploaded images are compressed and saved as .webp
