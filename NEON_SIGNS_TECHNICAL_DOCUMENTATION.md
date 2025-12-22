# NEON SIGNS: Technical Documentation

**Application Name:** NEON SIGNS — The Mirror That Glows  
**Version:** 1.0 (acc15a25)  
**Last Updated:** December 22, 2025  
**Author:** Manus AI  

---

## Executive Summary

NEON SIGNS is a full-stack web application designed as a **weekly creative practice tracking system** for a 52-week accountability program called the "Crucible Year." The application combines structured self-reflection through an 11-field intake form, historical pattern analysis through a "Pattern Archaeology" engine, and AI-generated personalized readings called "Neon's Mirror." The system is built for a single user (the artist/practitioner) and integrates 7 years of historical journal data for pattern matching.

---

## 1. Application Purpose and Context

### 1.1 The Crucible Year Framework

The Crucible Year is a 52-week creative accountability structure that began on **December 21, 2025** (Week 0). The practitioner submits weekly roundups on a designated check-in day (default: Sunday, Bangkok time UTC+7), reflecting on their studio practice, emotional state, and creative output. The system tracks progress across the full year and rolls over to Year 2, Year 3, etc., creating an open-ended longitudinal record.

### 1.2 Core Value Proposition

NEON SIGNS serves three primary functions:

1. **Structured Reflection** — The 11-field intake form enforces consistent self-assessment across multiple dimensions of creative practice (studio hours, energy levels, somatic awareness, partnership dynamics, etc.).

2. **Pattern Recognition** — The Pattern Archaeology engine searches a database of 60 historical journal entries spanning 2018-2025, identifying phrase matches, emotional parallels, and phase-DNA resonance between current and past states.

3. **AI-Assisted Insight** — Neon's Mirror generates personalized readings using a large language model, quoting the user's own words back to them and asking sharp, poetic questions to deepen reflection.

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 + TypeScript | Single-page application with responsive UI |
| Styling | Tailwind CSS 4 | Dark mode neon aesthetic (cyan, magenta, electric blue) |
| State Management | TanStack Query + tRPC | Type-safe API calls with automatic caching |
| Backend | Express 4 + tRPC 11 | API server with type-safe procedures |
| Database | MySQL/TiDB | Persistent storage for roundups, archive, settings |
| ORM | Drizzle ORM | Type-safe database queries and migrations |
| Authentication | Manus OAuth | Single-user authentication with session cookies |
| AI Integration | LLM API (Manus Forge) | Generates Neon's Mirror readings |
| Hosting | Manus Platform | Managed deployment with custom domain support |

### 2.2 File Structure

```
neon-signs/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx          # Dashboard with stats and progress
│       │   ├── RoundupForm.tsx   # 11-field weekly intake form
│       │   ├── Results.tsx       # Cascading reveal of submission results
│       │   ├── History.tsx       # Week-by-week table with charts
│       │   ├── Settings.tsx      # Admin configuration page
│       │   └── EditRoundup.tsx   # Edit past submissions
│       ├── components/           # Reusable UI components
│       ├── lib/trpc.ts          # tRPC client configuration
│       └── index.css            # Neon aesthetic theme variables
├── server/
│   ├── routers.ts               # All tRPC API procedures
│   ├── db.ts                    # Database query helpers
│   └── roundup.test.ts          # Unit tests (13 passing)
├── drizzle/
│   └── schema.ts                # Database table definitions
└── scripts/
    ├── seed-archive.mjs         # Initial archive seeding
    ├── seed-enriched-archive.mjs # Enriched historical data
    └── import-week0-baseline.mjs # Week 0 baseline import
```

---

## 3. Database Schema

### 3.1 Tables Overview

The application uses three primary tables plus a user settings table:

| Table | Purpose | Record Count |
|-------|---------|--------------|
| `weekly_roundups` | Stores all submitted weekly intake forms | 1 (Week 0 baseline) |
| `archive_entries` | Historical journal entries for pattern matching | 60 entries (2018-2025) |
| `pattern_matches` | Links roundups to matched archive entries | Generated on submission |
| `user_settings` | Crucible Year configuration per user | 1 per user |

### 3.2 Weekly Roundups Schema

