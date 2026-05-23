import requests
from bs4 import BeautifulSoup
import urllib.parse
from typing import Optional, Dict, List
import re

def clean_text(text: str) -> str:
    if not text: return ""
    text = text.replace('\r', '')
    lines = [re.sub(r'[ \t]{2,}', ' ', line) for line in text.split('\n')]
    new_lines = []
    last_was_empty = False
    for line in lines:
        is_empty = not line.strip()
        if is_empty:
            if not last_was_empty:
                new_lines.append("")
            last_was_empty = True
        else:
            new_lines.append(line.rstrip())
            last_was_empty = False
    return '\n'.join(new_lines).strip()

def get_slug(name: str) -> str:
    """Standard slug generator."""
    n = name.lower().strip()
    # Remove accents/special chars if needed, but for now simple replaces
    import unicodedata
    n = unicodedata.normalize('NFKD', n).encode('ASCII', 'ignore').decode('ASCII')
    return re.sub(r'[^a-z0-9]+', '-', n).strip('-')

def scrape_cifraclub(song_name: str, artist_url_name: str, version: Optional[str] = None, include_tabs: bool = True) -> Optional[Dict]:
    s_slug = get_slug(song_name)
    
    # Handle versions (Principal, Simplificada, v2, v3, etc.)
    # Printing URL for versions: https://www.cifraclub.com.br/a-ha/take-on-me/{version}/imprimir.html
    path_version = ""
    if version and version.lower() != "principal":
        # Remove .html if present and use as a path segment
        v_clean = version.lower().replace(".html", "")
        path_version = f"/{v_clean}"
    
    # If artist_url_name already contains the song slug (like from Solr dns: "artist/song")
    if "/" in artist_url_name:
        url = f"https://www.cifraclub.com.br/{artist_url_name}{path_version}/imprimir.html"
        meta_url = f"https://www.cifraclub.com.br/{artist_url_name}{path_version}/"
    else:
        url = f"https://www.cifraclub.com.br/{artist_url_name}/{s_slug}{path_version}/imprimir.html"
        meta_url = f"https://www.cifraclub.com.br/{artist_url_name}/{s_slug}{path_version}/"
    # Fallback to non-print URL if we need meta info like capo
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        meta_res = requests.get(meta_url, headers=headers, timeout=10)
        capo = 0
        if meta_res.status_code == 200:
            # Extract capo from window._ccq in JS
            capo_match = re.search(r'capo:\s*(\d+)', meta_res.text)
            if capo_match:
                capo = int(capo_match.group(1))

        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove tablatures if requested
        if not include_tabs:
            for tab_span in soup.find_all('span', class_='tablatura'):
                tab_span.decompose()
        
        pre_tag = soup.find('pre')
        if not pre_tag: return None
        
        content = pre_tag.get_text()
        
        # Additional cleanup for tab titles if they are outside the span or in other formats
        if not include_tabs:
            # Common patterns: [Tab - Intro], (tab), etc.
            content = re.sub(r'\[Tab\s*-\s*[^\]]+\]', '', content, flags=re.IGNORECASE)
            content = re.sub(r'\(tab\)', '', content, flags=re.IGNORECASE)
            # Remove lines that look like tabs if they weren't in span (e.g. e|---)
            content = re.sub(r'^[a-gA-G]\|-.*$', '', content, flags=re.MULTILINE)
            # Remove multiple empty lines left behind
            content = re.sub(r'\n{3,}', '\n\n', content)
            # Remove leading/trailing spaces on each line to keep it clean
            content = '\n'.join([line.rstrip() for line in content.split('\n')])

        key = "C"
        key_tag = soup.find(id='cifra_tom')
        if key_tag:
            k_text = key_tag.get_text().upper().replace("TOM", "").replace(":", "").strip()
            if k_text: key = k_text.split()[0]
            
        return {
            "song_name": song_name,
            "artist_name": (artist_url_name.split('/')[0] if "/" in artist_url_name else artist_url_name).replace("-", " ").title(),
            "key": key,
            "version": version or "Principal",
            "capo": capo,
            "content": clean_text(content),
            "source": "cifraclub"
        }
    except: return None

