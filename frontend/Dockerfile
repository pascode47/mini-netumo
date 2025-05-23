# Stage 1: Build the Angular application
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Angular CLI globally (if needed for build scripts, or use local)
# RUN npm install -g @angular/cli
# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the application for production
# Using direct ng build command based on angular.json
RUN npx ng build frontend --configuration production

# List the contents of the dist directory to verify output path
RUN echo "--- Listing contents of /usr/src/app/dist/ ---" && ls -R /usr/src/app/dist/
RUN echo "--- Listing contents of /usr/src/app/dist/frontend/ ---" && ls -R /usr/src/app/dist/frontend/
RUN echo "--- Listing contents of /usr/src/app/dist/frontend/browser/ ---" && ls -R /usr/src/app/dist/frontend/browser/ || echo "browser dir not found"

# Stage 2: Serve application with Nginx
FROM nginx:1.25-alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage to Nginx html directory
# Using 'dist/frontend/browser/' as this is standard for Angular SSR client assets.
COPY --from=builder /usr/src/app/dist/frontend/browser/ /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
