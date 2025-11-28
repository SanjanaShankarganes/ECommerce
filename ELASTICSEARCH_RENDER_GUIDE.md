# Elasticsearch in Docker on Render.com - Complete Guide

## Overview

Running Elasticsearch inside a Docker container on Render.com requires specific configuration due to:
1. **Security restrictions** - Cannot run as root user
2. **Memory constraints** - Render free tier has limited RAM
3. **Single container architecture** - ES runs alongside your app

---

## Issues and Solutions

### Issue #1: "Cannot Run Elasticsearch as Root"

**Error:**
```
[ERROR][o.e.b.Elasticsearch] fatal exception while booting Elasticsearch
java.lang.RuntimeException: can not run elasticsearch as root
```

**Why:** Elasticsearch 8.x+ refuses to run as root for security reasons.

**Solution:** ✅ Create a non-root user and run ES as that user.

**Implementation in Dockerfile:**
```dockerfile
# Create elasticsearch user with flexible UID/GID
RUN if getent group 1000 >/dev/null 2>&1; then \
        groupadd -g 1001 elasticsearch; \
    else \
        groupadd -g 1000 elasticsearch; \
    fi && \
    if getent passwd 1000 >/dev/null 2>&1; then \
        useradd -u 1001 -g elasticsearch -s /bin/bash -m elasticsearch; \
    else \
        useradd -u 1000 -g elasticsearch -s /bin/bash -m elasticsearch; \
    fi

# Set ownership of ES directories
RUN chown -R elasticsearch:elasticsearch /usr/share/elasticsearch && \
    chown -R elasticsearch:elasticsearch /var/lib/elasticsearch && \
    chown -R elasticsearch:elasticsearch /var/log/elasticsearch
```

**Implementation in start.sh:**
```bash
# Start ES as elasticsearch user
su - elasticsearch -c "cd /usr/share/elasticsearch && \
    ES_HOME=/usr/share/elasticsearch \
    ES_PATH_CONF=/usr/share/elasticsearch/config \
    ES_JAVA_OPTS='-Xms256m -Xmx256m' \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:\$PATH \
    /usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch/elasticsearch.pid"
```

---

### Issue #2: "User/Group Already Exists" (Build Error)

**Error:**
```
exit code: 4
groupadd: GID '1000' already exists
useradd: UID 1000 is not unique
```

**Why:** The base Docker image (node:22) already has a user/group with UID/GID 1000.

**Solution:** ✅ Check if UID/GID exists before creating, use alternative ID if needed.

**Fixed Implementation:**
```dockerfile
RUN if getent group 1000 >/dev/null 2>&1; then \
        groupadd -g 1001 elasticsearch; \
    else \
        groupadd -g 1000 elasticsearch; \
    fi && \
    if getent passwd 1000 >/dev/null 2>&1; then \
        useradd -u 1001 -g elasticsearch -s /bin/bash -m elasticsearch; \
    else \
        useradd -u 1000 -g elasticsearch -s /bin/bash -m elasticsearch; \
    fi
```

This checks if UID/GID 1000 exists:
- If yes: Use 1001
- If no: Use 1000

---

### Issue #3: Memory Constraints on Render Free Tier

**Challenge:** 
- Render free tier: 512 MB RAM
- Elasticsearch default: 1 GB heap
- Need to reduce ES memory usage

**Solution:** ✅ Limit ES heap size to 256 MB

**Configuration:**

**In Dockerfile:**
```dockerfile
RUN echo '-Xms256m' > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo '-Xmx256m' >> /usr/share/elasticsearch/config/jvm.options.d/heap.options
```

**In start.sh:**
```bash
export ES_JAVA_OPTS="-Xms256m -Xmx256m"
```

**Memory Breakdown on Render:**
- Total available: ~512 MB
- Elasticsearch: ~256 MB
- Node.js Backend: ~150 MB
- System overhead: ~100 MB

⚠️ **Note:** This is tight! Monitor memory usage carefully.

---

### Issue #4: Elasticsearch Startup Time

**Challenge:** ES takes 30-60 seconds to start

**Solution:** ✅ Implement proper wait logic

**In start.sh:**
```bash
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
```

**Health Check in Dockerfile:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

