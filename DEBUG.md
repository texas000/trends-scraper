# Debugging Guide

This guide covers how to debug and troubleshoot the Trends Scraper application.

## Prerequisites

Ensure you have:
- Node.js 24.x installed
- PostgreSQL/Neon database configured
- Environment variables set up (`.env` file)

## Environment Setup

1. **Create `.env` file with required variables:**
```
NEON_DATABASE_URL=postgresql://user:password@host/database
CRON_SECRET=your-secret-key
TREND_COUNTRIES=KR,US,JP
NODE_ENV=development
```

2. **Install dependencies:**
```bash
npm install
```

## Running Debug Scripts

### 1. Full Debug Test (`debug-trends.js`)

Tests the complete flow: Google Trends → Google News → Database

```bash
node debug-trends.js
```

**What it does:**
- Fetches trending keywords from Google Trends (US, JP)
- Searches Google News for each keyword
- Saves results to database
- Displays results in formatted output

**Expected output:**
```
✅ Debug test completed successfully!
```

**Troubleshooting:**
- If Playwright times out: Browser may be blocked or network is slow
- If Google News search returns no articles: Try different keywords or wait before retrying
- If database save fails: Check `NEON_DATABASE_URL` and network connectivity

### 2. Test API Endpoint Locally

```bash
npm run dev
```

Then in another terminal:
```bash
curl "http://localhost:3000/api/trigger-trends?secret=development-secret"
```

**Expected response:**
```json
{
  "success": true,
  "message": "완료! 트렌드: X개, 검색 결과: Y개",
  "data": { ... }
}
```

## Debugging Individual Components

### Testing Google Trends Scraper

Create a test script `test-trends.js`:
```javascript
const { getTrendingSearchesByCountries, SUPPORTED_COUNTRIES } = require('./lib/trends-scraper');

(async () => {
  const trends = await getTrendingSearchesByCountries(['US']);
  console.log(JSON.stringify(trends, null, 2));
})();
```

Run it:
```bash
node test-trends.js
```

### Testing Google News Search

Create a test script `test-news.js`:
```javascript
const { searchMultipleGoogleNews } = require('./lib/search-api');

(async () => {
  const results = await searchMultipleGoogleNews(
    ['artificial intelligence', 'climate change'],
    'en',
    'US'
  );
  console.log(JSON.stringify(results, null, 2));
})();
```

Run it:
```bash
node test-news.js
```

### Testing Database Connection

Create a test script `test-db.js`:
```javascript
require('dotenv').config();
const { getPool, initializeDatabase, getTrendsByCountry } = require('./lib/db');

(async () => {
  try {
    console.log('🔌 Initializing database...');
    await initializeDatabase();

    console.log('📊 Fetching recent trends from KR...');
    const trends = await getTrendsByCountry('KR', 5);
    console.log('Recent trends:', trends);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
```

Run it:
```bash
node test-db.js
```

## Common Issues & Solutions

### 1. Playwright Browser Executable Not Found
**Error:** `browserType.launch: Executable doesn't exist at /home/...chrome-headless-shell`

**Solution:**
```bash
npx playwright install
```

This downloads the required browser binaries. The project now has a `postinstall` script in `package.json` that will automatically run this whenever you do `npm install`.

**For deployment:**
- Ensure `npm install` runs before starting the server
- Or run `npx playwright install` in your build process
- The postinstall script handles this automatically

### 2. Database Column Not Found Error
**Error:** `"column \"country_code\" does not exist"`

**Solution:**
- The database migration will auto-run when you call `initializeDatabase()`
- Delete the existing `search_results` table and let it be recreated:
  ```bash
  npx psql $NEON_DATABASE_URL -c "DROP TABLE IF EXISTS search_results CASCADE;"
  ```
- Then run the debug script again

### 2. Playwright Timeout
**Error:** `Timeout waiting for locator`

**Solution:**
- Increase timeout in `lib/search-api.js`:
  ```javascript
  await page.waitForSelector('main a[href*="/read/"]', { timeout: 30000 });
  ```
