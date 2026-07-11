// ============================================
// utils.js
// 화면 모니터링 공용 유틸리티
// ============================================

/**
 * sleep(ms)
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 현재 시간 문자열
 * 예) 14:03:27
 */
export function getTimeString(date = new Date()) {

    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");

    return `${h}:${m}:${s}`;

}

/**
 * 날짜 + 시간
 * 예) 2026-07-11 14:03:27
 */
export function getDateTimeString(date = new Date()) {

    const y = date.getFullYear();
    const mon = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${mon}-${d} ${getTimeString(date)}`;

}

/**
 * Clamp
 */
export function clamp(value, min, max) {

    return Math.min(max, Math.max(min, value));

}

/**
 * 랜덤 정수
 */
export function randomInt(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}

/**
 * 안전한 JSON 복사
 */
export function deepCopy(obj) {

    return JSON.parse(JSON.stringify(obj));

}

/**
 * debounce
 */
export function debounce(func, delay = 300) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(() => {

            func(...args);

        }, delay);

    };

}

/**
 * throttle
 */
export function throttle(func, delay = 300) {

    let waiting = false;

    return (...args) => {

        if (waiting) return;

        waiting = true;

        func(...args);

        setTimeout(() => {

            waiting = false;

        }, delay);

    };

}

/**
 * Blob → ObjectURL
 */
export function blobToURL(blob) {

    return URL.createObjectURL(blob);

}

/**
 * ObjectURL 제거
 */
export function revokeURL(url) {

    try {

        URL.revokeObjectURL(url);

    } catch (e) {

        console.warn(e);

    }

}

/**
 * 이미지 캐시 방지
 */
export function noCache(url) {

    if (!url) return "";

    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;

}

/**
 * 현재 창이 활성화되어 있는지
 */
export function isVisible() {

    return !document.hidden;

}

/**
 * 현재 창에 포커스가 있는지
 */
export function hasFocus() {

    return document.hasFocus();

}

/**
 * 브라우저 종류
 */
export function getBrowser() {

    const ua = navigator.userAgent;

    if (ua.includes("Edg"))
        return "Edge";

    if (ua.includes("Chrome"))
        return "Chrome";

    if (ua.includes("Firefox"))
        return "Firefox";

    if (ua.includes("Safari"))
        return "Safari";

    return "Unknown";

}

/**
 * UUID 생성
 */
export function uuid() {

    if (crypto.randomUUID)
        return crypto.randomUUID();

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        c => {

            const r = Math.random() * 16 | 0;

            const v = c === "x"
                ? r
                : (r & 0x3 | 0x8);

            return v.toString(16);

        }
    );

}

/**
 * 숫자 앞 0 채우기
 */
export function pad(num, len = 2) {

    return String(num).padStart(len, "0");

}

/**
 * KB/MB 표시
 */
export function formatBytes(bytes) {

    if (bytes < 1024)
        return `${bytes} B`;

    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;

}

/**
 * 화면 비율 계산
 */
export function fitSize(
    srcWidth,
    srcHeight,
    maxWidth,
    maxHeight
) {

    const ratio = Math.min(
        maxWidth / srcWidth,
        maxHeight / srcHeight
    );

    return {

        width: Math.round(srcWidth * ratio),
        height: Math.round(srcHeight * ratio)

    };

}

/**
 * 콘솔 로그
 */
export function log(...args) {

    console.log(
        "[Mirroring]",
        ...args
    );

}

/**
 * 경고 로그
 */
export function warn(...args) {

    console.warn(
        "[Mirroring]",
        ...args
    );

}

/**
 * 오류 로그
 */
export function error(...args) {

    console.error(
        "[Mirroring]",
        ...args
    );

}
