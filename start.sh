#!/bin/bash
set -e

# Start Elasticsearch in background
echo "Starting Elasticsearch..."
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
/usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch.pid

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

