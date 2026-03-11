import sys
import os
sys.path.insert(0, os.path.abspath(r'c:\Projetos\Anti Gravity\Caminho das Cifras\backend'))
from document_generator import generate_docx
import time

songs = [
    {"song_name": "Song 1", "artist_name": "Artist 1", "content": "Line 1\n" * 50},
    {"song_name": "Song 2", "artist_name": "Artist 2", "content": "Line 1\n" * 50},
    {"song_name": "Song 3", "artist_name": "Artist 3", "content": "Line 1\n" * 50}
]

out_p = generate_docx(songs, output_filename="test_toc_debug_2.docx")
print(f"Generated docx at {out_p}")

import win32com.client
word = win32com.client.DispatchEx("Word.Application")
try:
    word.Visible = False
    doc = word.Documents.Open(os.path.abspath(out_p))
    try:
        print("TOC count:", doc.TablesOfContents.Count)
        if doc.TablesOfContents.Count > 0:
            doc.Repaginate()
            doc.TablesOfContents(1).Update()
            print("TOC text after Update():")
            print(doc.TablesOfContents(1).Range.Text)
    except Exception as inner:
        print("Inner error:", inner)
    finally:
        doc.Close(SaveChanges=True)
finally:
    word.Quit()
