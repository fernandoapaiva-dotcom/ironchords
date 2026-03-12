import os
import io

def generate_chord_image(chord_name, positions, output_path):
    """
    Generates a simple 6-string guitar chord diagram and saves it.
    positions is a string like "X32010" for C Major.
    """
    from PIL import Image, ImageDraw, ImageFont
    width = 150
    height = 200
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to load a font, otherwise use default
    try:
        font_large = ImageFont.truetype("arialbd.ttf", 24)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw Chord Name
    text_bbox = draw.textbbox((0, 0), chord_name, font=font_large)
    text_width = text_bbox[2] - text_bbox[0]
    draw.text(((width - text_width) / 2, 10), chord_name, font=font_large, fill='black')

    # Grid constants
    grid_x_start = 30
    grid_y_start = 50
    grid_x_end = width - 30
    grid_y_end = height - 30
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

    # Draw finger positions
    for i, char in enumerate(positions):
        x = grid_x_start + i * string_spacing
        if char == 'X' or char == 'x':
            draw.text((x - 5, grid_y_start - 20), 'X', font=font_small, fill='black')
        elif char == '0':
            draw.ellipse([x - 4, grid_y_start - 18, x + 4, grid_y_start - 10], outline='black', width=1)
        elif char.isdigit():
            fret = int(char)
            if fret > 0 and fret <= 4:
                # Draw filled circle centered on string and middle of fret
                cy = grid_y_start + (fret - 0.5) * fret_spacing
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

def build_chord_dictionary(chords_list, temp_dir):
    """
    Given a list of chords found in a song, returns a list of file paths to generated images.
    """
    image_paths = []
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    for ch in chords_list:
        clean_ch = ch.split('/')[0] if '/' in ch else ch  # simplify bass notes
        pos = COMMON_CHORDS.get(clean_ch)
        if not pos:
            # Fallback simple empty diagram if unknown pattern
            pos = "XXXXXX"
            
        img_path = os.path.join(temp_dir, f"{ch.replace('#', 'sharp').replace('/', '_')}.png")
        generate_chord_image(ch, pos, img_path)
        image_paths.append((ch, img_path))
        
    return image_paths
