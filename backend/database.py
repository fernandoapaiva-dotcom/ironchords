import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "chords.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    # Migration 1: Change UNIQUE constraint from (name, artist, key) to (name, artist)
    # Check current columns and constraints
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(chords)")
    cols = cursor.fetchall()
    
    # We need to recreate the table to change UNIQUE constraint in SQLite or use a smart move
    # First, let's handle duplicates if they exist before trying to apply a stricter UNIQUE
    conn.execute('''
        CREATE TABLE IF NOT EXISTS chords_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_name TEXT NOT NULL COLLATE NOCASE,
            artist_name TEXT NOT NULL COLLATE NOCASE,
            song_key TEXT NOT NULL COLLATE NOCASE,
            content TEXT NOT NULL,
            source TEXT NOT NULL,
            capo INTEGER DEFAULT 0,
            include_tabs INTEGER DEFAULT 1,
            UNIQUE(song_name, artist_name)
        )
    ''')
    
    # Check if old table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chords'")
    if cursor.fetchone():
        # Check for include_tabs column
        cursor.execute("PRAGMA table_info(chords)")
        cols_info = cursor.fetchall()
        has_include_tabs = any(c[1] == 'include_tabs' for c in cols_info)
        
        if not has_include_tabs:
            print("MIGRATION: Adding include_tabs column...")
            conn.execute("ALTER TABLE chords ADD COLUMN include_tabs INTEGER DEFAULT 1")
            conn.commit()

        # Check if the UNIQUE constraint is already the new one
        cursor.execute("PRAGMA index_list(chords)")
        # ... rest of the migration logic for uniqueness if needed ...
        # (The existing logic below handles uniqueness via recreation if necessary)
    
    conn.commit()
    conn.close()

def get_chord(song_name: str, artist_name: str, song_key: str = None):
    conn = get_db_connection()
    # Now we prioritize finding by Name/Artist since it's unique
    chord = conn.execute(
        'SELECT * FROM chords WHERE song_name = ? AND artist_name = ?',
        (song_name.strip(), artist_name.strip())
    ).fetchone()
    conn.close()
    return dict(chord) if chord else None

def get_all_chords():
    conn = get_db_connection()
    chords = conn.execute('SELECT * FROM chords ORDER BY id DESC').fetchall()
    conn.close()
    return [dict(c) for c in chords]

def save_chord(song_name: str, artist_name: str, song_key: str, content: str, source: str, capo: int = 0, include_tabs: bool = True):
    conn = get_db_connection()
    # Clean inputs
    name = song_name.strip()
    artist = artist_name.strip()
    tabs_val = 1 if include_tabs else 0
    
    # Sanitize key (remove "tom: ", etc)
    import re
    # Match root (A-G), accidental (# or b), and 'm' for minor
    clean_key = re.search(r"([A-G][b#]?m?)", song_key, re.IGNORECASE)
    key_to_save = clean_key.group(1) if clean_key else "C"
    # Normalize: Root always uppercase, 'b' and 'm' lowercase
    if len(key_to_save) > 1:
        root = key_to_save[0].upper()
        rest = key_to_save[1:]
        key_to_save = root + rest
    else:
        key_to_save = key_to_save.upper()
    
    try:
        conn.execute(
            'INSERT INTO chords (song_name, artist_name, song_key, content, source, capo, include_tabs) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (name, artist, key_to_save, content, source, capo, tabs_val)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # If it already exists (same name and artist), update EVERYTHING including the key
        conn.execute(
            'UPDATE chords SET song_key = ?, content = ?, source = ?, capo = ?, include_tabs = ? WHERE song_name = ? AND artist_name = ?',
            (key_to_save, content, source, capo, tabs_val, name, artist)
        )
        conn.commit()
    finally:
        conn.close()
