# 🚀 Quick Docker Deployment on Render

Deploy your entire app (Frontend + Backend + Elasticsearch) as a single container.

## Prerequisites

✅ Code pushed to GitHub  
✅ Render account

---

## Step 1: Create Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub and select your `Catalogue` repo

## Step 2: Configure Service

### Settings:

- **Name**: `catalogue-fullstack`
- **Environment**: `Docker`
- **Dockerfile Path**: `Dockerfile` (or leave empty)
- **Docker Context**: `.` (root)

### Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `CORS_ORIGIN` | `*` |
| `ELASTICSEARCH_URL` | `http://localhost:9200` |
| `INDEX_ON_START` | `true` |

### Plan:

⚠️ **Important**: You need at least **Starter** plan ($7/month) or **Standard** ($25/month)
- Free tier (512MB) is too small for Elasticsearch
- Recommended: **Standard** (2GB RAM)

## Step 3: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for first build
3. Check logs for any errors

## Step 4: Verify

After deployment:

1. **Health**: `https://your-service.onrender.com/health`
2. **API**: `https://your-service.onrender.com/api/ctable`
3. **Frontend**: `https://your-service.onrender.com`
4. **Search**: `https://your-service.onrender.com/api/search?query=test`

---

## After First Deploy

Once indexing is complete:

1. Go to **Environment** tab
2. Change `INDEX_ON_START` to `false`
3. Save (will redeploy, but faster now)

---

## Troubleshooting

### Out of Memory

- Upgrade to **Standard** plan (2GB)
- Or reduce Elasticsearch heap in Dockerfile

### Elasticsearch Not Starting

Check logs in Render dashboard:
```bash
# Look for Elasticsearch errors
# May need more memory or longer startup time
```

### Frontend Not Loading

- Check if build completed
- Verify static files are being served
- Check browser console

---

## What's Included

✅ Frontend (React + Vite)  
✅ Backend (Node.js + Express)  
✅ Elasticsearch 8.11.0  
✅ Auto-indexing on first start  
✅ Health checks  
✅ Single container deployment  

---

## Cost

- **Starter**: $7/month (512MB) - May work
- **Standard**: $25/month (2GB) - Recommended ✅
- **Pro**: $85/month (4GB) - Overkill

---

## Alternative: Separate Services

If single container is too heavy:

1. **Backend + Elasticsearch**: Docker service
2. **Frontend**: Static Site (free)

See `RENDER_DOCKER_DEPLOYMENT.md` for details.

