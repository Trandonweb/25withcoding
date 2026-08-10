const SETTINGS_KEY = "coding_with_ramen_settings";
const DEFAULT_COLOR = "#27ae60";
const LIGHT_LOGO = "COBY_AI_logo.png";
const DARK_LOGO = "COBY_AI_logo_dark_mode.png";

function readSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function getPrimaryColor(settings) {
    return settings?.primaryColor || DEFAULT_COLOR;
}

function getDarkMode(settings) {
    return settings?.darkMode === true;
}

function removeLogoBackground(image, threshold = 45) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return image;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = data.data;

    // Detect the background from the four corners and remove nearby colors.
    const corners = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1]
    ];

    const bg = corners.map(([x, y]) => {
        const i = (y * canvas.width + x) * 4;
        return [pixels[i], pixels[i + 1], pixels[i + 2]];
    });

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const closeToBackground = bg.some(([br, bgc, bb]) => {
            const distance = Math.sqrt(
                (r - br) ** 2 +
                (g - bgc) ** 2 +
                (b - bb) ** 2
            );
            return distance <= threshold;
        });

        if (closeToBackground) {
            pixels[i + 3] = 0;
        }
    }

    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png");
}

function updateCobyLogo(dark) {
    const logo = document.getElementById("cobyLogo");
    if (!logo) return;

    const target = dark ? DARK_LOGO : LIGHT_LOGO;

    if (logo.dataset.logoSource === target && logo.dataset.backgroundRemoved === "true") {
        return;
    }

    logo.dataset.logoSource = target;
    logo.dataset.backgroundRemoved = "false";

    const source = new Image();
    source.onload = () => {
        if (!dark) {
            logo.src = target;
            logo.dataset.backgroundRemoved = "false";
            return;
        }

        try {
            logo.src = removeLogoBackground(source);
            logo.dataset.backgroundRemoved = "true";
        } catch (error) {
            console.warn("COBY 로고 자동 배경제거에 실패했습니다.", error);
            logo.src = target;
        }
    };

    source.onerror = () => {
        logo.src = target;
    };

    source.src = target;
}

export function applyCobyTheme() {
    const settings = readSettings();
    const color = getPrimaryColor(settings);
    const dark = getDarkMode(settings);
    const root = document.documentElement;

    root.style.setProperty("--primary-color", color);
    root.classList.toggle("dark-mode", dark);
    root.classList.toggle("light-mode", !dark);

    updateCobyLogo(dark);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#121212" : color);
}

applyCobyTheme();

window.addEventListener("storage", event => {
    if (event.key === SETTINGS_KEY) applyCobyTheme();
});

window.addEventListener("pageshow", applyCobyTheme);