def scrape_cifraclub_url(url: str) -> Optional[Dict]:
    if not url.endswith("imprimir.html") and not url.endswith("imprimir.html/"):
        url = url.rstrip("/") + "/imprimir.html"
    
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, 'html.parser')
        
        pre_tag = soup.find('pre')
        if not pre_tag: return None
        content = pre_tag.get_text()
        
        title_h1 = soup.find('h1', class_='t1')
        title = title_h1.text.strip() if title_h1 else "Unknown"
        
        artist_h2 = soup.find('h2', class_='t3')
        artist = artist_h2.text.strip() if artist_h2 else "Unknown"
        
        key = "C"
        key_tag = soup.find(id='cifra_tom')
        if key_tag:
            k_text = key_tag.get_text().upper().replace("TOM", "").replace(":", "").strip()
            if k_text: key = k_text.split()[0]
            
        return {
            "song_name": title,
            "artist_name": artist,
            "key": key,
            "capo": 0,
            "content": clean_text(content),
            "source": "cifraclub_direct_link"
        }
    except: return None

def get_cifraclub_versions(artist_url_name: str, song_slug: str) -> List[Dict]:
    """Fetches all versions of a song from Cifra Club."""
    # List of common variations to try for the artist part if it's "Musicas para Missa"
    artist_candidates = [artist_url_name]
    if artist_url_name == "musicas-para-missa":
        artist_candidates = ["catolicas", "padre-marcelo-rossi", "padre-zeca", "corquinto"] + artist_candidates

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    # Try direct candidates first
    for a_slug in artist_candidates:
        url = f"https://www.cifraclub.com.br/{a_slug}/{song_slug}/"
        versions = []
        try:
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code != 200: continue
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 1. Search for links with specific classes used by CifraClub
            for link in soup.find_all('a', class_=re.compile(r'js-version|c-versions')):
                href = link.get('href', '')
                if not href or song_slug not in href: continue
                
                title_span = link.find('span', title=True) or link.find('span')
                version_name = title_span.get('title') if title_span and title_span.get('title') else (title_span.text.strip() if title_span else "Principal")
                
                version_name = version_name.replace('Cifra: ', '').replace(' (violão e guitarra)', '').strip()

                v_slug = "Principal"
                match = re.search(fr"/{song_slug}/([^#\?]+)", href)
                if match:
                    v_slug = match.group(1).replace('.html', '').strip('/')
                    if not v_slug: v_slug = "Principal"
                
                if not any(v['key'] == v_slug for v in versions):
                    versions.append({"name": version_name, "key": v_slug, "label": version_name})

            # 2. Search sidebar / alternate links
            for side_link in soup.find_all('a', id=re.compile(r'side-')):
                href = side_link.get('href', '')
                if song_slug in href:
                    label = side_link.text.strip() or side_link.get('title', 'Principal')
                    v_slug = "Principal"
                    match = re.search(fr"/{song_slug}/([^#\?]+)", href)
                    if match:
                        v_slug = match.group(1).replace('.html', '').strip('/')
                    
                    if not any(v['key'] == v_slug for v in versions):
                        versions.append({"name": label, "key": v_slug, "label": label})

            if versions:
                # Deduplicate and return
                seen = set()
                final = []
                for v in versions:
                    if v['key'] not in seen:
                        seen.add(v['key'])
                        final.append(v)
                if not any(v['key'] == "Principal" for v in final):
                    final.insert(0, {"name": "Principal", "key": "Principal", "label": "Principal"})
                return final
        except:
            continue

    # 3. Last Resort: Try to find the song via search to get the REAL slugs
    try:
        search_query = f"{song_slug.replace('-', ' ')}".strip()
        search_url = f"https://www.cifraclub.com.br/api/search/suggestions/?q={urllib.parse.quote(search_query)}"
        s_res = requests.get(search_url, headers=headers, timeout=5)
        if s_res.status_code == 200:
            data = s_res.json()
            # Find the best match
            for sug in data:
                # Simple check if current song_slug matches partially
                if song_slug.replace('-', '') in sug.get('url', '').replace('-', ''):
                    # Found a potentially better url: /artist-slug/song-slug/
                    parts = sug.get('url', '').strip('/').split('/')
                    if len(parts) >= 2:
                        new_a = parts[0]
                        new_s = parts[1]
                        if new_a != artist_url_name:
                            # Recursive call with better slugs (only once)
                            return get_cifraclub_versions(new_a, new_s)
    except:
        pass
            
    return [{"name": "Principal", "key": "Principal", "label": "Principal"}]

