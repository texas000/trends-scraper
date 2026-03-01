# Local Debugging Guide

This guide explains how to test and debug the trends-scraper app locally.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Make sure you have a `.env.local` file with:
```env
NEON_DATABASE_URL=postgresql://user:password@ep-your-project.neon.tech/dbname
CRON_SECRET=your-secret-key-here
TREND_COUNTRIES=KR,US,JP
```

## Debugging Commands

### Test Google Trends Scraping Only
Test if the Google Trends API is working without needing a database:

```bash
npm run debug:trends
```

**Options:**
```bash
# Test specific countries
node debug-trends.js KR US JP

# Test single country
node debug-trends.js US

# Test all with defaults (KR, US, JP)
npm run debug:trends
```

**What it does:**
- ✅ Shows all supported countries
- ✅ Fetches real-time trends from Google
- ✅ Tests DuckDuckGo search for the fetched keywords
- ⏱️ Displays timing information
- 📊 Shows sample results

**Expected output:**
```
✓ Supported countries: KR, US, JP, ...
🌍 Fetching trends from Google...
✓ South Korea - 10 trends
  #1 AI
  #2 Weather
  ...
🔍 Testing DuckDuckGo search...
✓ Search completed in 0.5s
```

### Test API Endpoints (No Database)
Test the API endpoints without a database:

```bash
npm run test:api
```

**What it does:**
- Tests `/api/countries` endpoint
- Tests `/api/trends` endpoint
- Tests `/api/search-results` endpoint

**Note:** These tests use mock requests and responses, so database queries will fail gracefully.

### Run Full Development Server
For full testing with database integration:

```bash
npm run dev
```

This starts the Vercel development server with:
- Hot reload support
- Full API access
- Database connectivity
- Same environment as production

Then access the APIs at:
- http://localhost:3000/api/countries
- http://localhost:3000/api/trends
- http://localhost:3000/api/trigger-trends?secret=development-secret

## Common Issues & Solutions

### 1. "Unable to parse - See API response"
**Problem:** Google Trends API is returning HTML instead of JSON or no data.

**Solutions:**
- The app now includes a fallback to sample data
- Check your internet connection
- Google may be rate-limiting requests
- Try again later

**Debug:**
```bash
node debug-trends.js KR
```

Look for messages like:
- `✓ Trends fetched` = Working
- `⚠️ Google Trends API error` = API unavailable, using sample data
- `❌ Error` = Connection issue

### 2. "Cannot find module '../../lib/trends-scraper'"
**Problem:** Module paths are incorrect (should be fixed now).

**Solution:** Already fixed! Paths now use `../lib/` instead of `../../lib/`

### 3. Database Connection Errors
**Problem:** Database is not configured or not accessible.

**Solution:**
- Configure `NEON_DATABASE_URL` in `.env.local`
- For testing without database, use `npm run debug:trends` instead

### 4. Timeout Errors
**Problem:** API requests are taking too long.

**Solutions:**
- Check internet connection
- Try a different country
- Increase timeout (currently 15 seconds)

## Testing Workflow

### 1. Quick Test (No Database)
```bash
npm run debug:trends KR
```
Fastest way to verify scraping works.

### 2. Full Test (With Database)
```bash
npm run dev
# Then in another terminal:
curl "http://localhost:3000/api/trigger-trends?secret=development-secret&countries=KR"
```

### 3. Test Specific Feature
Edit `debug-trends.js` or `test-api.js` to focus on what you want to test.

## What Each Component Does

### debug-trends.js
- Tests Google Trends scraping
- Tests DuckDuckGo search
- Shows real-time results
- No database required

### test-api.js
- Tests API endpoint structure
- Shows mock request/response
- No database required
- No Google Trends fetching

### lib/trends-scraper.js
- Fetches trending keywords from Google
- Uses axios with proper headers
- Includes fallback sample data
- Supports 20+ countries

### lib/search-api.js
- Searches DuckDuckGo for keywords
- Returns abstract, images, related searches
- Handles failures gracefully

### lib/db.js
- Saves trends and search results to PostgreSQL
- Creates/manages database schema
- Requires NEON_DATABASE_URL configured

## Tips for Debugging

1. **Add console.logs** to track execution flow
2. **Use the debug scripts** before testing with database
3. **Check network requests** in your browser DevTools
4. **Test with one country first** (KR is good)
5. **Look at the error messages** - they usually explain what went wrong

## Performance Expectations

- Google Trends fetch: 1-3 seconds per country
- DuckDuckGo search: 0.1-0.5 seconds per keyword
- Database save: 1-2 seconds for 30 keywords + 30 searches

## Production Notes

When deploying to Vercel:
1. Set environment variables in Vercel project settings
2. The app uses serverless functions (no long-running processes)
3. Cron jobs run automatically on schedule (configured in `vercel.json`)
4. Monitor logs in Vercel dashboard: https://vercel.com/dashboard

Check Vercel logs for any "Unable to parse" errors and the cron job execution status.
