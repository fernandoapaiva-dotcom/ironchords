import requests

def test_api():
    url = "http://127.0.0.1:8000/api/music/manual"
    payload1 = {
        "song_name": "SNOW",
        "artist_name": "RED HOT CHILLI PEPERS",
        "key": "",
        "version": "Principal",
        "include_tabs": True,
        "capo": 0
    }
    payload2 = {
        "song_name": "O NOSSO GENERAL É CRISTO (FOR THE LORD) - BEST SONG GOSPEL",
        "artist_name": "ADHEMAR DE CAMPOS",
        "key": "",
        "version": "Principal",
        "include_tabs": True,
        "capo": 0
    }
    
    for p in [payload1, payload2]:
        print(f"Testing {p['song_name']}...")
        try:
            r = requests.post(url, json=p)
            print("Status:", r.status_code)
            if r.status_code == 200:
                print("Success! Got content length:", len(r.json().get('content', '')))
            else:
                try:
                    res = r.json()
                    print("Suggestions:")
                    for s in res.get('detail', {}).get('suggestions', [])[:5]:
                        print(f" - {s.get('song')} / {s.get('artist')}")
                except:
                    print(r.text)
        except Exception as e:
            print("Request failed:", str(e))
        print()

test_api()
