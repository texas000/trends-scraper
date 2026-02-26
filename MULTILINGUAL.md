# 다국어 Google Trends 크론 - 사용 가이드

## 🌍 지원하는 국가 (20개)

| 코드 | 국가 | 언어 |
|------|------|------|
| KR | 한국 | 한국어 |
| US | 미국 | 영어 |
| JP | 일본 | 일본어 |
| CN | 중국 | 중국어 |
| GB | 영국 | 영어 |
| DE | 독일 | 독일어 |
| FR | 프랑스 | 프랑스어 |
| IN | 인도 | 힌디어 |
| BR | 브라질 | 포르투갈어 |
| MX | 멕시코 | 스페인어 |
| ES | 스페인 | 스페인어 |
| IT | 이탈리아 | 이탈리아어 |
| CA | 캐나다 | 영어 |
| AU | 호주 | 영어 |
| NL | 네덜란드 | 네덜란드어 |
| RU | 러시아 | 러시아어 |
| SG | 싱가포르 | 영어 |
| HK | 홍콩 | 중국어 |
| TW | 대만 | 중국어 |
| TH | 태국 | 태국어 |

## 🚀 빠른 시작

### 웹 대시보드에서
```
https://your-project.vercel.app/
```

- 국가를 클릭하여 선택/해제
- "선택한 국가 수집" 버튼 클릭
- 자동으로 데이터 수집 및 저장

### API로 수집
```bash
# 한국, 미국, 일본
curl "https://your-project.vercel.app/api/trigger-trends?secret=YOUR_SECRET&countries=KR,US,JP"
```

## 📊 API 엔드포인트

### 지원하는 국가 목록
```
GET /api/countries
```

### 트렌드 조회
```
GET /api/trends                    # 모든 국가
GET /api/trends?country=KR         # 한국만
GET /api/trends?country=US&limit=50  # 미국, 50개 제한
```

### 수동 수집
```
GET /api/trigger-trends?secret=KEY&countries=KR,US,JP
```

## ⚙️ 환경 변수

```env
TREND_COUNTRIES=KR,US,JP    # 기본 수집 국가
NEON_DATABASE_URL=postgresql://...
CRON_SECRET=your-secret
```

## 📖 상세 문서

더 자세한 내용은 [MULTILINGUAL.md](./MULTILINGUAL.md) 참조