def scrape_cifras_com_br(song_name: str, artist_name: str) -> Optional[Dict]:
    a_slug = get_slug(artist_name)
    s_slug = get_slug(song_name)
    url = f"https://www.cifras.com.br/cifra/{a_slug}/{s_slug}"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, 'html.parser')
        pre_tag = soup.find('pre', id='core')
        if not pre_tag: return None
        key_tag = soup.find('span', {'data-cy': 'tom-musica'})
        key = key_tag.text.strip() if key_tag else "C"
        return {
            "song_name": song_name,
            "artist_name": artist_name.title(),
            "key": key,
            "content": clean_text(pre_tag.get_text()),
            "source": "cifras.com.br"
        }
    except: return None

def scrape_banana_cifras(song_name: str, artist_name: str) -> Optional[Dict]:
    a_slug = get_slug(artist_name)
    s_slug = get_slug(song_name)
    if not a_slug: return None
    initial = a_slug[0]
    url = f"https://www.bananacifras.com/cifra/{initial}/{a_slug}/{s_slug}"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, 'html.parser')
        pre_tag = soup.find('pre', id='song-pre')
        if not pre_tag: return None
        key = "C"
        key_match = re.search(r"Mudar tom \(([A-G][b#]?m?)\)", response.text)
        if key_match: key = key_match.group(1)
        return {
            "song_name": song_name,
            "artist_name": artist_name.title(),
            "key": key,
            "content": clean_text(pre_tag.get_text()),
            "source": "bananacifras"
        }
    except: return None

def scrape_musicas_para_missa(song_name: str) -> Optional[Dict]:
    s_slug = get_slug(song_name)
    url = f"https://musicasparamissa.com.br/musica/{s_slug}/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        
        response.encoding = response.apparent_encoding
        
        soup = BeautifulSoup(response.text, 'html.parser')
        div_cifra = soup.find('div', id='div-cifra')
        
        if not div_cifra:
            div_cifra = soup.find('pre')
            
        if not div_cifra: return None
        
        for br in div_cifra.find_all("br"):
            br.replace_with("\n")
            
        content = div_cifra.get_text()
        
        key = "C"
        key_match = re.search(r"TOM:\s*([A-G][b#]?m?)", response.text, re.IGNORECASE)
        if key_match: key = key_match.group(1).upper()
        
        cleaned_content = clean_text(content)
        if not cleaned_content: return None
        
        return {
            "song_name": song_name,
            "artist_name": "Músicas para Missa",
            "key": key,
            "content": cleaned_content,
            "source": "musicasparamissa"
        }
    except: return None

def find_chord_cascade(song_name: str, artist_name: str, version: Optional[str] = None, include_tabs: bool = True) -> Optional[Dict]:
    # Try multiple variations of the song name
    s_clean = re.sub(r'[\(\[].*?[\)\]]', '', song_name)
    parts = re.split(r'\s+[-–]\s*', s_clean)
    s_clean = " ".join(parts[0].split()).strip()
    
    # Variations to try in order
    name_variations = [song_name.strip()]
    if s_clean.lower() != song_name.strip().lower():
        name_variations.append(s_clean)
    
    a_name = artist_name.strip() if artist_name else ""
    
    for s_variant in name_variations:
        if not s_variant: continue
        
        attempts = []
        if a_name:
            attempts.append(("cifraclub", a_name))
            if " & " in a_name:
                attempts.append(("cifraclub", a_name.replace(" & ", " e ")))
            if " e " in a_name.lower():
                attempts.append(("cifraclub", a_name.lower().replace(" e ", " & ")))
                
            attempts.append(("cifras", a_name))
            attempts.append(("bananacifras", a_name))
        attempts.append(("musicasparamissa", ""))

        for site, artist in attempts:
            print(f"Buscando '{s_variant}' no {site} ({artist or 'Slug'})...")
            result = None
            if site == "cifraclub": result = scrape_cifraclub(s_variant, get_slug(artist), version, include_tabs)
            elif site == "cifras": result = scrape_cifras_com_br(s_variant, artist)
            elif site == "bananacifras": result = scrape_banana_cifras(s_variant, artist)
            elif site == "musicasparamissa": result = scrape_musicas_para_missa(s_variant)
            
            if result and result.get("content") and len(result["content"].strip()) > 100:
                print(f"ENCONTRADO em {site} com conteúdo válido ({len(result['content'])} caracteres)!")
                return result
            elif result:
                print(f"[SCRAPER] Conteúdo de {site} era vazio ou muito curto ({len(result.get('content', ''))} caracteres). Descartando e continuando...")
                
    return None
