/* ==================================
   tts.js
   가라사대 집중력 게임 TTS 관리
================================== */

class TTSManager {

    constructor() {

        this.enabled = true;

        this.voice = null;

        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;

        this.loadVoice();

        speechSynthesis.onvoiceschanged = () => {

            this.loadVoice();

        };

    }

    /* ==========================
       한국어 음성 찾기
    ========================== */

    loadVoice() {

        const voices = speechSynthesis.getVoices();

        this.voice =
            voices.find(v => v.lang === "ko-KR") ||
            voices.find(v => v.lang.startsWith("ko")) ||
            null;

    }

    /* ==========================
       음성 읽기
    ========================== */

    speak(text) {

        if (!this.enabled) return;

        speechSynthesis.cancel();

        const msg =
            new SpeechSynthesisUtterance(text);

        msg.lang = "ko-KR";

        if (this.voice)
            msg.voice = this.voice;

        msg.rate = this.rate;
        msg.pitch = this.pitch;
        msg.volume = this.volume;

        speechSynthesis.speak(msg);

    }

    /* ==========================
       즉시 정지
    ========================== */

    stop() {

        speechSynthesis.cancel();

    }

    /* ==========================
       일시정지
    ========================== */

    pause() {

        speechSynthesis.pause();

    }

    /* ==========================
       다시 재생
    ========================== */

    resume() {

        speechSynthesis.resume();

    }

    /* ==========================
       말하기 속도
    ========================== */

    setRate(rate) {

        this.rate = rate;

    }

    /* ==========================
       음높이
    ========================== */

    setPitch(pitch) {

        this.pitch = pitch;

    }

    /* ==========================
       볼륨
    ========================== */

    setVolume(volume) {

        this.volume = volume;

    }

    /* ==========================
       음성 켜기
    ========================== */

    enable() {

        this.enabled = true;

    }

    /* ==========================
       음성 끄기
    ========================== */

    disable() {

        this.enabled = false;

        this.stop();

    }

    /* ==========================
       토글
    ========================== */

    toggle() {

        if (this.enabled) {

            this.disable();

        } else {

            this.enable();

        }

    }

    /* ==========================
       카운트다운
    ========================== */

    speakCountdown(second) {

        this.speak(second + "초 남았습니다.");

    }

    /* ==========================
       게임 시작
    ========================== */

    speakStart() {

        this.speak("게임을 시작합니다.");

    }

    /* ==========================
       게임 종료
    ========================== */

    speakGameOver(score) {

        this.speak(
            "게임 종료. 최종 점수는 " +
            score +
            "점입니다."
        );

    }

    /* ==========================
       레벨업
    ========================== */

    speakLevelUp(level) {

        this.speak(
            "레벨 " +
            level +
            " 입니다."
        );

    }

    /* ==========================
       업적
    ========================== */

    speakAchievement(name) {

        this.speak(
            "업적 달성. " +
            name
        );

    }

}

const tts = new TTSManager();


/* ==========================
   창 종료 시 음성 정지
========================== */

window.addEventListener("beforeunload", () => {

    tts.stop();

});
