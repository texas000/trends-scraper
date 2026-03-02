const chromiumSparticuz = require('@sparticuz/chromium');
const isVercel = !!process.env.VERCEL || process.platform === 'linux';
const { chromium } = isVercel ? require('playwright-core') : require('playwright');

/**
 * Google News를 사용하여 검색어 관련 뉴스 기사 수집
 * @param {string} query - 검색 쿼리
 * @param {string} language - 언어 코드 (기본값: 'en')
 * @param {string} country - 국가 코드 (기본값: 'US')
 * @returns {Promise<Object>} 검색 결과
 */
/**
 * 단일 Playwright 페이지로 Google News 기사 추출
 * @param {object} page - Playwright page instance
 * @param {string} query
 * @param {string} language
 * @param {string} country
 */
async function _fetchNewsPage(page, query, language, country) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/search?q=${encodedQuery}&hl=${language}&gl=${country}`;

  console.log(`🔍 Google News 검색: "${query}" (${language}/${country})`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    console.log(`  ⏱️ ${query} 네트워크 대기 중...`);
  }

  try {
    await page.waitForSelector('main a[href*="/read/"]', { timeout: 10000 });
  } catch {
    console.log(`  ⏱️ ${query} 기사 링크 로드 대기 중...`);
  }

  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const articleLinks = document.querySelectorAll('main a[href*="/read/"]');

    Array.from(articleLinks).forEach((link) => {
      if (results.length >= 5) return;
      try {
        const url = link.href || '';
        let title = link.textContent?.trim() || '';
        let snippet = '';

        if (!title || title.length <= 3) {
          const h3 = link.querySelector('h3') || link.closest('article')?.querySelector('h3');
          title = h3?.textContent?.trim() || '';
        }

        const p = link.parentElement?.querySelector('p');
        if (p) snippet = p.textContent?.trim() || '';

        if (title && title.length > 3 && !seen.has(title)) {
          seen.add(title);
          results.push({
            title: title.substring(0, 200),
            url: url.substring(0, 2048),
            snippet: snippet.substring(0, 300)
          });
        }
      } catch {}
    });

    return results;
  });
}

async function searchGoogleNews(query, language = 'en', country = 'US') {
  let browser = null;
  try {
    const executablePath = isVercel ? await chromiumSparticuz.executablePath() : null;
    const launchOptions = isVercel
      ? { args: chromiumSparticuz.args, defaultViewport: chromiumSparticuz.defaultViewport, executablePath, headless: chromiumSparticuz.headless }
      : { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };

    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage();
    const articles = await _fetchNewsPage(page, query, language, country);
    await browser.close();

    console.log(`✓ Google News 검색 성공: "${query}" (${articles.length}개 기사)`);
    return { query, success: true, language, country, result_count: articles.length, articles, error: null };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error(`❌ Google News 검색 실패 (${query}):`, error.message);
    return { query, success: false, language, country, result_count: 0, articles: [], error: error.message };
  }
}

/**
 * 여러 검색어를 단일 브라우저 인스턴스로 순차 검색 (리소스 절약)
 * @param {Array<string>} keywords - 검색어 배열
 * @param {string} language - 언어 코드
 * @param {string} country - 국가 코드
 * @returns {Promise<Array>} 검색 결과 배열
 */
async function searchMultipleGoogleNews(keywords, language = 'en', country = 'US') {
  let browser = null;
  try {
    console.log(`🔍 ${keywords.length}개 검색어 Google News 검색 중... (단일 브라우저)`);

    const executablePath = isVercel ? await chromiumSparticuz.executablePath() : null;
    const launchOptions = isVercel
      ? { args: chromiumSparticuz.args, defaultViewport: chromiumSparticuz.defaultViewport, executablePath, headless: chromiumSparticuz.headless }
      : { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };

    browser = await chromium.launch(launchOptions);

    const results = [];
    for (const keyword of keywords) {
      const page = await browser.newPage();
      try {
        const articles = await _fetchNewsPage(page, keyword, language, country);
        console.log(`✓ "${keyword}" (${articles.length}개 기사)`);
        results.push({ query: keyword, success: true, language, country, result_count: articles.length, articles, error: null });
      } catch (err) {
        console.error(`❌ "${keyword}" 검색 실패:`, err.message);
        results.push({ query: keyword, success: false, language, country, result_count: 0, articles: [], error: err.message });
      } finally {
        await page.close().catch(() => {});
      }
    }

    await browser.close();

    const successful = results.filter(r => r.success).length;
    console.log(`✓ ${successful}/${keywords.length}개 검색 완료`);
    return results;

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
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
    language: result.language || null,
    country: result.country || null,
    result_count: result.result_count || 0,
    articles: JSON.stringify(result.articles || []),
    error: result.error || null
  }));
}

module.exports = {
  searchGoogleNews,
  searchMultipleGoogleNews,
  filterSearchResults
};
