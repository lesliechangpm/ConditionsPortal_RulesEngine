# Deployment Guide - Loan Conditions Rules Engine

## 🚀 Quick Deploy Options

### Option 1: Render (Recommended - Free)

1. **Sign up at [render.com](https://render.com)**
2. **Connect your GitHub repository**
3. **Create a new Web Service**
   - Repository: `https://github.com/lesliechangpm/ConditionsPortal_RulesEngine`
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: `Free`

4. **Environment Variables** (Optional):
   ```
   NODE_ENV=production
   PORT=10000
   MAX_FILE_SIZE_MB=50
   ALLOWED_ORIGINS=https://lesliechangpm.github.io,http://localhost:3000
   ```

5. **Deploy**: Click "Create Web Service"

Your backend will be available at: `https://your-service-name.onrender.com`

### Option 2: Railway

1. **Sign up at [railway.app](https://railway.app)**
2. **New Project → Deploy from GitHub repo**
3. **Select your repository**
4. **Railway will auto-detect Node.js and deploy**

Your backend will be available at: `https://your-app.railway.app`

### Option 3: Docker Deployment

```bash
# Build the image
docker build -t loan-conditions-engine .

# Run the container
docker run -p 3000:3000 -e NODE_ENV=production loan-conditions-engine
```

## 📝 After Backend Deployment

### Step 1: Update Frontend API URL

Once your backend is deployed, update the API URL in your GitHub Pages frontend:

1. **Edit** `docs/index.html`
2. **Find line ~209**: `const API_BASE_URL = 'http://localhost:3000';`
3. **Replace with your backend URL**: 
   ```javascript
   const API_BASE_URL = 'https://your-backend-url.onrender.com'; // or railway.app, etc.
   ```
4. **Commit and push** the change

### Step 2: Test Your Deployment

1. **Visit your GitHub Pages site**: `https://lesliechangpm.github.io/ConditionsPortal_RulesEngine/`
2. **Try uploading a demo file** or use one of the demo buttons
3. **Verify conditions are evaluated** and results display correctly

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` for production |
| `PORT` | `3000` | Port the server runs on |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size |
| `ALLOWED_ORIGINS` | `localhost` | CORS allowed origins (comma-separated) |

### CORS Configuration

The backend is pre-configured to allow:
- `https://lesliechangpm.github.io` (your GitHub Pages site)
- `http://localhost:3000` and `http://localhost:3001` (local development)

To add more origins, set the `ALLOWED_ORIGINS` environment variable:
```
ALLOWED_ORIGINS=https://lesliechangpm.github.io,https://your-custom-domain.com
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend health endpoint responds: `GET https://your-backend/health`
- [ ] API documentation loads: `GET https://your-backend/api`
- [ ] File upload works: `POST https://your-backend/api/loans/evaluate`
- [ ] Demo files load: `GET https://your-backend/demo-files/comprehensive-va-test.xml`
- [ ] Frontend connects to backend successfully
- [ ] CORS headers allow GitHub Pages requests

## 📊 Current Test Coverage

Your deployment includes:
- ✅ **89.8% condition coverage** (44/49 conditions)
- ✅ **8 comprehensive test files**
- ✅ **All major loan scenarios** (VA, FHA, USDA, Conventional)
- ✅ **TypeScript compilation** with no errors
- ✅ **Production-ready configuration**

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `ALLOWED_ORIGINS` includes your GitHub Pages URL
2. **File Upload Fails**: Check `MAX_FILE_SIZE_MB` setting
3. **Demo Files Not Loading**: Verify `test-files` directory is included in deployment
4. **Health Check Fails**: Ensure `/health` endpoint is accessible

### Logs and Debugging

Most platforms provide logs access:
- **Render**: View logs in dashboard
- **Railway**: Use `railway logs` command
- **Docker**: Use `docker logs container-name`

## 🎉 Success!

Once deployed, you'll have:
- **Professional frontend** at your GitHub Pages URL
- **Scalable backend** processing MISMO XML files
- **Complete rules engine** with 89.8% test coverage
- **Demo functionality** with real loan scenarios