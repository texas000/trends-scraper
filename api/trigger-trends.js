require('dotenv').config();

const { getTrendingSearchesByCountries, getSupportedCountries } = require('../lib/trends-scraper');
const { searchMultipleKeywords } = require('../lib/search-api');
const { initializeDatabase, saveTrends, saveSearchResults } = require('../lib/db');

/**
 * 수동으로 크론을 실행하기 위한 엔드포인트 (다국어 + 검색 지원)
 * GET /api/trigger-trends?secret=YOUR_SECRET&countries=KR,US,JP
 * GET /api/trigger-trends?secret=YOUR_SECRET (기본값: KR,US,JP)
 */
module.exports = async function handler(req, res) {
  // 보안: 쿼리 파라미터로 전달된 시크릿 확인
  const secret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET || 'development-secret';

  if (process.env.NODE_ENV === 'production' && secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 요청된 국가 코드 파싱
  const countriesParam = req.query.countries || process.env.TREND_COUNTRIES || 'KR,US,JP';
  const countries = countriesParam.split(',').map(c => c.trim().toUpperCase());

  console.log('[수동 크론 실행 시작]', new Date().toISOString());
  console.log(`🌍 요청된 국가: ${countries.join(', ')}`);

  try {
    // 1. 데이터베이스 초기화
    console.log('📊 데이터베이스 초기화 중...');
    await initializeDatabase();

    // 2. Google Trends에서 다국가 데이터 수집
    console.log('🌍 다국가 트렌드 수집 중...');
    const trendsData = await getTrendingSearchesByCountries(countries);

    if (!trendsData || Object.keys(trendsData).length === 0) {
      console.warn('⚠️  수집된 트렌드가 없습니다');
      return res.status(200).json({
        success: false,
        message: 'No trends data collected',
        requestedCountries: countries,
        timestamp: new Date().toISOString()
      });
    }

    // 모든 국가의 데이터를 평탄화
    const allTrends = [];
    Object.values(trendsData).forEach(countryTrends => {
      allTrends.push(...countryTrends);
    });

    console.log(`📈 총 ${allTrends.length}개 트렌드 수집됨 (${Object.keys(trendsData).length}개 국가)`);

    // 3. 데이터베이스에 트렌드 저장
    console.log('💾 트렌드 데이터 저장 중...');
    const trendResult = await saveTrends(allTrends);
    const trendIds = trendResult.trendIds;

    // 4. 각 검색어를 DuckDuckGo에서 검색
    console.log('🔍 DuckDuckGo에서 검색어 검색 중...');
    const keywords = allTrends.map(t => t.keyword);
    const searchResults = await searchMultipleKeywords(keywords);

    // 국가 정보 추가
    const enrichedSearchResults = searchResults.map((result, index) => ({
      ...result,
      country_code: allTrends[index]?.country_code || null
    }));

    // 5. 검색 결과 저장
    console.log('💾 검색 결과 저장 중...');
    const searchResult = await saveSearchResults(enrichedSearchResults, trendIds);

    console.log('[수동 크론 실행 완료]', new Date().toISOString());

    return res.status(200).json({
      success: true,
      message: `완료! 트렌드: ${trendResult.saved}개, 검색 결과: ${searchResult.saved}개`,
      data: {
        trends: {
          saved: trendResult.saved,
          countries: Object.keys(trendsData),
          details: Object.entries(trendsData).map(([code, trends]) => ({
            country_code: code,
            country_name: trends[0]?.country_name || code,
            language: trends[0]?.language || 'unknown',
            count: trends.length,
            sample: trends.slice(0, 3)
          }))
        },
        search_results: {
          saved: searchResult.saved,
          successful: enrichedSearchResults.filter(r => r.success).length,
          failed: enrichedSearchResults.filter(r => !r.success).length
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 크론 실행 실패:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
