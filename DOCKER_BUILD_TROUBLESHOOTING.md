# Docker Build Troubleshooting

## SSL Error During npm install

If you're getting `ERR_SSL_CIPHER_OPERATION_FAILED` errors, try these solutions:

### Solution 1: Use docker-compose (Recommended for Local Testing)

The docker-compose.yml already works locally. Use it instead:

```bash
docker-compose up --build
```

This uses the existing working setup.

### Solution 2: Fix Docker SSL Issues

The SSL error is often caused by Docker Desktop's network configuration. Try:

1. **Restart Docker Desktop**
2. **Reset Docker to factory defaults** (if needed)
3. **Use a different network**: 
   ```bash
   docker build --network=host -t catalogue-app .
   ```

### Solution 3: Use Pre-built Images

If building is problematic, you can:
1. Build frontend separately
2. Build backend separately  
3. Combine them

### Solution 4: Alternative Dockerfile

If SSL issues persist, we can:
- Use yarn instead of npm
- Use a different base image
- Add more SSL workarounds

---

## Current Status

✅ Frontend build: **Working**  
❌ Backend npm install: **SSL error**  
⏳ Elasticsearch: **Not tested yet**

---

## Quick Test with docker-compose

Since docker-compose.yml already works, test with:

```bash
# Stop any running containers
docker-compose down

# Build and run
docker-compose up --build
```

This will:
- Build frontend
- Build backend  
- Start Elasticsearch
- Start all services

Then test:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Elasticsearch: http://localhost:9200

---

## For Render Deployment

The SSL error might not occur on Render's build servers. You can:
1. Push to GitHub
2. Deploy on Render
3. Render will build it (might not have SSL issues)

Or we can optimize the Dockerfile further for Render's environment.

