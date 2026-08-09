/* COBY response renderer */

const escapeHtml = (value = "") => String(value).replace(/[&<>\"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
}[ch]));

export function renderCobyMarkup(source = "") {
    let text = String(source).replace(/\r\n?/g, "\n");
    const blocks = [];

    const stash = (html) => {
        const token = `\uE000COBY${blocks.length}\uE001`;
        blocks.push(html);
        return token;
    };

    // <<< >>> = copy block
    text = text.replace(/<<<([\s\S]*?)>>>/g, (_, value) => stash(
        `<div class="coby-copy"><div class="coby-copy-head"><span>복사할 내용</span><button type="button" class="coby-copy-btn" aria-label="내용 복사">📋 복사</button></div><pre>${escapeHtml(value.trim())}</pre></div>`
    ));

    // Backward-compatible Markdown code fences
    text = text.replace(/```(?:[\w+-]+)?\n?([\s\S]*?)```/g, (_, value) => stash(
        `<div class="coby-copy"><div class="coby-copy-head"><span>코드</span><button type="button" class="coby-copy-btn" aria-label="코드 복사">📋 복사</button></div><pre>${escapeHtml(value.trim())}</pre></div>`
    ));

    text = escapeHtml(text);

    // Inline COBY markup
    text = text.replace(/\*\*\*([\s\S]*?)\*\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\[\[\[([\s\S]*?)\]\]\]/g, '<div class="coby-callout coby-warning">⚠️ <span>$1</span></div>');
    text = text.replace(/\{\{\{([\s\S]*?)\}\}\}/g, '<div class="coby-callout coby-success">✅ <span>$1</span></div>');
    text = text.replace(/\(\(\(([\s\S]*?)\)\)\)/g, '<div class="coby-callout coby-tip">💡 <span>$1</span></div>');
    text = text.replace(/^---$/gm, '<hr class="coby-divider">');
    text = text.replace(/\n/g, "<br>");

    return text.replace(/\uE000COBY(\d+)\uE001/g, (_, index) => blocks[Number(index)]);
}

export function plainCobyText(source = "") {
    return String(source)
        .replace(/<<<([\s\S]*?)>>>/g, "$1")
        .replace(/\[\[\[([\s\S]*?)\]\]\]/g, "$1")
        .replace(/\{\{\{([\s\S]*?)\}\}\}/g, "$1")
        .replace(/\(\(\(([\s\S]*?)\)\)\)/g, "$1")
        .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
        .replace(/^---$/gm, "")
        .replace(/```(?:[\w+-]+)?\n?([\s\S]*?)```/g, "$1")
        .trim();
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy failed");
}

export function bindCobyCopy(root = document) {
    root.addEventListener("click", async event => {
        const button = event.target.closest(".coby-copy-btn, .coby-answer-copy");
        if (!button) return;

        const box = button.closest(".coby-copy");
        const text = box
            ? box.querySelector("pre")?.textContent ?? ""
            : button.dataset.copyText ?? "";

        try {
            await copyText(text);
            const original = button.textContent;
            button.textContent = "✅ 복사됨";
            setTimeout(() => { button.textContent = original; }, 1200);
        } catch {
            button.textContent = "복사 실패";
            setTimeout(() => { button.textContent = "📋 복사"; }, 1200);
        }
    });
}
