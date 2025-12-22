# NEON SIGNS — Current State Documentation
## For AI Assistant Context (Perplexity Pro / Claude / GPT)
### Last Updated: December 22, 2025

---

## Executive Summary

**NEON SIGNS** is a full-stack web application designed as a weekly creative practice tracking and accountability tool for an artist's "Crucible Year" — a 52-week intensive period of studio practice, self-observation, and pattern recognition. The application combines structured weekly check-ins with AI-powered reflection and historical pattern matching against 7 years of archived journal entries.

**Live URL**: Hosted on Manus platform  
**Tech Stack**: React 19 + TypeScript + Tailwind CSS 4 + tRPC + Express + MySQL (Drizzle ORM)  
**Current Version**: 22ec3cb5  
**Owner**: Peter Yuill

---

## Core Concept: The Crucible Year

The Crucible Year is a 52-week accountability framework starting from **December 21, 2025 (Week 0)**. The system:
- Tracks weekly creative practice through structured roundup submissions
- Searches historical archive entries for pattern matches
- Generates AI-powered reflective readings ("Neon's Mirror")
- Visualizes trends and progress over time
- Supports open-ended continuation (Year 2, Year 3, etc.)

---

## Current Features (Implemented)

### 1. Weekly Roundup Form (11 Fields + Step Tracking)

| Field | Type | Description |
|-------|------|-------------|
| Weather Report | Text (min 10 chars) | Metaphorical/emotional state description |
| Studio Hours | Number (0-168) | Hours spent in creative practice |
| Works Made | Text | Description of creative output |
| Jester Activity | Slider (0-10) | 0 = fully present, 10 = fully performing (defense mechanism tracking) |
| Energy Level | Dropdown | Hot 🔥 / Sustainable ⚡ / Depleted 🌙 |
| Walking Engine | Checkbox + Text | Physical movement practice with insights |
| Partnership Temperature | Text | Relationship/collaboration state |
| Thing That Worked | Text | Weekly win or success |
| Thing That Resisted | Text | Weekly challenge or friction |
| Somatic State | Text | Body awareness and physical sensations |
| Door Intention | Text (optional) | Intention whisper for the coming week |

**NEW: 7-Day Step Tracking**
- Individual step count input for Mon-Sun
- Auto-calculates weekly total and daily average
- Auto-suggests Walking Engine status (≥8,000 avg = suggested ON)
- Stored as JSON in database with computed totals

### 2. Submission Rules

- **Check-in Day**: Configurable (default: Sunday)
- **Timezone**: Configurable (default: Asia/Bangkok UTC+7)
- **Rate Limiting**: Maximum 1 submission per check-in day per week
- **Draft Saving**: localStorage persistence before submission
- **Validation**: Real-time field-level validation

### 3. Pattern Archaeology Engine

Searches the historical archive (60 entries spanning 2018-2025) for:

| Match Type | Method | Weight |
|------------|--------|--------|
| Phrase Matches | Keyword extraction from weather report | High |
| Emotional Parallels | Energy level + somatic state similarity | Medium |
| Phase-DNA Resonance | Same phase classification | High |

**Output**: Top 5 matched archive entries with relevance scores (0-100), displayed on color-coded timeline.

### 4. Neon's Mirror (AI-Generated Reading)

LLM-powered personalized reflection that:
- Quotes the user's weather report directly
- Names the archive patterns found
- States the "phase-pressure" (current creative tension)
- Asks one sharp closing question
- Uses precise-poetic tone (not therapeutic, not cheerleading)

**Prompt Structure**: System prompt establishes Neon as "a mirror that glows" — reflecting patterns without judgment.

### 5. Dashboard (Home Page)

| Component | Data Displayed |
|-----------|----------------|
| Crucible Year Progress | Week X of 52, progress bar, year indicator |
| Countdown | Days until next check-in (dynamic based on settings) |
| Studio Hours | Total accumulated hours |
| Avg Jester | Average jester activity score |
| Energy Trend | Most recent energy level with emoji |
| Archive Count | Total searchable archive entries |
| Jester Activity Trend | Line chart of jester scores over time |
| Last Roundup | Week number, date, jester score, energy level |

### 6. History & Trends Page

**Card Browser**:
- Swipeable horizontal card carousel
- Each card shows: Week number, date, weather excerpt, studio hours, jester score, energy badge, phase-DNA
- Filter by energy level (Hot/Sustainable/Depleted)
- Filter by phase-DNA
- Edit button on each card
- "View Full" navigates to Results page

**Charts**:
- Jester Activity Trend (line chart)
- Studio Hours (bar chart)
- Energy Level distribution

