/**
 * ui.js
 * 게임 UI 상태 관리 및 DOM 조작
 */

// 1. 도감 모달 제어
function openCollection() {
    showCollection = true;
    const modal = document.getElementById('collection-modal');
    const slots = document.getElementById('slots');
    slots.innerHTML = ''; // 기존 슬롯 초기화

    coins.forEach(coin => {
        const slot = document.createElement('div');
        // 슬롯 디자인 적용
        slot.style.cssText = "background:#fff;border:2px solid #ddd;border-radius:8px;padding:16px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;";
        
        // 각 코인별 렌더링 (각 코인 전용 draw 함수 활용)
        const canvas = document.createElement('canvas');
        canvas.width = 60; canvas.height = 70;
        const ctx = canvas.getContext('2d');
        
        // 코인 발견 여부에 따라 다르게 표시
        if (coin.found) {
            // 여기에 코인 종류별 draw 함수 호출 (ex: drawYellowCoinCharacter)
            slot.innerHTML += `<div style="font-size:12px;font-weight:700;margin-top:8px;">${coin.name}</div>`;
            slot.onclick = () => openDetail(coin);
        } else {
            slot.innerHTML += `<div style="font-size:12px;color:#888;margin-top:8px;">???</div>`;
        }
        
        slot.prepend(canvas);
        slots.appendChild(slot);
    });
    
    modal.style.display = 'flex';
}

// 2. 코인 상세 정보 모달 제어
function openDetail(coin) {
    const detailModal = document.getElementById('detail-modal');
    document.getElementById('detail-name').innerText = coin.name;
    document.getElementById('detail-diff').innerText = coin.difficulty;
    document.getElementById('detail-desc').innerText = coin.description;
    document.getElementById('detail-hint').innerText = coin.hint;
    
    detailModal.style.display = 'flex';
}

// 3. 채팅 UI 제어
function toggleChat() {
    const chatInputContainer = document.getElementById('chat-input-container');
    const chatText = document.getElementById('chat-text');
    
    if (chatInputContainer.style.display === 'none' || chatInputContainer.style.display === '') {
        chatInputContainer.style.display = 'flex';
        chatText.focus();
    } else {
        chatInputContainer.style.display = 'none';
    }
}

// 4. 코인 획득 팝업 알림 (화면 중앙 잠시 표시)
function showCoinPopup(coin) {
    const container = document.getElementById('popup-container');
    const div = document.createElement('div');
    div.className = 'coin-popup'; // CSS에 정의된 애니메이션 클래스
    div.innerHTML = `
        <div class="coin-popup-text">🪙 ${coin.name} 획득!</div>
        <div style="font-size:16px; color:#666;">도감에서 확인해보세요.</div>
    `;
    container.appendChild(div);
    
    // 2초 뒤 자동 삭제
    setTimeout(() => div.remove(), 2000);
}

// 5. 모달 닫기 이벤트 바인딩
document.getElementById('detail-close-btn').addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
});
