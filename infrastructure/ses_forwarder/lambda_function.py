# Script: lambda_function.py
# Type: AWS Lambda (Python), function name ses_forwarder
# Summary: Forwards mail received for benmega.com (stored in S3 by the SES receipt rule
#          "forward" of rule set inbound-benmega) to Gmail.
#
# SES refuses to resend a received message as is: it already carries a DKIM-Signature
# (SES adds its own and rejects the duplicate), and its From is usually an address
# SES has not verified. So the headers are rewritten before sending: signatures and
# envelope headers are dropped, From becomes the verified forwarding address, and the
# original sender moves to Reply-To. The body is passed on byte for byte.
# Deployed by hand: zip this file and run `aws lambda update-function-code`.

import re
import traceback

import boto3

FORWARD_FROM_SOURCE = "ben@benmega.com"
FORWARD_TO_DESTINATION = "benmega@gmail.com"

DROPPED_HEADERS = {
    b"dkim-signature",
    b"domainkey-signature",
    b"return-path",
    b"sender",
    b"reply-to",
    b"from",
}

ses = boto3.client("ses")
s3 = boto3.client("s3")


def _split_headers(raw):
    """Split a raw message into its header fields (each with its folded lines) and body."""
    match = re.search(rb"\r?\n\r?\n", raw)
    if not match:
        return [], raw, b"\r\n"
    newline = b"\r\n" if b"\r\n" in match.group(0) else b"\n"
    header_block, body = raw[: match.start()], raw[match.end():]

    fields = []
    for line in header_block.split(newline):
        if line[:1] in (b" ", b"\t") and fields:
            fields[-1] += newline + line
        else:
            fields.append(line)
    return fields, body, newline


def _field_name(field):
    return field.split(b":", 1)[0].strip().lower()


def _field_value(field):
    return field.split(b":", 1)[1].strip() if b":" in field else b""


def rewrite_for_forwarding(raw):
    fields, body, newline = _split_headers(raw)

    original_from = next((_field_value(f) for f in fields if _field_name(f) == b"from"), b"")
    original_reply_to = next(
        (_field_value(f) for f in fields if _field_name(f) == b"reply-to"), b""
    )

    kept = [f for f in fields if _field_name(f) not in DROPPED_HEADERS]
    kept.insert(0, b"From: " + FORWARD_FROM_SOURCE.encode())
    reply_to = original_reply_to or original_from
    if reply_to:
        kept.insert(1, b"Reply-To: " + reply_to)

    return newline.join(kept) + newline + newline + body


def lambda_handler(event, context):
    try:
        rec = event["Records"][0]
        bucket = rec["s3"]["bucket"]["name"]
        key = rec["s3"]["object"]["key"]

        raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()

        ses.send_raw_email(
            Source=FORWARD_FROM_SOURCE,
            Destinations=[FORWARD_TO_DESTINATION],
            RawMessage={"Data": rewrite_for_forwarding(raw)},
        )
        print(f"Forwarded {key} to {FORWARD_TO_DESTINATION}")
    except Exception:
        traceback.print_exc()
        raise
