let _state = { x: 0, y: 0, dragging: false, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 };

export function initAvatarCropper(previewImgId, inputId, resetBtnId, initialX = 0, initialY = 0) {
    const img = document.getElementById(previewImgId);
    const input = document.getElementById(inputId);
    const resetBtn = document.getElementById(resetBtnId);
    if (!img || !input) return;

    // Set initial offsets
    _state.x = initialX || 0;
    _state.y = initialY || 0;
    applyTransform(img);

    // Update src when input changes
    input.addEventListener('input', () => { img.src = input.value || ''; resetOffsets(); });

    // Pointer events for dragging
    img.style.touchAction = 'none';
    img.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        _state.dragging = true;
        _state.startX = e.clientX;
        _state.startY = e.clientY;
        _state.imgStartX = _state.x;
        _state.imgStartY = _state.y;
        img.setPointerCapture(e.pointerId);
    });
    img.addEventListener('pointermove', (e) => {
        if (!_state.dragging) return;
        const dx = e.clientX - _state.startX;
        const dy = e.clientY - _state.startY;
        _state.x = _state.imgStartX + dx;
        _state.y = _state.imgStartY + dy;
        applyTransform(img);
    });
    img.addEventListener('pointerup', (e) => {
        _state.dragging = false;
        try { img.releasePointerCapture(e.pointerId); } catch(e){}
    });
    img.addEventListener('pointercancel', () => { _state.dragging = false; });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => { resetOffsets(); applyTransform(img); });
    }
}

function applyTransform(img) {
    // Apply translate to the image to simulate moving inside the preview frame
    img.style.transform = `translate(${_state.x}px, ${_state.y}px)`;
}

function resetOffsets() {
    _state.x = 0; _state.y = 0;
}

export function getAvatarOffsets() {
    return { x: _state.x, y: _state.y };
}

export function setAvatarImageSrc(previewImgId, src) {
    const img = document.getElementById(previewImgId);
    if (img) img.src = src || '';
}
