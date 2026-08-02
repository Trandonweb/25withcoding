// ============================================================
// METAL BUILD
// sweep.js
// 스테이지 소탕 시스템
// ============================================================


// ============================================================
// 소탕 가능한 최대 스테이지
// 현재 진행 중인 스테이지보다 이전 스테이지만 소탕 가능
// ============================================================

function getMaxSweepStage() {

    const currentStage =
        Math.max(
            1,
            Math.min(
                Number(player.stage) || 1,
                100
            )
        );

    return currentStage - 1;
}


// ============================================================
// 소탕 모달 열기
// ============================================================

function openSweepModal() {

    const modal =
        document.getElementById('sweep-modal');

    const select =
        document.getElementById('sweep-stage-select');

    const result =
        document.getElementById('sweep-result-text');

    if (!modal || !select) {
        return;
    }


    // 기존 목록 제거
    select.innerHTML = '';


    const maxStage =
        getMaxSweepStage();


    // --------------------------------------------------------
    // 클리어한 스테이지가 없는 경우
    // --------------------------------------------------------

    if (maxStage < 1) {

        const option =
            document.createElement('option');

        option.value = '';

        option.textContent =
            '소탕 가능한 스테이지가 없습니다.';

        select.appendChild(option);

        if (result) {

            result.textContent =
                '먼저 스테이지를 클리어해주세요.';

            result.style.color =
                '#ff3333';
        }

    } else {

        // ----------------------------------------------------
        // 클리어한 스테이지 목록 생성
        // ----------------------------------------------------

        for (let stage = 1; stage <= maxStage; stage++) {

            const option =
                document.createElement('option');

            option.value =
                stage;

            option.textContent =
                `STAGE ${stage}`;

            select.appendChild(option);
        }


        if (result) {

            result.textContent =
                `소탕 가능 스테이지: 1 ~ ${maxStage}`;

            result.style.color =
                '#ffaa00';
        }
    }


    // 모달 표시
    modal.style.display =
        'flex';


    updateHomeUI();
}


// ============================================================
// 소탕 모달 닫기
// ============================================================

function closeSweepModal() {

    const modal =
        document.getElementById('sweep-modal');

    if (modal) {

        modal.style.display =
            'none';
    }
}


// ============================================================
// 소탕 실행
// ============================================================

function executeSweep() {

    const select =
        document.getElementById('sweep-stage-select');

    const result =
        document.getElementById('sweep-result-text');


    if (!select) {
        return;
    }


    // --------------------------------------------------------
    // 소탕권 확인
    // --------------------------------------------------------

    if (player.tickets <= 0) {

        if (result) {

            result.textContent =
                '소탕권이 부족합니다!';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // --------------------------------------------------------
    // 선택한 스테이지
    // --------------------------------------------------------

    const selectedStage =
        Number(select.value);


    if (
        !selectedStage ||
        selectedStage < 1
    ) {

        if (result) {

            result.textContent =
                '소탕할 스테이지를 선택해주세요.';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // 현재 진행 스테이지보다 높은 스테이지 방지
    if (
        selectedStage >=
        Number(player.stage)
    ) {

        if (result) {

            result.textContent =
                '아직 클리어하지 않은 스테이지입니다.';

            result.style.color =
                '#ff3333';
        }

        return;
    }


    // --------------------------------------------------------
    // 소탕권 1개 사용
    // --------------------------------------------------------

    player.tickets -= 1;


    // --------------------------------------------------------
    // 소탕 보상 계산
    // --------------------------------------------------------

    const coinReward =
        30 + (selectedStage * 5);


    player.coins +=
        coinReward;


    // --------------------------------------------------------
    // 추가 보상
    // --------------------------------------------------------

    let bonusTicket = 0;

    if (Math.random() < 0.15) {

        bonusTicket = 1;

        player.tickets += 1;
    }


    // --------------------------------------------------------
    // 결과 표시
    // --------------------------------------------------------

    if (result) {

        result.innerHTML = `

            <div style="
                color:#00ff88;
                font-weight:bold;
                font-size:18px;
            ">
                STAGE ${selectedStage} 소탕 완료!
            </div>

            <div style="
                margin-top:8px;
                color:#ffaa00;
            ">
                코인 +${coinReward}G
            </div>

            ${
                bonusTicket > 0
                    ? `
                        <div style="
                            margin-top:5px;
                            color:#00ff66;
                        ">
                            보너스 소탕권 +${bonusTicket}
                        </div>
                    `
                    : ''
            }

        `;
    }


    // --------------------------------------------------------
    // UI 갱신
    // --------------------------------------------------------

    updateHomeUI();


    // --------------------------------------------------------
    // 잠시 후 소탕 목록 갱신
    // --------------------------------------------------------

    setTimeout(() => {

        openSweepModal();

    }, 700);
}


// ============================================================
// 특정 스테이지의 소탕 보상 계산
// ============================================================

function calculateSweepReward(stage) {

    stage =
        Number(stage) || 1;

    stage =
        Math.max(1, Math.min(stage, 100));


    return {
        coins: 30 + (stage * 5),
        tickets: 0
    };
}


// ============================================================
// 소탕 가능한지 확인
// ============================================================

function canSweepStage(stage) {

    stage =
        Number(stage);


    if (!Number.isInteger(stage)) {
        return false;
    }


    if (stage < 1 || stage > 100) {
        return false;
    }


    // 현재 진행 중인 스테이지보다 이전이어야 함
    if (stage >= Number(player.stage)) {
        return false;
    }


    // 소탕권 필요
    if (player.tickets <= 0) {
        return false;
    }


    return true;
}


// ============================================================
// 소탕 가능한 스테이지 목록
// ============================================================

function getSweepableStages() {

    const maxStage =
        getMaxSweepStage();


    const stages = [];


    for (
        let stage = 1;
        stage <= maxStage;
        stage++
    ) {

        stages.push(stage);
    }


    return stages;
}


// ============================================================
// 소탕권 추가
// ============================================================

function addSweepTickets(amount) {

    amount =
        Number(amount) || 0;


    player.tickets +=
        amount;


    if (player.tickets < 0) {
        player.tickets = 0;
    }


    updateHomeUI();
}


// ============================================================
// 소탕 시스템 초기화
// ============================================================

function initializeSweepSystem() {

    const modal =
        document.getElementById('sweep-modal');


    if (!modal) {
        return;
    }


    modal.style.display =
        'none';
}


// ============================================================
// DOM 로딩 후 초기화
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeSweepSystem();

    }
);
