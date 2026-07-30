// =====================
// 스트라이크 존 및 타자/배트 드로잉 함수
// =====================
function drawStrikeZone(w, h) {
    ctxRef.save();
    // 스트라이크존 영역 배경 추가로 시인성 확보
    ctxRef.fillStyle = 'rgba(30, 168, 87, 0.12)';
    ctxRef.fillRect(w / 2 - 70, h * 0.58, 140, 130);

    ctxRef.beginPath();
    ctxRef.strokeStyle = 'rgba(30, 168, 87, 0.9)';
    ctxRef.lineWidth = 3;
    ctxRef.setLineDash([6, 4]);
    ctxRef.strokeRect(w / 2 - 70, h * 0.58, 140, 130);
    ctxRef.setLineDash([]);
    ctxRef.restore();
}

function drawBatterAndBat(w, h, p) {
    ctxRef.save();
    
    const bx = w / 2 + 75;
    const by = h * 0.40;

    // 1. 타자 그림자
    ctxRef.beginPath();
    ctxRef.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctxRef.ellipse(bx + 20, by + 235, 35, 10, 0, 0, Math.PI * 2);
    ctxRef.fill();

    // 2. 타자 몸체 (유니폼 형태감 부여)
    ctxRef.fillStyle = '#f0f0f0';
    ctxRef.beginPath();
    ctxRef.roundRect(bx, by + 40, 50, 110, [8, 8, 4, 4]);
    ctxRef.fill();
    ctxRef.lineWidth = 2;
    ctxRef.strokeStyle = '#d0d0d0';
    ctxRef.stroke();

    // 유니폼 소매 및 바지 라인
    ctxRef.fillStyle = '#1e3a8a'; // 팀 컬러 포인트 (남색)
    ctxRef.fillRect(bx - 5, by + 40, 60, 20); // 상의 어깨/소매
    ctxRef.fillRect(bx + 10, by + 145, 30, 80); // 하의

    // 3. 머리 및 헬멧 (챙이 있는 야구 헬멧 디자인)
    // 머리 피부톤
    ctxRef.fillStyle = '#fde0dc';
    ctxRef.beginPath();
    ctxRef.arc(bx + 25, by + 18, 16, 0, Math.PI * 2);
    ctxRef.fill();

    // 야구 헬멧 (입체적 곡선)
    ctxRef.fillStyle = '#1e3a8a';
    ctxRef.beginPath();
    ctxRef.arc(bx + 25, by + 14, 18, Math.PI, Math.PI * 2);
    ctxRef.fill();
    // 헬멧 챙
    ctxRef.fillRect(bx + 20, by + 12, 18, 5);

    // 4. 배트 드로잉 (스윙 애니메이션 연동)
    ctxRef.save();
    ctxRef.translate(bx + 5, by + 110);
    
    let swingAngle = -0.5; // 기본 대기 자세
    if (baseball.swingAnim > 0) {
        swingAngle = -2.5 + (1 - baseball.swingAnim) * 3.0; // 휘둘러 나가는 각도
    }
    ctxRef.rotate(swingAngle);

    // 손잡이 및 그립
    ctxRef.fillStyle = '#e2e8f0';
    ctxRef.fillRect(-4, -80, 8, 40);
    
    // 배트 몸체 (우드톤 그라데이션 느낌)
    ctxRef.fillStyle = '#d97706';
    ctxRef.fillRect(-6, -130, 12, 55); 
    
    // 배트 헤드
    ctxRef.fillStyle = '#f59e0b';
    ctxRef.fillRect(-8, -145, 16, 18);  
    ctxRef.restore();

    ctxRef.restore();
}
