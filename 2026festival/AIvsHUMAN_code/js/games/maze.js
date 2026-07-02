let gameAreaRef = null;

let SIZE = 15;

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

let currentKey = null;
let playerTimer = null;
let aiTimer = null;
export function openMaze(gameArea){

    gameAreaRef = gameArea;

    showDifficultyScreen();
}
function showDifficultyScreen(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>미로</h2>
            <p>난이도를 선택하세요</p>

            <div style="
                display:flex;
                flex-direction:column;
                gap:15px;
                max-width:300px;
                margin:20px auto;
            ">

                <button
                    onclick="window.__mazeStart('easy')"
                    class="game-select-btn">
                    쉬움
                </button>

                <button
                    onclick="window.__mazeStart('normal')"
                    class="game-select-btn">
                    보통
                </button>

                <button
                    onclick="window.__mazeStart('hard')"
                    class="game-select-btn">
                    어려움
                </button>

            </div>
        </div>
    `;

    window.__mazeStart = startMaze;
}
function startMaze(level){

    difficulty = level;

    if(level === "easy"){
        SIZE = 15;
    }
    else if(level === "normal"){
        SIZE = 21;
    }
    else{
        SIZE = 31;
    }

    finish = {
        x: SIZE - 2,
        y: SIZE - 2
    };

    generateMaze();

    player = {
        x:1,
        y:1
    };

    ai = {
        x:1,
        y:1
    };

    aiDir = 1;

    gameOver = false;

    renderMaze();

    document.onkeydown = handleKey;
    document.onkeyup = () => {
    
        currentKey = null;
    
    };
    startPlayer();
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
            nx < SIZE - 1 &&
            ny < SIZE - 1 &&
            maze[ny][nx] === 1
        ){

            maze[
                y + dy / 2
            ][
                x + dx / 2
            ] = 0;

            carve(nx,ny);
        }
    }
}

function shuffle(arr){

    for(let i = arr.length - 1; i > 0; i--){

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [arr[i],arr[j]]
            =
        [arr[j],arr[i]];
    }
}

function renderMaze(){

    const cellSize =
        SIZE === 15 ? 24 :
        SIZE === 21 ? 18 :
        12;

    let html = `
        <div
            id="mazeBoard"
            style="
                display:grid;
                grid-template-columns:
                    repeat(${SIZE},${cellSize}px);
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
                        width:${cellSize}px;
                        height:${cellSize}px;
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

    currentKey = e.key;

    let dx = 0;
    let dy = 0;

    if(e.key==="ArrowUp") dy=-1;
    if(e.key==="ArrowDown") dy=1;
    if(e.key==="ArrowLeft") dx=-1;
    if(e.key==="ArrowRight") dx=1;

    if(dx || dy){
        movePlayer(dx,dy);
    }
}
function movePlayer(dx,dy){

    const nx = player.x + dx;
    const ny = player.y + dy;

    if(
        nx < 0 ||
        ny < 0 ||
        nx >= SIZE ||
        ny >= SIZE
    ){
        return;
    }

    if(maze[ny][nx] === 1){
        return;
    }

    player.x = nx;
    player.y = ny;

    renderMaze();

    checkFinish();
}
function startPlayer(){

    if(playerTimer){
        clearInterval(playerTimer);
    }

    playerTimer = setInterval(()=>{

        if(gameOver){
            return;
        }

        let dx = 0;
        let dy = 0;

        if(currentKey==="ArrowUp") dy=-1;
        if(currentKey==="ArrowDown") dy=1;
        if(currentKey==="ArrowLeft") dx=-1;
        if(currentKey==="ArrowRight") dx=1;

        if(dx || dy){
            movePlayer(dx,dy);
        }

    },50);
}
function startAI(){

    if(aiTimer){
        clearInterval(aiTimer);
    }

    const speed = {
        easy:250,
        normal:180,
        hard:140
    };

    aiTimer = setInterval(()=>{

        if(gameOver){
            clearInterval(aiTimer);
            aiTimer = null;
            return;
        }

        aiStep();

    }, speed[difficulty]);
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

    aiHard();
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

    // 10% 확률로 다른 길 선택
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

            if(
                nx === shortest[1].x &&
                ny === shortest[1].y
            ){
                continue;
            }

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
            path:[
                {
                    x:sx,
                    y:sy
                }
            ]
        }
    ];

    const visited =
        new Set([
            sx + "," + sy
        ]);

    while(q.length){

        const cur =
            q.shift();

        if(
            cur.x === tx &&
            cur.y === ty
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
                nx + "," + ny;

            if(
                nx < 0 ||
                ny < 0 ||
                nx >= SIZE ||
                ny >= SIZE
            ){
                continue;
            }

            if(
                maze[ny][nx] === 1
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
        player.x === finish.x &&
        player.y === finish.y
    ){

        gameOver = true;

        alert("PLAYER WIN");

        return;
    }

    if(
        ai.x === finish.x &&
        ai.y === finish.y
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

function shuffleCopy(arr){

    const copy = [...arr];

    for(
        let i = copy.length - 1;
        i > 0;
        i--
    ){

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [copy[i],copy[j]]
            =
        [copy[j],copy[i]];
    }

    return copy;
}
window.__mazeStart = startMaze;
