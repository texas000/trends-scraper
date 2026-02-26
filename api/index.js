import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Trends 다국어 크론 대시보드</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          background: white;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 2.5em;
        }

        .subtitle {
          color: #666;
          font-size: 1.1em;
          margin-bottom: 20px;
        }

        .controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
          transform: translateY(-2px);
        }

        select {
          padding: 10px 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1em;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        select:hover {
          border-color: #667eea;
        }

        select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .status {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
          margin-top: 20px;
        }

        .status.idle {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status.loading {
          background: #fff3e0;
          color: #f57c00;
        }

        .status.success {
          background: #e8f5e9;
          color: #388e3c;
        }

        .status.error {
          background: #ffebee;
          color: #d32f2f;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .card h2 {
          color: #333;
          margin-bottom: 15px;
          font-size: 1.5em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .country-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .country-section {
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .country-section:hover {
          border-color: #667eea;
          box-shadow: 0 3px 10px rgba(102, 126, 234, 0.2);
        }

        .country-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          font-size: 1.3em;
          font-weight: bold;
          color: #333;
        }

        .country-flag {
          font-size: 2em;
        }

        .country-info {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 10px;
        }

        .trends-list {
          display: grid;
          gap: 10px;
        }

        .trend-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-left: 4px solid #667eea;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .trend-item:hover {
          background: #f0f0f0;
          transform: translateX(5px);
        }

        .trend-rank {
          font-weight: bold;
          color: #667eea;
          font-size: 1.2em;
          min-width: 40px;
        }

        .trend-keyword {
          flex: 1;
          margin: 0 20px;
          color: #333;
          font-size: 1.1em;
        }

        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          display: none;
        }

        .message.show {
          display: block;
          animation: slideIn 0.3s ease;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        @keyframes slideIn {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .info-box {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .info-label {
          color: #666;
          font-size: 0.9em;
          margin-bottom: 5px;
        }

        .info-value {
          color: #333;
          font-size: 1.3em;
          font-weight: bold;
        }

        .footer {
          text-align: center;
          color: white;
          margin-top: 50px;
          padding: 20px;
          font-size: 0.9em;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 40px 20px;
        }

        .empty-state-icon {
          font-size: 3em;
          margin-bottom: 10px;
        }

        .multiselect-container {
          display: flex;
          gap: 10px;
          margin-top: 15px;
          flex-wrap: wrap;
        }

        .country-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .country-tag:hover {
          background: #bbdefb;
        }

        .country-tag.active {
          background: #667eea;
          color: white;
        }

        .country-tag .remove {
          cursor: pointer;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌍 Google Trends 다국어 크론 대시보드</h1>
          <p class="subtitle">전세계 트렌딩 검색어를 매일 자동으로 수집하고 저장합니다</p>
          
          <div class="multiselect-container" id="countrySelector">
            <!-- 동적으로 생성됨 -->
          </div>

          <div class="controls" style="margin-top: 20px;">
            <button class="btn-primary" onclick="manualTrigger()">
              🚀 선택한 국가 수집
            </button>
            <button class="btn-secondary" onclick="refreshTrends()">
              🔄 데이터 새로고침
            </button>
            <button class="btn-secondary" onclick="toggleInfo()">
              ℹ️ 설정 정보
            </button>
          </div>
          <div id="status" class="status idle">대기 중...</div>
        </div>

        <div id="message"></div>

        <div class="info-grid" id="infoGrid" style="display: none;">
          <div class="info-box">
            <div class="info-label">스케줄</div>
            <div class="info-value">매일 09:00 KST</div>
          </div>
          <div class="info-box">
            <div class="info-label">데이터 저장소</div>
            <div class="info-value">Neon PostgreSQL</div>
          </div>
          <div class="info-box">
            <div class="info-label">플랫폼</div>
            <div class="info-value">Vercel Functions</div>
          </div>
          <div class="info-box">
            <div class="info-label">소스</div>
            <div class="info-value">Google Trends</div>
          </div>
          <div class="info-box">
            <div class="info-label">지원 국가</div>
            <div class="info-value" id="countryCount">-</div>
          </div>
        </div>

        <div class="card">
          <h2>📊 다국가 트렌딩 키워드</h2>
          <div id="trendsList" class="country-grid">
            <div style="text-align: center; color: #999; padding: 20px; grid-column: 1/-1;">
              아직 데이터가 없습니다. 위의 '선택한 국가 수집' 버튼을 클릭하세요.
            </div>
          </div>
        </div>

        <div class="footer">
          <p>💡 이 대시보드는 실시간으로 Google Trends 데이터를 수집하고 Neon 데이터베이스에 저장합니다</p>
          <p style="margin-top: 10px; opacity: 0.8;">Last updated: <span id="lastUpdate">-</span></p>
        </div>
      </div>

      <script>
        const statusEl = document.getElementById('status');
        const messageEl = document.getElementById('message');
        const trendsListEl = document.getElementById('trendsList');
        const infoGridEl = document.getElementById('infoGrid');
        const countrySelectorEl = document.getElementById('countrySelector');
        
        let selectedCountries = ['KR', 'US', 'JP'];
        let availableCountries = [];

        function showMessage(message, type = 'success') {
          messageEl.innerHTML = \`<div class="message show \${type}">\${message}</div>\`;
          messageEl.style.display = 'block';
          setTimeout(() => {
            messageEl.style.display = 'none';
          }, 5000);
        }

        function updateStatus(text, type = 'idle') {
          statusEl.textContent = text;
          statusEl.className = 'status ' + type;
        }

        async function loadCountries() {
          try {
            const response = await fetch('/api/countries');
            const data = await response.json();
            
            if (data.success) {
              availableCountries = data.countries;
              renderCountrySelector();
              document.getElementById('countryCount').textContent = data.total;
            }
          } catch (error) {
            console.error('국가 목록 로드 실패:', error);
          }
        }

        function renderCountrySelector() {
          countrySelectorEl.innerHTML = availableCountries
            .map(country => \`
              <div class="country-tag \${selectedCountries.includes(country.code) ? 'active' : ''}" 
                   onclick="toggleCountry('\${country.code}')">
                <span>\${country.flag} \${country.name}</span>
              </div>
            \`).join('');
        }

        function toggleCountry(code) {
          if (selectedCountries.includes(code)) {
            selectedCountries = selectedCountries.filter(c => c !== code);
          } else {
            selectedCountries.push(code);
          }
          renderCountrySelector();
        }

        async function manualTrigger() {
          if (selectedCountries.length === 0) {
            showMessage('최소 하나 이상의 국가를 선택해주세요', 'error');
            return;
          }

          updateStatus('실행 중...', 'loading');
          const secret = prompt('시크릿 키를 입력하세요 (개발 모드에서는 입력 안 해도 됨):');
          
          try {
            const countries = selectedCountries.join(',');
            const url = secret 
              ? \`/api/trigger-trends?secret=\${secret}&countries=\${countries}\`
              : \`/api/trigger-trends?secret=development-secret&countries=\${countries}\`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
              updateStatus(\`✅ 완료: \${data.message}\`, 'success');
              showMessage(data.message, 'success');
              setTimeout(refreshTrends, 1000);
            } else {
              updateStatus('⚠️ 데이터 수집 실패', 'error');
              showMessage(data.message || data.error, 'error');
            }
          } catch (error) {
            updateStatus('❌ 오류: ' + error.message, 'error');
            showMessage('오류가 발생했습니다: ' + error.message, 'error');
          }
        }

        async function refreshTrends() {
          updateStatus('데이터 로딩 중...', 'loading');
          
          try {
            const response = await fetch('/api/trends');
            const data = await response.json();

            if (data.success) {
              renderTrends(data.data);
              updateStatus('✅ 최신 상태', 'success');
              document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ko-KR');
            } else {
              updateStatus('❌ 데이터 로드 실패', 'error');
            }
          } catch (error) {
            updateStatus('❌ 오류: ' + error.message, 'error');
          }
        }

        function renderTrends(grouped) {
          if (Object.keys(grouped).length === 0) {
            trendsListEl.innerHTML = \`
              <div style="grid-column: 1/-1;">
                <div class="empty-state">
                  <div class="empty-state-icon">📊</div>
                  <p>아직 데이터가 없습니다. 위의 '선택한 국가 수집' 버튼을 클릭하세요.</p>
                </div>
              </div>
            \`;
            return;
          }

          let html = '';
          Object.values(grouped).forEach(countryData => {
            const countryInfo = availableCountries.find(c => c.code === countryData.country_code) || {};
            html += \`
              <div class="country-section">
                <div class="country-header">
                  <span class="country-flag">\${countryInfo.flag || '🌍'}</span>
                  <div>
                    <div>\${countryData.country_name}</div>
                    <div class="country-info">\${countryData.language || 'Unknown'}</div>
                  </div>
                </div>
                <div class="trends-list">
                  \${countryData.trends.slice(0, 10).map(trend => \`
                    <div class="trend-item">
                      <div class="trend-rank">#\${trend.rank}</div>
                      <div class="trend-keyword">\${trend.keyword}</div>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \`;
          });

          trendsListEl.innerHTML = html;
        }

        function toggleInfo() {
          infoGridEl.style.display = infoGridEl.style.display === 'none' ? 'grid' : 'none';
        }

        // 페이지 로드
        window.addEventListener('load', () => {
          loadCountries();
          setTimeout(refreshTrends, 500);
        });

        // 매 5분마다 자동 새로고침
        setInterval(refreshTrends, 5 * 60 * 1000);
      </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
