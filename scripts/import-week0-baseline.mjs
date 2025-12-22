/**
 * Import Week 0 Baseline Roundup from WEEKLY_ROUNDUP_CONTINUOUS_LOG.txt
 * This script inserts the baseline capture directly into the database.
 */

import mysql from 'mysql2/promise';

async function importWeek0Baseline() {
  console.log('\n📥 Importing Week 0 Baseline Roundup...\n');
  
  // Week 0 baseline data extracted from the log file
  const week0Data = {
    userId: 1, // Will be updated to match the actual user
    weekNumber: 0,
    year: 2025,
    createdDayOfWeek: 'Sunday',
    
    // Weather Report (raw emotional state)
    weatherReport: `Feeling good, on my 3rd salt coffee and waiting for breakfast at a cafe in Hanoi. Feeling very excited for this process and for the year ahead.`,
    
    // Studio Hours
    studioHours: 0, // Studio not yet built
    
    // Works Made
    worksMade: `Started: 0 / Finished: 0. Pre-studio, no physical work yet. Covenant deep blood red idea logged for future exploration.`,
    
    // Jester Activity (0-10 scale)
    // "Jester appeared only as content/subject of analysis—present in discussion of its concept, role, and purpose. Not operating defensively; was examined as subject matter, not deployed as escape mechanism."
    // This suggests low defensive jester activity - around 2-3
    jesterActivity: 2,
    
    // Energy Level
    energyLevel: 'hot', // "Hot (high energy, sustainable)"
    
    // Walking Engine
    walkingEngineUsed: true,
    walkingInsights: `Period: December 14-20, 2025. Average steps per day: 15,916. Single day high: 21,967 (December 20). Walking led to the creation of this entire process. Step counter is a very useful data metric for tracking. Generally an active me = a happy me.`,
    
    // Partnership/Solitude Temperature
    partnershipTemperature: `Content alone. No void forming. Solitude is sustainable right now.`,
    
    // One Thing That Worked
    thingWorked: `Neon`,
    
    // One Thing That Resisted
    thingResisted: `This week not a lot—firing on all cylinders`,
    
    // Somatic State
    somaticState: `Felt pretty good.`,
    
    // Door Intention
    doorIntention: `A realisation that the door exists, or rather, that it doesn't.`,
    
    // Phase DNA (baseline)
    phaseDnaAssigned: 'CRUCIBLE_BASELINE'
  };
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // First, get the actual user ID (owner of the app)
    const [users] = await connection.execute(
      'SELECT id FROM users ORDER BY id ASC LIMIT 1'
    );
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database. Creating roundup with userId=1...');
    } else {
      week0Data.userId = users[0].id;
      console.log(`👤 Found user with ID: ${week0Data.userId}`);
    }
    
    // Check if Week 0 already exists
    const [existing] = await connection.execute(
      'SELECT id FROM weekly_roundups WHERE weekNumber = 0 AND year = 2025'
    );
    
    if (existing.length > 0) {
      console.log('⚠️  Week 0 baseline already exists in database (ID: ' + existing[0].id + ')');
      console.log('   Skipping import to avoid duplicates.');
      await connection.end();
      return;
    }
    
    // Insert the Week 0 baseline
    const [result] = await connection.execute(
      `INSERT INTO weekly_roundups 
       (userId, weekNumber, year, createdDayOfWeek, weatherReport, studioHours, worksMade, 
        jesterActivity, energyLevel, walkingEngineUsed, walkingInsights, partnershipTemperature,
        thingWorked, thingResisted, somaticState, doorIntention, phaseDnaAssigned, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        week0Data.userId,
        week0Data.weekNumber,
        week0Data.year,
        week0Data.createdDayOfWeek,
        week0Data.weatherReport,
        week0Data.studioHours,
        week0Data.worksMade,
        week0Data.jesterActivity,
        week0Data.energyLevel,
        week0Data.walkingEngineUsed,
        week0Data.walkingInsights,
        week0Data.partnershipTemperature,
        week0Data.thingWorked,
        week0Data.thingResisted,
        week0Data.somaticState,
        week0Data.doorIntention,
        week0Data.phaseDnaAssigned,
        new Date('2025-12-21T09:00:00+07:00') // Bangkok time, morning of Dec 21
      ]
    );
    
    console.log('✅ Week 0 Baseline imported successfully!');
    console.log(`   Roundup ID: ${result.insertId}`);
    console.log('\n📊 Summary:');
    console.log('─'.repeat(50));
    console.log(`   Week: 0 (Baseline)`);
    console.log(`   Date: December 21, 2025`);
    console.log(`   Location: Hanoi`);
    console.log(`   Energy: ${week0Data.energyLevel}`);
    console.log(`   Jester Activity: ${week0Data.jesterActivity}/10`);
    console.log(`   Studio Hours: ${week0Data.studioHours}`);
    console.log(`   Walking Engine: ${week0Data.walkingEngineUsed ? 'Active (15,916 avg steps)' : 'Inactive'}`);
    console.log(`   Phase DNA: ${week0Data.phaseDnaAssigned}`);
    console.log('─'.repeat(50));
    console.log('\n🎯 Weather Report:');
    console.log(`   "${week0Data.weatherReport}"`);
    console.log('\n🚪 Door Intention:');
    console.log(`   "${week0Data.doorIntention}"`);
    console.log('\n');
    
  } finally {
    await connection.end();
  }
}

importWeek0Baseline().catch(err => {
  console.error('❌ Error importing Week 0 baseline:', err);
  process.exit(1);
});
