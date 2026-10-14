import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import ManageProject from './ManageProject';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { formatFileSize, projectFileUrl } from '../../utils/projectFiles';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn(),
}));

// The real viewer needs WebGL, which happy-dom does not have, so it would never report a loaded model. This
// double shows what the page hands it, lets a test say when the model has loaded, and answers snapshots.
const viewer = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock('../../components/common/ModelViewer', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    const ModelViewerDouble = forwardRef(({ src, filename, format, downloadUrl, ariaLabel, onLoad }, ref) => {
        useImperativeHandle(ref, () => ({ snapshot: viewer.snapshot, reset: () => {} }));
        return (
            <>
                <div role="img" aria-label={ariaLabel} data-src={src} data-filename={filename} data-format={format} data-download-url={downloadUrl} />
                <button type="button" onClick={() => onLoad?.()}>Finish loading the model</button>
            </>
        );
    });
    return { default: ModelViewerDouble };
});

const ProfilePage = () => <div data-testid="profile-page">Profile Page</div>;

const savedModel = {
    id: 12, kind: 'model', name: 'robot.stl', path: 'robot.stl', size: 684, content_type: 'model/stl',
    url: '/user/project_files/12/robot.stl', download_url: '/user/project_files/12/robot.stl?download=1',
};
const savedFiles = [
    savedModel,
    {
        id: 13, kind: 'source', name: 'main.py', path: 'src/main.py', size: 1200, content_type: 'text/plain; charset=utf-8',
        url: '/user/project_files/13/main.py', download_url: '/user/project_files/13/main.py?download=1',
    },
    {
        id: 14, kind: 'source', name: 'utils.py', path: 'src/utils.py', size: 300, content_type: 'text/plain; charset=utf-8',
        url: '/user/project_files/14/utils.py', download_url: '/user/project_files/14/utils.py?download=1',
    },
    {
        id: 15, kind: 'asset', name: 'logo.png', path: 'logo.png', size: 2048, content_type: 'image/png',
        url: '/user/project_files/15/logo.png', download_url: '/user/project_files/15/logo.png?download=1',
    },
];

// The template list, the admin's student list and, when given, project 1 as the server sends it
const serve = ({ project = null, templates = {} } = {}) => {
    server.use(
        http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates } })),
        http.get('*/user/project/new', () => HttpResponse.json({ status: 'success', data: { students: [] } })),
    );
    if (project) {
        server.use(
            http.get('*/user/project/edit/1', () => HttpResponse.json({
                status: 'success',
                data: { project: { id: 1, name: 'Robot Arm', ...project } },
            })),
        );
    }
};

// Keeps the form a save sends
const captureSave = (path) => {
    const save = { body: null };
    server.use(
        http.post(`*${path}`, async ({ request }) => {
            save.body = await request.formData();
            return HttpResponse.json({ status: 'success', data: { project: { id: 1 } } });
        }),
    );
    return save;
};

