// ===============================
// achievements.js
// Find the Coins
// ===============================

class AchievementManager {
    constructor() {

        this.achievements = [

            {
                id: "first_coin",
                name: "첫 번째 동전",
                description: "동전 1개 획득",
                unlocked: false
            },

            {
                id: "coin_100",
                name: "동전 부자",
                description: "동전 100개 획득",
                unlocked: false
            },

            {
                id: "coin_500",
                name: "백만장자",
                description: "동전 500개 획득",
                unlocked: false
            },

            {
                id: "level_5",
                name: "모험가",
                description: "레벨 5 달성",
                unlocked: false
            },

            {
                id: "level_10",
                name: "베테랑",
                description: "레벨 10 달성",
                unlocked: false
            },

            {
                id: "no_damage",
                name: "완벽한 플레이",
                description: "피해 없이 클리어",
                unlocked: false
            },

            {
                id: "king_coin",
                name: "왕의 보물",
                description: "왕의 동전 획득",
                unlocked: false
            },

            {
                id: "secret_room",
                name: "탐험가",
                description: "비밀방 발견",
                unlocked: false
            }

        ];

        this.load();
    }

    //----------------------------------
    // 업적 해금
    //----------------------------------

    unlock(id) {

        const achievement = this.achievements.find(a => a.id === id);

        if (!achievement) return;

        if (achievement.unlocked) return;

        achievement.unlocked = true;

        this.save();

        this.showPopup(achievement);

    }

    //----------------------------------
    // 업적 확인
    //----------------------------------

    isUnlocked(id) {

        const achievement = this.achievements.find(a => a.id === id);

        if (!achievement) return false;

        return achievement.unlocked;

    }

    //----------------------------------
    // 게임 데이터 검사
    //----------------------------------

    check(player) {

        if (!player) return;

        if (player.coins >= 1)
            this.unlock("first_coin");

        if (player.coins >= 100)
            this.unlock("coin_100");

        if (player.coins >= 500)
            this.unlock("coin_500");

        if (player.level >= 5)
            this.unlock("level_5");

        if (player.level >= 10)
            this.unlock("level_10");

        if (player.kingCoins >= 1)
            this.unlock("king_coin");

        if (player.secretRooms >= 1)
            this.unlock("secret_room");

        if (
            player.gameClear === true &&
            player.damageTaken === 0
        ) {
            this.unlock("no_damage");
        }

    }

    //----------------------------------
    // 팝업 표시
    //----------------------------------

    showPopup(achievement) {

        console.log(
            "🏆 업적 달성 : " + achievement.name
        );

        const popup = document.createElement("div");

        popup.className = "achievement-popup";

        popup.innerHTML = `
            <h3>🏆 업적 달성!</h3>
            <strong>${achievement.name}</strong>
            <br>
            <small>${achievement.description}</small>
        `;

        document.body.appendChild(popup);

        setTimeout(() => {

            popup.classList.add("show");

        }, 100);

        setTimeout(() => {

            popup.classList.remove("show");

        }, 3500);

        setTimeout(() => {

            popup.remove();

        }, 4000);

    }

    //----------------------------------
    // 저장
    //----------------------------------

    save() {

        localStorage.setItem(
            "FindTheCoinsAchievements",
            JSON.stringify(this.achievements)
        );

    }

    //----------------------------------
    // 불러오기
    //----------------------------------

    load() {

        const data = localStorage.getItem(
            "FindTheCoinsAchievements"
        );

        if (!data) return;

        try {

            const loaded = JSON.parse(data);

            for (const achievement of this.achievements) {

                const saved = loaded.find(
                    a => a.id === achievement.id
                );

                if (saved) {

                    achievement.unlocked = saved.unlocked;

                }

            }

        } catch (e) {

            console.error("업적 데이터 로드 실패", e);

        }

    }

    //----------------------------------
    // 업적 초기화
    //----------------------------------

    reset() {

        for (const achievement of this.achievements) {

            achievement.unlocked = false;

        }

        this.save();

    }

    //----------------------------------
    // 전체 목록 반환
    //----------------------------------

    getAll() {

        return this.achievements;

    }

}

// =====================================
// 전역 객체 생성
// =====================================

const achievementManager = new AchievementManager();
