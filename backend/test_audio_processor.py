import numpy as np
import librosa
from audio_processor import IronChordsPlayer

def make_tone(freq, duration_sec, sr=44100):
    t = np.linspace(0, duration_sec, int(sr * duration_sec), False)
    # Generate a sine wave with some harmonics to look like a real instrument
    tone = np.sin(freq * t * 2 * np.pi) + 0.5 * np.sin(freq * 2 * t * 2 * np.pi) + 0.25 * np.sin(freq * 3 * t * 2 * np.pi)
    return tone.astype(np.float32)

def make_noise(duration_sec, sr=44100):
    return (np.random.rand(int(sr * duration_sec)) * 2 - 1).astype(np.float32)

def make_voice_like(duration_sec, sr=44100):
    # This won't fool Silero VAD, but we'll try to get the instrument to ignore it.
    t = np.linspace(0, duration_sec, int(sr * duration_sec), False)
    # A wobbly pitch
    freq = 300 + 50 * np.sin(5 * t * 2 * np.pi)
    tone = np.sin(freq * t * 2 * np.pi)
    return tone.astype(np.float32)

player = IronChordsPlayer()

print("--- TESTING NOISE ---")
noise = make_noise(1.0) * 0.1
print("Noise response:", player.process_audio_chunk(noise.tobytes()))

print("\n--- TESTING 440Hz TONE (INSTRUMENT) ---")
tone = make_tone(440, 1.0) * 0.5
print("Tone response:", player.process_audio_chunk(tone.tobytes()))

print("\n--- TESTING WOBBLY VOICE (NON-INSTRUMENT) ---")
wobble = make_voice_like(1.0) * 0.5
print("Wobble response:", player.process_audio_chunk(wobble.tobytes()))

# Print internal diagnostics for the 440Hz tone
print("\n--- DIAGNOSTICS FOR 440Hz TONE ---")
has_instr = player._detect_instrument(tone)
print("Manually calling _detect_instrument returned:", has_instr)
