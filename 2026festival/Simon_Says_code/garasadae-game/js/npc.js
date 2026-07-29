// ==========================================
// npc.js
// ==========================================

// NPC 목록
const npcs = [
    {
        name: "마을 촌장",
        x: 2000,
        y: 2000,
        color: "#ffcc66",
        dialog: [
            "어서 오게.",
            "이곳은 가라사대 마을이네.",
            "WASD로 움직이고 마우스로 둘러볼 수 있지."
        ],
        dialogIndex: 0
    },
    {
        name: "상인",
        x: 2200,
        y: 1950,
        color: "#66ccff",
        dialog: [
            "포션이 필요하신가요?",
            "나중에 상점 기능이 추가될 예정입니다."
        ],
        dialogIndex: 0
    },
    {
        name: "경비병",
        x: 1850,
        y: 2100,
        color: "#ff6666",
        dialog: [
            "북쪽 숲에는 몬스터가 있습니다.",
            "조심하세요!"
        ],
        dialogIndex: 0
    }
];

// 대화 상태
let talkingNPC = null;

// HTML
const dialogBox = document.getElementById("dialogBox");
const dialogText = document.getElementById("dialogText");
const closeDialog = document.getElementById("closeDialog");

// ===============================
// NPC 업데이트
// ===============================
function updateNPC() {

    if (!player) return;

    // E키 입력
    if (keys["e"]) {

        keys["e"] = false;

        if (talkingNPC == null) {

            for (const npc of npcs) {

                const dist = Math.hypot(
                    npc.x - player.x,
                    npc.y - player.y
                );

                if (dist < 100) {

                    openDialog(npc);

                    break;

                }

            }

        } else {

            nextDialog();

        }

    }

}

// ===============================
// NPC 그리기
// ===============================
function drawNPC(ctx) {

    for (const npc of npcs) {

        const x = npc.x - camera.x;
        const y = npc.y - camera.y;

        // 몸
        ctx.fillStyle = npc.color;

        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        // 얼굴
        ctx.fillStyle = "white";

        ctx.beginPath();
        ctx.arc(x - 6, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + 6, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // 이름
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, x, y - 35);

        // 플레이어가 가까우면 느낌표
        const dist = Math.hypot(
            npc.x - player.x,
            npc.y - player.y
        );

        if (dist < 100) {

            ctx.fillStyle = "yellow";
            ctx.font = "24px Arial";
            ctx.fillText("!", x, y - 55);

            ctx.font = "14px Arial";
            ctx.fillStyle = "white";
            ctx.fillText("E", x, y + 45);

        }

    }

}

// ===============================
// 대화 열기
// ===============================
function openDialog(npc) {

    talkingNPC = npc;

    npc.dialogIndex = 0;

    dialogBox.style.display = "block";

    dialogText.textContent = npc.dialog[0];

}

// ===============================
// 다음 대화
// ===============================
function nextDialog() {

    if (!talkingNPC) return;

    talkingNPC.dialogIndex++;

    if (talkingNPC.dialogIndex >= talkingNPC.dialog.length) {

        closeDialogBox();

        return;

    }

    dialogText.textContent =
        talkingNPC.dialog[talkingNPC.dialogIndex];

}

// ===============================
// 대화 종료
// ===============================
function closeDialogBox() {

    talkingNPC = null;

    dialogBox.style.display = "none";

}

// 버튼
closeDialog.addEventListener("click", closeDialogBox);

// ===============================
// NPC 추가 함수
// ===============================
function addNPC(name, x, y, color, dialog) {

    npcs.push({

        name,
        x,
        y,
        color,
        dialog,
        dialogIndex: 0

    });

}

// ===============================
// 디버그
// ===============================
console.log("NPC System Loaded");
