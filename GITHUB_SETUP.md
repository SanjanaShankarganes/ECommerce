# GitHub Setup Instructions

Your repository has been initialized and committed locally. Follow these steps to push to GitHub:

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Repository name**: `catalogue-app` (or your preferred name)
   - **Description**: "Product catalogue with Elasticsearch search, infinite scroll, and React"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

## Step 2: Connect and Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main
```

Or if you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## Step 3: Verify

1. Go to your GitHub repository page
2. Verify all files are uploaded
3. Check that sensitive files (like .env) are NOT in the repository

## Important Notes

⚠️ **Database Files**: The `Backend/categories.db` file is currently in the repository. For production, consider:
- Using environment variables for database paths
- Migrating to PostgreSQL
- Adding database files to .gitignore for future commits

⚠️ **Environment Variables**: Make sure `.env` files are in `.gitignore` (they should be)

⚠️ **Node Modules**: Should be excluded (check .gitignore)

## Next Steps After Pushing

1. **Set up Render deployment** using the instructions in `RENDER_DEPLOYMENT.md`
2. **Add environment variables** in Render dashboard
3. **Deploy backend and frontend** services

## Quick Commands Reference

```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull
```

