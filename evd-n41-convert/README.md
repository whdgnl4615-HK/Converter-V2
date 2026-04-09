# N41 Converter App

EVD / 외부 파일을 N41 Import 형식으로 변환하는 웹 앱.
Sales Order / Purchase Order / Style / Customer / Inventory 5개 모듈 지원.

---

## 🚀 로컬 실행 방법

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. **SQL Editor** → `supabase_schema.sql` 전체 내용 붙여넣고 실행
3. **Project Settings → API** 에서 `URL`과 `anon public key` 복사

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 수정:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. 패키지 설치 & 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

---

## 👤 첫 관리자 계정 만들기

1. 앱에서 이메일/비밀번호로 회원가입
2. Supabase **SQL Editor**에서 실행:
```sql
update public.profiles
set role = 'admin'
where email = 'your@email.com';
```
3. 앱 새로고침 → 관리자 메뉴 활성화

---

## 🗂️ 기능 구조

```
로그인 / 회원가입 (이메일)
└── 관리자 승인 필요 (초대 이메일 또는 수동 승인)

사이드바
├── Sales Order     → SO 파일 → N41 Sales Order Import
├── Purchase Order  → PO 파일 → N41 Purchase Order Import
├── Style           → Style 파일 → N41 Style Import
├── Customer        → Customer 파일 → N41 Customer Import
├── Inventory       → Inventory 파일 → N41 Inventory Import
└── Admin (관리자만)
    ├── 유저 목록 & 권한 관리
    ├── 승인 대기 유저 승인/거절
    └── 이메일 초대 발송

각 모듈 공통 흐름:
① 파일 업로드 (.xlsx / .csv)
② 컬럼 매핑 편집 (N41 컬럼 ← 소스 컬럼)
   - 변환 규칙: date:MM/DD/YYYY | map:A=X,B=Y | prefix:WH- | upper/lower
   - 고정값, 자동 행번호, 계산값 지원
③ 미리보기 → N41 Import xlsx 다운로드

템플릿:
- 매핑 설정을 이름 붙여 저장 (Supabase DB, 유저별 분리)
- 기본 템플릿 설정 시 파일 업로드 후 자동 적용
- JSON 내보내기/가져오기로 팀원 공유
```

---

## 📋 N41 Import 컬럼 수

| 모듈 | 컬럼 수 |
|------|--------|
| Sales Order | 57 |
| Purchase Order | 37 |
| Style | 240 |
| Customer | 113 |
| Inventory | 18 |

---

## 🛠️ 기술 스택

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Excel 처리**: SheetJS (xlsx)
- **라우팅**: React Router v6
- **언어**: 한국어 / English 전환
