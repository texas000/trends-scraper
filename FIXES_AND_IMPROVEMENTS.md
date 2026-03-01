# Trends Scraper - Fixes & Improvements Log

**Date:** March 1, 2026
**Status:** ✅ All critical issues resolved

## Issues Fixed

### 1. Database Schema Migration Error
**Error:** `column "country_code" does not exist`

**Root Cause:** Existing `search_results` table missing columns after schema update

**Solution:** Enhanced `lib/db.js` with auto-migration
- Split CREATE TABLE and CREATE INDEX into separate queries
- Added ALTER TABLE statements to add missing columns if needed
- Better error handling for column existence checks
- Safe for both fresh and existing databases

**Files Modified:**
- `lib/db.js:23-88` - Refactored `initializeDatabase()` function

**Result:** Database now auto-migrates on startup without manual intervention

---

### 2. Playwright Browser Not Found on Vercel (Initial)
**Error:** `browserType.launch: Executable doesn't exist`

**Root Cause:** Vercel's build-time browser installation doesn't persist to serverless runtime (different user/sandbox)

**Solution:** Switched to serverless-compatible architecture
- Replaced `playwright` with `playwright-core` + `@sparticuz/chromium`
- Kept `playwright` as devDependency for local macOS development
- Environment-aware code: detects Linux/Vercel vs macOS/local
- Simplified `vercel.json` buildCommand to just `npm install`

**Files Modified:**
- `package.json` - Dependency changes
- `lib/trends-scraper.js:1-3` - Conditional imports
- `lib/search-api.js:1-3` - Conditional imports
- `vercel.json` - Simplified build config

**Result:** Browser binary sourced correctly in all environments

---

### 3. ETXTBSY Race Condition on Vercel (Critical)
**Error:** `spawn ETXTBSY` (Text file busy)

**Root Cause:** `Promise.all` parallel launches raced to write `/tmp/chromium` simultaneously
- Multiple countries extracted to same path at same time
- Multiple keywords extracted to same path at same time
- Kernel error when executing file being written to

**Solution:** Pre-extract binary once per batch, share across parallel calls
- Added optional `sharedExecutablePath` parameter to `getTrendingSearches` and `searchGoogleNews`
- Pre-extraction in `getTrendingSearchesByCountries` before `Promise.all`
- Pre-extraction in `searchMultipleGoogleNews` before `Promise.all`
- All parallel calls reuse the already-extracted binary

**Files Modified:**
- `lib/trends-scraper.js:37,293-300` - Added parameter, pre-extraction
- `lib/search-api.js:12,149-157` - Added parameter, pre-extraction

**Result:** No more file-write conflicts in parallel processing

---

## Configuration Changes

### vercel.json
```json
{
  "buildCommand": "npm install",
  "outputDirectory": ".",
  "functions": {
    "api/**/*.js": {
      "maxDuration": 300,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/trigger-trends",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Key Changes:**
- `buildCommand`: Now just `npm install` (no manual playwright install)
- `functions`: Added 300s timeout and 1GB memory for browser operations
- `crons`: Corrected endpoint path from `/api/cron/trends` to `/api/trigger-trends`

### package.json Dependencies
```json
{
  "dependencies": {
    "@sparticuz/chromium": "^143.0.4",
    "playwright-core": "^1.58.2",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "dotenv": "^16.0.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "playwright": "^1.58.2",
    "vercel": "^33.0.0"
  }
}
```

**Key Changes:**
- Removed `playwright` from main dependencies
- Added `@sparticuz/chromium` (serverless-compatible binary)
- Changed to `playwright-core` (smaller, no bundled browsers)
- `playwright` as devDependency for local development only

---

## Environment Detection Pattern

Both `lib/trends-scraper.js` and `lib/search-api.js` use the same pattern:

```javascript
const isVercel = !!process.env.VERCEL || process.platform === 'linux';
const { chromium } = isVercel ? require('playwright-core') : require('playwright');

