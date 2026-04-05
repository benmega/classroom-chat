import boto3
import os
from urllib.parse import unquote_plus
import whisper
import requests  # <--- Much better than urllib


def transcribe_video(video_path: str, model_name: str = "base") -> str:
    """Transcribe video audio to text using Whisper."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"File not found: {video_path}")

    # Load model (doing this inside handler is safer for memory)
    model = whisper.load_model(model_name)
    result = model.transcribe(video_path)
    return result["text"].strip()


def lambda_handler(event, context):
    s3 = boto3.client('s3')

    # Check if event is from S3 or Dispatcher
    # Dispatcher sends the inner record directly sometimes, or the full event
    if 'Records' in event:
        record = event['Records'][0]
    else:
        # Handle case where Dispatcher sends just the record payload
        record = event if 's3' in event else event.get('Records', [{}])[0]

    bucket = record['s3']['bucket']['name']
    key = unquote_plus(record['s3']['object']['key'])

    print(f"DEBUG: Processing file s3://{bucket}/{key}")

    # 1. Get project_id from metadata
    meta = s3.head_object(Bucket=bucket, Key=key)
    s3_meta = meta.get('Metadata', {})
    project_id = s3_meta.get('project_id') or s3_meta.get('project-id')
    print(f"DEBUG: Found Project ID: {project_id}")

    # 2. Download to /tmp
    download_path = f"/tmp/{os.path.basename(key)}"
    s3.download_file(bucket, key, download_path)

    # 3. Transcribe
    print("DEBUG: Starting transcription...")
    transcript = transcribe_video(download_path, model_name="base")
    print(f"DEBUG: Transcription complete. Length: {len(transcript)}")

    # 4. Send to Flask Webhook using requests
    url = os.environ['WEBHOOK_URL']
    secret = os.environ['WEBHOOK_SECRET']

    payload = {
        "project_id": project_id,
        "transcript": transcript
    }

    headers = {
        "X-API-KEY": secret,
        "User-Agent": "AWS-Lambda/VideoTranscriber"
    }

    # Requests handles Content-Type automatically here
    response = requests.post(url, json=payload, headers=headers)

    # Raise error if status is 4xx or 5xx
    response.raise_for_status()

    print(f"DEBUG: Webhook success: {response.status_code}")
    return {"status": "Transcript updated", "api_response": response.json()}