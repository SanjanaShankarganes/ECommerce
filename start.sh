#!/bin/bash
set -e

# Start Elasticsearch in background
echo "Starting Elasticsearch..."
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
export ES_JAVA_OPTS="-Xms256m -Xmx256m"

# Set Elasticsearch paths
export ES_HOME=/usr/share/elasticsearch
export ES_PATH_CONF=/usr/share/elasticsearch/config

# Create pid directory with proper permissions
mkdir -p /tmp/elasticsearch
chown elasticsearch:elasticsearch /tmp/elasticsearch

# Start Elasticsearch as elasticsearch user (not root)
echo "Starting Elasticsearch as elasticsearch user..."
su - elasticsearch -c "cd /usr/share/elasticsearch && ES_HOME=/usr/share/elasticsearch ES_PATH_CONF=/usr/share/elasticsearch/config ES_JAVA_OPTS='-Xms256m -Xmx256m' JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:\$PATH /usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch/elasticsearch.pid"

# Wait for Elasticsearch to be ready
echo "Waiting for Elasticsearch..."
for i in {1..60}; do
  if curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "Elasticsearch is ready!"
    break
  fi
  echo "Waiting... ($i/60)"
  sleep 2
done

# Index data if needed
if [ "$INDEX_ON_START" = "true" ]; then
  echo "Indexing Elasticsearch data..."
  cd /app/backend
  node elasticsearch/elasticsearchIndexing.js || echo "Indexing failed or already indexed"
fi

# Start backend server
echo "Starting backend server..."
cd /app/backend
exec node index.js

