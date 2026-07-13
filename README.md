# 소비분석요정 MVP v1

현대카드 CSV 파일을 한 달에 한 번 업로드하면, 부부가 함께 이번 달 카드 소비를 빠르게 확인할 수 있는 모바일 우선 소비 분석 대시보드입니다.

이 앱은 가계부가 아니라 **월간 소비 흐름을 30초 안에 확인하는 대시보드**를 목표로 합니다.

## 현재 구현된 범위

MVP v1에 포함된 기능입니다.

- 이메일 로그인
- 남편/아내가 같은 household 데이터를 보는 구조
- 현대카드 CSV 업로드
- 거래 내역 가져오기 및 정규화
- Supabase Storage에 원본 CSV 보관
- 대시보드 지표
- 월별 추이, 카테고리, 상위 가맹점, 할부, 커피, 쿠팡 차트
- 월간 분석
- 가맹점 카테고리 학습

아래 기능은 아직 구현하지 않았고, 나중에 확장할 수 있게 준비만 해두었습니다.

- OCR
- PDF 가져오기
- 여러 카드사 지원
- 은행 계좌 연동
- AI 소비 추천

## 공개 저장소 주의사항

이 저장소는 public으로 올려도 되도록 구성했습니다.

절대 올리면 안 되는 값:

- Supabase `service_role` key
- Slack webhook
- 개인 API key
- 실제 `.env.local`
- 실제 `.env.production`

Git에 올라가도 되는 파일:

- `.env.example`

`.gitignore`에서 `.env`, `.env.*`, `dist`, `node_modules`는 제외하고 있습니다.

## 필요한 계정

실제 로그인, DB 저장, CSV 업로드까지 사용하려면 Supabase 계정이 필요합니다.

필요한 서비스:

- GitHub
- Supabase
- Vercel

Supabase 계정이 아직 없다면 먼저 Supabase에서 계정을 만들고 새 프로젝트를 생성하세요.

## 1. Supabase 프로젝트 만들기

1. Supabase에 로그인합니다.
2. `New project`를 선택합니다.
3. 프로젝트 이름은 예를 들어 `spending-analysis-fairy`로 만듭니다.
4. Database password를 안전한 곳에 따로 보관합니다.
5. Region은 가까운 지역을 선택합니다.
6. 프로젝트 생성이 끝날 때까지 기다립니다.

## 2. 데이터베이스 migration 실행

Supabase 프로젝트가 만들어지면 SQL Editor에서 아래 파일의 내용을 실행합니다.

파일 위치:

```text
supabase/migrations/20260713000000_mvp_v1.sql
```

실행 방법:

1. Supabase 대시보드로 이동합니다.
2. 왼쪽 메뉴에서 `SQL Editor`를 엽니다.
3. `New query`를 선택합니다.
4. 위 migration 파일 내용을 전체 복사해서 붙여넣습니다.
5. `Run`을 누릅니다.

이 migration은 아래 항목을 만듭니다.

- `users`
- `households`
- `household_members`
- `statements`
- `transactions`
- `categories`
- `merchant_rules`
- `monthly_income`
- `goals`
- RLS 정책
- `statements` Storage bucket
- 기본 카테고리

## 3. Supabase Auth 설정

Supabase에서 이메일 로그인을 사용합니다.

확인할 곳:

```text
Authentication > Providers > Email
```

설정:

- Email provider 활성화
- Magic Link 또는 OTP 이메일 로그인 허용

로컬 개발 중에는 다음 주소가 리다이렉트에 필요할 수 있습니다.

```text
http://127.0.0.1:3000
http://localhost:3000
```

Vercel 배포 후에는 Vercel 주소도 Redirect URL에 추가해야 합니다.

## 4. Supabase URL과 anon key 가져오기

Supabase 프로젝트에서 아래 메뉴로 이동합니다.

```text
Project Settings > API
```

복사할 값:

- Project URL
- anon public key

주의:

- `anon public key`만 사용합니다.
- `service_role key`는 절대 프론트엔드나 Vercel 환경 변수에 넣지 않습니다.

## 5. 로컬 환경 변수 만들기

프로젝트 폴더:

```powershell
cd C:\GYO\소비분석시스템
```

