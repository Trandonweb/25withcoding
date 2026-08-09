const SETTINGS_KEY = "coding_with_ramen_settings";
const DEFAULT_COLOR = "#27ae60";

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

export function applyCobyTheme() {
    const settings = readSettings();
    const color = getPrimaryColor(settings);
    const dark = getDarkMode(settings);
    const root = document.documentElement;

    root.style.setProperty("--primary-color", color);
    root.classList.toggle("dark-mode", dark);
    root.classList.toggle("light-mode", !dark);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#121212" : color);
}

applyCobyTheme();

window.addEventListener("storage", event => {
    if (event.key === SETTINGS_KEY) applyCobyTheme();
});

window.addEventListener("pageshow", applyCobyTheme);
