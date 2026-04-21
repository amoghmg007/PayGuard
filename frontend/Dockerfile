# Stage 1: Build the React Application
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build Vite project to "dist" folder
RUN npm run build

# Stage 2: Serve the application using NGINX
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy Custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port (Cloud Run passes PORT natively, mapping it properly)
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
