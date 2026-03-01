import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "chords.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS chords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_name TEXT NOT NULL COLLATE NOCASE,
            artist_name TEXT NOT NULL COLLATE NOCASE,
            song_key TEXT NOT NULL COLLATE NOCASE,
            content TEXT NOT NULL,
            source TEXT NOT NULL,
            UNIQUE(song_name, artist_name, song_key)
        )
    ''')
    conn.commit()
    conn.close()

def get_chord(song_name: str, artist_name: str, song_key: str = None):
    conn = get_db_connection()
    if song_key:
        chord = conn.execute(
            'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? AND song_key = ?',
            (song_name.strip(), artist_name.strip(), song_key.strip())
        ).fetchone()
    else:
        # Fallback to any version if key not specified
        chord = conn.execute(
            'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? LIMIT 1',
            (song_name.strip(), artist_name.strip())
        ).fetchone()
    conn.close()
    return dict(chord) if chord else None

def save_chord(song_name: str, artist_name: str, song_key: str, content: str, source: str):
    conn = get_db_connection()
    # Clean inputs
    name = song_name.strip()
    artist = artist_name.strip()
    
    # Sanitize key (remove "tom: ", etc)
    import re
    # Match root (A-G), accidental (# or b), and 'm' for minor
    clean_key = re.search(r"([A-G][b#]?m?)", song_key, re.IGNORECASE)
    key_to_save = clean_key.group(1) if clean_key else "C"
    # Normalize: Root always uppercase, 'b' and 'm' lowercase
    # Example: c#m -> C#m, eb -> Eb
    if len(key_to_save) > 1:
        root = key_to_save[0].upper()
        rest = key_to_save[1:]
        key_to_save = root + rest
    else:
        key_to_save = key_to_save.upper()
    
    try:
        conn.execute(
            'INSERT INTO chords (song_name, artist_name, song_key, content, source) VALUES (?, ?, ?, ?, ?)',
            (name, artist, key_to_save, content, source)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # If it already exists (same name, artist, and key), update it
        conn.execute(
            'UPDATE chords SET content = ?, source = ? WHERE song_name = ? AND artist_name = ? AND song_key = ?',
            (content, source, name, artist, key_to_save)
        )
        conn.commit()
    finally:
        conn.close()
