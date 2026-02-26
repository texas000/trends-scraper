require('dotenv').config();

const {
  getRecentTrends,
  getTodayTrends,
  getTrendsByCountry,
  getRecentTrendsByAllCountries
} = require('../lib/db');

/**
 * 저장된 트렌드 조회 API (다국어 지원)
 * GET /api/trends
 * GET /api/trends?country=KR
 * GET /api/trends?country=US
 * GET /api/trends?period=today
 * GET /api/trends?period=today&country=JP
 * GET /api/trends?limit=50
 */
module.exports = async function handler(req, res) {
  try {
    const { country = null, period = 'recent', limit = 20 } = req.query;

    let trends;
    let metadata = {};
    
    if (period === 'today') {
      console.log(`📅 ${country ? `[${country}] ` : ''}오늘의 트렌드 조회 중...`);
      
      if (country) {
        trends = await getTrendsByCountry(country, parseInt(limit));
        metadata.period = 'today';
        metadata.country = country.toUpperCase();
      } else {
        trends = await getTodayTrends();
        metadata.period = 'today';
      }
    } else {
      console.log(`📊 ${country ? `[${country}] ` : ''}최근 ${limit}개 트렌드 조회 중...`);
      
      if (country) {
        trends = await getTrendsByCountry(country, parseInt(limit));
        metadata.period = 'recent';
        metadata.country = country.toUpperCase();
      } else {
        const allTrends = await getRecentTrendsByAllCountries(parseInt(limit));
        
        // 국가별로 그룹화하여 반환
        const grouped = {};
        Object.entries(allTrends).forEach(([code, countryData]) => {
          grouped[code] = {
            country_code: countryData.country_code,
            country_name: countryData.country_name,
            language: countryData.language,
            trends: countryData.trends.slice(0, 10) // 국가당 최대 10개
          };
        });

        return res.status(200).json({
          success: true,
          period: 'recent',
          countries: Object.keys(grouped),
          total_records: Object.values(grouped).reduce((sum, c) => sum + c.trends.length, 0),
          data: grouped,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 국가별 그룹화
    const grouped = {};
    trends.forEach(trend => {
      const countryCode = trend.country_code || 'UNKNOWN';
      if (!grouped[countryCode]) {
        grouped[countryCode] = {
          country_code: countryCode,
          country_name: trend.country_name || countryCode,
          language: trend.language || 'unknown',
          trends: []
        };
      }
      grouped[countryCode].trends.push({
        keyword: trend.keyword,
        rank: trend.rank,
        saved_at: trend.saved_at,
        trend_value: trend.trend_value
      });
    });

    return res.status(200).json({
      success: true,
      period: period,
      countries: Object.keys(grouped),
      total_records: trends.length,
      data: grouped,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 트렌드 조회 실패:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
