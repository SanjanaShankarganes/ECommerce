# Multi-stage build for Catalogue App with Frontend, Backend, and Elasticsearch
FROM node:22-slim AS frontend-build

# Build Frontend
WORKDIR /app/frontend
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ .
RUN npm run build

# Backend stage
FROM node:22-slim AS backend

# Install build tools for native modules (sqlite3)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY Backend/package*.json ./
RUN npm install --production
COPY Backend/ .

# Final stage - combine everything
FROM node:22-slim

# Install system dependencies and Java (required for Elasticsearch)
RUN apt-get update && \
    apt-get install -y curl wget gnupg2 openjdk-17-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Elasticsearch
ENV ES_VERSION=8.11.0
RUN wget -q https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    tar -xzf elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mv elasticsearch-${ES_VERSION} /usr/share/elasticsearch && \
    rm elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mkdir -p /var/lib/elasticsearch && \
    mkdir -p /var/log/elasticsearch

# Configure Elasticsearch
RUN echo "discovery.type=single-node" > /usr/share/elasticsearch/config/elasticsearch.yml && \
    echo "xpack.security.enabled=false" >> /usr/share/elasticsearch/config/elasticsearch.yml && \
    echo "network.host: 0.0.0.0" >> /usr/share/elasticsearch/config/elasticsearch.yml && \
    echo "http.port: 9200" >> /usr/share/elasticsearch/config/elasticsearch.yml && \
    echo "-Xms256m" > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo "-Xmx256m" >> /usr/share/elasticsearch/config/jvm.options.d/heap.options

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy backend
COPY --from=backend /app/backend /app/backend
WORKDIR /app/backend

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose ports
EXPOSE 5000 9200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["/app/start.sh"]

