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
    
    # Chords table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chords'")
    has_chords = cursor.fetchone() is not None

    if not has_chords:
        conn.execute('''
            CREATE TABLE chords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_name TEXT NOT NULL COLLATE NOCASE,
                artist_name TEXT NOT NULL COLLATE NOCASE,
                song_key TEXT NOT NULL COLLATE NOCASE,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                version TEXT NOT NULL DEFAULT 'Principal' COLLATE NOCASE,
                capo INTEGER DEFAULT 0,
                include_tabs INTEGER DEFAULT 1,
                UNIQUE(song_name, artist_name, version)
            )
        ''')
    else:
        cursor.execute("PRAGMA table_info(chords)")
        cols_info = cursor.fetchall()
        col_names = [c[1] for c in cols_info]
        
        if 'version' not in col_names:
            conn.execute("ALTER TABLE chords ADD COLUMN version TEXT NOT NULL DEFAULT 'Principal' COLLATE NOCASE")
            
        if 'capo' not in col_names:
            conn.execute("ALTER TABLE chords ADD COLUMN capo INTEGER DEFAULT 0")
            
        if 'include_tabs' not in col_names:
            conn.execute("ALTER TABLE chords ADD COLUMN include_tabs INTEGER DEFAULT 1")
            
        conn.execute('DROP TABLE IF EXISTS chords_tmp')
        conn.execute('''
            CREATE TABLE chords_tmp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_name TEXT NOT NULL COLLATE NOCASE,
                artist_name TEXT NOT NULL COLLATE NOCASE,
                song_key TEXT NOT NULL COLLATE NOCASE,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                version TEXT NOT NULL DEFAULT 'Principal' COLLATE NOCASE,
                capo INTEGER DEFAULT 0,
                include_tabs INTEGER DEFAULT 1,
                UNIQUE(song_name, artist_name, version)
            )
        ''')
        
        conn.execute('''
            INSERT OR IGNORE INTO chords_tmp (id, song_name, artist_name, song_key, content, source, version, capo, include_tabs)
            SELECT id, song_name, artist_name, song_key, content, source, 
                   IFNULL(version, 'Principal'), IFNULL(capo, 0), IFNULL(include_tabs, 1) FROM chords
        ''')
        
        conn.execute('DROP TABLE chords')
        conn.execute('ALTER TABLE chords_tmp RENAME TO chords')

    # Users table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if cursor.fetchone() is None:
        conn.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
    # Always ensure admin is authorized
    admin_email = "fernando.m.aragao89@gmail.com"
    conn.execute('INSERT OR IGNORE INTO users (email, status) VALUES (?, ?)', (admin_email, 'authorized'))
    conn.execute("UPDATE users SET status = 'authorized' WHERE email = ?", (admin_email,))
        
    conn.commit()
    conn.close()

def get_all_users():
    conn = get_db_connection()
    users = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(u) for u in users]

def register_user(email: str):
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (email, status) VALUES (?, ?)', (email.strip(), 'pending'))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def authorize_user(email: str):
    conn = get_db_connection()
    conn.execute("UPDATE users SET status = 'authorized' WHERE email = ?", (email.strip(),))
    conn.commit()
    conn.close()

def check_user_status(email: str):
    conn = get_db_connection()
    user = conn.execute("SELECT status FROM users WHERE email = ?", (email.strip(),)).fetchone()
    conn.close()
    if user:
        return user['status']
    return None

def get_chord(song_name: str, artist_name: str, song_key: Optional[str] = None, version: Optional[str] = "Principal"):
    conn = get_db_connection()
    v = version if version else "Principal"
    chord = conn.execute(
        'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? AND version = ?',
        (song_name.strip(), artist_name.strip(), v)
    ).fetchone()
    
    if not chord and (not version or version == "Principal"):
         chord = conn.execute(
            'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? LIMIT 1',
            (song_name.strip(), artist_name.strip())
        ).fetchone()

    conn.close()
    return dict(chord) if chord else None

def get_all_chords():
    conn = get_db_connection()
    chords = conn.execute('SELECT * FROM chords ORDER BY id DESC').fetchall()
    conn.close()
    return [dict(c) for c in chords]

def save_chord(song_name: str, artist_name: str, song_key: str, content: str, source: str, capo: int = 0, include_tabs: bool = True, version: str = "Principal"):
    conn = get_db_connection()
    name = song_name.strip()
    artist = artist_name.strip()
    v = version if version else "Principal"
    tabs_val = 1 if include_tabs else 0
    
    clean_key_match = re.search(r"([A-G][b#]?m?)", song_key, re.IGNORECASE)
    key_to_save: str = cast(str, clean_key_match.group(1)) if clean_key_match else "C"
    if len(key_to_save) > 1:
        root = key_to_save[0].upper()
        rest = key_to_save[1:].lower() # type: ignore
        key_to_save = root + rest
    else:
        key_to_save = key_to_save.upper()
    
    try:
        conn.execute(
            'INSERT INTO chords (song_name, artist_name, song_key, content, source, capo, include_tabs, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (name, artist, key_to_save, content, source, capo, tabs_val, v)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.execute(
            'UPDATE chords SET song_key = ?, content = ?, source = ?, capo = ?, include_tabs = ? WHERE song_name = ? AND artist_name = ? AND version = ?',
            (key_to_save, content, source, capo, tabs_val, name, artist, v)
        )
        conn.commit()
    finally:
        conn.close()