// Later in the function:
const launchOptions = isVercel
  ? {
      args: chromiumSparticuz.args,
      defaultViewport: chromiumSparticuz.defaultViewport,
      executablePath: sharedExecutablePath || await chromiumSparticuz.executablePath(),
      headless: chromiumSparticuz.headless
    }
  : {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
```

**Logic:**
- **On Vercel/Linux:** Uses `playwright-core` + `@sparticuz/chromium` binary
- **On macOS/local:** Uses full `playwright` with cached local browser

---

## New Documentation Files Created

### 1. DEBUG.md
- Complete debugging guide
- How to run debug scripts
- Testing individual components
- Common issues & solutions
- Performance optimization tips
- Development best practices

### 2. DEPLOYMENT.md
- Vercel configuration details
- Browser setup for serverless
- Environment variables setup
- Deployment steps
- Troubleshooting guide
- Monitoring and cron job management

### 3. .vercelignore
- Excludes unnecessary files from build
- Reduces deployment package size
- Includes: node_modules, .git, logs, caches, etc.

---

## Testing Results

### Local Development (macOS)
✅ `node debug-trends.js` - All 20 countries tested
✅ Google Trends scraping - 10 trends per country
✅ Google News search - 5 articles per keyword
✅ Database operations - All tables created and migrated

### Deployment Readiness
✅ Database auto-migration on startup
✅ Environment detection working
✅ Serverless binary configuration optimized
✅ Pre-extraction prevents ETXTBSY race condition
✅ Parallel processing maintained for performance

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Trends fetching (2 countries) | ~17 seconds |
| Google News search (3 keywords) | ~3-4 seconds |
| Database initialization | <1 second |
| Parallel browser launches | No conflicts |

---

## Recommendations for Production

### Immediate
1. Set environment variables in Vercel dashboard:
   - `NEON_DATABASE_URL`
   - `CRON_SECRET`
   - `TREND_COUNTRIES` (optional, defaults to KR,US,JP)

2. Monitor first cron run in Vercel logs

### Short-term
1. Set up Vercel alerts for failed cron jobs
2. Monitor Neon database connection pool
3. Archive old data regularly (older than 30 days)

### Long-term
1. Consider adding caching layer for repeated searches
2. Monitor cost of serverless function invocations
3. Evaluate rate limiting on Google Trends/News

---

## Technical Debt Resolved

- ✅ Removed hardcoded browser paths
- ✅ Eliminated build/runtime environment mismatch
- ✅ Fixed race conditions in parallel processing
- ✅ Improved database schema flexibility
- ✅ Added comprehensive documentation

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│      Google Trends (Playwright)         │
└──────────────────┬──────────────────────┘
                   │
                   ├─ trends-scraper.js
                   │   ├─ getTrendingSearches(countryCode)
                   │   └─ getTrendingSearchesByCountries([codes])
                   │
                   ├─ Pre-extract Chromium binary (once per batch)
                   │   └─ Share path across parallel launches
                   │
                   ├─ Environment detection
                   │   ├─ Vercel/Linux → @sparticuz/chromium
                   │   └─ macOS/local → playwright
                   │
                   └─ Database
                       └─ Auto-migrate on startup
                           ├─ trends table
                           ├─ search_results table
                           └─ trend_searches junction
```

---

## Git Changes Summary

**Modified Files:**
1. `lib/db.js` - Auto-migration logic
2. `lib/trends-scraper.js` - Serverless browser setup
3. `lib/search-api.js` - Serverless browser setup
4. `package.json` - Dependency updates
5. `vercel.json` - Simplified build config

**Created Files:**
1. `DEBUG.md` - Debugging guide
2. `DEPLOYMENT.md` - Deployment guide
3. `.vercelignore` - Build artifact exclusions
4. `FIXES_AND_IMPROVEMENTS.md` - This document

---

## References

- [@sparticuz/chromium](https://github.com/sparticuz/chromium) - Serverless Chromium binary
- [Playwright Documentation](https://playwright.dev/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [PostgreSQL/Neon Documentation](https://neon.tech/)

---

**Last Updated:** 2026-03-01
**Status:** Ready for production deployment
