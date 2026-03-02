require('dotenv').config();

const { runTrendsForCountry } = require('../../lib/run-trends');

/**
 * Per-country cron endpoint
 * Vercel calls this automatically on schedule.
 * Can also be triggered manually:
 *   GET /api/cron/KR?secret=YOUR_SECRET
 */
module.exports = async function handler(req, res) {
  // Auth: Vercel sets x-vercel-cron: 1 on scheduled invocations.
  // For manual calls, fall back to secret query param.
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  if (!isVercelCron) {
    const secret = req.query.secret;
    const cronSecret = process.env.CRON_SECRET || 'development-secret';
    if (process.env.NODE_ENV === 'production' && secret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const countryCode = (req.query.country || '').toUpperCase();
  if (!countryCode) {
    return res.status(400).json({ error: 'Country code required' });
  }

  console.log(`[크론] ${countryCode} 시작`);

  try {
    const result = await runTrendsForCountry(countryCode);
    return res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error(`❌ [크론] ${countryCode} 실패:`, error.message);
    return res.status(500).json({
      success: false,
      country_code: countryCode,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
