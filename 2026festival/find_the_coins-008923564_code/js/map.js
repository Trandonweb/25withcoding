// ===== 맵 설정 =====

// 맵 크기
const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2500;

// 맵 요소
const map = document.getElementById("map");

// 맵 크기 적용
map.style.width = MAP_WIDTH + "px";
map.style.height = MAP_HEIGHT + "px";

// ===== 스폰 위치 =====

// 맵 중앙
const SPAWN_X = MAP_WIDTH / 2;
const SPAWN_Y = MAP_HEIGHT / 2;

// 플레이어 시작 위치
let playerX = SPAWN_X - 20;
let playerY = SPAWN_Y - 20;

// 스폰 마커
const spawn = document.getElementById("spawn");

if (spawn) {
    spawn.style.left = (SPAWN_X - 40) + "px";
    spawn.style.top = (SPAWN_Y - 40) + "px";
}
