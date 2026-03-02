const { getTrendingSearches, SUPPORTED_COUNTRIES } = require('./trends-scraper');
const { searchMultipleGoogleNews } = require('./search-api');
const { initializeDatabase, saveTrends, saveSearchResults } = require('./db');

// Weather-related terms across all 20 supported languages
const WEATHER_TERMS = [
  // English
  'weather', 'forecast', 'rain', 'snow', 'storm', 'temperature', 'humidity',
  'wind', 'fog', 'haze', 'hurricane', 'typhoon', 'tornado', 'sunshine', 'sunny',
  'cloudy', 'thunder', 'lightning', 'blizzard', 'heatwave',
  // Korean (날씨)
  '날씨', '기온', '강수', '강우', '태풍', '폭풍', '폭설', '황사', '미세먼지', '기상', '일기예보', '한파', '폭염',
  // Japanese (天気)
  '天気', '気温', '降水', '台風', '大雨', '大雪', '気象', '天候',
  // Chinese (天气)
  '天气', '气温', '降水', '台风', '暴雨', '大雪', '气象',
  // German
  'wetter', 'regen', 'schnee', 'sturm', 'temperatur', 'gewitter', 'frost',
  // French
  'météo', 'meteo', 'pluie', 'neige', 'tempête', 'orage', 'brouillard',
  // Spanish
  'clima', 'lluvia', 'nieve', 'tormenta', 'huracán', 'huracan', 'niebla',
  // Italian
  'pioggia', 'neve', 'tempesta', 'uragano', 'nebbia',
  // Portuguese
  'chuva', 'tempestade', 'furacão', 'furacao', 'neblina',
  // Dutch
  'weer', 'onweer', 'mist',
  // Russian
  'погода', 'температура', 'дождь', 'снег', 'шторм', 'ураган',
  // Hindi
  'मौसम', 'बारिश', 'बर्फ', 'तूफान', 'तापमान',
  // Thai
  'อากาศ', 'ฝน', 'หิมะ', 'พายุ', 'อุณหภูมิ',
];

const WEATHER_REGEX = new RegExp(
  WEATHER_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

function isWeatherKeyword(keyword) {
  return WEATHER_REGEX.test(keyword);
}

/**
 * 단일 국가에 대해 트렌드 수집 → 뉴스 검색 → DB 저장 전체 파이프라인 실행
 * @param {string} countryCode - 국가 코드 (예: KR, US, JP)
 * @returns {Promise<object>} 결과 요약
 */
async function runTrendsForCountry(countryCode) {
  const code = countryCode.trim().toUpperCase();

  if (!SUPPORTED_COUNTRIES[code]) {
    throw new Error(`지원하지 않는 국가 코드: ${code}`);
  }

  const countryInfo = SUPPORTED_COUNTRIES[code];
  console.log(`\n[${code}] 시작 ${new Date().toISOString()}`);

  // 1. DB 초기화 (마이그레이션 포함)
  await initializeDatabase();

  // 2. Google Trends 수집
  const rawTrends = await getTrendingSearches(code);

  // 3. 날씨 키워드 필터
  const trends = rawTrends.filter(t => {
    if (isWeatherKeyword(t.keyword)) {
      console.log(`⛅ 날씨 키워드 건너뜀: "${t.keyword}"`);
      return false;
    }
    return true;
  });

  if (trends.length === 0) {
    console.warn(`⚠️ [${code}] 날씨 필터 후 트렌드 없음`);
    return { country_code: code, trends_saved: 0, searches_saved: 0 };
  }

  console.log(`📈 [${code}] ${trends.length}개 트렌드 (필터 후)`);

  // 4. DB에 트렌드 저장
  const trendResult = await saveTrends(trends);
  const trendIds = trendResult.trendIds;

  // 5. Google News 검색 (단일 브라우저, 순차)
  const keywords = trends.map(t => t.keyword);
  console.log(`🔍 [${code}] ${keywords.length}개 키워드 뉴스 검색 중...`);
  const searchResults = await searchMultipleGoogleNews(keywords, countryInfo.language, code);

  const enriched = searchResults.map(r => ({ ...r, country_code: code }));

  // 6. 검색 결과 저장
  const searchResult = await saveSearchResults(enriched, trendIds);

  console.log(`✅ [${code}] 완료 — 트렌드: ${trendResult.saved}개, 검색: ${searchResult.saved}개`);

  return {
    country_code: code,
    country_name: countryInfo.name,
    trends_saved: trendResult.saved,
    searches_saved: searchResult.saved,
    successful_searches: enriched.filter(r => r.success).length,
    failed_searches: enriched.filter(r => !r.success).length,
  };
}

module.exports = { runTrendsForCountry, isWeatherKeyword };
