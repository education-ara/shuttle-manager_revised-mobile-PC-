# 🚌 아카데미 셔틀 관리 시스템

학원 셔틀 동승 선생님의 **근무일지 입력** 및 **급여 자동 계산** 웹앱입니다.

---

## ✨ 주요 기능

| 구분 | 기능 |
|------|------|
| 선생님 | 월별 근무일지 입력 (출근·첫차·하차·원도착·메모) |
| 선생님 | 입력 즉시 자동 저장 (autosave) |
| 선생님 | 누락 필드 경고 표시 |
| 관리자 | 선생님 추가·수정·삭제 및 시급 설정 |
| 관리자 | 월별 급여 자동 계산 (보정 출근 로직 포함) |
| 관리자 | 출석 로그 전체 조회 |
| 관리자 | 엑셀 다운로드 |
| 공통 | 실시간 DB 저장 (Supabase) |
| 공통 | 반응형 디자인 (모바일/태블릿/PC) |

---

## 🚀 배포 방법 (10분 완성)

### 1단계: Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 → **New Project** 생성
2. **SQL Editor** 탭에서 `supabase_schema.sql` 전체 내용 실행
3. **Project Settings > API** 에서 다음 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2단계: Vercel 배포

```bash
# 1. GitHub에 Push
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_NAME/shuttle-app.git
git push -u origin main

# 2. vercel.com 접속 → Import Git Repository
# 3. Environment Variables 설정:
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password

# 4. Deploy 클릭 → 완료!
```

### 로컬 개발

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase 값 입력

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## 📁 프로젝트 구조

```
shuttle-app/
├── app/
│   ├── page.tsx                # 선생님 선택 화면 (홈)
│   ├── teacher/
│   │   └── page.tsx            # 근무일지 입력 화면
│   └── admin/
│       ├── layout.tsx          # 관리자 레이아웃 + 인증 가드
│       ├── page.tsx            # 대시보드 개요
│       ├── teachers/page.tsx   # 선생님 관리 (CRUD)
│       ├── payroll/page.tsx    # 급여 계산
│       └── logs/page.tsx       # 출석 로그 조회
├── components/
│   └── AdminLogin.tsx          # 관리자 로그인 UI
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   ├── payroll.ts              # 급여 계산 핵심 로직
│   ├── excel.ts                # 엑셀 내보내기
│   └── auth.ts                 # 관리자 인증 (sessionStorage)
├── types/
│   └── index.ts                # TypeScript 타입 정의
├── supabase_schema.sql         # DB 스키마 (Supabase에 실행)
└── .env.local.example          # 환경변수 예시
```

---

## 💰 급여 계산 로직

```
1. 보정 출근 시간 계산
   diff = first_bus_time - check_in_time
   if diff > 20분:
       adjusted_check_in = first_bus_time - 20분
   else:
       adjusted_check_in = check_in_time

2. 일일 근무시간
   work_hours = arrival_time - adjusted_check_in

3. 월 총 근무시간
   total_hours = Σ(평일 근무시간)

4. 월 급여
   total_salary = total_hours × hourly_rate
```

**예시:**
- 첫 차 출발: 09:00
- 출근 입력: 08:00 (60분 전) → 보정: 08:40 (20분 전)
- 원 도착: 18:00
- 근무시간: 18:00 - 08:40 = 9시간 20분 = 9.33h

---

## 🗄️ DB 구조

### teachers

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 자동 생성 |
| name | TEXT | 선생님 이름 |
| start_date | DATE | 근무 시작일 |
| hourly_rate | NUMERIC | 시급 (원) |
| created_at | TIMESTAMPTZ | 생성 시각 |

### work_logs

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | 자동 생성 |
| teacher_id | UUID FK | teachers.id |
| work_date | DATE | 근무일 |
| check_in_time | TIME | 출근 시간 |
| first_bus_time | TIME | 첫 차량 출발 |
| last_dropoff_time | TIME | 마지막 하차 |
| arrival_time | TIME | 원 도착 |
| memo | TEXT | 메모 |
| created_at | TIMESTAMPTZ | 생성 시각 |
| updated_at | TIMESTAMPTZ | 수정 시각 (자동) |

> `(teacher_id, work_date)` UNIQUE 제약 → 하루 1기록 보장

---

## 🔐 보안

- **관리자 페이지**: `sessionStorage` 기반 비밀번호 인증
- **급여 계산**: 관리자 화면에서만 접근 가능
- **선생님 화면**: 시급·계산값 완전 노출 금지
- **환경변수**: `NEXT_PUBLIC_ADMIN_PASSWORD`로 비밀번호 설정
- **Supabase RLS**: Row Level Security 활성화

> ⚠️ 프로덕션에서는 더 강력한 인증 (Supabase Auth 등) 도입을 권장합니다.

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL) |
| 날짜 처리 | date-fns |
| 엑셀 내보내기 | SheetJS (xlsx) |
| 배포 | Vercel |

---

## 📱 화면 구성

| URL | 화면 | 접근 |
|-----|------|------|
| `/` | 선생님 선택 | 공개 |
| `/teacher?id=...&month=...` | 근무일지 입력 | 공개 |
| `/admin` | 대시보드 | 비밀번호 |
| `/admin/teachers` | 선생님 관리 | 비밀번호 |
| `/admin/payroll` | 급여 계산 | 비밀번호 |
| `/admin/logs` | 출석 로그 | 비밀번호 |
