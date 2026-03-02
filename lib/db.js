const { Pool } = require('pg');

let pool = null;

/**
 * Neon 데이터베이스 풀 초기화
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

/**
 * 트렌드 및 검색 결과 테이블 생성 (다국어 지원)
 */
async function initializeDatabase() {
  const client = await getPool().connect();
  try {
    // 1. Create trends table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trends (
        id SERIAL PRIMARY KEY,
        country_code VARCHAR(5) NOT NULL,
        country_name VARCHAR(50) NOT NULL,
        language VARCHAR(10),
        keyword VARCHAR(255) NOT NULL,
        rank INT NOT NULL,
        trend_value VARCHAR(50),
        breakdown_text TEXT,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Migrate trends: add breakdown_text if missing
    try {
      await client.query(`ALTER TABLE trends ADD COLUMN breakdown_text TEXT`);
      console.log('✓ breakdown_text 컬럼 추가 완료');
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    // 3. Create indices for trends table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_at ON trends(saved_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_country_code ON trends(country_code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_keyword ON trends(keyword)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_country_date ON trends(country_code, saved_at DESC)`);

    // 4. Create search_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_results (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(255) NOT NULL,
        success BOOLEAN DEFAULT true,
        language VARCHAR(10),
        result_count INT DEFAULT 0,
        error TEXT,
        searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Migrate search_results: add missing columns if not present
    const migrations = [
      { column: 'language',     ddl: `ALTER TABLE search_results ADD COLUMN language VARCHAR(10)` },
      { column: 'country_code', ddl: `ALTER TABLE search_results ADD COLUMN country_code VARCHAR(5)` },
      { column: 'articles',     ddl: `ALTER TABLE search_results ADD COLUMN articles JSONB` },
    ];
    for (const { column, ddl } of migrations) {
      try {
        await client.query(ddl);
        console.log(`✓ ${column} 컬럼 추가 완료`);
      } catch (e) {
        // "already exists" means the column is already there — that's fine
        if (!e.message.includes('already exists')) throw e;
      }
    }

    // 6. Create indices for search_results table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_keyword_search ON search_results(keyword)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_searched_at ON search_results(searched_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_keyword_searched ON search_results(keyword, searched_at DESC)`);

    // Create index on country_code only if column exists
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_country_search ON search_results(country_code, searched_at DESC)`);
    } catch (e) {
      // Index creation might fail if column doesn't exist yet, continue
      if (!e.message.includes('column') && !e.message.includes('does not exist')) {
        throw e;
      }
    }

    // 7. Create trend_searches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS trend_searches (
        id SERIAL PRIMARY KEY,
        trend_id INT REFERENCES trends(id) ON DELETE CASCADE,
        search_id INT REFERENCES search_results(id) ON DELETE CASCADE,
        country_code VARCHAR(5),
        keyword VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trend_id, search_id)
      )
    `);

    // 8. Create indices for trend_searches table
    await client.query(`CREATE INDEX IF NOT EXISTS idx_trend_search ON trend_searches(trend_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_search_trend ON trend_searches(search_id)`);

    console.log('✓ 데이터베이스 테이블 준비 완료 (트렌드 + 검색 결과)');
  } catch (error) {
    console.error('✗ 데이터베이스 초기화 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 트렌드 데이터를 데이터베이스에 저장
 */
async function saveTrends(trendsData) {
  const client = await getPool().connect();
  try {
    const timestamp = new Date();
    const savedTrendIds = [];
    
    for (const trend of trendsData) {
      const result = await client.query(
        `INSERT INTO trends (country_code, country_name, language, keyword, rank, trend_value, breakdown_text, saved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          trend.country_code,
          trend.country_name,
          trend.language,
          trend.keyword,
          trend.rank,
          trend.trend,
          trend.breakdown_text || null,
          timestamp
        ]
      );
      savedTrendIds.push(result.rows[0].id);
    }
    
    console.log(`✓ ${trendsData.length}개 키워드 저장 완료`);
    return { success: true, saved: trendsData.length, trendIds: savedTrendIds };
  } catch (error) {
    console.error('✗ 데이터베이스 저장 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Google News 검색 결과를 데이터베이스에 저장
 */
async function saveSearchResults(searchResults, trendIds = []) {
  const client = await getPool().connect();
  try {
    const savedSearchIds = [];

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];

      const queryResult = await client.query(
        `INSERT INTO search_results
         (keyword, success, language, country_code, result_count, articles, error, searched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          result.query,
          result.success,
          result.language || null,
          result.country_code || null,
          result.result_count || 0,
          result.articles ? JSON.stringify(result.articles) : null,
          result.error || null,
          new Date()
        ]
      );

      const searchId = queryResult.rows[0].id;
      savedSearchIds.push(searchId);

      // 트렌드와 검색 결과 연결
      if (trendIds[i]) {
        await client.query(
          `INSERT INTO trend_searches (trend_id, search_id, keyword, country_code)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [trendIds[i], searchId, result.query, result.country_code || null]
        );
      }
    }

    console.log(`✓ ${searchResults.length}개 검색 결과 저장 완료`);
    return { success: true, saved: searchResults.length, searchIds: savedSearchIds };
  } catch (error) {
    console.error('✗ 검색 결과 저장 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 특정 키워드의 검색 결과 조회
 */
async function getSearchResultsByKeyword(keyword, limit = 10) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        id, keyword, success, language, country_code,
        result_count, articles, error, searched_at
      FROM search_results
      WHERE keyword = $1
      ORDER BY searched_at DESC
      LIMIT $2
    `, [keyword, limit]);

    return result.rows.map(row => ({
      ...row,
      articles: row.articles ? JSON.parse(row.articles) : []
    }));
  } catch (error) {
    console.error('✗ 검색 결과 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 트렌드와 검색 결과를 함께 조회
 */
async function getTrendWithSearchResults(countryCode, limit = 20) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        t.id as trend_id,
        t.country_code,
        t.country_name,
        t.keyword,
        t.rank,
        t.saved_at as trend_saved_at,
        sr.id as search_id,
        sr.success,
        sr.language,
        sr.result_count,
        sr.articles,
        sr.searched_at
      FROM trends t
      LEFT JOIN trend_searches ts ON t.id = ts.trend_id
      LEFT JOIN search_results sr ON ts.search_id = sr.id
      WHERE t.country_code = $1
      ORDER BY t.saved_at DESC, t.rank ASC
      LIMIT $2
    `, [countryCode.toUpperCase(), limit]);

    // 결과를 키워드별로 그룹화
    const grouped = {};
    result.rows.forEach(row => {
      const key = `${row.trend_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          trend_id: row.trend_id,
          country_code: row.country_code,
          country_name: row.country_name,
          keyword: row.keyword,
          rank: row.rank,
          trend_saved_at: row.trend_saved_at,
          search_results: []
        };
      }

      if (row.search_id) {
        grouped[key].search_results.push({
          search_id: row.search_id,
          success: row.success,
          language: row.language,
          result_count: row.result_count,
          articles: row.articles ? JSON.parse(row.articles) : [],
          searched_at: row.searched_at
        });
      }
    });

    return Object.values(grouped);
  } catch (error) {
    console.error('✗ 트렌드 + 검색 결과 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 최근 트렌드 조회 (레거시 호환성)
 */
async function getRecentTrends(limit = 20) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT keyword, rank, country_code, country_name, saved_at, trend_value
      FROM trends
      ORDER BY saved_at DESC, rank ASC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  } catch (error) {
    console.error('✗ 트렌드 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 특정 국가의 최근 트렌드 조회
 */
async function getTrendsByCountry(countryCode, limit = 20) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT keyword, rank, country_code, country_name, language, saved_at, trend_value
      FROM trends
      WHERE country_code = $1
      ORDER BY saved_at DESC, rank ASC
      LIMIT $2
    `, [countryCode.toUpperCase(), limit]);
    
    return result.rows;
  } catch (error) {
    console.error('✗ 트렌드 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 모든 국가의 최근 트렌드 조회 (국가별 그룹화)
 */
async function getRecentTrendsByAllCountries(limit = 20) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT ON (country_code, rank) 
        keyword, rank, country_code, country_name, language, saved_at, trend_value
      FROM trends
      ORDER BY country_code, rank, saved_at DESC
      LIMIT $1
    `, [limit]);
    
    // 국가별로 그룹화
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.country_code]) {
        grouped[row.country_code] = {
          country_code: row.country_code,
          country_name: row.country_name,
          language: row.language,
          trends: []
        };
      }
      grouped[row.country_code].trends.push({
        keyword: row.keyword,
        rank: row.rank,
        saved_at: row.saved_at,
        trend_value: row.trend_value
      });
    });
    
    return grouped;
  } catch (error) {
    console.error('✗ 다국가 트렌드 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 특정 날짜의 트렌드 조회 (국가별)
 */
async function getTrendsByCountryAndDate(countryCode, date) {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT keyword, rank, saved_at, trend_value
      FROM trends
      WHERE country_code = $1 AND DATE(saved_at) = $2
      ORDER BY rank ASC
    `, [countryCode.toUpperCase(), date]);
    
    return result.rows;
  } catch (error) {
    console.error('✗ 날짜별 트렌드 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 오늘의 트렌드 조회 (레거시 호환성)
 */
async function getTodayTrends() {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT keyword, rank, country_code, country_name, saved_at, trend_value
      FROM trends
      WHERE DATE(saved_at) = CURRENT_DATE
      ORDER BY country_code, rank ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('✗ 오늘의 트렌드 조회 실패:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 데이터베이스 풀 종료
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  saveTrends,
  saveSearchResults,
  getSearchResultsByKeyword,
  getTrendWithSearchResults,
  getRecentTrends,
  getTrendsByCountry,
  getRecentTrendsByAllCountries,
  getTrendsByCountryAndDate,
  getTodayTrends,
  closePool
};
