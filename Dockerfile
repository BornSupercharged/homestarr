# Stage 1: Build the Vue.js frontend
FROM node:18-alpine AS build-stage
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: Setup the Node.js backend runtime
FROM node:18-alpine AS production-stage
WORKDIR /app

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev # Install only production dependencies

# Copy backend source code
COPY server/ ./server/
COPY .env ./server/.env

# Copy built frontend assets from the build stage
COPY --from=build-stage /app/client/dist ./server/public

# Create data directory (will be mounted as volume)
RUN mkdir -p /app/server/data && chown node:node /app/server/data

# Use non-root user
USER node

# Expose the application port
EXPOSE 5050

# Set the default command to run the server
CMD ["node", "server/server.js"]