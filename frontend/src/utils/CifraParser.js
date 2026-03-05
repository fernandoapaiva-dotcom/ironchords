// CifraParser.js
// Utility to analyze text and map sections for quick navigation during AI tracking

export class CifraParser {
    static parseSections(text) {
        const lines = (text || "").split('\n');
        const sections = [];
        let currentSectionType = null;
        let currentSectionStart = -1;

        const sectionRegex = /^\[?(refr[ãa]o|verso|ponte|solo|intro|final)[\]:]?/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const match = line.match(sectionRegex);
            if (match) {
                // Determine normalized section name
                let type = match[1].toLowerCase();
                if (type.includes('refr')) type = 'refrao';
                if (type.includes('intro')) type = 'intro';

                // Close previous section if any
                if (currentSectionType && currentSectionStart !== -1) {
                    sections.push({
                        type: currentSectionType,
                        start: currentSectionStart,
                        end: i - 1
                    });
                }

                currentSectionType = type;
                currentSectionStart = i; // Include the marker line
            }
        }

        // Close the last section
        if (currentSectionType && currentSectionStart !== -1) {
            sections.push({
                type: currentSectionType,
                start: currentSectionStart,
                end: lines.length - 1
            });
        }

        return sections;
    }

    static getChorusStartLine(sections) {
        const chorusSection = sections.find(s => s.type === 'refrao');
        return chorusSection ? chorusSection.start : null;
    }

    static getStartLine(text) {
        const lines = (text || "").split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            // Try to find the first lyric/chord line that isn't empty or just a structural marker
            if (line.match(/^[a-g][b#]?\s/i) || (line.trim().length > 3 && !line.match(/^\[/))) {
                return i;
            }
        }
        return 0;
    }
}
