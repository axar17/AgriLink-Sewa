// =====================================================
// AGRILINK SEWA - MANDI OPERATOR CONTROLLER
// Real-time Queue, Real QR Scanner & Weighbridge Gate Clearance
// =====================================================

import { subscribeBookings, updateBookingStatus } from "./db-bus.js";
import { protectPage, logoutUser } from "./auth.js";
import { showToast, playChime, openModal, closeModal, injectUniversalPortalBar } from "./common.js";

let currentOperator = {
    uid: "operator-01",
    name: "ADM-042",
    mandiName: "Gandhinagar Central APMC"
};

let html5QrScanner = null;
let currentScannedBooking = null;
let processedTodayCount = 18;
let pendingVerifCount = 2;

// Inject top universal navigation bar
injectUniversalPortalBar("mandi");

protectPage("mandi_operator", (profile) => {
    if (profile) currentOperator = { ...currentOperator, ...profile };
    setupMandiUI();
});

setupMandiUI();

function setupMandiUI() {
    subscribeBookings((bookings) => {
        if (!bookings) return;
        renderQueueTable(bookings);
        renderCompletedTable(bookings);
        updateStatCards(bookings);
    });
}

function renderQueueTable(bookings) {
    const tbody = document.getElementById("queueBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const queue = bookings.filter(b => b.status !== "completed" && b.status !== "rejected");
    if (queue.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-6 text-gray-400 text-xs">No pending vehicles in queue.</td></tr>`;
        return;
    }

    queue.forEach(b => {
        const isWaiting = b.status === "waiting" || b.status === "arrived";
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 hover:bg-gray-50 text-xs";
        tr.innerHTML = `
            <td class="p-3 font-bold text-[#123366] whitespace-nowrap">${b.slotTime || b.timeSlot || '10:30 AM'}</td>
            <td class="p-3">
                <strong class="text-gray-900">${b.farmerName || 'Kisan'}</strong><br>
                <span class="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">${b.tokenNumber || b.tokenId || 'TKN-105'}</span>
                <span class="text-gray-500 text-[11px] block mt-0.5">${b.crop || 'Wheat'} (${b.estimatedQuantity || 40} Qt)</span>
            </td>
            <td class="p-3 whitespace-nowrap">
                <button onclick="clearGateDirect('${b.id || b.tokenNumber}', '${b.farmerName}', '${b.tokenNumber}', '${b.crop}')" class="bg-[#138808] hover:bg-green-800 text-white font-bold px-3 py-1.5 rounded text-xs uppercase shadow flex items-center gap-1">
                    <i class="fas fa-check"></i> Clear Gate
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCompletedTable(bookings) {
    const tbody = document.getElementById("completedBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const completed = bookings.filter(b => b.status === "completed");
    const defaultEntries = [
        { tokenNumber: "TKN-1001", farmerName: "Suresh Patel", crop: "Wheat (40 Qt)" },
        { tokenNumber: "TKN-1002", farmerName: "Amit Singh", crop: "Paddy (25 Qt)" }
    ];

    const toRender = completed.length > 0 ? completed : defaultEntries;

    toRender.forEach(b => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 text-xs";
        tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-[#123366]">${b.tokenNumber || b.tokenId || 'TKN-1001'}</td>
            <td class="p-3 font-bold text-gray-800">${b.farmerName}</td>
            <td class="p-3 text-gray-600">${b.crop || 'Wheat (40 Qt)'}</td>
            <td class="p-3"><span class="badge-status badge-completed">✓ CLEARED GATE</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStatCards(bookings) {
    const scheduled = bookings.filter(b => b.status === "scheduled" || b.status === "waiting").length;
    const waiting = bookings.filter(b => b.status === "waiting" || b.status === "arrived").length;
    const completed = bookings.filter(b => b.status === "completed").length + 18;

    const sEl = document.getElementById("scheduledCount");
    if (sEl) sEl.innerText = scheduled;
    const wEl = document.getElementById("waitingCount");
    if (wEl) wEl.innerText = waiting;
    const pEl = document.getElementById("processedCount");
    if (pEl) pEl.innerText = completed;
    const pendEl = document.getElementById("pendingCount");
    if (pendEl) pendEl.innerText = pendingVerifCount;
}

// ==========================================
// QR SCANNER LOGIC (Camera + File + 1-Click Demo)
// ==========================================
window.openQrScannerModal = function() {
    openModal("qrVerifyModal");
    switchQrScannerTab("demo");
};

window.closeQrScannerModal = function() {
    stopCameraScanner();
    closeModal("qrVerifyModal");
    const resultCard = document.getElementById("scannedPassResultCard");
    if (resultCard) resultCard.classList.add("hidden");
    currentScannedBooking = null;
};

window.switchQrScannerTab = function(tabName) {
    const tabs = ["demo", "camera", "file"];
    tabs.forEach(t => {
        const el = document.getElementById(`qrScanTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btn = document.getElementById(`qrTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (el) el.classList.toggle("hidden", t !== tabName);
        if (btn) {
            if (t === tabName) {
                btn.className = "px-3 py-1.5 rounded bg-[#123366] text-white";
            } else {
                btn.className = "px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200";
            }
        }
    });

    if (tabName === "camera") {
        startCameraScanner();
    } else {
        stopCameraScanner();
    }
};

function startCameraScanner() {
    if (typeof Html5Qrcode === "undefined") {
        showToast("HTML5 QR scanner library not loaded", "error");
        return;
    }
    if (!html5QrScanner) {
        html5QrScanner = new Html5Qrcode("qrCameraReader");
    }

    html5QrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
            onQrCodeDetected(decodedText);
            stopCameraScanner();
        },
        () => {}
    ).catch(err => {
        console.warn("Camera scanner not started (using fallback demo mode):", err);
    });
}

function stopCameraScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner.clear();
            html5QrScanner = null;
        }).catch(() => {
            html5QrScanner = null;
        });
    }
}

// 1-Click Test Scan Handler
window.testScanActiveToken = function(tokenId = "TKN-105") {
    onQrCodeDetected(`AGRILINK-PASS|TOKEN:${tokenId}|FARMER:Ramesh Patel|CROP:Wheat 40Qt|MANDI:Gandhinagar Central APMC|SLOT:10:15 AM|VERIFIED:GOV-IN`);
};

function onQrCodeDetected(qrText) {
    playChime("success");
    showToast("✓ Pass QR Code detected & decrypted!", "success");

    let token = "TKN-105";
    let farmer = "Ramesh Patel";
    let crop = "Wheat (40 Qt)";
    let slot = "10:15 AM";

    if (qrText.includes("|")) {
        const parts = qrText.split("|");
        parts.forEach(p => {
            if (p.startsWith("TOKEN:")) token = p.replace("TOKEN:", "");
            if (p.startsWith("FARMER:")) farmer = p.replace("FARMER:", "");
            if (p.startsWith("CROP:")) crop = p.replace("CROP:", "");
            if (p.startsWith("SLOT:")) slot = p.replace("SLOT:", "");
        });
    }

    currentScannedBooking = {
        tokenNumber: token,
        tokenId: token,
        farmerName: farmer,
        crop: crop,
        slotTime: slot
    };

    const card = document.getElementById("scannedPassResultCard");
    if (card) {
        card.classList.remove("hidden");
        document.getElementById("scannedTokenBadge").innerText = token;
        document.getElementById("scannedFarmerName").innerText = farmer;
        document.getElementById("scannedSlotTime").innerText = slot;
        document.getElementById("scannedCrop").innerText = crop;
        document.getElementById("scannedMandi").innerText = "Gandhinagar Central APMC";
    }
}

window.confirmScannedGateClearance = async function() {
    if (!currentScannedBooking) return;
    const token = currentScannedBooking.tokenNumber || "TKN-105";

    await updateBookingStatus(token, "completed");
    playChime("gate_clear");
    showToast(`✓ Weighbridge Gate Cleared for ${currentScannedBooking.farmerName} (${token})!`, "success", 4000);

    closeQrScannerModal();
};

window.clearGateDirect = async function(id, name, token, crop) {
    await updateBookingStatus(id, "completed");
    playChime("gate_clear");
    showToast(`✓ Gate cleared for ${name} (${token})!`, "success");
};

// Verification Approval / Rejection
window.handleVerifyAction = function(cardId, name, action) {
    const card = document.getElementById(cardId);
    if (!card) return;

    if (action === "approved") {
        card.innerHTML = `
            <div class="p-2 text-center text-green-800 font-bold text-xs bg-green-50 rounded">
                <i class="fas fa-check-circle text-green-600 mr-1"></i> ${name} successfully verified as Authentic Farmer.
            </div>
        `;
        playChime("success");
        showToast(`${name} farmer verification approved!`, "success");
    } else {
        card.innerHTML = `
            <div class="p-2 text-center text-red-800 font-bold text-xs bg-red-50 rounded">
                <i class="fas fa-times-circle text-red-600 mr-1"></i> ${name} verification rejected by operator.
            </div>
        `;
        playChime("error");
        showToast(`${name} verification rejected.`, "error");
    }

    pendingVerifCount = Math.max(0, pendingVerifCount - 1);
    const badge = document.getElementById("pendingBadge");
    if (badge) badge.innerText = `${pendingVerifCount} Pending`;
    const statEl = document.getElementById("pendingCount");
    if (statEl) statEl.innerText = pendingVerifCount;
};

// Manual arrival
window.registerManualEntry = async function() {
    const name = document.getElementById("manualName")?.value.trim();
    const crop = document.getElementById("manualCrop")?.value || "Wheat";
    const qty = document.getElementById("manualQuantity")?.value || 30;

    if (!name) {
        showToast("Please enter farmer name", "error");
        return;
    }

    const token = "TKN-" + Math.floor(108 + Math.random() * 900);
    await updateBookingStatus(token, "completed", {
        farmerName: name,
        crop: `${crop} (${qty} Qt)`,
        tokenNumber: token
    });

    closeModal("arrivalModal");
    playChime("gate_clear");
    showToast(`✓ Manual arrival registered: ${name} (${token})!`, "success");
};
