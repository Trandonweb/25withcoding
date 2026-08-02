// ============================================================
// METAL BUILD
// data.js
// 파츠 데이터 / 플레이어 데이터 / 공통 게임 상태
// ============================================================


// ============================================================
// 파츠 데이터
// atk = 공격력
// def = 방어력
// eva = 회피력
// ============================================================

const partsData = {

    // --------------------------------------------------------
    // 머리
    // --------------------------------------------------------
    head: [

        {
            id: 'h_basic',
            name: '기본 헤드',
            slot: 'head',
            grade: '일반',
            atk: 2,
            def: 3,
            eva: 2,
            color: '#222',
            border: '#00f0ff',
            visorColor: '#00f0ff'
        },

        {
            id: 'h_rare',
            name: '하이센서 헤드',
            slot: 'head',
            grade: '레어',
            atk: 5,
            def: 5,
            eva: 10,
            color: '#104e8b',
            border: '#0077ff',
            visorColor: '#00ffff',
            shape: 'antenna'
        },

        {
            id: 'h_epic',
            name: '사이버 헤드',
            slot: 'head',
            grade: '에픽',
            atk: 10,
            def: 8,
            eva: 18,
            color: '#4b0082',
            border: '#ff00ff',
            visorColor: '#ff00ff',
            shape: 'dual-horn'
        }

    ],


    // --------------------------------------------------------
    // 몸통
    // --------------------------------------------------------
    torso: [

        {
            id: 't_basic',
            name: '기본 몸통',
            slot: 'torso',
            grade: '일반',
            atk: 3,
            def: 8,
            eva: 1,
            color: '#22223b',
            border: '#00f0ff',
            lightColor: '#00f0ff'
        },

        {
            id: 't_rare',
            name: '강화 아머',
            slot: 'torso',
            grade: '레어',
            atk: 6,
            def: 18,
            eva: 2,
            color: '#18385c',
            border: '#0077ff',
            lightColor: '#0077ff',
            shape: 'armor'
        },

        {
            id: 't_epic',
            name: '티타늄 코어',
            slot: 'torso',
            grade: '에픽',
            atk: 12,
            def: 32,
            eva: 4,
            color: '#3d1442',
            border: '#ff00ff',
            lightColor: '#ff00ff',
            shape: 'reactor'
        }

    ],


    // --------------------------------------------------------
    // 왼팔
    // --------------------------------------------------------
    arm_l: [

        {
            id: 'al_shield',
            name: '왼쪽 팔 쉴드 (기본)',
            slot: 'arm_l',
            grade: '일반',
            atk: 3,
            def: 10,
            eva: 1,
            color: '#252535',
            border: '#00f0ff',
            shape: 'shield'
        },

        {
            id: 'al_rare',
            name: '플라즈마 블레이드',
            slot: 'arm_l',
            grade: '레어',
            atk: 15,
            def: 4,
            eva: 5,
            color: '#005580',
            border: '#0077ff',
            shape: 'blade'
        },

        {
            id: 'al_epic',
            name: '네이팜 개틀링',
            slot: 'arm_l',
            grade: '에픽',
            atk: 28,
            def: 6,
            eva: 3,
            color: '#661133',
            border: '#ff00ff',
            shape: 'gatling'
        }

    ],


    // --------------------------------------------------------
    // 오른팔
    // --------------------------------------------------------
    arm_r: [

        {
            id: 'ar_launcher',
            name: '오른쪽 팔 런처 (기본)',
            slot: 'ar_r',
            grade: '일반',
            atk: 8,
            def: 4,
            eva: 2,
            color: '#252535',
            border: '#00f0ff',
            shape: 'cannon'
        },

        {
            id: 'ar_rare',
            name: '레일건',
            slot: 'ar_r',
            grade: '레어',
            atk: 20,
            def: 4,
            eva: 3,
            color: '#005580',
            border: '#0077ff',
            shape: 'railgun'
        },

        {
            id: 'ar_epic',
            name: '하이퍼 캐논',
            slot: 'ar_r',
            grade: '에픽',
            atk: 35,
            def: 5,
            eva: 2,
            color: '#661133',
            border: '#ff00ff',
            shape: 'hyper'
        }

    ],


    // --------------------------------------------------------
    // 등 1
    // --------------------------------------------------------
    back1: [

        {
            id: 'b1_none',
            name: '없음',
            slot: 'back1',
            grade: '일반',
            atk: 0,
            def: 0,
            eva: 0,
            visible: false
        },

        {
            id: 'b1_rare',
            name: '추러스 부스터',
            slot: 'back1',
            grade: '레어',
            atk: 6,
            def: 4,
            eva: 15,
            color: '#0077ff',
            visible: true,
            shape: 'booster'
        },

        {
            id: 'b1_epic',
            name: '윙 바인더',
            slot: 'back1',
            grade: '에픽',
            atk: 12,
            def: 6,
            eva: 26,
            color: '#ff00ff',
            visible: true,
            shape: 'wing'
        }

    ],


    // --------------------------------------------------------
    // 등 2
    // --------------------------------------------------------
    back2: [

        {
            id: 'b2_none',
            name: '없음',
            slot: 'back2',
            grade: '일반',
            atk: 0,
            def: 0,
            eva: 0,
            visible: false
        },

        {
            id: 'b2_rare',
            name: '미사일 포드',
            slot: 'back2',
            grade: '레어',
            atk: 22,
            def: 5,
            eva: -2,
            color: '#ff5500',
            visible: true,
            shape: 'missile'
        },

        {
            id: 'b2_epic',
            name: '에너지팩',
            slot: 'back2',
            grade: '에픽',
            atk: 30,
            def: 12,
            eva: 2,
            color: '#00ff66',
            visible: true,
            shape: 'energy'
        }

    ],


    // --------------------------------------------------------
    // 왼쪽 다리
    // --------------------------------------------------------
    leg_l: [

        {
            id: 'll_basic',
            name: '기본 왼쪽 다리',
            slot: 'leg_l',
            grade: '일반',
            atk: 2,
            def: 5,
            eva: 3,
            color: '#252535',
            border: '#00f0ff',
            shape: 'normal'
        },

        {
            id: 'll_rare',
            name: '기동형 레그',
            slot: 'leg_l',
            grade: '레어',
            atk: 4,
            def: 6,
            eva: 12,
            color: '#18385c',
            border: '#0077ff',
            shape: 'agile'
        },

        {
            id: 'll_epic',
            name: '호버 다리',
            slot: 'leg_l',
            grade: '에픽',
            atk: 6,
            def: 10,
            eva: 22,
            color: '#3d1442',
            border: '#ff00ff',
            shape: 'hover'
        }

    ],


    // --------------------------------------------------------
    // 오른쪽 다리
    // --------------------------------------------------------
    leg_r: [

        {
            id: 'lr_basic',
            name: '기본 오른쪽 다리',
            slot: 'leg_r',
            grade: '일반',
            atk: 2,
            def: 5,
            eva: 3,
            color: '#252535',
            border: '#00f0ff',
            shape: 'normal'
        },

        {
            id: 'lr_rare',
            name: '기동형 레그',
            slot: 'leg_r',
            grade: '레어',
            atk: 4,
            def: 6,
            eva: 12,
            color: '#18385c',
            border: '#0077ff',
            shape: 'agile'
        },

        {
            id: 'lr_epic',
            name: '호버 다리',
            slot: 'leg_r',
            grade: '에픽',
            atk: 6,
            def: 10,
            eva: 22,
            color: '#3d1442',
            border: '#ff00ff',
            shape: 'hover'
        }

    ]

};


