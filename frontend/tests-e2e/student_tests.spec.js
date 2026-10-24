import { test, expect } from '@playwright/test';

// The 3-5 test is the one these specs use. The dev student's duck reward for it is already spent;
// the 6-8 and 9-11 rewards are left alone.
const SLUG = 'cs-olympiad-grades-3-5';
const FRONTEND = 'http://localhost:5173';
const BACKEND = 'http://localhost:8000';

// A request context signed in through the dev login, sending the CSRF header the app sends.
// Its own cookie jar, so it never disturbs the page's session.
const signIn = async (playwright, role) => {
    const context = await playwright.request.newContext({ baseURL: FRONTEND });
    const login = await context.get(`/api/dev-login?role=${role}`);
    expect(login.ok()).toBeTruthy();

    const call = async (method, url, data) => {
        const { cookies } = await context.storageState();
        const token = cookies.find((cookie) => cookie.name === 'csrf_token_v2')?.value ?? '';
        const response = await context.fetch(url, {
            method,
            headers: { 'X-CSRFToken': token, 'X-Requested-With': 'XMLHttpRequest' },
            ...(data === undefined ? {} : { data }),
        });
        const text = await response.text();
        let body = null;
        try {
            body = JSON.parse(text);
        } catch {
            body = null;
        }
        return { status: response.status(), body, data: body?.data, text };
    };
    return { call, dispose: () => context.dispose() };
};

// Removes the attempts a test created, so the dev database does not fill up. An attempt the test
// itself already deleted answers 404, which is fine.
const deleteAttempts = async (admin, ids) => {
    for (const id of ids) {
        const response = await admin.call('DELETE', `/api/quizzes/admin/attempts/${id}`);
        expect([200, 404]).toContain(response.status);
    }
};

// An unfinished attempt left from an earlier run would resume with its old answers.
const dropOpenAttempt = async (student, admin) => {
    const list = await student.call('GET', '/api/quizzes');
    const quiz = list.data.quizzes.find((q) => q.slug === SLUG);
    if (quiz?.in_progress_attempt_id) await deleteAttempts(admin, [quiz.in_progress_attempt_id]);
};

// Starts the 3-5 attempt through the API and returns its id and questions.
const startAttempt = async (student) => {
    const started = await student.call('POST', `/api/quizzes/${SLUG}/attempts`);
    expect([200, 201]).toContain(started.status);
    return started.data.attempt;
};

const submitAttempt = async (student, id, answers) => {
    const submitted = await student.call('POST', `/api/quizzes/attempts/${id}/submit`, {
        answers,
        flagged: [],
        elapsed_seconds: 5,
    });
    expect(submitted.status).toBe(200);
    return submitted.data.attempt;
};

const numberFrom = (text) => Number(text.replace(/[^\d]/g, ''));

