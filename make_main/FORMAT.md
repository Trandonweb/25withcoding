# /make_main 저장 형식 및 편집기 개발 규칙

이 문서는 `25withcoding.kr/make_main/` 편집기와 메인 페이지 데이터의 저장 규격이다.
새 대화에서 이 파일과 `make_main/index.html`, `cloudflare/make-main-worker.js`,
`data/main-page.json`을 함께 확인하면 기존 구조를 유지하면서 편집기를 확장할 수 있다.

## 1. 저장소 경로

- `make_main/index.html`: 관리자용 캔버스 편집기
- `make_main/page1.json`, `page2.json` ...: 페이지별 편집 원본
- `make_main/assets/<filename>`: 편집기에서 업로드한 이미지
- `data/main-page.json`: 실제 홈페이지가 읽는 통합 데이터
- `cloudflare/make-main-worker.js`: Firebase 관리자 인증 후 GitHub Contents API를 중계하는 Worker

## 2. 페이지 JSON

각 `pageN.json`은 페이지 하나를 나타낸다.

```json
{
  "id": "page-id",
  "title": "페이지 이름",
  "enabled": true,
  "startAt": "",
  "endAt": "",
  "background": "#ffffff",
  "objects": [
    {
      "id": "object-id",
      "type": "text",
      "name": "제목",
      "text": "표시할 문구",
      "imageUrl": "",
      "linkUrl": "",
      "x": 12,
      "y": 15,
      "w": 40,
      "h": 18,
      "fontSize": 32,
      "color": "#17231b",
      "fill": "#e5f7eb",
      "radius": 8,
      "align": "center",
      "z": 1
    }
  ],
  "updatedAt": "ISO-8601 timestamp"
}
```

- `x`, `y`, `w`, `h`는 캔버스 기준 백분율이다.
- `type`은 현재 `text`, `rect`, `circle`, `line`, `image`, `button`을 사용한다.
- `enabled`, `startAt`, `endAt`은 페이지 노출 예약에 사용한다.
- 새 속성을 추가할 때 기존 속성을 삭제하거나 이름을 바꾸지 않는다.

## 3. 홈페이지 통합 데이터

`data/main-page.json`의 기존 `settings`, `slides`, `elements`를 보존한다.
편집기는 `canvasPages`만 갱신하고, 다음 메타데이터를 추가한다.

- `version`: 현재 캔버스 데이터 버전
- `canvasPages`: 페이지별 캔버스 개체를 홈페이지 렌더러가 사용할 수 있는 형태로 변환한 배열
- `updatedAt`, `updatedBy`: 마지막 저장 정보

기존 슬라이드나 일반 요소를 캔버스 저장 과정에서 초기화하지 않는다.

## 4. 이미지

업로드 파일은 `make_main/assets/`에 저장하고, 페이지 JSON에는
`/make_main/assets/<filename>` 경로를 기록한다. 이미지 업로드 제한은 4MB다.

## 5. 저장 동작

- 수동 저장: 저장 버튼 또는 `Ctrl+S`
- 자동 저장: 변경 후 짧은 대기 시간이 지나면 GitHub에 저장
- GitHub Contents API의 SHA를 사용해 기존 파일을 갱신한다.
- 저장 완료 상태는 모든 페이지 파일과 `data/main-page.json` 동기화가 끝난 뒤에만 표시한다.
- 저장 실패 시 편집 중인 데이터는 메모리에 유지하고 실패 상태를 표시한다.
- 프로젝트 JSON 내보내기/불러오기는 백업 및 다른 기기 간 이동에 사용한다.
- GitHub 커밋 기록은 서버에 저장된 파일의 버전 이력이다.

## 6. Worker 접근 제한

브라우저는 `https://make-main.trandonwebtoon.workers.dev/github/contents/<path>`로 요청한다.
Worker는 Firebase ID 토큰을 검증하고 Firestore `users/{학번}`의 `role`을 확인한 뒤
허용된 `make_main/` 및 `data/main-page.json` 경로만 GitHub에 전달한다.

허용 관리자 역할은 `admin`, `president`, `vice`, `committee_chair`이며
`/admin/js/auth.js`와 동일하게 유지한다.

## 7. 향후 수정 원칙

1. 기존 페이지 JSON과 통합 데이터의 필드를 먼저 읽는다.
2. 기존 데이터는 유지하고 필요한 속성만 추가한다.
3. Worker의 허용 경로와 브라우저의 저장 경로가 일치하는지 확인한다.
4. 페이지 JSON 저장, 통합 데이터 동기화, 재접속 불러오기를 모두 점검한다.
5. Worker 설정을 수정할 때 Secret, 바인딩, 호스트명, 트리거, 관찰성 설정을 먼저 조회하고
   코드 업로드 과정에서 기존 설정이 유지되는지 확인한다.
