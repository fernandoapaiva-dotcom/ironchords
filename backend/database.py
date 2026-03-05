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
            UNIQUE(song_name, artist_name)
        )
    ''')
    
    # Check if old table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chords'")
    if cursor.fetchone():
        # Check if the UNIQUE constraint is already the new one
        cursor.execute("PRAGMA index_list(chords)")
        indexes = cursor.fetchall()
        is_new_schema = False
        for idx in indexes:
            cursor.execute(f"PRAGMA index_info({idx['name']})")
            info = cursor.fetchall()
            cols = [i[2] for i in info]
            if len(cols) == 2 and 'song_name' in cols and 'artist_name' in cols:
                is_new_schema = True
                break
        
        if not is_new_schema:
            print("MIGRATION: Updating chords table to enforce (Song + Artist) uniqueness...")
            # Transfer data: keep only one (the one with the highest ID, usually the latest)
            conn.execute('''
                INSERT OR IGNORE INTO chords_new (song_name, artist_name, song_key, content, source, capo)
                SELECT song_name, artist_name, song_key, content, source, capo
                FROM chords
                ORDER BY id DESC
            ''')
            conn.execute("DROP TABLE chords")
            conn.execute("ALTER TABLE chords_new RENAME TO chords")
    else:
        conn.execute("ALTER TABLE chords_new RENAME TO chords")
        
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

def save_chord(song_name: str, artist_name: str, song_key: str, content: str, source: str, capo: int = 0):
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
    if len(key_to_save) > 1:
        root = key_to_save[0].upper()
        rest = key_to_save[1:]
        key_to_save = root + rest
    else:
        key_to_save = key_to_save.upper()
    
    try:
        conn.execute(
            'INSERT INTO chords (song_name, artist_name, song_key, content, source, capo) VALUES (?, ?, ?, ?, ?, ?)',
            (name, artist, key_to_save, content, source, capo)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        # If it already exists (same name and artist), update EVERYTHING including the key
        conn.execute(
            'UPDATE chords SET song_key = ?, content = ?, source = ?, capo = ? WHERE song_name = ? AND artist_name = ?',
            (key_to_save, content, source, capo, name, artist)
        )
        conn.commit()
    finally:
        conn.close()
