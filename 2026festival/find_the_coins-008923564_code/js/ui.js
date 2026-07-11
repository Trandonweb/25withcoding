/**
 * ui.js
 * 게임 UI 관리 (도감, 상세 정보 모달, 알림 팝업)
 */

// 1. 도감 모달 열기
function openCollection() {
    showCollection = true;
    const modal = document.getElementById('collection-modal');
    const slots = document.getElementById('slots');
    slots.innerHTML = ''; // 슬롯 초기화

    coins.forEach(coin => {
        const slot = document.createElement('div');
        slot.style.cssText = "background:#fff;border:2px solid #ddd;border-radius:8px;padding:16px;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;";
        
        // 발견 여부에 따른 아이콘 렌더링
        const canvas = document.createElement('canvas');
        canvas.width = 60; canvas.height = 70;
        const ctx = canvas.getContext('2d');
        
        if (coin.found) {
            // 발견된 코인만 그리기
            drawCoin(ctx, 30, 35, coin.name); 
            slot.innerHTML += `<div style="font-size:12px;font-weight:700;margin-top:8px;">${coin.name}</div>`;
            slot.onclick = () => openDetail(coin);
        } else {
            // 미발견 코인
            ctx.fillStyle = "#ccc";
            ctx.fillRect(15, 20, 30, 30);
            slot.innerHTML += `<div style="font-size:12px;color:#888;margin-top:8px;">???</div>`;
        }
        
        slot.prepend(canvas);
        slots.appendChild(slot);
    });
    
    modal.style.display = 'flex';
}

// 2. 코인 상세 정보 모달 열기
function openDetail(coin) {
    const detailModal = document.getElementById('detail-modal');
    document.getElementById('detail-name').innerText = coin.name;
    document.getElementById('detail-diff').innerText = coin.difficulty;
    document.getElementById('detail-desc').innerText = coin.description;
    document.getElementById('detail-hint').innerText = coin.hint;
    detailModal.style.display = 'flex';
}

// 3. 채팅창 토글
function toggleChat() {
    const container = document.getElementById('chat-input-container');
    const input = document.getElementById('chat-text');
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'flex';
        input.focus();
    } else {
        container.style.display = 'none';
    }
}

// 4. 코인 획득 알림 팝업
function showCoinPopup(coin) {
    const container = document.getElementById('popup-container');
    const div = document.createElement('div');
    div.className = 'coin-popup';
    div.innerHTML = `
        <div style="font-size:18px; font-weight:bold;">🪙 ${coin.name} 획득!</div>
        <div style="font-size:14px;">도감에서 확인해보세요.</div>
    `;
    container.appendChild(div);
    
    // 2초 후 제거
    setTimeout(() => div.remove(), 2000);
}

// 닫기 버튼 이벤트 등록
document.getElementById('detail-close-btn')?.addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
});
