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


## Bug Fix: Material Dropdown Sorting
- [x] Fix material dropdowns to sort by custom code (S1, S2, MB2) in ascending numerical order
- [x] Display code prominently in dropdown options
- [x] Implement natural sort (S1, S2, S10 not S1, S10, S2)

## Feature: Multi-Select Materials per Artwork
- [x] Update database schema to support multiple surfaces per work (junction table)
- [x] Update database schema to support multiple mediums per work (junction table)
- [x] Update database schema to support multiple tools per work (junction table)
- [x] Add multi-select UI for surfaces in Crucible Intake (checkbox list)
- [x] Add multi-select UI for mediums in Crucible Intake (checkbox list)
- [x] Add multi-select UI for tools in Crucible Intake (checkbox list)
- [x] Optimize multi-select for mobile (touch-friendly, scrollable max-h-48)
- [ ] Display all selected materials in work detail/analytics views


## Bug Fix: Log Trial Button Not Working
- [x] Debug why "Log Trial" button doesn't submit the form (navigation issue fixed)
- [x] Check form validation errors (surfaceIds/mediumIds validation working)
- [x] Fix submission handler (redirects to /crucible/analytics after success)
- [x] Test successful trial creation (all 32 tests passing)

## Feature: Hours Field for Artwork Time Tracking
- [x] Add hours field to works_core table
- [x] Add hours input to Crucible Intake form (step 0.25, displays "X hours")
- [ ] Display hours in work detail/analytics views
- [x] Update API to accept hours field

## Bug Fix: Log Trial Button Not Working
- [x] Remove old single-material columns (surfaceId, mediumId, toolId) from works_core schema
- [x] Complete database migration for multi-material support via junction tables
- [x] Test Log Trial button with full form submission
- [x] Fix Analytics page toFixed errors for number type checking

## Feature: Crucible Works Browser & Edit
- [x] Create Works browser page (/crucible/works) with grid/card view of all trials
- [x] Display work cards with: code, date, photo thumbnail, rating, disposition, materials used
- [x] Add filters: by disposition (Trash/Probably Trash/Save), by rating, by date range
- [x] Add sorting: by date, by rating, by code
- [x] Create individual work detail page (/crucible/work/:id) with full information
- [x] Show full-size photo, all materials (surfaces/mediums/tools), technical intent, discovery notes, size, hours
- [x] Add edit button to work detail page
- [x] Create edit work form with pre-filled data
- [x] Allow editing: materials, notes, rating, disposition, photo, size, hours
- [x] Add navigation link to Works browser in header
- [x] Test complete flow: browse → view detail → edit → save

## Enhancement: Complete Work Edit Functionality
- [x] Add photo upload capability to work edit page with WebP optimization
- [x] Add date picker to allow changing work date
- [x] Ensure all measurement fields (height, width, hours) are fully editable
- [x] Reuse photo optimization logic from CrucibleIntake for consistency
- [x] Test photo upload and replacement in edit mode

## Bug Fix: Analytics Trash Rate Stuck at 0%
- [x] Investigate trash rate calculation logic in Analytics page
- [x] Fix the calculation to properly count works by disposition
- [x] Test with different disposition values to verify percentage updates

## Feature: Update Disposition Options
- [x] Update database schema to change disposition enum values
- [x] Replace "Save" with "Save - Archive" and "Save - Has Potential"
- [x] Update CrucibleIntake form disposition options
- [x] Update WorkEdit form disposition options
- [x] Update CrucibleWorks filter options
- [x] Update Analytics page disposition logic
- [x] Run database migration to apply schema changes
- [x] Test all forms and filters with new disposition values

## Bug Fix: Broken Image Links on Crucible Works Page
- [x] Investigate why images are showing as broken (404 errors) - S3 storage was cleared
- [x] Check database photoUrl values for works - URLs exist but files are gone
- [x] Verify S3 storage and URL generation - Platform storage issue
- [x] Implement hybrid storage: base64 thumbnails in database + S3 URLs for full-res
- [x] Add photoThumbnail field to works_core schema
- [x] Update upload logic to generate and store thumbnails
- [x] Update CrucibleWorks and WorkDetail to use database thumbnails
- [x] Test image display on all pages

