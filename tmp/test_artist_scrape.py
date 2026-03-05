import requests
from bs4 import BeautifulSoup
import re
import unicodedata

def get_slug(name: str) -> str:
    n = name.lower().strip()
    n = unicodedata.normalize('NFKD', n).encode('ASCII', 'ignore').decode('ASCII')
    return re.sub(r'[^a-z0-9]+', '-', n).strip('-')

def get_artist_songs(artist_name: str):
    slug = get_slug(artist_name)
    # Alphabetical list is usually cleaner
    url = f"https://www.cifraclub.com.br/{slug}/musicas.html?order=alphabetical"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    print(f"Fetching songs for: {artist_name} ({url})")
    try:
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code != 200:
            print(f"Error: Status {res.status_code}")
            return []
            
        soup = BeautifulSoup(res.text, 'html.parser')
        songs = []
        
        # Use identified pattern to find songs
        all_links = soup.find_all('a', href=True)
        for link in all_links:
            href = link['href']
            # Pattern: /artist-slug/song-slug/
            match = re.match(rf'^/{slug}/([^/]+)/$', href)
            if match:
                title_slug = match.group(1)
                if title_slug in ['letras', 'cifras', 'fotos', 'videos', 'musicas.html', 'discografia', 'seguidores']: continue
                
                title = link.get_text(strip=True)
                if title and len(title) > 1:
                    songs.append({
                        "song": title,
                        "artist": artist_name,
                        "key": None
                    })
        
        # De-duplicate
        seen = set()
        final_songs = []
        for s in songs:
            if s['song'].lower() not in seen:
                seen.add(s['song'].lower())
                final_songs.append(s)
                
        return final_songs
    except Exception as e:
        print(f"Exception: {e}")
        return []

if __name__ == "__main__":
    test_artist = "Skank" # Example
    songs = get_artist_songs(test_artist)
    print(f"Found {len(songs)} songs:")
    for s in songs[:10]:
        print(f"- {s['song']} ({s['url']})")
