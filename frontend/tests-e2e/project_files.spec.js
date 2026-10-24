import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The STL fixture the unit tests use: a 10 mm cube, 12 facets.
const CUBE_STL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'test', 'fixtures', 'cube.stl');

// Removes the project the test created, so the dev database does not fill up with cubes.
// Goes through the edit endpoint the editor's Delete button uses.
const deleteProject = async (page, projectId) => {
    const response = await page.request.post(`/user/project/edit/${projectId}`, { multipart: { action: 'delete' } });
    expect(response.ok()).toBeTruthy();
};

test.describe('Project files', () => {
    test('a student uploads an STL model and the profile shows it in 3D', async ({ page }) => {
        const projectName = `E2E cube ${Date.now()}`;
        let projectId = null;

        try {
            await page.goto('/api/dev-login?role=student');
            await page.goto('/project/new');
            await expect(page.getByText('Core Information')).toBeVisible({ timeout: 15000 });

            // A custom project of the 3D kind.
            await page.getByLabel('Project Name').fill(projectName);
            await page.locator('label.project-type-option', { hasText: '3D model' }).click();
            await expect(page.getByLabel('3D model')).toBeChecked();

            // The Media step leads with the model card for a 3D project.
            await page.getByRole('button', { name: /^Next/ }).click();
            // The preview column shows a "3D Model" placeholder heading too: look in the form only.
            await expect(page.locator('.form-column').getByRole('heading', { name: '3D Model' })).toBeVisible();
            await page.locator('input[name="model_files"]').setInputFiles(CUBE_STL);
            await expect(page.getByText('cube.stl')).toBeVisible();
            // The live preview switches to the viewer for the picked file.
            await expect(page.locator('.preview-column .model-viewer')).toBeVisible();

            await page.getByRole('button', { name: /^Next/ }).click();
            await page.getByRole('button', { name: 'Create Project' }).click();
            await page.waitForURL(/\/profile/, { timeout: 20000 });

            // The portfolio card carries the 3D chip and opens the modal on the viewer.
            const card = page.locator('.project-card', { hasText: projectName }).first();
            await expect(card).toBeVisible({ timeout: 15000 });
            await expect(card.locator('.project-file-chip', { hasText: '3D' })).toBeVisible();

            const editButton = card.getByTitle('Edit Project');
            await expect(editButton).toBeVisible();
            await card.getByRole('button', { name: 'Details' }).click();

            const dialog = page.getByRole('dialog', { name: projectName });
            await expect(dialog).toBeVisible();
            await expect(dialog.locator('.model-viewer')).toBeVisible();
            await expect(dialog.getByText('This is a 3D modelling project.')).toBeVisible();

            // The stored file is served under its own name with the model type, never sniffed.
            const downloadLink = dialog.getByRole('link', { name: /Download model/ });
            const downloadHref = await downloadLink.getAttribute('href');
            expect(downloadHref).toMatch(/\/user\/project_files\/\d+\/cube\.stl\?download=1$/);
            const served = await page.request.get(downloadHref.replace('?download=1', ''));
            expect(served.status()).toBe(200);
            expect(served.headers()['content-type']).toBe('model/stl');
            expect(served.headers()['x-content-type-options']).toBe('nosniff');
            expect((await served.body()).length).toBeGreaterThan(80);
            const download = await page.request.get(downloadHref);
            expect(download.headers()['content-disposition']).toMatch(/^attachment/);

            await dialog.getByRole('button', { name: 'Close' }).click();

            // The editor's URL carries the project id, which the cleanup needs.
            await editButton.click();
            await page.waitForURL(/\/project\/edit\/\d+/);
            projectId = Number(page.url().match(/\/project\/edit\/(\d+)/)[1]);
            // The saved model is listed on the Media step, with its own viewer in the preview.
            await page.getByRole('button', { name: '2. Media' }).click();
            await expect(page.locator('.form-column').getByText('cube.stl')).toBeVisible();
            await expect(page.locator('.preview-column .model-viewer')).toBeVisible();
        } finally {
            if (projectId) await deleteProject(page, projectId);
        }
    });

    test('an unsupported model file is turned away before it is uploaded', async ({ page }) => {
        await page.goto('/api/dev-login?role=student');
        await page.goto('/project/new');
        await expect(page.getByText('Core Information')).toBeVisible({ timeout: 15000 });
        await page.locator('label.project-type-option', { hasText: '3D model' }).click();
        await page.getByRole('button', { name: /^Next/ }).click();

        await page.locator('input[name="model_files"]').setInputFiles({
            name: 'robot.fbx',
            mimeType: 'application/octet-stream',
            buffer: Buffer.from('not a model'),
        });

        await expect(page.getByText(/robot\.fbx is not a supported 3D model file/)).toBeVisible();
        await expect(page.locator('.project-file-empty', { hasText: 'No 3D model yet.' })).toBeVisible();
    });
});
