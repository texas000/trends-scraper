const axios = require('axios');

/**
 * DuckDuckGo API를 사용하여 검색어 정보 수집
 * DuckDuckGo의 Instant Answer API 사용
 */
async function searchDuckDuckGo(query) {
  try {
    const url = 'https://api.duckduckgo.com/';
    
    const response = await axios.get(url, {
      params: {
        q: query,
        format: 'json',
        no_redirect: 1,
        no_html: 1,
        skip_disambig: 1
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    return {
      query: query,
      success: true,
      abstract: data.AbstractText || '',
      abstract_source: data.AbstractSource || '',
      abstract_url: data.AbstractURL || '',
      image: data.Image || '',
      heading: data.Heading || '',
      result_count: data.Results?.length || 0,
      results: (data.Results || []).map(result => ({
        title: result.Text || '',
        url: result.FirstURL || '',
        icon_url: result.Icon?.URL || ''
      })).slice(0, 5), // 상위 5개만
      related_searches: (data.RelatedTopics || []).map(topic => ({
        name: topic.Text || '',
        url: topic.FirstURL || ''
      })).slice(0, 5)
    };
  } catch (error) {
    console.error(`❌ DuckDuckGo 검색 실패 (${query}):`, error.message);
    return {
      query: query,
      success: false,
      error: error.message,
      abstract: '',
      abstract_source: '',
      abstract_url: '',
      image: '',
      heading: '',
      result_count: 0,
      results: [],
      related_searches: []
    };
  }
}

/**
 * 여러 검색어를 동시에 검색
 */
async function searchMultipleKeywords(keywords) {
  try {
    console.log(`🔍 ${keywords.length}개 검색어 DuckDuckGo 검색 중...`);
    
    // 모든 검색을 동시에 수행 (병렬 처리)
    const promises = keywords.map(keyword => searchDuckDuckGo(keyword));
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    console.log(`✓ ${successful}/${keywords.length}개 검색 완료`);
    
    return results;
  } catch (error) {
    console.error('❌ 다중 검색 실패:', error.message);
    throw error;
  }
}

/**
 * 검색 결과 필터링 (null 값 제거)
 */
function filterSearchResults(searchResults) {
  return searchResults.map(result => ({
    query: result.query,
    success: result.success,
    abstract: result.abstract || null,
    abstract_source: result.abstract_source || null,
    abstract_url: result.abstract_url || null,
    image: result.image || null,
    heading: result.heading || null,
    result_count: result.result_count || 0,
    top_results: JSON.stringify(result.results || []),
    related_searches: JSON.stringify(result.related_searches || []),
    error: result.error || null
  }));
}

module.exports = {
  searchDuckDuckGo,
  searchMultipleKeywords,
  filterSearchResults
};
