export const state = {
    currentUserId: null,
    currentPerson: null,
    currentConversationId: null,
    currentProjectId: null,
    currentProject: null,
    isSending: false
};

export const $ = id => document.getElementById(id);

export const isAdmin = () =>
    state.currentPerson?.role === "president" || state.currentPerson?.role === "vice";
