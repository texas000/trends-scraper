# Deployment Guide - Vercel

This guide covers deploying the Trends Scraper to Vercel with Playwright support.

## Vercel Configuration

### `vercel.json` Settings

The project is configured with:
- **Build Command:** `npm install && npx playwright install --with-deps`
  - Installs Node dependencies
  - Downloads Playwright browsers for Linux environment
  - `--with-deps` flag installs required system dependencies for Chromium
  
- **Function Configuration:**
  - `maxDuration: 300s` - Allows up to 5 minutes for long-running operations
  - `memory: 1024MB` - Allocates 1GB RAM for browser operations

- **Cron Job:** Runs `/api/trigger-trends` daily at 9:00 AM UTC

## Browser Configuration (Vercel Compatibility)

Both `lib/trends-scraper.js` and `lib/search-api.js` launch Chromium with Vercel-specific flags:

```javascript
browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',              // Disable sandbox for serverless
    '--disable-setuid-sandbox',  // Additional sandbox disable
    '--disable-dev-shm-usage',   // Use disk instead of /dev/shm
    '--single-process'           // Single process mode for stability
  ]
});
```

These flags are essential for running Chromium in Vercel's serverless environment.

## Environment Variables

Set these in Vercel dashboard:
```
NEON_DATABASE_URL=postgresql://...
CRON_SECRET=your-secret-key
TREND_COUNTRIES=KR,US,JP
NODE_ENV=production
```

## Deployment Steps

1. Connect Repository: `vercel link`
2. Deploy: `vercel deploy` or push to git
3. Set environment variables in Vercel dashboard
4. Monitor logs: `vercel logs`

## Troubleshooting

### Browser Executable Not Found

**Solution:**
- Ensure `vercel.json` has correct buildCommand with `--with-deps`
- Check Vercel build logs for installation errors
- Redeploy to trigger fresh build

### Memory Issues

- Increase `memory` in `vercel.json` (max 3008MB)
- Reduce number of countries processed per run

### Timeout Issues

- Increase `maxDuration` (max 900s for Pro plan)
- Process fewer keywords per run
- Add delays between country processing

## Monitoring

- Check Vercel dashboard for Function metrics
- Monitor Neon database connections
- Archive old data regularly
