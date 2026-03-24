import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class FaceTracker {
    constructor() {
        this.video = null;
        this.stream = null;
        this.landmarker = null;
        this.animationFrameId = null;
        
        this.isTracking = false;
        this.onBlinkCountChange = null;
        this.onBlinkGestureDetected = null;
        this.onStatusChange = null;

        // Blink Detection State
        this.blinkTimestamps = [];
        this.isEyesClosed = false;
        this.requiredBlinks = 3; // Default 3 blinks
        
        // EAR Constants
        this.EAR_THRESHOLD_CLOSE = 0.22; // Relaxed: easy to trigger close
        this.EAR_THRESHOLD_OPEN = 0.24;  // Relaxed: easy to trigger open
        this.BLINK_WINDOW_MS = 3000;     // 3 seconds window
        
        // Landmark indices (MediaPipe Face Mesh)
        this.LEFT_EYE = [362, 385, 387, 263, 373, 380];
        this.RIGHT_EYE = [33, 160, 158, 133, 153, 144];
    }

    setRequiredBlinks(n) {
        this.requiredBlinks = Math.max(2, Math.min(n, 5));
        console.log(`[FaceTracker] Required blinks set to: ${this.requiredBlinks}`);
    }

    async init() {
        try {
            if (this.onStatusChange) this.onStatusChange('carregando_ia');
            
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            
            this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "CPU" // CPU is much safer on mobile Chrome than GPU
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1
            });
            return true;
        } catch (error) {
            console.error("[FaceTracker] Falha ao inicializar o FaceLandmarker:", error);
            if (this.onStatusChange) this.onStatusChange('erro_ia');
            return false;
        }
    }

    async start() {
        if (this.isTracking) return;
        
        if (!this.landmarker) {
            const success = await this.init();
            if (!success) return;
        }

        try {
            if (this.onStatusChange) this.onStatusChange('solicitando_camera');
            
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            this.video = document.createElement("video");
            this.video.playsInline = true;
            this.video.autoplay = true;
            this.video.style.position = "absolute";
            this.video.style.opacity = "0";
            this.video.style.pointerEvents = "none";
            this.video.style.width = "1px";
            this.video.style.height = "1px";
            // MUST append to DOM on mobile, otherwise the browser suspends playback!
            document.body.appendChild(this.video);
            
            this.video.srcObject = this.stream;

            await new Promise((resolve) => {
                this.video.onloadeddata = () => {
                    this.video.play().catch(e => console.warn("Video autplay blocked", e));
                    resolve();
                };
            });

            this.isTracking = true;
            if (this.onStatusChange) this.onStatusChange('rastreando');
            
            let lastVideoTime = -1;
            
            const renderLoop = (time) => {
                if (!this.isTracking) return;

                if (!this.isPausedForScroll && this.video.currentTime !== lastVideoTime) {
                    lastVideoTime = this.video.currentTime;
                    const results = this.landmarker.detectForVideo(this.video, performance.now());
                    
                    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                        const landmarks = results.faceLandmarks[0];
                        this.processLandmarks(landmarks);
                    }
                }
                
                this.animationFrameId = requestAnimationFrame(renderLoop);
            };
            
            this.animationFrameId = requestAnimationFrame(renderLoop);

        } catch (error) {
            console.error("[FaceTracker] Erro ao iniciar a câmera:", error);
            if (this.onStatusChange) this.onStatusChange('erro_camera');
        }
    }

    stop() {
        this.isTracking = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
            if (this.video.parentNode) {
                this.video.parentNode.removeChild(this.video);
            }
            this.video = null;
        }

        if (this.onStatusChange) this.onStatusChange('inativo');
    }

    // --- EAR CALCULATIONS ---
    
    // Calculate 3D euclidean distance
    distance(p1, p2) {
        // Z is optional but helpful for depth
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(dz, 2));
    }

    // Eye indices based on standard 6 points
    calculateEAR(eye, landmarks) {
        // eye structure: [ p1, p2, p3, p4, p5, p6 ]
        // vertical distances: p2 to p6, p3 to p5
        // horizontal distance: p1 to p4
        
        const dv1 = this.distance(landmarks[eye[1]], landmarks[eye[5]]);
        const dv2 = this.distance(landmarks[eye[2]], landmarks[eye[4]]);
        const dh = this.distance(landmarks[eye[0]], landmarks[eye[3]]);
        
        return (dv1 + dv2) / (2.0 * dh);
    }

    processLandmarks(landmarks) {
        const leftEAR = this.calculateEAR(this.LEFT_EYE, landmarks);
        const rightEAR = this.calculateEAR(this.RIGHT_EYE, landmarks);
        
        // Average EAR from both eyes
        const ear = (leftEAR + rightEAR) / 2.0;

        // --- AUTO-CALIBRATION: 5-second rolling window ---
        const nowMs = Date.now();
        if (!this.recentEARs) this.recentEARs = [];
        this.recentEARs.push({ time: nowMs, value: ear });
        this.recentEARs = this.recentEARs.filter(e => nowMs - e.time <= 5000);

        // Calculate baseline robustly: 90th percentile (ignores blinks effectively)
        const sortedEARs = [...this.recentEARs].map(e => e.value).sort((a,b) => a-b);
        const baselineEAR = sortedEARs[Math.floor(sortedEARs.length * 0.9)] || 0.25;

        // Dynamic Thresholds
        // We use a tight hysteresis loop so rapid/squinty blinking registers easily.
        // It doesn't require the eye to fully open back to 100% to register the next blink.
        const thresholdClose = baselineEAR * 0.65; // Eye drops below 65% of baseline = blink
        const thresholdOpen = baselineEAR * 0.72;  // Eye opens above 72% of baseline = reset

        if (this.onDebugInfo) {
            this.onDebugInfo(`EAR: ${ear.toFixed(3)} | Limite: <${thresholdClose.toFixed(3)} | Piscadas: ${this.blinkTimestamps.length}/${this.requiredBlinks}`);
        }

        // Simple State Machine for Blinks
        if (ear < thresholdClose && !this.isEyesClosed) {
            // Eyes just closed
            this.isEyesClosed = true;
        } 
        else if (ear > thresholdOpen && this.isEyesClosed) {
            // Eyes just opened: Register a successful blink
            this.isEyesClosed = false;
            
            const now = Date.now();
            this.blinkTimestamps.push(now);
            
            // Allow more time for higher blink thresholds (e.g. 5 blinks need more than 3s)
            const windowMs = Math.max(3000, this.requiredBlinks * 1000);
            this.blinkTimestamps = this.blinkTimestamps.filter(t => now - t <= windowMs);
            
            if (this.onBlinkCountChange) {
                this.onBlinkCountChange(this.blinkTimestamps.length);
            }

            console.log(`[FaceTracker] Piscou! (${this.blinkTimestamps.length}/${this.requiredBlinks}) EAR: ${ear.toFixed(3)}`);

            // Check if we hit the required number of blinks in the window
            if (this.blinkTimestamps.length >= this.requiredBlinks) {
                console.log(`[FaceTracker] ${this.requiredBlinks} PISCADAS DETECTADAS! Disparando scroll...`);
                
                // --- CPU OPTIMIZATION ---
                // Suspend MediaPipe for 800ms immediately so the UI thread has 100% power to perform the smooth scroll.
                this.isPausedForScroll = true;
                setTimeout(() => { this.isPausedForScroll = false; }, 800);

                if (this.onBlinkGestureDetected) {
                    this.onBlinkGestureDetected();
                }
                // Clear timestamps to prevent consecutive multi-triggers
                this.blinkTimestamps = [];
                if (this.onBlinkCountChange) this.onBlinkCountChange(0);
            }
        }
    }
}
