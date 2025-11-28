# Quick Render Deployment Guide

## Quick Start

### 1. Backend Deployment

1. **Create Web Service on Render**
   - Go to https://dashboard.render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name**: `catalogue-backend`
     - **Root Directory**: (leave empty)
     - **Environment**: `Node`
     - **Build Command**: `cd Backend && npm install`
     - **Start Command**: `cd Backend && npm start`

2. **Environment Variables** (in Render dashboard):
   ```
   NODE_ENV=production
   PORT=10000
   CORS_ORIGIN=https://your-frontend-url.onrender.com
   ELASTICSEARCH_URL=https://your-elasticsearch-url
   ```

### 2. Frontend Deployment

1. **Create Static Site on Render**
   - Go to https://dashboard.render.com
   - Click "New" → "Static Site"
   - Connect your GitHub repository
   - Settings:
     - **Name**: `catalogue-frontend`
     - **Root Directory**: (leave empty)
     - **Build Command**: `cd Frontend && npm install && npm run build`
     - **Publish Directory**: `Frontend/dist`

2. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com/api
   ```

### 3. Elasticsearch Setup

**Option 1: Elastic Cloud (Recommended)**
- Sign up at https://cloud.elastic.co
- Create a deployment
- Copy the Elasticsearch endpoint URL
- Add to backend env vars as `ELASTICSEARCH_URL`

**Option 2: Use Render's built-in search** (requires code changes)

### 4. After Deployment

1. **Index Elasticsearch**:
   - Use Render Shell or SSH
   - Run: `cd Backend && node elasticsearch/elasticsearchIndexing.js`

2. **Verify**:
   - Check backend logs for errors
   - Test API endpoints
   - Verify frontend can connect to backend

## Important Notes

- ⚠️ **Free tier services sleep after 15 min** - First request will be slow
- ⚠️ **SQLite files may be lost** on redeploy - Consider PostgreSQL for production
- ✅ **CORS must match** your frontend URL exactly
- ✅ **Environment variables** must be set before first deploy

## Troubleshooting

**Backend won't start?**
- Check Render logs
- Verify PORT is set (Render auto-sets it)
- Ensure all dependencies are in package.json

**Frontend can't connect?**
- Verify `VITE_API_URL` includes `/api`
- Check CORS_ORIGIN matches frontend URL
- Check browser console for errors

**Elasticsearch errors?**
- Verify URL format (include https://)
- Check if authentication is required
- Ensure network access is allowed