`.env.example`을 복사해서 `.env.local`을 만듭니다.

```powershell
Copy-Item .env.example .env.local
```

`.env.local` 내용을 아래처럼 채웁니다.

```env
VITE_SUPABASE_URL=여기에_Supabase_Project_URL
VITE_SUPABASE_ANON_KEY=여기에_Supabase_anon_public_key
```

예시의 `service_role` key가 아니라 반드시 `anon public key`를 넣어야 합니다.

## 6. 로컬 실행

의존성이 이미 설치되어 있으면 바로 실행합니다.

```powershell
npm run dev -- --port 3000
```

브라우저에서 엽니다.

```text
http://127.0.0.1:3000
```

처음 화면에서 이메일 로그인 링크를 요청합니다.

## 7. 첫 household 만들기

로그인 후 household가 없으면 설정 화면이 나옵니다.

첫 사용자는:

1. household 이름 입력
2. Husband 또는 Wife 선택
3. household 생성

배우자는:

1. 같은 앱에 이메일 로그인
2. 첫 사용자 설정 화면의 join code 입력
3. Husband 또는 Wife 선택
4. 같은 household 데이터에 참여

## 8. 현대카드 CSV 업로드

앱 하단의 `업로드` 메뉴에서 현대카드 CSV를 올립니다.

가져오는 항목:

- 날짜
- 가맹점명
- 금액
- 결제 방식
- 할부 개월
- 승인번호

업로드 후 자동으로 처리되는 것:

- UTF-8/EUC-KR CSV 디코딩
- 현대카드 컬럼 탐지
- 가맹점명 정규화
- 중복 명세서 방지
- 거래 저장
- 기존 merchant rule 기반 자동 분류

## 9. Merchant rule 학습

대시보드에서 거래 카테고리를 바꾸면 앱이 그 가맹점을 학습합니다.

예:

- `쿠팡`을 `Shopping`으로 변경
- 다음 CSV 가져오기부터 `쿠팡`은 자동으로 `Shopping` 처리

학습 데이터는 `merchant_rules` 테이블에 저장됩니다.

## 10. Vercel 배포

1. Vercel에 로그인합니다.
2. GitHub 저장소 `spending-analysis-fairy`를 import 합니다.
3. Framework는 Vite로 인식됩니다.
4. Environment Variables에 아래 두 개를 추가합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

5. Deploy를 실행합니다.
6. 배포된 Vercel URL을 Supabase Auth Redirect URL에 추가합니다.

## 11. GitHub Actions

`.github/workflows/ci.yml`에서 push 또는 PR 시 자동 빌드를 실행합니다.

실행 내용:

```powershell
npm ci
npm run build
```

GitHub Actions에는 Supabase key를 넣지 않아도 기본 빌드는 통과합니다.

## 12. 자주 막히는 부분

### Supabase 연결 필요 화면만 나올 때

`.env.local`이 없거나 값이 비어 있는 상태입니다.

확인할 것:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### 이메일 로그인 링크가 안 올 때

Supabase Auth Email provider 설정을 확인하세요.

확인할 곳:

```text
Authentication > Providers > Email
```

### 로그인 후 다시 앱으로 안 돌아올 때

Redirect URL 설정이 빠졌을 가능성이 큽니다.

로컬 개발 주소:

```text
http://127.0.0.1:3000
http://localhost:3000
```

배포 후에는 Vercel 주소도 추가해야 합니다.

### CSV 업로드가 실패할 때

확인할 것:

- Supabase migration이 정상 실행됐는지
- `statements` Storage bucket이 생성됐는지
- 로그인한 사용자가 household에 속해 있는지
- CSV가 현대카드 형식인지

### 공개 저장소에 키가 올라갈까 걱정될 때

현재 `.gitignore`가 아래 파일을 막습니다.

```text
.env
.env.*
dist
node_modules
```

실제 키는 `.env.local`에만 넣고 Git에 추가하지 마세요.

## 개발 명령어

```powershell
npm install
npm run dev -- --port 3000
npm run build
npm run typecheck
```

## 프로젝트 위치

로컬 프로젝트 경로:

```text
C:\GYO\소비분석시스템
```

GitHub 저장소:

```text
https://github.com/Ella-ki/spending-analysis-fairy
```