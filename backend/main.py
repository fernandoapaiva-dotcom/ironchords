from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import FileResponse, HTMLResponse # type: ignore
from database import init_db, get_chord, save_chord, get_db_connection, get_all_chords, register_user, authorize_user, deauthorize_user, delete_user, check_user_status, get_all_users, save_short_link, get_short_link, get_user_playlists, save_user_playlist, delete_user_playlist # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List, Optional, Any, Dict, Union, cast
import pandas as pd # type: ignore
import io
import os
import time
import json
import tempfile
import zipfile
import requests # type: ignore
import re
import platform

import unicodedata

def normalize_text(text: str) -> str:
    """Removes accents and converts to lowercase for better comparison."""
    if not text: return ""
    return "".join(
        c for c in unicodedata.normalize('NFD', text.lower())
        if unicodedata.category(c) != 'Mn'
    )

def clean_song_name(name: str) -> str:
    """Removes standard fluff like (Live), [Official Video], and trailing tags."""
    if not name: return ""
    # Remove anything in (...) or [...]
    name = re.sub(r'[\(\[].*?[\)\]]', '', name)
    
    # Remove specific terms common in the request examples or standard suffixes
    fluff_terms = [
        r'-?\s*best song gospel\b',
        r'-?\s*ao vivo\b',
        r'-?\s*live\b',
        r'-?\s*official\b',
        r'-?\s*clipe\b',
        r'-?\s*video\b',
        r'-?\s*lyric\b',
        r'-?\s*remix\b'
    ]
    for term in fluff_terms:
        name = re.sub(term, '', name, flags=re.IGNORECASE)
        
    # Remove anything after a hyphen if there is a space around it (e.g " - Cover", " - Ao Vivo")
    # Split by hyphen or en-dash surrounded by any whitespace
    parts = re.split(r'\s+[-–]\s*', name)
    name = parts[0]
    # Remove extra spaces
    return name.strip()

import scraper # type: ignore
from scraper import find_chord_cascade, get_cifraclub_versions # type: ignore
import chord_utils # type: ignore
from chord_utils import process_chords # type: ignore
from document_generator import generate_docx # type: ignore
from audio_processor import IronChordsPlayer # type: ignore

def fix_pywin32():
    if platform.system() != "Windows":
        return False
    import os
    import sys
    try:
        venv_base = os.path.dirname(os.path.dirname(sys.executable))
        site_packages = os.path.join(venv_base, "Lib", "site-packages")
        if not os.path.exists(site_packages):
            for p in sys.path:
                if p.endswith("site-packages"):
                    site_packages = p
                    break
        
        pywin32_system32 = os.path.join(site_packages, "pywin32_system32")
        if os.path.exists(pywin32_system32):
            add_dll = getattr(os, 'add_dll_directory', None)
            if add_dll:
                try: add_dll(pywin32_system32)
                except: pass
            else:
                os.environ["PATH"] = pywin32_system32 + os.pathsep + os.environ["PATH"]
                
        for sub in ["win32", "win32\\lib", "Pythonwin"]:
            p = os.path.join(site_packages, sub)
            if os.path.exists(p) and p not in sys.path:
                sys.path.append(p)
        
        # Carregamento forçado de pywintypes e pythoncom
        import win32api # type: ignore
        import pywintypes # type: ignore
        import pythoncom # type: ignore
        return True
    except Exception as e:
        with open("debug_fix.log", "a") as f:
            f.write(f"fix_pywin32 error: {str(e)}\n")
        return False

HAS_PYWIN32 = fix_pywin32()
PYWIN32_ERR = None
if HAS_PYWIN32:
    try:
        import pythoncom # type: ignore
        import win32com.client # type: ignore
    except Exception as e:
        HAS_PYWIN32 = False
        PYWIN32_ERR = str(e)
else:
    PYWIN32_ERR = "Failed to bootstrap pywin32"

def normalize_gmail(email: str) -> str:
    if not email: return ""
    email = email.lower().strip()
    if '@gmail.com' in email or '@googlemail.com' in email:
        local, domain = email.split('@')
        # Remove dots and everything after +
        local = local.split('+')[0].replace('.', '')
        return f"{local}@gmail.com"
    return email

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://ironchords.vercel.app",
        "https://fernandoapaiva.com.br",
        "https://www.fernandoapaiva.com.br"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def normalize_gmail(email: str) -> str:
    """Normalize Gmail addresses so dots and +aliases are equivalent.
    Only applies to @gmail.com and @googlemail.com domains.
    e.g. Fernando.M.Aragao89@gmail.com -> fernandomaragao89@gmail.com
         user+test@gmail.com           -> user@gmail.com
    """
    if not email:
        return email.lower().strip()
    email = email.lower().strip()
    local, _, domain = email.partition('@')
    if domain in ('gmail.com', 'googlemail.com'):
        # Remove +alias
        local = local.split('+')[0]
        # Remove dots
        local = local.replace('.', '')
        return f"{local}@gmail.com"
    return email

