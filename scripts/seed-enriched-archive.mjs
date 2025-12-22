/**
 * Seed the archive_entries table with enriched historical data
 * extracted from Peter Yuill's 7-year practice documentation.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedArchive() {
  // Read the extracted archive data
  const dataPath = path.join(__dirname, 'enriched-archive-data.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const archiveData = JSON.parse(rawData);
  
  console.log(`\n📚 Loading ${archiveData.total_entries} enriched archive entries...`);
  console.log(`   Generated at: ${archiveData.generated_at}\n`);
  
  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // First, clear existing archive entries (optional - comment out to append)
    console.log('🗑️  Clearing existing archive entries...');
    await connection.execute('DELETE FROM archive_entries');
    
    // Insert new entries
    let inserted = 0;
    const phaseStats = {};
    
    for (const entry of archiveData.entries) {
      const {
        source_phase,
        source_date,
        content,
        phrase_tags,
        emotional_state,
        phase_dna,
        somatic_state,
        jester_activity,
        pattern_tag,
        week_index
      } = entry;
      
      // Map emotional state to energy level format
      const emotionalStateTag = emotional_state === 'hot' ? 'energized' :
                                emotional_state === 'depleted' ? 'exhausted' :
                                'balanced';
      
      // Combine pattern_tag and phase_dna for richer tagging
      const phaseDnaTag = phase_dna || `${source_phase}_${pattern_tag}`;
      
      await connection.execute(
        `INSERT INTO archive_entries 
         (sourcePhase, sourceDate, content, phraseTags, emotionalStateTag, phaseDnaTag, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          source_phase,
          new Date(source_date),
          content,
          JSON.stringify(phrase_tags),
          emotionalStateTag,
          phaseDnaTag
        ]
      );
      
      inserted++;
      phaseStats[source_phase] = (phaseStats[source_phase] || 0) + 1;
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} archive entries!\n`);
    console.log('📊 Phase Distribution:');
    console.log('─'.repeat(40));
    
    const sortedPhases = Object.keys(phaseStats).sort();
    for (const phase of sortedPhases) {
      const count = phaseStats[phase];
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`   ${phase.padEnd(6)} │ ${bar} ${count}`);
    }
    console.log('─'.repeat(40));
    console.log(`   Total: ${inserted} entries across ${sortedPhases.length} phases\n`);
    
    // Verify the data
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM archive_entries');
    console.log(`📋 Verification: ${rows[0].count} entries in database\n`);
    
    // Show sample entries
    console.log('📝 Sample Entries:');
    console.log('─'.repeat(60));
    
    const [samples] = await connection.execute(
      'SELECT sourcePhase, sourceDate, content, emotionalStateTag, phaseDnaTag FROM archive_entries ORDER BY sourceDate LIMIT 3'
    );
    
    for (const sample of samples) {
      console.log(`\n[${sample.sourcePhase}] ${sample.sourceDate.toISOString().split('T')[0]}`);
      console.log(`  Phase-DNA: ${sample.phaseDnaTag}`);
      console.log(`  Energy: ${sample.emotionalStateTag}`);
      console.log(`  Content: ${sample.content.substring(0, 80)}...`);
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('🎉 Archive enrichment complete!\n');
    
  } finally {
    await connection.end();
  }
}

seedArchive().catch(err => {
  console.error('❌ Error seeding archive:', err);
  process.exit(1);
});
