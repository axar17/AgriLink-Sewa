// =====================================================
// AGRILINK SEWA - FARMER PORTAL CONTROLLER
// Real-time Mandi Slot Booking, Real QR Code & Uber-Style Logistics
// =====================================================

import { getProcurementCenters, createBooking, subscribeBookings } from "./db-bus.js";
import { protectPage, logoutUser } from "./auth.js";
import { showToast, renderGatePassQR, injectUniversalPortalBar, playChime } from "./common.js";
import { AgriGpsMap } from "./gps-map.js";
import { FarmerRideController } from "./uber-porter.js";

let currentFarmer = {
    uid: "farmer-01",
    name: "Ramesh Patel",
    pinCode: "382480",
    farmerId: "AGRI-2026-001"
};

let state = {
    center: "Gandhinagar Central APMC",
    centerId: "center-01",
    slot: "10:15 AM",
    token: "TKN-105",
    crop: "Wheat",
    quantity: 40,
    isBooked: false
};

let viewHistory = ["view-dashboard"];
let farmerGpsMap = null;
let rideController = null;

// Inject top universal navigation bar
injectUniversalPortalBar("farmer");

// Initialize farmer profile with fallback for instant SIH testing
protectPage("farmer", (profile) => {
    if (profile) currentFarmer = profile;
    setupFarmerUI();
});

// Also setup UI immediately for direct viewing
setupFarmerUI();

function setupFarmerUI() {
    const nameEl = document.getElementById("userName");
    if (nameEl) nameEl.innerText = currentFarmer.name || "Ramesh Patel";
    const pinEl = document.getElementById("userPin");
    if (pinEl) pinEl.innerText = currentFarmer.pinCode || "382480";
    const initEl = document.getElementById("userInitials");
    if (initEl && currentFarmer.name) initEl.innerText = currentFarmer.name.charAt(0).toUpperCase();

    // Load procurement centers
    loadCenters();

    // Subscribe to bookings
    subscribeBookings((bookings) => {
        if (!bookings || bookings.length === 0) return;
        const active = bookings.find(b => b.farmerId === currentFarmer.farmerId || b.farmerName === currentFarmer.name);
        if (active) {
            displayActivePass(active);
        }
    });

    // Initialize GPS Map & Ride Controller
    setTimeout(() => {
        initGpsAndTransport();
    }, 400);
}

function initGpsAndTransport() {
    if (!farmerGpsMap && document.getElementById("farmerGpsMap")) {
        farmerGpsMap = new AgriGpsMap("farmerGpsMap", {
            pickupCoords: [23.1850, 72.5850],
            destinationCoords: [23.2156, 72.6369],
            vehicleType: "Tata Ace"
        });
        window.farmerGpsMapInstance = farmerGpsMap;
    }

    if (!rideController) {
        rideController = new FarmerRideController(farmerGpsMap);
        rideController.init();
        window.rideController = rideController;
    }
}

// TAB SWITCHER: Mandi Drop-off vs. Uber/Porter Transport
window.switchMainTab = function(tabName) {
    const secMandi = document.getElementById("section-mandi");
    const secTransport = document.getElementById("section-transport");
    const btnMandi = document.getElementById("tabBtnMandi");
    const btnTransport = document.getElementById("tabBtnTransport");

    if (tabName === "transport") {
        if (secMandi) secMandi.classList.add("hidden");
        if (secTransport) secTransport.classList.remove("hidden");

        btnTransport.className = "flex-1 py-3 px-4 text-center font-black text-sm uppercase tracking-wide rounded transition flex items-center justify-center gap-2 bg-[#123366] text-white shadow";
        btnMandi.className = "flex-1 py-3 px-4 text-center font-black text-sm uppercase tracking-wide rounded transition flex items-center justify-center gap-2 text-gray-600 hover:text-[#123366] hover:bg-gray-50";

        setTimeout(() => {
            initGpsAndTransport();
            if (farmerGpsMap && farmerGpsMap.map) farmerGpsMap.map.invalidateSize();
        }, 200);
    } else {
        if (secMandi) secMandi.classList.remove("hidden");
        if (secTransport) secTransport.classList.add("hidden");

        btnMandi.className = "flex-1 py-3 px-4 text-center font-black text-sm uppercase tracking-wide rounded transition flex items-center justify-center gap-2 bg-[#123366] text-white shadow";
        btnTransport.className = "flex-1 py-3 px-4 text-center font-black text-sm uppercase tracking-wide rounded transition flex items-center justify-center gap-2 text-gray-600 hover:text-[#123366] hover:bg-gray-50";
    }
};

