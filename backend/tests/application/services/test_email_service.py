import os
from unittest.mock import MagicMock, patch

import pytest
from application.services.email_service import send_admin_email, send_email


def synchronous_thread_start(self):
    self._target(*self._args, **self._kwargs)

@patch('application.services.email_service.Thread.start', synchronous_thread_start)
@patch('application.services.email_service.boto3.client')
@patch('application.services.email_service.Config')
def test_send_admin_email(mock_config, mock_boto3_client):
    mock_config.ADMIN_EMAIL_ADDRESS = "admin@example.com"
    mock_config.SES_SENDER_EMAIL = "sender@example.com"
    mock_config.SES_REGION = "us-east-1"

    mock_client_instance = MagicMock()
    mock_boto3_client.return_value = mock_client_instance

    # Temporarily remove env vars that might interfere
    with patch.dict(os.environ, {}, clear=True):
        send_admin_email("Test Admin Subject", "Test Admin Body")

    mock_boto3_client.assert_called_once_with('ses', region_name="us-east-1")
    mock_client_instance.send_email.assert_called_once()

    kwargs = mock_client_instance.send_email.call_args[1]
    assert kwargs['Destination']['ToAddresses'] == ["admin@example.com"]
    assert kwargs['Message']['Subject']['Data'] == "Test Admin Subject"
    assert kwargs['Message']['Body']['Text']['Data'] == "Test Admin Body"
    assert kwargs['Source'] == "sender@example.com"


@patch('application.services.email_service.Thread.start', synchronous_thread_start)
@patch('application.services.email_service.boto3.client')
@patch('application.services.email_service.Config')
def test_send_email_single_address(mock_config, mock_boto3_client):
    mock_config.SES_SENDER_EMAIL = "sender@example.com"
    mock_config.SES_REGION = "us-east-1"

    mock_client_instance = MagicMock()
    mock_boto3_client.return_value = mock_client_instance

    with patch.dict(os.environ, {}, clear=True):
        send_email("Test Subject", "Test Body", "user@example.com")

    mock_boto3_client.assert_called_once_with('ses', region_name="us-east-1")
    mock_client_instance.send_email.assert_called_once()

    kwargs = mock_client_instance.send_email.call_args[1]
    assert kwargs['Destination']['ToAddresses'] == ["user@example.com"]
    assert kwargs['Message']['Subject']['Data'] == "Test Subject"
    assert kwargs['Message']['Body']['Text']['Data'] == "Test Body"
    assert kwargs['Source'] == "sender@example.com"


@patch('application.services.email_service.Thread.start', synchronous_thread_start)
@patch('application.services.email_service.boto3.client')
@patch('application.services.email_service.Config')
def test_send_email_multiple_addresses(mock_config, mock_boto3_client):
    mock_config.SES_SENDER_EMAIL = "sender@example.com"
    mock_config.SES_REGION = "us-east-1"

    mock_client_instance = MagicMock()
    mock_boto3_client.return_value = mock_client_instance

    with patch.dict(os.environ, {}, clear=True):
        send_email("Test Subject 2", "Test Body 2", ["user1@example.com", "user2@example.com"])

    mock_client_instance.send_email.assert_called_once()

    kwargs = mock_client_instance.send_email.call_args[1]
    # The _send_async_email splits the comma separated string
    assert kwargs['Destination']['ToAddresses'] == ["user1@example.com", "user2@example.com"]
    assert kwargs['Message']['Subject']['Data'] == "Test Subject 2"
    assert kwargs['Source'] == "sender@example.com"
