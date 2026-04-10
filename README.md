# ecommerce-atf-compare

Playwright로 모바일 홈 화면을 캡처해 비교하는 스크립트(`compare.ts`)와, **실시간 iframe**으로 5개 이커머스 사이트를 나란히 보는 라이브 대시보드(`index.html`)가 있습니다.

## 라이브 대시보드

`index.html`은 11번가, 쿠팡, G마켓, 네이버쇼핑, 무신사를 **가로로 배치**하고, 각 영역은 **375px × 812px** 고정 크기의 `<iframe>`으로 실제 사이트를 불러옵니다.

### 실행 스크립트

프로젝트 루트에서:

```bash
chmod +x run-live-dashboard.sh
./run-live-dashboard.sh
```

또는 npm:

```bash
npm run live
```

macOS에서는 **Google Chrome**(또는 Chromium)이 새 **임시 프로필**로 열리며, iframe 차단 완화에 도움이 되는 플래그가 붙습니다.

---

## iframe이 비어 보일 때 (보안 정책)

많은 사이트는 **다른 출처의 페이지 안에 끼워 넣는 것**을 막습니다. 대표적으로 다음 HTTP 응답 헤더가 사용됩니다.

| 헤더 | 역할 |
|------|------|
| `X-Frame-Options` | `DENY`, `SAMEORIGIN` 등으로 iframe 삽입 제한 |
| `Content-Security-Policy`의 `frame-ancestors` | 어떤 부모에 임베드될 수 있는지 제한 |

브라우저는 이 정책을 **강제**하므로, 대시보드만으로는 항상 5개 사이트가 동시에 보이지 않을 수 있습니다.

### 1. Chromium / Chrome을 보안 완화 플래그로 실행 (로컬 전용)

**일상 사용 중인 Chrome 프로필에서는 절대 사용하지 마세요.** 반드시 **전용 `--user-data-dir`**(아래 스크립트가 임시 폴더를 씁니다)로만 실행하는 것을 권장합니다.

#### macOS (터미널)

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$HOME/tmp/chrome-live-dashboard" \
  --disable-web-security \
  --disable-features=IsolateOrigins,site-per-process \
  "file:///절대/경로/ecommerce-atf-compare/index.html"
```

`절대/경로`는 본인 PC의 `index.html` 위치로 바꿉니다.

#### Windows (명령 프롬프트 예시)

```bat
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --user-data-dir=%TEMP%\chrome-live-dashboard ^
  --disable-web-security ^
  --disable-features=IsolateOrigins,site-per-process ^
  file:///C:/Users/사용자명/Desktop/ecommerce-atf-compare/index.html
```

#### Linux (예시)

```bash
google-chrome \
  --user-data-dir="/tmp/chrome-live-dashboard" \
  --disable-web-security \
  --disable-features=IsolateOrigins,site-per-process \
  "file:///home/사용자명/ecommerce-atf-compare/index.html"
```

> **한계:** 위 플래그는 주로 **동일 출처 정책 완화** 등에 쓰이며, **서버가 보낸 `X-Frame-Options` / `frame-ancestors`를 항상 무시하지는 않을 수 있습니다.** 그 경우 아래 확장·프록시 쪽을 검토해야 합니다.

### 2. 브라우저 확장 프로그램 (헤더 조작)

응답에서 `X-Frame-Options` 등을 제거·완화하는 확장은 **Chrome 웹 스토어 / Firefox 부가 기능**에서 `X-Frame-Options`, `frame ancestors`, `CSP` 등으로 검색할 수 있습니다. 예시 유형은 다음과 같습니다.

- **응답 헤더를 삭제하거나 수정**하는 확장 (ModHeader 계열, “Ignore X-Frame-Options”류 이름의 도구 등)

**주의:**

- 출처가 불분명한 확장은 피하고, 리뷰·권한을 확인한 뒤 사용하세요.
- 이런 도구는 **본인이 통제하는 로컬 분석·비교 용도**로만 쓰고, 업무·금융·로그인 세션과 격리된 프로필에서 사용하는 것이 안전합니다.
- 사이트 이용약관·법률을 위반할 수 있는 용도(무단 재게시, 우회 접속 등)에는 사용하지 마세요.

### 3. 그 외 방법 (고급)

- **역방향 프록시**(로컬에서만)로 특정 도메인 응답 헤더를 제거한 뒤 iframe의 `src`를 프록시 주소로 바꾸는 방식은 구성이 복잡하고, 법적·약관 이슈가 있을 수 있어 이 README에서는 단계만 언급합니다.

---

## 캡처 비교 (`compare.ts`)

스크린샷 기반 비교는 다음을 실행합니다.

```bash
npm run compare
```

생성물: `captures/*.png`, **`capture-comparison.html`** (라이브용 `index.html`과 파일명이 겹치지 않도록 분리됨)
