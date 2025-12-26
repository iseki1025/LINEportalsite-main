/**
 * CSV Parser Utility for KCIMS Q&A Data
 */

export function parseQADataCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const results = [];

    // Simple CSV parser that handles quotes and nested commas
    function parseCSVLine(line) {
        const result = [];
        let curr = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                curr += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(curr.trim());
                curr = '';
            } else {
                curr += char;
            }
        }
        result.push(curr.trim());
        return result;
    }

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const row = parseCSVLine(lines[i]);
        if (row.length < 6) continue;

        // Mapping:
        // 3: 中項目 (Back up category)
        // 4: Category (Primary category)
        // 5: Question
        // 7: Answer

        const category = row[4] || row[3] || 'その他';
        const question = row[5];
        const answer = row[7];

        if (question && answer) {
            results.push({
                category,
                question,
                answer
            });
        }
    }

    return results;
}
