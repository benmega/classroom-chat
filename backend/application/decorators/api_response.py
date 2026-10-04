import logging
from functools import wraps
from typing import Any, Callable, Optional, Union

from application.extensions import db
from flask import Response, current_app, jsonify
from werkzeug.datastructures import Headers

logger = logging.getLogger(__name__)

# Keys of the standard envelope: a view's own error dict never overwrites them.
_ENVELOPE_KEYS = ("status", "data", "error")
_GENERIC_ERROR = "An error occurred"


def _unpack(result: Any) -> tuple[Any, Optional[int], Any]:
    """Split a view's return value into (body, status code, headers), as Flask does."""
    if not isinstance(result, tuple):
        return result, None, None
    if len(result) == 3:
        body, status, headers = result
    elif len(result) == 2:
        body, extra = result
        if isinstance(extra, (Headers, dict, tuple, list)):
            status, headers = None, extra
        else:
            status, headers = extra, None
    else:
        raise ValueError(f"View returned a tuple of {len(result)} items")
    return body, int(status) if status is not None else None, headers


def _error_payload(body: Any) -> dict[str, Any]:
    """Build the error envelope.

    A dict body (e.g. {"error": "x"} or {"conflict": True, "message": "x"}) must not
    end up nested under "error": clients read `error` as a string, so it carries the
    message and the dict's remaining keys sit next to it at the top level.
    """
    if not isinstance(body, dict):
        return {"status": "error", "data": None, "error": body}

    message = next(
        (
            value
            for value in (body.get("error"), body.get("message"))
            if isinstance(value, str) and value
        ),
        _GENERIC_ERROR,
    )
    extras = {key: value for key, value in body.items() if key not in _ENVELOPE_KEYS}
    return {**extras, "status": "error", "data": None, "error": message}


def api_response(
    f: Callable[..., Any],
) -> Callable[..., Union[Response, tuple[Response, int]]]:
    @wraps(f)
    def decorated_function(
        *args: Any, **kwargs: Any
    ) -> Union[Response, tuple[Response, int]]:
        try:
            data = f(*args, **kwargs)

            # If the function returns a Flask Response object (like a redirect), return it directly
            if isinstance(data, Response):
                return data

            # (body), (body, status), (body, headers) or (body, status, headers)
            response_data, raw_code, headers = _unpack(data)

            # A Response inside a tuple is returned as is, with the status and headers applied
            if isinstance(response_data, Response):
                if raw_code is not None:
                    response_data.status_code = raw_code
                if headers:
                    response_data.headers.update(headers)
                return response_data

            status_code = raw_code if raw_code is not None else 200

            # Standard envelope
            if 200 <= status_code < 400:
                payload = {"status": "success", "data": response_data, "error": None}
            elif status_code >= 400:
                payload = _error_payload(response_data)
            else:
                payload = {"status": "error", "data": None, "error": None}

            response = jsonify(payload)
            if headers:
                response.headers.update(headers)
            return response, status_code

        except Exception as e:
            from werkzeug.exceptions import HTTPException

            if isinstance(e, HTTPException):
                status_code = e.code if e.code is not None else 500
                error_msg = str(e.description)
            else:
                status_code = 500
                # Never echo the exception to the client, even in debug: it is logged below
                error_msg = "Internal server error"
                current_app.logger.error(
                    f"API Error in {f.__name__}: {e!s}", exc_info=True
                )
                # A failed query leaves the session in a failed transaction
                try:
                    db.session.rollback()
                except Exception:
                    current_app.logger.exception(
                        f"Rollback failed after an error in {f.__name__}"
                    )

            return (
                jsonify({"status": "error", "data": None, "error": error_msg}),
                status_code,
            )

    return decorated_function