// ============================================================
// 플레이어 데이터
// ============================================================

let player = {

    // 현재 스테이지
    stage: 1,

    // 보유 코인
    coins: 100,

    // 보유 소탕권
    tickets: 0,

    // 보유 파츠
    inventory: [
        'h_basic',
        't_basic',
        'al_shield',
        'ar_launcher',
        'b1_none',
        'b2_none',
        'll_basic',
        'lr_basic'
    ],

    // 현재 장착 중인 파츠
    equipped: {

        head: 'h_basic',

        torso: 't_basic',

        arm_l: 'al_shield',

        arm_r: 'ar_launcher',

        back1: 'b1_none',

        back2: 'b2_none',

        leg_l: 'll_basic',

        leg_r: 'lr_basic'

    }

};


// ============================================================
// 파츠 슬롯 이름
// ============================================================

const slotNames = {

    head: '머리',

    torso: '몸통',

    arm_l: '왼팔',

    arm_r: '오른팔',

    back1: '등1',

    back2: '등2',

    leg_l: '왼쪽 다리',

    leg_r: '오른쪽 다리'

};


// ============================================================
// 현재 선택된 슬롯
// ============================================================

let currentSelectedSlot = 'head';


// ============================================================
// 현재 메카 시점
// front = 전면
// back  = 후면
// ============================================================

let currentMechView = 'front';
