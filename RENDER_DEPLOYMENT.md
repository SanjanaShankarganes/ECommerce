# Render Deployment Guide

This guide will help you deploy the Catalogue application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. A GitHub repository with your code
3. An Elasticsearch service (you can use Elastic Cloud or another provider)

## Deployment Steps

### 1. Backend Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `catalogue-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd Backend && npm install`
   - **Start Command**: `cd Backend && npm start`
   - **Root Directory**: Leave empty (or set to repository root)

4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render automatically sets this, but good to have)
   - `CORS_ORIGIN` = Your frontend URL (e.g., `https://catalogue-frontend.onrender.com`)
   - `ELASTICSEARCH_URL` = Your Elasticsearch URL (e.g., `https://your-elasticsearch.es.io:9243`)

5. Click "Create Web Service"

### 2. Frontend Service

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `catalogue-frontend`
   - **Build Command**: `cd Frontend && npm install && npm run build`
   - **Publish Directory**: `Frontend/dist`

4. Add Environment Variables:
   - `VITE_API_URL` = Your backend URL (e.g., `https://catalogue-backend.onrender.com/api`)

5. Click "Create Static Site"

### 3. Elasticsearch Setup

You have a few options:

#### Option A: Elastic Cloud (Recommended)
1. Sign up at https://cloud.elastic.co
2. Create a deployment
3. Get your Elasticsearch endpoint URL
4. Add it to backend environment variables as `ELASTICSEARCH_URL`

#### Option B: Render PostgreSQL + Search (Alternative)
- Note: This would require migrating from Elasticsearch to PostgreSQL full-text search

#### Option C: External Elasticsearch Service
- Use any Elasticsearch hosting service
- Add the URL to backend environment variables

### 4. Database Setup

The SQLite database files are in `Backend/data/`. For production, consider:

1. **Option A**: Keep SQLite (files persist on Render's disk)
   - Files will be in the service's filesystem
   - May be lost if service is redeployed

2. **Option B**: Migrate to PostgreSQL (Recommended for production)
   - Create a PostgreSQL database on Render
   - Update backend to use PostgreSQL instead of SQLite

### 5. Initial Data Setup

After deployment, you'll need to:

1. **Index Elasticsearch**:
   ```bash
   # SSH into your backend service or use Render Shell
   cd Backend
   node elasticsearch/elasticsearchIndexing.js
   ```

2. **Seed Images** (if needed):
   ```bash
   node scripts/seedImages.js
   ```

## Environment Variables Summary

### Backend
- `NODE_ENV` = `production`
- `PORT` = `10000` (or let Render set it)
- `CORS_ORIGIN` = Your frontend URL
- `ELASTICSEARCH_URL` = Your Elasticsearch URL

### Frontend
- `VITE_API_URL` = Your backend URL (e.g., `https://catalogue-backend.onrender.com/api`)

## Post-Deployment Checklist

- [ ] Backend service is running
- [ ] Frontend service is deployed
- [ ] Elasticsearch is connected and indexed
- [ ] CORS is configured correctly
- [ ] API calls work from frontend
- [ ] Database has initial data

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure `npm start` command works locally

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly
- Check CORS settings in backend
- Ensure backend URL includes `/api` if needed

### Elasticsearch connection errors
- Verify `ELASTICSEARCH_URL` is correct
- Check if Elasticsearch requires authentication
- Ensure network access is allowed

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- Consider upgrading for production use
- Database files may be lost on service restart (use PostgreSQL for production)
- Elasticsearch indexing should be done after each deployment if data changes

