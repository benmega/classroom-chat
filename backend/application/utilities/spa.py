"""
File: spa.py
Type: py
Summary: Hand-off to the React single-page app for browser (non-API) navigation.
"""

from flask import jsonify, render_template
from jinja2 import TemplateNotFound

VITE_DEV_URL = "http://localhost:5173"


def serve_spa_index(**context):
    """
    Serve the React index.html.

    In production TEMPLATE_FOLDER is frontend/dist, so index.html resolves to
    the built app. In development/testing there is no Jinja index.html (the
    React app is served by the Vite dev server), so return a JSON 404 rather
    than redirecting (Vite proxies most paths back to Flask, which could loop).
    """
    try:
        return render_template("index.html", **context)
    except TemplateNotFound:
        return (
            jsonify(
                {
                    "error": "Frontend not served by Flask in this environment.",
                    "hint": f"Open the React app at {VITE_DEV_URL}",
                }
            ),
            404,
        )
