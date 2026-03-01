#!/usr/bin/env node

/**
 * Local debugging script to test Google Trends scraping
 * Usage: node debug-trends.js [country-code]
 * Example: node debug-trends.js KR
 * Example: node debug-trends.js KR US JP
 */

require('dotenv').config({ path: '.env.local' });

const { getTrendingSearchesByCountries, getSupportedCountries, SUPPORTED_COUNTRIES } = require('./lib/trends-scraper');
const { searchMultipleGoogleNews } = require('./lib/search-api');

async function debugTrends() {
  let countries = process.argv.slice(2);
  if (countries.length === 0) {
    countries = ['US', 'JP'];
    // countries = ['KR', 'US', 'JP'];
  }

  console.log('\n🔍 Google Trends Scraper - Debug Mode');
  console.log('=====================================\n');
  console.log(`📍 Testing countries: ${countries.join(', ')}\n`);

  try {
    // Test 1: Get supported countries
    console.log('✓ Supported countries:');
    const supported = getSupportedCountries();
    supported.forEach(c => {
      console.log(`  ${c.flag} ${c.name} (${c.code})`);
    });
    console.log();

    // Test 2: Fetch trends
    console.log('🌍 Fetching trends from Google...');
    const startTime = Date.now();

    const trendsData = await getTrendingSearchesByCountries(countries);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Trends fetched in ${elapsed}s\n`);

    // Display results
    console.log('📊 Trends by country:', trendsData);
    Object.entries(trendsData).forEach(([countryCode, trends]) => {
      const countryInfo = supported.find(c => c.code === countryCode);
      console.log(`${countryInfo.flag} ${countryInfo.name} (${countryCode}) - ${trends.length} trends`);

      trends.slice(0, 5).forEach((trend, i) => {
        console.log(`  #${i + 1} ${trend.keyword}`);
      });
      console.log();
    });

    // Test 3: Search keywords on Google News
    const allTrends = [];
    let countryCode = null;
    let countryInfo = null;

    // Use the first country from trendsData
    Object.entries(trendsData).forEach(([code, countryTrends]) => {
      allTrends.push(...countryTrends);
      if (!countryCode) {
        countryCode = code;
        countryInfo = SUPPORTED_COUNTRIES[code];
      }
    });

    const sampleKeywords = allTrends.slice(0, 3).map(t => t.keyword);

    console.log(`🔍 Testing Google News search with ${sampleKeywords.length} keywords...`);
    console.log(`  Keywords: ${sampleKeywords.join(', ')}`);
    console.log(`  Country: ${countryInfo.name} (${countryCode})\n`);

    const searchStartTime = Date.now();
    const searchResults = await searchMultipleGoogleNews(sampleKeywords, countryInfo.language, countryCode);

    const searchElapsed = ((Date.now() - searchStartTime) / 1000).toFixed(2);

    console.log(`✓ Search completed in ${searchElapsed}s\n`);

    searchResults.forEach((result, i) => {
      const status = result.success ? '✓' : '✗';
      console.log(`${status} "${result.query}" - ${result.result_count} articles`);
      if (result.success && result.articles.length > 0) {
        result.articles.slice(0, 3).forEach((article, idx) => {
          console.log(`  ${idx + 1}. ${article.title}`);
          if (article.url) console.log(`     URL: ${article.url}`);
          if (article.snippet) console.log(`     ${article.snippet}`);
        });
      } else if (!result.success) {
        console.log(`  Error: ${result.error}`);
      }
    });

    console.log('\n✅ Debug test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during debug test:');
    console.error(error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

debugTrends();
