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
     * Checks if the transcript contains words from the END of the line,
     * signaling the singer is finishing it. This allows anticipating the next line.
     */
    static isCompletingLine(transcript, line) {
        if (!line || !line.trim()) return false;
        const transcriptWords = this.tokenize(transcript);
        const lineWords = this.tokenize(line);
        if (transcriptWords.length === 0 || lineWords.length < 2) return false;

        // Take the last 2 or 3 words of the line
        const endWords = lineWords.slice(-Math.min(3, Math.ceil(lineWords.length / 2)));

        // See if any of these end words are perfectly in the transcript
        for (const tw of transcriptWords) {
            for (const ew of endWords) {
                if (ew === tw || (tw.length >= 4 && (ew.includes(tw) || tw.includes(ew)))) {
                    return true;
                }
            }
        }
        return false;
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
            searchForward = 1,     // how many blocks to search ahead (local window)
            allowGlobalJump = false, // if true, it can jump anywhere in the song
            minThreshold = 0.38,   // minimum required confidence
            proximityBonus = 0.20, // bonus for blocks close to current position
            anchored = true,       // if false, search from start (pre-anchor)
        } = options;

        let bestScore = -Infinity;
        let bestIndex = -1;

        // Helper to evaluate a range of blocks
        const evaluateRange = (fromIdx, toIdx, applyPenalty = 0) => {
            fromIdx = Math.max(0, fromIdx);
            toIdx = Math.min(blocks.length - 1, toIdx);

            for (let i = fromIdx; i <= toIdx; i++) {
                const block = blocks[i];
                if (!block.lyric || !block.lyric.trim()) continue;

                let s = this.score(transcript, block.lyric);

                // Proximity bonus: blocks closer to current position score a bit higher
                // This forces it to prefer the "current" chorus over a "future" chorus with the same lyrics
                if (anchored) {
                    const dist = Math.abs(i - currentIndex);
                    const prox = Math.max(0, proximityBonus - dist * 0.015);
                    s += prox;
                }

                s -= applyPenalty;

                if (s > bestScore) {
                    bestScore = s;
                    bestIndex = i;
                }
            }
        };

        // 1. Search the local window first (highly preferred)
        let localFrom = anchored ? currentIndex - searchBackward : 0;
        let localTo = anchored ? currentIndex + searchForward : 30;
        evaluateRange(localFrom, localTo, 0);

        // 2. If allowGlobalJump is true and we didn't find a strong match locally, search the whole song
        // We apply a strict penalty so it only jumps if it's ABSOLUTELY sure (e.g. matched an entire phrase)
        // A penalty of 0.3 means a global match must score at least 0.3 higher than the minThreshold to be accepted.
        // We also REQUIRE the transcript to have >= 3 words to prevent teleporting on a single common word like "Deus".
        const transcriptWordCount = this.tokenize(transcript).length;
        if (allowGlobalJump && bestScore < minThreshold && transcriptWordCount >= 3) {
            evaluateRange(0, localFrom - 1, 0.40); // Search before local window (with huge penalty to avoid jumping back randomly)
            evaluateRange(localTo + 1, blocks.length - 1, 0.30); // Search after local window (with moderate penalty)
        }

        if (bestScore < minThreshold || bestIndex === -1) return null;
        return { index: bestIndex, confidence: bestScore };
    }
}
