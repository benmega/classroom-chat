import logging
import os
from threading import Thread

import boto3
from application.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def _send_async_email(subject, body, to_address, from_address, region):
    """Internal function to actually send the email via Boto3 in a separate thread."""
    to_addresses = [addr.strip() for addr in to_address.split(',')]
    try:
        # Create a new SES client for this thread
        kwargs = {"region_name": region}
        if os.environ.get("AWS_SES_ACCESS_KEY_ID") and os.environ.get("AWS_SES_SECRET_ACCESS_KEY"):
            kwargs["aws_access_key_id"] = os.environ.get("AWS_SES_ACCESS_KEY_ID")
            kwargs["aws_secret_access_key"] = os.environ.get("AWS_SES_SECRET_ACCESS_KEY")

        client = boto3.client('ses', **kwargs)

        response = client.send_email(
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
        logger.info(
            "Email sent: %r to %s (SES message %s)",
            subject, to_addresses, response.get("MessageId"),
        )
    except ClientError as e:
        logger.exception(
            "SES refused email %r to %s: %s", subject, to_addresses, e.response['Error']['Message']
        )
    except Exception:
        logger.exception("Error sending email %r to %s", subject, to_addresses)

def send_admin_email(subject, body):
    """
    Asynchronously sends an email to the admin using AWS SES.
    Configuration is pulled from application.config.Config.
    """
    to_address = Config.ADMIN_EMAIL_ADDRESS
    from_address = Config.SES_SENDER_EMAIL
    region = Config.SES_REGION

    if not to_address or not from_address:
        logger.warning(
            "Skipping admin email %r: ADMIN_EMAIL_ADDRESS or SES_SENDER_EMAIL not configured.",
            subject,
        )
        return

    # Run in background to avoid blocking the API response
    thread = Thread(
        target=_send_async_email,
        args=(subject, body, to_address, from_address, region)
    )
    thread.daemon = True
    thread.start()

def send_email(subject, body, to_addresses):
    """
    Asynchronously sends an email to specific addresses using AWS SES.
    """
    from_address = Config.SES_SENDER_EMAIL
    region = Config.SES_REGION

    if not to_addresses or not from_address:
        logger.warning("Skipping email %r: to_addresses or SES_SENDER_EMAIL not provided.", subject)
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
