const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 지원하는 국가 코드 및 정보
 */
const SUPPORTED_COUNTRIES = {
  KR: { name: '한국', language: 'ko', flag: '🇰🇷' },
  US: { name: '미국', language: 'en', flag: '🇺🇸' },
  JP: { name: '일본', language: 'ja', flag: '🇯🇵' },
  CN: { name: '중국', language: 'zh', flag: '🇨🇳' },
  GB: { name: '영국', language: 'en', flag: '🇬🇧' },
  DE: { name: '독일', language: 'de', flag: '🇩🇪' },
  FR: { name: '프랑스', language: 'fr', flag: '🇫🇷' },
  IN: { name: '인도', language: 'hi', flag: '🇮🇳' },
  BR: { name: '브라질', language: 'pt', flag: '🇧🇷' },
  MX: { name: '멕시코', language: 'es', flag: '🇲🇽' },
  ES: { name: '스페인', language: 'es', flag: '🇪🇸' },
  IT: { name: '이탈리아', language: 'it', flag: '🇮🇹' },
  CA: { name: '캐나다', language: 'en', flag: '🇨🇦' },
  AU: { name: '호주', language: 'en', flag: '🇦🇺' },
  NL: { name: '네덜란드', language: 'nl', flag: '🇳🇱' },
  RU: { name: '러시아', language: 'ru', flag: '🇷🇺' },
  IN: { name: '인도', language: 'hi', flag: '🇮🇳' },
  SG: { name: '싱가포르', language: 'en', flag: '🇸🇬' },
  HK: { name: '홍콩', language: 'zh', flag: '🇭🇰' },
  TW: { name: '대만', language: 'zh', flag: '🇹🇼' },
  TH: { name: '태국', language: 'th', flag: '🇹🇭' }
};

/**
 * Google Trends에서 특정 지역의 트렌딩 검색어 수집
 * @param {string} countryCode - 국가 코드 (예: KR, US, JP)
 * @returns {Promise<Array>} 트렌딩 검색어 배열
 */
async function getTrendingSearches(countryCode = 'KR') {
  try {
    // 유효한 국가 코드 확인
    if (!SUPPORTED_COUNTRIES[countryCode]) {
      throw new Error(`지원하지 않는 국가 코드: ${countryCode}`);
    }

    const url = `https://trends.google.com/trending?geo=${countryCode}`;
    const countryInfo = SUPPORTED_COUNTRIES[countryCode];
    
    console.log(`📍 ${countryInfo.flag} ${countryInfo.name} (${countryCode}) 트렌드 수집 중...`);

    // User-Agent 설정 (Google의 요청 차단 우회)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const response = await axios.get(url, { 
      headers,
      timeout: 10000 
    });

    const $ = cheerio.load(response.data);
    const trends = [];

    // Google Trends 페이지 구조에서 검색어 추출
    // 실시간 검색어 섹션의 각 항목
    $('[data-industry-name]').each((index, element) => {
      const keyword = $(element).find('a[href*="/search"]').text().trim();
      const trendValue = $(element).find('[data-has-tooltip]').attr('aria-label');
      
      if (keyword) {
        trends.push({
          country_code: countryCode,
          country_name: countryInfo.name,
          language: countryInfo.language,
          rank: index + 1,
          keyword: keyword,
          trend: trendValue || 'N/A'
        });
      }
    });

    // 위 선택자가 작동하지 않으면 대체 방식
    if (trends.length === 0) {
      $('div[data-trend-item]').each((index, element) => {
        const keyword = $(element).text().trim();
        if (keyword && keyword.length > 0) {
          trends.push({
            country_code: countryCode,
            country_name: countryInfo.name,
            language: countryInfo.language,
            rank: index + 1,
            keyword: keyword,
            trend: 'N/A'
          });
        }
      });
    }

    if (trends.length === 0) {
      console.warn(`⚠️ ${countryInfo.name}에서 트렌드를 파싱할 수 없음`);
      trends.push({
        country_code: countryCode,
        country_name: countryInfo.name,
        language: countryInfo.language,
        rank: 1,
        keyword: 'Unable to parse - See API response',
        trend: 'N/A'
      });
    }

    console.log(`✓ ${countryInfo.name}에서 ${trends.length}개 트렌드 수집`);
    return trends;
  } catch (error) {
    console.error(`❌ Google Trends 스크래핑 오류 (${countryCode}):`, error.message);
    throw new Error(`Failed to fetch trends for ${countryCode}: ${error.message}`);
  }
}

/**
 * 여러 국가의 트렌드를 동시에 수집
 * @param {Array<string>} countryCodes - 국가 코드 배열
 * @returns {Promise<Object>} 국가별 트렌드 객체
 */
async function getTrendingSearchesByCountries(countryCodes = ['KR', 'US', 'JP']) {
  try {
    const validCodes = countryCodes.filter(code => SUPPORTED_COUNTRIES[code]);
    
    if (validCodes.length === 0) {
      throw new Error('유효한 국가 코드가 없습니다');
    }

    console.log(`🌍 ${validCodes.length}개 국가의 트렌드 수집 중...`);

    // 모든 국가의 데이터를 동시에 수집
    const promises = validCodes.map(code => getTrendingSearches(code));
    const allTrends = await Promise.all(promises);

    // 국가별로 그룹화
    const grouped = {};
    allTrends.forEach(trends => {
      if (trends.length > 0) {
        grouped[trends[0].country_code] = trends;
      }
    });

    return grouped;
  } catch (error) {
    console.error('❌ 다중 국가 트렌드 수집 오류:', error.message);
    throw error;
  }
}

/**
 * 지원하는 국가 목록 조회
 */
function getSupportedCountries() {
  return Object.entries(SUPPORTED_COUNTRIES).map(([code, info]) => ({
    code,
    ...info
  }));
}

module.exports = {
  getTrendingSearches,
  getTrendingSearchesByCountries,
  getSupportedCountries,
  SUPPORTED_COUNTRIES
};
