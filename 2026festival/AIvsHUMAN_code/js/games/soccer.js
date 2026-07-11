// ---------------- GAME LOGIC MATRIX (수정된 update 함수 일부) ----------------

        if (ballObj.z >= goalObj.z || pathIndex >= ballPath3D.length) {
            
            // 🎯 [정밀 히트박스 판정 시스템 도입]
            let kpW = keeperObj.width;
            let kpH = keeperObj.height;

            // 키퍼가 다이빙 중이면 몸이 옆으로 누우므로 가로/세로 히트박스 비율 변환
            if (isDiving) {
                kpW = keeperObj.width * 1.6;  // 옆으로 길어짐
                kpH = keeperObj.height * 0.6; // 높이는 낮아짐
            }

            // 키퍼의 3D 공간 상 좌/우/상/하 경계선 계산
            let keeperLeft   = keeperObj.x - (kpW / 2);
            let keeperRight  = keeperObj.x + (kpW / 2);
            let keeperBottom = keeperObj.y;
            let keeperTop    = keeperObj.y + kpH;

            // 공이 키퍼의 실제 신체 박스 안에 충돌했는지 정밀 검사
            let isSaved = (ballObj.x >= keeperLeft && ballObj.x <= keeperRight) && 
                          (ballObj.y >= keeperBottom && ballObj.y <= keeperTop);

            if (isSaved) {
                turnResultText = "MISS"; // 선방!
            } 
            // 골대 안으로 들어갔는지 판정
            else if (ballObj.x >= -goalObj.width/2 && ballObj.x <= goalObj.width/2 && 
                     ballObj.y <= goalObj.height && ballObj.y >= 0) {
                turnResultText = "GOAL";
                if (currentTurn === "HUMAN_ATTACK") humanScore++;
                else aiScore++;
            } else {
                turnResultText = "MISS"; // 골대 밖으로 나감
            }
        }
