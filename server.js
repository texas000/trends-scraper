require('dotenv').config({ path: '.env' });

const http = require('http');
const { URL } = require('url');
const { SUPPORTED_COUNTRIES } = require('./lib/trends-scraper');

const cronHandler = require('./api/cron/[country]');

// Map URL paths to handler files
const routes = {
  '/api/trigger-trends':  require('./api/trigger-trends'),
  '/api/trends':          require('./api/trends'),
  '/api/countries':       require('./api/countries'),
  '/api/search-results':  require('./api/search-results'),
};

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const base = `http://${req.headers.host}`;
  const parsed = new URL(req.url, base);

  // Match /api/cron/:country dynamic route
  const cronMatch = parsed.pathname.match(/^\/api\/cron\/([A-Z]{2})$/i);

  let handler = routes[parsed.pathname];
  let dynamicParam = null;

  if (!handler && cronMatch) {
    handler = cronHandler;
    dynamicParam = cronMatch[1].toUpperCase();
  }

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `No handler for ${parsed.pathname}` }));
    return;
  }

  // Parse query params into plain object (matches Vercel req.query)
  const query = {};
  parsed.searchParams.forEach((v, k) => { query[k] = v; });
  if (dynamicParam) query.country = dynamicParam;

  // Augment Node's IncomingMessage with Vercel-style helpers
  req.query = query;
  req.body = {};

  // Buffer body for POST/PUT
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    if (chunks.length) {
      try { req.body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
    }

    // Augment ServerResponse with Vercel-style helpers
    res.status = (code) => { res.statusCode = code; return res; };
    res.json   = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
      return res;
    };
    res.send = (data) => {
      res.end(typeof data === 'string' ? data : JSON.stringify(data));
      return res;
    };

    console.log(`→ ${req.method} ${req.url}`);
    try {
      await handler(req, res);
    } catch (err) {
      console.error('Handler error:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, stack: err.stack }));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nLocal dev server running at http://localhost:${PORT}`);
  console.log('Available routes:');
  Object.keys(routes).forEach(r => console.log(`  http://localhost:${PORT}${r}`));
  console.log('\nPer-country cron (manual test):');
  console.log(`  http://localhost:${PORT}/api/cron/KR?secret=zunery`);
  console.log('\nMulti-country manual trigger:');
  console.log(`  http://localhost:${PORT}/api/trigger-trends?secret=zunery&countries=KR,US`);
  console.log('\nPress Ctrl+C to stop.\n');
});
