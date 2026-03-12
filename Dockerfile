# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2 and audio libs
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Ensure the app knows it's in Docker (if needed)
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Start command
# Start command using Gunicorn with our custom config
CMD ["sh", "-c", "gunicorn -c gunicorn.conf.py main:app --bind 0.0.0.0:${PORT:-10000}"]
