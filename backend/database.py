import sqlite3
import os
import re
from typing import Optional, cast

DB_PATH = os.path.join(os.path.dirname(__file__), "chords.db")
DATABASE_URL = os.environ.get("DATABASE_URL")
LAST_DB_ERROR = None

def get_db_connection():
    global LAST_DB_ERROR
    if DATABASE_URL:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        import time as _time
        
        # Normalize postgres:// to postgresql:// for psycopg2
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
            
        # Enforce SSL for hosted providers if not specified
        if "sslmode" not in url:
            separator = "&" if "?" in url else "?"
            url += f"{separator}sslmode=require"
        
        # Add connection timeout to avoid long hangs
        if "connect_timeout" not in url:
            separator = "&" if "?" in url else "?"
            url += f"{separator}connect_timeout=10"
        
        # Retry logic for robust startup
        for attempt in range(3):
            try:
                conn = psycopg2.connect(url)
                LAST_DB_ERROR = None
                return conn
            except Exception as e:
                LAST_DB_ERROR = str(e)
                print(f"[DB] Connection attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    _time.sleep(2)
        if LAST_DB_ERROR:
            raise Exception(f"Database connection failed after 3 attempts: {LAST_DB_ERROR}")
        raise Exception("Failed to connect to database")
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

    try:
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
            # Migration logic simplified for Postgres
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
            db_exec('INSERT INTO users (email, status) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET status = EXCLUDED.status', (admin_email, 'authorized'))
        except Exception as e:
            if is_postgres: conn.rollback()
            print(f"[DB] Initial admin auth failed, trying fallback: {e}")
            try:
                if is_postgres:
                    db_exec('INSERT INTO users (email, status) VALUES (%s, %s) ON CONFLICT DO NOTHING', (admin_email, 'authorized'))
                else:
                    db_exec('INSERT OR IGNORE INTO users (email, status) VALUES (?, ?)', (admin_email, 'authorized'))
                db_exec("UPDATE users SET status = 'authorized' WHERE email = " + ("%s" if is_postgres else "?"), (admin_email,))
            except Exception as e2:
                if is_postgres: conn.rollback()
                print(f"[DB] Final admin auth fallback failed: {e2}")

        conn.commit()
    except Exception as general_err:
        if is_postgres: conn.rollback()
        print(f"[CRITICAL] Database initialization failed: {general_err}")
        raise general_err
    finally:
        conn.close()

def _exec_select(sql, params=None):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    try:
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
        return [dict(r) for r in results]
    except Exception as e:
        print(f"[DB] Select error: {e}")
        return []
    finally:
        conn.close()

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
        print(f"[DB] Write error: {e}")
        if is_postgres:
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
    is_postgres = DATABASE_URL is not None
    v = version if version else "Principal"
    
    try:
        if is_postgres:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(
                'SELECT * FROM chords WHERE song_name = %s AND artist_name = %s AND version = %s',
                (song_name.strip(), artist_name.strip(), v)
            )
        else:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? AND version = ?',
                (song_name.strip(), artist_name.strip(), v)
            )
            
        chord = cursor.fetchone()
        
        if not chord and (not version or version == "Principal"):
             if is_postgres:
                 cursor.execute(
                    'SELECT * FROM chords WHERE song_name = %s AND artist_name = %s LIMIT 1',
                    (song_name.strip(), artist_name.strip())
                )
             else:
                 cursor.execute(
                    'SELECT * FROM chords WHERE song_name = ? AND artist_name = ? LIMIT 1',
                    (song_name.strip(), artist_name.strip())
                )
             chord = cursor.fetchone()

        return dict(chord) if chord else None
    except Exception as e:
        print(f"[DB] Get chord error: {e}")
        return None
    finally:
        conn.close()

