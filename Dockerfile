# Wolfpack Recall — full cloud image (includes DeepFace Face ID / Page 3).
# Docker runtime is used so we can install the system libs OpenCV needs
# (libGL) which Render's native Python runtime lacks.
FROM python:3.11-slim

# System libraries required by OpenCV (pulled in by DeepFace).
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first (better layer caching). Full set = includes DeepFace + TF.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the SFace recognition weights at build time so the first
# live scan is fast (no ~40 MB download on the first request).
RUN python -c "import numpy as np; from deepface import DeepFace; \
DeepFace.represent(np.zeros((160,160,3), dtype='uint8'), model_name='SFace', \
detector_backend='skip', enforce_detection=False)" || true

# App code (see .dockerignore for what's excluded, e.g. .venv/.env).
COPY . .

ENV COGNEE_DATASET=pinky_serbia
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