## Bug Fix: New Work Photos Not Uploading
- [ ] Test photo upload flow on Crucible Intake
- [ ] Check server logs for upload errors
- [ ] Debug uploadPhoto mutation and thumbnail generation
- [ ] Fix photo upload issue
- [ ] Verify photos display correctly after upload

## Critical Fix: Photo Upload User Experience
- [x] Investigate why users report photo upload failures - premature navigation was the issue
- [x] Add immediate visual feedback when photo is selected - preview already working
- [x] Add clear loading state during upload process - "Uploading Photo..." button state
- [x] Add success/error notifications - console logs and error alerts
- [x] Ensure photo displays in preview immediately after selection - working
- [x] Test complete user flow from photo selection to final display - fixed synchronous flow

## CRITICAL BUG: Photo Upload Database Update Failure
- [x] Fix "Failed query: update works_core set photoUrl/photoKey/photoThumbnail" error - Changed TEXT to LONGTEXT
- [x] Investigate why database update is failing in uploadPhoto mutation - Base64 thumbnails exceeded TEXT 64KB limit
- [x] Check if photoThumbnail column exists and has correct type - Changed to LONGTEXT (4GB limit)
- [x] Verify updateWork function in db.ts handles photo fields correctly - Working correctly
- [x] Test photo upload end-to-end after fix - T_021 uploaded successfully with yellow photo

## Feature: CSV Export for Crucible Works
- [x] Create API endpoint to fetch all works with materials data
- [x] Format data as CSV with columns: code, date, rating, disposition, surfaces, mediums, tools, technical_intent, discovery, height_cm, width_cm, hours
- [x] Add CSV export button to CrucibleWorks page header
- [x] Generate and download CSV file with all trial data
- [x] Test CSV export with existing works - Downloaded crucible-works-2026-02-03.csv with 21 trials

## Enhancement: Comprehensive Crucible Analytics Dashboard
- [x] Add material usage breakdown (most used surfaces, mediums, tools)
- [x] Add rating distribution chart (1-5 star breakdown)
- [x] Add disposition breakdown chart (Trash, Probably Trash, Save variants)
- [x] Add dimensional statistics (avg/min/max height, width, total area)
- [x] Add time investment statistics (total hours, avg hours per work, distribution)
- [x] Add temporal trends (works per week, rating over time, trash rate over time) - API ready, not displayed yet
- [x] Add API endpoints for detailed analytics queries
- [x] Create responsive grid layout for all metrics
- [x] Test with real data and verify mobile optimization

## Bug Fix: Material Usage Numbers Not Displaying
- [x] Investigate why Surface Usage, Medium Usage, and Tool Usage cards show no numbers - Wrong column names in query
- [x] Check materialUsage API response in browser console - 500 errors from bad queries
- [x] Fix query or display logic to show material codes and usage counts - Fixed to use displayName and correct enum values
- [x] Test with real data to verify numbers display correctly - Showing S4(21), S5(11), MB1(54), MB2(53), T1(56)

## Update Trash Rate Calculation
- [x] Modify getTrashRateAsVelocitySignal() to count both "Trash" and "Probably_Trash" dispositions
- [x] Test that trash rate percentage updates correctly
- [x] Verify Analytics page displays the updated trash rate

## Integration: Merge Weekly Roundup + Crucible Systems
### Works Data Sync
- [x] Add API endpoint to fetch Crucible works for a given week (by date range)
- [x] Auto-populate "Works Made" section of Weekly Roundup with Crucible trial data for that week
- [x] Show Crucible trial summary (codes, ratings, dispositions) in roundup form as read-only reference
- [x] Link roundup worksMade text auto-generation to actual Crucible trial data

