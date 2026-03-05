import re
import requests

def clean_song_name(name: str) -> str:
    if not name: return ""
    name = re.sub(r'[\(\[].*?[\)\]]', '', name)
    name = name.split(" - ")[0].split(" – ")[0]
    return " ".join(name.split())

def search_suggestions(q: str):
    url = "https://solr.sscdn.co/cc/c7/"
    params = {"q": q, "limit": 10}
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, params=params, headers=headers)
    return r.json()

song = "O Nosso General É Cristo (For The Lord) -  Best Song Gospel"
artist = "Adhemar de Campos"

song_clean = clean_song_name(song).split(" - ")[0].split(" – ")[0].strip()
artist_clean = clean_song_name(artist)
artist_first_words = " ".join(artist_clean.split()[:2])

s_results_clean = search_suggestions(f"{song_clean} {artist_first_words}".strip())
s_results_orig = search_suggestions(f"{song} {artist}".strip())
s_results_song_only = search_suggestions(song_clean)

print(f"Original: '{song}'")
print(f"Cleaned 1: '{song_clean}'")
print(f"Query 1: '{song_clean} {artist_first_words}' -> {len(s_results_clean.get('response', {}).get('docs', []))} results")
print(f"Query 2: '{song} {artist}' -> {len(s_results_orig.get('response', {}).get('docs', []))} results")
print(f"Query 3: '{song_clean}' -> {len(s_results_song_only.get('response', {}).get('docs', []))} results")
