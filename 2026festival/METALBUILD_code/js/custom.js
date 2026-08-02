// ============================================================
// METAL BUILD
// custom.js
// 커스터마이징 화면 / 슬롯 선택 / 파츠 장착
// ============================================================


// ============================================================
// 커스터마이징 화면 열기
// ============================================================

function openCustom() {

    switchScreen('screen-custom');

    currentSelectedSlot = 'head';

    renderSlotList();
    renderInventoryList();
}


// ============================================================
// 커스터마이징 화면 닫기
// ============================================================

function closeCustom() {

    switchScreen('screen-home');

    updateHomeUI();

    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }

    if (typeof updateTotalStats === 'function') {
        updateTotalStats();
    }
}


// ============================================================
// 슬롯 목록 생성
// ============================================================

function renderSlotList() {

    const container =
        document.getElementById('slot-list-container');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const slots = [
        'head',
        'arm_l',
        'arm_r',
        'back1',
        'back2',
        'torso',
        'leg_l',
        'leg_r'
    ];

    slots.forEach(slot => {

        const button =
            document.createElement('button');

        button.className = 'slot-btn';

        if (slot === currentSelectedSlot) {
            button.classList.add('selected');
        }

        const slotName =
            slotNames[slot] || slot;

        const equippedId =
            player.equipped[slot];

        const equippedPart =
            getPartById(equippedId);

        const equippedName =
            equippedPart
                ? equippedPart.name
                : '없음';

        button.innerHTML = `
            <span>${slotName}</span>
            <span style="font-size:12px; color:#aaa;">
                ${equippedName}
            </span>
        `;

        button.onclick = () => {

            selectCustomSlot(slot);

        };

        container.appendChild(button);

    });
}


// ============================================================
// 슬롯 선택
// ============================================================

function selectCustomSlot(slot) {

    if (!player.equipped.hasOwnProperty(slot)) {
        return;
    }

    currentSelectedSlot = slot;

    renderSlotList();
    renderInventoryList();
}


// ============================================================
// 현재 슬롯의 파츠 목록 가져오기
// ============================================================

function getPartsForSlot(slot) {

    if (!partsData[slot]) {
        return [];
    }

    return partsData[slot];
}


// ============================================================
// 보유 파츠 목록 표시
// ============================================================

function renderInventoryList() {

    const container =
        document.getElementById('inventory-list');

    const title =
        document.getElementById('part-selection-title');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    const slot =
        currentSelectedSlot;

    const slotName =
        slotNames[slot] || slot;

    if (title) {

        title.textContent =
            `${slotName} 파츠 선택`;
    }

    const parts =
        getPartsForSlot(slot);

    if (parts.length === 0) {

        container.innerHTML = `
            <div style="
                color:#888;
                text-align:center;
                padding:30px;
            ">
                등록된 파츠가 없습니다.
            </div>
        `;

        return;
    }

    parts.forEach(part => {

        // 현재 슬롯과 맞지 않는 파츠는 제외
        if (part.slot !== slot) {
            return;
        }

        // 보유 여부
        const owned =
            player.inventory.includes(part.id);

        // 현재 장착 여부
        const equipped =
            player.equipped[slot] === part.id;

        const card =
            document.createElement('div');

        card.className = 'part-card';

        if (equipped) {
            card.classList.add('equipped');
        }

        if (!owned) {

            card.style.opacity = '0.45';
        }

        const gradeColor =
            getGradeColor(part.grade);

        card.innerHTML = `

            <div>

                <div style="
                    font-size:17px;
                    font-weight:bold;
                    margin-bottom:6px;
                    color:${gradeColor};
                ">
                    ${part.name}
                </div>

                <div style="
                    font-size:13px;
                    color:#aaa;
                ">
                    등급: ${part.grade}
                </div>

                <div style="
                    margin-top:8px;
                    font-size:13px;
                    color:#ddd;
                ">
                    공격력 +${part.atk || 0}
                    &nbsp;&nbsp;
                    방어력 +${part.def || 0}
                    &nbsp;&nbsp;
                    회피력 +${part.eva || 0}
                </div>

            </div>

            <div>

                ${
                    equipped
                    ? `
                        <span style="
                            color:#00ff66;
                            font-weight:bold;
                        ">
                            장착 중
                        </span>
                    `
                    : owned
                    ? `
                        <button
                            class="btn"
                            style="
                                padding:8px 14px;
                                font-size:13px;
                            "
                            onclick="equipCustomPart('${part.id}')">
                            장착
                        </button>
                    `
                    : `
                        <span style="
                            color:#777;
                            font-size:13px;
                        ">
                            미보유
                        </span>
                    `
                }

            </div>
        `;

        container.appendChild(card);

    });
}


// ============================================================
// 파츠 장착
// ============================================================

function equipCustomPart(partId) {

    const slot =
        currentSelectedSlot;

    const part =
        getPartById(partId);

    if (!part) {

        console.warn(
            '존재하지 않는 파츠입니다:',
            partId
        );

        return;
    }

    // 현재 선택한 슬롯의 파츠인지 확인
    if (part.slot !== slot) {

        console.warn(
            '잘못된 슬롯의 파츠입니다.'
        );

        return;
    }

    // 파츠 보유 여부 확인
    if (!player.inventory.includes(partId)) {

        alert('아직 획득하지 않은 파츠입니다.');

        return;
    }

    // 장착
    player.equipped[slot] =
        partId;

    // 화면 갱신
    renderSlotList();
    renderInventoryList();

    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }

    if (typeof updateTotalStats === 'function') {
        updateTotalStats();
    }
}


// ============================================================
// 등급별 색상
// ============================================================

function getGradeColor(grade) {

    switch (grade) {

        case '일반':
            return '#ffffff';

        case '레어':
            return '#00aaff';

        case '에픽':
            return '#ff00ff';

        case '전설':
            return '#ffaa00';

        case '신화':
            return '#ff3333';

        default:
            return '#ffffff';
    }
}


// ============================================================
// 파츠 보유 여부
// ============================================================

function hasPart(partId) {

    return player.inventory.includes(partId);

}


// ============================================================
// 파츠 획득
// ============================================================

function addPartToInventory(partId) {

    const part =
        getPartById(partId);

    if (!part) {
        return false;
    }

    // 이미 보유한 경우
    if (player.inventory.includes(partId)) {

        return false;
    }

    player.inventory.push(partId);

    return true;
}


// ============================================================
// 파츠 제거
// ============================================================

function removePartFromInventory(partId) {

    const index =
        player.inventory.indexOf(partId);

    if (index === -1) {
        return false;
    }

    // 현재 장착 중인 파츠인지 확인
    for (const slot in player.equipped) {

        if (player.equipped[slot] === partId) {

            console.warn(
                '현재 장착 중인 파츠는 제거할 수 없습니다.'
            );

            return false;
        }
    }

    player.inventory.splice(index, 1);

    return true;
}


// ============================================================
// 커스터마이징 화면 초기화
// ============================================================

function initializeCustomization() {

    currentSelectedSlot = 'head';

    renderSlotList();
    renderInventoryList();

}


// ============================================================
// DOM 로딩 후 초기화
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        initializeCustomization();

    }
);
