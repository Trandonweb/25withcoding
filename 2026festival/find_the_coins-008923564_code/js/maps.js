/**
 * maps.js
 * 게임 월드 및 맵 구조 데이터 관리
 */

// 맵 크기 정의 (data.js의 GAME_CONFIG를 참조할 수도 있습니다)
const MAP_W = 3000;
const MAP_H = 3000;
const HOUSE_MAP_W = 600;
const HOUSE_MAP_H = 600;

// 건물 오브젝트 설정
const houseObj = {
    x: 1600, 
    y: 1300,
    w: 160,
    h: 140,
    doorX: 1680, 
    doorY: 1430,
    radius: 50 // 상호작용 가능 범위
};

/**
 * 맵의 특정 위치가 충돌 가능한 구역인지 판단
 * @param {number} x - 확인하려는 X 좌표
 * @param {number} y - 확인하려는 Y 좌표
 * @param {string} mapType - 현재 맵 타입
 * @returns {boolean}
 */
function isCollidingWithMap(x, y, mapType) {
    if (mapType === "main") {
        // 메인 맵에서 집 건물 내부로 들어갈 수 없는 경우 (충돌 처리)
        if (x > houseObj.x && x < houseObj.x + houseObj.w &&
            y > houseObj.y && y < houseObj.y + houseObj.h) {
            // 단, 문 근처라면 충돌하지 않도록 예외 처리 가능
            return true;
        }
    }
    return false;
}

/**
 * 특정 맵의 초기 스폰 위치 반환
 * @param {string} mapType 
 * @returns {object} {x, y} 좌표
 */
function getSpawnPoint(mapType) {
    if (mapType === "main") {
        return { x: 1500, y: 1500 };
    } else if (mapType === "house") {
        return { x: HOUSE_MAP_W / 2, y: HOUSE_MAP_H / 2 };
    }
    return { x: 0, y: 0 };
}

/**
 * 맵 그리기 로직 (draw.js에서 호출)
 */
function drawHouseMap(ctx) {
    // 실내 맵 배경
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, HOUSE_MAP_W, HOUSE_MAP_H);
    
    // 실내 꾸미기 요소 등
    ctx.strokeStyle = "#444";
    ctx.strokeRect(50, 50, HOUSE_MAP_W - 100, HOUSE_MAP_H - 100);
}
