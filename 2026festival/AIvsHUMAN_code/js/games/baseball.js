<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚾ AI 투수 챌린지</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0f0f0f;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
        }
        /* 게임이 렌더링될 메인 영역 컨테이너 */
        #game-container {
            width: 100%;
            max-width: 500px;
            height: 100%;
            max-height: 850px;
            background-color: #121212;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
            position: relative;
        }
    </style>
</head>
<body>

    <!-- 게임이 구동될 영역 -->
    <div id="game-container"></div>

    <!-- ES Module로 baseball.js 연결 -->
    <script type="module">
        import { openBaseball } from './baseball.js';

        // DOM이 완전히 로드된 후 게임 영역 컨테이너를 전달하여 실행
        window.addEventListener('DOMContentLoaded', () => {
            const gameArea = document.getElementById('game-container');
            openBaseball(gameArea);
        });
    </script>

</body>
</html>
