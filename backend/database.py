import sqlite3
import os
import re
from typing import Optional, cast

DB_PATH = os.path.join(os.path.dirname(__file__), "chords.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chords'")
    has_chords = cursor.fetchone() is not None

    if not has_chords:
        # Create fresh table
        conn.execute('''
            CREATE TABLE chords (
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
    else:
        # Check columns for migration
        cursor.execute("PRAGMA table_info(chords)")
        cols_info = cursor.fetchall()
        col_names = [c[1] for c in cols_info]
        
        # Add capo if missing
        if 'capo' not in col_names:
            print("MIGRATION: Adding capo column...")
            conn.execute("ALTER TABLE chords ADD COLUMN capo INTEGER DEFAULT 0")
            
        # Add include_tabs if missing
        if 'include_tabs' not in col_names:
            print("MIGRATION: Adding include_tabs column...")
            conn.execute("ALTER TABLE chords ADD COLUMN include_tabs INTEGER DEFAULT 1")
            
        # Recreate table to update UNIQUE constraint to (song_name, artist_name)
        conn.execute('DROP TABLE IF EXISTS chords_tmp')
        conn.execute('''
            CREATE TABLE chords_tmp (
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
        
        # Copy data using only the columns that exist in the temporary table to be safe
        conn.execute('''
            INSERT OR IGNORE INTO chords_tmp (id, song_name, artist_name, song_key, content, source, capo, include_tabs)
            SELECT id, song_name, artist_name, song_key, content, source, capo, include_tabs FROM chords
        ''')
        
        conn.execute('DROP TABLE chords')
        conn.execute('ALTER TABLE chords_tmp RENAME TO chords')
        
    conn.commit()
    conn.close()

def get_chord(song_name: str, artist_name: str, song_key: Optional[str] = None):
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
    # Match root (A-G), accidental (# or b), and 'm' for minor
    clean_key_match = re.search(r"([A-G][b#]?m?)", song_key, re.IGNORECASE)
    key_to_save: str = cast(str, clean_key_match.group(1)) if clean_key_match else "C"
    # Normalize: Root always uppercase, 'b' and 'm' lowercase
    if len(key_to_save) > 1:
        root = key_to_save[0].upper()
        rest = key_to_save[1:].lower()  # type: ignore
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
