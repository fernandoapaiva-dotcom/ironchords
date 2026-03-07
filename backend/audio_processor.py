import json
import logging
import numpy as np
import librosa
import torch
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IronChordsPlayer:
    def __init__(self, sample_rate=44100):
        # Estados da FSM: SEGUINDO_NORMAL, CONGELAR_LETRA_SEGUIR_VIOLA, ACAPELLA, MODO_BANDA_VAMPING
        self.state = "SEGUINDO_NORMAL"
        self.sample_rate = sample_rate
        self.is_running = False
        
        # Parâmetros de Detecção
        self.vad_threshold = 0.25  # More lenient for acapella
        self.vocal_energy_threshold = 0.002 # Baseline energy for voice
        self.instr_rms_threshold = 0.015 # Higher threshold to avoid false instr from noise
        
    def _load_vad(self):
        if hasattr(self, 'model') and self.model is not None:
            return
        logger.info("Lazy loading Silero VAD...")
        try:
            self.model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                              model='silero_vad',
                                              force_reload=False,
                                              onnx=False)
            (self.get_speech_timestamps, _, self.read_audio, _, _) = utils
            logger.info("Silero VAD loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Silero VAD: {e}")
            self.model = None

    def process_audio_chunk(self, audio_bytes: bytes):
        """
        Processa um pedaço de áudio PCM (Float32) vindo do frontend.
        """
        try:
            # We copy to avoid read-only buffer issues, and clip to avoid blowing up the neural network
            audio_data = np.frombuffer(audio_bytes, dtype=np.float32).copy()
            audio_data = np.clip(audio_data, -1.0, 1.0)
            
            if len(audio_data) == 0:
                return self._generate_response()

            # 1. Voice Activity Detection (Silero)
            has_voice, speech_prob = self._detect_voice(audio_data)
            
            # 2. Instrument Detection (Chroma / Energy)
            has_instrument = self._detect_instrument(audio_data)
            
            rms = np.sqrt(np.mean(audio_data**2))
            
            # Visual Debug: ASCII bar to see audio level in terminal
            bar_length = int(rms * 500) # Adjusted scale for the clipped audio
            visual_bar = "█" * min(50, bar_length)
            
            # Log at INFO level for visibility during debugging
            logger.info(f"LVL: [{visual_bar.ljust(50)}] V_Prob: {speech_prob:.2f} | Instr: {has_instrument}")
            
            self._update_state(has_voice, has_instrument)
            
            return self._generate_response()
        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}")
            return self._generate_response()

    def _detect_voice(self, audio_data):
        if self.model is None:
            rms = np.sqrt(np.mean(audio_data**2))
            return float(rms) > self.vocal_energy_threshold, 0.0
            
        try:
            rms = np.sqrt(np.mean(audio_data**2))
            if rms < 0.0001:
                return False, 0.0
                
            if self.sample_rate != 16000:
                audio_16k = librosa.resample(audio_data, orig_sr=self.sample_rate, target_sr=16000)
            else:
                audio_16k = audio_data
                
            audio_tensor = torch.from_numpy(audio_16k)
            if audio_tensor.ndim > 1:
                audio_tensor = audio_tensor.mean(dim=0)
                
            # Silero strictly requires 512 samples at 16000Hz
            chunk_size = 512
            probs = []
            for i in range(0, len(audio_tensor), chunk_size):
                chunk = audio_tensor[i:i+chunk_size]
                if len(chunk) < chunk_size:
                    chunk = torch.nn.functional.pad(chunk, (0, chunk_size - len(chunk)))
                # The model requires batch dimension if dim=1, but usually 1D works. Let's ensure 1D.
                prob = self.model(chunk, 16000).item()
                probs.append(prob)
                
            speech_prob = float(np.mean(probs)) if probs else 0.0
            
            is_voice = speech_prob > self.vad_threshold
            return is_voice, speech_prob
        except Exception as e:
            logger.warning(f"VAD inference error: {e}")
            return False, 0.0

    def _detect_instrument(self, audio_data):
        if len(audio_data) < 2048:
            return False
            
        try:
            rms = np.sqrt(np.mean(audio_data**2))
            
            # Increased threshold to ignore background noise/fans
            if rms < 0.015: 
                return False

            harmonic = librosa.effects.harmonic(audio_data, margin=2.0)
            rms_harmonic = np.sqrt(np.mean(harmonic**2))
            harmonic_ratio = rms_harmonic / (rms + 1e-9)
            
            # Require higher harmonic energy and a stronger harmonic ratio for polyphonic instruments (guitar/viola)
            is_instr = rms_harmonic > 0.010 and harmonic_ratio > 0.45
            return bool(is_instr)
        except Exception as e:
            logger.debug(f"Instr Detection error: {e}")
            return False
    def _update_state(self, has_voice, has_instrument):
        previous_state = self.state
        
        if has_voice and has_instrument:
            self.state = "SEGUINDO_NORMAL"
        elif not has_voice and has_instrument:
            self.state = "CONGELAR_LETRA_SEGUIR_VIOLA"
        elif has_voice and not has_instrument:
            self.state = "ACAPELLA"
        else:
            self.state = "MODO_BANDA_VAMPING"
            
        if previous_state != self.state:
            logger.info(f"FSM State transition: {previous_state} -> {self.state} (has_voice={has_voice}, has_instrument={has_instrument})")

    def _generate_response(self):
        return {
            "state": self.state,
            "action": "advance" if self.state in ["SEGUINDO_NORMAL", "ACAPELLA"] else "freeze",
            "vamping": self.state == "MODO_BANDA_VAMPING",
            "follow_instrument": self.state == "CONGELAR_LETRA_SEGUIR_VIOLA"
        }
