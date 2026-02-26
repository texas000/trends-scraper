# Google Trends 크론 작업 - Vercel 구현

한국 Google Trends의 트렌딩 검색어를 매일 자동으로 수집하여 Neon 데이터베이스에 저장하는 Vercel 크론 작업입니다.

## 📋 개요

- **언어**: Node.js (JavaScript)
- **플랫폼**: Vercel Serverless Functions
- **데이터베이스**: Neon PostgreSQL
- **스케줄**: 매일 오전 9시 (KST)
- **데이터 소스**: Google Trends (한국)

## 🚀 빠른 시작

### 1. Neon 데이터베이스 설정

1. [Neon Console](https://console.neon.tech)에서 회원가입
2. 새 프로젝트 생성
3. 데이터베이스 연결 문자열 복사

```
postgresql://user:password@ep-your-project.neon.tech/dbname
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음을 입력:

```env
NEON_DATABASE_URL=postgresql://user:password@ep-your-project.neon.tech/dbname
CRON_SECRET=your-secret-key-here
```

### 3. 의존성 설치 및 배포

```bash
npm install
vercel deploy
```

### 4. Vercel 대시보드에서 환경 변수 설정

Vercel 프로젝트 Settings → Environment Variables에서:
- `NEON_DATABASE_URL` 추가
- `CRON_SECRET` 추가 (선택사항)

## 📡 API 엔드포인트

### 대시보드 (UI)
```
GET https://your-project.vercel.app/
```
트렌드를 시각화하고 수동으로 크론을 실행할 수 있는 대시보드

### 트렌드 조회
```
GET https://your-project.vercel.app/api/trends
GET https://your-project.vercel.app/api/trends?period=today
GET https://your-project.vercel.app/api/trends?limit=50
```

**응답 예시:**
```json
{
  "success": true,
  "period": "recent",
  "total": 45,
  "data": {
    "2024-01-15": [
      {
        "keyword": "검색어",
        "rank": 1,
        "saved_at": "2024-01-15T09:00:00.000Z",
        "trend_value": "상향"
      }
    ]
  }
}
```

### 수동 크론 실행
```
GET https://your-project.vercel.app/api/trigger-trends?secret=YOUR_SECRET
```

**응답 예시:**
```json
{
  "success": true,
  "message": "20개의 트렌드 키워드 저장 완료",
  "data": {
    "saved": 20,
    "samples": [...],
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

## 🔧 프로젝트 구조

```
trends-scraper/
├── api/
│   ├── cron/
│   │   └── trends.js          # 자동 크론 작업 엔드포인트
│   ├── index.js               # 대시보드 UI
│   ├── trends.js              # 트렌드 조회 API
│   └── trigger-trends.js      # 수동 실행 API
├── lib/
│   ├── trends-scraper.js      # Google Trends 스크래핑
│   └── db.js                  # Neon 데이터베이스 연결
├── .env.local                 # 환경 변수 (로컬 개발용)
├── vercel.json               # Vercel 설정 (크론 스케줄)
└── package.json             # 프로젝트 설정
```

## ⚙️ 크론 스케줄 설정

`vercel.json`에서 스케줄 수정:

```json
{
  "crons": [
    {
      "path": "/api/cron/trends",
      "schedule": "0 9 * * *"  // 매일 09:00 UTC
    }
  ]
}
```

**스케줄 형식 (cron 표현식):**
- `0 9 * * *` - 매일 09:00
- `0 */6 * * *` - 6시간마다
- `0 0 * * 1` - 매주 월요일 00:00
- [Cron 표현식 가이드](https://crontab.guru/)

## 🧪 로컬 개발

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 시작
npm run dev

# 대시보드 접속
http://localhost:3000

# 수동 크론 실행 (개발 모드)
http://localhost:3000/api/trigger-trends?secret=development-secret
```

## 📊 데이터베이스 스키마

```sql
CREATE TABLE trends (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  rank INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trend_value VARCHAR(50)
);

CREATE INDEX idx_saved_at ON trends(saved_at DESC);
CREATE INDEX idx_keyword ON trends(keyword);
```

## 🔒 보안

- Vercel Cron은 자동으로 `Authorization` 헤더를 추가
- 수동 실행 시 `CRON_SECRET`으로 보호
- 환경 변수는 Vercel 대시보드에서 관리

## 🐛 문제 해결

### 데이터가 저장되지 않음
1. Neon 연결 문자열 확인
2. 데이터베이스 권한 확인
3. Vercel 로그 확인: `vercel logs`

### Google Trends 스크래핑 실패
- Google이 요청을 차단할 수 있음
- User-Agent 업데이트 필요
- 요청 간격 조절 필요

### 크론이 실행되지 않음
- Vercel Pro 이상 플랜 필요
- `vercel.json`의 `crons` 섹션 확인
- Vercel 대시보드에서 Cron Jobs 활성화 확인

## 📈 모니터링

Vercel 대시보드에서:
1. Deployments → Functions 탭에서 호출 횟수 확인
2. Logs에서 실행 기록 확인
3. Settings → Environment Variables에서 설정 관리

## 📝 라이선스

MIT

## 🤝 기여

버그 리포트 및 개선 제안은 언제든 환영합니다!
