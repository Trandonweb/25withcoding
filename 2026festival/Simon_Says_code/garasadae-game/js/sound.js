/* ==================================
   sound.js
   가라사대 집중력 게임 사운드 관리
================================== */

class SoundManager {

    constructor() {

        this.enabled = true;

        this.bgm = new Audio("assets/sound/bgm.mp3");
        this.correct = new Audio("assets/sound/correct.mp3");
        this.wrong = new Audio("assets/sound/wrong.mp3");
        this.levelup = new Audio("assets/sound/levelup.mp3");
        this.click = new Audio("assets/sound/click.mp3");
        this.gameover = new Audio("assets/sound/gameover.mp3");
        this.achievement = new Audio("assets/sound/achievement.mp3");

        this.bgm.loop = true;
        this.bgm.volume = 0.3;

        this.correct.volume = 0.8;
        this.wrong.volume = 0.8;
        this.levelup.volume = 0.9;
        this.click.volume = 0.5;
        this.gameover.volume = 0.9;
        this.achievement.volume = 0.9;

    }

    play(sound){

        if(!this.enabled) return;

        sound.currentTime = 0;
        sound.play().catch(()=>{});

    }

    playBGM(){

        if(!this.enabled) return;

        this.bgm.play().catch(()=>{});

    }

    stopBGM(){

        this.bgm.pause();
        this.bgm.currentTime = 0;

    }

    pauseBGM(){

        this.bgm.pause();

    }

    resumeBGM(){

        if(!this.enabled) return;

        this.bgm.play().catch(()=>{});

    }

    playCorrect(){

        this.play(this.correct);

    }

    playWrong(){

        this.play(this.wrong);

    }

    playLevelUp(){

        this.play(this.levelup);

    }

    playClick(){

        this.play(this.click);

    }

    playGameOver(){

        this.play(this.gameover);

    }

    playAchievement(){

        this.play(this.achievement);

    }

    setVolume(volume){

        this.bgm.volume = volume;
        this.correct.volume = volume;
        this.wrong.volume = volume;
        this.levelup.volume = volume;
        this.click.volume = volume;
        this.gameover.volume = volume;
        this.achievement.volume = volume;

    }

    mute(){

        this.enabled = false;

        this.stopBGM();

    }

    unmute(){

        this.enabled = true;

    }

    toggle(){

        if(this.enabled){

            this.mute();

        }else{

            this.unmute();

        }

    }

}

const sound = new SoundManager();


/* ==========================
   버튼 효과음 자동 연결
========================== */

document.querySelectorAll("button").forEach(button=>{

    button.addEventListener("click",()=>{

        sound.playClick();

    });

});


/* ==========================
   창 닫을 때 BGM 종료
========================== */

window.addEventListener("beforeunload",()=>{

    sound.stopBGM();

});