// Load Centers
async function loadCenters(pinFilter = "") {
    const grid = document.getElementById("procurementCentersGrid");
    if (!grid) return;

    grid.innerHTML = `<div class="col-span-full text-center py-6"><i class="fas fa-circle-notch fa-spin text-2xl text-[#123366]"></i></div>`;
    
    const centers = await getProcurementCenters();
    grid.innerHTML = "";

    const filtered = pinFilter ? centers.filter(c => c.pinCode === pinFilter || c.district.toLowerCase().includes(pinFilter.toLowerCase())) : centers;
    const toRender = filtered.length > 0 ? filtered : centers;

    toRender.forEach(c => {
        const isRush = c.status === "heavy_rush";
        const card = document.createElement("button");
        card.className = "bg-white border border-gray-300 p-6 rounded-sm shadow-md hover:border-[#138808] hover:shadow-lg transition group text-left relative overflow-hidden";
        card.onclick = () => selectCenter(c.mandiName || c.name);
        card.innerHTML = `
            <div class="absolute top-0 right-0 ${isRush ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'} text-[10px] font-bold px-3 py-1 rounded-bl-sm">
                ${isRush ? 'HEAVY RUSH' : 'OPEN'}
            </div>
            <h4 class="font-bold text-base text-[#123366] group-hover:text-[#138808] transition pr-10 uppercase">${c.mandiName || c.name}</h4>
            <p class="text-xs text-gray-500 font-semibold mt-1"><i class="fas fa-map-marker-alt text-[#f68920] mr-1"></i>PIN: ${c.pinCode} • ${c.district}</p>
            <div class="mt-4 flex items-center justify-between">
                <p class="text-xs text-gray-500 font-bold uppercase"><i class="fas fa-route text-blue-500 mr-2"></i>${c.distanceKm || 2.4} km away</p>
                <i class="fas fa-arrow-right text-[#138808] opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1"></i>
            </div>
        `;
        grid.appendChild(card);
    });
}
// Continuous 15-min slot generator
function generateContinuousSlots(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    const activeHours = [9, 10, 11, 12, 14, 15, 16];

    activeHours.forEach(hour => {
        for (let minute = 0; minute < 60; minute += 15) {
            const period = hour >= 12 ? "PM" : "AM";
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const displayHourStr = displayHour < 10 ? "0" + displayHour : displayHour;
            const minuteStr = minute === 0 ? "00" : minute;
            const timeString = `${displayHourStr}:${minuteStr} ${period}`;
            const isBooked = Math.random() < 0.25;

            const btn = document.createElement("button");
            if (isBooked) {
                btn.className = "p-3 rounded-sm border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed font-semibold text-sm flex justify-between items-center";
                btn.disabled = true;
                btn.innerHTML = `<span>${timeString}</span> <i class="fas fa-lock text-xs opacity-50"></i>`;
            } else {
                btn.className = "p-3 rounded-sm border border-gray-300 bg-white text-[#123366] font-bold text-sm shadow-sm hover:bg-green-50 hover:border-[#138808] hover:text-[#138808] transition flex justify-center items-center";
                btn.onclick = () => selectSlot(timeString);
                btn.innerHTML = `<span>${timeString}</span>`;
            }
            container.appendChild(btn);
        }
    });
}

window.selectCenter = function(name) {
    state.center = name;
    const nameEl = document.getElementById("displayCenterName");
    if (nameEl) nameEl.innerText = name;
    generateContinuousSlots("allSlots");
    navigateTo("view-slots");
};

window.selectSlot = function(time) {
    state.slot = time;
    const cEl = document.getElementById("confirmCenter");
    if (cEl) cEl.innerText = state.center;
    const sEl = document.getElementById("confirmSlot");
    if (sEl) sEl.innerText = state.slot;
    navigateTo("view-confirm");
};

// Navigation helper
function navigateTo(viewId) {
    document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");

    if (viewId !== "view-pass") viewHistory.push(viewId);
    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        if (viewId === "view-dashboard" || viewId === "view-pass") {
            backBtn.classList.add("hidden");
        } else {
            backBtn.classList.remove("hidden");
        }
    }
}

window.goBack = function() {
    if (viewHistory.length > 1) {
        viewHistory.pop();
        const prev = viewHistory[viewHistory.length - 1];
        document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
        const target = document.getElementById(prev);
        if (target) target.classList.add("active");
        if (prev === "view-dashboard") document.getElementById("backBtn")?.classList.add("hidden");
    }
};

