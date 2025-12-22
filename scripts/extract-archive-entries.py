#!/usr/bin/env python3
"""
Extract structured archive entries from Peter Yuill's 7-year practice documentation.
Reads both source files and generates JSON for database seeding.
"""

import re
import json
from datetime import datetime
from pathlib import Path

# Phase DNA mapping with date ranges
PHASE_TIMELINE = {
    "PH1": {"start": "2018-01-01", "end": "2018-06-30", "label": "Absurdity of Meaning"},
    "PH1A": {"start": "2018-07-01", "end": "2019-06-30", "label": "Institutional Geometry"},
    "PH2": {"start": "2019-07-01", "end": "2020-06-30", "label": "Alignment - Circular Paradigm"},
    "PH2A": {"start": "2020-07-01", "end": "2020-12-31", "label": "Equinox of the Gods - Thelemic"},
    "PH3": {"start": "2021-01-01", "end": "2023-06-30", "label": "Echoes & Celestial Secrets"},
    "PH3A": {"start": "2020-01-01", "end": "2020-06-30", "label": "Therion Rupture - One-Shot Ink"},
    "PH4": {"start": "2021-01-01", "end": "2024-06-30", "label": "Nomadic - Emotional Crisis"},
    "PH4A": {"start": "2024-07-01", "end": "2025-03-31", "label": "Bangkok/Hong Kong Crisis"},
    "NE": {"start": "2025-04-01", "end": "2025-12-31", "label": "New Era - Big Bang, Thr3e, Covenant"},
}

# Emotional state keywords for inference
EMOTIONAL_KEYWORDS = {
    "hot": ["breakthrough", "alive", "energized", "fire", "burning", "intense", "driven", "flow", "momentum"],
    "sustainable": ["balanced", "steady", "grounded", "present", "clear", "focused", "integrated", "rhythm"],
    "depleted": ["exhausted", "crisis", "struggle", "lost", "blocked", "fragmented", "isolated", "dark", "rupture"]
}

# Jester activity indicators (higher = more performance/deflection)
JESTER_INDICATORS = {
    "low": ["authentic", "vulnerable", "honest", "raw", "exposed", "real", "truth", "direct"],
    "medium": ["balanced", "professional", "composed", "measured", "careful"],
    "high": ["performing", "deflecting", "mask", "wall", "defended", "protected", "lightness", "humor"]
}

def infer_jester_level(text):
    """Infer jester activity level (0-10) from text content."""
    text_lower = text.lower()
    low_count = sum(1 for word in JESTER_INDICATORS["low"] if word in text_lower)
    high_count = sum(1 for word in JESTER_INDICATORS["high"] if word in text_lower)
    
    if high_count > low_count + 2:
        return min(10, 6 + high_count)
    elif low_count > high_count + 2:
        return max(0, 4 - low_count)
    else:
        return 5  # Balanced

def infer_emotional_state(text):
    """Infer emotional state from text content."""
    text_lower = text.lower()
    scores = {}
    for state, keywords in EMOTIONAL_KEYWORDS.items():
        scores[state] = sum(1 for word in keywords if word in text_lower)
    
    max_state = max(scores, key=scores.get)
    if scores[max_state] == 0:
        return "sustainable"
    return max_state

def extract_key_quote(text, max_length=200):
    """Extract the most resonant quote from text."""
    # Look for sentences with strong emotional/philosophical content
    sentences = re.split(r'[.!?]+', text)
    
    priority_patterns = [
        r'I (realized|understood|felt|knew|discovered)',
        r'(truth|meaning|purpose|freedom|liberation)',
        r'(body|somatic|physical|visceral)',
        r'(rupture|breakthrough|threshold|crisis)',
        r'(sacred|spiritual|divine|cosmic)',
    ]
    
    best_sentence = ""
    best_score = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 20 or len(sentence) > max_length:
            continue
        
        score = 0
        for pattern in priority_patterns:
            if re.search(pattern, sentence, re.IGNORECASE):
                score += 1
        
        if score > best_score:
            best_score = score
            best_sentence = sentence
    
    return best_sentence if best_sentence else sentences[0][:max_length] if sentences else ""