- Check internet connection
- Try running with `NODE_ENV=development` for verbose logging

### 3. Google News Returns No Articles
**Possible causes:**
- Google blocking requests (rate limiting)
- Invalid country/language combination
- Search query too specific

**Solution:**
- Wait a few minutes before retrying
- Use different keywords
- Check supported country codes in `lib/trends-scraper.js`:
  ```javascript
  const SUPPORTED_COUNTRIES = { ... }
  ```

### 4. Database Connection Failed
**Error:** `connect ENOTFOUND` or connection timeout

**Solution:**
- Verify `NEON_DATABASE_URL` is correct
- Test connection directly:
  ```bash
  psql $NEON_DATABASE_URL -c "SELECT 1;"
  ```
- Check if Neon database is running
- Verify network allows PostgreSQL connections

### 5. Google Trends Returns Empty Results
**Error:** No keywords fetched from Google Trends

**Solution:**
- Check if country code is valid (use `SUPPORTED_COUNTRIES` keys)
- Try different countries
- Add more detailed logging in `lib/trends-scraper.js`:
  ```javascript
  console.log('Fetching from:', url);
  console.log('Page content:', await page.content());
  ```

## Logging & Monitoring

### Enable Verbose Logging

Set environment variable:
```bash
DEBUG=trends-scraper:* node debug-trends.js
```

Or modify scripts to add console.logs:
```javascript
console.log('[DEBUG] Fetching trends for:', countryCode);
console.log('[DEBUG] Search results:', results);
```

### Check Database State

Connect to Neon database:
```bash
psql $NEON_DATABASE_URL
```

Useful queries:
```sql
-- View trends table
SELECT country_code, COUNT(*) as count FROM trends GROUP BY country_code;

-- View search results
SELECT keyword, success, result_count FROM search_results ORDER BY searched_at DESC LIMIT 10;

-- Check table structure
\d search_results
\d trends

-- Clear old data (if needed)
DELETE FROM search_results WHERE searched_at < NOW() - INTERVAL '7 days';
DELETE FROM trends WHERE saved_at < NOW() - INTERVAL '7 days';
```

## Performance Optimization

### Reduce Execution Time

1. **Limit countries:**
```bash
node debug-trends.js
# Only tests US and JP (fast)
```

2. **Limit keywords per country:**
Edit `debug-trends.js`:
```javascript
const keywords = countryTrends.slice(0, 3); // Only first 3 keywords
```

3. **Set shorter timeouts:**
```javascript
const { searchMultipleGoogleNews } = require('./lib/search-api');
// Already optimized for speed
```

### Batch Processing

For multiple countries, process sequentially to avoid rate limiting:
```javascript
for (const country of countries) {
  const results = await searchMultipleGoogleNews(keywords, lang, country);
  await new Promise(r => setTimeout(r, 2000)); // 2s delay between countries
}
```

## Testing Checklist

Before deploying:
- [ ] `node debug-trends.js` completes successfully
- [ ] Database contains new trends and search results
- [ ] API endpoint returns 200 status
- [ ] No console errors in logs
- [ ] Articles have valid URLs
- [ ] All supported countries work

## Getting Help

1. **Check logs:**
```bash
npm run dev 2>&1 | tee debug.log
```

2. **Add breakpoints:**
```javascript
debugger; // Add to code, then run with: node --inspect-brk debug-trends.js
```

3. **Check network in browser DevTools:**
- Google Trends and Google News requests should complete
- No 403/429 errors (rate limiting)

4. **Database inspection:**
```bash
psql $NEON_DATABASE_URL -c "SELECT * FROM search_results LIMIT 1\gx"
```

## Development Tips

- Use `NODE_ENV=development` to disable secret validation
- Enable verbose logging by adding `console.log()` statements
- Test with single countries first before running all
- Use `--inspect` for debugging with Chrome DevTools
- Monitor database growth with: `SELECT pg_size_pretty(pg_total_relation_size('search_results'));`