### Unified Analytics Page
- [x] Create new unified analytics page replacing separate Crucible Analytics
- [x] Section: Crucible Year Progress (week counter, total roundups, total trials)
- [x] Section: Studio Practice (total hours, avg hours/week, jester trend, energy distribution)
- [x] Section: Step Tracking (total steps, weekly averages, daily patterns)
- [x] Section: Material Trials (total trials, trash rate, rating distribution, disposition breakdown)
- [x] Section: Material Usage (surfaces, mediums, tools usage counts)
- [x] Section: Dimensional & Time Stats (sizes, hours per trial)
- [x] Section: Discovery Insights (discovery density, key patterns)
- [x] Update navigation to point to unified analytics page

### Unified Export
- [x] Create single CSV export combining roundup + crucible data
- [x] Sheet 1 data: Weekly roundups with all fields
- [x] Sheet 2 data: Crucible trials with materials, ratings, dispositions
- [x] Include cross-references (week numbers linking trials to roundups)
- [x] Single download button on unified analytics page

### Navigation Cleanup
- [x] Replace separate analytics pages with unified page
- [x] Update header navigation icons
- [x] Ensure smooth flow between roundup form → crucible intake → unified analytics

## Navigation: Add Analytics Link
- [x] Add Command Center quick link card to dashboard bottom section alongside other quick links
- [x] Move Command Center card higher on dashboard, above quick notes section

## CSV Export Restructuring
- [x] Rewrite unified CSV export to produce two sections matching exact spec
- [x] ROUNDUP: Split "Works Made" into Works_Started, Works_Finished, Works_Notes
- [x] ROUNDUP: Rename "Weather Report" to "Raw_Weather_Report"
- [x] ROUNDUP: Fix Week 0 duplicate (Dec 20 → Week -1, Dec 22 → Week 0)
- [x] ROUNDUP: Replace deferred/placeholder text with blank cells
- [x] ROUNDUP: Enforce exact column order per spec
- [x] TRIALS: Split "Technical Intent" into Technical_Observation and Self_Directive
- [x] TRIALS: Add Save_Has_Potential_Flag boolean column
- [x] TRIALS: Replace deferred/placeholder text with blank cells
- [x] TRIALS: Enforce exact column order per spec
- [x] Test export endpoint produces valid CSV matching all validation checks

## MASTERPIECE REDESIGN (from NEON_SIGNS_REDESIGN_SPEC.md)

### Phase 1: Critical Fixes
- [ ] Fix "52 weeks elapsed" progress bar text bug on Command Center Overview
- [ ] Fix duplicate W0 x-axis on all charts → render Week -1 as "B" (baseline)
- [ ] Fix Trials Over Time x-axis formatting (week numbers not month format)
- [ ] Add material display names to Command Center Materials tab (not just codes)
- [ ] Fix disposition color consistency (green=saves, red=trash, amber=probably trash)

