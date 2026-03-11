import sys
import os
sys.path.insert(0, os.path.abspath(r'c:\Projetos\Anti Gravity\Caminho das Cifras\backend'))
from document_generator import generate_docx
import win32com.client

songs = [
    {"song_name": "Song 1", "artist_name": "Artist 1", "content": "Line 1\nLine 2\nLine 3\nLine 4"},
    {"song_name": "Song 2", "artist_name": "Artist 2", "content": "Line 1\nLine 2\nLine 3\nLine 4"},
    {"song_name": "Song 3", "artist_name": "Artist 3", "content": "Line 1\nLine 2\nLine 3\nLine 4"}
]

out_p = generate_docx(songs, output_filename="test_toc_debug.docx")
print(f"Generated docx at {out_p}")

# Now COM
word = win32com.client.Dispatch("Word.Application")
word.Visible = True # Let's see it to debug
word.DisplayAlerts = 0

doc = word.Documents.Open(os.path.abspath(out_p))
word.ActiveWindow.View.Type = 3 # print view

print("Repaginating...")
doc.Repaginate()
print("Updating Fields...")
doc.Fields.Update()
if doc.TablesOfContents.Count > 0:
    print("Updating TOC...")
    doc.TablesOfContents(1).Update()
    print("TOC Updated.")

# Wait for a moment to see it?
import time
time.sleep(2)

doc.Save()
doc.Close()
word.Quit()
print("Done.")