def extract_pattern_tag(text):
    """Extract core pattern/insight tag from text."""
    # Look for key conceptual phrases
    patterns = [
        (r'sacred geometry', 'sacred-geometry'),
        (r'absurd(ity|ist)?', 'absurdism'),
        (r'alignment', 'alignment'),
        (r'rupture', 'rupture'),
        (r'threshold', 'threshold'),
        (r'somatic', 'somatic'),
        (r'walking', 'walking-engine'),
        (r'nomad(ic)?', 'nomadic'),
        (r'crisis', 'crisis'),
        (r'breakthrough', 'breakthrough'),
        (r'isolation', 'isolation'),
        (r'vulnerability', 'vulnerability'),
        (r'jester', 'jester'),
        (r'gold', 'gold-material'),
        (r'ink', 'ink-material'),
        (r'one.?shot', 'one-shot'),
        (r'thelema|crowley', 'thelemic'),
        (r'covenant', 'covenant'),
        (r'big.?bang', 'big-bang'),
        (r'thr3e', 'thr3e'),
    ]
    
    text_lower = text.lower()
    for pattern, tag in patterns:
        if re.search(pattern, text_lower):
            return tag
    
    return 'practice-reflection'

def extract_somatic_state(text):
    """Extract somatic/body state description from text."""
    somatic_patterns = [
        r'(body|physical|somatic)[^.]*\.',
        r'(hands?|arms?|chest|stomach|shoulders?|back|legs?)[^.]*\.',
        r'(tension|relaxed|tight|loose|heavy|light)[^.]*\.',
        r'(breathing|breath)[^.]*\.',
    ]
    
    for pattern in somatic_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    
    return "Body state not explicitly documented"

def parse_phase_master_file(filepath):
    """Parse the FULL_PHASE_A1_A5_NEON_MASTER.txt file."""
    entries = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Split by phase markers
    phase_sections = re.split(r'\(69(PH\d+A?|NE)\)', content)
    
    current_phase = None
    for i, section in enumerate(phase_sections):
        # Check if this is a phase marker
        phase_match = re.match(r'^(PH\d+A?|NE)$', section.strip())
        if phase_match:
            current_phase = phase_match.group(1)
            continue
        
        if current_phase and len(section) > 500:
            # Extract meaningful content from this phase section
            # Look for artist statements, journal entries, key quotes
            
            # Find dated entries
            date_pattern = r'(\d{4}-\d{2}-\d{2}|\d{4})'
            dates = re.findall(date_pattern, section)
            
            # Extract paragraphs with substantial content
            paragraphs = [p.strip() for p in section.split('\n\n') if len(p.strip()) > 100]
            
            for idx, para in enumerate(paragraphs[:10]):  # Limit per phase
                if len(para) < 100:
                    continue
                
                # Determine date
                entry_date = dates[idx] if idx < len(dates) else PHASE_TIMELINE.get(current_phase, {}).get("start", "2020-01-01")
                if len(entry_date) == 4:
                    entry_date = f"{entry_date}-06-15"
                
                entry = {
                    "source_phase": current_phase,
                    "source_date": entry_date,
                    "content": extract_key_quote(para, 300),
                    "phrase_tags": [],
                    "emotional_state": infer_emotional_state(para),
                    "phase_dna": f"{current_phase}_{extract_pattern_tag(para)}",
                    "somatic_state": extract_somatic_state(para),
                    "jester_activity": infer_jester_level(para),
                    "pattern_tag": extract_pattern_tag(para),
                }
                
                # Extract phrase tags
                words = re.findall(r'\b[a-z]{4,}\b', para.lower())
                common_words = set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'which', 'would', 'could', 'should', 'about', 'through', 'between', 'being', 'these', 'those', 'there', 'where', 'when', 'what', 'more', 'some', 'into', 'only', 'other', 'than', 'then', 'also', 'very', 'just', 'over', 'such', 'after', 'before', 'most', 'made', 'like', 'each', 'make', 'first', 'work', 'well', 'even', 'back', 'much', 'because', 'good', 'same', 'different', 'however', 'still', 'find', 'here', 'many', 'both', 'does', 'take', 'come', 'came', 'want', 'give', 'using', 'used', 'without', 'within', 'during', 'while'])
                meaningful_words = [w for w in set(words) if w not in common_words][:10]
                entry["phrase_tags"] = meaningful_words
                
                if entry["content"]:
                    entries.append(entry)
    
    return entries

