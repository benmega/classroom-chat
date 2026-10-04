// Cropper.js is shipped as a plain script/stylesheet in public/lib (not an npm
// dependency), so it is injected on first use. The load is shared: concurrent and
// repeated callers get the same promise, and the tags are added only once. A failed
// load clears the cache, so the next call can retry from a clean slate.
const CROPPER_CSS_URL = '/lib/cropper.min.css';
const CROPPER_JS_URL = '/lib/cropper.min.js';

let loading = null;

export const loadCropper = () => {
    if (typeof window.Cropper !== 'undefined') return Promise.resolve(window.Cropper);
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CROPPER_CSS_URL;
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = CROPPER_JS_URL;
        script.async = true;

        const fail = () => {
            loading = null;
            link.remove();
            script.remove();
            reject(new Error('Failed to load the image cropper'));
        };
        script.onload = () => {
            if (typeof window.Cropper === 'undefined') {
                fail();
                return;
            }
            resolve(window.Cropper);
        };
        script.onerror = fail;
        document.body.appendChild(script);
    });
    return loading;
};