class RegistrationRequest(BaseModel):
    email: str

@app.post("/api/auth/register")
def register_user_endpoint(request: RegistrationRequest):
    norm_email = normalize_gmail(request.email)
    success = register_user(norm_email)
    if not success:
        # Check if already authorized or pending
        status = check_user_status(norm_email)
        if status:
            return {"status": status, "message": f"Usuário já possui status: {status}"}
        return {"status": "error", "message": "Falha ao registrar usuário."}
    
    # Notify admin
    admin_email = "fernandomaragao89@gmail.com"
    render_url = os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")
    auth_link = f"{render_url}/api/auth/authorize/{norm_email}"
    print(f"\n[AUTH NOTIFICATION]")
    print(f"Novo usuário registrado: {norm_email} (original: {request.email})")
    print(f"Para autorizar, acesse: {auth_link}")
    print(f"Sent notification to: {admin_email}\n")
    
    return {"status": "pending", "message": "Cadastro realizado. Aguardando autorização do administrador."}

@app.get("/api/auth/status/{email}")
def check_status_endpoint(email: str):
    norm_email = normalize_gmail(email)
    status = check_user_status(norm_email)
    if not status:
        return {"status": "unregistered"}
    return {"status": status}

@app.get("/api/auth/authorize/{email}")
def authorize_user_endpoint(email: str):
    authorize_user(email)
    return {
        "status": "success", 
        "message": f"Usuário {email} autorizado com sucesso!",
        "html": f"<h1>Acesso Autorizado!</h1><p>O usuário <b>{email}</b> agora tem acesso ilimitado.</p>"
    }

@app.get("/api/auth/users")
def get_users_endpoint():
    return {"users": get_all_users()}

@app.get("/api/auth/deauthorize/{email}")
def deauthorize_user_endpoint(email: str):
    deauthorize_user(email)
    return {"status": "success", "message": f"Acesso de {email} revogado."}

@app.get("/api/auth/add_manual/{email}")
def add_manual_user_endpoint(email: str):
    norm_email = normalize_gmail(email)
    # Register (if not exists) and Authorize
    register_user(norm_email)
    authorize_user(norm_email)
    return {"status": "success", "message": f"Usuário {norm_email} adicionado e autorizado."}

@app.delete("/api/auth/delete/{email}")
def delete_user_endpoint(email: str):
    delete_user(email)
    return {"status": "success", "message": f"Usuário {email} removido."}

# PLAYLIST SYNC ENDPOINTS
class PlaylistUpdate(BaseModel):
    user_email: str
    name: str
    data: List[Dict[str, Any]]

@app.get("/api/playlists/{email}")
def get_playlists(email: str):
    return {"playlists": get_user_playlists(email)}

@app.post("/api/playlists")
def save_playlist(update: PlaylistUpdate):
    save_user_playlist(update.user_email, update.name, json.dumps(update.data))
    return {"status": "success"}

@app.delete("/api/playlists/{email}/{name}")
def delete_playlist(email: str, name: str):
    delete_user_playlist(email, name)
    return {"status": "success"}

# SHARE & SHORT LINKS
class ShareRequest(BaseModel):
    name: str
    songs: List[Dict[str, Any]]

def generate_slug(length=6):
    import random
    import string
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

@app.post("/api/share")
def create_share_link(request: ShareRequest):
    slug = generate_slug()
    # Ensure uniqueness (simple retry)
    for _ in range(5):
        try:
            save_short_link(slug, json.dumps({"name": request.name, "songs": request.songs}))
            break
        except:
            slug = generate_slug()
    return {"slug": slug}

@app.get("/api/share/{slug}")
def get_share_data(slug: str):
    data = get_short_link(slug)
    if not data:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    return json.loads(data)

@app.get("/s/{slug}")
def social_preview_bridge(slug: str):
    data_str = get_short_link(slug)
    if not data_str:
        return FileResponse(os.path.join(os.path.dirname(__file__), "index.html")) # Fallback
    
    data = json.loads(data_str)
    title = data.get("name", "Lista de Cifras")
    song_count = len(data.get("songs", []))
    description = f"Confira esta lista com {song_count} músicas no IronChords."
    if song_count > 0:
        first_songs = ", ".join([s.get("song_name", "") for s in data.get("songs", [])[:3]])
        description = f"Inclui: {first_songs}... e mais. No IronChords."

    # HTML with Open Graph tags and JS redirect
    frontend_url = "https://ironchords.vercel.app"
    redirect_url = f"{frontend_url}/?s={slug}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>{title} | IronChords</title>
        <meta property="og:title" content="{title}">
        <meta property="og:description" content="{description}">
        <meta property="og:image" content="https://ironchords.vercel.app/og-image.png">
        <meta property="og:url" content="{redirect_url}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <script>window.location.href = "{redirect_url}";</script>
    </head>
    <body>
        <p>Redirecionando para {title}...</p>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.get("/")