def parse_primary_source_file(filepath):
    """Parse the PRIMARY_SOURCE_WRITING_MASTER.txt file."""
    entries = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Split by ENTRYMETA markers
    entry_blocks = re.split(r'ENTRYMETA', content)
    
    for block in entry_blocks[1:]:  # Skip first empty block
        # Extract metadata
        phase_match = re.search(r'phaseid\s+(\w+)', block)
        date_match = re.search(r'date\s+(\d{4}-\d{2}-\d{2})', block)
        title_match = re.search(r'title\s+(.+)', block)
        
        # Extract text content
        text_match = re.search(r'---TEXTSTART---(.+?)---TEXTEND---', block, re.DOTALL)
        
        if phase_match and text_match:
            text_content = text_match.group(1).strip()
            phase = phase_match.group(1)
            date = date_match.group(1) if date_match else PHASE_TIMELINE.get(phase, {}).get("start", "2020-01-01")
            
            # Split into meaningful chunks
            paragraphs = [p.strip() for p in text_content.split('\n\n') if len(p.strip()) > 80]
            
            for idx, para in enumerate(paragraphs[:5]):  # Limit per entry
                entry = {
                    "source_phase": phase,
                    "source_date": date,
                    "content": extract_key_quote(para, 300),
                    "phrase_tags": [],
                    "emotional_state": infer_emotional_state(para),
                    "phase_dna": f"{phase}_{extract_pattern_tag(para)}",
                    "somatic_state": extract_somatic_state(para),
                    "jester_activity": infer_jester_level(para),
                    "pattern_tag": extract_pattern_tag(para),
                }
                
                # Extract phrase tags
                words = re.findall(r'\b[a-z]{4,}\b', para.lower())
                common_words = set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'which', 'would', 'could', 'should', 'about', 'through', 'between', 'being', 'these', 'those', 'there', 'where', 'when', 'what', 'more', 'some', 'into', 'only', 'other', 'than', 'then', 'also', 'very', 'just', 'over', 'such', 'after', 'before', 'most', 'made', 'like', 'each', 'make', 'first', 'work', 'well', 'even', 'back', 'much', 'because', 'good', 'same', 'different', 'however', 'still', 'find', 'here', 'many', 'both', 'does', 'take', 'come', 'came', 'want', 'give', 'using', 'used', 'without', 'within', 'during', 'while'])
                meaningful_words = [w for w in set(words) if w not in common_words][:10]
                entry["phrase_tags"] = meaningful_words
                
                if entry["content"]:
                    entries.append(entry)
    
    return entries

def deduplicate_entries(entries):
    """Remove duplicate entries based on content similarity."""
    seen_content = set()
    unique_entries = []
    
    for entry in entries:
        # Create a normalized key
        content_key = entry["content"][:100].lower()
        if content_key not in seen_content:
            seen_content.add(content_key)
            unique_entries.append(entry)
    
    return unique_entries

def main():
    # File paths
    phase_master = Path("/home/ubuntu/upload/FULL_PHASE_A1_A5_NEON_MASTER.txt")
    primary_source = Path("/home/ubuntu/upload/PRIMARY_SOURCE_WRITING_MASTER.txt")
    output_file = Path("/home/ubuntu/neon-signs/scripts/enriched-archive-data.json")
    
    print("Extracting entries from FULL_PHASE_A1_A5_NEON_MASTER.txt...")
    phase_entries = parse_phase_master_file(phase_master)
    print(f"  Found {len(phase_entries)} entries")
    
    print("Extracting entries from PRIMARY_SOURCE_WRITING_MASTER.txt...")
    source_entries = parse_primary_source_file(primary_source)
    print(f"  Found {len(source_entries)} entries")
    
    # Combine and deduplicate
    all_entries = phase_entries + source_entries
    print(f"Total entries before deduplication: {len(all_entries)}")
    
    unique_entries = deduplicate_entries(all_entries)
    print(f"Unique entries after deduplication: {len(unique_entries)}")
    
    # Sort by date
    unique_entries.sort(key=lambda x: x["source_date"])
    
    # Add week index based on date
    base_date = datetime(2018, 1, 1)
    for entry in unique_entries:
        try:
            entry_date = datetime.strptime(entry["source_date"], "%Y-%m-%d")
            week_index = (entry_date - base_date).days // 7
            entry["week_index"] = max(0, week_index)
        except:
            entry["week_index"] = 0
    
    # Output statistics
    print("\n=== Archive Statistics ===")
    phase_counts = {}
    for entry in unique_entries:
        phase = entry["source_phase"]
        phase_counts[phase] = phase_counts.get(phase, 0) + 1
    
    for phase, count in sorted(phase_counts.items()):
        print(f"  {phase}: {count} entries")
    
    # Save to JSON
    output_data = {
        "generated_at": datetime.now().isoformat(),
        "total_entries": len(unique_entries),
        "entries": unique_entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(unique_entries)} entries to {output_file}")
    
    # Print sample entries
    print("\n=== Sample Entries ===")
    for entry in unique_entries[:3]:
        print(f"\nPhase: {entry['source_phase']} | Date: {entry['source_date']}")
        print(f"Phase-DNA: {entry['phase_dna']}")
        print(f"Jester: {entry['jester_activity']}/10 | Emotional: {entry['emotional_state']}")
        print(f"Content: {entry['content'][:100]}...")
        print(f"Pattern Tag: {entry['pattern_tag']}")

if __name__ == "__main__":
    main()
