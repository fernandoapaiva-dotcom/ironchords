// AlignmentWorklet.js
// Buffers PCM audio and sends chunks to the main thread for WebSocket streaming

class AlignmentWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 8192; // Approx 185ms at 44.1kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.ptr = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];

        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.ptr++] = channelData[i];

            if (this.ptr >= this.bufferSize) {
                // Send buffer to main thread
                this.port.postMessage({
                    type: 'audio_chunk',
                    payload: this.buffer.buffer
                }, [this.buffer.buffer]);

                // Re-allocate buffer (since we transferred the old one)
                this.buffer = new Float32Array(this.bufferSize);
                this.ptr = 0;
            }
        }

        return true;
    }
}

registerProcessor('alignment-worklet', AlignmentWorkletProcessor);
