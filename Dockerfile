# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy server and client package files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build the React frontend
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy server with its dependencies
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p server/uploads

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Run migrations then start the server
CMD ["sh", "-c", "cd server && node src/migrate.js && cd /app && npm start"]
