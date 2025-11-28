# 📦 Docker Container Setup Summary

Your application is now configured to run as a **single Docker container** with:
- ✅ Frontend (React + Vite)
- ✅ Backend (Node.js + Express)
- ✅ Elasticsearch 8.11.0

---

## What Was Changed

### 1. Root `Dockerfile` (New)
- Multi-stage build for frontend and backend
- Installs Elasticsearch 8.11.0
- Creates startup script that:
  - Starts Elasticsearch
  - Waits for it to be ready
  - Indexes data (if `INDEX_ON_START=true`)
  - Starts backend server
- Backend serves frontend static files in production

### 2. `Backend/index.js` (Updated)
- Added `path` module import
- Serves frontend static files in production mode
- Updated CORS to support environment variable or wildcard

### 3. `.dockerignore` (New)
- Excludes unnecessary files from Docker build

---

## Local Testing

### Build and Run:

```bash
# Build the image
docker build -t catalogue-app .

# Run the container
docker run -p 5000:5000 -p 9200:9200 \
  -e NODE_ENV=production \
  -e ELASTICSEARCH_URL=http://localhost:9200 \
  -e INDEX_ON_START=true \
  catalogue-app
```

### Or use docker-compose (for local dev):

```bash
docker-compose up
```

---

## Render Deployment

### Quick Steps:

1. **Push to GitHub** (if not already done)
2. **Go to Render Dashboard** → New Web Service
3. **Select Docker** environment
4. **Set Dockerfile Path**: `Dockerfile`
5. **Add Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `CORS_ORIGIN=*`
   - `ELASTICSEARCH_URL=http://localhost:9200`
   - `INDEX_ON_START=true` (set to `false` after first deploy)
6. **Choose Plan**: Standard (2GB) recommended
7. **Deploy!**

### After First Deploy:

1. Wait for indexing to complete (check logs)
2. Change `INDEX_ON_START=false` in environment variables
3. Save (will redeploy faster)

---

## Important Notes

### Memory Requirements

- **Elasticsearch**: Needs ~512MB-1GB RAM
- **Node.js Backend**: ~100-200MB RAM
- **Total**: ~1-2GB minimum
- **Render Free Tier**: 512MB ❌ (too small)
- **Render Starter**: 512MB ⚠️ (may work with optimizations)
- **Render Standard**: 2GB ✅ (recommended)

### Data Persistence

⚠️ **Warning**: Data in containers is **ephemeral** on Render
- SQLite database may be lost on redeploy
- Elasticsearch indices may be lost on redeploy
- **Solution**: Use external database or Render persistent disk

### Ports

- **5000**: Backend API (exposed by Render)
- **9200**: Elasticsearch (internal only, not exposed)

---

## File Structure

```
Catalogue/
├── Dockerfile              # Main container definition
├── .dockerignore           # Files to exclude from build
├── docker-compose.yml      # Local development (unchanged)
├── Backend/
│   ├── index.js           # Updated to serve frontend
│   └── ...
├── Frontend/
│   └── ...
└── DOCKER_DEPLOYMENT_QUICK.md  # Quick deployment guide
```

---

## Troubleshooting

### Build Fails

- Check Docker logs in Render
- Verify all files are in repository
- Check `.dockerignore` isn't excluding needed files

### Elasticsearch Won't Start

- Check memory allocation
- Verify Java is installed correctly
- Check Elasticsearch logs

### Frontend Not Loading

- Verify frontend build completed
- Check if static files are in correct path
- Verify backend is serving static files

### Search Not Working

- Check if Elasticsearch is running: `curl http://localhost:9200`
- Verify indexing completed: Check logs
- Test search endpoint: `/api/search?query=test`

---

## Next Steps

1. ✅ Test locally with Docker
2. ✅ Push to GitHub
3. ✅ Deploy to Render
4. ✅ Verify all services work
5. ✅ Set `INDEX_ON_START=false` after first index

---

## Alternative: Separate Services

If single container is too heavy or you want better scaling:

1. **Backend + Elasticsearch**: Docker service
2. **Frontend**: Static Site (free on Render)

See `RENDER_DOCKER_DEPLOYMENT.md` for details.

