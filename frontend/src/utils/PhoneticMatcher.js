/**
 * PhoneticMatcher.js
 * Advanced similarity engine for matching sung Portuguese lyrics.
 *
 * Strategy:
 * 1. Normalize + alias-expand both the transcript and the target line
 * 2. Score word overlap with partial matching (handles slurred/cut words)
 * 3. Return a 0..1 confidence score
 */

export class PhoneticMatcher {
    // Common speech-recognition mistakes for Portuguese worship/pop music
    static ALIASES = {
        'benção': ['bênção', 'bensao', 'bencao', 'bençao'],
        'espírito': ['espirito', 'espirito santo', 'espirito sant'],
        'glória': ['gloria', 'gloria a', 'glória a'],
        'jesus': ['jezu', 'jesu', 'jezuz', 'jeus'],
        'senhor': ['senor', 'sinhor', 'sinho'],
        'deus': ['deu', 'deis', 'deos'],
        'amor': ['amo', 'amou', 'amô'],
        'coração': ['coracao', 'coraçao', 'curacao', 'corasao'],
        'para': ['pra', 'pah', 'pro'],
        'está': ['ta', 'tá', 'esta'],
        'estou': ['tou', 'tô', 'to'],
        'você': ['vce', 'voce', 'vc'],
        'nós': ['nois', 'nóis'],
        'céu': ['ceu', 'seu'],
        'vida': ['viva'],
        'teu': ['teu', 'tee'],
        'meu': ['meu', 'mee'],
        'pai': ['pai', 'pay'],
        'filho': ['fio', 'fillo'],
        'louvai': ['lovai', 'luvai', 'luvad'],
        'salvo': ['salvo', 'sarvo'],
        'graça': ['graca', 'grasa', 'grassa'],
        'misericórdia': ['misericordia', 'misericorida'],
        'aleluia': ['aleluia', 'aleluja', 'aleluya'],
        'amen': ['amen', 'amem'],
        'santo': ['sant', 'samto'],
    };

    /**
     * Normalize: lowercase, strip accents, keep only a-z 0-9 and spaces
     */
    static normalize(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Expand known phonetic aliases in a transcript before comparing
     */
    static applyAliases(text) {
        let t = text.toLowerCase();
        for (const [canonical, aliases] of Object.entries(this.ALIASES)) {
            const norm = this.normalize(canonical);
            for (const alias of aliases) {
                const a = this.normalize(alias);
                t = t.replace(new RegExp(`\\b${a}\\b`, 'g'), norm);
            }
        }
        return t;
    }

    /**
     * Tokenize to meaningful words (>= 2 chars, filter noise)
     */
    static tokenize(text) {
        return this.normalize(this.applyAliases(text))
            .split(/\s+/)
            .filter(w => w.length >= 2);
    }

    /**
     * Word-level similarity: ratio of transcript words that appear in the line.
     * - Exact match: +1.0 weight
     * - Prefix match (>= 4 chars): +0.6 weight (handles word truncation mid-breath)
     * - Substring of longer word: +0.4 weight
     *
     * Score is normalized by transcript word count (how much of what was heard is in this line).
     */
    static scoreWords(transcriptWords, lineWords) {
        if (transcriptWords.length === 0 || lineWords.length === 0) return 0;

        let totalWeight = 0;
        let matchedWeight = 0;

        for (const tw of transcriptWords) {
            // Weight longer words more heavily (they're more distinctive)
            const w = tw.length >= 6 ? 2.0 : tw.length >= 4 ? 1.3 : 1.0;
            totalWeight += w;

            let best = 0;
            for (const lw of lineWords) {
                if (lw === tw) { best = 1.0; break; }
                if (tw.length >= 4 && (lw.startsWith(tw) || tw.startsWith(lw))) {
                    best = Math.max(best, 0.7);
                }
                if (tw.length >= 4 && (lw.includes(tw) || tw.includes(lw))) {
                    best = Math.max(best, 0.5);
                }
            }
            matchedWeight += best * w;
        }

        return totalWeight > 0 ? matchedWeight / totalWeight : 0;
    }

    /**
     * Main scoring function. Returns confidence 0..1.
     */
    static score(transcript, line) {
        // Strip chord-only lines — they'll never match
        if (!line || !line.trim()) return 0;
        const transcriptWords = this.tokenize(transcript);
        const lineWords = this.tokenize(line);
        if (transcriptWords.length === 0 || lineWords.length === 0) return 0;
        return this.scoreWords(transcriptWords, lineWords);
    }

    /**
     * Convenience: returns true if score meets threshold.
     */
    static isMatch(transcript, line, threshold = 0.45) {
        return this.score(transcript, line) >= threshold;
    }

    /**
     * Find the BEST matching block index from a list of {lyric} candidate blocks.
     * Applies a proximity bias so blocks near `currentIndex` score a bonus.
     *
     * Returns { index, confidence } or null if nothing exceeds minThreshold.
     */
    static findBestBlock(transcript, blocks, currentIndex, options = {}) {
        const {
            searchBackward = 0,    // how many blocks to search behind current
            searchForward = 12,    // how many blocks to search ahead
            minThreshold = 0.38,   // minimum required confidence
            proximityBonus = 0.12, // bonus for blocks close to current position
            anchored = true,       // if false, search from start (pre-anchor)
        } = options;

        const from = anchored ? Math.max(0, currentIndex - searchBackward) : 0;
        const to = anchored
            ? Math.min(blocks.length - 1, currentIndex + searchForward)
            : Math.min(blocks.length - 1, 30);

        let bestScore = -Infinity;
        let bestIndex = -1;

        for (let i = from; i <= to; i++) {
            const block = blocks[i];
            if (!block.lyric || !block.lyric.trim()) continue;

            let s = this.score(transcript, block.lyric);

            // Proximity bonus: blocks closer to current position score a bit higher
            // This prevents the player from jumping far away on a weak match
            if (anchored) {
                const dist = Math.abs(i - currentIndex);
                const prox = Math.max(0, proximityBonus - dist * 0.015);
                s += prox;
            }

            if (s > bestScore) {
                bestScore = s;
                bestIndex = i;
            }
        }

        if (bestScore < minThreshold || bestIndex === -1) return null;
        return { index: bestIndex, confidence: bestScore };
    }
}
