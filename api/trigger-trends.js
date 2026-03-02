require('dotenv').config();

const { getTrendingSearchesByCountries, SUPPORTED_COUNTRIES } = require('../lib/trends-scraper');
const { runTrendsForCountry } = require('../lib/run-trends');

/**
 * Manual multi-country trigger (for testing/backfill)
 * GET /api/trigger-trends?secret=YOUR_SECRET&countries=KR,US,JP
 */
module.exports = async function handler(req, res) {
  const secret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET || 'development-secret';

  if (process.env.NODE_ENV === 'production' && secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const countriesParam = req.query.countries || process.env.TREND_COUNTRIES || 'KR,US,JP';
  const countries = countriesParam.split(',').map(c => c.trim().toUpperCase())
    .filter(c => SUPPORTED_COUNTRIES[c]);

  console.log('[수동 트리거 시작]', new Date().toISOString());
  console.log(`🌍 국가: ${countries.join(', ')}`);

  const results = [];
  for (const code of countries) {
    try {
      const result = await runTrendsForCountry(code);
      results.push(result);
    } catch (error) {
      console.warn(`⚠️ ${code} 실패 (건너뜀):`, error.message);
      results.push({ country_code: code, error: error.message });
    }
  }

  const succeeded = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  return res.status(200).json({
    success: true,
    message: `완료! ${succeeded.length}개 국가 성공, ${failed.length}개 실패`,
    results,
    timestamp: new Date().toISOString()
  });
};
