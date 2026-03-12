import os
import io
from PIL import Image, ImageDraw, ImageFont

def generate_chord_image(chord_name, positions, output_path):
    width = 150
    height = 200
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
# Global font and template cache
_FONT_CACHE = {}
_GRID_TEMPLATE = None

def get_font(size, bold=False):
    key = f"{size}_{bold}"
    if key not in _FONT_CACHE:
        try:
            name = "arialbd.ttf" if bold else "arial.ttf"
            _FONT_CACHE[key] = ImageFont.truetype(name, size)
        except:
            _FONT_CACHE[key] = ImageFont.load_default()
    return _FONT_CACHE[key]

def get_grid_template():
    global _GRID_TEMPLATE
    if _GRID_TEMPLATE is None:
        width, height = 150, 200
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Grid constants
        grid_x_start, grid_y_start = 30, 50
        grid_x_end, grid_y_end = width - 30, height - 30
        string_spacing = (grid_x_end - grid_x_start) / 5
        fret_spacing = (grid_y_end - grid_y_start) / 4

        # Draw Nut (thick line)
        draw.line([(grid_x_start, grid_y_start), (grid_x_end, grid_y_start)], fill='black', width=4)

        # Draw Frets
        for i in range(1, 5):
            y = grid_y_start + i * fret_spacing
            draw.line([(grid_x_start, y), (grid_x_end, y)], fill='black', width=2)
            
        # Draw Strings
        for i in range(6):
            x = grid_x_start + i * string_spacing
            draw.line([(x, grid_y_start), (x, grid_y_end)], fill='black', width=2)
            
        _GRID_TEMPLATE = img
    return _GRID_TEMPLATE.copy()

def generate_chord_image(chord_name, positions, output_path):
    img = get_grid_template()
    draw = ImageDraw.Draw(img)
    width, _ = img.size
    
    font_large = get_font(24, bold=True)
    font_small = get_font(14)

    # Draw Chord Name
    text_bbox = draw.textbbox((0, 0), chord_name, font=font_large)
    tx_w = text_bbox[2] - text_bbox[0]
    draw.text(((width - tx_w) / 2, 10), chord_name, font=font_large, fill='black')

    # Grid constants for finger placement
    gx, gy = 30, 50
    ss = (150 - 60) / 5
    fs = (200 - 80) / 4

    # Draw finger positions
    for i, char in enumerate(positions):
        x = gx + i * ss
        if char.upper() == 'X':
            draw.text((x - 5, gy - 20), 'X', font=font_small, fill='black')
        elif char == '0':
            draw.ellipse([x - 4, gy - 18, x + 4, gy - 10], outline='black', width=1)
        elif char.isdigit():
            f = int(char)
            if 0 < f <= 4:
                cy = gy + (f - 0.5) * fs
                r = 6
                draw.ellipse([x - r, cy - r, x + r, cy + r], fill='black')

    img.save(output_path)
    return output_path

COMMON_CHORDS = {
    # Major
    "C": "X32010", "C#": "X46664", "Db": "X46664", 
    "D": "XX0232", "D#": "XX1343", "Eb": "XX1343", 
    "E": "022100", "F": "133211", "F#": "244322", "Gb": "244322",
    "G": "320003", "G#": "466544", "Ab": "466544",
    "A": "X02220", "A#": "X13331", "Bb": "X13331",
    "B": "X24442",
    # Minor
    "Cm": "X35543", "C#m": "X46654", "Dbm": "X46654",
    "Dm": "XX0231", "D#m": "XX1342", "Ebm": "XX1342",
    "Em": "022000", "Fm": "133111", "F#m": "244222", "Gbm": "244222",
    "Gm": "355333", "G#m": "466444", "Abm": "466444",
    "Am": "X02210", "A#m": "X13321", "Bbm": "X13321",
    "Bm": "X24432",
    # 7ths
    "C7": "X32310", "D7": "XX0212", "E7": "020100", "F7": "131211",
    "G7": "320001", "A7": "X02020", "B7": "X21202",
    # m7
    "Cm7": "X35343", "Dm7": "XX0211", "Em7": "022030", "Fm7": "131111",
    "Gm7": "353333", "Am7": "X02010", "Bm7": "X24232",
    # maj7
    "Cmaj7": "X32000", "Dmaj7": "XX0222", "Emaj7": "021100", "Fmaj7": "1X2210",
    "Gmaj7": "3X443X", "Amaj7": "X02120", "Bmaj7": "X24342",
    # sus4
    "Dsus4": "XX0233", "Esus4": "022200", "Asus4": "X02230"
}

# Global persistent cache directory (within the ephemeral Render disk)
CACHE_DIR = os.path.join(os.path.dirname(__file__), "chords_cache")

def build_chord_dictionary(chords_list, temp_dir):
    """
    Given a list of chords, returns a list of file paths to generated images.
    Uses a global cache to avoid redundant drawing.
    """
    image_paths = []
    
    # Ensure both central cache and request-specific temp dir exist
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    for ch in chords_list:
        clean_ch = ch.split('/')[0] if '/' in ch else ch
        pos = COMMON_CHORDS.get(clean_ch, "XXXXXX")
            
        file_safe_name = ch.replace('#', 'sharp').replace('/', '_')
        central_path = os.path.join(CACHE_DIR, f"{file_safe_name}.png")
        temp_path = os.path.join(temp_dir, f"{file_safe_name}.png")
        
        # 1. If not in central cache, generate it
        if not os.path.exists(central_path):
            generate_chord_image(ch, pos, central_path)
            
        # 2. Copy/Link to temp_dir (Word needs local paths that it can safely "consume" or we can just point to the central one)
        # Actually, document_generator uses these paths. Pointing directly to central is fine!
        image_paths.append((ch, central_path))
        
    return image_paths
