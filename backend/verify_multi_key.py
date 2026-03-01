import sys
import os
import sqlite3

sys.path.append('c:/Projetos/Anti Gravity/Caminho das Cifras/backend')

from database import save_chord, get_chord

def verify_multi_key():
    print("--- VERIFYING MULTI-KEY SUPPORT ---")
    song = "Terra Seca Test"
    artist = "Agape Test"
    content_d = "Content in D"
    content_c = "Content in C"
    
    # Save in D
    save_chord(song, artist, "D", content_d, "test")
    # Save in C (should not overwrite D now)
    save_chord(song, artist, "C", content_c, "test")
    
    # Verify both exist
    conn = sqlite3.connect("c:/Projetos/Anti Gravity/Caminho das Cifras/backend/chords.db")
    cursor = conn.cursor()
    cursor.execute("SELECT song_name, song_key FROM chords WHERE song_name = ?", (song,))
    rows = cursor.fetchall()
    conn.close()
    
    print(f"Records found for '{song}': {rows}")
    
    if len(rows) >= 2:
        print("\nSUCCESS: Multiple keys supported for the same song!")
    else:
        print("\nFAILURE: Multi-key constraint failed.")
        
    # Cleanup
    conn = sqlite3.connect("c:/Projetos/Anti Gravity/Caminho das Cifras/backend/chords.db")
    conn.execute("DELETE FROM chords WHERE song_name = ?", (song,))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    verify_multi_key()
