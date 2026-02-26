require('dotenv').config();

const { 
  getSearchResultsByKeyword,
  getTrendWithSearchResults
} = require('../../lib/db');

/**
 * 검색 결과 조회 API
 * GET /api/search-results
 * GET /api/search-results?keyword=검색어
 * GET /api/search-results?country=KR
 * GET /api/search-results?keyword=검색어&limit=10
 */
export default async function handler(req, res) {
  try {
    const { keyword = null, country = null, limit = 20 } = req.query;

    if (keyword) {
      // 특정 검색어의 모든 검색 결과 조회
      console.log(`🔍 검색 결과 조회: ${keyword}`);
      const results = await getSearchResultsByKeyword(keyword, parseInt(limit));

      return res.status(200).json({
        success: true,
        type: 'keyword_search',
        keyword: keyword,
        total: results.length,
        data: results,
        timestamp: new Date().toISOString()
      });
    }

    if (country) {
      // 특정 국가의 트렌드와 함께 검색 결과 조회
      console.log(`🌍 국가 검색 결과 조회: ${country}`);
      const results = await getTrendWithSearchResults(country, parseInt(limit));

      return res.status(200).json({
        success: true,
        type: 'country_trends_with_search',
        country: country,
        total: results.length,
        data: results,
        timestamp: new Date().toISOString()
      });
    }

    // 파라미터가 없으면 사용 방법 안내
    return res.status(200).json({
      success: true,
      message: '검색 결과 조회 API',
      usage: {
        'keyword': 'GET /api/search-results?keyword=검색어',
        'country': 'GET /api/search-results?country=KR',
        'limit': 'GET /api/search-results?keyword=검색어&limit=50'
      },
      examples: {
        'keyword': 'GET /api/search-results?keyword=blockchain',
        'country': 'GET /api/search-results?country=US&limit=10',
        'specific': 'GET /api/search-results?keyword=AI&limit=20'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 검색 결과 조회 실패:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