def health_check():
    return {"status": "online", "message": "IronChords API is running."}

@app.websocket("/ws/videoke")
async def videoke_stream(websocket: WebSocket):
    await websocket.accept()
    player = IronChordsPlayer()
    
    try:
        while True:
            # Recebe o pedaço de áudio PCM do frontend
            data = await websocket.receive_bytes()
            
            # Processa o áudio na Máquina de Estados
            response = player.process_audio_chunk(data)
            
            # Envia a resposta de volta
            await websocket.send_json(response)
            
    except WebSocketDisconnect:
        print("Videoke client disconnected.")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

def _keep_alive_worker():
    """Pings the server every 14 minutes to prevent Render from sleeping."""
    import threading, time as _time
    INTERVAL = 14 * 60  # 14 minutes in seconds
    _time.sleep(30)  # Wait for server to be fully up before first ping
    while True:
        try:
            self_url = os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")
            requests.get(f"{self_url}/", timeout=10)
            print(f"[KeepAlive] Pinged {self_url}/ successfully.")
        except Exception as e:
            print(f"[KeepAlive] Ping failed: {e}")
        _time.sleep(INTERVAL)

@app.on_event("startup")
def startup_event():
    init_db()
    import threading
    t = threading.Thread(target=_keep_alive_worker, daemon=True, name="KeepAlive")
    t.start()
    print("[KeepAlive] Background keep-alive thread started (interval: 14min).")

class ManualEntryRequest(BaseModel):
    song_name: str
    artist_name: str
    key: str
    version: Optional[str] = "Principal"
    slug: Optional[str] = None
    include_tabs: bool = True
    capo: Optional[int] = 0
    force_refresh: bool = False

class TransposeRequest(BaseModel):
    content: str
    current_key: str
    semitones: int
    capo: Optional[int] = 0

