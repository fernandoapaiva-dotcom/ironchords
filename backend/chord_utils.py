import re

NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_TO_SHARP = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}

def normalize_note(note: str) -> str:
    if not note: return note
    # Standardize to Title Case for 2-char notes (e.g. ab -> Ab, d# -> D#)
    if len(note) > 1:
        n = note[0].upper() + note[1:].lower()
    else:
        n = note.upper()
    return FLAT_TO_SHARP.get(n, n)

def get_note_index(note: str) -> int:
    n = normalize_note(note)
    if n in NOTES:
        return NOTES.index(n)
    return -1

def get_sounding_key(base_key: str, capo: int) -> str:
    if not base_key or capo == 0:
        return base_key
        
    match = re.search(r"([A-G][b#]?)", base_key, re.IGNORECASE)
    if not match:
        return base_key
        
    note = match.group(1)
    rest = base_key[match.end():]
    
    idx = get_note_index(note)
    if idx == -1:
        return base_key
        
    new_idx = (idx + capo) % 12
    new_note = NOTES[new_idx]
    
    return f"{new_note}{rest}"

def transpose_chord(chord: str, semitones: int) -> str:
    match = re.match(r"^([A-G][b#]?)(.*)$", chord)
    if not match:
        return chord
        
    base_note = match.group(1)
    rest = match.group(2)
    
    idx = get_note_index(base_note)
    if idx == -1:
        return chord
        
    new_idx = (idx + semitones) % 12
    new_note = NOTES[new_idx]
    
    return f"{new_note}{rest}"

def get_semitones_diff(from_key: str, to_key: str) -> int:
    match_from = re.search(r"([A-G][b#]?)", from_key, re.IGNORECASE)
    match_to = re.search(r"([A-G][b#]?)", to_key, re.IGNORECASE)
    if not match_from or not match_to:
        return 0
        
    idx_from = get_note_index(match_from.group(1))
    idx_to = get_note_index(match_to.group(1))
    
    if idx_from == -1 or idx_to == -1:
        return 0
        
    return (idx_to - idx_from) % 12

def process_chords(content: str, from_key: str, to_key: str) -> str:
    if from_key == to_key or not from_key or not to_key:
        return content
        
    semitones = get_semitones_diff(from_key, to_key)
    if semitones == 0:
        return content
        
    lines = content.split('\n')
    processed_lines = []
    
    # regex for chords like C7M, C#m7, G/B, Asus4, etc
    # We use lookarounds to ensure the chord is not part of a larger word
    chord_regex = re.compile(r"(?<![a-zA-Z0-9])(?P<chord>[A-G][b#]?(?:m|maj|M|min|dim|aug|sus|add|7|9|11|13|2|4|5|6|#|\+)*?(?:/[A-G][b#]?(?:m|M|min|7|9|sus|add)*)?)(?![a-zA-Z0-9])")
    
    for line in lines:
        words = line.split()
        if not words:
            processed_lines.append(line)
            continue
            
        chord_count = sum(1 for w in words if chord_regex.search(w))
        # If line consists mainly of chords
        if chord_count > 0 and chord_count / len(words) > 0.4:
            new_line = ""
            i = 0
            while i < len(line):
                match = chord_regex.search(line, i)
                if not match:
                    new_line += line[i:]
                    break
                    
                start, end = match.span()
                new_line += line[i:start]
                original_chord = match.group('chord')
                
                # Check for bass slash chords
                if '/' in original_chord:
                    parts = original_chord.split('/')
                    transposed = f"{transpose_chord(parts[0], semitones)}/{transpose_chord(parts[1], semitones)}"
                else:
                    transposed = transpose_chord(original_chord, semitones)
                    
                new_line += transposed
                i = end
                
            processed_lines.append(new_line)
        else:
            processed_lines.append(line)
            
    return "\n".join(processed_lines)
