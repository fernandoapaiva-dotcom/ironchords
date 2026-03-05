import requests
from bs4 import BeautifulSoup
import urllib.parse
from typing import Optional, Dict, List
import re

def clean_text(text: str) -> str:
    return text.replace('\r', '').strip()

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
    
    url = f"https://www.cifraclub.com.br/{artist_url_name}/{s_slug}{path_version}/imprimir.html"
    # Fallback to non-print URL if we need meta info like capo
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        # First, try to get the regular page to extract metadata like capo
        meta_url = f"https://www.cifraclub.com.br/{artist_url_name}/{s_slug}{path_version}/"
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
            "artist_name": artist_url_name.replace("-", " ").title(),
            "key": key,
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
    url = f"https://www.cifraclub.com.br/{artist_url_name}/{song_slug}/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    versions = []
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return []
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Versions are typically in a div with class 'list-versions'
        versions_container = soup.find('div', class_='list-versions')
        if versions_container:
            for link in versions_container.find_all('a', class_='js-version'):
                title_span = link.find('span', title=True)
                if not title_span:
                    # Fallback to direct span text if title is not present
                    title_span = link.find('span')
                
                version_name = title_span.get('title') if title_span and title_span.get('title') else (title_span.text.strip() if title_span else "Principal")
                
                # Extract version suffix from URL
                # Example: /legiao-urbana/tempo-perdido/simplificada.html
                # We want "simplificada"
                href = link.get('href', '')
                v_slug = "Principal"
                if href:
                    parts = href.strip('/').split('/')
                    if len(parts) > 2:
                        last_part = parts[-1]
                        if last_part.endswith('.html'):
                            v_slug = last_part.replace('.html', '')
                        else:
                            # Might be just a folder or the principal one
                            v_slug = last_part
                    elif len(parts) == 2:
                        v_slug = "Principal"
                
                versions.append({
                    "name": version_name,
                    "key": v_slug,
                    "label": version_name # Using the display name as label
                })
        else:
            # If no versions found, at least return "Principal"
            versions.append({"name": "Principal", "key": "Principal"})
            
        return versions
    except Exception as e:
        print(f"Error fetching versions: {e}")
        return [{"name": "Principal", "key": "Principal"}]

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
        soup = BeautifulSoup(response.text, 'html.parser')
        div_cifra = soup.find('div', id='div-cifra')
        if not div_cifra: return None
        key = "C"
        key_match = re.search(r"TOM:\s*([A-G][b#]?m?)", response.text, re.IGNORECASE)
        if key_match: key = key_match.group(1).upper()
        return {
            "song_name": song_name,
            "artist_name": "Músicas para Missa",
            "key": key,
            "content": clean_text(div_cifra.get_text(separator='\n')),
            "source": "musicasparamissa"
        }
    except: return None

def find_chord_cascade(song_name: str, artist_name: str, version: Optional[str] = None, include_tabs: bool = True) -> Optional[Dict]:
    # Clean up the song name to bypass url mismatches (e.g. removing " - Cover", "(Live)", etc)
    import re
    s_name = re.sub(r'[\(\[].*?[\)\]]', '', song_name)
    parts = re.split(r'\s+[-–]\s*', s_name)
    s_name = parts[0]
    s_name = " ".join(s_name.split()).strip()
    
    a_name = artist_name.strip() if artist_name else ""
    # Cascade priority:
    # 1. User Artist on CC, Cifras, Banana
    # 2. Musicas Para Missa (Slug attempt)
    
    attempts = []
    if a_name:
        attempts.append(("cifraclub", a_name))
        attempts.append(("cifras", a_name))
        attempts.append(("bananacifras", a_name))
        
    attempts.append(("musicasparamissa", ""))

    for site, artist in attempts:
        print(f"Buscando '{s_name}' no {site} ({artist or 'Slug'})...")
        result = None
        if site == "cifraclub": result = scrape_cifraclub(s_name, get_slug(artist), version, include_tabs)
        elif site == "cifras": result = scrape_cifras_com_br(s_name, artist)
        elif site == "bananacifras": result = scrape_banana_cifras(s_name, artist)
        elif site == "musicasparamissa": result = scrape_musicas_para_missa(s_name)
        
        if result:
            print(f"ENCONTRADO em {site}!")
            return result
            
    return None
