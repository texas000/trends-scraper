require('dotenv').config();

const { getTrendingSearchesByCountries } = require('../../lib/trends-scraper');
const { searchMultipleKeywords } = require('../../lib/search-api');
const { initializeDatabase, saveTrends, saveSearchResults } = require('../../lib/db');

/**
 * Vercel Cron Jobs API - 다국어 + DuckDuckGo 검색 지원
 * 매일 오전 9시에 자동 실행
 * 1. Google Trends에서 트렌딩 검색어 수집
 * 2. 각 검색어를 DuckDuckGo에서 검색
 * 3. 모든 데이터를 데이터베이스에 저장
 */
export default async function handler(req, res) {
  // CRON 요청 검증
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[크론 작업 시작]', new Date().toISOString());

  try {
    // 1. 데이터베이스 초기화
    console.log('📊 데이터베이스 초기화 중...');
    await initializeDatabase();

    // 2. 여러 국가의 Google Trends에서 데이터 수집
    console.log('🌍 다국가 트렌드 수집 중...');
    const countries = (process.env.TREND_COUNTRIES || 'KR,US,JP').split(',').map(c => c.trim());
    
    const trendsData = await getTrendingSearchesByCountries(countries);

    if (!trendsData || Object.keys(trendsData).length === 0) {
      console.warn('⚠️  수집된 트렌드가 없습니다');
      return res.status(200).json({
        success: false,
        message: 'No trends data collected',
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

    console.log('[크론 작업 완료]', new Date().toISOString());

    return res.status(200).json({
      success: true,
      message: `완료! 트렌드: ${trendResult.saved}개, 검색 결과: ${searchResult.saved}개`,
      data: {
        trends: {
          saved: trendResult.saved,
          countries: Object.keys(trendsData)
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
    console.error('❌ 크론 작업 실패:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
