FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, bcrypt, canvas) and ffmpeg for video thumbnails
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    ffmpeg

# Copy package files
COPY package.json ./

# Install dependencies with npm (better native module support)
RUN npm install

# Copy source files
COPY . .

# Build TypeScript (always rebuild)
RUN npm run build

# Expose port
EXPOSE 3100

# Set environment
ENV NODE_ENV=production
ENV PORT=3100

# Start server
CMD ["node", "dist/server.js"]
