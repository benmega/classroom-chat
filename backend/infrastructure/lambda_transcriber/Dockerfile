FROM public.ecr.aws/lambda/python:3.12

# 1. Install System Dependencies (FFmpeg)
RUN dnf install -y wget tar xz && \
    wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xvf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ && \
    rm -rf ffmpeg-*-amd64-static*

# 2. Set Environment Variables
# Crucial: Redirect Whisper to look for models in a folder we control, not /root/.cache
ENV XDG_CACHE_HOME=${LAMBDA_TASK_ROOT}/cache

# 3. Install Torch (CPU version) explicitly first
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

# 4. Install remaining requirements
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

# 5. Pre-download the model into the Task Root
# This ensures the model is physically present in /var/task/cache/whisper where the runtime can read it
RUN mkdir -p ${LAMBDA_TASK_ROOT}/cache && \
    python -c "import whisper; whisper.load_model('base')"

# 6. Copy Function Code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/

CMD [ "lambda_function.lambda_handler" ]