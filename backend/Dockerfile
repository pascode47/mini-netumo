# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Expose the port the app runs on
# This should match the PORT in your .env or default in index.ts (e.g., 3001 or 3000)
EXPOSE 3001 

# Command to run the application
# Note: Ensure your .env variables are available to the container,
# typically through docker-compose environment section or Kubernetes secrets/configmaps.
# The .env file itself is usually not copied into the image for security.
CMD [ "node", "dist/index.js" ]
