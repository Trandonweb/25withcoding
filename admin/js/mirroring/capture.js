// ===========================================
// capture.js
// 화면 캡처 전용
// ===========================================

let stream = null;
let video = null;
let canvas = null;
let ctx = null;

/**
 * 화면 공유 시작
 * 최초 1회만 권한 요청
 */
export async function startCapture() {

    if (stream) return stream;

    stream = await navigator.mediaDevices.getDisplayMedia({

        video: {
            frameRate: 5
        },

        audio: false

    });

    video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");

    return stream;

}

/**
 * 현재 화면 Blob 반환
 */
export async function captureFrame(
    width = 640,
    height = 360,
    quality = 0.45
) {

    if (!stream) {
        throw new Error("Capture가 시작되지 않았습니다.");
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
        video,
        0,
        0,
        width,
        height
    );

    return await new Promise(resolve => {

        canvas.toBlob(

            blob => {

                resolve(blob);

            },

            "image/jpeg",

            quality

        );

    });

}

/**
 * 현재 화면 DataURL 반환
 */
export function captureBase64(
    width = 640,
    height = 360,
    quality = 0.45
) {

    if (!stream) return null;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video,0,0,width,height);

    return canvas.toDataURL(
        "image/jpeg",
        quality
    );

}

/**
 * 현재 화면 ImageBitmap 반환
 * (WebRTC나 Canvas에서 사용 가능)
 */
export async function captureBitmap(
    width = 640,
    height = 360
){

    if(!stream) return null;

    canvas.width=width;
    canvas.height=height;

    ctx.drawImage(video,0,0,width,height);

    return await createImageBitmap(canvas);

}

/**
 * 화면 공유 종료
 */
export function stopCapture(){

    if(!stream) return;

    stream.getTracks().forEach(track=>{

        track.stop();

    });

    stream=null;

    video=null;

    canvas=null;

    ctx=null;

}

/**
 * 화면 공유 여부
 */
export function isCapturing(){

    return stream!=null;

}

/**
 * Stream 반환
 * (WebRTC에서 사용)
 */
export function getCaptureStream(){

    return stream;

}
