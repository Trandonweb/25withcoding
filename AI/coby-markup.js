/*
 * COBY AI custom response markup
 *
 * ***text***  -> bold
 * <<<text>>>  -> copy box
 * [[[text]]]  -> warning box
 * {{{text}}}  -> success box
 * (((text)))  -> tip box
 * ---         -> divider
 */

(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value).replace(/[&<>\"]/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;"
            }[char];
        });
    }

    function renderInline(text) {
        let result = escapeHtml(text);

        result = result.replace(/\*\*\*([\s\S]*?)\*\*\*/g, "<strong>$1</strong>");

        return result;
    }

    function renderCobyMarkup(text) {
        const source = String(text ?? "").replace(/\r\n?/g, "\n");
        const blocks = [];
        const token = "__COBY_BLOCK_";

        function saveBlock(html) {
            const index = blocks.length;
            blocks.push(html);
            return token + index + "__";
        }

        let output = source;

        // Copy blocks are processed first so their contents are never
        // interpreted as HTML or as another COBY markup command.
        output = output.replace(/<<<([\s\S]*?)>>>/g, function (_, value) {
            const raw = value.replace(/^\n|\n$/g, "");
            const encoded = escapeHtml(raw);

            return saveBlock(
                '<div class="coby-copy" data-copy-text="' +
                escapeHtml(raw).replace(/'/g, "&#39;") +
                '">' +
                '<div class="coby-copy-head">' +
                '<span>복사 가능한 내용</span>' +
                '<button type="button" class="coby-copy-btn">📋 복사</button>' +
                '</div>' +
                '<pre>' + encoded + '</pre>' +
                '</div>'
            );
        });

        // Warning / success / tip blocks can contain bold markup.
        output = output.replace(/\[\[\[([\s\S]*?)\]\]\]/g, function (_, value) {
            return saveBlock(
                '<div class="coby-callout coby-warning">' +
                '<span class="coby-callout-icon">⚠️</span>' +
                '<div>' + renderInline(value.trim()) + '</div>' +
                '</div>'
            );
        });

        output = output.replace(/\{\{\{([\s\S]*?)\}\}\}/g, function (_, value) {
            return saveBlock(
                '<div class="coby-callout coby-success">' +
                '<span class="coby-callout-icon">✅</span>' +
                '<div>' + renderInline(value.trim()) + '</div>' +
                '</div>'
            );
        });

        output = output.replace(/\(\(\(([\s\S]*?)\)\)\)/g, function (_, value) {
            return saveBlock(
                '<div class="coby-callout coby-tip">' +
                '<span class="coby-callout-icon">💡</span>' +
                '<div>' + renderInline(value.trim()) + '</div>' +
                '</div>'
            );
        });

        // Ordinary text is escaped before formatting.
        output = renderInline(output);

        // Divider: a line containing only three or more hyphens.
        output = output.replace(/^\s*-{3,}\s*$/gm, '<hr class="coby-divider">');

        // Preserve line breaks without exposing HTML from the model.
        output = output.replace(/\n/g, "<br>");

        // Restore trusted blocks created above.
        output = output.replace(/__COBY_BLOCK_(\d+)__/g, function (_, index) {
            return blocks[Number(index)] || "";
        });

        return output;
    }

    async function copyCobyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = "✅ 복사됨";
        } catch (error) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand("copy");
                button.textContent = "✅ 복사됨";
            } finally {
                textarea.remove();
            }
        }

        window.setTimeout(function () {
            button.textContent = "📋 복사";
        }, 1400);
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".coby-copy-btn");
        if (!button) return;

        const box = button.closest(".coby-copy");
        if (!box) return;

        const pre = box.querySelector("pre");
        if (!pre) return;

        copyCobyText(pre.textContent, button);
    });

    window.renderCobyMarkup = renderCobyMarkup;

    // addMessage() in the current COBY page builds the message bubble with
    // innerHTML. Patch that function after the page has loaded so existing
    // chat/history logic remains unchanged.
    function patchAddMessage() {
        if (typeof window.addMessage !== "function") return false;
        if (window.addMessage.__cobyMarkupPatched) return true;

        const original = window.addMessage;

        window.addMessage = function (role, content) {
            const before = document.querySelectorAll("#messages .message").length;
            const result = original.apply(this, arguments);
            const messages = document.querySelectorAll("#messages .message");
            const target = messages[messages.length - 1];

            if (target && messages.length >= before + 1 && role !== "user") {
                const contentNode = target.querySelector(".message-content");

                if (contentNode) {
                    contentNode.innerHTML = renderCobyMarkup(content);
                } else {
                    // Current COBY versions may not use .message-content.
                    // Replace only the text portion while keeping the label.
                    const label = target.querySelector(".message-label");
                    target.innerHTML = "";
                    if (label) target.appendChild(label);
                    const body = document.createElement("div");
                    body.className = "message-content";
                    body.innerHTML = renderCobyMarkup(content);
                    target.appendChild(body);
                }
            }

            return result;
        };

        window.addMessage.__cobyMarkupPatched = true;
        return true;
    }

    // Retry because the Firebase module script and application functions are
    // initialized during page startup.
    let attempts = 0;
    const timer = window.setInterval(function () {
        attempts += 1;
        if (patchAddMessage() || attempts >= 100) {
            window.clearInterval(timer);
        }
    }, 50);

    window.addEventListener("load", patchAddMessage);
})();
