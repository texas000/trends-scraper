#!/usr/bin/env node

/**
 * Local API testing script
 * Tests all API endpoints without needing a database
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');
const countriesHandler = require('./api/countries');
const trendsHandler = require('./api/trends');
const searchResultsHandler = require('./api/search-results');

// Mock request/response objects
function createMockReq(path = '/') {
  return {
    url: path,
    query: {},
    method: 'GET'
  };
}

function createMockRes() {
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('📋 Response:');
      console.log(JSON.stringify(data, null, 2));
      return this;
    },
    send: function(data) {
      console.log('📋 Response:');
      console.log(data);
      return this;
    },
    setHeader: function(key, value) {
      return this;
    }
  };
  return res;
}

async function testAPIs() {
  console.log('\n🧪 API Testing - Debug Mode');
  console.log('=============================\n');

  try {
    // Test 1: Countries API
    console.log('Test 1: GET /api/countries');
    console.log('---');
    const req1 = createMockReq('/api/countries');
    const res1 = createMockRes();
    await countriesHandler(req1, res1);
    console.log();

    // Test 2: Trends API (all countries)
    console.log('Test 2: GET /api/trends (all countries)');
    console.log('---');
    const req2 = createMockReq('/api/trends');
    const res2 = createMockRes();
    await trendsHandler(req2, res2);
    console.log();

    // Test 3: Trends API (specific country)
    console.log('Test 3: GET /api/trends?country=KR (single country)');
    console.log('---');
    const req3 = createMockReq('/api/trends?country=KR');
    req3.query = { country: 'KR' };
    const res3 = createMockRes();
    await trendsHandler(req3, res3);
    console.log();

    // Test 4: Search Results API (info)
    console.log('Test 4: GET /api/search-results (info)');
    console.log('---');
    const req4 = createMockReq('/api/search-results');
    const res4 = createMockRes();
    await searchResultsHandler(req4, res4);
    console.log();

    console.log('✅ API tests completed!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during API test:');
    console.error(error.message);
    console.error('\nNote: Some APIs may fail if database is not configured.');
    console.error('Run "npm run dev" for full Vercel dev environment.\n');
    process.exit(1);
  }
}

testAPIs();