Note `--start-period=90s` gives ES time to start before health checks fail.

---

## Complete Configuration Files

### Dockerfile (Elasticsearch Section)

```dockerfile
# Create elasticsearch user (Elasticsearch cannot run as root)
# Check if UID/GID 1000 exists, if so use different ID
RUN if getent group 1000 >/dev/null 2>&1; then \
        groupadd -g 1001 elasticsearch; \
    else \
        groupadd -g 1000 elasticsearch; \
    fi && \
    if getent passwd 1000 >/dev/null 2>&1; then \
        useradd -u 1001 -g elasticsearch -s /bin/bash -m elasticsearch; \
    else \
        useradd -u 1000 -g elasticsearch -s /bin/bash -m elasticsearch; \
    fi

# Install Elasticsearch
ENV ES_VERSION=8.11.0
RUN wget -q https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    tar -xzf elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mv elasticsearch-${ES_VERSION} /usr/share/elasticsearch && \
    rm elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz && \
    mkdir -p /var/lib/elasticsearch && \
    mkdir -p /var/log/elasticsearch && \
    mkdir -p /usr/share/elasticsearch/config/jvm.options.d

# Copy Elasticsearch config
COPY elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml

# Configure JVM options (Low memory for Render free tier)
RUN echo '-Xms256m' > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo '-Xmx256m' >> /usr/share/elasticsearch/config/jvm.options.d/heap.options

# Set proper ownership
RUN chown -R elasticsearch:elasticsearch /usr/share/elasticsearch && \
    chown -R elasticsearch:elasticsearch /var/lib/elasticsearch && \
    chown -R elasticsearch:elasticsearch /var/log/elasticsearch

# Health check with long start period for ES startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

### elasticsearch.yml

```yaml
cluster.name: "catalogue-cluster"
node.name: "node-1"
network.host: 0.0.0.0
http.port: 9200

# Single node setup
discovery.type: single-node

# Disable security for simplicity (internal use only)
xpack.security.enabled: false

# Memory settings
bootstrap.memory_lock: false

# Path settings
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
```

### start.sh (Elasticsearch Section)

```bash
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
su - elasticsearch -c "cd /usr/share/elasticsearch && \
    ES_HOME=/usr/share/elasticsearch \
    ES_PATH_CONF=/usr/share/elasticsearch/config \
    ES_JAVA_OPTS='-Xms256m -Xmx256m' \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:\$PATH \
    /usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch/elasticsearch.pid"

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
```

---

## Render-Specific Configuration

### Environment Variables to Set in Render:

```
NODE_ENV=production
PORT=5000
ELASTICSEARCH_URL=http://localhost:9200
INDEX_ON_START=true
```

### Memory Considerations:

Render's free tier provides:
- **512 MB RAM total**
- Must fit: Elasticsearch + Node.js + OS

If you experience OOM (Out of Memory) errors:

**Option 1: Reduce ES Memory Further**
```dockerfile
RUN echo '-Xms128m' > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo '-Xmx128m' >> /usr/share/elasticsearch/config/jvm.options.d/heap.options
```

**Option 2: Upgrade Render Plan**
- Starter plan: 512 MB ($7/month)
- Standard plan: 2 GB ($25/month)

**Option 3: Use External Elasticsearch**
- Elastic Cloud (has free tier)
- Bonsai Elasticsearch (Render add-on)
- AWS OpenSearch Service

---

## Monitoring Elasticsearch

### Check Elasticsearch Status

**During deployment (in logs):**
```
Starting Elasticsearch as elasticsearch user...
Waiting for Elasticsearch...
Elasticsearch is ready!
```

**After deployment:**
```bash
# SSH into container (if available) or check logs
curl http://localhost:9200/_cluster/health

# Expected response:
{
  "cluster_name": "catalogue-cluster",
  "status": "green",
  "number_of_nodes": 1,
  "active_primary_shards": 5,
  "active_shards": 5
}
```

### Check Elasticsearch Logs

Logs are in: `/var/log/elasticsearch/`

Common issues to look for:
- OutOfMemoryError
- Disk space issues
- Port conflicts

---

## Troubleshooting

### Issue: "Elasticsearch Not Starting"

**Check:**
1. User permissions are correct
2. Memory settings are appropriate
3. Ports are not in use
4. Java is installed

**Debug:**
```bash
# Check if ES process is running
ps aux | grep elasticsearch

