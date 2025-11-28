# Render Out of Memory - Solutions

## Problem

```
Ran out of memory (used over 512MB) while running your code.
```

**Root Cause:** 
- Render free tier: 512 MB RAM
- Elasticsearch alone: ~256-300 MB
- Node.js backend: ~100-150 MB
- System overhead: ~100 MB
- **Total needed:** ~550-600 MB ❌ **Exceeds limit!**

---

## Solution Options (Choose One)

### 🌟 **RECOMMENDED: Option 1 - Use External Elasticsearch (FREE)**

**Best choice:** Keep your app on Render free tier, use Elastic Cloud free tier for Elasticsearch.

#### Step 1: Sign Up for Elastic Cloud (Free)

1. Go to: https://cloud.elastic.co/registration
2. Sign up for free trial (14 days) or free tier
3. Create deployment:
   - Choose "Elasticsearch" 
   - Select smallest size (free tier)
   - Region: Choose closest to your Render region
   - Click "Create deployment"

4. **Save these credentials:**
   - Cloud ID
   - Username: `elastic`
   - Password: (shown once, save it!)
   - Endpoint URL: `https://[your-deployment].es.[region].aws.found.io:9243`

#### Step 2: Update Your Backend Code

**File: `Backend/index.js`**
No changes needed!

**File: `Backend/routes/productTable.js`**

Add authentication for Elastic Cloud:

```javascript
// Around line 368-374, update the axios call:
const elasticsearchUrl = process.env.ELASTICSEARCH_URL 
  ? `${process.env.ELASTICSEARCH_URL}/products/_search`
  : `http://localhost:9200/products/_search`;

const esResponse = await axios.post(elasticsearchUrl, esQuery, {
  headers: { 'Content-Type': 'application/json' },
  // Add authentication if credentials are provided
  ...(process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD && {
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    }
  })
});
```

**File: `Backend/elasticsearch/elasticsearchIndexing.js`**

Update axios calls similarly to include auth.

#### Step 3: Update Dockerfile

**Remove Elasticsearch from Dockerfile:**

```dockerfile
# Multi-stage build for Catalogue App with Frontend and Backend (NO Elasticsearch)
FROM node:22 AS frontend-build

# Build Frontend
WORKDIR /app/frontend
COPY Frontend/package*.json ./
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
RUN npm config set registry https://registry.npmjs.org/ && \
    for i in 1 2 3; do npm install --production && break || (sleep 10 && npm cache clean --force); done
COPY Backend/ .

# Final stage - combine everything
FROM node:22

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy backend
COPY --from=backend /app/backend /app/backend
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start backend directly
CMD ["node", "index.js"]
```

#### Step 4: Update Render Environment Variables

```
NODE_ENV=production
PORT=5000
ELASTICSEARCH_URL=https://[your-deployment].es.[region].aws.found.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=[your-password]
INDEX_ON_START=false
```

**Important:** 
- Use the full HTTPS URL with port 9243
- Don't set INDEX_ON_START=true initially - index manually first

#### Step 5: Index Data Manually (One Time)

After deployment, run indexing script locally:

```bash
cd Backend

# Set environment variables
export ELASTICSEARCH_URL=https://[your-deployment].es.[region].aws.found.io:9243
export ELASTICSEARCH_USERNAME=elastic
export ELASTICSEARCH_PASSWORD=[your-password]

# Run indexing
node elasticsearch/elasticsearchIndexing.js
```

#### Benefits:
- ✅ Stays within 512MB limit (only Node.js app)
- ✅ Better performance (dedicated ES instance)
- ✅ Better reliability (ES managed by experts)
- ✅ FREE (Elastic Cloud has free tier)
- ✅ Easier scaling later

---

### 💰 **Option 2 - Upgrade Render Plan**

**Cost:** $7/month for 512MB → $25/month for 2GB

1. Go to Render Dashboard
2. Select your service
3. Click "Upgrade" 
4. Choose "Standard" plan (2GB RAM)
5. Keep current Dockerfile (with Elasticsearch)

#### Benefits:
- ✅ Everything in one container
- ✅ No external dependencies
- ✅ Simpler architecture

#### Drawbacks:
- ❌ Costs $25/month
- ❌ Still limited resources
- ❌ May need upgrade again as data grows

---

### 🔧 **Option 3 - Reduce Memory Usage (Risky)**

**Attempt to fit in 512MB by reducing memory allocation:**

#### Update Dockerfile:

```dockerfile
# Configure JVM options (VERY LOW memory - may be unstable)
RUN echo '-Xms128m' > /usr/share/elasticsearch/config/jvm.options.d/heap.options && \
    echo '-Xmx128m' >> /usr/share/elasticsearch/config/jvm.options.d/heap.options
```

#### Update start.sh:

```bash
export ES_JAVA_OPTS="-Xms128m -Xmx128m"
```

#### Update elasticsearch.yml:

```yaml
# Aggressive memory settings
indices.queries.cache.size: 3%
indices.memory.index_buffer_size: 5%
indices.fielddata.cache.size: 10%

