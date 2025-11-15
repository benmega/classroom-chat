# application/routes/session_routes.py

from flask import Blueprint, jsonify
from datetime import datetime
import boto3
import requests  # Make sure you've done 'pip install requests'

from application.extensions import db
from flask import Blueprint, jsonify, request, session as flask_session
from application.models.session_log import SessionLog

session = Blueprint('session', __name__)

# --- CONFIGURATION ---
# Default values for local development
INSTANCE_ID = "i-03afac811de461a56"
# !! IMPORTANT: Change this to the region your EC2 instance is in
REGION_NAME = "ap-souteast-1"

try:
    # This request will only work on an EC2 instance
    # It gets the instance's ID and region automatically
    response = requests.get('http://169.254.169.254/latest/dynamic/instance-identity/document', timeout=1.0)
    response_json = response.json()
    INSTANCE_ID = response_json.get('instanceId')
    REGION_NAME = response_json.get('region')
    print(f"Successfully fetched EC2 metadata. Instance: {INSTANCE_ID}, Region: {REGION_NAME}")

except requests.exceptions.ConnectionError:
    # This is expected when running locally
    print(f"Not on EC2. Using default dev values. Instance: {INSTANCE_ID}, Region: {REGION_NAME}")
except Exception as e:
    # Any other error
    print(f"Error fetching EC2 metadata, using defaults. Error: {e}")

# Create the client *using* the region we found or hardcoded
cloudwatch = boto3.client('cloudwatch', region_name=REGION_NAME)


# --- END NEW CODE ---


@session.route('/heartbeat', methods=['POST'])
def heartbeat():
    userid = flask_session.get('user')
    if not userid:
        return jsonify(success=False, error="Missing username"), 400

    from application import User  # TODO refactor to avoid circular import
    current_user = User.query.filter_by(id=userid).first()
    user_id = current_user.id

    log = SessionLog.query.filter_by(user_id=user_id, end_time=None) \
        .order_by(SessionLog.start_time.desc()) \
        .first()
    if log:
        log.last_seen = datetime.utcnow()
        db.session.commit()

        # --- MODIFIED CODE ---
        # If the DB commit was successful, publish a "1" to CloudWatch
        try:
            cloudwatch.put_metric_data(
                MetricData=[
                    {
                        'MetricName': 'UserActivity',
                        'Dimensions': [
                            {
                                'Name': 'InstanceId',
                                'Value': INSTANCE_ID  # This now uses the correct ID
                            },
                        ],
                        'Unit': 'Count',
                        'Value': 1.0
                    },
                ],
                Namespace='YourAppName/Activity'  # Create a custom namespace
    ***REMOVED***
        except Exception as e:
            # Don't let a CloudWatch failure break the heartbeat
            print(f"Error publishing metric to CloudWatch: {e}")
        # --- END MODIFIED CODE ---

    else:
        print(f"No log found for {user_id}")

    return jsonify(success=True, timestamp=datetime.utcnow().isoformat())