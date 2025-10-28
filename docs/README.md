# Loan Conditions Rules Engine - Static Frontend

This is the static frontend for the Loan Conditions Rules Engine, designed to be deployed on GitHub Pages.

## Features

- **File Upload Interface**: Upload MISMO XML files for evaluation
- **Demo Files**: Pre-built test files to demonstrate the rules engine
- **Real-time Results**: View detailed condition evaluation results
- **Comprehensive Stats**: See breakdown by condition stages (PTD, PTF, POST)

## Deployment Status

✅ **89.8% Test Coverage** - 44 out of 49 loan conditions successfully tested
✅ **8 Comprehensive Test Files** covering all major loan scenarios
✅ **TypeScript Compilation** - No errors, ready for production

## Backend Requirement

**Important**: This frontend requires the Node.js backend to be deployed and running. The backend API must be accessible for the frontend to work.

### Backend Deployment Options

1. **Render** (Recommended) - Free Node.js hosting at `render.com`
2. **Railway** - Free tier available at `railway.app`  
3. **Cyclic** - Serverless Node.js at `cyclic.sh`
4. **Heroku** - Popular platform (paid)
5. **Vercel** - Serverless functions

### Configuration

Update the `API_BASE_URL` in `index.html` to point to your deployed backend:

```javascript
const API_BASE_URL = 'https://your-backend-url.com'; // Replace with your backend URL
```

## Test Files Available

- **VA Comprehensive Test**: VA loan with bankruptcy, REO, new construction
- **FHA Self-Employed**: FHA loan with self-employment scenarios  
- **Conventional High LTV**: Conventional loan with LTV > 80%
- **Missing Conditions Test**: FHA refinance with special conditions

## Rules Engine Coverage

The system successfully evaluates **44 out of 49** loan conditions across:

- ✅ Application conditions (APP100, APP102, APP108)
- ✅ Asset conditions (ASSET500, ASSET507) 
- ✅ Closing conditions (CLSNG827, CLSNG890)
- ✅ Credit conditions (CRED301, CRED305, CRED308, etc.)
- ✅ Income conditions (INC400-INC423, INC4xx)
- ✅ New construction conditions (NEW CONST1400, 1404, 1405, etc.)
- ✅ Property conditions (PROP601, PROP603, PROP617)
- ✅ Title conditions (TITLE901, TITLE908)

## Usage

1. Deploy your backend to a Node.js hosting platform
2. Update the `API_BASE_URL` in `index.html`
3. Enable GitHub Pages from the `docs` folder
4. Access your deployed frontend and start testing!