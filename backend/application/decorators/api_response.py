from functools import wraps
from flask import jsonify

def api_response(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        data = f(*args, **kwargs)
        
        # If the function returns a tuple (response, status_code)
        if isinstance(data, tuple):
            response_data, status_code = data
        else:
            response_data = data
            status_code = 200
            
        # Standard envelope
        payload = {
            "status": "success" if 200 <= status_code < 400 else "error",
            "data": response_data if 200 <= status_code < 400 else None,
            "error": response_data if status_code >= 400 else None
        }
        
        return jsonify(payload), status_code
    return decorated_function
