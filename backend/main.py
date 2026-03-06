from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Union, cast
import pandas as pd
import io
import os
import time
import json
import tempfile
import zipfile
import requests
import re

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

import scraper
from scraper import find_chord_cascade, get_cifraclub_versions
from database import init_db, get_chord, save_chord, get_db_connection, get_all_chords
import chord_utils
from chord_utils import process_chords
from document_generator import generate_docx
from audio_processor import IronChordsPlayer

def fix_pywin32():
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
        import win32api
        import pywintypes
        import pythoncom
        return True
    except Exception as e:
        with open("debug_fix.log", "a") as f:
            f.write(f"fix_pywin32 error: {str(e)}\n")
        return False

HAS_PYWIN32 = fix_pywin32()
PYWIN32_ERR = None
if HAS_PYWIN32:
    try:
        import pythoncom
        import win32com.client
    except Exception as e:
        HAS_PYWIN32 = False
        PYWIN32_ERR = str(e)
else:
    PYWIN32_ERR = "Failed to bootstrap pywin32"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.on_event("startup")
def startup_event():
    init_db()

class ManualEntryRequest(BaseModel):
    song_name: str
    artist_name: str
    key: str
    version: Optional[str] = "Principal"
    include_tabs: bool = True
    capo: Optional[int] = 0

class TransposeRequest(BaseModel):
    content: str
    current_key: str
    semitones: int
    capo: Optional[int] = 0

@app.post("/api/music/manual")
def add_manual_music(request: ManualEntryRequest):
    # Normalize key from request
    req_key = request.key.strip() if request.key else ""
    
    # Try to find exactly the requested key in DB first for efficiency
    chord_data = get_chord(request.song_name, request.artist_name, req_key if req_key else None)
    
    if not chord_data:
        # If not found exactly, try any version of this song in DB
        chord_data = get_chord(request.song_name, request.artist_name)
    
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
        
        if suggestions:
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
                artist_first_words = " ".join(artist_clean.split()[:2])
                
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
                        "suggestions": all_s[:15]
                    }
                )
        else:
            chord_data = scraped

    
    # Final check for key (Requirement 2)
    if not req_key:
        req_key = chord_data['key']

    # Se Capo for aplicado, a cifra bruta (visual_key) desce de tom para que o som mantenha-se igual ao req_key.
    visual_key = req_key
    if request.capo and request.capo > 0:
        import re
        from chord_utils import get_note_index, NOTES
        match = re.search(r"([A-G][b#]?)", req_key, re.IGNORECASE)
        if match:
            base_note = match.group(1)
            idx = get_note_index(base_note)
            new_idx = (idx - request.capo) % 12
            new_base = NOTES[new_idx]
            rest = req_key[len(base_note):]
            visual_key = f"{new_base}{rest}"

    final_content = process_chords(chord_data['content'], chord_data['key'], visual_key)
    
    # Requirement: Sounding key = requested key
    sounding_key = req_key
    
    return {
        "song_name": chord_data['song_name'],
        "artist_name": chord_data['artist_name'],
        "original_key": chord_data['key'],
        "requested_key": req_key,
        "sounding_key": sounding_key,
        "content": final_content,
        "source": chord_data['source'],
        "capo": request.capo
    }

@app.get("/api/song/versions")
async def get_song_versions(artist_slug: str, song_slug: str):
    versions = scraper.get_cifraclub_versions(artist_slug, song_slug)
    # Filter out if only Principal is available
    if len(versions) <= 1:
        return {"versions": []}
    return {"versions": versions}

@app.post("/api/transpose")
def transpose_endpoint(request: TransposeRequest):
    try:
        from chord_utils import transpose_chord, NOTES
        
        # Calculate new key name
        match = re.search(r"([A-G][b#]?)", request.current_key, re.IGNORECASE)
        if not match:
            new_key = request.current_key
        else:
            from chord_utils import get_note_index
            base_note = match.group(1)
            idx = get_note_index(base_note)
            new_idx = (idx + request.semitones) % 12
            new_key = NOTES[new_idx]
            # Preserve minor/other info if present
            k_str = str(request.current_key)
            rest = cast(str, k_str)[len(base_note):]
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

@app.get("/api/song/versions")
async def get_song_versions(artist_slug: str, song_slug: str):
    versions = scraper.get_cifraclub_versions(artist_slug, song_slug)
    # Filter out versions if only Principal is available
    if len(versions) <= 1:
        return {"versions": []}
    return {"versions": versions}

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
            chord_data = get_chord(song_name, artist_name, req_key)
            
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

            
            if not chord_data:
                # Fallback to any version if specific scrape failed
                chord_data = get_chord(song_name, artist_name)
                if chord_data:
                    chord_data['key'] = chord_data.get('song_key')
            
            print(f"DEBUG BATCH: Song={song_name}, FromKey={chord_data.get('key') if chord_data else 'None'}, ToKey={req_key}")
            
            if not chord_data:
                scraped = find_chord_cascade(song_name, artist_name)
                if scraped:
                    chord_data = scraped

            
            if chord_data:
                # Se não houver Tom mapeado, assume o tom original da música
                if not req_key:
                    req_key = chord_data['key']
                    
                visual_key = req_key
                if row.capo and row.capo > 0:
                    import re
                    from chord_utils import get_note_index, NOTES
                    match = re.search(r"([A-G][b#]?)", req_key, re.IGNORECASE)
                    if match:
                        base_note = match.group(1)
                        idx = get_note_index(base_note)
                        new_idx = (idx - row.capo) % 12
                        new_base = NOTES[new_idx]
                        rest = req_key[len(base_note):]
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
    import pdfplumber
    
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
            body = cast(List[Any], data)[1:]
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
    capo: Optional[int] = 0

@app.get("/api/chords")
def get_chords():
    chords = get_all_chords()
    return {"chords": chords}

@app.post("/api/chords")
def create_chord(data: ChordEdit):
    try:
        from database import save_chord
        save_chord(data.song_name, data.artist_name, data.song_key, data.content, "manual", data.capo or 0)
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
            SET song_name=?, artist_name=?, song_key=?, content=?, capo=?
            WHERE id=?
        ''', (chord.song_name, chord.artist_name, chord.song_key, chord.content, chord.capo, chord_id))
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
            
    # Final filter for branding
    suggestions = [s for s in suggestions if "agape" not in s['song'].lower() and "agape" not in s['artist'].lower()]
            
    return {"suggestions": cast(List[Any], suggestions)[:12]}

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
    cover_image: Optional[UploadFile] = File(None)
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
                "artist_name": song.get("artist_name", "Desenhecido"),
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
        file_path = generate_docx(prepared_songs, docx_filename, cover_path)
        
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
                    
                    # Garantir que estamos no modo de visualização de impressão para que os números de página sejam calculados
                    debug_f.write("Mudando visualização para PrintView...\n")
                    word.ActiveWindow.View.Type = 3 # wdPrintView
                    
                    # Força a repaginação
                    debug_f.write("Repaginando...\n")
                    doc_obj.Repaginate()
                    
                    # Atualiza todos os campos
                    debug_f.write("Atualizando campos...\n")
                    doc_obj.Fields.Update()
                    
                    # Atualiza o índice especificamente
                    if doc_obj.TablesOfContents.Count > 0:
                        debug_f.write("Atualizando TOC...\n")
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
