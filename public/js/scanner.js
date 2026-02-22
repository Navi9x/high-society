'use strict';

/**
 * Camera QR scanner using html5-qrcode.
 * Posts scanned tokens to /api/scan and shows a result overlay.
 */

const SCAN_API = '/api/scan';
const CLEAR_MS = 4000; // auto-clear result after 4s

let isProcessing = false;
let clearTimer = null;

// ─── Result overlay elements ─────────────────────────────────────────────────
const overlay = document.getElementById('resultOverlay');
const resultCard = document.getElementById('resultCard');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultType = document.getElementById('resultType');
const resultMeta = document.getElementById('resultMeta');

function showResult(data) {
    // Clear previous timer
    if (clearTimer) clearTimeout(clearTimer);

    resultCard.className = 'result-card'; // reset

    if (data.result === 'valid') {
        resultCard.classList.add('result-valid');
        resultIcon.textContent = '✅';
        resultTitle.textContent = 'VALID';
        resultTitle.style.color = 'var(--success)';
        resultType.textContent = data.type ? `${data.type} Ticket` : '';
        const count = data.scanCount || 1;
        const last = data.lastScan
            ? `Last entry: ${new Date(data.lastScan).toLocaleTimeString()}`
            : 'First entry';
        resultMeta.textContent = `Entry #${count} · ${last}`;

    } else if (data.result === 'voided') {
        resultCard.classList.add('result-voided');
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'VOIDED';
        resultTitle.style.color = 'var(--warning)';
        resultType.textContent = data.type ? `${data.type} Ticket` : '';
        resultMeta.textContent = 'This ticket has been voided. Contact organiser.';

    } else {
        // invalid
        resultCard.classList.add('result-invalid');
        resultIcon.textContent = '❌';
        resultTitle.textContent = 'INVALID';
        resultTitle.style.color = 'var(--danger)';
        resultType.textContent = '';
        resultMeta.textContent = 'This QR code is not recognised.';
    }

    overlay.classList.remove('hidden');

    // Tap to dismiss
    overlay.onclick = dismissResult;

    // Auto-dismiss
    clearTimer = setTimeout(dismissResult, CLEAR_MS);
}

function dismissResult() {
    overlay.classList.add('hidden');
    overlay.onclick = null;
    isProcessing = false;
}

// ─── QR decode handler ───────────────────────────────────────────────────────
async function onScanSuccess(decodedText) {
    if (isProcessing) return;
    isProcessing = true;

    // Vibrate (if supported)
    if ('vibrate' in navigator) navigator.vibrate(80);

    // Extract token: accept full URL or raw token
    let token = decodedText.trim();
    try {
        const url = new URL(decodedText);
        // Expect /t/<token>
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 't' && parts[1]) {
            token = parts[1];
        }
    } catch {
        // Not a URL, use raw value as token
    }

    try {
        const resp = await fetch(SCAN_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token }),
        });

        if (resp.status === 401) {
            window.location.href = '/auth/login';
            return;
        }

        if (resp.status === 429) {
            showResult({ result: 'invalid' }); // show red on rate limit
            return;
        }

        const data = await resp.json();
        showResult(data);
    } catch (err) {
        console.error('Scan error:', err);
        showResult({ result: 'invalid' });
    }
}

// ─── Init html5-qrcode ───────────────────────────────────────────────────────
const html5QrCode = new Html5Qrcode('qr-reader');

const config = {
    fps: 15,
    qrbox: { width: Math.min(window.innerWidth * 0.65, 260), height: Math.min(window.innerWidth * 0.65, 260) },
    aspectRatio: window.innerHeight / window.innerWidth,
    disableFlip: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
};

html5QrCode
    .start(
        { facingMode: 'environment' },
        config,
        onScanSuccess
    )
    .catch(err => {
        console.error('Camera error:', err);
        document.querySelector('.scan-hint').textContent =
            '⚠️ Camera unavailable — check browser permissions and use HTTPS.';
    });
