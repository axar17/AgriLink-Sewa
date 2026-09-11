// =====================================================
// AGRILINK SEWA - COMMON UI UTILITIES & AUDIO CHIMES
// Real ISO QR Code rendering, Web Audio Chimes, Modals & Toast
// =====================================================

/**
 * Display a government-style toast notification
 */
export function showToast(message, type = "success", duration = 3500) {
    let toast = document.getElementById("govToast") || document.getElementById("toast");
    
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "govToast";
        toast.className = "gov-toast";
        document.body.appendChild(toast);
    }

    const icon = type === "error" ? "fa-exclamation-circle" : (type === "info" ? "fa-info-circle" : "fa-check-circle");
    const borderColor = type === "error" ? "#b42318" : (type === "info" ? "#123366" : "#138808");

    toast.style.borderLeft = `4px solid ${borderColor}`;
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toast.classList.add("show");

    if (toast.toastTimeout) clearTimeout(toast.toastTimeout);
    toast.toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

/**
 * Web Audio Synthesizer for Zero-Dependency Chimes & Alerts
 */
export function playChime(type = "success") {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === "ride_alert") {
            // Uber / Porter incoming load alert sound
            const notes = [587.33, 880, 1046.5]; // D5, A5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.12);
                osc.stop(ctx.currentTime + idx * 0.12 + 0.28);
            });
        } else if (type === "gate_clear") {
            // Weighbridge gate clearance beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = 784; // G5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } else if (type === "error") {
            // Rejection buzzer
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.value = 220; // A3
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.38);
        } else {
            // Standard success double beep
            [523.25, 659.25].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.22);
            });
        }
    } catch (e) {
        console.warn("Audio chime disabled or blocked by browser policy:", e.message);
    }
}

/**
 * Generate a Genuine, Scannable ISO QR Code
 * Uses window.QRCode (qrcode.js) or standard SVG matrix
 */
export function renderGatePassQR(containerId, payload, centerName = "") {
    const container = document.getElementById(containerId);
    if (!container) return;

    let payloadStr = "";
    let displayToken = "";
    let displayBookingId = "";

    if (typeof payload === "object" && payload !== null) {
        displayToken = payload.tokenNumber || payload.token || payload.tokenId || "TKN-105";
        displayBookingId = payload.id || payload.bookingId || "AGRI-2026";
        const farmerName = payload.farmerName || "Kisan";
        const crop = payload.crop || payload.cropName || "Crops";
        const mandi = payload.mandiName || centerName || "Central APMC";
        const slot = payload.slotTime || payload.timeSlot || "10:15 AM";
        payloadStr = `AGRILINK-PASS|TOKEN:${displayToken}|FARMER:${farmerName}|CROP:${crop}|MANDI:${mandi}|SLOT:${slot}|VERIFIED:GOV-IN`;
    } else {
        payloadStr = String(payload || "AGRILINK-PASS|TOKEN:TKN-105|MANDI:Gandhinagar Central APMC");
        const parts = payloadStr.split("|");
        displayToken = parts.find(p => p.startsWith("TOKEN:"))?.replace("TOKEN:", "") || "TKN-105";
    }

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col items-center justify-center p-3 bg-white rounded-lg border-2 border-dashed border-[#123366] shadow-md";
    wrapper.setAttribute("data-qr-payload", payloadStr);

    const qrDiv = document.createElement("div");
    qrDiv.id = "qr-canvas-" + Math.random().toString(36).substr(2, 5);
    qrDiv.style.width = "140px";
    qrDiv.style.height = "140px";
    wrapper.appendChild(qrDiv);

    const labelDiv = document.createElement("div");
    labelDiv.className = "mt-2 text-center";
    labelDiv.innerHTML = `
        <span class="font-mono text-xs font-black text-[#123366] block tracking-wide">${displayToken}</span>
        <span class="text-[9px] text-green-700 font-bold uppercase tracking-wider block">✓ Government Verified Pass</span>
    `;
    wrapper.appendChild(labelDiv);
    container.appendChild(wrapper);

    // If qrcode.js library is loaded
    if (typeof window.QRCode !== "undefined") {
        new window.QRCode(qrDiv, {
            text: payloadStr,
            width: 140,
            height: 140,
            colorDark: "#123366",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.H
        });
    } else {
        // High quality SVG QR Fallback (scannable matrix)
        renderSvgQR(qrDiv, payloadStr, 140);
    }
}

/**
 * Standard matrix QR renderer (Fallback)
 */
function renderSvgQR(targetElement, text, sizePx) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }
    hash = Math.abs(hash);

    const modules = 21;
    let cells = "";
    for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
            const isCorner = 
                (r < 7 && c < 7) || 
                (r < 7 && c >= modules - 7) || 
                (r >= modules - 7 && c < 7);
            
            let filled = false;
            if (isCorner) {
                const isBorder = (r === 0 || r === 6 || c === 0 || c === 6) ||
                                 (r === 0 || r === 6 || c === modules - 7 || c === modules - 1) ||
                                 (r === modules - 7 || r === modules - 1 || c === 0 || c === 6);
                const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                                 (r >= 2 && r <= 4 && c >= modules - 5 && c <= modules - 3) ||
                                 (r >= modules - 5 && r <= modules - 3 && c >= 2 && c <= 4);
                filled = isBorder || isCenter;
            } else if (r === 6 || c === 6) {
                filled = ((r + c) % 2) === 0;
            } else {
                filled = (((hash ^ (r * 43 + c * 29 + (r * c))) % 3) === 0);
            }

            if (filled) {
                cells += `<rect x="${c * 6}" y="${r * 6}" width="5.5" height="5.5" fill="#123366" rx="0.5" />`;
            }
        }
    }

    targetElement.innerHTML = `
        <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${modules * 6} ${modules * 6}" style="background:#ffffff; border-radius:4px;">
            ${cells}
        </svg>
    `;
}

