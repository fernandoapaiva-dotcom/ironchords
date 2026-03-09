import requests
from bs4 import BeautifulSoup
import re

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

base_url = "https://www.cifraclub.com.br/agape-uma-comunidade-de-amor/quero-louvar-te/"

# Test 1: regular page
r = requests.get(base_url, headers=headers, timeout=15)
print(f"Regular page: {r.status_code}")

# Test 2: print page
print_url = base_url.rstrip("/") + "/imprimir.html"
r2 = requests.get(print_url, headers=headers, timeout=15)
print(f"Print page: {r2.status_code}")

soup = BeautifulSoup(r2.text, 'html.parser')
pre_tags = soup.find_all('pre')
print(f"<pre> count: {len(pre_tags)}")
if pre_tags:
    print(f"Content[:200]: {pre_tags[0].get_text()[:200]!r}")
else:
    # Show first 500 chars of raw HTML to understand the structure
    print("Raw HTML (first 800 chars):")
    print(r2.text[:800])
