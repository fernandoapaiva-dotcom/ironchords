import os
import time
import tempfile
import shutil
import re
from typing import Optional

from docx import Document
from docx.shared import Pt, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

from chord_drawer import build_chord_dictionary

CHORD_REGEX = re.compile(r"(?<![a-zA-Z0-9])([A-G][b#]?(?:m|maj|min|dim|aug|sus)?(?:\d)?(?:/[A-G][b#]?)?)(?![a-zA-Z0-9])")

def add_toc(doc):
    p = doc.add_paragraph()
    run = p.add_run()
    
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
    
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

def create_columns(section, num_columns):
    sectPr = section._sectPr
    cols = sectPr.xpath('./w:cols')[0]
    cols.set(qn('w:num'), str(num_columns))

def is_valid_chord(word: str) -> bool:
    """Rigorous musical chord validation."""
    musical_atoms = set("ABCDEFGmb#()0123456789/+")
    # Remove safe suffixes
    sfxs = ["maj", "min", "add", "sus", "dim", "aug", "M"]
    c_word = word
    for s in sfxs: c_word = c_word.replace(s, "")
    
    if not c_word: return False
    has_root = any(c in "ABCDEFG" for c in word)
    return has_root and all(c in musical_atoms for c in c_word)

def generate_docx(songs: list, output_filename: str = "Livreto.docx", cover_image_path: Optional[str] = None) -> str:
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(0.7)
        section.bottom_margin = Cm(0.7)
        section.left_margin = Cm(0.7)
        section.right_margin = Cm(0.7)
    
    # Capa & TOC
    if cover_image_path and os.path.exists(cover_image_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture(cover_image_path, width=Cm(12))
        doc.add_heading('Caminho das Cifras', 0).alignment = WD_ALIGN_PARAGRAPH.CENTER
    else:
        doc.add_heading('Caminho das Cifras', 0)
    doc.add_paragraph('Livreto Gerado Automaticamente').alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_page_break()
    
    doc.add_heading('Sumário', level=1)
    add_toc(doc)
    doc.add_page_break()
    
    songs_sorted = sorted(songs, key=lambda x: str(x['song_name']).lower())
    temp_dir = tempfile.mkdtemp()
    out_p = os.path.join(os.path.dirname(__file__), output_filename)
    
    try:
        for idx, song in enumerate(songs_sorted):
            # Page Anchor Constants (V31 Iron Box: 26.0cm safety limit)
            # A4 Height is 29.7cm. With 0.7cm margins, we have 28.3cm.
            # 26.0cm gives us a generous buffer for Word's internal logic.
            A4_H: float = 26.0 
            CM_PT: float = 0.03528
            L_SPACING: float = 0.90
            
            lines = [l.rstrip() for l in str(song['content']).split('\n')]
            line_cnt = len(lines)
            max_line_w = max(len(l) for l in lines) if lines else 1
            
            unique_chords = set()
            for l in lines:
                for m in CHORD_REGEX.findall(l):
                    if is_valid_chord(m): unique_chords.add(m)
            
            show_diag = song.get('show_chords', True)
            num_chords = len(unique_chords)
            
            # 1. FIXED DICTIONARY SPACE
            dict_h: float = 0.0
            if show_diag and num_chords > 0:
                rows = (num_chords + 5) // 6
                # V31: Reduced base height of dictionary cells to be more compact
                dict_h = 0.4 + (rows * 3.3)
            
            # 2. FIXED HEADER SPACE
            header_h: float = 1.6 
            
            # 3. CALCULATE MUSIC SPACE
            music_avail_h = A4_H - dict_h - header_h
            
            # 4. OPTIMIZE LAYOUT (V32: Proportional Font & Smart Columns)
            # Thresholds: 1 column is preferred unless it's too long
            n_cols = 1
            eff_l = float(line_cnt)
            
            # V31: SAFETY FACTOR (Courier New 1pt height is approx 1.35pt including leading)
            LEADING_FACTOR: float = 1.35 
            
            # Search for best Font/Spacing/Column triplet
            f_size = 16.0  # Increased max font for proportional filling
            L_SPACING = 1.05 # Start with slightly more space for small songs
            
            avail_h: float = music_avail_h

            def calculate_layout(fs, ls, nc, el):
                h = (el * fs * ls * LEADING_FACTOR * CM_PT)
                cw = 19.6 if nc == 1 else 9.2
                wrapped = (max_line_w * fs * 0.0215) > cw
                return h, wrapped

            # Optimization Loop
            while f_size > 7.5:
                cur_h, is_wrapped = calculate_layout(f_size, L_SPACING, n_cols, eff_l)
                
                if cur_h <= avail_h and not is_wrapped:
                    # If we have a fit, we are done (started from large font)
                    break
                
                # If 1 column doesn't fit even at 10pt, try 2 columns
                if n_cols == 1 and (cur_h > avail_h or is_wrapped) and f_size <= 10.0:
                    n_cols = 2
                    eff_l = (float(line_cnt) / 2.0) + 0.8 # Recalculate effective length
                    f_size = 13.0 # Reset font for 2-column attempt
                    L_SPACING = 0.95
                    continue
                
                # If line count is very high, force 2 columns earlier
                if n_cols == 1 and line_cnt > 28:
                    n_cols = 2
                    eff_l = (float(line_cnt) / 2.0) + 0.8
                    f_size = 13.0
                    L_SPACING = 0.95
                    continue

                # Step down
                if float(L_SPACING) > 0.85:
                    L_SPACING = float(L_SPACING) - 0.02
                else:
                    f_size = float(f_size) - 0.5
                    L_SPACING = 1.0 # Reset spacing for new font attempt
            
            # Post-loop adjustment: if small song, expand spacing to "close the page"
            cur_fit_h, _ = calculate_layout(float(f_size), float(L_SPACING), n_cols, float(eff_l))
            if cur_fit_h < avail_h * 0.9 and float(f_size) >= 12.0:
                new_ls = float(avail_h) / (float(eff_l) * float(f_size) * LEADING_FACTOR * CM_PT)
                L_SPACING = min(1.2, new_ls * 0.98) # Safe cap
            section = doc.add_section(WD_SECTION.CONTINUOUS)
            create_columns(section, 1)
            
            shape_key = song.get('key', 'C')
            sounding_key = song.get('sounding_key', shape_key)
            capo = song.get('capo', 0)
            
            h_txt = f"{str(song['song_name']).title()} - {song['artist_name']}"
            h = doc.add_heading(h_txt, level=1)
            h.paragraph_format.space_before = Pt(0)
            h.paragraph_format.space_after = Pt(2)
            
            tom_text = f"Tom: {sounding_key}"
            if capo > 0:
                tom_text += f" (forma de {shape_key})"
            p_t = doc.add_paragraph(tom_text)
            p_t.style.font.name = 'Courier New'
            p_t.style.font.bold = True
            
            if capo > 0:
                p_t.paragraph_format.space_after = Pt(0)
                p_c = doc.add_paragraph(f"Capo: {capo}ª casa")
                p_c.style.font.name = 'Courier New'
                p_c.style.font.bold = True
                p_c.paragraph_format.space_after = Pt(2)
            else:
                p_t.paragraph_format.space_after = Pt(2)

            if n_cols == 2:
                section = doc.add_section(WD_SECTION.CONTINUOUS)
                create_columns(section, 2)
            
            for l_str in lines:
                p = doc.add_paragraph()
                p.style.font.name = 'Courier New'
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = L_SPACING
                p.paragraph_format.keep_together = True
                
                words = l_str.split()
                matches = list(CHORD_REGEX.finditer(l_str))
                c_cands = [m.group() for m in matches if is_valid_chord(m.group())]
                is_c_l = len(c_cands) > 0 and (len(c_cands) >= (len(words) * 0.5) or l_str.startswith('    '))
                
                if is_c_l:
                    p.paragraph_format.keep_with_next = True
                    last_idx = 0
                    for m in CHORD_REGEX.finditer(l_str):
                        c_txt = m.group()
                        if not is_valid_chord(c_txt): continue
                        st, en = m.span()
                        if st > last_idx:
                            s_part = l_str[last_idx:st]
                            p.add_run(s_part).font.size = Pt(f_size)
                        run = p.add_run(c_txt)
                        run.bold = True
                        run.font.size = Pt(f_size)
                        last_idx = en
                    if last_idx < len(l_str):
                        s_rest = l_str[last_idx:]
                        p.add_run(s_rest).font.size = Pt(f_size)
                else:
                    run = p.add_run(l_str)
                    run.font.size = Pt(f_size)
                for r in p.runs: r.font.name = 'Courier New'

            # 5. ABSOLUTE BOTTOM ANCHOR
            if show_diag and num_chords > 0:
                if n_cols == 2:
                    section = doc.add_section(WD_SECTION.CONTINUOUS)
                    create_columns(section, 1)
                
                # Final calculation for real anchor
                actual_music_h: float = (eff_l * f_size * L_SPACING * LEADING_FACTOR * CM_PT)
                spacer_h: float = A4_H - actual_music_h - dict_h - header_h
                
                # Anchor dictionary to bottom if space permits
                if spacer_h > 0.1:
                    doc.add_paragraph().paragraph_format.space_before = Cm(spacer_h)
                
                p_dic = doc.add_paragraph()
                r_dic = p_dic.add_run("Dicionário de Acordes:")
                r_dic.bold = True
                r_dic.font.name = 'Courier New'
                p_dic.paragraph_format.space_after = Pt(0)
                
                c_list = sorted(list(unique_chords))
                c_imgs = build_chord_dictionary(c_list, os.path.join(temp_dir, f"s_{idx}"))
                
                c_cnt = min(6, len(c_imgs))
                if c_cnt > 0:
                    tbl = doc.add_table(rows=1, cols=c_cnt)
                    tbl.autofit = True
                    cells = tbl.rows[0].cells
                    col_i = 0
                    for c_name, img_p in c_imgs:
                        if col_i >= c_cnt:
                            cells = tbl.add_row().cells
                            col_i = 0
                        para = cells[col_i].paragraphs[0]
                        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        if os.path.exists(img_p):
                            # V31: Scale down chords if space is tight
                            i_w = 0.68 if float(music_avail_h) > 15.0 else 0.58
                            para.add_run().add_picture(img_p, width=Inches(i_w))
                        col_i += 1
            
            if idx < len(songs_sorted) - 1:
                doc.add_page_break()
                
        doc.save(out_p)
    finally:
        if os.path.exists(temp_dir): shutil.rmtree(temp_dir)
    
    return out_p