@app.post("/api/music/manual")
def add_manual_music(request: ManualEntryRequest):
    # Normalize key from request
    req_key = request.key.strip() if request.key else ""
    
    # Try to find exactly the requested key in DB first for efficiency (skip if force_refresh)
    chord_data = None
    if not request.force_refresh:
        chord_data = get_chord(request.song_name, request.artist_name, req_key if req_key else None, version=request.version)
        
        if not chord_data:
            # If not found exactly, try any version of this song in DB
            chord_data = get_chord(request.song_name, request.artist_name, version=request.version)
    
    # Pre-fetch versions list for UI sync
    available_versions = []
    try:
        from scraper import get_cifraclub_versions, get_slug
        # We need slugs for the versions scraper. 
        # For simplicity in the response, we'll try to get them from existing logic or just fetch if we have a match.
        a_slug = get_slug(request.artist_name)
        s_slug = get_slug(request.song_name)
        # If we have a successful scraper/db match later, we might refine this.
        # But providing it here ensures the UI can show the dropdown immediately.
        available_versions = get_cifraclub_versions(a_slug, s_slug)
    except:
        available_versions = [{"name": "Principal", "key": "Principal"}]
    
    if chord_data:
        # Normalize key name from DB
        chord_data['key'] = chord_data.get('song_key')
        if not req_key: # If original requested, use found key
            req_key = chord_data['key']
    
    # Define if we need to scrape based on Tablature cache mismatch
    needs_scrape = False
    if not chord_data:
        needs_scrape = True
    elif request.version and request.version != "Principal":
        needs_scrape = True
    else:
        # Check if cache matches the requested tab state
        has_tabs = "-|" in chord_data.get('content', '') or "|-" in chord_data.get('content', '')
        if request.include_tabs and not has_tabs:
            needs_scrape = True
        elif not request.include_tabs and has_tabs:
            needs_scrape = True

    # If not in DB OR specific version requested, try scraping
    if needs_scrape:
        # Attempt 1: Contextual Smart Search (Solr)
        # This helps with typos (e.g. Chili vs Chilli) and finding the correct song name (e.g. adding (Hey Oh))
        found_via_suggestion = False
        suggested_song = request.song_name
        suggested_artist = request.artist_name
        
        # Try to get a high-confidence suggestion
        search_query = f"{request.song_name} {request.artist_name}".strip()
        suggestions_res = search_suggestions(search_query)
        suggestions = [s for s in suggestions_res.get("suggestions", []) if s.get("source") == "cifraclub"]
        
        # If we have a direct slug from front-end, prioritize it
        selected_slug = request.slug
        scraped = None
        if selected_slug:
            print(f"DEBUG SMART SEARCH: Usando slug direto do frontend: {selected_slug}")
            scraped = scraper.scrape_cifraclub(request.song_name, selected_slug, request.version, request.include_tabs)
            if scraped:
                found_via_suggestion = True
                suggested_song = scraped['song_name']
                suggested_artist = scraped['artist_name']

        if not scraped and suggestions:
            top = suggestions[0]
            # Normalize names to check if the top suggestion is actually what was requested
            # but being more flexible (matching parts of the name)
            s_name_norm = normalize_text(clean_song_name(request.song_name))
            t_name_norm = normalize_text(clean_song_name(top['song']))
            
            # If the top suggestion overlaps significantly or artist matches exactly
            artist_match = normalize_text(request.artist_name) in normalize_text(top['artist']) or normalize_text(top['artist']) in normalize_text(request.artist_name)
            name_overlap = s_name_norm in t_name_norm or t_name_norm in s_name_norm
            
            if name_overlap and artist_match:
                print(f"DEBUG SMART SEARCH: Resolvendo '{request.song_name}' -> '{top['song']}' por '{top['artist']}'")
                suggested_song = top['song']
                suggested_artist = top['artist']
                found_via_suggestion = True

        # Attempt 2: Scrape with resolved metadata
        if not scraped:
            scraped = find_chord_cascade(suggested_song, suggested_artist, version=request.version, include_tabs=request.include_tabs)
        
        # Attempt 3: Normal cleaning fallback if smart search didn't resolve or scraper failed
        if not scraped:
            song_clean = clean_song_name(request.song_name)
            if song_clean != suggested_song: # Only if it wasn't tried yet
                print(f"DEBUG REQ 7: Tentando nome limpo '{song_clean}'...")
                scraped = find_chord_cascade(song_clean, request.artist_name, version=request.version, include_tabs=request.include_tabs)
        
        if not scraped:
            if not chord_data:
                # If everything failed, try to return smart suggestions
                song_clean = clean_song_name(request.song_name)
                artist_clean = clean_song_name(request.artist_name)
                words = cast(List[str], artist_clean.split())
                artist_first_words = " ".join(cast(List[str], words[0:2]))  # type: ignore
                
                # Send artist first words alongside to vastly improve Solr match capability and bypass typos
                # Also include the original requested names to ensure we find what the user typed
                s_results_clean = search_suggestions(f"{song_clean} {artist_first_words or artist_clean}".strip())
                s_results_orig = search_suggestions(f"{request.song_name} {request.artist_name}".strip())
                s_results_song_only = search_suggestions(song_clean)
                
                # Merge suggestions
                all_s = []
                seen = set()
                # Prioritize exact full matches over just song name matches
                for s in s_results_clean.get("suggestions", []) + s_results_orig.get("suggestions", []) + s_results_song_only.get("suggestions", []):
                    key = (s['song'].lower(), s['artist'].lower())
                    if key not in seen:
                        seen.add(key)
                        all_s.append(s)

                raise HTTPException(
                    status_code=404, 
                    detail={
                        "error": "not_found",
                        "message": "Música não encontrada.",
                        "suggestions": cast(List[Any], all_s)[0:15]  # type: ignore
                    }
                )
        else:
            chord_data = scraped
            try:
                from database import save_chord
                save_chord(
                    song_name=chord_data['song_name'],
                    artist_name=chord_data['artist_name'],
                    song_key=chord_data['key'],
                    content=chord_data['content'],
                    source=chord_data['source'],
                    capo=0,
                    include_tabs=request.include_tabs,
                    version=chord_data.get('version', 'Principal')
                )
            except Exception as e:
                print(f"Error auto-saving manual search: {e}")

    
    # Final check for key (Requirement 2)
    if not req_key:
        if chord_data is None:
             raise HTTPException(status_code=500, detail="Unexpected state: chord_data is None")
        req_key = cast(str, cast(Dict[str, Any], chord_data).get('key', 'C'))

    # Se Capo for aplicado, a cifra bruta (visual_key) desce de tom para que o som mantenha-se igual ao req_key.
    visual_key = req_key
    if request.capo is not None and request.capo > 0:  # type: ignore
        import re
        from chord_utils import get_note_index, NOTES # type: ignore
        match = re.search(r"([A-G][b#]?)", req_key, re.IGNORECASE)
        if match:
            base_note = match.group(1)
            idx = get_note_index(base_note)
            new_idx = (idx - request.capo) % 12
            new_base = NOTES[new_idx]
            rest = cast(str, req_key)[len(base_note):]  # type: ignore
            visual_key = f"{new_base}{rest}"

    final_content = process_chords(cast(Dict[str, Any], chord_data)['content'], cast(Dict[str, Any], chord_data)['key'], visual_key)  # type: ignore
    
    # Requirement: Sounding key = requested key
    sounding_key = req_key
    
    return {
        "song_name": cast(Dict[str, Any], chord_data)['song_name'],
        "artist_name": cast(Dict[str, Any], chord_data)['artist_name'],
        "original_key": cast(Dict[str, Any], chord_data)['key'],
        "requested_key": req_key,
        "sounding_key": sounding_key,
        "content": final_content,
        "source": cast(Dict[str, Any], chord_data)['source'],
        "capo": request.capo,
        "versions": available_versions
    }

