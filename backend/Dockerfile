FROM python:3.10-slim

WORKDIR /app

# Install native dependencies required for some python packages like pdf generation
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set environment variables if needed
ENV PYTHONUNBUFFERED=1

# Expose cloud run port (Cloud Run sets PORT env var automatically, we default it to 8000)
ENV PORT=8000
EXPOSE ${PORT}

# Run the backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
