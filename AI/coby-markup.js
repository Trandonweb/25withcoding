/* COBY AI response markup + UI enhancements */
(function () {
    "use strict";

    const FIREBASE_VERSION = "12.17.1";
    const MAIN_CONFIG = {
        apiKey: "AIzaSyAiO65YzYeRfuf6fCzosuW7OAVV47o47Js",
        authDomain: "coby-ai-328dd.firebaseapp.com",
        projectId: "coby-ai-328dd",
        storageBucket: "coby-ai-328dd.firebasestorage.app",
        messagingSenderId: "865530259286",
        appId: "1:865530259286:web:6feaa5781dc538700b18f7"
    };

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>\"]/g, function (char) {
            return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char];
        });
    }

    function renderInline(text) {
        return escapeHtml(text).replace(/\*\*\*([\s\S]*?)\*\*\*/g, "<strong>$1</strong>");
    }

    function renderCobyMarkup(text) {
        const source = String(text ?? "").replace(/\r\n?/g, "\n");
        const blocks = [];
        const token = "__COBY_BLOCK_";
        const save = html => { const i = blocks.length; blocks.push(html); return token + i + "__"; };
        let output = source;

        output = output.replace(/<<<([\s\S]*?)>>>/g, function (_, value) {
            const raw = value.replace(/^\n|\n$/g, "");
            return save(
                '<div class="coby-copy" data-copy-text="' + escapeHtml(raw).replace(/'/g, "&#39;") + '">' +
                '<div class="coby-copy-head"><span>복사 가능한 내용</span><button type="button" class="coby-copy-btn">📋 복사</button></div>' +
                '<pre>' + escapeHtml(raw) + '</pre></div>'
            );
        });

        output = output.replace(/\[\[\[([\s\S]*?)\]\]\]/g, (_, value) => save('<div class="coby-callout coby-warning"><span>⚠️</span><div>' + renderInline(value.trim()) + '</div></div>'));
        output = output.replace(/\{\{\{([\s\S]*?)\}\}\}/g, (_, value) => save('<div class="coby-callout coby-success"><span>✅</span><div>' + renderInline(value.trim()) + '</div></div>'));
        output = output.replace(/\(\(\(([\s\S]*?)\)\)\)/g, (_, value) => save('<div class="coby-callout coby-tip"><span>💡</span><div>' + renderInline(value.trim()) + '</div></div>'));

        output = renderInline(output);
        output = output.replace(/^\s*-{3,}\s*$/gm, '<hr class="coby-divider">');
        output = output.replace(/\n/g, "<br>");
        output = output.replace(/__COBY_BLOCK_(\d+)__/g, (_, i) => blocks[Number(i)] || "");
        return output;
    }

    async function copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
        }
        const old = button.textContent;
        button.textContent = "✅ 복사됨";
        setTimeout(() => button.textContent = old, 1400);
    }

    function addAnswerCopyButton(message, rawText) {
        if (message.querySelector(".coby-answer-actions")) return;
        const actions = document.createElement("div");
        actions.className = "coby-answer-actions";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "coby-answer-copy";
        button.textContent = "📋 답변 복사";
        button.addEventListener("click", () => copyText(rawText, button));
        actions.appendChild(button);
        message.appendChild(actions);
    }

    function enhanceMessage(message) {
        if (!message || message.dataset.cobyEnhanced === "1") return;
        const label = message.querySelector(".message-label");
        if (!label) return;

        const rawText = Array.from(message.childNodes)
            .filter(node => node !== label)
            .map(node => node.nodeType === Node.TEXT_NODE ? node.textContent : node.textContent)
            .join("")
            .trim();

        if (message.classList.contains("ai")) {
            const content = document.createElement("div");
            content.className = "message-content";
            content.innerHTML = renderCobyMarkup(rawText);
            message.innerHTML = "";
            message.appendChild(label);
            message.appendChild(content);
            addAnswerCopyButton(message, rawText);
        }

        message.dataset.cobyEnhanced = "1";
    }

    function enhanceMessages() {
        document.querySelectorAll("#messages .message").forEach(enhanceMessage);
    }

    function replaceInputWithTextarea() {
        const old = document.getElementById("userInput");
        if (!old || old.tagName === "TEXTAREA") return;

        const area = document.createElement("textarea");
        area.id = "userInput";
        area.placeholder = old.placeholder;
        area.autocomplete = old.autocomplete || "off";
        area.spellcheck = false;
        area.rows = 1;
        area.value = old.value;
        old.replaceWith(area);

        function resize() {
            area.style.height = "auto";
            area.style.height = Math.min(area.scrollHeight, 150) + "px";
        }

        area.addEventListener("input", resize);
        area.addEventListener("keydown", function (event) {
            if (event.key === "Enter" && event.shiftKey) return;
            if (event.key === "Enter") {
                event.preventDefault();
                if (typeof window.sendMessage === "function") window.sendMessage();
            }
        });
        resize();
    }

    async function deleteConversation(id, item) {
        const userId = localStorage.getItem("userId");
        if (!userId || !id) return;
        if (!confirm("이 대화를 삭제할까요?")) return;

        try {
            const [{ initializeApp }, { getFirestore, doc, getDocs, collection, deleteDoc, writeBatch }] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-app.js"),
                import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-firestore.js")
            ]);
            const app = initializeApp(MAIN_CONFIG, "cobyUiDelete");
            const db = getFirestore(app);
            const messages = collection(db, "people", userId, "conversations", id, "messages");
            const snap = await getDocs(messages);
            const batch = writeBatch(db);
            snap.forEach(m => batch.delete(m.ref));
            batch.delete(doc(db, "people", userId, "conversations", id));
            await batch.commit();

            const current = item && item.classList.contains("active");
            item?.remove();
            if (current) {
                const input = document.getElementById("userInput");
                if (typeof window.newChat === "function") await window.newChat();
                else if (input) input.focus();
            }
        } catch (error) {
            console.error("대화 삭제 실패:", error);
            alert("대화 삭제에 실패했습니다.");
        }
    }

    function enhanceChatList() {
        document.querySelectorAll("#chatList .chat-item").forEach(item => {
            if (item.querySelector(".chat-delete")) return;
            const onclick = item.getAttribute("onclick");
            let id = null;
            if (onclick) {
                const match = onclick.match(/openConversation\(['\"]([^'\"]+)['\"]\)/);
                if (match) id = match[1];
            }
            // Current index.html uses element.onclick rather than inline onclick.
            // The id is recovered from the active item only when available; for all
            // other items we read the title/date and use the DOM event hook below.
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chat-delete";
            button.textContent = "×";
            button.title = "대화 삭제";
            button.addEventListener("click", async function (event) {
                event.preventDefault();
                event.stopPropagation();
                let conversationId = id;
                if (!conversationId && item.dataset.conversationId) conversationId = item.dataset.conversationId;
                if (!conversationId) {
                    alert("이 대화의 ID를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
                    return;
                }
                await deleteConversation(conversationId, item);
            });
            item.appendChild(button);
        });
    }

    document.addEventListener("click", event => {
        const button = event.target.closest(".coby-copy-btn");
        if (!button) return;
        const box = button.closest(".coby-copy");
        const pre = box?.querySelector("pre");
        if (pre) copyText(pre.textContent, button);
    });

    window.renderCobyMarkup = renderCobyMarkup;

    const observer = new MutationObserver(() => {
        enhanceMessages();
        enhanceChatList();
        replaceInputWithTextarea();
    });

    function start() {
        replaceInputWithTextarea();
        enhanceMessages();
        enhanceChatList();
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
