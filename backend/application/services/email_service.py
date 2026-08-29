"""
File: email_service.py
Type: py
Summary: Service for sending emails via AWS SES.
"""

import os
from threading import Thread

import boto3
from application.config import Config
from botocore.exceptions import ClientError


def _send_async_email(subject, body, to_address, from_address, region):
    """Internal function to actually send the email via Boto3 in a separate thread."""
    try:
        # Create a new SES client for this thread
        kwargs = {"region_name": region}
        if os.environ.get("AWS_SES_ACCESS_KEY_ID") and os.environ.get("AWS_SES_SECRET_ACCESS_KEY"):
            kwargs["aws_access_key_id"] = os.environ.get("AWS_SES_ACCESS_KEY_ID")
            kwargs["aws_secret_access_key"] = os.environ.get("AWS_SES_SECRET_ACCESS_KEY")

        client = boto3.client('ses', **kwargs)

        to_addresses = [addr.strip() for addr in to_address.split(',')]

        print(f"DEBUG SEND EMAIL: Source={from_address}, ToAddresses={to_addresses}")

        client.send_email(
            Destination={
                'ToAddresses': to_addresses,
            },
            Message={
                'Body': {
                    'Text': {
                        'Charset': 'UTF-8',
                        'Data': body,
                    },
                },
                'Subject': {
                    'Charset': 'UTF-8',
                    'Data': subject,
                },
            },
            Source=from_address,
        )
    except ClientError as e:
        print(f"AWS SES ClientError: {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Error sending email: {e}")

def send_admin_email(subject, body):
    """
    Asynchronously sends an email to the admin using AWS SES.
    Configuration is pulled from application.config.Config.
    """
    to_address = Config.ADMIN_EMAIL_ADDRESS
    from_address = Config.SES_SENDER_EMAIL
    region = Config.SES_REGION

    if not to_address or not from_address:
        print("Skipping admin email: ADMIN_EMAIL_ADDRESS or SES_SENDER_EMAIL not configured.")
        return

    # Run in background to avoid blocking the API response
    thread = Thread(
        target=_send_async_email,
        args=(subject, body, to_address, from_address, region)
    )
    thread.daemon = True
def send_email(subject, body, to_addresses):
    """
    Asynchronously sends an email to specific addresses using AWS SES.
    """
    from_address = Config.SES_SENDER_EMAIL
    region = Config.SES_REGION

    if not to_addresses or not from_address:
        print("Skipping email: to_addresses or SES_SENDER_EMAIL not provided.")
        return

    # Run in background to avoid blocking the API response
    # _send_async_email takes a string and splits it if needed, so we pass a comma separated string if it's a list.
    to_address_str = ",".join(to_addresses) if isinstance(to_addresses, list) else to_addresses

    thread = Thread(
        target=_send_async_email,
        args=(subject, body, to_address_str, from_address, region)
    )
    thread.daemon = True
    thread.start()
