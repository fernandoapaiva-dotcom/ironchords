import sqlite3
import os

DB_PATH = "c:/Projetos/Anti Gravity/Caminho das Cifras/backend/chords.db"

def migrate_to_key_unique():
    if not os.path.exists(DB_PATH):
        print("DB not found")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Backup current data
    cursor.execute("SELECT id, song_name, artist_name, song_key, content, source FROM chords")
    rows = cursor.fetchall()
    
    # 2. Drop old table
    cursor.execute("DROP TABLE chords")
    
    # 3. Create new table with UNIQUE(song_name, artist_name, song_key)
    cursor.execute('''
        CREATE TABLE chords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_name TEXT NOT NULL COLLATE NOCASE,
            artist_name TEXT NOT NULL COLLATE NOCASE,
            song_key TEXT NOT NULL COLLATE NOCASE,
            content TEXT NOT NULL,
            source TEXT NOT NULL,
            UNIQUE(song_name, artist_name, song_key)
        )
    ''')
    
    # 4. Re-insert data
    # We use COLLATE NOCASE on song_key too for safety
    for row in rows:
        rid, name, artist, key, content, source = row
        try:
            cursor.execute(
                "INSERT INTO chords (song_name, artist_name, song_key, content, source) VALUES (?, ?, ?, ?, ?)",
                (name, artist, key, content, source)
            )
        except sqlite3.IntegrityError:
            # Skip if for some reason we have exact duplicates now (shouldn't happen with previous clean)
            pass
            
    conn.commit()
    conn.close()
    print("Migration to multi-key (Name, Artist, Key) complete.")

if __name__ == "__main__":
    migrate_to_key_unique()
