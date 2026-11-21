import { describe, it, expect } from 'vitest';
import {
    deriveTitleFromFilename,
    resolveAnswerIndex,
    parseJsonTest,
    parseCsvTest,
    parseTestFile,
    MIN_OPTIONS,
    MAX_OPTIONS,
    MAX_QUESTIONS,
} from './testImportParser';

describe('testImportParser', () => {
    describe('deriveTitleFromFilename', () => {
        it('strips .json and .csv extensions and replaces underscores/hyphens with spaces', () => {
            expect(deriveTitleFromFilename('cs-olympiad-grades-3-5.json')).toBe('cs olympiad grades 3 5');
            expect(deriveTitleFromFilename('biology_midterm_exam.csv')).toBe('biology midterm exam');
            expect(deriveTitleFromFilename('mixed-name_test-1.CSV')).toBe('mixed name test 1');
            expect(deriveTitleFromFilename('math.quiz.JSON')).toBe('math.quiz');
        });

        it('returns empty string for empty or non-string input', () => {
            expect(deriveTitleFromFilename('')).toBe('');
            expect(deriveTitleFromFilename(null)).toBe('');
            expect(deriveTitleFromFilename(undefined)).toBe('');
        });
    });

    describe('resolveAnswerIndex', () => {
        const options = ['Alpha', 'Beta', 'Gamma', 'Delta'];

        it('resolves valid letters case-insensitively', () => {
            expect(resolveAnswerIndex('A', options, 'Question 1')).toBe(0);
            expect(resolveAnswerIndex('b', options, 'Question 1')).toBe(1);
            expect(resolveAnswerIndex('C', options, 'Question 1')).toBe(2);
            expect(resolveAnswerIndex('d', options, 'Question 1')).toBe(3);
        });

        it('resolves valid 0-based integer numbers and strings', () => {
            expect(resolveAnswerIndex(0, options, 'Question 1')).toBe(0);
            expect(resolveAnswerIndex(2, options, 'Question 1')).toBe(2);
            expect(resolveAnswerIndex('1', options, 'Question 1')).toBe(1);
            expect(resolveAnswerIndex('3', options, 'Question 1')).toBe(3);
        });

        it('resolves matching option text case-insensitively', () => {
            expect(resolveAnswerIndex('Alpha', options, 'Question 1')).toBe(0);
            expect(resolveAnswerIndex('beta', options, 'Question 1')).toBe(1);
            expect(resolveAnswerIndex('GAMMA', options, 'Question 1')).toBe(2);
        });

        it('throws if answer is out of range or not matching', () => {
            expect(() => resolveAnswerIndex('E', options, 'Question 2')).toThrow(
                'Question 2: answer must be one of the options',
            );
            expect(() => resolveAnswerIndex(4, options, 'Question 2')).toThrow(
                'Question 2: answer must be one of the options',
            );
            expect(() => resolveAnswerIndex('Z', options, 'Question 2')).toThrow(
                'Question 2: answer must be one of the options',
            );
            expect(() => resolveAnswerIndex('Omega', options, 'Question 2')).toThrow(
                'Question 2: answer must be one of the options',
            );
            expect(() => resolveAnswerIndex('', options, 'Question 2')).toThrow(
                'Question 2: answer must be one of the options',
            );
        });
    });

    describe('parseJsonTest', () => {
        it('parses valid object format with title, description, and questions object options', () => {
            const json = JSON.stringify({
                title: 'Computer Science Quiz',
                description: 'Basic hardware concepts',
                questions: [
                    {
                        domain: 'Hardware',
                        prompt: 'What is CPU?',
                        options: {
                            A: 'Central Processing Unit',
                            B: 'Control Processing Unit',
                        },
                        answer: 'A',
                        explanation: 'The CPU is the brain',
                    },
                ],
            });

            const result = parseJsonTest({ content: json, filename: 'quiz.json' });
            expect(result.title).toBe('Computer Science Quiz');
            expect(result.description).toBe('Basic hardware concepts');
            expect(result.questions).toHaveLength(1);
            expect(result.questions[0]).toEqual({
                domain: 'Hardware',
                prompt: 'What is CPU?',
                options: ['Central Processing Unit', 'Control Processing Unit'],
                answer: 0,
                explanation: 'The CPU is the brain',
            });
        });

        it('parses top-level array of questions and accepts array options', () => {
            const json = JSON.stringify([
                {
                    topic: 'Math',
                    question: 'What is 2 + 2?',
                    options: ['3', '4', '5'],
                    answer: '4', // matching option text
                },
            ]);

            const result = parseJsonTest({
                content: json,
                filename: 'math_addition_test.json',
                currentTitle: '',
            });
            expect(result.title).toBe('math addition test');
            expect(result.description).toBeUndefined();
            expect(result.questions).toHaveLength(1);
            expect(result.questions[0]).toEqual({
                domain: 'Math',
                prompt: 'What is 2 + 2?',
                options: ['3', '4', '5'],
                answer: 1,
                explanation: '',
            });
        });

        it('retains existing title if JSON has no title and currentTitle is non-empty', () => {
            const json = JSON.stringify([
                {
                    prompt: 'Q1',
                    options: ['Yes', 'No'],
                    answer: 0,
                },
            ]);

            const result = parseJsonTest({
                content: json,
                filename: 'my_quiz.json',
                currentTitle: 'Existing User Title',
            });
            expect(result.title).toBe('Existing User Title');
        });

        it('throws for invalid JSON syntax', () => {
            expect(() => parseJsonTest({ content: '{ bad json' })).toThrow('Invalid JSON format');
        });

        it('throws when questions is empty or missing', () => {
            expect(() => parseJsonTest({ content: JSON.stringify({ title: 'Test' }) })).toThrow(
                "JSON must contain a 'questions' array",
            );
            expect(() => parseJsonTest({ content: JSON.stringify({ questions: [] }) })).toThrow(
                'File contains no questions',
            );
        });

        it('throws when exceeding MAX_QUESTIONS', () => {
            const bigQuestions = Array.from({ length: MAX_QUESTIONS + 1 }, (_, i) => ({
                prompt: `Q${i + 1}`,
                options: ['A', 'B'],
                answer: 0,
            }));
            expect(() => parseJsonTest({ content: JSON.stringify({ questions: bigQuestions }) })).toThrow(
                `File exceeds maximum limit of ${MAX_QUESTIONS} questions (found ${MAX_QUESTIONS + 1})`,
            );
        });

        it('throws when prompt is missing', () => {
            const json = JSON.stringify({
                questions: [{ prompt: '  ', options: ['A', 'B'], answer: 'A' }],
            });
            expect(() => parseJsonTest({ content: json })).toThrow('Question 1: prompt is required');
        });

        it('throws when question has fewer than MIN_OPTIONS', () => {
            const json = JSON.stringify({
                questions: [{ prompt: 'Q', options: ['A'], answer: 'A' }],
            });
            expect(() => parseJsonTest({ content: json })).toThrow('Question 1: at least 2 options required');
        });

        it('throws when question has more than MAX_OPTIONS', () => {
            const json = JSON.stringify({
                questions: [
                    {
                        prompt: 'Q',
                        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                        answer: 0,
                    },
                ],
            });
            expect(() => parseJsonTest({ content: json })).toThrow('Question 1: at most 8 options allowed');
        });

        it('throws when answer is invalid', () => {
            const json = JSON.stringify({
                questions: [{ prompt: 'Q', options: ['A', 'B'], answer: 'C' }],
            });
            expect(() => parseJsonTest({ content: json })).toThrow(
                'Question 1: answer must be one of the options',
            );
        });

        it('handles non-contiguous option keys and numeric answers matching option text', () => {
            const json = JSON.stringify({
                questions: [
                    {
                        prompt: 'Non-contiguous keys',
                        options: { B: 'First shown', D: 'Second shown' },
                        answer: 'D',
                    },
                    {
                        prompt: 'Numeric answer matching option value',
                        options: [10, 20, 30],
                        answer: 20,
                    },
                ],
            });
            const result = parseJsonTest({ content: json, filename: 'math.json' });
            expect(result.questions[0].options).toEqual(['First shown', 'Second shown']);
            expect(result.questions[0].answer).toBe(1);
            expect(result.questions[1].options).toEqual(['10', '20', '30']);
            expect(result.questions[1].answer).toBe(1);
        });

        it('validates backend character limits on fields', () => {
            const tooLongOption = JSON.stringify({
                questions: [{ prompt: 'Q', options: ['a'.repeat(501), 'b'], answer: 'A' }],
            });
            expect(() => parseJsonTest({ content: tooLongOption })).toThrow(
                'Question 1: option A is longer than 500 characters',
            );

            const tooLongTitle = JSON.stringify({
                title: 't'.repeat(151),
                questions: [{ prompt: 'Q', options: ['a', 'b'], answer: 'A' }],
            });
            expect(() => parseJsonTest({ content: tooLongTitle })).toThrow(
                'Title is longer than 150 characters',
            );
        });
    });

    describe('parseCsvTest', () => {
        it('parses valid CSV with option_a..option_d headers and derives title from filename', () => {
            const csv = `prompt,domain,option_a,option_b,option_c,option_d,answer,explanation
What is H2O?,Science,Water,Oxygen,Hydrogen,Carbon,A,Chemical formula of water
What is 5 x 5?,Math,10,20,25,30,C,Basic multiplication`;

            const result = parseCsvTest({
                content: csv,
                filename: 'midterm_quiz.csv',
                currentTitle: '',
            });

            expect(result.title).toBe('midterm quiz');
            expect(result.questions).toHaveLength(2);
            expect(result.questions[0]).toEqual({
                domain: 'Science',
                prompt: 'What is H2O?',
                options: ['Water', 'Oxygen', 'Hydrogen', 'Carbon'],
                answer: 0,
                explanation: 'Chemical formula of water',
            });
            expect(result.questions[1]).toEqual({
                domain: 'Math',
                prompt: 'What is 5 x 5?',
                options: ['10', '20', '25', '30'],
                answer: 2,
                explanation: 'Basic multiplication',
            });
        });

        it('supports alternative headers: question, topic, option a, a..h, and matching text answer', () => {
            const csv = `topic,question,option a,option b,option c,answer
Geography,Capital of France?,London,Paris,Berlin,Paris`;

            const result = parseCsvTest({
                content: csv,
                filename: 'geo.csv',
                currentTitle: 'Existing Geography Test',
            });

            expect(result.title).toBe('Existing Geography Test');
            expect(result.questions).toHaveLength(1);
            expect(result.questions[0]).toEqual({
                domain: 'Geography',
                prompt: 'Capital of France?',
                options: ['London', 'Paris', 'Berlin'],
                answer: 1,
                explanation: '',
            });
        });

        it('supports numbered option headers (Option 1..4) and non-contiguous CSV columns', () => {
            const csv = `question,Option 1,Option 2,Option 4,answer
Which is even?,3,5,8,D`;
            const result = parseCsvTest({ content: csv, filename: 'numbers.csv' });
            expect(result.questions[0].options).toEqual(['3', '5', '8']);
            expect(result.questions[0].answer).toBe(2);
        });

        it('skips empty lines and trims whitespace', () => {
            const csv = `
prompt,option_a,option_b,answer

  What is 1+1?  ,  2  ,  3  ,  A  

`;
            const result = parseCsvTest({ content: csv, filename: 'test.csv' });
            expect(result.questions).toHaveLength(1);
            expect(result.questions[0].prompt).toBe('What is 1+1?');
            expect(result.questions[0].options).toEqual(['2', '3']);
            expect(result.questions[0].answer).toBe(0);
        });

        it('throws when CSV has no data rows', () => {
            const csv = 'prompt,option_a,option_b,answer\n';
            expect(() => parseCsvTest({ content: csv })).toThrow('File contains no questions');
        });

        it('throws actionable error naming Row when validation fails', () => {
            const badPrompt = `prompt,option_a,option_b,answer
,Opt1,Opt2,A`;
            expect(() => parseCsvTest({ content: badPrompt })).toThrow('Row 2: prompt is required');

            const oneOption = `prompt,option_a,answer
Q1,Opt1,A`;
            expect(() => parseCsvTest({ content: oneOption })).toThrow('Row 2: at least 2 options required');

            const badAnswer = `prompt,option_a,option_b,answer
Q1,Opt1,Opt2,Z`;
            expect(() => parseCsvTest({ content: badAnswer })).toThrow('Row 2: answer must be one of the options');
        });
    });

    describe('parseTestFile', () => {
        it('throws when file content is empty', () => {
            expect(() => parseTestFile({ content: '   ' })).toThrow('File is empty');
        });

        it('detects JSON based on extension or leading bracket', () => {
            const json = JSON.stringify([{ prompt: 'Q', options: ['A', 'B'], answer: 'A' }]);
            expect(parseTestFile({ content: json, filename: 'my.json' }).questions).toHaveLength(1);
            expect(parseTestFile({ content: json, filename: 'unknown.txt' }).questions).toHaveLength(1);
        });

        it('detects CSV based on extension or non-JSON content', () => {
            const csv = 'prompt,option_a,option_b,answer\nQ,OptA,OptB,A';
            expect(parseTestFile({ content: csv, filename: 'my.csv' }).questions).toHaveLength(1);
            expect(parseTestFile({ content: csv, filename: 'unknown.txt' }).questions).toHaveLength(1);
        });
    });
});
