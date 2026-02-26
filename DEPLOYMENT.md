# Vercel + Neon 배포 가이드

## 1️⃣ Neon 데이터베이스 준비

### Neon 계정 생성 및 데이터베이스 설정

1. [neon.tech](https://neon.tech) 접속
2. **Sign Up** 클릭 → 가입 완료
3. 새 프로젝트 생성
4. 데이터베이스 연결 문자열 복사

```
postgresql://user:password@ep-xxxxx.neon.tech/dbname
```

## 2️⃣ GitHub 저장소 생성

1. [github.com](https://github.com) 에서 새 저장소 생성
2. 저장소 이름: `trends-scraper`
3. 로컬에서 추가:

```bash
cd trends-scraper
git init
git add .
git commit -m "Initial commit: Google Trends cron job"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trends-scraper.git
git push -u origin main
```

## 3️⃣ Vercel에 배포

### 방법 A: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel deploy
```

### 방법 B: Vercel 대시보드 사용

1. [vercel.com](https://vercel.com) 접속
2. **Add New** → **Project**
3. GitHub 저장소 선택
4. **Deploy**

## 4️⃣ 환경 변수 설정

Vercel 대시보드에서:

1. **Settings** → **Environment Variables**
2. 다음 변수 추가:

| 변수 이름 | 값 | 설명 |
|----------|-----|-----|
| `NEON_DATABASE_URL` | `postgresql://...` | Neon 연결 문자열 |
| `CRON_SECRET` | `your-secret-key` | 보안 키 (선택사항) |

3. 모든 환경에 적용: Production, Preview, Development 모두 체크

## 5️⃣ Cron Jobs 활성화

### Vercel Pro 플랜 필요

1. Vercel 대시보드의 좌측 메뉴에서 **Settings**
2. **Cron Jobs** 섹션 확인
3. `vercel.json`의 크론 설정이 자동으로 인식됨

## 6️⃣ 동작 확인

### 대시보드 접속

```
https://YOUR-PROJECT.vercel.app
```

모든 기능을 테스트할 수 있는 UI 대시보드가 표시됩니다.

### 수동 크론 실행 (테스트)

```bash
# CRON_SECRET을 설정한 경우
curl "https://YOUR-PROJECT.vercel.app/api/trigger-trends?secret=YOUR_SECRET"

# 개발 모드
curl "https://YOUR-PROJECT.vercel.app/api/trigger-trends?secret=development-secret"
```

### API 응답 확인

```json
{
  "success": true,
  "message": "20개의 트렌드 키워드 저장 완료",
  "data": {
    "saved": 20,
    "timestamp": "2024-01-15T09:00:00.000Z"
  }
}
```

## 7️⃣ 로그 확인

```bash
# Vercel 로그 실시간 확인
vercel logs

# 특정 함수의 로그
vercel logs /api/cron/trends
```

## ⏰ 크론 스케줄 수정

`vercel.json`을 수정하고 푸시:

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

### 자주 사용하는 스케줄

| 스케줄 | 의미 |
|--------|-----|
| `0 9 * * *` | 매일 09:00 |
| `0 */6 * * *` | 6시간마다 |
| `0 0 * * 1` | 매주 월요일 00:00 |
| `0 0 1 * *` | 매달 1일 00:00 |
| `*/15 * * * *` | 15분마다 |

[Cron 표현식 생성기](https://crontab.guru)

## 🧪 로컬 개발 및 테스트

### 개발 서버 시작

```bash
npm install
npm run dev
```

### 로컬에서 크론 테스트

```bash
# 개발 서버가 실행 중일 때
curl "http://localhost:3000/api/trigger-trends?secret=development-secret"
```

## 🔍 문제 해결

### 1. "NEON_DATABASE_URL not found" 오류

✅ **해결:**
- Vercel 대시보드의 Environment Variables에서 변수 확인
- 변수명이 정확한지 확인 (대소문자 구분)
- 재배포 필요

```bash
vercel deploy --prod
```

### 2. Google Trends 스크래핑 실패

✅ **원인:** Google의 요청 차단

✅ **해결:**
- 재시도 로직 추가
- User-Agent 업데이트
- 요청 간격 조절

```javascript
// lib/trends-scraper.js에서 User-Agent 업데이트
const headers = {
  'User-Agent': 'Mozilla/5.0 (latest browser)'
};
```

### 3. 크론이 실행되지 않음

✅ **확인사항:**
1. Vercel Pro 플랜인가?
   - Pro 플랜이 아니면 업그레이드 필요

2. `vercel.json`의 `crons` 섹션이 있는가?
   - 있으면 다시 배포

3. Vercel 대시보드에서 Deployments → Functions 확인
   - 함수가 배포되었는가?

```bash
# 재배포
vercel deploy --prod
```

### 4. 데이터베이스 연결 오류

✅ **확인:**

```bash
# 로컬에서 테스트
psql "postgresql://user:password@ep-xxx.neon.tech/dbname"
```

✅ **Neon에서 확인:**
- Neon 대시보드 → Connection String 재확인
- 파이어월 설정 (Neon은 자동 허용)

## 📊 모니터링

### Vercel 대시보드에서

1. **Analytics** → 함수 호출 횟수 및 응답 시간 확인
2. **Deployments** → 배포 이력 확인
3. **Functions** → 개별 함수 성능 확인

### Neon에서

1. Neon 대시보드 → SQL Editor
2. 쿼리 실행:

```sql
SELECT * FROM trends ORDER BY saved_at DESC LIMIT 20;
SELECT DATE(saved_at), COUNT(*) FROM trends GROUP BY DATE(saved_at);
```

## 🎯 다음 단계

### 1. 알림 설정
- 크론 실패 시 이메일 알림 추가
- Slack 통합

### 2. 데이터 분석
- 트렌드 변화 분석
- 주별/월별 통계

### 3. API 확장
- 특정 키워드 검색
- 트렌드 비교 기능
- CSV 내보내기

## 📞 지원

**Vercel 문제:**
- [Vercel Docs](https://vercel.com/docs)
- [Support](https://vercel.com/support)

**Neon 문제:**
- [Neon Docs](https://neon.tech/docs/introduction)
- [Discord](https://discord.com/invite/92chJzv)

---

🎉 **축하합니다! Vercel + Neon 배포 완료!**

이제 매일 오전 9시에 자동으로 Google Trends 데이터를 수집합니다.
