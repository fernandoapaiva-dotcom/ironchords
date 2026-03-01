from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Union, cast
import pandas as pd
import io
import os
import json
import tempfile
import zipfile
import requests
import re

from scraper import find_chord_cascade
from database import init_db, get_chord, save_chord, get_db_connection
from chord_utils import process_chords
from document_generator import generate_docx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

class ManualEntryRequest(BaseModel):
    song_name: str
    artist_name: str
    key: str
    version: Optional[str] = "Principal"
    include_tabs: bool = True

class TransposeRequest(BaseModel):
    content: str
    current_key: str
    semitones: int

@app.post("/api/music/manual")
def add_manual_music(request: ManualEntryRequest):
    # Try to find exactly the requested key in DB first for efficiency
    # Note: version and include_tabs currently impact scraping, not yet local filtering
    chord_data = get_chord(request.song_name, request.artist_name, request.key)
    
    if not chord_data:
        # If not found exactly, try any version of this song in DB to reuse content for transposing
        chord_data = get_chord(request.song_name, request.artist_name)
    
    if chord_data:
        # Normalize key name from DB (song_key) to scraper format (key)
        chord_data['key'] = chord_data.get('song_key')
    
    # If the user specifically changed the version or tabs, we should scrape again
    # to get the correct version content
    if not chord_data or (request.version and request.version != "Principal") or not request.include_tabs:
        scraped = find_chord_cascade(request.song_name, request.artist_name, version=request.version, include_tabs=request.include_tabs)
        if not scraped:
            if not chord_data:
                raise HTTPException(status_code=404, detail="Música não encontrada nos sites da busca.")
            # If scrape failed but we have DB data, we use DB data (fallback)
        else:
            chord_data = scraped
            # Save the primary scraped version
            save_chord(
                song_name=chord_data['song_name'],
                artist_name=chord_data['artist_name'],
                song_key=chord_data['key'],
                content=chord_data['content'],
                source=chord_data['source']
            )
        
    final_content = process_chords(chord_data['content'], chord_data['key'], request.key)
    
    # CRITICAL V56: If requested key is different from what we found, save it as a new distinct entry
    if request.key.upper() != chord_data['key'].upper():
        save_chord(
            song_name=chord_data['song_name'],
            artist_name=chord_data['artist_name'],
            song_key=request.key,
            content=final_content,
            source=chord_data['source']
        )
    
    return {
        "song_name": chord_data['song_name'],
        "artist_name": chord_data['artist_name'],
        "original_key": chord_data['key'],
        "requested_key": request.key,
        "content": final_content,
        "source": chord_data['source']
    }

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

