let gameAreaRef = null;

const SIZE = 15;

let maze = [];
let player = { x: 1, y: 1 };
let ai = { x: 1, y: 1 };

let finish = {
    x: SIZE - 2,
    y: SIZE - 2
};

let difficulty = "easy";

let gameOver = false;

let aiDir = 1;

export function openMaze(gameArea){

    gameAreaRef = gameArea;

    gameArea.innerHTML = `
        <div class="game-title">
            미로
        </div>

        <div style="
            max-width:600px;
            margin:auto;
            display:flex;
            flex-direction:column;
            gap:20px;
        ">
            <button class="game-select-btn"
                onclick="window.startMaze('easy')">
                쉬움
            </button>

            <button class="game-select-btn"
                onclick="window.startMaze('normal')">
                보통
            </button>

            <button class="game-select-btn"
                onclick="window.startMaze('hard')">
                어려움
            </button>
        </div>
    `;
}

window.startMaze = function(level){

    difficulty = level;

    generateMaze();

    player = { x:1, y:1 };
    ai = { x:1, y:1 };
    
    aiDir = 1;
    
    gameOver = false;

    renderMaze();

    document.onkeydown = handleKey;

    startAI();
};

function generateMaze(){

    maze = Array.from(
        { length: SIZE },
        () => Array(SIZE).fill(1)
    );

    carve(1,1);

    maze[1][1] = 0;
    maze[finish.y][finish.x] = 0;
}

function carve(x,y){

    maze[y][x] = 0;

    const dirs = [
        [0,-2],
        [2,0],
        [0,2],
        [-2,0]
    ];

    shuffle(dirs);

    for(const [dx,dy] of dirs){

        const nx = x + dx;
        const ny = y + dy;

        if(
            nx > 0 &&
            ny > 0 &&
            nx < SIZE-1 &&
            ny < SIZE-1 &&
            maze[ny][nx] === 1
        ){

            maze[
                y + dy/2
            ][
                x + dx/2
            ] = 0;

            carve(nx,ny);
        }
    }
}

function shuffle(arr){

    for(let i=arr.length-1;i>0;i--){

        const j =
            Math.floor(
                Math.random()*(i+1)
            );

        [arr[i],arr[j]]
            =
        [arr[j],arr[i]];
    }
}

function renderMaze(){

    let html = `
        <div
            id="mazeBoard"
            style="
                display:grid;
                grid-template-columns:
                    repeat(${SIZE},24px);
                justify-content:center;
                margin-top:20px;
            ">
    `;

    for(let y=0;y<SIZE;y++){

        for(let x=0;x<SIZE;x++){

            let color = "#fff";

            if(maze[y][x]===1){
                color="#222";
            }

            if(
                x===finish.x &&
                y===finish.y
            ){
                color="#33cc77";
            }

            if(
                x===ai.x &&
                y===ai.y
            ){
                color="#ff5555";
            }

            if(
                x===player.x &&
                y===player.y
            ){
                color="#4488ff";
            }

            html += `
                <div
                    style="
                        width:24px;
                        height:24px;
                        background:${color};
                        border:1px solid #ddd;
                    ">
                </div>
            `;
        }
    }

    html += "</div>";

    html += `
        <p
            style="
                text-align:center;
                margin-top:15px;
            ">
            🔵 플레이어
            🔴 AI
            🟢 도착지
        </p>
    `;

    gameAreaRef.innerHTML = html;
}

function handleKey(e){

    if(gameOver) return;

    let dx = 0;
    let dy = 0;

    if(e.key==="ArrowUp") dy=-1;
    if(e.key==="ArrowDown") dy=1;
    if(e.key==="ArrowLeft") dx=-1;
    if(e.key==="ArrowRight") dx=1;

    movePlayer(dx,dy);
}

function movePlayer(dx,dy){

    const nx = player.x + dx;
    const ny = player.y + dy;

    if(
        nx<0 ||
        ny<0 ||
        nx>=SIZE ||
        ny>=SIZE
    ){
        return;
    }

    if(
        maze[ny][nx]===1
    ){
        return;
    }

    player.x = nx;
    player.y = ny;

    renderMaze();

    checkFinish();
}

function startAI(){

    const speed = {
        easy:700,
        normal:500,
        hard:300
    };

    const timer =
        setInterval(()=>{

            if(gameOver){

                clearInterval(timer);
                return;
            }

            aiStep();

        },speed[difficulty]);
}

