"""
File: session_routes.py
Type: py
Summary: Flask routes for session routes functionality.
"""

from flask import Blueprint, jsonify, request, session as flask_session
from datetime import datetime
import boto3
import requests

from application.extensions import db
from application.models.session_log import SessionLog

session = Blueprint('session', __name__)

INSTANCE_ID = "i-03afac811de461a56"
REGION_NAME = "ap-souteast-1"

try:
    response = requests.get('http://169.254.169.254/latest/dynamic/instance-identity/document', timeout=1.0)
    response_json = response.json()
    INSTANCE_ID = response_json.get('instanceId')
    REGION_NAME = response_json.get('region')
    print(f"Successfully fetched EC2 metadata. Instance: {INSTANCE_ID}, Region: {REGION_NAME}")

except requests.exceptions.ConnectionError:
    print(f"Not on EC2. Using default dev values. Instance: {INSTANCE_ID}, Region: {REGION_NAME}")
except Exception as e:
    print(f"Error fetching EC2 metadata, using defaults. Error: {e}")

cloudwatch = boto3.client('cloudwatch', region_name=REGION_NAME)


@session.route('/heartbeat', methods=['POST'])
def heartbeat():
    userid = flask_session.get('user')
    if not userid:
        return jsonify(success=False, error="Missing username"), 400

    from application import User
    current_user = User.query.filter_by(id=userid).first()
    user_id = current_user.id

    log = SessionLog.query.filter_by(user_id=user_id, end_time=None) \
        .order_by(SessionLog.start_time.desc()) \
        .first()
    if log:
        log.last_seen = datetime.utcnow()
        db.session.commit()

        try:
            cloudwatch.put_metric_data(
                MetricData=[
                    {
                        'MetricName': 'UserActivity',
                        'Dimensions': [
                            {
                                'Name': 'InstanceId',
                                'Value': INSTANCE_ID
                            },
                        ],
                        'Unit': 'Count',
                        'Value': 1.0
                    },
                ],
                Namespace='YourAppName/Activity'
    )
        except Exception as e:
            print(f"Error publishing metric to CloudWatch: {e}")
        # --- END MODIFIED CODE ---

    else:
        print(f"No log found for {user_id}")

    return jsonify(success=True, timestamp=datetime.utcnow().isoformat())