const SETTINGS_KEY = "coding_with_ramen_settings";
const DEFAULT_COLOR = "#27ae60";

function getPrimaryColor() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (!saved) return DEFAULT_COLOR;
        const settings = JSON.parse(saved);
        return settings?.primaryColor || DEFAULT_COLOR;
    } catch {
        return DEFAULT_COLOR;
    }
}

export function applyCobyTheme() {
    const color = getPrimaryColor();
    document.documentElement.style.setProperty("--primary-color", color);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", color);
}

applyCobyTheme();

window.addEventListener("storage", event => {
    if (event.key === SETTINGS_KEY) applyCobyTheme();
});