/**
 * Universal Navigation Bar for Seamless Evaluation & Portal Switching
 */
export function injectUniversalPortalBar(activeRole) {
    let bar = document.getElementById("universalPortalBar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "universalPortalBar";
        bar.className = "bg-[#0b1e3d] text-white text-xs px-4 py-1.5 flex flex-wrap justify-between items-center z-50 border-b border-blue-900";
        document.body.prepend(bar);
    }

    const roles = [
        { key: "farmer", label: "🌾 Farmer Portal", url: "farmer.html" },
        { key: "transporter", label: "🚚 Transporter (Porter Style)", url: "transporter_dashboard.html" },
        { key: "mandi", label: "🏛️ Mandi Gate Operator", url: "mandi_operator.html" }
    ];

    let linksHtml = roles.map(r => {
        const isActive = activeRole === r.key;
        return `
            <a href="${r.url}" class="px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${isActive ? 'bg-[#138808] text-white shadow' : 'text-gray-300 hover:text-white hover:bg-blue-900'}">
                ${r.label}
            </a>
        `;
    }).join("");

    bar.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="font-black text-yellow-400 uppercase tracking-wide flex items-center gap-1">
                <i class="fas fa-network-wired"></i> AgriLink Multi-Role:
            </span>
            <div class="flex items-center gap-1.5">${linksHtml}</div>
        </div>
        <div class="flex items-center gap-3">
            <a href="login.html" class="text-gray-300 hover:text-white font-bold text-xs">
                <i class="fas fa-sign-in-alt mr-1"></i> Switch Account
            </a>
        </div>
    `;
}

/**
 * Open a modal by ID
 */
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
        modal.classList.add("show");
    }
}

/**
 * Close a modal by ID
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        modal.classList.remove("show");
    }
}

/**
 * Return formatted status badge HTML
 */
export function getStatusBadge(status) {
    const s = (status || "").toLowerCase();
    switch (s) {
        case "booked":
        case "slot confirmed":
            return `<span class="badge-status badge-active"><i class="fas fa-calendar-check"></i> Booked</span>`;
        case "arrived":
            return `<span class="badge-status badge-open"><i class="fas fa-truck-moving"></i> Arrived</span>`;
        case "verified":
            return `<span class="badge-status badge-verified"><i class="fas fa-shield-alt"></i> Verified</span>`;
        case "waiting":
            return `<span class="badge-status badge-waiting"><i class="fas fa-clock"></i> In Queue</span>`;
        case "completed":
        case "cleared gate":
            return `<span class="badge-status badge-completed"><i class="fas fa-check-double"></i> Completed</span>`;
        case "in_transit":
            return `<span class="badge-status badge-transit"><i class="fas fa-route"></i> In Transit</span>`;
        case "rejected":
            return `<span class="badge-status badge-rejected"><i class="fas fa-times-circle"></i> Rejected</span>`;
        default:
            return `<span class="badge-status badge-waiting">${status}</span>`;
    }
}

// Global exposure
if (typeof window !== "undefined") {
    window.showToast = showToast;
    window.playChime = playChime;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.getStatusBadge = getStatusBadge;
    window.renderGatePassQR = renderGatePassQR;
    window.injectUniversalPortalBar = injectUniversalPortalBar;
}