class BatchEntry(BaseModel):
    song_name: str
    artist_name: str
    key: str
    version: Optional[str] = "Principal"
    include_tabs: bool = True

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
            
            # If specifically requested different version/tabs, override cache
            if not chord_data or (row.version and row.version != "Principal") or not row.include_tabs:
                scraped = find_chord_cascade(song_name, artist_name, version=row.version, include_tabs=row.include_tabs)
                if scraped:
                    chord_data = scraped
                    save_chord(
                        song_name=chord_data['song_name'],
                        artist_name=chord_data['artist_name'],
                        song_key=chord_data['key'],
                        content=chord_data['content'],
                        source=chord_data['source']
                    )
            
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
                    save_chord(
                        song_name=chord_data['song_name'],
                        artist_name=chord_data['artist_name'],
                        song_key=chord_data['key'],
                        content=chord_data['content'],
                        source=chord_data['source']
                    )
            
            if chord_data:
                final_content = process_chords(chord_data['content'], chord_data['key'], req_key)
                
                # NEW: If requested key is different, save the transposed version
                if req_key.upper() != chord_data['key'].upper():
                    save_chord(
                        song_name=chord_data['song_name'],
                        artist_name=chord_data['artist_name'],
                        song_key=req_key,
                        content=final_content,
                        source=chord_data['source']
                    )

                results.append({
                    "song_name": chord_data['song_name'],
                    "artist_name": chord_data['artist_name'],
                    "original_key": chord_data['key'],
                    "requested_key": req_key,
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

class ChordUpdate(BaseModel):
    song_name: str
    artist_name: str
    song_key: str
    content: str

@app.get("/api/chords")
def list_chords():
    conn = get_db_connection()
    chords = conn.execute("SELECT id, song_name, artist_name, song_key, source FROM chords ORDER BY song_name").fetchall()
    conn.close()
    return {"chords": [dict(c) for c in chords]}

@app.get("/api/chords/{chord_id}")
def get_single_chord(chord_id: int):
    conn = get_db_connection()
    chord = conn.execute("SELECT * FROM chords WHERE id = ?", (chord_id,)).fetchone()
    conn.close()
    if not chord: raise HTTPException(404, "Cifra não encontrada no banco")
    return dict(chord)

@app.put("/api/chords/{chord_id}")
def update_chord(chord_id: int, req: ChordUpdate):
    conn = get_db_connection()
    conn.execute("UPDATE chords SET song_name=?, artist_name=?, song_key=?, content=? WHERE id=?", 
                 (req.song_name, req.artist_name, req.song_key, req.content, chord_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.delete("/api/chords/{chord_id}")
def delete_chord(chord_id: int):
    conn = get_db_connection()
    conn.execute("DELETE FROM chords WHERE id=?", (chord_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/search/suggestions")
def search_suggestions(q: str):
    """Real-time autocomplete suggestions for Song and Artist using Solr API."""
    print(f"DEBUG AUTOCOMPLETE: Query='{q}'")
    if not q or len(q) < 2:
        return {"suggestions": []}
        
    url = "https://solr.sscdn.co/cc/c7/"
    params = {"q": q, "limit": 15}
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
            "SELECT DISTINCT song_name, artist_name, song_key FROM chords WHERE song_name LIKE ? OR artist_name LIKE ? LIMIT 5",
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
        print(f"DEBUG LOCAL SUGGEST ERROR: {e}")
        
    # 2. Remote Solr Results
    try:
        response = requests.get(url, params=params, headers=headers, timeout=3)
        if response.status_code == 200:
            data = response.json()
            docs = data.get("response", {}).get("docs", [])
            for doc in docs:
                # Accept anything that has song (txt) and artist (art) names
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
                            "source": "cifraclub"
                        })
    except Exception as e:
        print(f"DEBUG REMOTE SUGGEST ERROR: {e}")
            
    # Final filter for local results as well
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
            prepared_songs.append({
                "song_name": song["song_name"],
                "artist_name": song["artist_name"],
                "key": song.get("requested_key", song.get("original_key", "C")),
                "content": song["content"],
                "show_chords": song.get("show_chords", True)
            })
            
        cover_path = None
        if cover_image:
            cover_ext = os.path.splitext(cover_image.filename)[1]
            temp_cover = tempfile.NamedTemporaryFile(delete=False, suffix=cover_ext)
            temp_cover.write(await cover_image.read())
            temp_cover.close()
            cover_path = temp_cover.name
            
        docx_filename = "Livreto.docx"
        file_path = generate_docx(prepared_songs, docx_filename, cover_path)
        
        # --- NOVO: Força a atualização do sumário no DOCX via Word COM ---
        import pythoncom
        import win32com.client
        pythoncom.CoInitialize()
        try:
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = False
            doc_obj = word.Documents.Open(os.path.abspath(file_path))
            # Atualiza o índice (UpdateTableOfContents)
            if doc_obj.TablesOfContents.Count > 0:
                doc_obj.TablesOfContents(1).Update()
            doc_obj.Save()
            
            pdf_path = None
            if export_format in ["pdf", "both"]:
                pdf_filename = "Livreto.pdf"
                pdf_path = os.path.join(os.path.dirname(__file__), pdf_filename)
                # Export to PDF (17 = wdFormatPDF)
                doc_obj.SaveAs(os.path.abspath(pdf_path), FileFormat=17)
            
            doc_obj.Close()
            word.Quit()
        except Exception as e:
            print(f"Erro ao processar arquivo no Word: {str(e)}")
        finally:
            pythoncom.CoUninitialize()
                
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
