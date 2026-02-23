'use strict';

const SCAN_API = '/api/scan';
const CLEAR_MS = 4000;

let isProcessing = false;
let clearTimer = null;

const overlay = document.getElementById('resultOverlay');
const resultCard = document.getElementById('resultCard');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultType = document.getElementById('resultType');
const resultMeta = document.getElementById('resultMeta');

function showResult(data) {
    if (clearTimer) clearTimeout(clearTimer);
    resultCard.className = 'result-card';

    if (data.result === 'valid') {
        resultCard.classList.add('result-valid');
        resultIcon.textContent = '✅';
        resultTitle.textContent = 'VALID';
        resultTitle.style.color = 'var(--success)';
        resultType.textContent = data.type ? `${data.type} Ticket` : '';
        resultMeta.textContent = 'Entry granted — first scan';

    } else if (data.result === 'used') {
        resultCard.classList.add('result-used');
        resultIcon.textContent = '🚫';
        resultTitle.textContent = 'ALREADY USED';
        resultTitle.style.color = 'var(--warning)';
        resultType.textContent = data.type ? `${data.type} Ticket` : '';
        const when = data.firstScanned
            ? `First scanned: ${new Date(data.firstScanned).toLocaleTimeString()}`
            : 'This QR has already been scanned.';
        resultMeta.textContent = when;

    } else if (data.result === 'voided') {
        resultCard.classList.add('result-voided');
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'VOIDED';
        resultTitle.style.color = 'var(--warning)';
        resultType.textContent = data.type ? `${data.type} Ticket` : '';
        resultMeta.textContent = 'This ticket has been voided. Contact organiser.';

    } else {
        resultCard.classList.add('result-invalid');
        resultIcon.textContent = '❌';
        resultTitle.textContent = 'INVALID';
        resultTitle.style.color = 'var(--danger)';
        resultType.textContent = '';
        resultMeta.textContent = 'This QR code is not recognised.';
    }

    overlay.classList.remove('hidden');
    overlay.onclick = dismissResult;
    clearTimer = setTimeout(dismissResult, CLEAR_MS);
}

function dismissResult() {
    overlay.classList.add('hidden');
    overlay.onclick = null;
    isProcessing = false;
}

async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    if ('vibrate' in navigator) navigator.vibrate(80);

    let token = decodedText.trim();
    try {
        const url = new URL(decodedText);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 't' && parts[1]) token = parts[1];
    } catch { /* raw token */ }

    try {
        const resp = await fetch(SCAN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token }),
        });

        if (resp.status === 401) { window.location.href = '/auth/login'; return; }
        if (resp.status === 429) { showResult({ result: 'invalid' }); return; }

        showResult(await resp.json());
    } catch (err) {
        console.error('Scan error:', err);
        showResult({ result: 'invalid' });
    }
}

const html5QrCode = new Html5Qrcode('qr-reader');
const config = {
    fps: 15,
    qrbox: {
        width: Math.min(window.innerWidth * 0.65, 260),
        height: Math.min(window.innerWidth * 0.65, 260),
    },
    aspectRatio: window.innerHeight / window.innerWidth,
    disableFlip: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
};

html5QrCode
    .start({ facingMode: 'environment' }, config, onScanSuccess)
    .catch(err => {
        console.error('Camera error:', err);
        document.querySelector('.scan-hint').textContent =
            '⚠️ Camera unavailable — check browser permissions and use HTTPS.';
    });