### Phase 2: Intake Optimization
- [ ] Smart material defaults (pre-select last trial's materials via useLastTrialDefaults hook)
- [ ] Collapsed sections (materials + notes start collapsed)
- [ ] Auto-disposition from rating (1-2→Probably Trash, 3→Save Archive, 4-5→Save Archive)
- [ ] Dimension quick-select presets from most common sizes
- [ ] Sticky "Save Trial" button at bottom of intake form
- [ ] Remove default rating selection (force user to choose)
- [ ] Photo upload front and center in essentials section
- [ ] Hours quick-tap options (1.0/1.5/2.0/2.5/3.0)

### Phase 3: Navigation Overhaul
- [ ] Build BottomNav.tsx component (5 tabs: Home, Intake, Works, Analytics, More)
- [ ] Integrate BottomNav into App.tsx routing
- [ ] Add badges (trial count on Intake, roundup due on Home)
- [ ] Remove header icon bar from dashboard
- [ ] Bottom nav: cyan glow + filled icon for active tab
- [ ] On tablet/desktop (>=768px) convert to left sidebar with labels

### Phase 4: Dashboard Redesign
- [ ] "This Week" focus with delta indicators (vs last week)
- [ ] Simplified step tracker (single bars, no dual-bar overlay)
- [ ] Jester as status badge not chart ("0/10 ✓ Clear")
- [ ] Quick Notes expansion with existing notes visible inline + count
- [ ] Somatic state highlight card
- [ ] Remove cumulative stats from dashboard (move to Command Center)
- [ ] Next check-in countdown display

### Phase 5: Visual Polish
- [ ] Add semantic color variables (--status-save, --status-trash, etc.)
- [ ] Add energy semantic colors (--energy-hot, --energy-sustainable, --energy-depleted)
- [ ] Add jester scale colors (--jester-clear, --jester-watch, --jester-alert, --jester-critical)
- [ ] Contextual card borders (reduce universal glow)
- [ ] Progress bar redesign (cyan fill on dark track, remove red gradient)
- [ ] Add monospace font (JetBrains Mono) for codes and data
- [ ] Touch target enlargement (52-week timeline, mobile buttons min 44x44px)
- [ ] Gallery lightbox for Works (full-screen photo with swipe)
- [ ] Works gallery: quick filter pills, material info on cards, discovery preview
- [ ] Batch operations for reviewing Probably Trash works
- [ ] Scroll snap on Week Browser in History
- [ ] New border variables (--border-subtle, --border-interactive)
- [ ] New glow intensity tiers (--glow-ambient, --glow-subtle, --glow-medium, --glow-intense)
- [ ] Updated .cyber-card classes (remove ambient glow, add contextual variants)
- [ ] .data-code class for monospace trial/material codes
- [ ] .bottom-nav and .bottom-nav-item CSS classes
- [ ] .intake-save-footer sticky class

### Phase 6: Architecture
- [ ] Split server/routers.ts into domain modules (roundup, works, materials, analytics, export, settings, archive)
- [ ] Split server/db.ts into domain modules
- [ ] Extract CSV restructuring logic to shared/csvRestructure.ts
- [ ] Analytics query caching (staleTime: 300000 on Command Center queries)
- [ ] Lazy-load Recharts behind React.lazy()

### Phase 7: Intake Presets
- [ ] Database migration for intake_presets table
- [ ] Preset CRUD API (create, read, update, delete presets)
- [ ] PresetSelector.tsx component for intake form
- [ ] Auto-create first preset from usage data

## Prompt Swap + Archive Re-seed
- [ ] Modify seed script to DELETE archiveEntries and patternMatches before inserting
- [ ] Run seed script with new 114-entry enriched-archive-data.json
- [ ] Replace Phase DNA system prompt with PROMPT 1 from NEON_SIGNS_SYSTEM_PROMPTS.md
- [ ] Replace Neon's Mirror system prompt with PROMPT 2 from NEON_SIGNS_SYSTEM_PROMPTS.md

## Bug: Quick Notes Not Showing in Results Page
- [ ] Investigate why quick notes don't appear in Results page
- [ ] Fix quick notes display issue

## Feature: Contact Log
- [x] Add contacts table to drizzle schema (name, role, organization, city, howConnected, notes, userId, createdAt)
- [x] Push migration to database
- [x] Add db helpers for contacts (createContact, getContacts,- [x] Add tRPC procedures (contacts.create, contacts.getAll, contacts.delete))
- [x] Build ContactLog page with 6-field form
- [x] Add list view sorted by most recent
- [x] Add Contact Log to More menu navigation

## Feature: Contact Log Enhancements
- [ ] Add phone, instagram, email columns to contacts schema
- [ ] Push migration
- [ ] Update backend create/update procedures for new fields
- [ ] Update ContactLog form with 3 new optional fields
- [ ] Display new fields in contact cards
- [ ] Add inline edit functionality to contact cards
- [ ] Update CSV export to include new fields

## Fix: Quick Notes in Roundup
- [x] Ensure getWeekly returns createdAt timestamp for each note
- [x] Display notes with date+time stamps in RoundupForm
- [x] Delete quick_notes rows after successful roundup submission
- [x] Verify week boundary matches between notes and roundup