# Disable features
xpack.ml.enabled: false
xpack.monitoring.enabled: false
```

#### Benefits:
- ✅ Free
- ✅ Single container

#### Drawbacks:
- ❌ May still exceed 512MB
- ❌ Very unstable
- ❌ Frequent crashes
- ❌ Slow search performance
- ❌ NOT RECOMMENDED

---

### 🏗️ **Option 4 - Deploy Without Search**

**Temporary solution while setting up external ES:**

#### Update Dockerfile:

Remove all Elasticsearch installation (same as Option 1)

#### Update Backend Routes:

**File: `Backend/routes/productTable.js`**

Add fallback for search when ES unavailable:

```javascript
router.get('/search', async (req, res) => {
  const { query: userInput, categoryName, page = 1, limit = 10, sortBy = 'relevance' } = req.query;
  
  try {
    // Try Elasticsearch first
    if (process.env.ELASTICSEARCH_URL) {
      // ... existing ES code ...
    } else {
      // Fallback: Use SQLite LIKE query
      console.warn('Elasticsearch not configured, using SQLite fallback');
      return fallbackSearch(req, res);
    }
  } catch (error) {
    console.error('Elasticsearch error, falling back to SQLite:', error.message);
    return fallbackSearch(req, res);
  }
});

function fallbackSearch(req, res) {
  const { query: userInput, categoryName, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `SELECT * FROM products WHERE productName LIKE ?`;
  const params = [`%${userInput}%`];
  
  if (categoryName) {
    const categories = categoryName.split(',');
    query += ` AND categoryName IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }
  
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get(`SELECT COUNT(*) as total FROM products WHERE productName LIKE ?`, [`%${userInput}%`], (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        products: rows,
        totalProducts: countResult.total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });
}
```

#### Benefits:
- ✅ App works immediately
- ✅ Fits in 512MB
- ✅ Can add ES later

#### Drawbacks:
- ❌ Poor search quality (no fuzzy matching, typo tolerance)
- ❌ Slower search on large datasets
- ❌ No advanced search features

---

## 🌟 **Recommended Implementation: Option 1 (External ES)**

### Quick Start Guide:

#### 1. Create Simplified Dockerfile:

```dockerfile
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ .
RUN npm run build

FROM node:22 AS backend
WORKDIR /app/backend
COPY Backend/package*.json ./
RUN npm install --production
COPY Backend/ .

FROM node:22
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
COPY --from=backend /app/backend /app/backend
WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
CMD ["node", "index.js"]
```

#### 2. Update Backend for Auth (Quick Patch):

Add to `Backend/routes/productTable.js` after line 371:

```javascript
const esConfig = {
  headers: { 'Content-Type': 'application/json' }
};

// Add auth if using Elastic Cloud
if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  esConfig.auth = {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  };
}

const esResponse = await axios.post(elasticsearchUrl, esQuery, esConfig);
```

#### 3. Sign Up for Elastic Cloud:

https://cloud.elastic.co/registration

#### 4. Update Render Env Vars:

```
NODE_ENV=production
PORT=5000
ELASTICSEARCH_URL=https://[your-id].es.us-east-1.aws.found.io:9243
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=[your-password]
```

#### 5. Deploy and Test:

```bash
git add -A
git commit -m "Use external Elasticsearch to reduce memory usage"
git push origin main
```

---

## Memory Comparison

| Option | Memory Usage | Cost | Reliability |
|--------|-------------|------|-------------|
| **Current (ES in container)** | ~600 MB ❌ | $0 | ❌ Crashes |
| **Option 1 (External ES)** | ~150 MB ✅ | $0 | ✅ Stable |
| **Option 2 (Upgrade)** | ~600 MB ✅ | $25/mo | ✅ Stable |
| **Option 3 (Reduce)** | ~450 MB ⚠️ | $0 | ❌ Unstable |
| **Option 4 (No Search)** | ~100 MB ✅ | $0 | ✅ Stable |

---

## Decision Matrix

**Choose Option 1 if:**
- ✅ Want to stay on free tier
- ✅ Need full search functionality
- ✅ Okay with external dependency
- ✅ **RECOMMENDED**

**Choose Option 2 if:**
- ✅ Can afford $25/month
- ✅ Want everything in one place
- ✅ Prefer simple architecture

**Choose Option 3 if:**
- ⚠️ Testing only
- ⚠️ Expect crashes
- ⚠️ NOT for production

**Choose Option 4 if:**
- ✅ Need quick temporary solution
- ✅ Can live without good search
- ✅ Will add ES later

---

## Implementation Time

| Option | Time to Implement | Complexity |
|--------|------------------|------------|
| Option 1 | 30 minutes | Medium |
| Option 2 | 2 minutes | Easy |
| Option 3 | 5 minutes | Easy |
| Option 4 | 20 minutes | Medium |

---

## Next Steps

**I recommend Option 1 (External Elasticsearch).** 

Would you like me to:
1. Create the simplified Dockerfile (no ES)?
2. Update the backend code to support ES authentication?
3. Provide detailed Elastic Cloud setup instructions?

Let me know which option you prefer, and I'll help you implement it!