**52-Week Timeline**:
- Visual grid showing submitted vs. empty weeks
- "You are here" marker for current week

**Export Options**:
- CSV download (all fields + step data)
- PDF Report (opens print-ready HTML with cover page, stats, week-by-week entries)

### 7. Results Page (Post-Submission)

Cascading reveal animation:
1. **Immediate**: Intake confirmation echoing weather report
2. **3-second delay**: Pattern archaeology results with matched archive entries
3. **6-second delay**: Neon's Mirror AI-generated reading

### 8. Settings Page (Admin)

| Setting | Options |
|---------|---------|
| Crucible Start Date | Date picker |
| Check-in Day | Sunday-Saturday dropdown |
| Timezone | 8 major timezones |
| Start New Cycle | Archives current cycle, resets to Year N+1 |

### 9. Edit Roundup

- Full form with all fields pre-populated
- Updates existing entry with "last edited" timestamp
- Accessible from History page edit buttons

---

## Database Schema

### Table: `weekly_roundups`
```
id                    INT AUTO_INCREMENT PRIMARY KEY
userId                INT NOT NULL (FK to users)
weekNumber            INT NOT NULL
year                  INT NOT NULL
createdAt             TIMESTAMP
updatedAt             TIMESTAMP
createdDayOfWeek      VARCHAR(20)
weatherReport         TEXT
studioHours           INT
worksMade             TEXT
jesterActivity        INT (0-10)
energyLevel           ENUM('hot', 'sustainable', 'depleted')
walkingEngineUsed     BOOLEAN
walkingInsights       TEXT
partnershipTemperature TEXT
thingWorked           TEXT
thingResisted         TEXT
somaticState          TEXT
doorIntention         TEXT
phaseDnaAssigned      VARCHAR(20)
dailySteps            JSON ({mon, tue, wed, thu, fri, sat, sun})
weeklyStepTotal       INT
dailyStepAverage      INT
```

### Table: `archive_entries`
```
id                    INT AUTO_INCREMENT PRIMARY KEY
sourcePhase           VARCHAR(50) (e.g., "PH1", "A3", "NE")
sourceDate            DATE
content               TEXT
phraseTags            JSON (array of keywords)
emotionalStateTag     VARCHAR(50)
phaseDnaTag           VARCHAR(20)
createdAt             TIMESTAMP
```

### Table: `pattern_matches`
```
id                    INT AUTO_INCREMENT PRIMARY KEY
roundupId             INT (FK to weekly_roundups)
archiveEntryId        INT (FK to archive_entries)
matchType             VARCHAR(50)
relevanceScore        INT (0-100)
matchedPhrases        JSON
createdAt             TIMESTAMP
```

### Table: `user_settings`
```
id                    INT AUTO_INCREMENT PRIMARY KEY
userId                INT (FK to users)
crucibleStartDate     DATE
checkInDay            VARCHAR(20)
timezone              VARCHAR(50)
currentCycle          INT (default 1)
createdAt             TIMESTAMP
updatedAt             TIMESTAMP
```

---

## Current Data State

| Entity | Count | Notes |
|--------|-------|-------|
| Weekly Roundups | 1 | Week 0 baseline (Dec 21, 2025) |
| Archive Entries | 60 | Spanning 2018-2025, all 9 phases |
| Pattern Matches | 0 | Generated on roundup submission |
| User Settings | 1 | Default configuration |

### Archive Phase Distribution
- PH1 (Foundation): 4 entries
- PH2 (Building): 4 entries
- PH2A (Transition): 3 entries
- PH3 (Rupture): 8 entries
- PH4 (Explorer): 12 entries
- PH4A (Walking Engine): 6 entries
- A1-A5 (Phases): ~10 entries
- NE (New Emergence): 13 entries

---

## UI/UX Design System

### Color Palette (Cyberpunk Sacred Aesthetic)
```css
--void-black: #000000        /* True black background */
--deep-space: #0a0a1a        /* Card backgrounds */
--neon-cyan: #00f0ff         /* Primary accent, titles, progress */
--neon-magenta: #ff1493      /* Secondary accent, countdown, links */
--neon-amber: #ff6b35        /* Tertiary accent, warnings, phase badges */
--neon-purple: #a855f7       /* Depleted state, subtle accents */
```

### Typography
- **Primary**: Inter (sans-serif) for UI
- **Accent**: Crimson Pro (serif, italic) for Neon's Mirror readings

### Effects
- Neon glow on interactive elements (box-shadow with color spread)
- Gradient progress bars (cyan to magenta)
- Subtle border glow on cards
- Animated reveals with delays

