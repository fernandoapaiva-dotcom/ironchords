import urllib.request, json, urllib.error

# Testing a suggestion that has the same name as original
songs_to_test = [
    ("Deserto", "Maria Marçal"),
    ("Quero Louvar-te", "Músicas Católicas"),
    ("Quero Louvar-te", "Paulo Cesar Baruk"),
]

for song, artist in songs_to_test:
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/music/manual',
        data=json.dumps({
            'song_name': song, 'artist_name': artist,
            'key': '', 'version': 'Principal',
            'include_tabs': True, 'capo': 0
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req, timeout=30)
        data = json.loads(res.read().decode())
        print(f"OK: {song} - {artist} => key={data.get('song_key')}, content_len={len(data.get('content',''))}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"FAIL ({e.code}): {song} - {artist}")
        detail = json.loads(body).get('detail', {})
        print(f"  msg: {detail.get('message','?')}")
        sug = detail.get('suggestions', [])
        print(f"  suggestions: {[s['song']+' - '+s['artist'] for s in sug[:3]]}")
    print()
