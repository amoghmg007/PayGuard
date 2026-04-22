# Stage 1: Build the React Application
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies and build
COPY package.json package-lock.json* ./
RUN npm ci

COPY . ./
RUN npm run build

# Stage 2: Serve the application using FastAPI
FROM python:3.10-slim

WORKDIR /app

# Install native dependencies required for pdf generation and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY api/ ./api/

# Copy built frontend from Stage 1 into the static directory
COPY --from=build /app/dist ./api/static

# Set working directory to api so relative paths (like 'static/') work
WORKDIR /app/api

# Expose cloud run port
ENV PORT=8000
EXPOSE ${PORT}

# Run the backend
CMD ["sh", "-c", "uvicorn index:app --host 0.0.0.0 --port ${PORT}"]
