# CORS Issue Fix for Docker Deployment on Render

## Changes Made

### 1. Enhanced CORS Configuration
Updated `Backend/index.js` with comprehensive CORS settings:

- **Changed port**: From `5004` to `5000` to match Docker expose port
- **Enhanced CORS headers**: Added all necessary headers including `X-Requested-With`, `Accept`, `Origin`
- **Dual CORS handling**: Both manual headers and `cors` middleware for maximum compatibility
- **Preflight handling**: Explicit handling of OPTIONS requests with 204 status
- **Max age**: Set to 24 hours to reduce preflight requests

### 2. Manual CORS Headers
Added explicit header setting middleware **before** any other middleware:

```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
```

## Why This Fixes the Issue

1. **Port Consistency**: The backend now defaults to port 5000, matching the Docker exposed port
2. **Double CORS Protection**: Both manual headers and cors middleware ensure headers are set
3. **Preflight Support**: Explicit OPTIONS handling prevents preflight request failures
4. **Comprehensive Headers**: All common headers are explicitly allowed

## Deployment Steps for Render

### 1. Rebuild and Deploy
After these changes, redeploy to Render:

```bash
git add Backend/index.js
git commit -m "Fix CORS configuration for Docker deployment"
git push origin main
```

### 2. Verify Environment Variables on Render
Make sure these are set in your Render dashboard:

```
NODE_ENV=production
PORT=5000  # Render sets this automatically, but verify
ELASTICSEARCH_URL=http://localhost:9200
```

### 3. Check Build Logs
Look for these lines in the Render logs:
- "Server running on port 5000"
- "Environment: production"
- "Elasticsearch is ready!"

## Additional Troubleshooting

### If CORS errors persist:

1. **Check the actual error in browser console**:
   - Look for the specific CORS error message
   - Note which header is missing

2. **Verify the request URL**:
   - Ensure frontend is calling the correct backend URL
   - In production, API calls should go to the same domain (no CORS needed)

3. **Check if it's a DNS/routing issue**:
   - Test the API endpoint directly: `https://your-app.onrender.com/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

4. **Browser cache**:
   - Clear browser cache and cookies
   - Try in incognito/private window

5. **Check Render logs**:
   ```bash
   # In Render dashboard, check:
   # - Build logs: Ensure Docker build succeeds
   # - Deploy logs: Ensure service starts
   # - Runtime logs: Look for request logs
   ```

## Testing Locally with Docker

Before deploying, test locally:

```bash
# Build the Docker image
docker build -t catalogue-app .

# Run the container
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  catalogue-app

# Test the API
curl http://localhost:5000/health
curl http://localhost:5000/api/ctable
```

## Frontend Configuration

If your frontend is separate, update the API URL:

**Development** (`Frontend/.env.development`):
```
VITE_API_URL=http://localhost:5000/api
```

**Production** (`Frontend/.env.production`):
```
VITE_API_URL=/api
```

Note: In production with the monolithic Docker setup, frontend and backend are served from the same domain, so relative URLs work best.

## Common CORS Error Messages and Solutions

### "No 'Access-Control-Allow-Origin' header is present"
- **Solution**: Fixed by the manual header middleware

### "CORS preflight did not succeed"
- **Solution**: Fixed by explicit OPTIONS handling

### "Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"
- **Solution**: Set `credentials: false` in CORS options

### "Request header field [X] is not allowed by Access-Control-Allow-Headers"
- **Solution**: Added all common headers to allowedHeaders list

## Still Having Issues?

1. **Share the exact error**: Copy the full error message from browser console
2. **Check network tab**: Look at the failed request headers and response
3. **Verify Docker setup**: Ensure the container is actually running on the expected port
4. **Test without Docker**: Run backend directly with `node index.js` to isolate Docker issues

## Success Indicators

When working correctly, you should see:
- ✅ No CORS errors in browser console
- ✅ API requests succeed in Network tab
- ✅ Response headers include `Access-Control-Allow-Origin: *`
- ✅ OPTIONS requests return 204 status
- ✅ GET/POST requests return expected data

## Final Notes

The combination of manual headers + cors middleware provides redundancy. Even if one method fails, the other should work. This is especially important for Render's environment where proxy servers might interfere with CORS headers.

