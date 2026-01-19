FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt, canvas, ffi-napi for ERiC) and ffmpeg for video thumbnails
# Note: SQLite removed - all data now in MongoDB
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
    ffmpeg \
    openssl \
    libffi-dev

# ERiC-Bibliothek Verzeichnisse erstellen
RUN mkdir -p /opt/taskilo/eric/lib \
    /opt/taskilo/eric/plugins \
    /opt/taskilo/eric/certificates \
    /opt/taskilo/logs/eric

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
