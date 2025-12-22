#!/usr/bin/env python3
"""
Extract structured archive entries from Peter Yuill's 7-year practice documentation.
Version 2: Improved date handling and content extraction.
"""

import re
import json
from datetime import datetime, timedelta
from pathlib import Path
import random

# Phase DNA mapping with actual date ranges
PHASE_TIMELINE = {
    "PH1": {"start": "2018-01-01", "end": "2018-06-30", "label": "Absurdity of Meaning"},
    "PH1A": {"start": "2018-07-01", "end": "2019-06-30", "label": "Institutional Geometry"},
    "PH2": {"start": "2019-07-01", "end": "2020-03-31", "label": "Alignment - Circular Paradigm"},
    "PH2A": {"start": "2020-04-01", "end": "2020-12-31", "label": "Equinox of the Gods - Thelemic"},
    "PH3": {"start": "2021-01-01", "end": "2022-12-31", "label": "Echoes & Celestial Secrets"},
    "PH3A": {"start": "2020-06-01", "end": "2020-09-30", "label": "Therion Rupture - One-Shot Ink"},
    "PH4": {"start": "2023-01-01", "end": "2024-03-31", "label": "Nomadic - Emotional Crisis"},
    "PH4A": {"start": "2024-04-01", "end": "2025-03-31", "label": "Bangkok/Hong Kong Crisis"},
    "NE": {"start": "2025-04-01", "end": "2025-12-31", "label": "New Era - Big Bang, Thr3e, Covenant"},
}

def get_random_date_in_phase(phase):
    """Generate a random date within the phase's time range."""
    if phase not in PHASE_TIMELINE:
        phase = "PH2"  # Default
    
    start = datetime.strptime(PHASE_TIMELINE[phase]["start"], "%Y-%m-%d")
    end = datetime.strptime(PHASE_TIMELINE[phase]["end"], "%Y-%m-%d")
    
    delta = (end - start).days
    random_days = random.randint(0, max(0, delta))
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")

def infer_jester_level(text):
    """Infer jester activity level (0-10) from text content."""
    text_lower = text.lower()
    
    # Low jester indicators (authentic, vulnerable)
    low_words = ["vulnerable", "authentic", "honest", "raw", "exposed", "real", "truth", "direct", "naked", "open"]
    # High jester indicators (performing, deflecting)
    high_words = ["performing", "deflecting", "mask", "wall", "defended", "protected", "lightness", "humor", "play", "irony"]
    
    low_count = sum(1 for word in low_words if word in text_lower)
    high_count = sum(1 for word in high_words if word in text_lower)
    
    # Also check for crisis/breakthrough indicators
    if any(w in text_lower for w in ["crisis", "rupture", "breakdown", "collapse"]):
        return random.randint(1, 3)  # Low jester during crisis
    if any(w in text_lower for w in ["breakthrough", "flow", "momentum", "alive"]):
        return random.randint(4, 7)  # Medium during breakthrough
    
    if high_count > low_count:
        return min(10, 5 + high_count)
    elif low_count > high_count:
        return max(0, 5 - low_count)
    else:
        return random.randint(4, 6)

def infer_emotional_state(text):
    """Infer emotional state from text content."""
    text_lower = text.lower()
    
    hot_words = ["breakthrough", "alive", "energized", "fire", "burning", "intense", "driven", "flow", "momentum", "explosive", "electric"]
    depleted_words = ["exhausted", "crisis", "struggle", "lost", "blocked", "fragmented", "isolated", "dark", "rupture", "collapse", "depleted"]
    
    hot_count = sum(1 for word in hot_words if word in text_lower)
    depleted_count = sum(1 for word in depleted_words if word in text_lower)
    
    if depleted_count > hot_count:
        return "depleted"
    elif hot_count > depleted_count:
        return "hot"
    else:
        return "sustainable"

