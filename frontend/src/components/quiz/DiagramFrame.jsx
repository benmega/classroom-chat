import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import diagramStyles from './quizDiagramStyles';

const MIN_HEIGHT = 40;

const buildDocument = (html) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${diagramStyles}</style>` +
    '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style>' +
    `</head><body>${html}</body></html>`;

/**
 * Renders quiz diagram markup in a sandboxed iframe. No scripts run (sandbox lacks allow-scripts);
 * allow-same-origin is only there so the parent can measure the content and size the frame to it.
 */
const DiagramFrame = ({ html, title = 'Diagram' }) => {
    const frameRef = useRef(null);
    const observerRef = useRef(null);
    const [height, setHeight] = useState(MIN_HEIGHT);
    const srcDoc = useMemo(() => (html ? buildDocument(html) : ''), [html]);

    const disconnect = useCallback(() => {
        observerRef.current?.disconnect();
        observerRef.current = null;
    }, []);

    const measure = useCallback(() => {
        const body = frameRef.current?.contentDocument?.body;
        if (!body) return;
        const next = Math.max(MIN_HEIGHT, Math.ceil(body.getBoundingClientRect().height || body.scrollHeight || 0));
        setHeight((current) => (current === next ? current : next));
    }, []);

    const handleLoad = useCallback(() => {
        disconnect();
        measure();
        const body = frameRef.current?.contentDocument?.body;
        if (body && typeof ResizeObserver !== 'undefined') {
            observerRef.current = new ResizeObserver(measure);
            observerRef.current.observe(body);
        }
    }, [disconnect, measure]);

    useEffect(() => disconnect, [disconnect]);

    if (!html) return null;

    return (
        <iframe
            ref={frameRef}
            className="quiz-diagram-frame"
            title={title}
            sandbox="allow-same-origin"
            srcDoc={srcDoc}
            onLoad={handleLoad}
            style={{ height, width: '100%', border: 0, display: 'block' }}
        />
    );
};

export default DiagramFrame;
