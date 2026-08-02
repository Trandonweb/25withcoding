```javascript
// ============================================================
// METAL BUILD
// battle.js
// 전투 시스템
// ============================================================


// ============================================================
// 전투 변수
// ============================================================

let battleState = {

    active: false,

    playerHP: 100,
    playerMaxHP: 100,

    enemyHP: 100,
    enemyMaxHP: 100,

    enemyAttack: 10,
    enemyDefense: 5,

    turn: 0,

    stage: 1

};


// ============================================================
// 전투 시작
// ============================================================

function startBattle() {

    const stage =
        Math.max(
            1,
            Math.min(
                Number(player.stage) || 1,
                100
            )
        );

    battleState.stage = stage;

    battleState.active = true;

    battleState.turn = 0;


    // --------------------------------------------------------
    // 플레이어 스탯
    // --------------------------------------------------------

    const stats =
        calculateTotalStats();


    // 기본 HP
    battleState.playerMaxHP =
        100 + (stats.def * 3);

    battleState.playerHP =
        battleState.playerMaxHP;


    // --------------------------------------------------------
    // 적 스탯
    // --------------------------------------------------------

    battleState.enemyMaxHP =
        100 + (stage * 12);

    battleState.enemyHP =
        battleState.enemyMaxHP;


    battleState.enemyAttack =
        10 + (stage * 3);

    battleState.enemyDefense =
        5 + Math.floor(stage * 1.5);


    // --------------------------------------------------------
    // 전투 화면
    // --------------------------------------------------------

    switchScreen('screen-battle');


    updateBattleUI();

    clearBattleLog();

    addBattleLog(
        `STAGE ${stage} 전투가 시작되었습니다!`
    );

    addBattleLog(
        `적 메카 HP: ${battleState.enemyMaxHP}`
    );


    // --------------------------------------------------------
    // 화면 타이틀
    // --------------------------------------------------------

    const title =
        document.getElementById('battle-stage-title');

    if (title) {

        title.textContent =
            `STAGE ${stage}`;
    }


    // 플레이어 이름
    const playerName =
        document.getElementById('player-name');

    if (playerName) {

        playerName.textContent =
            'PLAYER MECH';
    }


    // 적 이름
    const enemyName =
        document.getElementById('enemy-name');

    if (enemyName) {

        enemyName.textContent =
            `ENEMY MECH Lv.${stage}`;
    }


    // --------------------------------------------------------
    // 자동 전투 시작
    // --------------------------------------------------------

    setTimeout(() => {

        battleTurn();

    }, 800);
}


// ============================================================
// 전투 한 턴
// ============================================================

function battleTurn() {

    if (!battleState.active) {
        return;
    }


    // 이미 종료된 전투
    if (
        battleState.playerHP <= 0 ||
        battleState.enemyHP <= 0
    ) {

        return;
    }


    battleState.turn++;


    const stats =
        calculateTotalStats();


    // ========================================================
    // 플레이어 공격
    // ========================================================

    let playerDamage =
        stats.atk - battleState.enemyDefense;


    // 최소 데미지
    playerDamage =
        Math.max(5, playerDamage);


    // 랜덤 데미지
    const playerRandom =
        Math.floor(
            Math.random() * 8
        );

    playerDamage +=
        playerRandom;


    battleState.enemyHP -=
        playerDamage;


    battleState.enemyHP =
        Math.max(
            0,
            battleState.enemyHP
        );


    addBattleLog(
        `플레이어의 공격! ${playerDamage}의 피해를 입혔습니다.`
    );


    updateBattleUI();


    // 적이 쓰러졌는지 확인
    if (battleState.enemyHP <= 0) {

        winBattle();

        return;
    }


    // ========================================================
    // 적 공격
    // ========================================================

    setTimeout(() => {

        if (!battleState.active) {
            return;
        }


        // 회피 판정
        const evadeChance =
            Math.min(
                60,
                stats.eva
            );


        const evadeRoll =
            Math.random() * 100;


        if (evadeRoll < evadeChance) {

            addBattleLog(
                `적의 공격을 회피했습니다!`
            );

        } else {

            let enemyDamage =
                battleState.enemyAttack -
                stats.def;


            enemyDamage =
                Math.max(
                    3,
                    enemyDamage
                );


            enemyDamage +=
                Math.floor(
                    Math.random() * 6
                );


            battleState.playerHP -=
                enemyDamage;


            battleState.playerHP =
                Math.max(
                    0,
                    battleState.playerHP
                );


            addBattleLog(
                `적의 공격! ${enemyDamage}의 피해를 받았습니다.`
            );

        }


        updateBattleUI();


        // 플레이어가 쓰러졌는지 확인
        if (battleState.playerHP <= 0) {

            loseBattle();

            return;
        }


        // 다음 턴
        setTimeout(() => {

            battleTurn();

        }, 700);


    }, 600);
}


// ============================================================
// 전투 UI 업데이트
// ============================================================

function updateBattleUI() {

    // --------------------------------------------------------
    // 플레이어 HP
    // --------------------------------------------------------

    const playerBar =
        document.getElementById('player-hp-bar');

    const playerText =
        document.getElementById('player-hp-text');


    const playerPercent =
        battleState.playerMaxHP > 0
            ? (
                battleState.playerHP /
                battleState.playerMaxHP
            ) * 100
            : 0;


    if (playerBar) {

        playerBar.style.width =
            `${Math.max(0, playerPercent)}%`;
    }


    if (playerText) {

        playerText.textContent =
            `${battleState.playerHP} / ${battleState.playerMaxHP}`;
    }


    // --------------------------------------------------------
    // 적 HP
    // --------------------------------------------------------

    const enemyBar =
        document.getElementById('enemy-hp-bar');

    const enemyText =
        document.getElementById('enemy-hp-text');


    const enemyPercent =
        battleState.enemyMaxHP > 0
            ? (
                battleState.enemyHP /
                battleState.enemyMaxHP
            ) * 100
            : 0;


    if (enemyBar) {

        enemyBar.style.width =
            `${Math.max(0, enemyPercent)}%`;
    }


    if (enemyText) {

        enemyText.textContent =
            `${battleState.enemyHP} / ${battleState.enemyMaxHP}`;
    }
}


// ============================================================
// 전투 로그 초기화
// ============================================================

function clearBattleLog() {

    const log =
        document.getElementById('battle-log');

    if (log) {

        log.innerHTML = '';
    }
}


// ============================================================
// 전투 로그 추가
// ============================================================

function addBattleLog(message) {

    const log =
        document.getElementById('battle-log');

    if (!log) {
        return;
    }


    const line =
        document.createElement('div');

    line.textContent =
        message;


    log.appendChild(line);


    // 가장 최근 로그로 스크롤
    log.scrollTop =
        log.scrollHeight;
}


// ============================================================
// 승리
// ============================================================

function winBattle() {

    battleState.active = false;


    const stage =
        battleState.stage;


    addBattleLog(
        `STAGE ${stage} 클리어!`
    );


    // --------------------------------------------------------
    // 보상
    // --------------------------------------------------------

    const coinReward =
        30 + (stage * 5);


    player.coins +=
        coinReward;


    // 소탕권은 일정 확률로 획득
    let ticketReward = 0;


    if (Math.random() < 0.35) {

        ticketReward = 1;

        player.tickets += 1;
    }


    // --------------------------------------------------------
    // 다음 스테이지
    // --------------------------------------------------------

    if (player.stage < 100) {

        player.stage++;
    }


    updateHomeUI();


    // --------------------------------------------------------
    // 결과창
    // --------------------------------------------------------

    showBattleResult(
        true,
        stage,
        coinReward,
        ticketReward
    );
}


// ============================================================
// 패배
// ============================================================

function loseBattle() {

    battleState.active = false;


    const stage =
        battleState.stage;


    addBattleLog(
        `STAGE ${stage} 전투에서 패배했습니다.`
    );


    showBattleResult(
        false,
        stage,
        0,
        0
    );
}


// ============================================================
// 전투 결과 표시
// ============================================================

function showBattleResult(
    victory,
    stage,
    coinReward,
    ticketReward
) {

    const modal =
        document.getElementById(
            'battle-result-modal'
        );


    const title =
        document.getElementById(
            'modal-result-title'
        );


    const desc =
        document.getElementById(
            'modal-result-desc'
        );


    if (!modal) {
        return;
    }


    if (victory) {

        if (title) {

            title.textContent =
                '승리!';
            
            title.style.color =
                '#00ff66';
        }


        if (desc) {

            desc.innerHTML = `
                STAGE ${stage} 클리어!<br><br>

                <span style="color:#ffaa00;">
                    코인 +${coinReward}G
                </span>

                ${
                    ticketReward > 0
                        ? `
                            <br>
                            <span style="color:#00ff66;">
                                소탕권 +${ticketReward}
                            </span>
                        `
                        : ''
                }

                <br><br>

                ${
                    stage < 100
                        ? `다음 스테이지: STAGE ${stage + 1}`
                        : `
                            <span style="color:#ffaa00;">
                                모든 스테이지를 클리어했습니다!
                            </span>
                        `
                }
            `;
        }

    } else {

        if (title) {

            title.textContent =
                '패배...';

            title.style.color =
                '#ff3333';
        }


        if (desc) {

            desc.innerHTML = `
                STAGE ${stage} 전투에서 패배했습니다.<br><br>

                메카를 정비한 후<br>
                다시 도전해주세요.
            `;
        }
    }


    modal.style.display =
        'flex';
}


// ============================================================
// 전투 중단
// ============================================================

function stopBattle() {

    battleState.active = false;

}


// ============================================================
// 현재 전투 상태 확인
// ============================================================

function isBattleActive() {

    return battleState.active;

}
```

