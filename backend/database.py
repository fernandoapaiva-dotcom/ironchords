import sqlite3
import os
import re
from typing import Optional, cast

DB_PATH = os.path.join(os.path.dirname(__file__), "chords.db")
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if DATABASE_URL:
        import urllib.parse
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        # Parse for psycopg2
        result = urllib.parse.urlparse(DATABASE_URL)
        username = result.username
        password = result.password
        database = result.path[1:]
        hostname = result.hostname
        port = result.port
        
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        # We don't set row_factory here, we use DictCursor in executes if needed, 
        # but to keep compatibility with existing code that expects dict-like access:
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = DATABASE_URL is not None
    
    # helper for cross-db compatibility
    def db_exec(sql, params=None):
        if is_postgres:
            # Postgres uses %s instead of ?
            sql = sql.replace('?', '%s')
            # Postgres doesn't like AUTOINCREMENT keyword in PRIMARY KEY
            sql = sql.replace('AUTOINCREMENT', '')
            # Postgres uses SERIAL for autoincrement
            if 'INTEGER PRIMARY KEY' in sql and 'AUTOINCREMENT' not in sql:
                 # Only replace if it's a CREATE TABLE
                 if 'CREATE TABLE' in sql:
                     sql = sql.replace('INTEGER PRIMARY KEY', 'SERIAL PRIMARY KEY')
        
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)

    # Check if table exists (portable-ish)
    if is_postgres:
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chords')")
        has_chords = cursor.fetchone()[0]
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chords'")
        has_chords = cursor.fetchone() is not None

    if not has_chords:
        db_exec('''
            CREATE TABLE chords (
                id SERIAL PRIMARY KEY,
                song_name TEXT NOT NULL,
                artist_name TEXT NOT NULL,
                song_key TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                version TEXT NOT NULL DEFAULT 'Principal',
                capo INTEGER DEFAULT 0,
                include_tabs INTEGER DEFAULT 1,
                UNIQUE(song_name, artist_name, version)
            )
        ''')
    else:
        # Migration logic simplified for Postgres (assuming fresh start or already migrated)
        # For SQLite we keep the old logic but use db_exec
        if not is_postgres:
            cursor.execute("PRAGMA table_info(chords)")
            cols_info = cursor.fetchall()
            col_names = [c[1] for c in cols_info]
            
            if 'version' not in col_names:
                cursor.execute("ALTER TABLE chords ADD COLUMN version TEXT NOT NULL DEFAULT 'Principal'")
            if 'capo' not in col_names:
                cursor.execute("ALTER TABLE chords ADD COLUMN capo INTEGER DEFAULT 0")
            if 'include_tabs' not in col_names:
                cursor.execute("ALTER TABLE chords ADD COLUMN include_tabs INTEGER DEFAULT 1")

    # Users table
    if is_postgres:
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
        has_users = cursor.fetchone()[0]
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        has_users = cursor.fetchone() is not None

    if not has_users:
        db_exec('''
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
    # Playlists table
    if is_postgres:
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlists')")
        has_playlists = cursor.fetchone()[0]
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='playlists'")
        has_playlists = cursor.fetchone() is not None

    if not has_playlists:
        db_exec('''
            CREATE TABLE playlists (
                id SERIAL PRIMARY KEY,
                user_email TEXT NOT NULL,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email, name)
            )
        ''')
        
    # Short Links table
    if is_postgres:
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'short_links')")
        has_links = cursor.fetchone()[0]
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='short_links'")
        has_links = cursor.fetchone() is not None

    if not has_links:
        db_exec('''
            CREATE TABLE short_links (
                id SERIAL PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

    # Always ensure admin is authorized
    admin_email = "fernandomaragao89@gmail.com"
    try:
        db_exec('INSERT INTO users (email, status) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET status = ?', (admin_email, 'authorized', 'authorized'))
    except:
        # Fallback for SQLite which doesn't support ON CONFLICT... DO UPDATE or has different syntax
        db_exec('INSERT OR IGNORE INTO users (email, status) VALUES (?, ?)', (admin_email, 'authorized'))
        db_exec("UPDATE users SET status = 'authorized' WHERE email = ?", (admin_email,))
        
    conn.commit()
    conn.close()

def _exec_select(sql, params=None):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    if is_postgres:
        from psycopg2.extras import RealDictCursor
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        sql = sql.replace('?', '%s')
    else:
        cursor = conn.cursor()
    
    if params:
        cursor.execute(sql, params)
    else:
        cursor.execute(sql)
    
    results = cursor.fetchall()
    conn.close()
    return [dict(r) for r in results]

def _exec_write(sql, params=None):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    cursor = conn.cursor()
    if is_postgres:
        sql = sql.replace('?', '%s')
    
    try:
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        conn.commit()
        return True
    except Exception as e:
        print(f"Write error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_all_users():
    return _exec_select("SELECT * FROM users ORDER BY created_at DESC")

def register_user(email: str):
    email = email.lower().strip()
    return _exec_write('INSERT INTO users (email, status) VALUES (?, ?) ON CONFLICT (email) DO NOTHING', (email, 'pending'))

def authorize_user(email: str):
    return _exec_write("UPDATE users SET status = 'authorized' WHERE email = ?", (email.lower().strip(),))

def deauthorize_user(email: str):
    return _exec_write("UPDATE users SET status = 'pending' WHERE email = ?", (email.lower().strip(),))

def delete_user(email: str):
    return _exec_write("DELETE FROM users WHERE email = ?", (email.lower().strip(),))

def check_user_status(email: str):
    res = _exec_select("SELECT status FROM users WHERE email = ?", (email.lower().strip(),))
    if res:
        return res[0]['status']
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

def get_user_playlists(email: str):
    conn = get_db_connection()
    playlists = conn.execute("SELECT * FROM playlists WHERE user_email = ?", (email.strip(),)).fetchall()
    conn.close()
    return [dict(p) for p in playlists]

def save_user_playlist(email: str, name: str, data_json: str):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO playlists (user_email, name, data) VALUES (?, ?, ?)',
            (email.strip(), name.strip(), data_json)
        )
    except sqlite3.IntegrityError:
        conn.execute(
            'UPDATE playlists SET data = ? WHERE user_email = ? AND name = ?',
            (data_json, email.strip(), name.strip())
        )
    conn.commit()
    conn.close()

def delete_user_playlist(email: str, name: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM playlists WHERE user_email = ? AND name = ?", (email.strip(), name.strip()))
    conn.commit()
    conn.close()

def save_short_link(slug: str, data_json: str):
    conn = get_db_connection()
    conn.execute('INSERT INTO short_links (slug, data) VALUES (?, ?)', (slug, data_json))
    conn.commit()
    conn.close()

def get_short_link(slug: str):
    conn = get_db_connection()
    res = conn.execute('SELECT data FROM short_links WHERE slug = ?', (slug,)).fetchone()
    conn.close()
    return res['data'] if res else None
