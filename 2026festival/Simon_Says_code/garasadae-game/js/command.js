/* ==========================================
   command.js
   가라사대 집중력 게임 명령어 데이터
========================================== */

const COMMANDS = [

    // ===== EASY =====
    { text: "가라사대 오른손 드세요.", answer: true },
    { text: "가라사대 왼손 드세요.", answer: true },
    { text: "가라사대 박수 치세요.", answer: true },
    { text: "가라사대 웃으세요.", answer: true },
    { text: "가라사대 점프하세요.", answer: true },
    { text: "가라사대 고개 숙이세요.", answer: true },
    { text: "가라사대 손 흔드세요.", answer: true },
    { text: "가라사대 엄지척 하세요.", answer: true },
    { text: "가라사대 브이 하세요.", answer: true },
    { text: "가라사대 의자에 앉으세요.", answer: true },

    { text: "오른손 드세요.", answer: false },
    { text: "왼손 드세요.", answer: false },
    { text: "박수 치세요.", answer: false },
    { text: "웃으세요.", answer: false },
    { text: "점프하세요.", answer: false },
    { text: "고개 숙이세요.", answer: false },
    { text: "손 흔드세요.", answer: false },
    { text: "엄지척 하세요.", answer: false },
    { text: "브이 하세요.", answer: false },
    { text: "의자에 앉으세요.", answer: false },

    // ===== NORMAL =====
    { text: "가라사대 한 바퀴 도세요.", answer: true },
    { text: "가라사대 숫자 7을 외치세요.", answer: true },
    { text: "가라사대 숫자 3을 외치세요.", answer: true },
    { text: "가라사대 양손을 머리 위로 올리세요.", answer: true },
    { text: "가라사대 왼발 드세요.", answer: true },
    { text: "가라사대 오른발 드세요.", answer: true },
    { text: "가라사대 손뼉 세 번 치세요.", answer: true },
    { text: "가라사대 눈 감으세요.", answer: true },
    { text: "가라사대 기지개 켜세요.", answer: true },
    { text: "가라사대 팔짱 끼세요.", answer: true },

    { text: "한 바퀴 도세요.", answer: false },
    { text: "숫자 7을 외치세요.", answer: false },
    { text: "숫자 3을 외치세요.", answer: false },
    { text: "양손을 머리 위로 올리세요.", answer: false },
    { text: "왼발 드세요.", answer: false },
    { text: "오른발 드세요.", answer: false },
    { text: "손뼉 세 번 치세요.", answer: false },
    { text: "눈 감으세요.", answer: false },
    { text: "기지개 켜세요.", answer: false },
    { text: "팔짱 끼세요.", answer: false },

    // ===== HARD =====
    { text: "가라사대 로봇처럼 걸으세요.", answer: true },
    { text: "가라사대 제자리 뛰기.", answer: true },
    { text: "가라사대 크게 웃으세요.", answer: true },
    { text: "가라사대 하늘을 보세요.", answer: true },
    { text: "가라사대 바닥을 보세요.", answer: true },
    { text: "가라사대 친구에게 인사하세요.", answer: true },
    { text: "가라사대 왼쪽을 보세요.", answer: true },
    { text: "가라사대 오른쪽을 보세요.", answer: true },
    { text: "가라사대 손을 머리 위에서 흔드세요.", answer: true },
    { text: "가라사대 양손을 앞으로 뻗으세요.", answer: true },

    { text: "로봇처럼 걸으세요.", answer: false },
    { text: "제자리 뛰기.", answer: false },
    { text: "크게 웃으세요.", answer: false },
    { text: "하늘을 보세요.", answer: false },
    { text: "바닥을 보세요.", answer: false },
    { text: "친구에게 인사하세요.", answer: false },
    { text: "왼쪽을 보세요.", answer: false },
    { text: "오른쪽을 보세요.", answer: false },
    { text: "손을 머리 위에서 흔드세요.", answer: false },
    { text: "양손을 앞으로 뻗으세요.", answer: false }

];


/* ===========================
   명령 가져오기
=========================== */

function getRandomCommand() {

    return COMMANDS[
        Math.floor(Math.random() * COMMANDS.length)
    ];

}


/* ===========================
   명령 섞기
=========================== */

function shuffleCommands() {

    for (let i = COMMANDS.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [COMMANDS[i], COMMANDS[j]] =
        [COMMANDS[j], COMMANDS[i]];

    }

}


/* ===========================
   개수 확인
=========================== */

function getCommandCount() {

    return COMMANDS.length;

}


/* ===========================
   초기 섞기
=========================== */

shuffleCommands();
