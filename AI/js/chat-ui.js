/* COBY chat UI helpers. Safe to import after the existing chat code is available. */

export function addAnswerCopyButton(messageElement, rawAnswer = "", plainText = null) {
    if (!messageElement || messageElement.querySelector(".coby-answer-copy")) return;

    const actions = document.createElement("div");
    actions.className = "coby-answer-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "coby-answer-copy";
    button.textContent = "📋 답변 복사";
    button.dataset.copyText = plainText ?? rawAnswer;

    actions.appendChild(button);
    messageElement.appendChild(actions);
}

export function bindChatDeleteButtons({ getConversationId, deleteConversation }) {
    document.addEventListener("click", async event => {
        const button = event.target.closest(".chat-delete");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();

        const id = getConversationId?.(button);
        if (!id) return;

        if (!confirm("이 채팅을 삭제할까요?")) return;
        await deleteConversation(id);
    });
}