function aiStep(){

    if(difficulty === "easy"){
        aiEasy();
        return;
    }

    if(difficulty === "normal"){
        aiNormal();
        return;
    }

    if(difficulty === "hard"){
        aiHard();
        return;
    }
}

function aiEasy(){

    const dirs = [
        [0,-1],
        [1,0],
        [0,1],
        [-1,0]
    ];

    const leftDir =
        (aiDir + 3) % 4;

    const lx =
        ai.x + dirs[leftDir][0];

    const ly =
        ai.y + dirs[leftDir][1];

    if(canMove(lx,ly)){

        aiDir = leftDir;

        ai.x = lx;
        ai.y = ly;

        renderMaze();
        checkFinish();
        return;
    }

    const fx =
        ai.x + dirs[aiDir][0];

    const fy =
        ai.y + dirs[aiDir][1];

    if(canMove(fx,fy)){

        ai.x = fx;
        ai.y = fy;

        renderMaze();
        checkFinish();
        return;
    }

    aiDir =
        (aiDir + 1) % 4;
}

function aiNormal(){

    const shortest =
        bfs(
            ai.x,
            ai.y,
            finish.x,
            finish.y
        );

    if(shortest.length < 2){
        return;
    }

    // 10% 확률로 일부러 다른 길 탐색
    if(Math.random() < 0.10){

        const dirs = shuffleCopy([
            [1,0],
            [-1,0],
            [0,1],
            [0,-1]
        ]);

        for(const [dx,dy] of dirs){

            const nx = ai.x + dx;
            const ny = ai.y + dy;

            if(!canMove(nx,ny)){
                continue;
            }

            // 현재 최단경로의 다음 칸이면 의미 없음
            if(
                nx === shortest[1].x &&
                ny === shortest[1].y
            ){
                continue;
            }

            // 여기서도 도착 가능한 길인지 확인
            const test =
                bfs(
                    nx,
                    ny,
                    finish.x,
                    finish.y
                );

            if(test.length){

                ai.x = nx;
                ai.y = ny;

                renderMaze();
                checkFinish();
                return;
            }
        }
    }

    // 대부분은 최단경로 진행
    moveAIByPath(shortest);
}

function aiHard(){
    moveAIByPath(
        bfs(
            ai.x,
            ai.y,
            finish.x,
            finish.y
        )
    );
}

function moveAIByPath(path){

    if(path.length < 2){
        return;
    }

    ai.x = path[1].x;
    ai.y = path[1].y;

    renderMaze();

    checkFinish();
}

function bfs(sx,sy,tx,ty){

    const q = [
        {
            x:sx,
            y:sy,
            path:[{x:sx,y:sy}]
        }
    ];

    const visited =
        new Set([
            sx+","+sy
        ]);

    while(q.length){

        const cur =
            q.shift();

        if(
            cur.x===tx &&
            cur.y===ty
        ){
            return cur.path;
        }

        const dirs = [
            [1,0],
            [-1,0],
            [0,1],
            [0,-1]
        ];

        for(const [dx,dy] of dirs){

            const nx =
                cur.x + dx;

            const ny =
                cur.y + dy;

            const key =
                nx+","+ny;

            if(
                nx<0 ||
                ny<0 ||
                nx>=SIZE ||
                ny>=SIZE
            ){
                continue;
            }

            if(
                maze[ny][nx]===1
            ){
                continue;
            }

            if(
                visited.has(key)
            ){
                continue;
            }

            visited.add(key);

            q.push({
                x:nx,
                y:ny,
                path:[
                    ...cur.path,
                    {
                        x:nx,
                        y:ny
                    }
                ]
            });
        }
    }

    return [];
}

function checkFinish(){

    if(
        player.x===finish.x &&
        player.y===finish.y
    ){

        gameOver = true;

        alert("PLAYER WIN");

        return;
    }

    if(
        ai.x===finish.x &&
        ai.y===finish.y
    ){

        gameOver = true;

        alert("AI WIN");
    }
}

function canMove(x,y){

    if(
        x < 0 ||
        y < 0 ||
        x >= SIZE ||
        y >= SIZE
    ){
        return false;
    }

    return maze[y][x] === 0;
}
