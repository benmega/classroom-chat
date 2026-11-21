import Papa from 'papaparse';

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_QUESTIONS = 200;

export const MAX_TITLE_LENGTH = 150;
export const MAX_DESCRIPTION_LENGTH = 255;
export const MAX_DOMAIN_LENGTH = 100;
export const MAX_OPTION_LENGTH = 500;
export const MAX_LONG_TEXT = 5000;

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const cleanText = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return '';
    return String(value).trim();
};

export const deriveTitleFromFilename = (filename) => {
    if (!filename || typeof filename !== 'string') return '';
    return filename
        .replace(/\.(json|csv)$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
        .slice(0, MAX_TITLE_LENGTH);
};

export const resolveAnswerIndex = (rawAnswer, options, prefix, optionKeys = null) => {
    if (rawAnswer === undefined || rawAnswer === null || typeof rawAnswer === 'object') {
        throw new Error(`${prefix}: answer must be one of the options`);
    }

    const strAnswer = String(rawAnswer).trim();
    if (!strAnswer) {
        throw new Error(`${prefix}: answer must be one of the options`);
    }

    // 1. If options came from keyed slots (e.g. JSON object or CSV columns), check key match first
    if (Array.isArray(optionKeys) && optionKeys.length === options.length) {
        const keyIdx = optionKeys.findIndex((k) => k.toUpperCase() === strAnswer.toUpperCase());
        if (keyIdx !== -1) {
            return keyIdx;
        }
    } else {
        // Standard letter A-H (case-insensitive)
        const letterIdx = LETTERS.indexOf(strAnswer.toUpperCase());
        if (letterIdx !== -1) {
            if (letterIdx < options.length) {
                return letterIdx;
            }
            throw new Error(`${prefix}: answer must be one of the options`);
        }
    }

    // 2. Matching option text (case-insensitive) - handles text answers and numeric option values like "20"
    const matchIdx = options.findIndex((opt) => opt.toLowerCase() === strAnswer.toLowerCase());
    if (matchIdx !== -1) {
        return matchIdx;
    }

    // 3. Direct 0-based integer index (number or numeric string)
    if (typeof rawAnswer === 'number' && Number.isInteger(rawAnswer)) {
        if (rawAnswer >= 0 && rawAnswer < options.length) {
            return rawAnswer;
        }
        throw new Error(`${prefix}: answer must be one of the options`);
    }

    if (/^\d+$/.test(strAnswer)) {
        const num = parseInt(strAnswer, 10);
        if (num >= 0 && num < options.length) {
            return num;
        }
    }

    throw new Error(`${prefix}: answer must be one of the options`);
};

const validateQuestionLengths = ({ domain, prompt, options, explanation }, prefix) => {
    if (prompt.length > MAX_LONG_TEXT) {
        throw new Error(`${prefix}: prompt is longer than ${MAX_LONG_TEXT} characters`);
    }
    if (domain.length > MAX_DOMAIN_LENGTH) {
        throw new Error(`${prefix}: topic is longer than ${MAX_DOMAIN_LENGTH} characters`);
    }
    if (explanation.length > MAX_LONG_TEXT) {
        throw new Error(`${prefix}: explanation is longer than ${MAX_LONG_TEXT} characters`);
    }
    options.forEach((opt, i) => {
        if (opt.length > MAX_OPTION_LENGTH) {
            throw new Error(`${prefix}: option ${LETTERS[i]} is longer than ${MAX_OPTION_LENGTH} characters`);
        }
    });
};

export const parseJsonTest = ({ content, filename = '', currentTitle = '' }) => {
    let data;
    try {
        data = JSON.parse(content);
    } catch {
        throw new Error('Invalid JSON format');
    }

    if (data === null || typeof data !== 'object') {
        throw new Error('Invalid JSON format: expected an object or array');
    }

    let rawQuestions;
    let jsonTitle;
    let jsonDescription;

    if (Array.isArray(data)) {
        rawQuestions = data;
    } else {
        if (data.title !== undefined && data.title !== null) {
            const cleanedTitle = cleanText(data.title);
            if (cleanedTitle.length > MAX_TITLE_LENGTH) {
                throw new Error(`Title is longer than ${MAX_TITLE_LENGTH} characters`);
            }
            if (cleanedTitle) {
                jsonTitle = cleanedTitle;
            }
        }
        if (data.description !== undefined && data.description !== null) {
            jsonDescription = cleanText(data.description);
            if (jsonDescription.length > MAX_DESCRIPTION_LENGTH) {
                throw new Error(`Description is longer than ${MAX_DESCRIPTION_LENGTH} characters`);
            }
        }
        if (!Array.isArray(data.questions)) {
            throw new Error("JSON must contain a 'questions' array");
        }
        rawQuestions = data.questions;
    }

    if (rawQuestions.length === 0) {
        throw new Error('File contains no questions');
    }
    if (rawQuestions.length > MAX_QUESTIONS) {
        throw new Error(`File exceeds maximum limit of ${MAX_QUESTIONS} questions (found ${rawQuestions.length})`);
    }

    const questions = rawQuestions.map((q, index) => {
        const prefix = `Question ${index + 1}`;
        if (!q || typeof q !== 'object' || Array.isArray(q)) {
            throw new Error(`${prefix}: invalid question object`);
        }

        const prompt = cleanText(q.prompt ?? q.question);
        if (!prompt) {
            throw new Error(`${prefix}: prompt is required`);
        }

        const domain = cleanText(q.domain ?? q.topic);
        const explanation = cleanText(q.explanation);

        const options = [];
        let optionKeys = null;

        if (Array.isArray(q.options)) {
            for (const opt of q.options) {
                const str = cleanText(opt);
                if (str !== '') {
                    options.push(str);
                }
            }
        } else if (q.options && typeof q.options === 'object') {
            optionKeys = [];
            const entries = Object.entries(q.options)
                .map(([k, v]) => [k.trim().toUpperCase(), cleanText(v)])
                .filter(([, text]) => text !== '');
            const allSingleLetters = entries.every(([k]) => k.length === 1 && k >= 'A' && k <= 'Z');
            if (allSingleLetters) {
                entries.sort(([a], [b]) => a.localeCompare(b));
            }
            for (const [k, text] of entries) {
                optionKeys.push(k);
                options.push(text);
            }
        } else {
            throw new Error(`${prefix}: options must be an array or object`);
        }

        if (options.length < MIN_OPTIONS) {
            throw new Error(`${prefix}: at least 2 options required`);
        }
        if (options.length > MAX_OPTIONS) {
            throw new Error(`${prefix}: at most 8 options allowed`);
        }

        validateQuestionLengths({ domain, prompt, options, explanation }, prefix);
        const answer = resolveAnswerIndex(q.answer, options, prefix, optionKeys);

        return {
            domain,
            prompt,
            options,
            answer,
            explanation,
        };
    });

    let title;
    if (jsonTitle) {
        title = jsonTitle;
    } else if (currentTitle && currentTitle.trim()) {
        title = currentTitle;
    } else {
        title = deriveTitleFromFilename(filename);
    }

    return {
        title,
        description: jsonDescription,
        questions,
    };
};

export const parseCsvTest = ({ content, filename = '', currentTitle = '' }) => {
    const parseResult = Papa.parse(content, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
        if (!parseResult.data || parseResult.data.length === 0) {
            throw new Error(`Invalid CSV format: ${parseResult.errors[0].message}`);
        }
    }

    const rows = parseResult.data;
    if (!rows || rows.length === 0) {
        throw new Error('File contains no questions');
    }
    if (rows.length > MAX_QUESTIONS) {
        throw new Error(`File exceeds maximum limit of ${MAX_QUESTIONS} questions (found ${rows.length})`);
    }

    const questions = rows.map((row, index) => {
        const prefix = `Row ${index + 2}`;

        const prompt = cleanText(row['prompt'] ?? row['question']);
        if (!prompt) {
            throw new Error(`${prefix}: prompt is required`);
        }

        const domain = cleanText(row['domain'] ?? row['topic']);
        const explanation = cleanText(row['explanation']);

        const options = [];
        const optionKeys = [];
        for (let i = 0; i < LETTERS.length; i += 1) {
            const upperL = LETTERS[i];
            const l = upperL.toLowerCase();
            const n = i + 1;
            const val =
                row[`option_${l}`] ??
                row[`option ${l}`] ??
                row[`option${l}`] ??
                row[l] ??
                row[`option_${n}`] ??
                row[`option ${n}`] ??
                row[`option${n}`] ??
                row[`choice_${l}`] ??
                row[`choice ${l}`] ??
                row[`choice_${n}`] ??
                row[`choice ${n}`];
            const str = cleanText(val);
            if (str !== '') {
                options.push(str);
                optionKeys.push(upperL);
            }
        }

        if (options.length < MIN_OPTIONS) {
            throw new Error(`${prefix}: at least 2 options required`);
        }
        if (options.length > MAX_OPTIONS) {
            throw new Error(`${prefix}: at most 8 options allowed`);
        }

        validateQuestionLengths({ domain, prompt, options, explanation }, prefix);
        const answer = resolveAnswerIndex(row['answer'], options, prefix, optionKeys);

        return {
            domain,
            prompt,
            options,
            answer,
            explanation,
        };
    });

    const title = currentTitle && currentTitle.trim()
        ? currentTitle
        : deriveTitleFromFilename(filename);

    return {
        title,
        description: undefined,
        questions,
    };
};

export const parseTestFile = ({ content, filename = '', currentTitle = '' }) => {
    if (!content || !content.trim()) {
        throw new Error('File is empty');
    }

    const trimmed = content.replace(/^\uFEFF/, '').trim();
    const lowerFilename = filename.toLowerCase();

    const isJson = lowerFilename.endsWith('.json') ||
        (!lowerFilename.endsWith('.csv') && (trimmed.startsWith('{') || trimmed.startsWith('[')));

    if (isJson) {
        return parseJsonTest({ content: trimmed, filename, currentTitle });
    }

    return parseCsvTest({ content: trimmed, filename, currentTitle });
};
