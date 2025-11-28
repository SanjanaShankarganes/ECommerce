# 🚀 Quick Render Deployment Guide

Follow these steps to deploy your Catalogue app to Render.

## Prerequisites Checklist

- [x] Code is pushed to GitHub
- [ ] Render account created (https://render.com)
- [ ] GitHub repository is public (or Render has access)
- [ ] Elasticsearch service ready (see Step 3)

---

## Step 1: Deploy Backend Service

### 1.1 Create Web Service

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `Catalogue` (or your repo name)
5. Click **"Connect"**

### 1.2 Configure Backend

Fill in these settings:

- **Name**: `catalogue-backend`
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main` (or `master`)
- **Root Directory**: (leave empty)
- **Runtime**: `Node`
- **Build Command**: `cd Backend && npm install`
- **Start Command**: `cd Backend && npm start`

### 1.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render auto-sets this, but include it |
| `CORS_ORIGIN` | `https://catalogue-frontend.onrender.com` | ⚠️ Update after frontend is deployed |
| `ELASTICSEARCH_URL` | `https://your-elasticsearch-url` | See Step 3 below |

### 1.4 Create Service

- Click **"Create Web Service"**
- Wait for deployment (5-10 minutes)
- **Copy the service URL** (e.g., `https://catalogue-backend.onrender.com`)

---

## Step 2: Deploy Frontend Service

### 2.1 Create Static Site

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Select the same GitHub repository
3. Click **"Connect"**

### 2.2 Configure Frontend

Fill in these settings:

- **Name**: `catalogue-frontend`
- **Branch**: `main` (or `master`)
- **Root Directory**: (leave empty)
- **Build Command**: `cd Frontend && npm install && npm run build`
- **Publish Directory**: `Frontend/dist`

### 2.3 Add Environment Variable

Click **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://catalogue-backend.onrender.com/api` |

⚠️ **Important**: Replace `catalogue-backend` with your actual backend service name!

### 2.4 Create Service

- Click **"Create Static Site"**
- Wait for deployment (3-5 minutes)
- **Copy the frontend URL** (e.g., `https://catalogue-frontend.onrender.com`)

### 2.5 Update Backend CORS

1. Go back to your **Backend Service** settings
2. Edit the `CORS_ORIGIN` environment variable
3. Set it to your **frontend URL** (e.g., `https://catalogue-frontend.onrender.com`)
4. Save changes (this will trigger a redeploy)

---

## Step 3: Set Up Elasticsearch

You have 3 options:

### Option A: Elastic Cloud (Recommended - Free Trial)

1. Sign up at https://cloud.elastic.co
2. Create a new deployment
3. Choose a cloud provider and region
4. Wait for deployment (5-10 minutes)
5. Copy the **Elasticsearch endpoint** URL
   - Format: `https://xxxxx.es.region.cloud.es.io:9243`
6. Add to backend env vars as `ELASTICSEARCH_URL`

**Note**: Elastic Cloud free trial includes 14 days of free usage.

### Option B: Bonsai Elasticsearch (Free Tier Available)

1. Sign up at https://bonsai.io
2. Create a cluster
3. Copy the cluster URL
4. Add to backend env vars as `ELASTICSEARCH_URL`

### Option C: SearchStax (Alternative)

1. Sign up at https://www.searchstax.com
2. Create deployment
3. Get endpoint URL
4. Add to backend env vars

---

## Step 4: Index Elasticsearch Data

After backend is deployed:

1. Go to your **Backend Service** in Render
2. Click **"Shell"** tab (or use SSH)
3. Run these commands:

```bash
cd Backend
node elasticsearch/elasticsearchIndexing.js
```

This will index all your products into Elasticsearch.

---

## Step 5: Verify Deployment

### Check Backend

1. Visit: `https://your-backend.onrender.com/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

### Check Frontend

1. Visit your frontend URL
2. Should load the catalogue page
3. Try searching for products
4. Check browser console for errors

---

## 🔧 Troubleshooting

### Backend Issues

**Service won't start?**
- Check **Logs** tab in Render
- Verify all environment variables are set
- Ensure `npm start` works locally

**Can't connect to Elasticsearch?**
- Verify `ELASTICSEARCH_URL` is correct (include `https://`)
- Check if Elasticsearch requires authentication
- Ensure Elasticsearch allows connections from Render's IPs

### Frontend Issues

**Can't connect to backend?**
- Verify `VITE_API_URL` includes `/api`
- Check CORS_ORIGIN matches frontend URL exactly
- Check browser console for CORS errors

**Build fails?**
- Check build logs in Render
- Ensure all dependencies are in `package.json`
- Try building locally: `cd Frontend && npm run build`

---

## 📝 Important Notes

1. **Free Tier Limitations**:
   - Services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - Consider upgrading for production

2. **Database Persistence**:
   - SQLite files may be lost on redeploy
   - Consider PostgreSQL for production data

3. **Environment Variables**:
   - Update `CORS_ORIGIN` after frontend is deployed
   - Keep `ELASTICSEARCH_URL` secure (don't commit to git)

4. **Re-indexing**:
   - Run indexing script after each deployment if data changes
   - Or set up automatic indexing on deploy

---

## ✅ Deployment Checklist

- [ ] Backend service created and running
- [ ] Frontend service created and deployed
- [ ] Elasticsearch service configured
- [ ] `ELASTICSEARCH_URL` set in backend
- [ ] `VITE_API_URL` set in frontend
- [ ] `CORS_ORIGIN` updated with frontend URL
- [ ] Elasticsearch data indexed
- [ ] Health check endpoint works
- [ ] Frontend loads correctly
- [ ] Search functionality works
- [ ] Products display with images

---

## 🎉 You're Done!

Your app should now be live on Render! Share your frontend URL with others.

**Next Steps**:
- Monitor logs for errors
- Set up custom domains (Render Pro)
- Consider PostgreSQL for production database
- Set up automatic deployments from GitHub

