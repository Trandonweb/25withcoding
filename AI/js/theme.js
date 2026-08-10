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

function updateCobyLogo(dark) {
    const logo = document.getElementById("cobyLogo");
    if (!logo) return;

    const target = dark ? DARK_LOGO : LIGHT_LOGO;
    if (logo.getAttribute("src") !== target) {
        logo.src = target;
    }
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
