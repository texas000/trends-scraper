# 🚀 Google Trends 크론 작업 - 시작하기

완전한 Vercel + Neon 기반의 Google Trends 자동 크롤러가 준비되었습니다!

## 📦 프로젝트 내용

### ✅ 포함된 기능

1. **자동 크론 작업** - 매일 오전 9시에 자동 실행
2. **Google Trends 크롤링** - 한국 실시간 검색어 수집
3. **Neon 데이터 저장** - PostgreSQL에 자동 저장
4. **웹 대시보드** - 실시간 모니터링 UI
5. **REST API** - 저장된 데이터 조회

## 🏗️ 프로젝트 구조

```
trends-scraper/
├── 📄 package.json              # 의존성 및 프로젝트 설정
├── 📄 vercel.json              # Vercel 크론 스케줄 설정
├── 📄 README.md                # 상세 문서
├── 📄 DEPLOYMENT.md            # 배포 가이드
│
├── 📁 api/                     # Vercel Serverless Functions
│   ├── index.js                # 🎨 대시보드 UI
│   ├── trends.js               # 📊 트렌드 조회 API
│   ├── trigger-trends.js       # 🎯 수동 실행 API
│   └── cron/
│       └── trends.js           # ⚙️ 자동 크론 작업
│
├── 📁 lib/                     # 라이브러리 & 유틸
│   ├── trends-scraper.js       # 🔍 Google Trends 스크래핑
│   └── db.js                   # 🗄️ Neon DB 연결 & 쿼리
│
└── 📄 .env.local              # 환경 변수 (Git 제외)
```

## ⚡ 빠른 시작 (3단계)

### 1️⃣ Neon 데이터베이스 준비 (5분)

```bash
# 1. https://neon.tech 접속
# 2. 회원가입 & 프로젝트 생성
# 3. 연결 문자열 복사
# 예: postgresql://user:password@ep-xxxxx.neon.tech/dbname
```

### 2️⃣ Vercel에 배포 (2분)

```bash
# 터미널에서
npm install
vercel deploy

# 프롬프트 질문에 답변
# - Project name: trends-scraper
# - Framework: Other
```

### 3️⃣ 환경 변수 설정 (3분)

Vercel 대시보드 → Settings → Environment Variables

```
NEON_DATABASE_URL = postgresql://user:password@...
CRON_SECRET = my-secret-key (선택사항)
```

**완료!** 이제 매일 오전 9시에 자동으로 실행됩니다.

---

## 🎯 각 파일의 역할

### API Endpoints

| 경로 | 역할 | 예시 |
|------|------|------|
| `/` | 🎨 대시보드 UI | `https://app.vercel.app/` |
| `/api/trends` | 📊 저장된 트렌드 조회 | GET 데이터 조회 |
| `/api/trigger-trends` | 🎯 수동 크론 실행 | `?secret=KEY` |
| `/api/cron/trends` | ⚙️ 자동 크론 (시스템) | 매일 09:00 자동 |

### 핵심 모듈

**lib/trends-scraper.js**
- Google Trends에서 검색어 수집
- HTML 파싱으로 실시간 데이터 추출

**lib/db.js**
- Neon PostgreSQL 연결
- 데이터 저장 & 조회 쿼리

**api/cron/trends.js**
- Vercel Cron이 호출하는 메인 작업
- 자동으로 매일 실행

---

## 🧪 테스트하기

### 로컬 개발 모드

```bash
npm run dev
# http://localhost:3000 접속
```

### 수동 크론 실행

```bash
# 개발 모드 (secret 불필요)
curl "http://localhost:3000/api/trigger-trends?secret=development-secret"

# 프로덕션 (secret 필요)
curl "https://app.vercel.app/api/trigger-trends?secret=YOUR_SECRET"
```

### 데이터 조회

```bash
# 최근 20개
curl "https://app.vercel.app/api/trends"

# 오늘의 트렌드
curl "https://app.vercel.app/api/trends?period=today"

# 최근 50개
curl "https://app.vercel.app/api/trends?limit=50"
```