```typescript
{
  id: number (auto-increment primary key),
  userId: number (foreign key to users),
  weekNumber: number (0-52),
  year: number (calendar year),
  createdDayOfWeek: string,
  
  // 11 Form Fields
  weatherReport: text,           // Emotional/atmospheric summary
  studioHours: number,           // Hours spent in studio
  worksMade: text,               // Description of work produced
  jesterActivity: number (0-10), // Jester archetype activity level
  energyLevel: enum('hot', 'sustainable', 'depleted'),
  walkingEngineUsed: boolean,
  walkingInsights: text | null,
  partnershipTemperature: text,
  thingWorked: text,
  thingResisted: text,
  somaticState: text,
  doorIntention: text | null,
  
  // Metadata
  phaseDnaAssigned: string | null,  // Auto-detected phase
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3.3 Archive Entries Schema

```typescript
{
  id: number,
  weekIndex: number,              // Original week in historical timeline
  entryDate: date,                // When the journal entry was written
  phaseDna: string,               // Phase classification (PH1-NE)
  emotionalState: enum('hot', 'sustainable', 'depleted'),
  jesterActivityLevel: number,
  somaticState: text,
  emotionalResonance: text,       // Key quote from the entry
  patternTag: text,               // Core insight/theme
  phraseTags: JSON array,         // Extracted phrases for matching
  createdAt: timestamp
}
```

### 3.4 Phase-DNA Classifications

The archive entries are classified into 9 distinct phases representing different periods in the practitioner's 7-year creative journey:

| Phase Code | Phase Name | Description | Entry Count |
|------------|------------|-------------|-------------|
| PH1 | Foundation | Early practice establishment | 4 |
| PH2 | Building | Skill development period | 4 |
| PH2A | Transition | Shift between phases | 3 |
| PH3 | Rupture | Crisis/breakthrough period | 8 |
| PH4 | Explorer | Experimentation phase | 12 |
| PH4A | Walking Engine | Movement-based practice | 6 |
| A1-A5 | Archive Phases | Specific archive periods | 10 |
| NE | New Emergence | Current creative emergence | 13 |

---

## 4. Core Features

### 4.1 Weekly Intake Form

The intake form captures 11 dimensions of creative practice:

1. **Weather Report** — Free-text emotional/atmospheric summary (2-3 sentences minimum)
2. **Studio Hours** — Numeric input (0-168 hours)
3. **Works Made** — Description of creative output
4. **Jester Activity** — Slider 0-10 measuring the "Jester" archetype's presence
5. **Energy Level** — Dropdown: Hot 🔥 / Sustainable ⚡ / Depleted 🌙
6. **Walking Engine** — Checkbox + expandable text for movement practice insights
7. **Partnership Temperature** — Collaboration/solitude dynamics
8. **Thing That Worked** — What succeeded this week
9. **Thing That Resisted** — What struggled or failed
10. **Somatic State** — Body awareness and physical sensations
11. **Door Intention** — Optional "whisper" for the coming week

**Form Behaviors:**
- Real-time field validation with error messages
- localStorage draft saving (persists between sessions)
- Check-in day restriction (grayed out with tooltip on non-check-in days)
- Rate limiting (maximum 1 submission per week)

### 4.2 Pattern Archaeology Engine

When a roundup is submitted, the Pattern Archaeology engine analyzes it against the 60 historical archive entries using three matching strategies:

**4.2.1 Phrase Matching (Red)**
Extracts key phrases from the weather report and text fields, then searches archive entries for exact or near matches. Phrases are tokenized and compared against the `phraseTags` JSON array in each archive entry.

**4.2.2 Emotional State Parallels (Orange)**
Matches current energy level (hot/sustainable/depleted) against historical entries with the same emotional classification. Returns entries from similar emotional states across different time periods.

**4.2.3 Phase-DNA Resonance (Blue)**
Identifies archive entries from the same or adjacent phases. If the current roundup is classified as "NE" (New Emergence), it will surface entries from PH4A, A5, and other late-phase entries.

**Output:** Top 5 matches displayed on a color-coded timeline with relevance scores (0-100).

### 4.3 Neon's Mirror (AI Integration)

Neon's Mirror generates a personalized reading using the following prompt structure:

```
You are Neon, a precise-poetic mirror for creative practice reflection.

