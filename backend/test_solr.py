import requests

def test_solr(q: str):
    url = "https://solr.sscdn.co/cc/c7/"
    params = {"q": q, "limit": 10}
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.cifraclub.com.br/"
    }
    r = requests.get(url, params=params, headers=headers)
    docs = r.json().get("response", {}).get("docs", [])
    print(f"Results for '{q}':")
    for d in docs:
        print(f" - {d.get('txt')} / {d.get('art')}")
    print()

test_solr("snow")
test_solr("snow red hot")
test_solr("o nosso general é cristo")
test_solr("O Nosso General É Cristo (For The Lord)")
