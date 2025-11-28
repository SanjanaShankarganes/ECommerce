# Environment Configuration Guide

## Overview

This document explains the environment variable configuration for the Catalogue application in both development and production environments.

## Critical Fixes Applied

### ❌ Previous Issues Found:
1. **Frontend `.env`**: Used `REACT_APP_BASE_URL` (React convention) instead of `VITE_API_URL` (Vite convention)
2. **Backend `.env`**: Port was set to `5004` but Docker exposes `5000`
3. **Backend CORS**: Was set to `http://localhost:5174` instead of `*` for Docker compatibility

### ✅ Fixed Configuration:

---

## Frontend Environment Variables

### Development: `Frontend/.env`
```env
# Vite API URL - must start with VITE_ prefix
VITE_API_URL=http://localhost:5000/api
```

**Key Points:**
- ⚠️ **Must use `VITE_` prefix** - This is a Vite requirement, not React's `REACT_APP_`
- Points to backend on port `5000` (matching Docker expose port)
- Used when running `npm run dev`

### Production: `Frontend/.env.production.local`
```env
# Production Environment Variables (for Docker/Render deployment)
# Use relative URL since frontend and backend are in same container
VITE_API_URL=/api
```

**Key Points:**
- Uses relative URL `/api` 
- Works because frontend and backend are served from the same Docker container
- Used when building with `npm run build`

### How Vite Uses These:

In `Frontend/src/utils/api.tsx`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

---

## Backend Environment Variables

### Development/Production: `Backend/.env`
```env
PORT=5000
JWT_SECRET=your_jwtsecret
CORS_ORIGIN=*
NODE_ENV=development
ELASTICSEARCH_URL=http://localhost:9200
```

**Key Variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | `5000` | ✅ Matches Docker exposed port |
| `CORS_ORIGIN` | `*` | ✅ Allows all origins (required for Docker/Render) |
| `NODE_ENV` | `development`/`production` | Sets environment mode |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch connection |
| `JWT_SECRET` | `your_jwtsecret` | JWT token signing (change in production!) |

### Production on Render:
Set these in Render Dashboard → Environment Variables:
```env
PORT=5000                          # Usually auto-set by Render
NODE_ENV=production
ELASTICSEARCH_URL=http://localhost:9200
INDEX_ON_START=true               # Optional: index data on first start
```

---

## Docker Deployment

### Build-time Configuration

The `Dockerfile` handles environment variables automatically:

1. **Frontend Build**: Uses `.env.production.local` if available
2. **Backend Runtime**: Uses environment variables from Render or `.env`

### Port Configuration Consistency

| Component | Port | Notes |
|-----------|------|-------|
| Backend Default | `5000` | Fallback in `index.js` |
| Docker Exposed | `5000` | In `Dockerfile: EXPOSE 5000` |
| Health Check | `5000` | In `Dockerfile: HEALTHCHECK` |
| Render Port | `5000` | Set by `PORT` env var |

---

## CORS Configuration

### Why CORS_ORIGIN=* ?

When deploying to Render with Docker:
- Requests go through Render's proxy/load balancer
- Origin might be different from the final domain
- Using `*` ensures maximum compatibility
- The manual CORS headers in `index.js` provide additional protection

### CORS Headers Set:

1. **Manual Headers** (in `Backend/index.js`):
```javascript
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
```

2. **CORS Middleware** (using `cors` package):
```javascript
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: false,
    maxAge: 86400
};
app.use(cors(corsOptions));
```

**Note:** `credentials: false` is required when using `origin: '*'`

---

## Testing the Configuration

### Local Development:

1. **Start Backend:**
```bash
cd Backend
npm start
# Should see: "Server running on port 5000"
```

2. **Start Frontend:**
```bash
cd Frontend
npm run dev
# Should connect to http://localhost:5000/api
```

3. **Test API:**
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Docker Testing:

```bash
# Build and run
docker build -t catalogue-app .
docker run -p 5000:5000 -e NODE_ENV=production catalogue-app

# Test
curl http://localhost:5000/health
curl http://localhost:5000/api/ctable
```

### Production on Render:

```bash
# After deployment
curl https://your-app.onrender.com/health
curl https://your-app.onrender.com/api/ctable
```

---

## Troubleshooting

### Issue: "VITE_API_URL is undefined"
**Solution:** Variable name must start with `VITE_` prefix. Check `.env` file.

### Issue: "Connection refused on port 5004"
**Solution:** Update `Backend/.env` to use `PORT=5000` to match Docker.

### Issue: CORS errors in production
**Solutions:**
1. Verify `CORS_ORIGIN=*` in Backend `.env`
2. Check manual CORS headers are in place in `index.js`
3. Ensure both header mechanisms are working

### Issue: Frontend can't reach backend in Docker
**Solution:** In production, use `VITE_API_URL=/api` (relative URL)

### Issue: Environment variables not updating
**Solutions:**
1. Restart dev server: Stop and run `npm run dev` again
2. Clear build cache: Delete `Frontend/dist` and rebuild
3. Check file name is exactly `.env` (not `.env.txt` or similar)

---

## Environment Variable Priority

### Frontend (Vite):
1. `.env.production.local` (production builds, highest priority)
2. `.env.production` (production builds)
3. `.env.local` (all environments except test)
4. `.env` (all environments, lowest priority)

### Backend (Node.js):
1. Process environment variables (set by OS/Docker/Render)
2. `.env` file (loaded by dotenv if used)
3. Default values in code

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` files to git (already in `.gitignore`)
- Change `JWT_SECRET` in production
- Use strong secrets for production deployments
- Consider using Render's secret management for sensitive values

✅ **Safe to commit:**
- `.env.example` files
- Documentation about environment variables
- Default development values (no secrets)

---

## Quick Reference

### Development (Local):
- Backend runs on: `http://localhost:5000`
- Frontend runs on: `http://localhost:5173` (Vite default)
- API calls go to: `http://localhost:5000/api`

### Production (Docker on Render):
- Everything runs on: Port assigned by Render (usually `10000`)
- Public URL: `https://your-app.onrender.com`
- API calls use relative: `/api`

---

## Summary of Changes Made

✅ **Fixed:**
1. Updated `Frontend/.env`: Changed `REACT_APP_BASE_URL` → `VITE_API_URL=http://localhost:5000/api`
2. Updated `Backend/.env`: Changed `PORT=5004` → `PORT=5000`
3. Updated `Backend/.env`: Changed `CORS_ORIGIN=http://localhost:5174` → `CORS_ORIGIN=*`
4. Updated `Backend/index.js`: Changed default port from `5004` → `5000`
5. Updated `Frontend/src/utils/api.tsx`: Changed fallback port from `5004` → `5000`
6. Added comprehensive CORS headers in `Backend/index.js`
7. Created `Frontend/.env.production.local` with relative API URL

These changes ensure:
- ✅ Port consistency across all configurations
- ✅ Proper Vite environment variable naming
- ✅ CORS working in Docker containers
- ✅ Production deployment compatibility with Render

