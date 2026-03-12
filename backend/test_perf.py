import requests
import json
import time

url = "http://localhost:8000/api/generate_book"

with open("large_songs.json", "r") as f:
    songs = json.load(f)

data = {
    "songs_data": json.dumps(songs),
    "export_format": "docx",
    "include_toc": "true",
    "include_dictionary": "true"
}

print(f"Starting generation of {len(songs)} songs...")
start_time = time.time()

try:
    response = requests.post(url, data=data)
    response.raise_for_status()
    duration = time.time() - start_time
    print(f"Success! Time taken: {duration:.2f} seconds")
    
    with open("perf_test_output.docx", "wb") as f:
        f.write(response.content)
    print("DOCX saved to perf_test_output.docx")
except Exception as e:
    print(f"Error: {e}")