test.describe('Student tests', () => {
    test('a student takes a test, resumes it, submits and reads the result', async ({ page, playwright }) => {
        const student = await signIn(playwright, 'student');
        const admin = await signIn(playwright, 'admin');
        const attemptIds = new Set();

        // Every attempt the page starts, for the cleanup.
        page.on('response', async (response) => {
            if (response.request().method() !== 'POST' || !response.url().endsWith(`/api/quizzes/${SLUG}/attempts`)) return;
            try {
                attemptIds.add((await response.json()).data.attempt.id);
            } catch {
                // a failed start has no id to clean up
            }
        });

        try {
            await dropOpenAttempt(student, admin);

            await page.goto('/api/dev-login?role=student');
            await page.goto('/');
            await page.locator('a[data-tooltip="Tests"]').click();
            await expect(page.getByRole('heading', { name: 'Tests', level: 1 })).toBeVisible();

            // The row's action starts the test.
            const start = page.locator(`a[href="/tests/${SLUG}"]`);
            await expect(start).toHaveText(/^(Start|Retake)$/);
            await start.click();
            await page.waitForURL(`**/tests/${SLUG}`);
            await expect(page.getByText('1 of 30')).toBeVisible();

            // Question 1: take the first option.
            const radios = page.getByRole('radiogroup').getByRole('radio');
            await expect(radios).toHaveCount(await radios.count());
            await radios.first().check({ force: true });
            await expect(radios.first()).toBeChecked();
            await expect(page.getByRole('button', { name: 'Question 1, answered' })).toBeVisible();

            // Jump to question 5 through the palette: it carries the diagram.
            await page.getByRole('button', { name: /^Question 5, unanswered/ }).click();
            await expect(page.getByText('5 of 30')).toBeVisible();
            const diagram = page.locator('iframe[title="Question 5 diagram"]');
            await expect(diagram).toBeVisible();
            const sandbox = await diagram.getAttribute('sandbox');
            expect(sandbox).not.toContain('allow-scripts');
            expect(sandbox).toBe('allow-same-origin');

            // Answering saves on its own after a short pause.
            const saved = page.waitForResponse(
                (response) => response.request().method() === 'PATCH' && /\/api\/quizzes\/attempts\/\d+$/.test(response.url()),
            );
            await page.getByRole('radiogroup').getByRole('radio').nth(1).check({ force: true });
            expect((await saved).ok()).toBeTruthy();
            await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Question 5, answered' })).toBeVisible();

            // Reload: the same attempt resumes with both answers in place.
            await page.reload();
            await expect(page.getByText('1 of 30')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Question 1, answered' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Question 5, answered' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Question 2, unanswered' })).toBeVisible();
            await expect(page.getByRole('radiogroup').getByRole('radio').first()).toBeChecked();
            await page.getByRole('button', { name: 'Question 5, answered' }).click();
            await expect(page.getByText('5 of 30')).toBeVisible();
            await expect(page.getByRole('radiogroup').getByRole('radio').nth(1)).toBeChecked();
            await expect(page.getByText('2/30')).toBeVisible();

            // Submit through the confirm dialog.
            await page.getByRole('button', { name: 'Submit', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Submit' });
            await expect(dialog).toBeVisible();
            await expect(dialog.getByText('28 unanswered')).toBeVisible();
            await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
            await page.waitForURL(/\/tests\/results\/\d+$/);
            const resultId = Number(page.url().match(/results\/(\d+)/)[1]);
            attemptIds.add(resultId);

            // Result: score, counts, domains.
            const score = page.getByRole('region', { name: 'Score' });
            await expect(score).toBeVisible();
            const scoreText = await score.locator('.test-result-score-value').innerText();
            const [correct, total] = scoreText.split('/').map(Number);
            expect(total).toBe(30);
            expect(correct).toBeLessThanOrEqual(2);
            const counts = score.locator('.test-result-counts');
            const countOf = async (label) => numberFrom(await counts.locator('div', { has: page.getByText(label, { exact: true }) }).locator('dd').innerText());
            expect(await countOf('Correct')).toBe(correct);
            expect(await countOf('Wrong')).toBe(2 - correct);
            expect(await countOf('Skipped')).toBe(28);
            await expect(score.getByText(`${Math.round((correct / 30) * 100)}%`)).toBeVisible();

            await expect(page.getByRole('heading', { name: 'Domains' })).toBeVisible();
            const domainRows = page.locator('.test-result-domains tbody tr');
            expect(await domainRows.count()).toBeGreaterThan(0);
            const domainScores = await domainRows.locator('td:nth-child(2)').allInnerTexts();
            const sums = domainScores.reduce(
                (acc, text) => {
                    const [c, t] = text.split('/').map(Number);
                    return { c: acc.c + c, t: acc.t + t };
                },
                { c: 0, t: 0 },
            );
            expect(sums).toEqual({ c: correct, t: 30 });

            // Review and its filters.
            await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
            const reviews = page.locator('[data-testid^="review-"]');
            await expect(page.getByRole('button', { name: 'All 30' })).toHaveAttribute('aria-pressed', 'true');
            await expect(reviews).toHaveCount(30);
            await expect(page.getByText('Your answer', { exact: true })).toHaveCount(2);

            await page.getByRole('button', { name: `Incorrect ${30 - correct}` }).click();
            await expect(page.getByRole('button', { name: `Incorrect ${30 - correct}` })).toHaveAttribute('aria-pressed', 'true');
            await expect(reviews).toHaveCount(30 - correct);
            await page.getByRole('button', { name: `Correct ${correct}`, exact: true }).click();
            await expect(reviews).toHaveCount(correct);
            await page.getByRole('button', { name: 'All 30' }).click();
            await expect(reviews).toHaveCount(30);

            // The list now offers a retake and links to the result.
            await page.goto('/tests');
            await expect(page.locator(`a[href="/tests/${SLUG}"]`)).toHaveText('Retake');
            await expect(page.locator(`a[href="/tests/results/${resultId}"]`)).toHaveText(`${correct}/30`);
        } finally {
            await deleteAttempts(admin, [...attemptIds]);
            await student.dispose();
            await admin.dispose();
        }
    });

    test('an attempt in progress carries no answer key', async ({ playwright }) => {
        const student = await signIn(playwright, 'student');
        const admin = await signIn(playwright, 'admin');
        const attemptIds = [];

        try {
            await dropOpenAttempt(student, admin);
            const attempt = await startAttempt(student);
            attemptIds.push(attempt.id);

            expect(attempt.status).toBe('in_progress');
            expect(attempt.questions).toHaveLength(30);
            for (const question of attempt.questions) {
                expect(Object.keys(question)).not.toEqual(expect.arrayContaining(['answer']));
                expect(question).not.toHaveProperty('answer');
                expect(question).not.toHaveProperty('explanation');
                expect(question).not.toHaveProperty('is_correct');
            }

            // Still none after answering, on the owner's read and on the save reply.
            const saved = await student.call('PATCH', `/api/quizzes/attempts/${attempt.id}`, { answers: { 1: 'A' } });
            expect(saved.status).toBe(200);
            expect(saved.text).not.toMatch(/"(answer|explanation)"\s*:/);

            const read = await student.call('GET', `/api/quizzes/attempts/${attempt.id}`);
            expect(read.status).toBe(200);
            expect(read.data.attempt.answers).toEqual({ 1: 'A' });
            expect(read.text).not.toMatch(/"(answer|explanation)"\s*:/);
        } finally {
            await deleteAttempts(admin, attemptIds);
            await student.dispose();
            await admin.dispose();
        }
    });

    test('an admin sees the result, opens it and deletes it', async ({ page, playwright }) => {
        const student = await signIn(playwright, 'student');
        const admin = await signIn(playwright, 'admin');
        const attemptIds = [];

        try {
            await dropOpenAttempt(student, admin);
            const attempt = await startAttempt(student);
            attemptIds.push(attempt.id);
            const result = await submitAttempt(student, attempt.id, { 1: 'A', 2: 'B', 3: 'C' });
            const label = `${result.correct}/${result.total}`;

            await page.goto('/api/dev-login?role=admin');
            await page.goto('/admin/tests');

            // The settings table lists the three tests.
            const settings = page.getByRole('table', { name: 'Tests' });
            await expect(settings.getByRole('checkbox', { name: /^Active:/ })).toHaveCount(3);

            const resultLink = page.locator(`a[href="/admin/tests/results/${attempt.id}"]`);
            await expect(resultLink).toBeVisible({ timeout: 15000 });
            await expect(resultLink).toHaveText(label);
            const row = page.getByRole('row').filter({ has: resultLink });

            // Its detail: student, score and the review (admins always get it).
            await resultLink.click();
            await page.waitForURL(`**/admin/tests/results/${attempt.id}`);
            await expect(page.getByRole('region', { name: 'Score' }).locator('.test-result-score-value')).toHaveText(label);
            await expect(page.getByText('Student', { exact: true })).toBeVisible();
            await expect(page.locator('[data-testid^="review-"]')).toHaveCount(30);
            await page.getByRole('link', { name: 'Back to admin tests' }).click();
            await page.waitForURL('**/admin/tests');

            // Delete from the table, behind the confirm dialog.
            await expect(resultLink).toBeVisible();
            await row.getByRole('button', { name: /^Delete:/ }).click();
            const dialog = page.getByRole('dialog', { name: 'Delete result' });
            await expect(dialog).toBeVisible();
            await dialog.getByRole('button', { name: 'Cancel' }).click();
            await expect(resultLink).toBeVisible();

            await row.getByRole('button', { name: /^Delete:/ }).click();
            await page.getByRole('dialog', { name: 'Delete result' }).getByRole('button', { name: 'Delete' }).click();
            await expect(resultLink).toHaveCount(0);

            // Gone for good: also from the API.
            const gone = await admin.call('GET', `/api/quizzes/attempts/${attempt.id}`);
            expect(gone.status).toBe(404);
        } finally {
            await deleteAttempts(admin, attemptIds);
            await student.dispose();
            await admin.dispose();
        }
    });

    test('results stay off the public profile and away from an unlinked parent', async ({ page, playwright }) => {
        const student = await signIn(playwright, 'student');
        const admin = await signIn(playwright, 'admin');
        const parent = await signIn(playwright, 'parent');
        const attemptIds = [];

        try {
            await dropOpenAttempt(student, admin);
            const attempt = await startAttempt(student);
            attemptIds.push(attempt.id);
            const result = await submitAttempt(student, attempt.id, { 1: 'A', 2: 'B' });
            const studentId = result.student.id;
            const title = result.quiz.title;

            // Public profile JSON: no quiz data at all.
            const profile = await playwright.request.newContext({ baseURL: BACKEND });
            try {
                const response = await profile.get('/user/profile/phu', { headers: { Accept: 'application/json' } });
                expect(response.status()).toBe(200);
                const text = await response.text();
                // Names of lessons ("Pet Quiz") are values: look at the keys, and for the test itself.
                const keys = [];
                const collect = (node) => {
                    if (Array.isArray(node)) node.forEach(collect);
                    else if (node && typeof node === 'object') {
                        Object.entries(node).forEach(([key, value]) => {
                            keys.push(key);
                            collect(value);
                        });
                    }
                };
                collect(JSON.parse(text));
                expect(keys.length).toBeGreaterThan(10);
                expect(keys.filter((key) => /quiz|attempt|test|score_percent|ducks_awarded/i.test(key))).toEqual([]);
                expect(text).not.toMatch(/olympiad/i);
                expect(text).not.toContain(title);
            } finally {
                await profile.dispose();
            }

            // The student's own profile page shows no test results either.
            await page.goto('/api/dev-login?role=student');
            await page.goto('/profile/phu');
            await expect(page.getByRole('heading', { name: 'Phu' }).first()).toBeVisible({ timeout: 15000 });
            await expect(page.getByText(/olympiad/i)).toHaveCount(0);
            await expect(page.getByRole('heading', { name: /^Tests?$/ })).toHaveCount(0);

            // A parent reads only their own children's attempts.
            const children = (await parent.call('GET', '/api/parents/children')).data.children;
            const linkedIds = children.map((child) => child.id);
            const unlinkedId = linkedIds.includes(studentId) ? Math.max(...linkedIds) + 100000 : studentId;
            const refused = await parent.call('GET', `/api/quizzes/students/${unlinkedId}/attempts`);
            expect(refused.status).toBe(403);
            expect(refused.text).not.toContain(title);
            const peek = await parent.call('GET', `/api/quizzes/attempts/${attempt.id}`);
            if (!linkedIds.includes(studentId)) expect(peek.status).toBe(403);

            if (linkedIds.includes(studentId)) {
                // Linked in this database: the report card lists the test and opens the result.
                const allowed = await parent.call('GET', `/api/quizzes/students/${studentId}/attempts`);
                expect(allowed.status).toBe(200);
                expect(allowed.data.attempts.map((a) => a.id)).toContain(attempt.id);

                await page.goto('/api/dev-login?role=parent');
                await page.goto(`/parent/report/${studentId}`);
                const link = page.locator(`a[href="/parent/tests/results/${attempt.id}"]`);
                await expect(link).toBeVisible({ timeout: 15000 });
                await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();
                await expect(link).toContainText(`${result.correct}/${result.total}`);
                await link.click();
                await page.waitForURL(`**/parent/tests/results/${attempt.id}`);
                await expect(page.getByRole('region', { name: 'Score' }).locator('.test-result-score-value')).toHaveText(
                    `${result.correct}/${result.total}`,
                );
            }
        } finally {
            await deleteAttempts(admin, attemptIds);
            await student.dispose();
            await admin.dispose();
            await parent.dispose();
        }
    });
});
