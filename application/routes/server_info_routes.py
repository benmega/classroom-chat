# server_info_routes.py

from flask import Blueprint, jsonify
import socket

server_info = Blueprint("server_info", __name__, url_prefix="/server")

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Non-routable IP to get preferred outbound interface
        s.connect(("10.255.255.255", 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP

@server_info.route("/ip", methods=["GET"])
def get_ip():
    return jsonify({"ip": get_local_ip()})
