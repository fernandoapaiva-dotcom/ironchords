import urllib.request, json, urllib.error
req = urllib.request.Request(
    'http://127.0.0.1:8001/api/music/manual',
    data=json.dumps({
        'song_name': 'Espirito Santo',
        'artist_name': 'Vanilda Bordieri',
        'key': '',
        'version': 'Principal',
        'include_tabs': True,
        'capo': 0
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'Origin': 'http://localhost:5173'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode())
