FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

# npm start = vite build + node server.js
CMD ["npm", "start"]
