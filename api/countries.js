require('dotenv').config();

const { getSupportedCountries } = require('../lib/trends-scraper');

/**
 * 지원하는 국가 목록 조회 API
 * GET /api/countries
 */
module.exports = async function handler(req, res) {
  try {
    const countries = getSupportedCountries();

    return res.status(200).json({
      success: true,
      total: countries.length,
      countries: countries,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 국가 목록 조회 실패:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
