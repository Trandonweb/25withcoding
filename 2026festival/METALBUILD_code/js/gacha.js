// ============================================================
// METAL BUILD
// gacha.js
// 파츠 뽑기 시스템
// ============================================================


// ============================================================
// 뽑기 비용
// ============================================================

const GACHA_COST = 50;


// ============================================================
// 뽑기 화면 열기
// ============================================================

function openGacha() {

    switchScreen('screen-gacha');

    const result =
        document.getElementById('gacha-result');

    if (result) {
        result.textContent =
            '뽑기 버튼을 눌러주세요!';
    }

    updateHomeUI();
}


// ============================================================
// 뽑기 화면 닫기
// ============================================================

function closeGacha() {

    switchScreen('screen-home');

    updateHomeUI();

    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }
}


// ============================================================
// 모든 뽑기 가능 파츠 가져오기
// ============================================================

function getAllGachaParts() {

    const allParts = [];

    for (const slot in partsData) {

        const partList =
            partsData[slot];

        partList.forEach(part => {

            // '없음' 파츠는 뽑기에서 제외
            if (part.id === 'b1_none' ||
                part.id === 'b2_none') {
                return;
            }

            allParts.push(part);
        });
    }

    return allParts;
}


// ============================================================
// 랜덤 파츠 선택
// ============================================================

function getRandomGachaPart() {

    const parts =
        getAllGachaParts();

    if (parts.length === 0) {
        return null;
    }

    const randomIndex =
        Math.floor(Math.random() * parts.length);

    return parts[randomIndex];
}


// ============================================================
// 뽑기 실행
// ============================================================

function doGacha() {

    const result =
        document.getElementById('gacha-result');


    // --------------------------------------------------------
    // 코인 확인
    // --------------------------------------------------------

    if (player.coins < GACHA_COST) {

        if (result) {

            result.textContent =
                '코인이 부족합니다!';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // --------------------------------------------------------
    // 랜덤 파츠 선택
    // --------------------------------------------------------

    const part =
        getRandomGachaPart();

    if (!part) {

        if (result) {

            result.textContent =
                '뽑을 수 있는 파츠가 없습니다.';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // --------------------------------------------------------
    // 코인 차감
    // --------------------------------------------------------

    player.coins -= GACHA_COST;


    // --------------------------------------------------------
    // 이미 보유한 파츠인지 확인
    // --------------------------------------------------------

    const alreadyOwned =
        player.inventory.includes(part.id);


    // --------------------------------------------------------
    // 인벤토리에 추가
    // --------------------------------------------------------

    if (!alreadyOwned) {

        player.inventory.push(part.id);
    }


    // --------------------------------------------------------
    // 결과 표시
    // --------------------------------------------------------

    if (result) {

        const gradeColor =
            getGradeColor(part.grade);

        if (alreadyOwned) {

            result.innerHTML = `
                <div style="
                    color:${gradeColor};
                    font-weight:bold;
                    font-size:24px;
                ">
                    ${part.name}
                </div>

                <div style="
                    margin-top:8px;
                    color:#ffaa00;
                    font-size:15px;
                ">
                    이미 보유한 파츠입니다.
                </div>
            `;

        } else {

            result.innerHTML = `
                <div style="
                    color:${gradeColor};
                    font-weight:bold;
                    font-size:24px;
                ">
                    ${part.name}
                </div>

                <div style="
                    margin-top:8px;
                    color:#00ff66;
                    font-size:15px;
                ">
                    새로운 파츠를 획득했습니다!
                </div>
            `;
        }
    }


    // --------------------------------------------------------
    // 코인 UI 갱신
    // --------------------------------------------------------

    updateHomeUI();


    // --------------------------------------------------------
    // 커스터마이징 데이터 갱신
    // --------------------------------------------------------

    if (typeof renderSlotList === 'function') {
        renderSlotList();
    }

    if (typeof renderInventoryList === 'function') {
        renderInventoryList();
    }
}


// ============================================================
// 등급별 뽑기 확률
// ============================================================

function getGachaGrade() {

    const random =
        Math.random() * 100;

    if (random < 5) {
        return '에픽';
    }

    if (random < 30) {
        return '레어';
    }

    return '일반';
}


// ============================================================
// 등급에 맞는 파츠 뽑기
// ============================================================

function getRandomGachaPartByGrade() {

    const grade =
        getGachaGrade();

    const allParts =
        getAllGachaParts();

    const gradeParts =
        allParts.filter(part => {

            return part.grade === grade;

        });


    // 해당 등급 파츠가 없다면 전체에서 선택
    if (gradeParts.length === 0) {

        return getRandomGachaPart();

    }


    const randomIndex =
        Math.floor(
            Math.random() * gradeParts.length
        );

    return gradeParts[randomIndex];
}


// ============================================================
// 등급 확률을 적용한 뽑기
// ============================================================

function doGachaWithGrade() {

    const result =
        document.getElementById('gacha-result');


    // 코인 부족
    if (player.coins < GACHA_COST) {

        if (result) {

            result.textContent =
                '코인이 부족합니다!';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    const part =
        getRandomGachaPartByGrade();


    if (!part) {

        if (result) {

            result.textContent =
                '뽑기에 실패했습니다.';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // 코인 차감
    player.coins -= GACHA_COST;


    // 중복 여부
    const alreadyOwned =
        player.inventory.includes(part.id);


    // 신규 파츠면 추가
    if (!alreadyOwned) {

        player.inventory.push(part.id);

    }


    // 결과 표시
    if (result) {

        const gradeColor =
            getGradeColor(part.grade);

        result.innerHTML = `

            <div style="
                color:${gradeColor};
                font-weight:bold;
                font-size:24px;
            ">
                ${part.grade}!
            </div>

            <div style="
                margin-top:5px;
                font-size:20px;
            ">
                ${part.name}
            </div>

            <div style="
                margin-top:8px;
                font-size:14px;
                color:#ccc;
            ">
                공격력 +${part.atk || 0}
                /
                방어력 +${part.def || 0}
                /
                회피력 +${part.eva || 0}
            </div>

            ${
                alreadyOwned
                ? `
                    <div style="
                        margin-top:8px;
                        color:#ffaa00;
                        font-size:14px;
                    ">
                        이미 보유한 파츠입니다.
                    </div>
                `
                : `
                    <div style="
                        margin-top:8px;
                        color:#00ff66;
                        font-size:14px;
                    ">
                        새로운 파츠 획득!
                    </div>
                `
            }

        `;
    }


    // UI 갱신
    updateHomeUI();

    if (typeof renderSlotList === 'function') {
        renderSlotList();
    }

    if (typeof renderInventoryList === 'function') {
        renderInventoryList();
    }
}
