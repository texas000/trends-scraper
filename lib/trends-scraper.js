const chromiumSparticuz = require('@sparticuz/chromium');
const isVercel = !!process.env.VERCEL || process.platform === 'linux';
const { chromium } = isVercel ? require('playwright-core') : require('playwright');
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
  SG: { name: '싱가포르', language: 'en', flag: '🇸🇬' },
  HK: { name: '홍콩', language: 'zh', flag: '🇭🇰' },
  TW: { name: '대만', language: 'zh', flag: '🇹🇼' },
  TH: { name: '태국', language: 'th', flag: '🇹🇭' }
};

/**
 * Playwright를 사용하여 Google Trends 페이지에서 실시간 트렌딩 키워드 수집
 * @param {string} countryCode - 국가 코드 (예: KR, US, JP)
 * @returns {Promise<Array>} 트렌딩 검색어 배열
 */
async function getTrendingSearches(countryCode = 'KR', sharedExecutablePath = null) {
  let browser = null;
  try {
    // 유효한 국가 코드 확인
    if (!SUPPORTED_COUNTRIES[countryCode]) {
      throw new Error(`지원하지 않는 국가 코드: ${countryCode}`);
    }

    const countryInfo = SUPPORTED_COUNTRIES[countryCode];
    console.log(`📍 ${countryInfo.flag} ${countryInfo.name} (${countryCode}) 트렌드 수집 중...`);

    // Playwright 브라우저 시작 (환경에 따라 Chromium 경로 선택)
    const launchOptions = isVercel
      ? {
          args: chromiumSparticuz.args,
          defaultViewport: chromiumSparticuz.defaultViewport,
          executablePath: sharedExecutablePath || await chromiumSparticuz.executablePath(),
          headless: chromiumSparticuz.headless
        }
      : {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        };
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage();

    // Google Trends 페이지 방문
    const url = `https://trends.google.com/trending?geo=${countryCode}`;
    console.log(`  🌐 ${url} 접속 중...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // 페이지 로드 대기
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // networkidle이 안 되면 그냥 진행
      console.log('  ⏱️ 네트워크 대기 중...');
    }
    await page.waitForTimeout(1500);

    // 트렌드 행(row) 로드 대기
    try {
      await page.waitForSelector('tbody > tr, tr[role="row"], div[role="row"]', { timeout: 10000 });
    } catch {
      console.log('  ⏱️ 행 요소 로드 대기 중...');
    }

    // 추가 대기
    await page.waitForTimeout(1500);

    // Playwright locator를 사용하여 트렌드 데이터 추출
    const trends = await page.evaluate(() => {
      const trendKeywords = [];
      const seen = new Set();

      // helper: extract visible search-term labels via data-term attributes (preferred)
      function getTermsFromCell(cell) {
        if (!cell) return [];
        // prefer elements with data-term attribute
        const dataTermEls = cell.querySelectorAll ? cell.querySelectorAll('[data-term]') : [];
        if (dataTermEls && dataTermEls.length) {
          return Array.from(dataTermEls).map(el => (el.getAttribute('data-term') || '').trim()).filter(Boolean);
        }
        // fallback: buttons with data-term
        const btn = cell.querySelector && cell.querySelector('button[data-term]');
        if (btn) {
          const v = (btn.getAttribute('data-term') || '').trim();
          return v ? [v] : [];
        }
        // fallback: anchor texts
        const anchors = cell.querySelectorAll ? cell.querySelectorAll('a') : [];
        if (anchors && anchors.length) {
          return Array.from(anchors).map(a => (a.textContent || '').trim()).filter(Boolean);
        }
        // last resort: whole cell text
        const txt = (cell.textContent || '').trim();
        return txt ? [txt] : [];
      }

      // tbody > tr 선택자로 모든 행 가져오기
      const rows = document.querySelectorAll('tbody > tr');

      if (rows.length === 0) {
        // 폴백: tr[role="row"] 또는 div[role="row"] 시도
        return Array.from(document.querySelectorAll('tr[role="row"], div[role="row"]'))
          .slice(0, 10)
          .map((row, idx) => {
            const text = row.textContent?.split('\n')[0]?.trim() || row.textContent?.trim();
            // td가 있으면 5번째 셀에서 a 태그 텍스트들을 추출해 콤마로 합침
            let breakdown_text = null;
            try {
              const cells = row.querySelectorAll && row.querySelectorAll('td');
              if (cells && cells[4]) {
                const cell = cells[4];
                const parts = getTermsFromCell(cell) || [];
                const uniq = Array.from(new Set(parts));
                breakdown_text = uniq.length ? uniq.join(', ') : null;
              }
            } catch (e) {
              breakdown_text = null;
            }
            return {
              keyword: text && text.length < 200 ? text : `Trend ${idx + 1}`,
              rank: idx + 1,
              breakdown_text
            };
          })
          .filter(item => item.keyword && item.keyword.length > 2);
      }

      // tbody > tr에서 추출
      Array.from(rows).forEach((row) => {
        if (trendKeywords.length >= 10) return;

        try {
          // td 요소들 가져오기
          const cells = row.querySelectorAll('td');

          if (cells.length > 1) {
            // 두 번째 셀(인덱스 1)에서 트렌드명 추출
            let trendMain = cells[1]?.textContent?.trim();
            let breakdown_text = null;
            try {
              if (cells[4]) {
                const cell = cells[4];
                const parts = getTermsFromCell(cell) || [];
                const uniq = Array.from(new Set(parts));
                breakdown_text = uniq.length ? uniq.join(', ') : null;
              }
            } catch (e) {
              breakdown_text = null;
            }

            if (trendMain) {
              // 첫 번째 줄만 가져오기
              trendMain = trendMain.split('\n')[0].trim();

              // 메타데이터 제거 (숫자 + 'K+' 또는 '·' 기호 이후 제거)
              // 패턴: "keyword + K+ searches·trending_upActive·time"
              trendMain = trendMain
                .replace(/\d+K\+\s*searches.*/g, '') // "50K+ searches..." 제거
                .replace(/\d+\+\s*searches.*/g, '') // "K+ searches" 제거
                .replace(/·.*/g, '') // "·" 이후 모든 내용 제거
                .trim();

              // 트렌드명이 있고 유효한지 확인
              if (trendMain && trendMain.length > 2 && trendMain.length < 150) {
                if (!seen.has(trendMain)) {
                  seen.add(trendMain);
                  trendKeywords.push({
                    keyword: trendMain,
                    rank: trendKeywords.length + 1,
                    breakdown_text: breakdown_text || null
                  });
                }
              }
            }
          }
        } catch (e) {
          // 각 행 처리 중 오류는 무시
        }
      });

      return trendKeywords;
    });

    await browser.close();

    if (trends.length === 0) {
      throw new Error(`${countryInfo.name}에서 트렌드를 파싱할 수 없음`);
    }

    // 결과 형식화
    const formattedTrends = trends.map((trend, index) => ({
      country_code: countryCode,
      country_name: countryInfo.name,
      language: countryInfo.language,
      rank: index + 1,
      keyword: trend.keyword,
      trend: 'N/A',
      breakdown_text: trend.breakdown_text || null
    }));

    console.log(`✓ ${countryInfo.name}에서 ${formattedTrends.length}개 트렌드 수집`);
    return formattedTrends;

  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
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
    // 입력값 정규화 (문자열을 배열로, 공백 제거, 대문자 변환)
    let codes = countryCodes;
    if (typeof countryCodes === 'string') {
      codes = countryCodes.split(',');
    }
    if (!Array.isArray(codes)) {
      codes = ['KR', 'US', 'JP'];
    }

    // 유효한 국가 코드만 필터링
    const validCodes = codes
      .map(code => String(code).trim().toUpperCase())
      .filter(code => SUPPORTED_COUNTRIES[code]);

    if (validCodes.length === 0) {
      console.warn(`⚠️ 유효하지 않은 국가 코드: ${codes.join(', ')}`);
      console.warn(`   지원하는 국가: ${Object.keys(SUPPORTED_COUNTRIES).join(', ')}`);
      // 기본값 사용
      validCodes.push('KR', 'US', 'JP');
    }

    console.log(`🌍 ${validCodes.length}개 국가의 트렌드 수집 중...`);

    // Vercel에서는 Chromium 바이너리를 한 번만 추출하여 공유 (ETXTBSY 방지)
    const sharedExecutablePath = isVercel ? await chromiumSparticuz.executablePath() : null;

    // 모든 국가의 데이터를 동시에 수집 (한 국가 실패 시 나머지 계속 진행)
    const promises = validCodes.map(code => getTrendingSearches(code, sharedExecutablePath));
    const results = await Promise.allSettled(promises);

    // 국가별로 그룹화 (실패한 국가는 건너뜀)
    const grouped = {};
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        grouped[result.value[0].country_code] = result.value;
      } else if (result.status === 'rejected') {
        console.warn(`⚠️ ${validCodes[i]} 트렌드 수집 실패 (건너뜀): ${result.reason?.message}`);
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
