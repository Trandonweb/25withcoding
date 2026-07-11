/**
 * maps.js
 * 게임 월드 및 맵 구조 데이터 관리
 */

// 맵 크기 정의
const MAP_W = 3000;
const MAP_H = 3000;
const HOUSE_MAP_W = 600;
const HOUSE_MAP_H = 600;

// 맵 오브젝트 설정
const houseObj = {
    x: 1600, 
    y: 1300,
    w: 160,
    h: 140,
    doorX: 1680, 
    doorY: 1430,
    radius: 50
};

const houseExitObj = {
    x: HOUSE_MAP_W / 2,
    y: HOUSE_MAP_H - 40,
    radius: 50
};

/**
 * 특정 맵의 지형이나 장애물을 확인하는 함수
 * (추후 충돌 감지 로직에 사용)
 */
function isCollidingWithMap(x, y, mapType) {
    if (mapType === "main") {
        // 메인 맵에서의 충돌 로직
        if (x > houseObj.x && x < houseObj.x + houseObj.w &&
            y > houseObj.y && y < houseObj.y + houseObj.h) {
            return true; // 집에 충돌
        }
    }
    return false;
}

/**
 * 맵별 스폰 위치 반환
 */
function getSpawnPoint(mapType) {
    if (mapType === "main") {
        return { x: MAP_W / 2, y: MAP_H / 2 };
    } else if (mapType === "house") {
        return { x: HOUSE_MAP_W / 2, y: HOUSE_MAP_H / 2 };
    }
    return { x: 0, y: 0 };
}
