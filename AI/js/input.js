/* COBY input behavior: Enter sends, Shift+Enter inserts a newline. */

export function initCobyInput({ input, send }) {
    if (!input) return;

    const resize = () => {
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
    };

    input.addEventListener("input", resize);

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        if (event.shiftKey) {
            requestAnimationFrame(resize);
            return;
        }

        event.preventDefault();
        send();
    });

    resize();
}
