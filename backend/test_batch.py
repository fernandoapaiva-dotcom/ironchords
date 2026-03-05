import requests

def test_api():
    url = "http://127.0.0.1:8000/api/music/batch"
    payload = {
        "songs": [
            {
                "song_name": "O NOSSO GENERAL É CRISTO (FOR THE LORD) - BEST SONG GOSPEL",
                "artist_name": "ADHEMAR DE CAMPOS",
                "key": "",
                "version": "Principal",
                "include_tabs": True,
                "capo": 0
            }
        ]
    }
    
    print("Testing Batch Endpoint...")
    try:
        r = requests.post(url, json=payload)
        print("Status:", r.status_code)
        
        if r.status_code == 200:
            res = r.json()
            for item in res.get('results', []):
                print(f"Status for {item.get('song_name')}: {item.get('status')}")
                if item.get('status') == 'success':
                    print("Success! Got content length:", len(item.get('content', '')))
                else:
                    suggs = item.get('suggestions', [])
                    print(f"Failed. Got {len(suggs)} suggestions.")
                    for s in suggs[:3]:
                        print(f" - {s.get('song')} / {s.get('artist')}")
        else:
            print(r.text)
    except Exception as e:
        print("Request failed:", str(e))

test_api()
