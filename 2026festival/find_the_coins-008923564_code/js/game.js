const map = document.getElementById("map");

function gameLoop(){

    if(keys["w"] || keys["W"] || keys["ArrowUp"]){
        playerY -= speed;
    }

    if(keys["s"] || keys["S"] || keys["ArrowDown"]){
        playerY += speed;
    }

    if(keys["a"] || keys["A"] || keys["ArrowLeft"]){
        playerX -= speed;
    }

    if(keys["d"] || keys["D"] || keys["ArrowRight"]){
        playerX += speed;
    }

    playerX=Math.max(0,Math.min(2460,playerX));
    playerY=Math.max(0,Math.min(2460,playerY));

    player.style.left=playerX+"px";
    player.style.top=playerY+"px";

    requestAnimationFrame(gameLoop);
}

gameLoop();