window.goHome = function() {
    viewHistory = ["view-dashboard"];
    navigateTo("view-dashboard");
};

// Confirm and Submit Booking with Real ISO QR Code Generation
window.submitBooking = async function() {
    const btn = document.getElementById("finalSubmitBtn");
    if (btn) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Syncing with National Mandi Database...`;
        btn.disabled = true;
    }

    state.token = "TKN-" + Math.floor(1000 + Math.random() * 9000);
    state.crop = document.getElementById("bookingCropSelect")?.value || "Wheat";
    state.quantity = Number(document.getElementById("bookingQuantityInput")?.value || 40);

    const bookingPayload = {
        tokenNumber: state.token,
        tokenId: state.token,
        farmerId: currentFarmer.farmerId || "AGRI-2026-001",
        farmerName: currentFarmer.name || "Ramesh Patel",
        phone: "9876543210",
        pinCode: currentFarmer.pinCode || "382480",
        crop: state.crop,
        cropName: state.crop,
        estimatedQuantity: state.quantity,
        mandiName: state.center,
        slotTime: state.slot,
        timeSlot: state.slot,
        status: "waiting"
    };

    try {
        const saved = await createBooking(bookingPayload);
        state.isBooked = true;
        playChime("success");
        showToast("✓ Mandi slot booked & Digital Gate Pass generated!");

        // Populate Success Pass View
        document.getElementById("passCenter").innerText = state.center;
        document.getElementById("passCrop").innerText = `${state.crop} (${state.quantity} Qt)`;
        document.getElementById("passSlot").innerText = state.slot;
        document.getElementById("passToken").innerText = state.token;
        document.getElementById("passFarmerName").innerText = currentFarmer.name;

        // Render Working ISO QR Code
        renderGatePassQR("passQrContainer", saved, state.center);

        // Populate Locked Dashboard Pass
        displayActivePass(saved);

        navigateTo("view-pass");
    } catch (e) {
        console.error("Booking error:", e);
        showToast("Booking failed: " + e.message, "error");
    } finally {
        if (btn) {
            btn.innerHTML = `<i class="fas fa-lock mr-3"></i> Confirm & Generate Digital Pass`;
            btn.disabled = false;
        }
    }
};

function displayActivePass(booking) {
    const flowContainer = document.getElementById("bookingFlowContainer");
    const passContainer = document.getElementById("activePassContainer");
    if (flowContainer) flowContainer.classList.add("hidden");
    if (passContainer) passContainer.classList.remove("hidden");

    document.getElementById("dashPassCenter").innerText = booking.mandiName || "Gandhinagar Central APMC";
    document.getElementById("dashPassCrop").innerText = `${booking.crop || "Wheat"} (${booking.estimatedQuantity || 40} Qt)`;
    document.getElementById("dashPassToken").innerText = booking.tokenNumber || "TKN-105";
    document.getElementById("dashPassSlot").innerText = booking.slotTime || "10:15 AM";
    document.getElementById("dashPassName").innerText = booking.farmerName || currentFarmer.name;

    // Render Working ISO QR Code
    renderGatePassQR("dashPassQrContainer", booking, booking.mandiName);
}

// PIN Code Search Handler
window.handlePinSearch = function() {
    const pin = document.getElementById("searchPinInput")?.value.trim();
    if (pin.length !== 6) {
        showToast("Please enter a valid 6-digit Indian PIN code", "error");
        return;
    }
    showToast(`Searching APMC mandis near PIN ${pin}...`, "info");
    loadCenters(pin);
};

window.resetToUserPin = function() {
    const pin = currentFarmer.pinCode || "382480";
    document.getElementById("searchPinInput").value = pin;
    loadCenters(pin);
};

// Handle Uber Booking Submission
window.handleUberBookingSubmit = function() {
    const pickupLoc = document.getElementById("transportPickupLocation")?.value || "Village Rampur";
    const destLoc = document.getElementById("transportDestinationLocation")?.value || "Gandhinagar Central APMC";
    const crop = document.getElementById("transportCrop")?.value || "Wheat";
    const qty = Number(document.getElementById("transportQty")?.value || 50);

    if (!window.rideController) {
        showToast("Logistics engine initializing...", "info");
        return;
    }

    window.rideController.bookRide({
        farmerName: currentFarmer.name,
        pinCode: currentFarmer.pinCode,
        pickupLocation: pickupLoc,
        mandiName: destLoc,
        crop: crop,
        quantity: qty
    });
};
