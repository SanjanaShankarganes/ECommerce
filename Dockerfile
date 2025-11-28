# Multi-stage build for Catalogue App with Frontend, Backend, and Elasticsearch
FROM node:22 AS frontend-build

# Build Frontend
WORKDIR /app/frontend
COPY Frontend/package*.json ./
# Install with retry logic for network issues
RUN for i in 1 2 3; do npm install && break || sleep 10; done
COPY Frontend/ .
RUN npm run build

# Backend stage
FROM node:22 AS backend

# Install build tools for native modules (sqlite3)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY Backend/package*.json ./
# Workaround for SSL issues - retry with different npm configs
RUN npm config set registry https://registry.npmjs.org/ && \
    for i in 1 2 3; do npm install --production && break || (sleep 10 && npm cache clean --force); done
COPY Backend/ .

# Final stage - combine everything
FROM node:22

# Install system dependencies and Java (required for Elasticsearch)
# Retry on network/hash errors
RUN for i in 1 2 3; do \
        apt-get update && \
        apt-get install -y curl wget gnupg2 openjdk-17-jdk && \
        apt-get clean && \
        rm -rf /var/lib/apt/lists/* && \
        break || sleep 10; \
    done

# Install Elasticsearch
ENV ES_VERSION=8.11.0
RUN wget -q https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    tar -xzf elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mv elasticsearch-${ES_VERSION} /usr/share/elasticsearch && \
    rm elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mkdir -p /var/lib/elasticsearch && \
    mkdir -p /var/log/elasticsearch && \
    mkdir -p /usr/share/elasticsearch/config/jvm.options.d

# Remove any existing JSON config files (Elasticsearch 8.x might have them)
RUN rm -f /usr/share/elasticsearch/config/elasticsearch.json 2>/dev/null || true

# Copy Elasticsearch config file
COPY elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml

# Configure JVM options
RUN echo '-Xms256m' > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo '-Xmx256m' >> /usr/share/elasticsearch/config/jvm.options.d/heap.options

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

