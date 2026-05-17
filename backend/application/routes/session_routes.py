"""
File: session_routes.py
Type: py
Summary: Flask routes for session routes functionality.
"""

from datetime import datetime

import boto3
import requests
from flask import Blueprint, jsonify, session as flask_session

from application.extensions import db
from application.models.session_log import SessionLog

session = Blueprint("session", __name__)

_ec2_metadata_cache = None


def get_ec2_metadata():
    global _ec2_metadata_cache
    if _ec2_metadata_cache:
        return _ec2_metadata_cache

    instance_id = "i-03afac811de461a56"
    region_name = "ap-southeast-1"

    try:
        response = requests.get(
            "http://169.254.169.254/latest/dynamic/instance-identity/document",
            timeout=0.1,  # Very short timeout
        )
        response_json = response.json()
        instance_id = response_json.get("instanceId", instance_id)
        region_name = response_json.get("region", region_name)
    except Exception:
        pass  # Silently fail and use defaults if not on EC2

    _ec2_metadata_cache = (instance_id, region_name)
    return _ec2_metadata_cache


def get_cloudwatch_client():
    _, region = get_ec2_metadata()
    return boto3.client("cloudwatch", region_name=region)


@session.route("/heartbeat", methods=["POST"])
def heartbeat():
    userid = flask_session.get("user")
    if not userid:
        return jsonify(success=False, error="Missing username"), 400

    from application import User

    current_user = User.query.filter_by(id=userid).first()
    user_id = current_user.id

    log = (
        SessionLog.query.filter_by(user_id=user_id, end_time=None)
        .order_by(SessionLog.start_time.desc())
        .first()
    )
    if log:
        log.last_seen = datetime.utcnow()
        db.session.commit()

        try:
            instance_id, _ = get_ec2_metadata()
            cw = get_cloudwatch_client()
            cw.put_metric_data(
                MetricData=[
                    {
                        "MetricName": "UserActivity",
                        "Dimensions": [
                            {"Name": "InstanceId", "Value": instance_id},
                        ],
                        "Unit": "Count",
                        "Value": 1.0,
                    },
                ],
                Namespace="ClassroomChat/Activity",
            )
        except Exception as e:
            print(f"Error publishing metric to CloudWatch: {e}")

        # --- END MODIFIED CODE ---

    else:
        print(f"No log found for {user_id}")

    return jsonify(success=True, timestamp=datetime.utcnow().isoformat())
