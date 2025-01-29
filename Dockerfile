FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEPLOYMENT_ENV=production

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set up environment for Cloud Build
ENV PORT=8080
EXPOSE ${PORT}

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]