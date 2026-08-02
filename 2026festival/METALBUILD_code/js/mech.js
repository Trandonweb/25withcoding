```javascript
// ============================================================
// METAL BUILD
// mech.js
// 메카 시각화 / 파츠 적용 / 스탯 계산
// ============================================================


// ============================================================
// 파츠 찾기
// ============================================================

function getPartById(partId) {

    if (!partId) {
        return null;
    }

    for (const slot in partsData) {

        const partList = partsData[slot];

        const part = partList.find(item => item.id === partId);

        if (part) {
            return part;
        }
    }

    return null;
}


// ============================================================
// 현재 장착된 모든 파츠 가져오기
// ============================================================

function getEquippedParts() {

    const equippedParts = [];

    for (const slot in player.equipped) {

        const partId = player.equipped[slot];

        const part = getPartById(partId);

        if (part) {
            equippedParts.push(part);
        }
    }

    return equippedParts;
}


// ============================================================
// 메카 전체 스탯 계산
// ============================================================

function calculateTotalStats() {

    let attack = 0;
    let defense = 0;
    let evasion = 0;

    const equippedParts = getEquippedParts();

    equippedParts.forEach(part => {

        attack += Number(part.atk) || 0;
        defense += Number(part.def) || 0;
        evasion += Number(part.eva) || 0;

    });

    return {
        atk: attack,
        def: defense,
        eva: evasion
    };
}


// ============================================================
// 홈 화면 스탯 표시
// ============================================================

function updateTotalStats() {

    const stats =
        calculateTotalStats();

    const statsElement =
        document.getElementById('home-total-stats');

    if (!statsElement) {
        return;
    }

    statsElement.innerHTML = `
        <span>공격력: ${stats.atk}</span>
        <span>방어력: ${stats.def}</span>
        <span>회피력: ${stats.eva}</span>
    `;
}


// ============================================================
// 메카 전면 / 후면 전환
// ============================================================

function switchMechView(view) {

    if (view !== 'front' && view !== 'back') {
        return;
    }

    currentMechView = view;

    const frontButton =
        document.getElementById('tab-front');

    const backButton =
        document.getElementById('tab-back');

    if (frontButton) {
        frontButton.classList.toggle(
            'active-view',
            view === 'front'
        );
    }

    if (backButton) {
        backButton.classList.toggle(
            'active-view',
            view === 'back'
        );
    }

    updateMechVisual();
}


// ============================================================
// 메카 시각화 전체 갱신
// ============================================================

function updateMechVisual() {

    updateHeadVisual();

    updateTorsoVisual();

    updateArmVisual('arm_l');

    updateArmVisual('arm_r');

    updateLegVisual('leg_l');

    updateLegVisual('leg_r');

    updateBackVisual();

    updateTotalStats();
}


// ============================================================
// 머리 표시
// ============================================================

function updateHeadVisual() {

    const headElement =
        document.getElementById('visual-head');

    const visorElement =
        document.getElementById('visual-head-visor');

    if (!headElement || !visorElement) {
        return;
    }

    const part =
        getPartById(player.equipped.head);

    if (!part) {
        return;
    }

    headElement.style.background =
        part.color || '#222';

    headElement.style.borderColor =
        part.border || '#00f0ff';

    visorElement.style.background =
        part.visorColor || '#00f0ff';

    visorElement.style.boxShadow =
        `0 0 8px ${part.visorColor || '#00f0ff'}`;

    headElement.innerHTML = '';

    const visor =
        document.createElement('div');

    visor.className = 'v-head-visor';

    visor.style.background =
        part.visorColor || '#00f0ff';

    visor.style.boxShadow =
        `0 0 8px ${part.visorColor || '#00f0ff'}`;

    headElement.appendChild(visor);

    // 안테나 형태
    if (part.shape === 'antenna') {

        const antenna =
            document.createElement('div');

        antenna.style.position = 'absolute';
        antenna.style.top = '-18px';
        antenna.style.left = '50%';
        antenna.style.transform = 'translateX(-50%)';
        antenna.style.width = '5px';
        antenna.style.height = '20px';
        antenna.style.background =
            part.border || '#0077ff';

        headElement.appendChild(antenna);
    }

    // 양쪽 뿔
    if (part.shape === 'dual-horn') {

        const leftHorn =
            document.createElement('div');

        const rightHorn =
            document.createElement('div');

        leftHorn.style.position = 'absolute';
        leftHorn.style.top = '-15px';
        leftHorn.style.left = '2px';
        leftHorn.style.width = '8px';
        leftHorn.style.height = '20px';
        leftHorn.style.background =
            part.border || '#ff00ff';
        leftHorn.style.transform =
            'rotate(-30deg)';

        rightHorn.style.position = 'absolute';
        rightHorn.style.top = '-15px';
        rightHorn.style.right = '2px';
        rightHorn.style.width = '8px';
        rightHorn.style.height = '20px';
        rightHorn.style.background =
            part.border || '#ff00ff';
        rightHorn.style.transform =
            'rotate(30deg)';

        headElement.appendChild(leftHorn);
        headElement.appendChild(rightHorn);
    }
}


// ============================================================
// 몸통 표시
// ============================================================

function updateTorsoVisual() {

    const torsoElement =
        document.getElementById('visual-torso');

    const coreElement =
        document.getElementById('visual-core-light');

    if (!torsoElement || !coreElement) {
        return;
    }

    const part =
        getPartById(player.equipped.torso);

    if (!part) {
        return;
    }

    torsoElement.style.background =
        part.color || '#22223b';

    torsoElement.style.borderColor =
        part.border || '#00f0ff';

    coreElement.style.background =
        part.lightColor || '#00f0ff';

    coreElement.style.boxShadow =
        `0 0 10px ${part.lightColor || '#00f0ff'}`;

    // 반응로 타입
    if (part.shape === 'reactor') {

        coreElement.style.width = '30px';
        coreElement.style.height = '30px';
        coreElement.style.borderRadius = '4px';
        coreElement.style.transform = 'rotate(45deg)';

    } else {

        coreElement.style.width = '24px';
        coreElement.style.height = '24px';
        coreElement.style.borderRadius = '50%';
        coreElement.style.transform = 'none';
    }
}


// ============================================================
// 팔 표시
// ============================================================

function updateArmVisual(slot) {

    const elementId =
        slot === 'arm_l'
            ? 'visual-arm-l'
            : 'visual-arm-r';

    const armElement =
        document.getElementById(elementId);

    if (!armElement) {
        return;
    }

    const part =
        getPartById(player.equipped[slot]);

    if (!part) {
        return;
    }

    armElement.style.background =
        part.color || '#252535';

    armElement.style.borderColor =
        part.border || '#00f0ff';

    armElement.innerHTML = '';

    // 기본 팔 장식
    const armor =
        document.createElement('div');

    armor.style.width = '25px';
    armor.style.height = '45px';
    armor.style.background =
        part.color || '#252535';
    armor.style.border =
        `1px solid ${part.border || '#00f0ff'}`;
    armor.style.borderRadius = '4px';

    armElement.appendChild(armor);


    // 쉴드
    if (part.shape === 'shield') {

        armor.style.width = '35px';
        armor.style.height = '55px';
        armor.style.borderRadius =
            '5px 5px 15px 15px';
    }


    // 블레이드
    if (part.shape === 'blade') {

        const blade =
            document.createElement('div');

        blade.style.position = 'absolute';
        blade.style.width = '8px';
        blade.style.height = '55px';
        blade.style.background =
            part.border || '#0077ff';
        blade.style.boxShadow =
            `0 0 10px ${part.border || '#0077ff'}`;

        if (slot === 'arm_l') {
            blade.style.left = '-8px';
        } else {
            blade.style.right = '-8px';
        }

        blade.style.top = '20px';

        armElement.appendChild(blade);
    }


    // 개틀링
    if (part.shape === 'gatling') {

        const gun =
            document.createElement('div');

        gun.style.position = 'absolute';
        gun.style.width = '28px';
        gun.style.height = '50px';
        gun.style.background =
            '#111';
        gun.style.border =
            `2px solid ${part.border || '#ff00ff'}`;
        gun.style.borderRadius = '5px';

        if (slot === 'arm_l') {
            gun.style.left = '-15px';
        } else {
            gun.style.right = '-15px';
        }

        gun.style.top = '30px';

        armElement.appendChild(gun);
    }


    // 캐논
    if (
        part.shape === 'cannon' ||
        part.shape === 'railgun' ||
        part.shape === 'hyper'
    ) {

        const cannon =
            document.createElement('div');

        cannon.style.position = 'absolute';
        cannon.style.width = '45px';
        cannon.style.height = '12px';
        cannon.style.background =
            '#111';
        cannon.style.border =
            `2px solid ${part.border || '#00f0ff'}`;
        cannon.style.borderRadius = '5px';

        if (slot === 'arm_l') {
            cannon.style.left = '-30px';
        } else {
            cannon.style.right = '-30px';
        }

        cannon.style.top = '45px';

        armElement.appendChild(cannon);
    }
}


// ============================================================
// 다리 표시
// ============================================================

function updateLegVisual(slot) {

    const elementId =
        slot === 'leg_l'
            ? 'visual-leg-l'
            : 'visual-leg-r';

    const legElement =
        document.getElementById(elementId);

    if (!legElement) {
        return;
    }

    const part =
        getPartById(player.equipped[slot]);

    if (!part) {
        return;
    }

    legElement.style.background =
        part.color || '#252535';

    legElement.style.borderColor =
        part.border || '#00f0ff';

    legElement.innerHTML = '';

    const armor =
        document.createElement('div');

    armor.style.width = '25px';
    armor.style.height = '45px';
    armor.style.background =
        part.color || '#252535';

    armor.style.border =
        `1px solid ${part.border || '#00f0ff'}`;

    armor.style.borderRadius = '4px';

    legElement.appendChild(armor);


    // 기동형
    if (part.shape === 'agile') {

        legElement.style.transform =
            'skewX(-5deg)';
    }


    // 호버
    if (part.shape === 'hover') {

        const hoverLight =
            document.createElement('div');

        hoverLight.style.width = '32px';
        hoverLight.style.height = '8px';
        hoverLight.style.background =
            part.border || '#ff00ff';

        hoverLight.style.boxShadow =
            `0 0 10px ${part.border || '#ff00ff'}`;

        hoverLight.style.position =
            'absolute';

        hoverLight.style.bottom =
            '3px';

        legElement.appendChild(hoverLight);
    }
}


// ============================================================
// 등 파츠 표시
// ============================================================

function updateBackVisual() {

    const leftElement =
        document.getElementById('visual-back1');

    const rightElement =
        document.getElementById('visual-back2');

    if (!leftElement || !rightElement) {
        return;
    }


    // 전면에서는 숨김
    if (currentMechView === 'front') {

        leftElement.style.display = 'none';
        rightElement.style.display = 'none';

        return;
    }


    // 후면
    const back1 =
        getPartById(player.equipped.back1);

    const back2 =
        getPartById(player.equipped.back2);


    // 등 1
    if (
        back1 &&
        back1.visible !== false
    ) {

        leftElement.style.display = 'flex';

        drawBackPart(
            leftElement,
            back1
        );

    } else {

        leftElement.style.display = 'none';
    }


    // 등 2
    if (
        back2 &&
        back2.visible !== false
    ) {

        rightElement.style.display = 'flex';

        drawBackPart(
            rightElement,
            back2
        );

    } else {

        rightElement.style.display = 'none';
    }
}


// ============================================================
// 등 파츠 그래픽
// ============================================================

function drawBackPart(element, part) {

    element.innerHTML = '';

    const color =
        part.color || '#0077ff';

    const border =
        part.border || color;


    // 부스터
    if (part.shape === 'booster') {

        const booster =
            document.createElement('div');

        booster.style.width = '35px';
        booster.style.height = '90px';
        booster.style.background = color;
        booster.style.border =
            `2px solid ${border}`;
        booster.style.borderRadius = '8px';

        element.appendChild(booster);
    }


    // 윙
    else if (part.shape === 'wing') {

        const wing =
            document.createElement('div');

        wing.style.width = '50px';
        wing.style.height = '100px';
        wing.style.background = color;
        wing.style.border =
            `2px solid ${border}`;
        wing.style.clipPath =
            'polygon(50% 0, 100% 100%, 0 100%)';

        element.appendChild(wing);
    }


    // 미사일 포드
    else if (part.shape === 'missile') {

        const pod =
            document.createElement('div');

        pod.style.width = '42px';
        pod.style.height = '85px';
        pod.style.background = color;
        pod.style.border =
            `2px solid ${border}`;
        pod.style.borderRadius = '6px';

        for (let i = 0; i < 4; i++) {

            const missile =
                document.createElement('div');

            missile.style.width = '7px';
            missile.style.height = '15px';
            missile.style.background = '#111';
            missile.style.borderRadius = '50%';

            pod.appendChild(missile);
        }

        element.appendChild(pod);
    }


    // 에너지팩
    else if (part.shape === 'energy') {

        const energy =
            document.createElement('div');

        energy.style.width = '40px';
        energy.style.height = '80px';
        energy.style.background = color;
        energy.style.border =
            `2px solid ${border}`;
        energy.style.borderRadius = '10px';

        energy.style.boxShadow =
            `0 0 15px ${color}`;

        element.appendChild(energy);
    }


    // 기본
    else {

        const basic =
            document.createElement('div');

        basic.style.width = '35px';
        basic.style.height = '70px';
        basic.style.background = color;
        basic.style.border =
            `2px solid ${border}`;
        basic.style.borderRadius = '6px';

        element.appendChild(basic);
    }
}


// ============================================================
// 특정 파츠 장착
// ============================================================

function equipPart(slot, partId) {

    const part =
        getPartById(partId);

    if (!part) {
        console.warn(
            '존재하지 않는 파츠입니다:',
            partId
        );

        return false;
    }

    if (!player.inventory.includes(partId)) {

        console.warn(
            '보유하지 않은 파츠입니다:',
            partId
        );

        return false;
    }

    player.equipped[slot] = partId;

    updateMechVisual();

    return true;
}


// ============================================================
// 장착된 파츠 이름 가져오기
// ============================================================

function getEquippedPartName(slot) {

    const partId =
        player.equipped[slot];

    const part =
        getPartById(partId);

    if (!part) {
        return '없음';
    }

    return part.name;
}


// ============================================================
// 초기 메카 표시
// ============================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        setTimeout(() => {

            updateMechVisual();

        }, 0);

    }
);
```