---

## 📊 데이터 확인

### Neon에서 직접 확인

```sql
-- Neon SQL Editor에서 실행
SELECT * FROM trends ORDER BY saved_at DESC LIMIT 10;

-- 날짜별 통계
SELECT DATE(saved_at) as date, COUNT(*) as count 
FROM trends 
GROUP BY DATE(saved_at);
```

### 대시보드 UI

`https://app.vercel.app/` 에서:
- 📈 최근 트렌드 시각화
- 🔄 실시간 데이터 새로고침
- 🚀 수동 크론 실행 버튼

---

## ⚙️ 커스터마이징

### 크론 스케줄 변경

`vercel.json` 수정:

```json
{
  "crons": [
    {
      "path": "/api/cron/trends",
      "schedule": "0 */6 * * *"  // 6시간마다
    }
  ]
}
```

### 데이터 조회 한계 변경

`api/trends.js`의 `limit` 기본값 수정:

```javascript
const { period = 'recent', limit = 50 } = req.query;
                                               ^^
```

### Google Trends 지역 변경

`lib/trends-scraper.js`의 URL 수정:

```javascript
// 한국
const url = 'https://trends.google.com/trending?geo=KR';

// 미국
const url = 'https://trends.google.com/trending?geo=US';

// 일본
const url = 'https://trends.google.com/trending?geo=JP';
```

---

## 🔒 보안 고려사항

✅ **이미 적용된 보안:**

- Vercel Cron은 자동으로 Authorization 헤더 추가
- 수동 실행 시 `CRON_SECRET`으로 보호
- 환경 변수는 Vercel 대시보드에서 안전하게 관리
- 데이터베이스 연결 정보는 환경 변수로 분리

⚠️ **권장 추가 조치:**

1. CRON_SECRET을 강력한 무작위 문자열로 설정
2. Neon에서 데이터베이스 사용자 권한 최소화
3. 정기적으로 로그 확인 (Vercel 대시보드)

---

## 📈 다음 단계

### Immediate (지금 바로)
- [ ] Neon 데이터베이스 생성
- [ ] Vercel에 배포
- [ ] 환경 변수 설정
- [ ] 대시보드 확인

### Short-term (이번 주)
- [ ] 크론이 제대로 실행되는지 확인
- [ ] 데이터가 저장되는지 확인
- [ ] API 응답 확인

### Long-term (다음 달)
- [ ] 데이터 분석 및 통계 추가
- [ ] 이메일 알림 설정
- [ ] Slack 통합
- [ ] 트렌드 비교 기능

---

## 🆘 문제 해결

### "Database connection failed"

```bash
# 1. 환경 변수 확인
vercel env list

# 2. 연결 문자열 테스트
psql "postgresql://user:password@ep-xxx.neon.tech/dbname"

# 3. 재배포
vercel deploy --prod
```

### "Google Trends 데이터 없음"

- Google의 요청 차단일 수 있음
- User-Agent를 최신 브라우저 값으로 업데이트
- 요청 간격 증가

### "크론이 실행되지 않음"

- Vercel Pro 플랜 필요 (무료 플랜은 지원 안 함)
- `vercel.json`의 `crons` 섹션 확인
- 재배포 필요: `vercel deploy --prod`

---

## 📚 참고 자료

| 항목 | 링크 |
|------|------|
| 전체 문서 | [README.md](./README.md) |
| 배포 가이드 | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Vercel 문서 | https://vercel.com/docs |
| Neon 문서 | https://neon.tech/docs |
| Cron 표현식 | https://crontab.guru |

---

## 🎉 축하합니다!

완전히 작동하는 Google Trends 크롤러를 갖추게 되었습니다!

**다음 명령어로 시작하세요:**

```bash
npm install && npm run dev
```

질문이나 문제가 있으면 언제든지 연락하세요! 🚀