@app.get("/api/music/versions")
async def get_versions_by_name(song_name: str, artist_name: str):
    a_slug = scraper.get_slug(artist_name)
    s_slug = scraper.get_slug(song_name)
    
    versions = scraper.get_cifraclub_versions(a_slug, s_slug)
    # Filter if only Principal
    if len(versions) <= 1:
        return {"versions": []}
    return {"versions": versions}

@app.post("/api/transpose")
def transpose_endpoint(request: TransposeRequest):
    try:
        from chord_utils import transpose_chord, NOTES  # type: ignore
        
        # Calculate new key name
        match = re.search(r"([A-G][b#]?)", request.current_key, re.IGNORECASE)
        if not match:
            new_key = request.current_key
        else:
            from chord_utils import get_note_index  # type: ignore
            base_note = match.group(1)
            idx = get_note_index(base_note)
            new_idx = (idx + request.semitones) % 12
            new_key = NOTES[new_idx]
            # Preserve minor/other info if present
            rest = str(request.current_key)[len(base_note):]  # type: ignore
            new_key = f"{new_key}{rest}"

        # Transpose content
        transposed_content = process_chords(request.content, request.current_key, new_key)
        
        return {
            "transposed_content": transposed_content,
            "new_key": new_key
        }
    except Exception as e:
        print(f"TRANSPOSE ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Duplicate route removed.

class BatchEntry(BaseModel):
    song_name: str
    artist_name: str
    key: str
    version: Optional[str] = "Principal"
    include_tabs: bool = True
    capo: Optional[int] = 0

class BatchRequest(BaseModel):
    songs: List[BatchEntry]

@app.post("/api/music/batch")
def add_batch_music(request: BatchRequest):
    results = []
    for row in request.songs:
        try:
            song_name = row.song_name.strip()
            artist_name = row.artist_name.strip()
            req_key = row.key.strip()

            # Try to find exactly this song version (name, artist, key)
            chord_data = get_chord(song_name, artist_name, req_key, version=row.version)
            
            # Determine if we need to override cache based on tabs presence
            needs_scrape = False
            if not chord_data:
                needs_scrape = True
            elif row.version and row.version != "Principal":
                needs_scrape = True
            else:
                has_tabs = "-|" in chord_data.get('content', '') or "|-" in chord_data.get('content', '')
                if row.include_tabs and not has_tabs:
                    needs_scrape = True
                elif not row.include_tabs and has_tabs:
                    needs_scrape = True

            # If specifically requested different version/tabs, override cache
            if needs_scrape:
                scraped = find_chord_cascade(song_name, artist_name, version=row.version, include_tabs=row.include_tabs)
                if scraped:
                    chord_data = scraped
                    try:
                        from database import save_chord
                        save_chord(
                            song_name=chord_data['song_name'],
                            artist_name=chord_data['artist_name'],
                            song_key=chord_data['key'],
                            content=chord_data['content'],
                            source=chord_data['source'],
                            capo=0,
                            include_tabs=row.include_tabs,
                            version=row.version or 'Principal'
                        )
                    except Exception as e:
                        print(f"Error auto-saving batch search: {e}")
            if not chord_data:
                # Fallback to any version if specific scrape failed
                chord_data = get_chord(song_name, artist_name, version=row.version)
                if chord_data:
                    chord_data['key'] = chord_data.get('song_key')
            
            print(f"DEBUG BATCH: Song={song_name}, FromKey={chord_data.get('key') if chord_data else 'None'}, ToKey={req_key}")
            
            if not chord_data:
                scraped = find_chord_cascade(song_name, artist_name)
                if scraped:
                    chord_data = scraped
                    try:
                        from database import save_chord
                        save_chord(
                            song_name=chord_data['song_name'],
                            artist_name=chord_data['artist_name'],
                            song_key=chord_data['key'],
                            content=chord_data['content'],
                            source=chord_data['source'],
                            capo=0,
                            include_tabs=row.include_tabs,
                            version=row.version or 'Principal'
                        )
                    except Exception as e:
                        print(f"Error auto-saving batch fallback search: {e}")
            if chord_data:
                # Se não houver Tom mapeado, assume o tom original da música
                if not req_key:
                    req_key = cast(Dict[str, Any], chord_data)['key']
                    
                visual_key = req_key
                if row.capo is not None and row.capo > 0:  # type: ignore
                    import re
                    from chord_utils import get_note_index, NOTES # type: ignore
                    match = re.search(r"([A-G][b#]?)", req_key, re.IGNORECASE)
                    if match:
                        base_note = match.group(1)
                        idx = get_note_index(base_note)
                        new_idx = (idx - row.capo) % 12
                        new_base = NOTES[new_idx]
                        rest = str(req_key)[len(base_note):]  # type: ignore
                        visual_key = f"{new_base}{rest}"

                final_content = process_chords(chord_data['content'], chord_data['key'], visual_key)
                
                # Calculate sounding key
                sounding_key = req_key
                
                results.append({
                    "song_name": chord_data['song_name'],
                    "artist_name": chord_data['artist_name'],
                    "original_key": chord_data['key'],
                    "requested_key": req_key,
                    "sounding_key": sounding_key,
                    "capo": row.capo,
                    "content": final_content,
                    "status": "success"
                })
            else:
                results.append({
                    "song_name": song_name,
                    "artist_name": artist_name,
                    "status": "not_found"
                })
        except Exception as e:
            results.append({
                "song_name": row.song_name,
                "artist_name": row.artist_name,
                "status": "error",
                "detail": str(e)
            })
            
    return {"results": results}

@app.post("/api/music/batch/pdf")
async def extract_pdf_table(file: UploadFile = File(...)):
    import pdfplumber # type: ignore
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
        
    try:
        data = []
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for r in table:
                            data.append(r)
                else:
                    # Fallback: Extract text and try to parse lines as "Song - Artist - Key" or "Song | Artist | Key"
                    text = page.extract_text()
                    if text:
                        lines = text.split('\n')
                        for line in lines:
                            # Try simple splitters
                            parts = []
                            if " - " in line: parts = [p.strip() for p in line.split(" - ")]
                            elif " | " in line: parts = [p.strip() for p in line.split(" | ")]
                            elif "\t" in line: parts = [p.strip() for p in line.split("\t")]
                            
                            if len(parts) >= 2:
                                # Heuristic: if last part looks like a key (C, G, Am, etc)
                                res_row = [parts[0], parts[1], parts[2] if len(parts) > 2 else ""]
                                data.append(res_row)
        
        if not data:
            raise HTTPException(status_code=400, detail="Nenhuma tabela ou estrutura de texto compatível encontrada neste PDF.")
            
        # If we have data but it doesn't look like a table with headers (data[0] is just a row)
        # we might need to be smart about headers. 
        # For now, if the first row has common keywords, treat as header, else use generic.
        first_row = [str(x).strip() if x else "" for x in data[0]]
        is_header = any(keyword in first_row[0].lower() for keyword in ["música", "musica", "song", "título", "titulo"])
        
        if is_header:
            headers = [str(h) for h in first_row]
            body = cast(List[Any], data)[1:]  # type: ignore
        else:
            # Generic headers if not obvious
            headers = ["Música", "Artista", "Tom"]
            body = cast(List[Any], data)
            # Adjust body if lengths don't match headers
            
        rows = []
        for row in body:
            obj: Dict[str, str] = {}
            if isinstance(row, (list, tuple)):
                for i, h in enumerate(headers):
                    if i < len(cast(List[Any], row)):
                        val = cast(List[Any], row)[i]
                        obj[h] = str(val).strip() if val is not None else ""
                    else:
                        obj[h] = ""
            rows.append(obj)
            
        return {"headers": headers, "rows": rows}
    except Exception as e:
        print(f"PDF ERROR: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao ler PDF: {str(e)}")
    finally:
        os.remove(tmp_path)

class ScrapeLinkRequest(BaseModel):
    url: str

@app.post("/api/music/scrape-link")
def scrape_link_endpoint(request: ScrapeLinkRequest):
    data = scraper.scrape_cifraclub_url(request.url)
    if not data:
        raise HTTPException(status_code=400, detail="Não foi possível extrair a cifra deste link. Verifique se é uma URL válida do CifraClub.")
    return data

class ChordEdit(BaseModel):
    song_name: str
    artist_name: str
    song_key: str
    content: str
    include_tabs: Optional[bool] = True
    capo: Optional[int] = 0

@app.get("/api/chords")
def get_chords():
    chords = get_all_chords()
    return {"chords": chords}

@app.post("/api/chords")
def create_chord(data: ChordEdit):
    try:
        from database import save_chord # type: ignore
        save_chord(data.song_name, data.artist_name, data.song_key, data.content, "manual", data.capo or 0, data.include_tabs, "Principal")
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/acervo")
def get_acervo_alias():
    return get_chords()

@app.get("/api/chords/{chord_id}")
def get_single_chord(chord_id: int):
    conn = get_db_connection()
    chord = conn.execute("SELECT * FROM chords WHERE id = ?", (chord_id,)).fetchone()
    conn.close()
    if not chord: raise HTTPException(404, "Cifra não encontrada no banco")
    return dict(chord)

@app.put("/api/chords/{chord_id}")
async def update_chord(chord_id: int, chord: ChordEdit):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE chords
            SET song_name=?, artist_name=?, song_key=?, content=?, capo=?, include_tabs=?
            WHERE id=?
        ''', (chord.song_name, chord.artist_name, chord.song_key, chord.content, chord.capo, 1 if chord.include_tabs else 0, chord_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cifra não encontrada no banco local.")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/api/chords/{chord_id}")
def delete_chord(chord_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM chords WHERE id=?", (chord_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/chords/check")
def check_song_exists(name: str):
    conn = get_db_connection()
    # Case insensitive search by name
    chord = conn.execute(
        "SELECT * FROM chords WHERE song_name = ? COLLATE NOCASE LIMIT 1",
        (name.strip(),)
    ).fetchone()
    conn.close()
    if chord:
        return {"exists": True, "chord": dict(chord)}
    return {"exists": False}

@app.get("/api/search/suggestions")
def search_suggestions(q: str):
    """Real-time autocomplete suggestions using Solr API."""
    if not q or len(q) < 2:
        return {"suggestions": []}
        
    url = "https://solr.sscdn.co/cc/c7/"
    params = {"q": q, "limit": 20}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.cifraclub.com.br/"
    }
    
    suggestions = []
    
    # 1. Local Database Results (Priority)
    try:
        conn = get_db_connection()
        like_q = f"%{q}%"
        local_results = conn.execute(
            "SELECT DISTINCT song_name, artist_name, song_key FROM chords WHERE song_name LIKE ? OR artist_name LIKE ? LIMIT 10",
            (like_q, like_q)
        ).fetchall()
        conn.close()
        for r in local_results:
            suggestions.append({
                "song": r["song_name"],
                "artist": r["artist_name"],
                "key": r["song_key"],
                "source": "local"
            })
    except Exception as e:
        print(f"DEBUG LOCAL ERROR: {e}")
        
    # 2. Remote Solr Results
    try:
        response = requests.get(url, params=params, headers=headers, timeout=3)
        if response.status_code == 200:
            data = response.json()
            docs = data.get("response", {}).get("docs", [])
            for doc in docs:
                s_name = doc.get("txt")
                a_name = doc.get("art")
                
                if s_name and a_name:
                    if "agape" in s_name.lower() or "agape" in a_name.lower():
                        continue
                    if not any(s["song"] == s_name and s["artist"] == a_name for s in suggestions):
                        suggestions.append({
                            "song": s_name,
                            "artist": a_name,
                            "key": None,
                            "slug": doc.get("dns"),
                            "source": "cifraclub"
                        })
    except Exception as e:
        print(f"DEBUG REMOTE ERROR: {e}")
            
    # Final filter for branding (redundant but safe)
    suggestions = [
        s for s in suggestions 
        if s.get('song') and s.get('artist') and 
        "agape" not in str(s['song']).lower() and 
        "agape" not in str(s['artist']).lower()
    ]
            
    return {"suggestions": cast(List[Any], suggestions)[:12]}  # type: ignore

@app.get("/api/music/metadata")
def get_metadata(song_name: str, artist_name: str):
    """Fetch only metadata (like original key) for a song."""
    # Try local cache first
    conn = get_db_connection()
    res = conn.execute(
        "SELECT song_key FROM chords WHERE song_name = ? AND artist_name = ? LIMIT 1",
        (song_name.strip(), artist_name.strip())
    ).fetchone()
    conn.close()
    
    if res:
        return {"key": res["song_key"]}
        
    # If not local, try a quick scrape
    result = find_chord_cascade(song_name, artist_name)
    if result:
        # Save to local database for next time
        save_chord(
            song_name=result['song_name'],
            artist_name=result['artist_name'],
            song_key=result['key'],
            content=result['content'],
            source=result['source']
        )
        return {"key": result["key"]}
        
    return {"key": "C"} # Default

@app.post("/api/generate_book")
async def generate_book(
    songs_data: str = Form(...),
    export_format: str = Form("docx"),
    cover_image: Optional[UploadFile] = File(None),
    include_toc: str = Form("true"),
    include_dictionary: str = Form("true"),
    sort_order: str = Form("alphabetical")
):
    try:
        raw_songs = json.loads(songs_data)
        if not raw_songs or not isinstance(raw_songs, list):
            raise HTTPException(status_code=400, detail="A lista de músicas não pode estar vazia ou ter formato inválido.")
            
        songs: List[Dict[str, Any]] = raw_songs
            
        prepared_songs = []
        for song in songs:
            base_key = song.get("song_key") or song.get("key") or "C"
            prepared_songs.append({
                "song_name": song.get("song_name", "Sem Título"),
                "artist_name": song.get("artist_name", "Desconhecido"),
                "key": base_key,
                "sounding_key": song.get("sounding_key") or base_key,
                "capo": int(song.get("capo") or 0),
                "content": song.get("content", ""),
                "show_chords": song.get("show_chords", True)
            })
            
        cover_path = None
        if cover_image and getattr(cover_image, 'filename', None):
            cover_filename = cast(str, cover_image.filename)
            cover_ext = os.path.splitext(cover_filename)[1]
            temp_cover = tempfile.NamedTemporaryFile(delete=False, suffix=cover_ext)
            temp_cover.write(await cover_image.read())
            temp_cover.close()
            cover_path = temp_cover.name
            
        docx_filename = "Livreto.docx"
        file_path = generate_docx(
            prepared_songs, 
            docx_filename, 
            cover_path,
            include_toc=(include_toc == "true"),
            include_dictionary=(include_dictionary == "true"),
            sort_order=sort_order
        )
        
        # --- NOVO: Força a atualização do sumário no DOCX via Word COM ---
        pdf_path = None
        with open("debug.log", "a") as debug_f:
            debug_f.write(f"\n--- Início Processamento COM: {export_format} ---\n")
            if HAS_PYWIN32:
                pythoncom.CoInitialize()
                word = None
                doc_obj = None
                try:
                    debug_f.write("Acessando Word.Application...\n")
                    word = win32com.client.DispatchEx("Word.Application")
                    word.Visible = False
                    word.DisplayAlerts = 0 # wdAlertsNone
                    
                    full_docx_path = os.path.abspath(file_path)
                    debug_f.write(f"Abrindo documento: {full_docx_path}\n")
                    doc_obj = word.Documents.Open(full_docx_path)
                    
                    # Não podemos acessar ActiveWindow se Visible=False, a repaginação padrão deve bastar
                    # word.ActiveWindow.View.Type = 3 # wdPrintView
                    
                    # Força a repaginação
                    debug_f.write("Repaginando...\n")
                    doc_obj.Repaginate()
                    
                    # Atualiza todos os campos
                    debug_f.write("Atualizando campos...\n")
                    doc_obj.Fields.Update()
                    
                    # Atualiza o índice especificamente
                    if doc_obj.TablesOfContents.Count > 0:
                        debug_f.write("Atualizando TOC...\n")
                        doc_obj.TablesOfContents(1).UpdatePageNumbers()
                        doc_obj.TablesOfContents(1).Update()
                    
                    debug_f.write("Salvando DOCX...\n")
                    doc_obj.Save()
                    
                    if export_format in ["pdf", "both"]:
                        pdf_filename = "Livreto.pdf"
                        pdf_dest = os.path.join(os.path.dirname(__file__), pdf_filename)
                        pdf_path = os.path.abspath(pdf_dest)
                        debug_f.write(f"Exportando PDF para: {pdf_path}\n")
                        # ExportFormat=17 is wdExportFormatPDF
                        doc_obj.ExportAsFixedFormat(pdf_path, 17)
                        debug_f.write("PDF Exportado com sucesso via ExportAsFixedFormat.\n")
                    
                    doc_obj.Close(SaveChanges=True)
                except Exception as e:
                    import traceback
                    error_msg = f"Erro no Word COM: {str(e)}\n{traceback.format_exc()}"
                    debug_f.write(error_msg + "\n")
                    print(error_msg)
                finally:
                    if word:
                        try:
                            word.Quit()
                        except:
                            pass
                    pythoncom.CoUninitialize()
                    debug_f.write("COM Finalizado.\n")
            else:
                debug_f.write("HAS_PYWIN32 é False.\n")
                print("pywin32 não disponível no main.py.")
                
        # Clean up temporary cover image
        if cover_path:
            try:
                os.remove(cover_path)
            except:
                pass
                
        if export_format == "pdf":
            if pdf_path and os.path.exists(pdf_path):
                return FileResponse(pdf_path, media_type="application/pdf", filename="Livreto.pdf")
            else:
                raise HTTPException(status_code=500, detail="Erro ao converter para PDF. Verifique se o Microsoft Word está instalado no servidor.")
        elif export_format == "both" and pdf_path and os.path.exists(pdf_path):
            zip_filename = "Livretos.zip"
            zip_path = os.path.join(os.path.dirname(__file__), zip_filename)
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.write(file_path, "Livreto.docx")
                zipf.write(pdf_path, "Livreto.pdf")
            return FileResponse(zip_path, media_type="application/zip", filename="Livretos.zip")
        else:
            return FileResponse(file_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename="Livreto.docx")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar livreto: {str(e)}")