Given this week's roundup:
- Weather Report: [user's weather report]
- Energy Level: [hot/sustainable/depleted]
- Jester Activity: [0-10]
- Pattern Matches: [top 3 archive matches with dates and quotes]

Generate a reading that:
1. Quotes the weather report directly (use quotation marks)
2. Names the archive mirrors found (reference specific dates/phases)
3. States the phase-pressure (what the patterns suggest)
4. Asks ONE sharp closing question (not generic, specific to this week)

Tone: Precise-poetic. Not therapeutic, not cheerful. Like a trusted friend 
who has read all your journals and speaks in concentrated language.
```

**Display:** The reading appears after a 6-second cascading delay, rendered in an elegant serif font with neon magenta accent.

### 4.4 Dashboard

The home dashboard displays:

| Metric | Description |
|--------|-------------|
| Week Progress | "Week X of 52" with progress bar |
| Days Until Check-in | Countdown to next check-in day |
| Studio Hours | Total accumulated across all roundups |
| Avg Jester | Average jester activity (0-10) |
| Energy Trend | Last week's energy level with emoji |
| Archive Count | Number of searchable historical entries |
| Jester Trend Chart | Sparkline of recent jester activity |
| Last Roundup | Date, week number, and key stats |

### 4.5 History & Trends Page

**Week-by-Week Table:**
- Sortable columns: Week, Date, Weather (truncated), Hours, Jester, Energy, Phase-DNA
- View button → Results page
- Edit button → Edit form with pre-populated fields

**Charts (Recharts library):**
- Jester Activity Trend (line chart)
- Energy Level Distribution (bar chart)
- Studio Hours by Week (bar chart)
- 52-Week Timeline with "You Are Here" marker

**Export:** CSV download of all roundup data.

### 4.6 Admin Settings

Accessible via gear icon in header:

| Setting | Options | Default |
|---------|---------|---------|
| Crucible Year Start Date | Date picker | December 21, 2025 |
| Check-in Day | Sunday-Saturday dropdown | Sunday |
| Timezone | 8 major timezones | Asia/Bangkok |
| Current Cycle | Number input | 1 |
| Start New Cycle | Button with confirmation | Archives current data, resets to Week 0 |

---

## 5. API Endpoints

All endpoints use tRPC with type-safe procedures:

### 5.1 Roundup Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `roundup.canSubmit` | Query | Returns check-in day status, current week, submission eligibility |
| `roundup.submit` | Mutation | Creates new roundup with validation |
| `roundup.getById` | Query | Fetches single roundup by ID |
| `roundup.getAll` | Query | Paginated list of all roundups |
| `roundup.update` | Mutation | Updates existing roundup |

### 5.2 Pattern Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `patterns.analyze` | Query | Runs pattern archaeology on a roundup |

### 5.3 Neon's Mirror Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `neon.generateReading` | Query | Generates AI reading for a roundup |

### 5.4 Stats Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `stats.dashboard` | Query | Returns all dashboard metrics |
| `stats.trends` | Query | Returns chart data for history page |

### 5.5 Settings Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `settings.get` | Query | Returns user's Crucible Year settings |
| `settings.update` | Mutation | Updates settings |
| `settings.newCycle` | Mutation | Starts a new Crucible Year cycle |

### 5.6 Export Routes

| Procedure | Type | Description |
|-----------|------|-------------|
| `export.csv` | Query | Returns CSV string of all roundups |

---

## 6. Current Status

### 6.1 Data State

| Data Type | Count | Status |
|-----------|-------|--------|
| Weekly Roundups | 1 | Week 0 baseline imported |
| Archive Entries | 60 | Seeded from 7-year historical data |
| Pattern Matches | 0 | Generated on submission |
| User Settings | 0 | Created on first settings save |

### 6.2 Week 0 Baseline Data

The Week 0 baseline roundup was imported from the practitioner's December 21, 2025 check-in:

- **Location:** Hanoi, Vietnam
- **Energy Level:** Hot 🔥
- **Jester Activity:** 2/10 (examined as subject, not deployed defensively)
- **Walking Engine:** Active (15,916 avg daily steps)
- **Studio Hours:** 0 (baseline week)
- **Phase-DNA:** NE (New Emergence)

### 6.3 Test Coverage

13 unit tests passing:

- `roundup.canSubmit` — 2 tests
- `roundup.getAll` — 2 tests
- `stats.dashboard` — 3 tests
- `stats.trends` — 1 test
- `archive.stats` — 2 tests
- `export.csv` — 2 tests
- `auth.logout` — 1 test

---

## 7. User Interface

### 7.1 Design System

The application uses a dark mode neon aesthetic:

| Element | Color | CSS Variable |
|---------|-------|--------------|
| Background | Near-black (#0a0a0f) | `--background` |
| Primary Accent | Cyan (#00f0ff) | `--neon-cyan` |
| Secondary Accent | Magenta (#ff00ff) | `--neon-magenta` |
| Tertiary Accent | Electric Blue (#0066ff) | `--neon-blue` |
| Text | Light gray (#e5e5e5) | `--foreground` |
| Muted Text | Gray (#737373) | `--muted-foreground` |

### 7.2 Typography

- **Headings:** System sans-serif (Inter)
- **Body:** System sans-serif
- **Neon's Mirror:** Serif font (for poetic readings)

### 7.3 Responsive Design

Mobile-first approach with breakpoints:
- Mobile: < 640px (thumb-friendly navigation)
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 8. Authentication & Security

### 8.1 Authentication Flow

1. User clicks "Sign In" → Redirected to Manus OAuth portal
2. OAuth callback creates/updates user record in database
3. Session cookie set with JWT token
4. All protected routes check `ctx.user` from session

### 8.2 Authorization

- Single-user application (owner only)
- All roundup/settings routes use `protectedProcedure`
- Users can only access their own data (`userId` check on all queries)

### 8.3 Data Protection

- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's automatic escaping
- CSRF protection via SameSite cookies

---

## 9. Future Enhancement Opportunities

### 9.1 Immediate Priorities

1. **Archive Browser** — Dedicated page to explore and search the 60 historical entries
2. **Sunday Reminders** — Email/push notifications when check-in window opens
3. **Walking Data Import** — Integration with fitness APIs (Google Fit, Apple Health)

### 9.2 Medium-Term Features

1. **Pattern Pinning** — Save specific archive matches to track across weeks
2. **Milestone Markers** — Visual celebrations at Week 13, 26, 39, 52
3. **Export to PDF** — Generate formatted reports of Crucible Year progress

### 9.3 Long-Term Vision

1. **Multi-User Support** — Allow other practitioners to use the system
2. **Collaborative Patterns** — Anonymous pattern sharing between users
3. **Voice Input** — Transcribe spoken roundups for accessibility

---

## 10. Deployment Information

### 10.1 Current Deployment

| Property | Value |
|----------|-------|
| Platform | Manus Hosting |
| URL | https://3000-istg8yyw8jlrczud1hjpz-beaf6ec2.sg1.manus.computer |
| Version | acc15a25 |
| Status | Running |

### 10.2 Environment Variables

The application uses the following environment variables (automatically injected by Manus platform):

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — Session cookie signing
- `BUILT_IN_FORGE_API_URL` — LLM API endpoint
- `BUILT_IN_FORGE_API_KEY` — LLM API authentication
- `VITE_APP_ID` — OAuth application ID
- `OAUTH_SERVER_URL` — OAuth backend URL

---

## Appendix A: Archive Phase Timeline

```
2018 ─────────────────────────────────────────────────────────────────
     │ PH1: Foundation (4 entries)
     │ PH2: Building (4 entries)
2019 ─────────────────────────────────────────────────────────────────
     │ PH2A: Transition (3 entries)
     │ PH3: Rupture (8 entries)
2020 ─────────────────────────────────────────────────────────────────
     │ PH4: Explorer (12 entries)
2021-2023 ────────────────────────────────────────────────────────────
     │ PH4A: Walking Engine (6 entries)
     │ A1-A5: Archive Phases (10 entries)
2024-2025 ────────────────────────────────────────────────────────────
     │ NE: New Emergence (13 entries)
     │
     ▼ Week 0: December 21, 2025 (Crucible Year begins)
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Crucible Year** | 52-week creative accountability program |
| **Jester** | Archetype representing playful/defensive creative energy |
| **Phase-DNA** | Classification system for creative practice phases |
| **Pattern Archaeology** | Engine that searches historical entries for resonance |
| **Neon's Mirror** | AI-generated personalized reading |
| **Walking Engine** | Movement-based creative practice component |
| **Weather Report** | Emotional/atmospheric summary of the week |
| **Door Intention** | Optional intention "whispered" for the coming week |

---

*Document generated by Manus AI for NEON SIGNS v1.0*
