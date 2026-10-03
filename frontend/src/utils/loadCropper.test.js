import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The loader caches its in-flight promise at module level, so each test gets a fresh module.
const freshLoader = async () => {
    vi.resetModules();
    return (await import('./loadCropper')).loadCropper;
};

describe('loadCropper', () => {
    let appended;

    // The tags the loader injected, in order. They are recorded rather than attached so
    // happy-dom does not try to fetch /lib/... over the network.
    const links = () => appended.filter((el) => el.tagName === 'LINK');
    const scripts = () => appended.filter((el) => el.tagName === 'SCRIPT');

    beforeEach(() => {
        delete window.Cropper;
        appended = [];
        const record = (el) => {
            appended.push(el);
            return el;
        };
        vi.spyOn(document.head, 'appendChild').mockImplementation(record);
        vi.spyOn(document.body, 'appendChild').mockImplementation(record);
    });

    afterEach(() => {
        delete window.Cropper;
        vi.restoreAllMocks();
    });

    it('resolves straight away when the library is already on the page', async () => {
        class FakeCropper {}
        window.Cropper = FakeCropper;
        const loadCropper = await freshLoader();

        await expect(loadCropper()).resolves.toBe(FakeCropper);

        expect(appended).toHaveLength(0);
    });

    it('injects the stylesheet and script and resolves with the library once it loads', async () => {
        const loadCropper = await freshLoader();
        const promise = loadCropper();

        expect(links()).toHaveLength(1);
        expect(links()[0].rel).toBe('stylesheet');
        expect(links()[0].getAttribute('href')).toBe('/lib/cropper.min.css');
        expect(scripts()).toHaveLength(1);
        expect(scripts()[0].getAttribute('src')).toBe('/lib/cropper.min.js');

        class FakeCropper {}
        window.Cropper = FakeCropper;
        scripts()[0].onload();

        await expect(promise).resolves.toBe(FakeCropper);
    });

    it('shares one load between concurrent callers', async () => {
        const loadCropper = await freshLoader();
        const first = loadCropper();
        const second = loadCropper();

        expect(second).toBe(first);
        expect(scripts()).toHaveLength(1);
        expect(links()).toHaveLength(1);

        window.Cropper = class {};
        scripts()[0].onload();
        await Promise.all([first, second]);
    });

    it('does not inject anything again once the library has loaded', async () => {
        const loadCropper = await freshLoader();
        const first = loadCropper();
        window.Cropper = class {};
        scripts()[0].onload();
        await first;

        await loadCropper();

        expect(scripts()).toHaveLength(1);
        expect(links()).toHaveLength(1);
    });

    it('rejects when the script fails to load and removes the tags it added', async () => {
        const loadCropper = await freshLoader();
        const promise = loadCropper();
        const removeLink = vi.spyOn(links()[0], 'remove');
        const removeScript = vi.spyOn(scripts()[0], 'remove');
        const assertion = expect(promise).rejects.toThrow('Failed to load the image cropper');

        scripts()[0].onerror();

        await assertion;
        expect(removeLink).toHaveBeenCalledTimes(1);
        expect(removeScript).toHaveBeenCalledTimes(1);
    });

    it('can be retried after a failed load, with a fresh set of tags', async () => {
        const loadCropper = await freshLoader();
        const failed = loadCropper();
        const failure = expect(failed).rejects.toThrow();
        scripts()[0].onerror();
        await failure;

        const retry = loadCropper();
        expect(retry).not.toBe(failed);
        expect(scripts()).toHaveLength(2);
        expect(links()).toHaveLength(2);

        class FakeCropper {}
        window.Cropper = FakeCropper;
        scripts()[1].onload();
        await expect(retry).resolves.toBe(FakeCropper);
    });

    it('treats a script that loads without defining Cropper as a failure', async () => {
        const loadCropper = await freshLoader();
        const promise = loadCropper();
        const removeScript = vi.spyOn(scripts()[0], 'remove');
        const assertion = expect(promise).rejects.toThrow('Failed to load the image cropper');

        scripts()[0].onload();

        await assertion;
        expect(removeScript).toHaveBeenCalledTimes(1);
        // ...and the next call tries again instead of reusing the dead promise.
        loadCropper();
        expect(scripts()).toHaveLength(2);
    });
});