def get_all_chords():
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    try:
        if is_postgres:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute('SELECT * FROM chords ORDER BY id DESC')
        else:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM chords ORDER BY id DESC')
        
        chords = cursor.fetchall()
        return [dict(c) for c in chords]
    except Exception as e:
        print(f"[DB] Get all chords error: {e}")
        return []
    finally:
        conn.close()

def save_chord(song_name: str, artist_name: str, song_key: str, content: str, source: str, capo: int = 0, include_tabs: bool = True, version: str = "Principal"):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    cursor = conn.cursor()
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
        sql = 'INSERT INTO chords (song_name, artist_name, song_key, content, source, capo, include_tabs, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        if is_postgres: sql = sql.replace('?', '%s')
        cursor.execute(sql, (name, artist, key_to_save, content, source, capo, tabs_val, v))
        conn.commit()
    except Exception:
        if is_postgres: conn.rollback()
        try:
            sql = 'UPDATE chords SET song_key = ?, content = ?, source = ?, capo = ?, include_tabs = ? WHERE song_name = ? AND artist_name = ? AND version = ?'
            if is_postgres: sql = sql.replace('?', '%s')
            cursor.execute(sql, (key_to_save, content, source, capo, tabs_val, name, artist, v))
            conn.commit()
        except Exception as e:
            if is_postgres: conn.rollback()
            print(f"[DB] Save chord error: {e}")
    finally:
        conn.close()

def get_user_playlists(email: str):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    try:
        if is_postgres:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM playlists WHERE user_email = %s", (email.strip(),))
        else:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM playlists WHERE user_email = ?", (email.strip(),))
        
        playlists = cursor.fetchall()
        return [dict(p) for p in playlists]
    except Exception as e:
        print(f"[DB] Get playlists error: {e}")
        return []
    finally:
        conn.close()

def save_user_playlist(email: str, name: str, data_json: str):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    cursor = conn.cursor()
    try:
        sql = 'INSERT INTO playlists (user_email, name, data) VALUES (?, ?, ?)'
        if is_postgres: sql = sql.replace('?', '%s')
        cursor.execute(sql, (email.strip(), name.strip(), data_json))
        conn.commit()
    except Exception:
        if is_postgres: conn.rollback()
        try:
            sql = 'UPDATE playlists SET data = ? WHERE user_email = ? AND name = ?'
            if is_postgres: sql = sql.replace('?', '%s')
            cursor.execute(sql, (data_json, email.strip(), name.strip()))
            conn.commit()
        except Exception as e:
            if is_postgres: conn.rollback()
            print(f"[DB] Save playlist error: {e}")
    finally:
        conn.close()

def delete_user_playlist(email: str, name: str):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    cursor = conn.cursor()
    try:
        sql = "DELETE FROM playlists WHERE user_email = ? AND name = ?"
        if is_postgres: sql = sql.replace('?', '%s')
        cursor.execute(sql, (email.strip(), name.strip()))
        conn.commit()
    except Exception as e:
        if is_postgres: conn.rollback()
        print(f"[DB] Delete playlist error: {e}")
    finally:
        conn.close()

def save_short_link(slug: str, data_json: str):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    cursor = conn.cursor()
    try:
        sql = 'INSERT INTO short_links (slug, data) VALUES (?, ?)'
        if is_postgres: sql = sql.replace('?', '%s')
        cursor.execute(sql, (slug, data_json))
        conn.commit()
    except Exception as e:
        if is_postgres: conn.rollback()
        print(f"[DB] Save short link error: {e}")
    finally:
        conn.close()

def get_short_link(slug: str):
    conn = get_db_connection()
    is_postgres = DATABASE_URL is not None
    try:
        if is_postgres:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute('SELECT data FROM short_links WHERE slug = %s', (slug,))
        else:
            cursor = conn.cursor()
            cursor.execute('SELECT data FROM short_links WHERE slug = ?', (slug,))
            
        res = cursor.fetchone()
        return res['data'] if res else None
    except Exception as e:
        print(f"[DB] Get short link error: {e}")
        return None
    finally:
        conn.close()