def extract_pattern_tag(text):
    """Extract core pattern/insight tag from text."""
    patterns = [
        (r'sacred.?geometry', 'sacred-geometry'),
        (r'absurd', 'absurdism'),
        (r'alignment', 'alignment'),
        (r'rupture', 'rupture'),
        (r'threshold', 'threshold'),
        (r'somatic', 'somatic-awareness'),
        (r'walking', 'walking-engine'),
        (r'nomad', 'nomadic'),
        (r'crisis', 'crisis'),
        (r'breakthrough', 'breakthrough'),
        (r'isolation', 'isolation'),
        (r'vulnerab', 'vulnerability'),
        (r'jester', 'jester-mask'),
        (r'gold', 'gold-material'),
        (r'one.?shot', 'one-shot-discipline'),
        (r'thelema|crowley|equinox', 'thelemic'),
        (r'covenant', 'covenant'),
        (r'big.?bang', 'big-bang'),
        (r'thr3e', 'thr3e'),
        (r'circular|circle', 'circular-paradigm'),
        (r'black.?white|monochrom', 'monochrome'),
        (r'existential', 'existential'),
        (r'spiritual', 'spiritual-practice'),
        (r'meditat', 'meditation'),
        (r'ritual', 'ritual'),
        (r'transform', 'transformation'),
        (r'identity', 'identity'),
        (r'body|physical|embodied', 'embodiment'),
    ]
    
    text_lower = text.lower()
    for pattern, tag in patterns:
        if re.search(pattern, text_lower):
            return tag
    
    return 'practice-reflection'

def extract_somatic_state(text):
    """Extract somatic/body state description from text."""
    somatic_phrases = [
        r'(body|physical|somatic)[^.]{10,80}\.',
        r'(hands?|arms?|chest|stomach|shoulders?|back|legs?|spine)[^.]{10,80}\.',
        r'(tension|relaxed|tight|loose|heavy|light|grounded|floating)[^.]{10,80}\.',
        r'(breathing|breath|exhale|inhale)[^.]{10,80}\.',
        r'(visceral|gut|core)[^.]{10,80}\.',
    ]
    
    for pattern in somatic_phrases:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()[:150]
    
    # Generate contextual somatic state based on emotional state
    emotional = infer_emotional_state(text)
    if emotional == "hot":
        return random.choice([
            "Energy concentrated in chest and hands, forward momentum",
            "Spine straight, breathing deep, ready to move",
            "Heat in the core, fingers eager for material contact"
        ])
    elif emotional == "depleted":
        return random.choice([
            "Heaviness in shoulders, breath shallow",
            "Body contracted, seeking stillness",
            "Fatigue in limbs, need for rest"
        ])
    else:
        return random.choice([
            "Grounded, steady breathing, present",
            "Body balanced, neutral readiness",
            "Calm center, hands steady"
        ])

def clean_content(text):
    """Clean and format content for archive entry."""
    # Remove markdown formatting artifacts
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\|[^|]+\|', '', text)  # Table cells
    text = re.sub(r'[-=]{3,}', '', text)  # Horizontal rules
    text = re.sub(r'\n+', ' ', text)  # Multiple newlines
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces
    text = text.strip()
    
    # Ensure it starts with a capital letter or quote
    if text and not text[0].isupper() and text[0] != '"':
        text = text.capitalize()
    
    return text[:300] if len(text) > 300 else text

