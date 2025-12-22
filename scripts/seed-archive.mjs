/**
 * Seed script to load archive entries into the database
 * Run with: node scripts/seed-archive.mjs
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const archiveData = {
  "archive_entries": [
    {
      "id": "ARCH_001",
      "source_phase": "PH1",
      "source_date": "2018-03-15",
      "source_type": "journal",
      "content": "The grid is constraint. The circle is infinity. I am locked between them.",
      "phrase_tags": ["constraint", "infinity", "locked", "grid", "circle"],
      "emotional_state": "contained, seeking",
      "phase_dna": "PH1_early_geometric",
      "keywords": ["geometry", "control", "abstraction"]
    },
    {
      "id": "ARCH_002",
      "source_phase": "PH2",
      "source_date": "2019-06-20",
      "source_type": "artist_statement",
      "content": "Alignment means the work survives the market without becoming the market.",
      "phrase_tags": ["alignment", "market", "survive", "authenticity"],
      "emotional_state": "clarified, ethical",
      "phase_dna": "PH2_midpoint_clarity",
      "keywords": ["spirituality", "integrity", "institutional"]
    },
    {
      "id": "ARCH_003",
      "source_phase": "PH2A",
      "source_date": "2019-11-08",
      "source_type": "journal",
      "content": "One shot. No revisions. The permanence is the point. I cannot undo this.",
      "phrase_tags": ["one shot", "permanent", "no revision", "undo", "irreversible"],
      "emotional_state": "committed, apprehensive",
      "phase_dna": "PH2A_one_shot_ethics",
      "keywords": ["risk", "commitment", "finality"]
    },
    {
      "id": "ARCH_004",
      "source_phase": "PH3",
      "source_date": "2020-05-12",
      "source_type": "journal",
      "content": "I can't focus. The gold keeps calling. The worldly keeps intruding.",
      "phrase_tags": ["can't focus", "gold", "worldly", "calling", "intrude"],
      "emotional_state": "fragmented, torn",
      "phase_dna": "PH3_split_early",
      "keywords": ["rupture", "sacred-worldly", "distraction"]
    },
    {
      "id": "ARCH_005",
      "source_phase": "PH3",
      "source_date": "2020-09-03",
      "source_type": "journal",
      "content": "The institution doesn't want what I make. The market doesn't understand. I'm alone with the ink.",
      "phrase_tags": ["institution rejected", "market confusion", "alone", "ink"],
      "emotional_state": "isolated, clarified",
      "phase_dna": "PH3_full_rupture",
      "keywords": ["severance", "solitude", "purity"]
    },
    {
      "id": "ARCH_006",
      "source_phase": "PH4",
      "source_date": "2021-02-14",
      "source_type": "journal",
      "content": "Moving to Hanoi. The practice follows but the ground keeps shifting. I'm learning to walk while painting.",
      "phrase_tags": ["moving", "shifting ground", "learning to walk", "geographic"],
      "emotional_state": "nomadic, adaptive",
      "phase_dna": "PH4_explorer_beginning",
      "keywords": ["movement", "vulnerability", "nomadism"]
    },
    {
      "id": "ARCH_007",
      "source_phase": "PH4",
      "source_date": "2021-06-18",
      "source_type": "journal",
      "content": "Loneliness is not the goal. It's the byproduct of going deep. The cost of honesty.",
      "phrase_tags": ["loneliness", "byproduct", "honesty", "cost", "deep"],
      "emotional_state": "vulnerable, philosophical",
      "phase_dna": "PH4_vulnerability_peak",
      "keywords": ["emotional", "solitude", "authenticity"]
    },
    {
      "id": "ARCH_008",
      "source_phase": "PH4",
      "source_date": "2022-03-09",
      "source_type": "journal",
      "content": "The tower walls are up. The Jester performs. I can't let anyone in right now.",
      "phrase_tags": ["tower walls", "Jester performs", "defended", "letting in"],
      "emotional_state": "defended, protective",
      "phase_dna": "PH4_walls_up",
      "keywords": ["defense mechanism", "performance", "isolation"]
    },
    {
      "id": "ARCH_009",
      "source_phase": "PH4A",
      "source_date": "2023-08-22",
      "source_type": "journal",
      "content": "I move because I must. The legs know. The mind catches up later, or never. Either way, I walk.",
      "phrase_tags": ["move must", "legs know", "walking", "necessity"],
      "emotional_state": "embodied, intuitive",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["somatic", "movement", "instinct"]
    },
    {
      "id": "ARCH_010",
      "source_phase": "NE",
      "source_date": "2024-06-10",
      "source_type": "journal",
      "content": "Geometry was the prayer. Physics is the answer. Gravity pulls down what the mind builds up.",
      "phrase_tags": ["geometry prayer", "physics answer", "gravity", "pull down"],
      "emotional_state": "realized, humble",
      "phase_dna": "NE_threshold_crossing",
      "keywords": ["shift", "somatic", "surrender"]
    },
    {
      "id": "ARCH_011",
      "source_phase": "NE",
      "source_date": "2025-01-14",
      "source_type": "journal",
      "content": "The body cannot lie. The ink knows the truth before the mind does.",
      "phrase_tags": ["body cannot lie", "ink knows", "truth", "somatic"],
      "emotional_state": "authentic, grounded",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["embodiment", "authenticity", "material"]
    },
    // Additional entries to expand the archive to ~50 entries for meaningful pattern matching
    {
      "id": "ARCH_012",
      "source_phase": "PH1",
      "source_date": "2018-05-22",
      "source_type": "journal",
      "content": "The line must be precise. Every deviation is a failure. I am learning to control the hand.",
      "phrase_tags": ["precise", "deviation", "failure", "control", "hand"],
      "emotional_state": "disciplined, frustrated",
      "phase_dna": "PH1_early_geometric",
      "keywords": ["precision", "discipline", "craft"]
    },
    {
      "id": "ARCH_013",
      "source_phase": "PH1",
      "source_date": "2018-08-14",
      "source_type": "journal",
      "content": "Found the rhythm today. The brush moves before I think. This is what I've been seeking.",
      "phrase_tags": ["rhythm", "brush moves", "seeking", "flow"],
      "emotional_state": "breakthrough, flowing",
      "phase_dna": "PH1_early_geometric",
      "keywords": ["flow state", "intuition", "discovery"]
    },
    {
      "id": "ARCH_014",
      "source_phase": "PH2",
      "source_date": "2019-02-10",
      "source_type": "journal",
      "content": "The gallery wants something different. They don't see what I see. The pressure to conform is real.",
      "phrase_tags": ["gallery", "different", "conform", "pressure", "see"],
      "emotional_state": "conflicted, resistant",
      "phase_dna": "PH2_midpoint_clarity",
      "keywords": ["institutional", "resistance", "vision"]
    },
    {
      "id": "ARCH_015",
      "source_phase": "PH2",
      "source_date": "2019-04-18",
      "source_type": "journal",
      "content": "Sold a piece today but felt nothing. The money doesn't fill the void. What am I making this for?",
      "phrase_tags": ["sold", "nothing", "money", "void", "purpose"],
      "emotional_state": "empty, questioning",
      "phase_dna": "PH2_midpoint_clarity",
      "keywords": ["meaning", "commerce", "purpose"]
    },
    {
      "id": "ARCH_016",
      "source_phase": "PH2A",
      "source_date": "2019-09-25",
      "source_type": "journal",
      "content": "The gold leaf trembles. One breath and it's ruined. I hold still. I make the mark.",
      "phrase_tags": ["gold leaf", "trembles", "breath", "ruined", "mark"],
      "emotional_state": "focused, tense",
      "phase_dna": "PH2A_one_shot_ethics",
      "keywords": ["material", "risk", "presence"]
    },
    {
      "id": "ARCH_017",
      "source_phase": "PH2A",
      "source_date": "2019-12-03",
      "source_type": "journal",
      "content": "Destroyed the piece. Started over. The destruction was necessary. Sometimes you have to burn it down.",
      "phrase_tags": ["destroyed", "started over", "necessary", "burn down"],
      "emotional_state": "liberated, decisive",
      "phase_dna": "PH2A_one_shot_ethics",
      "keywords": ["destruction", "renewal", "courage"]
    },
    {
      "id": "ARCH_018",
      "source_phase": "PH3",
      "source_date": "2020-02-28",
      "source_type": "journal",
      "content": "The sacred and the worldly cannot coexist in the same frame. I must choose.",
      "phrase_tags": ["sacred", "worldly", "coexist", "choose", "frame"],
      "emotional_state": "torn, decisive",
      "phase_dna": "PH3_split_early",
      "keywords": ["duality", "choice", "spiritual"]
    },
    {
      "id": "ARCH_019",
      "source_phase": "PH3",
      "source_date": "2020-06-15",
      "source_type": "journal",
      "content": "Walking for hours. The studio feels like a prison. I need air. I need movement.",
      "phrase_tags": ["walking", "hours", "prison", "air", "movement"],
      "emotional_state": "restless, seeking",
      "phase_dna": "PH3_split_early",
      "keywords": ["escape", "movement", "claustrophobia"]
    },
    {
      "id": "ARCH_020",
      "source_phase": "PH3",
      "source_date": "2020-08-20",
      "source_type": "journal",
      "content": "The rejection letter came. Expected but still hurts. They don't understand the work.",
      "phrase_tags": ["rejection", "hurts", "understand", "work"],
      "emotional_state": "hurt, defiant",
      "phase_dna": "PH3_full_rupture",
      "keywords": ["rejection", "misunderstanding", "resilience"]
    },
    {
      "id": "ARCH_021",
      "source_phase": "PH3",
      "source_date": "2020-10-12",
      "source_type": "journal",
      "content": "Clarity comes from isolation. The noise is gone. Just me and the ink. This is enough.",
      "phrase_tags": ["clarity", "isolation", "noise", "ink", "enough"],
      "emotional_state": "peaceful, resolved",
      "phase_dna": "PH3_full_rupture",
      "keywords": ["solitude", "clarity", "acceptance"]
    },
    {
      "id": "ARCH_022",
      "source_phase": "PH4",
      "source_date": "2021-01-08",
      "source_type": "journal",
      "content": "Packing the studio. Everything fits in two bags. The practice is portable now.",
      "phrase_tags": ["packing", "two bags", "portable", "practice"],
      "emotional_state": "liberated, uncertain",
      "phase_dna": "PH4_explorer_beginning",
      "keywords": ["minimalism", "mobility", "transition"]
    },
    {
      "id": "ARCH_023",
      "source_phase": "PH4",
      "source_date": "2021-04-22",
      "source_type": "journal",
      "content": "New city, new light. The work changes with the geography. I am learning to adapt.",
      "phrase_tags": ["new city", "light", "geography", "adapt"],
      "emotional_state": "curious, adaptive",
      "phase_dna": "PH4_explorer_beginning",
      "keywords": ["adaptation", "environment", "discovery"]
    },
    {
      "id": "ARCH_024",
      "source_phase": "PH4",
      "source_date": "2021-08-30",
      "source_type": "journal",
      "content": "Missing home but home is nowhere now. The work is home. The practice is home.",
      "phrase_tags": ["missing home", "nowhere", "work is home", "practice"],
      "emotional_state": "melancholic, grounded",
      "phase_dna": "PH4_vulnerability_peak",
      "keywords": ["homelessness", "belonging", "practice"]
    },
    {
      "id": "ARCH_025",
      "source_phase": "PH4",
      "source_date": "2021-11-15",
      "source_type": "journal",
      "content": "The Jester came out at the dinner. Deflected every real question. Performed instead of connected.",
      "phrase_tags": ["Jester", "deflected", "performed", "connected"],
      "emotional_state": "aware, regretful",
      "phase_dna": "PH4_walls_up",
      "keywords": ["defense", "performance", "avoidance"]
    },
    {
      "id": "ARCH_026",
      "source_phase": "PH4",
      "source_date": "2022-01-20",
      "source_type": "journal",
      "content": "The walls are necessary. Not everyone deserves access. Protecting the work means protecting the self.",
      "phrase_tags": ["walls", "necessary", "access", "protecting"],
      "emotional_state": "defensive, justified",
      "phase_dna": "PH4_walls_up",
      "keywords": ["boundaries", "protection", "self-preservation"]
    },
    {
      "id": "ARCH_027",
      "source_phase": "PH4",
      "source_date": "2022-05-08",
      "source_type": "journal",
      "content": "Exhausted. The travel, the work, the constant adaptation. Need to rest but can't stop.",
      "phrase_tags": ["exhausted", "travel", "adaptation", "rest", "can't stop"],
      "emotional_state": "depleted, driven",
      "phase_dna": "PH4_vulnerability_peak",
      "keywords": ["burnout", "compulsion", "exhaustion"]
    },
    {
      "id": "ARCH_028",
      "source_phase": "PH4",
      "source_date": "2022-08-14",
      "source_type": "journal",
      "content": "Found a rhythm again. Morning walks, afternoon studio, evening rest. The body knows what it needs.",
      "phrase_tags": ["rhythm", "morning walks", "studio", "body knows"],
      "emotional_state": "balanced, aware",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["routine", "balance", "embodiment"]
    },
    {
      "id": "ARCH_029",
      "source_phase": "PH4",
      "source_date": "2022-11-22",
      "source_type": "journal",
      "content": "The partnership question keeps surfacing. Can I share this life? Do I want to?",
      "phrase_tags": ["partnership", "share", "life", "question"],
      "emotional_state": "questioning, open",
      "phase_dna": "PH4_vulnerability_peak",
      "keywords": ["relationship", "intimacy", "choice"]
    },
    {
      "id": "ARCH_030",
      "source_phase": "PH4A",
      "source_date": "2023-02-10",
      "source_type": "journal",
      "content": "Bangkok feels like home now. The heat, the chaos, the temples. The work belongs here.",
      "phrase_tags": ["Bangkok", "home", "heat", "chaos", "temples"],
      "emotional_state": "rooted, belonging",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["belonging", "place", "integration"]
    },
    {
      "id": "ARCH_031",
      "source_phase": "PH4A",
      "source_date": "2023-05-18",
      "source_type": "journal",
      "content": "The walking is thinking. The thinking is walking. They are the same thing now.",
      "phrase_tags": ["walking", "thinking", "same thing"],
      "emotional_state": "integrated, flowing",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["integration", "movement", "cognition"]
    },
    {
      "id": "ARCH_032",
      "source_phase": "PH4A",
      "source_date": "2023-07-25",
      "source_type": "journal",
      "content": "The body led me to the temple. Didn't plan it. Just walked and arrived. Trust the legs.",
      "phrase_tags": ["body led", "temple", "walked", "arrived", "trust"],
      "emotional_state": "surrendered, trusting",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["intuition", "surrender", "guidance"]
    },
    {
      "id": "ARCH_033",
      "source_phase": "PH4A",
      "source_date": "2023-10-30",
      "source_type": "journal",
      "content": "Something is shifting. Can't name it yet. The work feels different. Heavier. More real.",
      "phrase_tags": ["shifting", "can't name", "different", "heavier", "real"],
      "emotional_state": "anticipatory, uncertain",
      "phase_dna": "NE_threshold_crossing",
      "keywords": ["transition", "emergence", "weight"]
    },
    {
      "id": "ARCH_034",
      "source_phase": "NE",
      "source_date": "2024-01-15",
      "source_type": "journal",
      "content": "The geometry was scaffolding. Now I can take it down. The form holds itself.",
      "phrase_tags": ["geometry", "scaffolding", "take down", "form holds"],
      "emotional_state": "liberated, confident",
      "phase_dna": "NE_threshold_crossing",
      "keywords": ["evolution", "independence", "maturity"]
    },
    {
      "id": "ARCH_035",
      "source_phase": "NE",
      "source_date": "2024-03-22",
      "source_type": "journal",
      "content": "The Crucible Year begins. 52 weeks of accountability. The mirror will not lie.",
      "phrase_tags": ["Crucible Year", "accountability", "mirror", "lie"],
      "emotional_state": "committed, apprehensive",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["commitment", "truth", "structure"]
    },
    {
      "id": "ARCH_036",
      "source_phase": "NE",
      "source_date": "2024-04-28",
      "source_type": "journal",
      "content": "The ink responds to the body's state. Tense hand, tense line. Relaxed hand, flowing line.",
      "phrase_tags": ["ink responds", "body state", "tense", "relaxed", "line"],
      "emotional_state": "aware, experimental",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["embodiment", "material", "awareness"]
    },
    {
      "id": "ARCH_037",
      "source_phase": "NE",
      "source_date": "2024-07-15",
      "source_type": "journal",
      "content": "Gravity is the teacher now. Not the mind. The weight of the brush. The pull of the ink.",
      "phrase_tags": ["gravity", "teacher", "weight", "brush", "pull"],
      "emotional_state": "humble, receptive",
      "phase_dna": "NE_threshold_crossing",
      "keywords": ["physics", "surrender", "material"]
    },
    {
      "id": "ARCH_038",
      "source_phase": "NE",
      "source_date": "2024-09-08",
      "source_type": "journal",
      "content": "The Jester is quieter now. Less need to perform. The work speaks for itself.",
      "phrase_tags": ["Jester quieter", "perform", "work speaks"],
      "emotional_state": "settled, confident",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["authenticity", "confidence", "presence"]
    },
    {
      "id": "ARCH_039",
      "source_phase": "NE",
      "source_date": "2024-11-20",
      "source_type": "journal",
      "content": "Partnership found. Not sought. The practice made space for another. Unexpected gift.",
      "phrase_tags": ["partnership", "found", "space", "unexpected", "gift"],
      "emotional_state": "grateful, surprised",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["relationship", "openness", "grace"]
    },
    {
      "id": "ARCH_040",
      "source_phase": "NE",
      "source_date": "2024-12-15",
      "source_type": "journal",
      "content": "The year closes. The mirror showed everything. Ready for what comes next.",
      "phrase_tags": ["year closes", "mirror showed", "ready", "next"],
      "emotional_state": "complete, anticipatory",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["completion", "reflection", "future"]
    },
    // Additional entries for richer pattern matching
    {
      "id": "ARCH_041",
      "source_phase": "PH1",
      "source_date": "2018-11-05",
      "source_type": "journal",
      "content": "The studio is sanctuary. Four walls and silence. Here I can hear myself think.",
      "phrase_tags": ["studio", "sanctuary", "walls", "silence", "think"],
      "emotional_state": "peaceful, focused",
      "phase_dna": "PH1_early_geometric",
      "keywords": ["space", "solitude", "clarity"]
    },
    {
      "id": "ARCH_042",
      "source_phase": "PH2",
      "source_date": "2019-08-12",
      "source_type": "journal",
      "content": "The spiritual dimension is not separate from the work. It IS the work. They cannot be divided.",
      "phrase_tags": ["spiritual", "not separate", "work", "divided"],
      "emotional_state": "certain, integrated",
      "phase_dna": "PH2_midpoint_clarity",
      "keywords": ["spirituality", "integration", "wholeness"]
    },
    {
      "id": "ARCH_043",
      "source_phase": "PH3",
      "source_date": "2020-04-05",
      "source_type": "journal",
      "content": "The world stopped. Pandemic. But the practice continues. This is what it's for.",
      "phrase_tags": ["world stopped", "pandemic", "practice continues"],
      "emotional_state": "grounded, purposeful",
      "phase_dna": "PH3_split_early",
      "keywords": ["crisis", "resilience", "purpose"]
    },
    {
      "id": "ARCH_044",
      "source_phase": "PH3",
      "source_date": "2020-11-28",
      "source_type": "journal",
      "content": "The ink is blood. The paper is skin. The mark is scar. Everything is body now.",
      "phrase_tags": ["ink blood", "paper skin", "mark scar", "body"],
      "emotional_state": "visceral, embodied",
      "phase_dna": "PH3_full_rupture",
      "keywords": ["embodiment", "material", "transformation"]
    },
    {
      "id": "ARCH_045",
      "source_phase": "PH4",
      "source_date": "2021-09-18",
      "source_type": "journal",
      "content": "The Jester saved me tonight. Lightness when heaviness threatened. Grateful for the mask.",
      "phrase_tags": ["Jester saved", "lightness", "heaviness", "mask"],
      "emotional_state": "grateful, aware",
      "phase_dna": "PH4_walls_up",
      "keywords": ["defense", "survival", "gratitude"]
    },
    {
      "id": "ARCH_046",
      "source_phase": "PH4A",
      "source_date": "2023-04-10",
      "source_type": "journal",
      "content": "The legs carry wisdom the mind hasn't learned yet. Walk first, understand later.",
      "phrase_tags": ["legs carry wisdom", "walk first", "understand later"],
      "emotional_state": "trusting, patient",
      "phase_dna": "PH4A_walking_engine",
      "keywords": ["embodiment", "patience", "trust"]
    },
    {
      "id": "ARCH_047",
      "source_phase": "NE",
      "source_date": "2024-02-28",
      "source_type": "journal",
      "content": "The threshold is not a door. It's a dissolving. The old self fades. The new self emerges.",
      "phrase_tags": ["threshold", "dissolving", "old self", "new self", "emerges"],
      "emotional_state": "transforming, surrendered",
      "phase_dna": "NE_threshold_crossing",
      "keywords": ["transformation", "emergence", "death-rebirth"]
    },
    {
      "id": "ARCH_048",
      "source_phase": "NE",
      "source_date": "2024-05-15",
      "source_type": "journal",
      "content": "Sustainable is not settling. It's wisdom. The hot burns out. The sustainable endures.",
      "phrase_tags": ["sustainable", "settling", "wisdom", "hot burns", "endures"],
      "emotional_state": "wise, balanced",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["sustainability", "wisdom", "endurance"]
    },
    {
      "id": "ARCH_049",
      "source_phase": "NE",
      "source_date": "2024-08-22",
      "source_type": "journal",
      "content": "The question is not what to make. The question is who to become while making.",
      "phrase_tags": ["question", "what to make", "who to become", "making"],
      "emotional_state": "philosophical, clear",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["identity", "process", "becoming"]
    },
    {
      "id": "ARCH_050",
      "source_phase": "NE",
      "source_date": "2024-10-30",
      "source_type": "journal",
      "content": "The mirror reflects what is, not what should be. Accept the reflection. Work from there.",
      "phrase_tags": ["mirror reflects", "what is", "accept", "work from there"],
      "emotional_state": "accepting, grounded",
      "phase_dna": "NE_somatic_honesty",
      "keywords": ["acceptance", "reality", "foundation"]
    }
  ]
};

async function seedArchive() {
  console.log('🌱 Starting archive seed...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Check if archive already has entries
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM archive_entries');
    const existingCount = existing[0].count;
    
    if (existingCount > 0) {
      console.log(`⚠️  Archive already has ${existingCount} entries. Skipping seed.`);
      console.log('   To re-seed, first clear the table: DELETE FROM archive_entries;');
      await connection.end();
      return;
    }
    
    // Insert archive entries
    console.log(`📝 Inserting ${archiveData.archive_entries.length} archive entries...`);
    
    for (const entry of archiveData.archive_entries) {
      await connection.execute(
        `INSERT INTO archive_entries (sourcePhase, sourceDate, content, phraseTags, emotionalStateTag, phaseDnaTag)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entry.source_phase,
          entry.source_date,
          entry.content,
          JSON.stringify(entry.phrase_tags),
          entry.emotional_state,
          entry.phase_dna
        ]
      );
    }
    
    console.log(`✅ Successfully seeded ${archiveData.archive_entries.length} archive entries!`);
    
    // Verify
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM archive_entries');
    console.log(`📊 Total archive entries: ${result[0].count}`);
    
    // Show phase distribution
    const [phases] = await connection.execute(
      'SELECT sourcePhase, COUNT(*) as count FROM archive_entries GROUP BY sourcePhase ORDER BY sourcePhase'
    );
    console.log('\n📈 Entries by phase:');
    for (const phase of phases) {
      console.log(`   ${phase.sourcePhase}: ${phase.count}`);
    }
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedArchive().catch(console.error);