# Check ES logs
cat /var/log/elasticsearch/catalogue-cluster.log

# Test manually
su - elasticsearch -c "/usr/share/elasticsearch/bin/elasticsearch"
```

### Issue: "Connection Refused to Elasticsearch"

**Causes:**
- ES not fully started (wait longer)
- ES crashed due to OOM
- Port binding issue

**Solution:**
```bash
# Check if ES is listening
netstat -tulpn | grep 9200

# Check ES health
curl -v http://localhost:9200

# Increase wait time in start.sh if needed
```

### Issue: "Out of Memory Error"

**Symptoms:**
- Container crashes
- ES process killed
- Logs show OOM

**Solutions:**
1. Reduce ES heap: `-Xmx128m`
2. Disable features you don't need
3. Upgrade Render plan
4. Use external Elasticsearch

---

## Alternative: External Elasticsearch Service

If running ES in the same container is problematic:

### Option 1: Elastic Cloud (Free Tier)
```
1. Sign up at: https://cloud.elastic.co
2. Create free deployment
3. Get connection URL
4. Set in Render:
   ELASTICSEARCH_URL=https://[your-deployment]:9200
   ELASTICSEARCH_USERNAME=elastic
   ELASTICSEARCH_PASSWORD=[your-password]
```

### Option 2: Bonsai (Render Add-on)
```
1. In Render Dashboard → Add-ons
2. Add Bonsai Elasticsearch
3. Use provided connection URL
4. Update backend to use credentials
```

### Option 3: Self-Hosted ES on Separate Service
```
1. Deploy ES separately on Render
2. Use internal networking
3. Connect services via private URL
```

---

## Performance Optimization

### For Limited Memory:

1. **Reduce Index Settings:**
```javascript
// In elasticsearchIndexing.js
settings: {
  number_of_shards: 1,      // Default: 5
  number_of_replicas: 0,    // Default: 1
  refresh_interval: "30s"   // Default: 1s
}
```

2. **Disable Features:**
```yaml
# In elasticsearch.yml
xpack.ml.enabled: false
xpack.monitoring.enabled: false
xpack.watcher.enabled: false
```

3. **Limit Cache:**
```yaml
indices.queries.cache.size: 5%   # Default: 10%
indices.memory.index_buffer_size: 5%  # Default: 10%
```

---

## Success Indicators

### Elasticsearch is Working When:

✅ **Build Phase:**
- Docker build completes without errors
- elasticsearch user created successfully
- Ownership set correctly

✅ **Startup Phase:**
- "Starting Elasticsearch as elasticsearch user..." appears
- "Elasticsearch is ready!" appears within 60 seconds
- No OOM errors

✅ **Runtime Phase:**
- `curl localhost:9200` returns cluster info
- Health check passes
- Search queries return results
- No memory warnings in logs

---

## Quick Reference

### Common Commands:
```bash
# Check ES status
curl http://localhost:9200

# Check cluster health
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices

# Check memory usage
curl http://localhost:9200/_nodes/stats/jvm

# Force garbage collection
curl -X POST "localhost:9200/_nodes/stats/jvm?filter_path=nodes.*.jvm.mem.heap_used_percent"
```

### Memory Settings:
```
Minimum:  -Xms128m -Xmx128m  (may be unstable)
Recommended: -Xms256m -Xmx256m (current)
Optimal: -Xms512m -Xmx512m (requires paid plan)
```

---

## Summary

**Current Configuration:**
- ✅ Runs as non-root elasticsearch user
- ✅ Handles existing UID/GID conflicts
- ✅ Memory limited to 256 MB for free tier
- ✅ Proper startup wait logic
- ✅ Health checks configured
- ✅ Ownership and permissions set correctly

**Render Deployment Status:** ✅ Ready

**Next Steps:**
1. Commit updated Dockerfile and start.sh
2. Push to git
3. Deploy to Render
4. Monitor logs for successful ES startup
5. Test search functionality

---

**If issues persist after these fixes, consider using an external Elasticsearch service instead of running it in the same container.**