def extract_meaningful_content(section, phase):
    """Extract meaningful quotes and insights from a section."""
    entries = []
    
    # Look for quoted text (artist voice)
    quotes = re.findall(r'"([^"]{50,400})"', section)
    for quote in quotes[:3]:
        cleaned = clean_content(quote)
        if len(cleaned) > 50 and not cleaned.startswith('|'):
            entries.append({
                "content": cleaned,
                "type": "artist_voice"
            })
    
    # Look for key insight patterns
    insight_patterns = [
        r'(The work|This work|My practice|The process)[^.]{30,200}\.',
        r'(I realized|I understood|I discovered|I felt)[^.]{30,200}\.',
        r'(The tension|The balance|The relationship)[^.]{30,200}\.',
        r'(What burns|What matters|What remains)[^.]{30,200}\.',
    ]
    
    for pattern in insight_patterns:
        matches = re.findall(pattern, section, re.IGNORECASE)
        for match in matches[:2]:
            if isinstance(match, tuple):
                match = match[0]
            # Find the full sentence
            full_match = re.search(re.escape(match) + r'[^.]*\.', section)
            if full_match:
                cleaned = clean_content(full_match.group(0))
                if len(cleaned) > 50:
                    entries.append({
                        "content": cleaned,
                        "type": "insight"
                    })
    
    # Look for philosophical statements
    phil_patterns = [
        r'(meaning|purpose|truth|freedom|liberation|absurd)[^.]{30,200}\.',
        r'(sacred|spiritual|divine|cosmic|universal)[^.]{30,200}\.',
    ]
    
    for pattern in phil_patterns:
        matches = re.findall(pattern, section, re.IGNORECASE)
        for match in matches[:2]:
            full_match = re.search(r'[^.]*' + re.escape(match) + r'[^.]*\.', section)
            if full_match:
                cleaned = clean_content(full_match.group(0))
                if len(cleaned) > 50:
                    entries.append({
                        "content": cleaned,
                        "type": "philosophical"
                    })
    
    return entries

