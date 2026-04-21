# Stage 1: Build the React Application
FROM node:18-alpine AS build

WORKDIR /app/frontend

# Install dependencies and build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Serve the application using FastAPI
FROM python:3.10-slim

WORKDIR /app

# Install native dependencies required for pdf generation and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./

# Copy built frontend from Stage 1 into the static directory
COPY --from=build /app/frontend/dist ./static

# Expose cloud run port
ENV PORT=8000
EXPOSE ${PORT}

# Run the backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
