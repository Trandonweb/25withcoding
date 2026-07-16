function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('도트 로그라이크 모험기')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 추후 구글 시트에 점수나 진행상황을 저장하고 싶을 때 사용되는 함수 예시
function saveGameData(score, level) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), score, level]);
  return "저장 성공!";
}