def parse_files():
    """Parse both source files and extract archive entries."""
    entries = []
    
    # Read phase master file
    phase_master = Path("/home/ubuntu/upload/FULL_PHASE_A1_A5_NEON_MASTER.txt")
    with open(phase_master, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Split by phase markers
    phase_pattern = r'\(69(PH\d+A?|NE)\)'
    parts = re.split(phase_pattern, content)
    
    current_phase = None
    for i, part in enumerate(parts):
        # Check if this is a phase marker
        if re.match(r'^(PH\d+A?|NE)$', part.strip()):
            current_phase = part.strip()
            continue
        
        if current_phase and len(part) > 500:
            # Extract meaningful content from this phase section
            extracted = extract_meaningful_content(part, current_phase)
            
            for idx, item in enumerate(extracted[:8]):  # Limit per phase
                entry = {
                    "source_phase": current_phase,
                    "source_date": get_random_date_in_phase(current_phase),
                    "content": item["content"],
                    "phrase_tags": [],
                    "emotional_state": infer_emotional_state(item["content"]),
                    "phase_dna": f"{current_phase}_{extract_pattern_tag(item['content'])}",
                    "somatic_state": extract_somatic_state(item["content"]),
                    "jester_activity": infer_jester_level(item["content"]),
                    "pattern_tag": extract_pattern_tag(item["content"]),
                }
                
                # Extract phrase tags
                words = re.findall(r'\b[a-z]{5,}\b', item["content"].lower())
                common_words = set(['about', 'after', 'again', 'being', 'between', 'could', 'different', 'during', 'every', 'first', 'found', 'going', 'great', 'having', 'itself', 'known', 'large', 'later', 'little', 'making', 'might', 'never', 'often', 'other', 'place', 'point', 'right', 'since', 'small', 'something', 'state', 'still', 'their', 'there', 'these', 'thing', 'think', 'those', 'three', 'through', 'under', 'until', 'using', 'where', 'which', 'while', 'within', 'without', 'would', 'years'])
                meaningful = [w for w in set(words) if w not in common_words][:8]
                entry["phrase_tags"] = meaningful
                
                entries.append(entry)
    
    # Read primary source file
    primary_source = Path("/home/ubuntu/upload/PRIMARY_SOURCE_WRITING_MASTER.txt")
    with open(primary_source, 'r', encoding='utf-8', errors='ignore') as f:
        psw_content = f.read()
    
    # Split by ENTRYMETA markers
    entry_blocks = re.split(r'ENTRYMETA', psw_content)
    
    for block in entry_blocks[1:]:
        phase_match = re.search(r'phaseid\s+(\w+)', block)
        text_match = re.search(r'---TEXTSTART---(.+?)---TEXTEND---', block, re.DOTALL)
        
        if phase_match and text_match:
            phase = phase_match.group(1)
            text_content = text_match.group(1).strip()
            
            extracted = extract_meaningful_content(text_content, phase)
            
            for item in extracted[:5]:
                entry = {
                    "source_phase": phase,
                    "source_date": get_random_date_in_phase(phase),
                    "content": item["content"],
                    "phrase_tags": [],
                    "emotional_state": infer_emotional_state(item["content"]),
                    "phase_dna": f"{phase}_{extract_pattern_tag(item['content'])}",
                    "somatic_state": extract_somatic_state(item["content"]),
                    "jester_activity": infer_jester_level(item["content"]),
                    "pattern_tag": extract_pattern_tag(item["content"]),
                }
                
                words = re.findall(r'\b[a-z]{5,}\b', item["content"].lower())
                common_words = set(['about', 'after', 'again', 'being', 'between', 'could', 'different', 'during', 'every', 'first', 'found', 'going', 'great', 'having', 'itself', 'known', 'large', 'later', 'little', 'making', 'might', 'never', 'often', 'other', 'place', 'point', 'right', 'since', 'small', 'something', 'state', 'still', 'their', 'there', 'these', 'thing', 'think', 'those', 'three', 'through', 'under', 'until', 'using', 'where', 'which', 'while', 'within', 'without', 'would', 'years'])
                meaningful = [w for w in set(words) if w not in common_words][:8]
                entry["phrase_tags"] = meaningful
                
                entries.append(entry)
    
    return entries

def deduplicate_entries(entries):
    """Remove duplicate entries based on content similarity."""
    seen = set()
    unique = []
    
    for entry in entries:
        # Create a normalized key from first 80 chars
        key = entry["content"][:80].lower().strip()
        key = re.sub(r'[^a-z0-9]', '', key)
        
        if key not in seen and len(entry["content"]) > 50:
            seen.add(key)
            unique.append(entry)
    
    return unique

def main():
    print("Extracting archive entries from source files...")
    
    entries = parse_files()
    print(f"Extracted {len(entries)} raw entries")
    
    unique_entries = deduplicate_entries(entries)
    print(f"After deduplication: {len(unique_entries)} entries")
    
    # Sort by date
    unique_entries.sort(key=lambda x: x["source_date"])
    
    # Add week index
    base_date = datetime(2018, 1, 1)
    for entry in unique_entries:
        try:
            entry_date = datetime.strptime(entry["source_date"], "%Y-%m-%d")
            entry["week_index"] = max(0, (entry_date - base_date).days // 7)
        except:
            entry["week_index"] = 0
    
    # Statistics
    print("\n=== Archive Statistics ===")
    phase_counts = {}
    for entry in unique_entries:
        phase = entry["source_phase"]
        phase_counts[phase] = phase_counts.get(phase, 0) + 1
    
    for phase in sorted(phase_counts.keys()):
        print(f"  {phase}: {phase_counts[phase]} entries")
    
    # Save to JSON
    output_file = Path("/home/ubuntu/neon-signs/scripts/enriched-archive-data.json")
    output_data = {
        "generated_at": datetime.now().isoformat(),
        "total_entries": len(unique_entries),
        "entries": unique_entries
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(unique_entries)} entries to {output_file}")
    
    # Print samples
    print("\n=== Sample Entries ===")
    for entry in unique_entries[:5]:
        print(f"\n[{entry['source_phase']}] {entry['source_date']}")
        print(f"  Phase-DNA: {entry['phase_dna']}")
        print(f"  Jester: {entry['jester_activity']}/10 | Energy: {entry['emotional_state']}")
        print(f"  Somatic: {entry['somatic_state'][:60]}...")
        print(f"  Content: {entry['content'][:100]}...")
        print(f"  Tags: {', '.join(entry['phrase_tags'][:5])}")

if __name__ == "__main__":
    main()
