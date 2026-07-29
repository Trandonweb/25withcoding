/* ==================================
   storage.js
   가라사대 집중력 게임 저장 시스템
================================== */

class StorageManager {

    constructor() {

        this.KEY = "garasadaeGameData";

    }

    /* ==========================
       기본 데이터
    ========================== */

    getDefaultData() {

        return {

            bestScore: 0,

            totalPlay: 0,

            totalCorrect: 0,

            totalWrong: 0,

            highestCombo: 0,

            highestLevel: 1,

            achievements: [],

            sound: true,

            bgmVolume: 0.3,

            effectVolume: 0.8

        };

    }

    /* ==========================
       데이터 불러오기
    ========================== */

    load() {

        const data = localStorage.getItem(this.KEY);

        if (!data) {

            return this.getDefaultData();

        }

        try {

            return {

                ...this.getDefaultData(),

                ...JSON.parse(data)

            };

        } catch (e) {

            console.error(e);

            return this.getDefaultData();

        }

    }

    /* ==========================
       저장
    ========================== */

    save(data) {

        localStorage.setItem(

            this.KEY,

            JSON.stringify(data)

        );

    }

    /* ==========================
       최고 점수
    ========================== */

    setBestScore(score) {

        const data = this.load();

        if (score > data.bestScore) {

            data.bestScore = score;

            this.save(data);

        }

    }

    getBestScore() {

        return this.load().bestScore;

    }

    /* ==========================
       플레이 횟수
    ========================== */

    addPlay() {

        const data = this.load();

        data.totalPlay++;

        this.save(data);

    }

    /* ==========================
       정답
    ========================== */

    addCorrect() {

        const data = this.load();

        data.totalCorrect++;

        this.save(data);

    }

    /* ==========================
       오답
    ========================== */

    addWrong() {

        const data = this.load();

        data.totalWrong++;

        this.save(data);

    }

    /* ==========================
       최고 콤보
    ========================== */

    setHighestCombo(combo) {

        const data = this.load();

        if (combo > data.highestCombo) {

            data.highestCombo = combo;

            this.save(data);

        }

    }

    getHighestCombo() {

        return this.load().highestCombo;

    }

    /* ==========================
       최고 레벨
    ========================== */

    setHighestLevel(level) {

        const data = this.load();

        if (level > data.highestLevel) {

            data.highestLevel = level;

            this.save(data);

        }

    }

    getHighestLevel() {

        return this.load().highestLevel;

    }

    /* ==========================
       업적
    ========================== */

    unlockAchievement(id) {

        const data = this.load();

        if (!data.achievements.includes(id)) {

            data.achievements.push(id);

            this.save(data);

        }

    }

    getAchievements() {

        return this.load().achievements;

    }

    /* ==========================
       사운드 설정
    ========================== */

    setSound(enabled) {

        const data = this.load();

        data.sound = enabled;

        this.save(data);

    }

    isSoundEnabled() {

        return this.load().sound;

    }

    /* ==========================
       볼륨
    ========================== */

    setBgmVolume(volume) {

        const data = this.load();

        data.bgmVolume = volume;

        this.save(data);

    }

    getBgmVolume() {

        return this.load().bgmVolume;

    }

    setEffectVolume(volume) {

        const data = this.load();

        data.effectVolume = volume;

        this.save(data);

    }

    getEffectVolume() {

        return this.load().effectVolume;

    }

    /* ==========================
       초기화
    ========================== */

    reset() {

        localStorage.removeItem(this.KEY);

    }

}

const storage = new StorageManager();