const openEditor = async (route = '/manage-project') => {
    render(
        <MemoryRouter initialEntries={[route]}>
            <Routes>
                <Route path="/manage-project" element={<ManageProject />} />
                <Route path="/manage-project/:projectId" element={<ManageProject />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Routes>
        </MemoryRouter>
    );
    await screen.findByText('Core Information');
};

// A file as the browser hands it over; folderPath is where it sits in a picked folder, the folder itself first
const fileOf = (name, { size, folderPath, type = '' } = {}) => {
    const file = new File([size ? 'x'.repeat(size) : name], name, { type });
    if (folderPath) Object.defineProperty(file, 'webkitRelativePath', { value: folderPath });
    return file;
};
const namesOf = (parts) => parts.map((part) => part.name);
const listedPaths = (list) => within(list).getAllByRole('listitem').map((item) => item.querySelector('.project-file-path').textContent);

const goTo = (user, step) => user.click(screen.getByRole('button', { name: step }));
const save = async (user, buttonName) => {
    await user.click(screen.getByRole('button', { name: buttonName }));
    await screen.findByTestId('profile-page');
};

describe('ManageProject - project files and type', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        viewer.snapshot.mockResolvedValue(new Blob(['frame'], { type: 'image/png' }));
        window.URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
        window.URL.revokeObjectURL = vi.fn();
        useAuthStore.setState({
            user: { id: 2, username: 'student', role: 'student' },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false,
        });
    });

    describe('project type', () => {
        const mediaCardTitles = () => within(screen.getByRole('heading', { name: 'Media Assets' }).parentElement)
            .getAllByRole('heading', { level: 4 })
            .map((heading) => heading.textContent.trim());

        it('lets a student pick the type of a custom project, and puts the 3D model card first for a 3D one', async () => {
            const user = userEvent.setup();
            serve();
            const sent = captureSave('/user/project/new');
            await openEditor();

            const type = screen.getByRole('group', { name: 'Project Type' });
            expect(within(type).getByRole('radio', { name: 'Code project' })).toBeChecked();
            expect(within(type).getByRole('radio', { name: '3D model' })).not.toBeChecked();
            await goTo(user, '2. Media');
            expect(mediaCardTitles()).toEqual(['Cover Image', 'Video Presentation', '3D Model']);

            await goTo(user, '1. Core Info');
            await user.click(screen.getByRole('radio', { name: '3D model' }));
            expect(screen.getByRole('radio', { name: '3D model' })).toBeChecked();
            await user.type(screen.getByLabelText('Project Name'), 'Desk Lamp');
            await goTo(user, '2. Media');
            expect(mediaCardTitles()).toEqual(['3D Model', 'Cover Image', 'Video Presentation']);

            await goTo(user, '3. Code & Files');
            await save(user, 'Create Project');
            expect(sent.body.get('project_type')).toBe('3d');
        });

        it('shows a student the type a template fixes, as text', async () => {
            const user = userEvent.setup();
            serve({
                templates: {
                    'Desk Lamp': { id: 7, description: 'Model a lamp', project_type: '3d' },
                    Maze: { id: 8, description: 'Code a maze', project_type: 'code' },
                },
            });
            await openEditor();
            await screen.findByRole('option', { name: 'Desk Lamp' });

            await user.selectOptions(screen.getByLabelText('Template'), 'Desk Lamp');

            expect(screen.queryByRole('radio')).not.toBeInTheDocument();
            expect(screen.getByText('Set by the template').closest('p')).toHaveTextContent('Project Type: 3D model');

            await user.selectOptions(screen.getByLabelText('Template'), 'Maze');
            expect(screen.getByText('Set by the template').closest('p')).toHaveTextContent('Project Type: Code project');
        });

        it('lets an admin change the type of a project built from a template', async () => {
            const user = userEvent.setup();
            useAuthStore.setState({ user: { id: 1, username: 'teacher', role: 'admin' } });
            serve({
                project: { name: 'Desk Lamp', user_id: 5, template_id: 7 },
                templates: { 'Desk Lamp': { id: 7, description: 'Model a lamp', project_type: '3d' } },
            });
            await openEditor('/manage-project/1');

            expect(screen.getByRole('radio', { name: '3D model' })).toBeChecked();
            expect(screen.queryByText('Set by the template')).not.toBeInTheDocument();

            await user.click(screen.getByRole('radio', { name: 'Code project' }));
            expect(screen.getByRole('radio', { name: 'Code project' })).toBeChecked();
        });
    });

    describe('3D model', () => {
        it('uploads a model, lists it with its size and shows it in the preview', async () => {
            const user = userEvent.setup();
            serve();
            await openEditor();
            await goTo(user, '2. Media');

            const input = screen.getByLabelText(/Upload 3D Model/);
            expect(input).toHaveClass('sr-only');
            expect(input.getAttribute('accept')).toContain('.stl');
            expect(input.getAttribute('accept')).toContain('.glb');
            expect(screen.getByText(/Export from Tinkercad with Export > \.STL/)).toBeInTheDocument();
            expect(screen.getByText('No 3D model yet.')).toBeInTheDocument();

            await user.upload(input, fileOf('robot.stl', { size: 684 }));

            const list = screen.getByRole('list', { name: '3D model files' });
            expect(listedPaths(list)).toEqual(['robot.stl']);
            expect(list).toHaveTextContent(formatFileSize(684));
            expect(screen.getByText('1 new file will be uploaded when you save.')).toBeInTheDocument();
            const preview = screen.getByRole('img', { name: '3D preview of robot.stl' });
            expect(preview).toHaveAttribute('data-src', 'blob:robot.stl');
            expect(preview).toHaveAttribute('data-filename', 'robot.stl');
            expect(preview).toHaveAttribute('data-format', 'stl');
            expect(screen.getByText('1 model')).toBeInTheDocument();
        });

        it('makes a cover from the model once the preview has drawn it, and sends both', async () => {
            const user = userEvent.setup();
            serve();
            const sent = captureSave('/user/project/new');
            await openEditor();
            await user.type(screen.getByLabelText('Project Name'), 'Desk Lamp');
            await goTo(user, '2. Media');
            await user.upload(screen.getByLabelText(/Upload 3D Model/), fileOf('lamp.stl'));

            await user.click(screen.getByRole('button', { name: 'Finish loading the model' }));

            await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Made a cover image from your 3D model!'));
            expect(viewer.snapshot).toHaveBeenCalledTimes(1);
            await goTo(user, '3. Code & Files');
            await save(user, 'Create Project');
            expect(sent.body.get('project_image').name).toBe('model_cover.png');
            expect(namesOf(sent.body.getAll('model_files'))).toEqual(['lamp.stl']);
        });

        it('makes a cover from a saved model when the project has none', async () => {
            const user = userEvent.setup();
            serve({ project: { project_type: '3d', files: [savedModel] } });
            const sent = captureSave('/user/project/edit/1');
            await openEditor('/manage-project/1');

            await user.click(screen.getByRole('button', { name: 'Finish loading the model' }));
            await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Made a cover image from your 3D model!'));

            await goTo(user, '3. Code & Files');
            await save(user, 'Update Project');
            expect(sent.body.get('project_image').name).toBe('model_cover.png');
            expect(sent.body.has('model_files')).toBe(false);
        });

        it('shows the saved model, and takes no snapshot when the project has a cover', async () => {
            const user = userEvent.setup();
            serve({ project: { image_url: 'cover.jpg', project_type: '3d', files: [savedModel] } });
            await openEditor('/manage-project/1');

            const preview = screen.getByRole('img', { name: '3D preview of robot.stl' });
            expect(preview).toHaveAttribute('data-src', projectFileUrl(savedModel));
            expect(preview).toHaveAttribute('data-download-url', projectFileUrl(savedModel, { download: true }));

            await user.click(screen.getByRole('button', { name: 'Finish loading the model' }));

            expect(viewer.snapshot).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
        });

        it('leaves the cover as it is when the snapshot fails', async () => {
            const user = userEvent.setup();
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            viewer.snapshot.mockRejectedValueOnce(new Error('WebGL is not available'));
            serve();
            await openEditor();
            await goTo(user, '2. Media');
            await user.upload(screen.getByLabelText(/Upload 3D Model/), fileOf('lamp.stl'));

            await user.click(screen.getByRole('button', { name: 'Finish loading the model' }));

            await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Failed to make a cover image from the model:', expect.any(Error)));
            expect(toast.success).not.toHaveBeenCalled();
            consoleError.mockRestore();
        });

        it('lets a saved model be removed and kept again', async () => {
            const user = userEvent.setup();
            serve({ project: { image_url: 'cover.jpg', files: [savedModel] } });
            const sent = captureSave('/user/project/edit/1');
            await openEditor('/manage-project/1');
            await goTo(user, '2. Media');

            const list = screen.getByRole('list', { name: '3D model files' });
            expect(listedPaths(list)).toEqual(['robot.stl']);
            expect(list).toHaveTextContent(formatFileSize(684));

            await user.click(screen.getByRole('button', { name: 'Remove robot.stl' }));
            expect(within(list).getByText('Removed on save')).toBeInTheDocument();
            expect(screen.getByText('1 file will be removed when you save.')).toBeInTheDocument();
            // The preview goes back to the cover image
            expect(screen.queryByRole('img', { name: '3D preview of robot.stl' })).not.toBeInTheDocument();
            expect(screen.getByRole('img', { name: 'Robot Arm' })).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Undo removing robot.stl' }));
            expect(screen.getByRole('img', { name: '3D preview of robot.stl' })).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Remove robot.stl' }));
            await goTo(user, '3. Code & Files');
            await save(user, 'Update Project');
            expect(sent.body.getAll('remove_file_ids')).toEqual(['12']);
        });

        it('drops a picked model again before saving', async () => {
            const user = userEvent.setup();
            serve();
            await openEditor();
            await goTo(user, '2. Media');
            await user.upload(screen.getByLabelText(/Upload 3D Model/), fileOf('robot.stl'));

            await user.click(screen.getByRole('button', { name: 'Remove new file robot.stl' }));

            expect(screen.getByText('No 3D model yet.')).toBeInTheDocument();
            expect(screen.queryByRole('img', { name: '3D preview of robot.stl' })).not.toBeInTheDocument();
            expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:robot.stl');
        });
    });

    describe('code and files step', () => {
        it('adds source files, and a picked folder with its folders kept', async () => {
            const user = userEvent.setup();
            serve();
            const sent = captureSave('/user/project/new');
            await openEditor();
            await user.type(screen.getByLabelText('Project Name'), 'Maze');
            await goTo(user, '3. Code & Files');

            const files = screen.getByLabelText(/Add Files/);
            expect(files).toHaveAttribute('multiple');
            expect(files.getAttribute('accept')).toContain('.py');
            await user.upload(files, [fileOf('maze.py'), fileOf('notes.md')]);

            const folder = screen.getByLabelText(/Add a Folder/);
            expect(folder).toHaveAttribute('webkitdirectory');
            await user.upload(folder, [
                fileOf('main.py', { folderPath: 'game/src/main.py' }),
                fileOf('README.md', { folderPath: 'game/README.md' }),
                fileOf('HEAD', { folderPath: 'game/.git/HEAD' }),
            ]);

            const list = screen.getByRole('list', { name: 'Source files' });
            expect(listedPaths(list)).toEqual(['maze.py', 'notes.md', 'game/README.md', 'game/src/main.py']);
            expect(screen.getByText('4 new files will be uploaded when you save.')).toBeInTheDocument();
            expect(screen.getByText('4 source files')).toBeInTheDocument();

            await save(user, 'Create Project');
            expect(namesOf(sent.body.getAll('source_files'))).toEqual(['maze.py', 'notes.md', 'game/README.md', 'game/src/main.py']);
        });

        it('adds assets', async () => {
            const user = userEvent.setup();
            serve();
            const sent = captureSave('/user/project/new');
            await openEditor();
            await user.type(screen.getByLabelText('Project Name'), 'Maze');
            await goTo(user, '3. Code & Files');

            await user.upload(screen.getByLabelText(/Add Assets/), [
                fileOf('logo.png', { type: 'image/png' }),
                fileOf('jump.wav', { type: 'audio/wav' }),
                fileOf('rules.pdf', { type: 'application/pdf' }),
            ]);

            expect(listedPaths(screen.getByRole('list', { name: 'Asset files' }))).toEqual(['jump.wav', 'logo.png', 'rules.pdf']);
            await save(user, 'Create Project');
            expect(namesOf(sent.body.getAll('asset_files'))).toEqual(['jump.wav', 'logo.png', 'rules.pdf']);
        });

        it('turns away a file the project cannot take, with a toast', async () => {
            const user = userEvent.setup({ applyAccept: false });
            serve();
            await openEditor();
            await goTo(user, '3. Code & Files');

            await user.upload(screen.getByLabelText(/Add Files/), [fileOf('virus.exe'), fileOf('maze.py')]);

            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('virus.exe'));
            expect(listedPaths(screen.getByRole('list', { name: 'Source files' }))).toEqual(['maze.py']);
        });

        it('lists the saved files with their sizes, and sends removals and replacements', async () => {
            const user = userEvent.setup();
            serve({ project: { files: savedFiles } });
            const sent = captureSave('/user/project/edit/1');
            await openEditor('/manage-project/1');
            await goTo(user, '3. Code & Files');

            const sources = screen.getByRole('list', { name: 'Source files' });
            expect(listedPaths(sources)).toEqual(['src/main.py', 'src/utils.py']);
            expect(sources).toHaveTextContent(formatFileSize(1200));
            const assets = screen.getByRole('list', { name: 'Asset files' });
            expect(listedPaths(assets)).toEqual(['logo.png']);
            expect(assets).toHaveTextContent(formatFileSize(2048));

            await user.click(screen.getByRole('button', { name: 'Remove src/utils.py' }));
            // An upload to the path of a saved file replaces that file
            await user.upload(screen.getByLabelText(/Add Assets/), fileOf('logo.png', { type: 'image/png' }));
            expect(within(assets).getByText('Replaced on save')).toBeInTheDocument();

            await save(user, 'Update Project');
            expect(sent.body.getAll('remove_file_ids')).toEqual(['14']);
            expect(namesOf(sent.body.getAll('asset_files'))).toEqual(['logo.png']);
        });

        it('drops a picked file before saving', async () => {
            const user = userEvent.setup();
            serve();
            const sent = captureSave('/user/project/new');
            await openEditor();
            await user.type(screen.getByLabelText('Project Name'), 'Maze');
            await goTo(user, '3. Code & Files');
            await user.upload(screen.getByLabelText(/Add Files/), fileOf('maze.py'));

            await user.click(screen.getByRole('button', { name: 'Remove new file maze.py' }));

            expect(screen.getByText('No source files yet.')).toBeInTheDocument();
            await save(user, 'Create Project');
            expect(sent.body.has('source_files')).toBe(false);
        });

        it('tells a 3D project that this step is optional', async () => {
            const user = userEvent.setup();
            serve();
            await openEditor();
            await goTo(user, '3. Code & Files');
            expect(screen.queryByText('Everything in this step is optional for a 3D model.')).not.toBeInTheDocument();

            await goTo(user, '1. Core Info');
            await user.click(screen.getByRole('radio', { name: '3D model' }));
            await goTo(user, '3. Code & Files');

            expect(screen.getByText('Everything in this step is optional for a 3D model.')).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /Highlighted Code Snippet/ })).toBeInTheDocument();
        });
    });

    describe('preview', () => {
        const summary = () => document.querySelector('.preview-section-core .preview-file-summary');

        it('sums up, under the description, the files the project will hold', async () => {
            const user = userEvent.setup();
            serve({ project: { description: 'An arm that waves', files: savedFiles } });
            await openEditor('/manage-project/1');

            expect(summary()).toHaveTextContent('1 model, 2 source files, 1 asset');
            const description = document.querySelector('.preview-section-core .preview-desc');
            expect(description).toHaveTextContent('An arm that waves');
            expect(description.nextElementSibling).toBe(summary());

            await goTo(user, '3. Code & Files');
            await user.click(screen.getByRole('button', { name: 'Remove src/utils.py' }));

            expect(summary()).toHaveTextContent('1 model, 1 source file, 1 asset');
        });

        it('shows no summary for a project without files', async () => {
            serve({ project: {} });
            await openEditor('/manage-project/1');

            expect(summary()).toBeNull();
        });

        it('gives a 3D project without a model a gentle hint instead of the missing code note', async () => {
            serve({ project: { project_type: '3d' } });
            await openEditor('/manage-project/1');

            expect(screen.getByText(/No 3D model yet\. Upload it in the Media step/)).toBeInTheDocument();
            expect(screen.queryByText('Source code preview not available.')).not.toBeInTheDocument();
        });

        it('shows neither note for a 3D project with a model', async () => {
            serve({ project: { project_type: '3d', files: [savedModel] } });
            await openEditor('/manage-project/1');

            expect(screen.queryByText(/No 3D model yet\. Upload it/)).not.toBeInTheDocument();
            expect(screen.queryByText('Source code preview not available.')).not.toBeInTheDocument();
        });

        it('shows the snippet of a 3D project that has one', async () => {
            serve({ project: { project_type: '3d', code_snippet: 'print("lamp")' } });
            await openEditor('/manage-project/1');

            expect(screen.getByText('print("lamp")')).toBeInTheDocument();
            expect(screen.queryByText(/No 3D model yet\. Upload it/)).not.toBeInTheDocument();
        });

        it('keeps the missing code note for a code project', async () => {
            serve({ project: {} });
            await openEditor('/manage-project/1');

            expect(screen.getByText('Source code preview not available.')).toBeInTheDocument();
            expect(screen.queryByText(/No 3D model yet\. Upload it/)).not.toBeInTheDocument();
        });
    });

    describe('saving', () => {
        it('shows the upload on the save button, and to screen readers, while files are sent', async () => {
            const user = userEvent.setup();
            serve();
            let release;
            server.use(
                http.post('*/user/project/new', async () => {
                    await new Promise((resolve) => { release = resolve; });
                    return HttpResponse.json({ status: 'success', data: { project: { id: 2 } } });
                }),
            );
            await openEditor();
            await user.type(screen.getByLabelText('Project Name'), 'Maze');
            await goTo(user, '3. Code & Files');
            await user.upload(screen.getByLabelText(/Add Files/), fileOf('maze.py'));

            await user.click(screen.getByRole('button', { name: 'Create Project' }));

            expect(await screen.findByRole('button', { name: /Uploading \d+%/ })).toBeDisabled();
            expect(screen.getByRole('status')).toHaveTextContent(/Uploading your files: \d+ percent done\./);
            await waitFor(() => expect(release).toBeDefined());
            release();
            expect(await screen.findByTestId('profile-page')).toBeInTheDocument();
        });
    });
});