### Mobile-First
- Touch-friendly targets (44px minimum)
- Swipeable card carousel
- Responsive grid layouts
- Thumb-zone optimized navigation

---

## API Endpoints (tRPC)

### Roundup
- `roundup.canSubmit` — Check if submission allowed (day/rate limit)
- `roundup.submit` — Create new roundup with validation
- `roundup.getById` — Fetch single roundup
- `roundup.getAll` — Paginated list of roundups
- `roundup.update` — Edit existing roundup

### Patterns
- `patterns.analyze` — Run pattern archaeology on roundup
- `patterns.getForWeek` — Get matches for specific week

### Neon's Mirror
- `neon.generateReading` — Generate AI reading for roundup

### Stats
- `stats.dashboard` — All dashboard metrics
- `stats.trends` — Chart data (jester, studio hours, energy)

### Export
- `export.csv` — Generate CSV with all data + steps
- `export.pdfData` — Generate data for PDF report

### Settings
- `settings.get` — Get user settings
- `settings.update` — Update settings
- `settings.newCycle` — Start new Crucible Year cycle

### Archive
- `archive.stats` — Archive entry counts by phase
- `archive.seed` — Bulk import archive entries

---

## Authentication

- **Provider**: Manus OAuth
- **Session**: JWT cookie-based
- **Protection**: All data endpoints require authentication
- **Owner**: Single-user application (Peter Yuill)

---

## Key Domain Terms Glossary

| Term | Definition |
|------|------------|
| Crucible Year | 52-week intensive creative practice period |
| Jester | Defense mechanism of performing rather than being present (0=present, 10=performing) |
| Walking Engine | Physical movement practice as creative fuel |
| Phase-DNA | Classification system for creative phases (PH1-4, A1-5, NE) |
| Weather Report | Metaphorical description of emotional/creative state |
| Neon's Mirror | AI-generated reflective reading |
| Pattern Archaeology | System for finding historical parallels |
| Door Intention | Whispered intention for the coming week |

---

## Technical Dependencies

### Frontend
- React 19, TypeScript, Tailwind CSS 4
- tRPC client, TanStack Query
- Recharts (charts), Framer Motion (animations)
- Radix UI primitives (shadcn/ui components)
- Wouter (routing), Sonner (toasts)

### Backend
- Express 4, tRPC 11
- Drizzle ORM, MySQL
- Manus LLM API (built-in)
- Zod (validation)

---

## What's NOT Yet Implemented

1. **Push notifications** for check-in reminders
2. **Archive browser page** to explore historical entries
3. **Step goal tracking** with visual progress
4. **Neon avatar/logo** integration
5. **Offline PWA support**
6. **Data backup/restore** functionality
7. **Multiple user support** (currently single-user)
8. **Email digests** of weekly summaries

---

## File Structure

```
/home/ubuntu/neon-signs/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx (Dashboard)
│   │   │   ├── RoundupForm.tsx (Weekly intake)
│   │   │   ├── Results.tsx (Post-submission)
│   │   │   ├── History.tsx (Trends & export)
│   │   │   ├── Settings.tsx (Admin config)
│   │   │   └── EditRoundup.tsx (Edit past entries)
│   │   ├── components/ui/ (shadcn components)
│   │   ├── index.css (Cyberpunk theme)
│   │   └── App.tsx (Routes)
├── server/
│   ├── routers.ts (All tRPC endpoints)
│   ├── db.ts (Database queries)
│   └── _core/ (Auth, LLM, system)
├── drizzle/
│   └── schema.ts (Database schema)
├── scripts/
│   ├── seed-archive.mjs
│   ├── seed-enriched-archive.mjs
│   └── import-week0-baseline.mjs
└── todo.md (Feature tracking)
```

---

## Suggested Areas for Enhancement

Based on the current implementation, potential additions could include:

1. **Deeper pattern analysis** — ML-based clustering of similar weeks
2. **Goal setting** — Weekly/monthly targets with progress tracking
3. **Collaboration features** — Share readings or invite accountability partners
4. **Voice input** — Speech-to-text for weather reports
5. **Calendar integration** — Sync check-in reminders to Google/Apple Calendar
6. **Mood tracking** — Additional emotional granularity beyond energy levels
7. **Photo/media attachments** — Visual documentation of works made
8. **Streak tracking** — Consecutive week submission rewards
9. **Custom archive tagging** — User-defined tags for pattern matching
10. **API webhooks** — Integrate with other tools (Notion, Obsidian, etc.)

---

*This document provides complete context for AI assistants to understand, analyze, and suggest improvements for the NEON SIGNS application.*
