import requests
import json

url = "http://localhost:8000/api/generate_book"

songs = [
    {"song_name": "Song 1", "artist_name": "Artist 1", "key": "C", "content": "C G Am F"},
    {"song_name": "Song 2", "artist_name": "Artist 2", "key": "G", "content": "G D Em C"}
]

data = {
    "songs_data": json.dumps(songs),
    "export_format": "docx"
}

try:
    response = requests.post(url, data=data)
    response.raise_for_status()
    
    with open("test_output.docx", "wb") as f:
        f.write(response.content)
    print("Success! DOCX saved to test_output.docx")
except Exception as e:
    print(f"Error: {e}")
