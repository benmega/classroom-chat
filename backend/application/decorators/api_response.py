import logging
from functools import wraps
from typing import Any, Callable, Union
from flask import jsonify, Response, current_app

logger = logging.getLogger(__name__)


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

            # If the function returns a tuple (response, status_code)
            if isinstance(data, tuple):
                response_data, raw_code = data
                status_code = int(raw_code) if raw_code is not None else 200
            else:
                response_data = data
                status_code = 200

            # Standard envelope
            payload = {
                "status": "success" if 200 <= status_code < 400 else "error",
                "data": response_data if 200 <= status_code < 400 else None,
                "error": response_data if status_code >= 400 else None,
            }

            return jsonify(payload), status_code

        except Exception as e:
            from werkzeug.exceptions import HTTPException

            if isinstance(e, HTTPException):
                status_code = e.code if e.code is not None else 500
                error_msg = str(e.description)
            else:
                status_code = 500
                error_msg = str(e) if current_app.debug else "Internal server error"
                current_app.logger.error(
                    f"API Error in {f.__name__}: {str(e)}", exc_info=True
                )

            return (
                jsonify({"status": "error", "data": None, "error": error_msg}),
                status_code,
            )

    return decorated_function
