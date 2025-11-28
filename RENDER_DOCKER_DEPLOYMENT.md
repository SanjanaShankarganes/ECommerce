# 🐳 Render Docker Deployment Guide

Deploy your entire application (Frontend + Backend + Elasticsearch) as a single Docker container on Render.

## Prerequisites

- ✅ Code pushed to GitHub
- ✅ Render account (https://render.com)

---

## Step 1: Create Docker Web Service on Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository: `Catalogue`

## Step 2: Configure Docker Service

### Basic Settings:

- **Name**: `catalogue-fullstack`
- **Environment**: `Docker`
- **Region**: Choose closest to you
- **Branch**: `main` (or your branch)
- **Root Directory**: (leave empty)
- **Dockerfile Path**: `Dockerfile` (or leave empty if at root)
- **Docker Context**: `.` (root directory)

### Environment Variables:

Add these in the **"Environment"** section:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | Backend port (Render will override this) |
| `CORS_ORIGIN` | `*` | CORS origin (or your frontend URL) |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Internal Elasticsearch URL |
| `INDEX_ON_START` | `true` | Auto-index on startup (set to `false` after first deploy) |

### Advanced Settings:

- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (recommended)

## Step 3: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Build the Docker image
   - Start Elasticsearch
   - Index your data (if `INDEX_ON_START=true`)
   - Start the backend server
3. Wait 5-10 minutes for first deployment

---

## Step 4: Serve Frontend

You have two options:

### Option A: Serve Frontend from Backend (Recommended)

Update your backend to serve the frontend static files:

```javascript
// In Backend/index.js, add before other routes:
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

### Option B: Separate Static Site (Alternative)

1. Create a **Static Site** on Render
2. Point to your GitHub repo
3. Build command: `cd Frontend && npm install && npm run build`
4. Publish directory: `Frontend/dist`
5. Set `VITE_API_URL` to your backend URL

---

## Step 5: Verify Deployment

1. **Check Health**: `https://your-service.onrender.com/health`
2. **Test API**: `https://your-service.onrender.com/api/ctable`
3. **Test Search**: `https://your-service.onrender.com/api/search?query=test`
4. **Access Frontend**: `https://your-service.onrender.com`

---

## Important Notes

### Memory Requirements

- Elasticsearch needs at least **1GB RAM**
- Render free tier: **512MB** (may not work)
- **Recommendation**: Upgrade to **Starter** plan ($7/month) with 512MB, or **Standard** ($25/month) with 2GB

### Elasticsearch Configuration

The Dockerfile configures Elasticsearch with:
- Single-node mode
- Security disabled (for simplicity)
- 512MB heap size
- Data persisted in container (may be lost on redeploy)

### Data Persistence

⚠️ **Important**: Data in containers is **ephemeral** on Render
- SQLite database: May be lost on redeploy
- Elasticsearch data: May be lost on redeploy
- **Solution**: Use Render's persistent disk or external database

---

## Troubleshooting

### Container won't start

**Check logs** in Render dashboard:
```bash
# Common issues:
- Out of memory (need more RAM)
- Elasticsearch takes too long to start
- Port conflicts
```

### Elasticsearch not ready

Increase wait time in startup script or check Elasticsearch logs:
```bash
# In Render Shell:
service elasticsearch status
tail -f /var/log/elasticsearch/elasticsearch.log
```

### Frontend not loading

- Check if static files are being served
- Verify build completed successfully
- Check browser console for errors

### Search not working

1. Check if Elasticsearch is running: `curl http://localhost:9200`
2. Verify indexing: `curl http://localhost:9200/products/_search`
3. Check backend logs for Elasticsearch connection errors

---

## Alternative: Simplified Dockerfile (Without Elasticsearch in Container)

If Elasticsearch causes memory issues, you can:

1. Use external Elasticsearch (Elastic Cloud, Bonsai)
2. Remove Elasticsearch from Dockerfile
3. Update `ELASTICSEARCH_URL` to external service

---

## Cost Considerations

| Plan | RAM | Price | Works? |
|------|-----|-------|--------|
| Free | 512MB | $0 | ❌ Too small for Elasticsearch |
| Starter | 512MB | $7/mo | ⚠️ May work with optimizations |
| Standard | 2GB | $25/mo | ✅ Recommended |
| Pro | 4GB | $85/mo | ✅ Overkill but works great |

---

## Recommended Setup

For production, consider:

1. **Backend + Elasticsearch**: Docker service on Render (Standard plan)
2. **Frontend**: Separate Static Site (free)
3. **Database**: Render PostgreSQL (for data persistence)

This gives you:
- ✅ Better performance
- ✅ Data persistence
- ✅ Easier scaling
- ✅ Lower cost (frontend is free)

---

## Quick Commands

### Check if services are running (in Render Shell):

```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check backend
curl http://localhost:5000/health

# Re-index if needed
cd /app/backend
node elasticsearch/elasticsearchIndexing.js
```

---

## Next Steps

1. Deploy Docker service on Render
2. Monitor logs during first deployment
3. Verify all services are running
4. Test search functionality
5. Set `INDEX_ON_START=false` after first successful index

