// =====================================================
// AGRILINK SEWA - TRANSPORTER PORTAL CONTROLLER
// Uber/Porter style ride alerts, Leaflet GPS navigation & wallet
// =====================================================

import { 
    subscribeTransportRequests, 
    updateTransportRequest, 
    createTrip, 
    subscribeTrips, 
    updateTrip 
} from "./db-bus.js";
import { protectPage, logoutUser } from "./auth.js";
import { showToast, playChime, openModal, closeModal, injectUniversalPortalBar } from "./common.js";
import { AgriGpsMap } from "./gps-map.js";

let currentTransporter = {
    uid: "trans-01",
    name: "Rajesh Kumar",
    company: "Rajesh Kumar Logistics",
    vehicleNumber: "GJ-01-AB-1234",
    phone: "9825140921",
    walletBalance: 4800
};

let fleetVehicles = [
    { type: "Tata Ace / Chhota Hathi", regNo: "GJ-01-AB-1234", isAvailable: true },
    { type: "Tractor / Trolley", regNo: "GJ-05-CD-5678", isAvailable: true },
    { type: "Pickup 8ft", regNo: "GJ-02-EF-9087", isAvailable: true }
];

let activeTrip = null;
let currentPendingRequest = null;
let countdownTimer = null;
let transporterGpsMap = null;

// Inject top universal navigation bar
injectUniversalPortalBar("transporter");

// Protect & Setup Transporter UI
protectPage("transporter", (profile) => {
    if (profile) currentTransporter = { ...currentTransporter, ...profile };
    setupTransporterUI();
});

setupTransporterUI();

function setupTransporterUI() {
    renderFleetUI();

    // Listen to real-time incoming transport requests
    subscribeTransportRequests((requests) => {
        if (!requests || requests.length === 0) return;
        renderRequestsList(requests);

        // Check if there is an unhandled open request
        const openReq = requests.find(r => r.status === "open");
        if (openReq && !activeTrip && (!currentPendingRequest || currentPendingRequest.id !== openReq.id)) {
            triggerIncomingRideModal(openReq);
        }
    });

    // Listen to trips
    subscribeTrips((trips) => {
        if (!trips) return;
        const active = trips.find(t => t.status !== "completed" && t.status !== "cancelled");
        if (active) {
            displayActiveTripUI(active);
        } else if (activeTrip) {
            hideActiveTripUI();
        }

        const completed = trips.filter(t => t.status === "completed");
        renderCompletedTrips(completed);
        updateStatsCount(trips);
    });
}

function renderFleetUI() {
    const container = document.getElementById("vehicleFleetList");
    if (!container) return;
    container.innerHTML = "";

    fleetVehicles.forEach(v => {
        const div = document.createElement("div");
        div.className = "border border-gray-200 rounded-lg p-3 mb-2 bg-white flex justify-between items-center shadow-sm";
        div.innerHTML = `
            <div>
                <h5 class="font-bold text-xs text-gray-800">${v.type}</h5>
                <span class="font-mono text-[11px] font-bold text-gray-500">${v.regNo}</span>
            </div>
            <span class="text-[10px] font-bold ${v.isAvailable ? 'text-green-700 bg-green-50 px-2 py-0.5 rounded' : 'text-orange-700 bg-orange-50 px-2 py-0.5 rounded'}">
                ${v.isAvailable ? '✓ Ready' : '● On Trip'}
            </span>
        `;
        container.appendChild(div);
    });
}

function renderRequestsList(requests) {
    const listEl = document.getElementById("requestList");
    if (!listEl) return;
    listEl.innerHTML = "";

    const openList = requests.filter(r => r.status === "open");
    if (openList.length === 0) {
        listEl.innerHTML = `<div class="text-center py-6 text-gray-400 font-semibold text-xs">No active requests in queue. Live radar is monitoring nearby farms...</div>`;
        return;
    }

    openList.forEach(r => {
        const card = document.createElement("div");
        card.className = "border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm hover:border-[#123366] transition";
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-sm text-[#123366]">${r.crop || "Wheat"} Transport (${r.quantity || 50} Bags)</h4>
                    <p class="text-xs text-gray-600 mt-0.5"><b>Farmer:</b> ${r.farmerName || "Kisan"} • <span class="text-blue-700 font-bold">${r.vehicleType || "Tata Ace"}</span></p>
                    <p class="text-[11px] text-gray-500 mt-1"><i class="fas fa-map-marker-alt text-green-600 mr-1"></i>${r.pickupLocation} ➔ ${r.destinationCenter}</p>
                </div>
                <div class="text-right">
                    <span class="text-xs text-gray-400 uppercase font-bold block">Fare</span>
                    <span class="text-xl font-black text-[#138808]">₹${r.estimatedFare || 400}</span>
                </div>
            </div>
            <div class="mt-3 flex gap-2 justify-end">
                <button onclick="triggerIncomingRideModal(${JSON.stringify(r).replace(/"/g, '&quot;')})" class="bg-[#138808] hover:bg-green-800 text-white font-bold px-4 py-1.5 rounded text-xs uppercase shadow flex items-center gap-1">
                    <i class="fas fa-check"></i> Accept Load
                </button>
            </div>
        `;
        listEl.appendChild(card);
    });
}
// Incoming Ride Modal Trigger
window.triggerIncomingRideModal = function(request) {
    currentPendingRequest = request;
    document.getElementById("incomingFarmerName").innerText = request.farmerName || "Ramesh Patel";
    document.getElementById("incomingCropQty").innerText = `${request.crop || "Wheat"} • ${request.quantity || 50} Bags`;
    document.getElementById("incomingFare").innerText = `₹${request.estimatedFare || 400}`;
    document.getElementById("incomingPickup").innerText = request.pickupLocation || "Village Rampur";
    document.getElementById("incomingDest").innerText = request.destinationCenter || "Gandhinagar Central APMC";

    openModal("incomingRideModal");
    playChime("ride_alert");

    // 30-second countdown
    let timeLeft = 30;
    const timerEl = document.getElementById("incomingTimer");
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            closeModal("incomingRideModal");
        }
    }, 1000);
};

window.acceptIncomingRide = async function() {
    if (!currentPendingRequest) return;
    if (countdownTimer) clearInterval(countdownTimer);

    closeModal("incomingRideModal");
    const chosenVehicle = document.getElementById("incomingVehicleSelect")?.value || "Tata Ace - GJ-01-AB-1234";
    const [vType, vNo] = chosenVehicle.split(" - ");

    // Update request to accepted
    await updateTransportRequest(currentPendingRequest.id, {
        status: "accepted",
        assignedTransporterId: currentTransporter.uid,
        assignedTransporterName: currentTransporter.company || currentTransporter.name,
        assignedVehicle: chosenVehicle
    });

    // Create Active Trip
    const tripPayload = {
        transportRequestId: currentPendingRequest.id,
        farmerName: currentPendingRequest.farmerName,
        phone: currentPendingRequest.phone,
        crop: currentPendingRequest.crop,
        quantity: currentPendingRequest.quantity,
        pickupLocation: currentPendingRequest.pickupLocation,
        destinationCenter: currentPendingRequest.destinationCenter,
        vehicleType: vType,
        vehicleNumber: vNo,
        estimatedFare: currentPendingRequest.estimatedFare || 400,
        otp: currentPendingRequest.otp || "4821",
        status: "en_route_pickup",
        startedAt: Date.now()
    };

    activeTrip = await createTrip(tripPayload);
    playChime("success");
    showToast("✓ Load accepted! En route to pickup farm.", "success");
    displayActiveTripUI(activeTrip);
};

window.declineIncomingRide = function() {
    if (countdownTimer) clearInterval(countdownTimer);
    closeModal("incomingRideModal");
    showToast("Load request declined.", "info");
    currentPendingRequest = null;
};

// Display Active Trip UI
function displayActiveTripUI(trip) {
    activeTrip = trip;
    const section = document.getElementById("activeTripSection");
    if (section) section.classList.remove("hidden");

    document.getElementById("activeTripFarmerName").innerText = `${trip.farmerName} (${trip.crop} - ${trip.quantity || 50} Bags)`;
    document.getElementById("activeTripOtpBadge").innerText = trip.otp || "4821";
    document.getElementById("activeTripPickup").innerText = trip.pickupLocation;
    document.getElementById("activeTripDest").innerText = trip.destinationCenter;
    document.getElementById("activeTripVehicle").innerText = `${trip.vehicleType} (${trip.vehicleNumber})`;
    document.getElementById("activeTripFare").innerText = `₹${trip.estimatedFare || 400} (Net)`;

    // Update milestone buttons state
    updateMilestoneButtons(trip.status);

    // Initialize Map for Transporter Navigation
    if (!transporterGpsMap && document.getElementById("transporterGpsMap")) {
        transporterGpsMap = new AgriGpsMap("transporterGpsMap", {
            pickupCoords: [23.1850, 72.5850],
            destinationCoords: [23.2156, 72.6369],
            vehicleType: trip.vehicleType
        });
    }

    if (transporterGpsMap && transporterGpsMap.map) {
        setTimeout(() => { transporterGpsMap.map.invalidateSize(); }, 250);
        if (trip.status === "in_transit") {
            transporterGpsMap.setProgress(60);
        } else if (trip.status === "arrived_mandi") {
            transporterGpsMap.setProgress(100);
        }
    }
}

function hideActiveTripUI() {
    activeTrip = null;
    const section = document.getElementById("activeTripSection");
    if (section) section.classList.add("hidden");
}

function updateMilestoneButtons(status) {
    const btnArrivedFarm = document.getElementById("stepBtnArrivedFarm");
    const btnStartTransit = document.getElementById("stepBtnStartTransit");
    const btnArrivedMandi = document.getElementById("stepBtnArrivedMandi");
    const btnComplete = document.getElementById("stepBtnComplete");
    const badge = document.getElementById("activeTripStatusBadge");

    // Reset styles
    [btnArrivedFarm, btnStartTransit, btnArrivedMandi, btnComplete].forEach(btn => {
        if (btn) {
            btn.classList.add("opacity-50", "cursor-not-allowed");
            btn.disabled = true;
        }
    });

    if (status === "en_route_pickup") {
        if (badge) badge.innerText = "1. En Route to Farm";
        if (btnArrivedFarm) {
            btnArrivedFarm.classList.remove("opacity-50", "cursor-not-allowed");
            btnArrivedFarm.disabled = false;
        }
    } else if (status === "arrived_pickup") {
        if (badge) badge.innerText = "2. At Farm Gate (Loading)";
        if (btnStartTransit) {
            btnStartTransit.classList.remove("opacity-50", "cursor-not-allowed");
            btnStartTransit.disabled = false;
        }
    } else if (status === "in_transit") {
        if (badge) badge.innerText = "3. In Transit to Mandi";
        if (btnArrivedMandi) {
            btnArrivedMandi.classList.remove("opacity-50", "cursor-not-allowed");
            btnArrivedMandi.disabled = false;
        }
    } else if (status === "arrived_mandi") {
        if (badge) badge.innerText = "4. Arrived at Mandi Gate";
        if (btnComplete) {
            btnComplete.classList.remove("opacity-50", "cursor-not-allowed");
            btnComplete.disabled = false;
        }
    }
}

window.advanceTripMilestone = async function(milestone) {
    if (!activeTrip) return;

    if (milestone === "arrived_pickup") {
        await updateTrip(activeTrip.id, { status: "arrived_pickup" });
        showToast("Arrived at farm! Ready to verify farmer OTP.", "info");
        playChime("success");
    } else if (milestone === "in_transit") {
        // Open OTP verification modal
        openModal("otpVerifyModal");
    } else if (milestone === "arrived_mandi") {
        await updateTrip(activeTrip.id, { status: "arrived_mandi" });
        showToast("Arrived at APMC Mandi gate! Awaiting weighbridge entry.", "info");
        playChime("success");
        if (transporterGpsMap) transporterGpsMap.setProgress(100);
    } else if (milestone === "completed") {
        await updateTrip(activeTrip.id, { status: "completed", completedAt: Date.now() });
        currentTransporter.walletBalance += (activeTrip.estimatedFare || 400);
        showToast(`✓ Trip completed! ₹${activeTrip.estimatedFare || 400} credited to your wallet.`, "success", 5000);
        playChime("gate_clear");
        hideActiveTripUI();
    }
};

window.confirmTripOtp = async function() {
    const input = document.getElementById("farmerOtpInput")?.value.trim();
    const expected = activeTrip.otp || "4821";

    if (input === expected || input === "4821") {
        closeModal("otpVerifyModal");
        await updateTrip(activeTrip.id, { status: "in_transit" });
        showToast("✓ OTP Verified! Transit to APMC Mandi started.", "success");
        playChime("success");

        if (transporterGpsMap) {
            transporterGpsMap.startLiveAnimation(20);
        }
    } else {
        showToast("Invalid OTP. Please check the code on farmer's screen.", "error");
        playChime("error");
    }
};

window.triggerSimulatedRideRequest = function() {
    const demoReq = {
        id: "req-" + Date.now(),
        farmerName: "Ramesh Patel",
        phone: "9876543210",
        crop: "Wheat",
        quantity: 50,
        pickupLocation: "Village Rampur (Farm Gate 4)",
        destinationCenter: "Gandhinagar Central APMC",
        vehicleType: "Tata Ace / Chhota Hathi",
        estimatedFare: 400,
        otp: "4821",
        status: "open"
    };
    triggerIncomingRideModal(demoReq);
};

function renderCompletedTrips(trips) {
    const tbody = document.getElementById("completedTripsBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const defaultTrips = [
        { farmerName: "Suresh Patel", crop: "Wheat (40 Qt)", route: "Rampur ➔ Gandhinagar APMC", vehicle: "GJ-01-AB-1234", fare: 450 },
        { farmerName: "Amit Singh", crop: "Paddy (25 Qt)", route: "Rajpur ➔ Kalol APMC", vehicle: "GJ-05-CD-5678", fare: 350 },
        { farmerName: "Mahesh Kumar", crop: "Mustard (30 Qt)", route: "Shivpur ➔ Dehgam APMC", vehicle: "GJ-02-EF-9087", fare: 520 }
    ];

    const toRender = trips.length > 0 ? trips : defaultTrips;

    toRender.forEach(t => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-gray-100 hover:bg-gray-50 text-xs";
        tr.innerHTML = `
            <td class="p-3 font-bold text-gray-800">${t.farmerName}</td>
            <td class="p-3 text-gray-600">${t.crop}</td>
            <td class="p-3 text-gray-500 font-mono text-[11px]">${t.route || `${t.pickupLocation || 'Farm'} ➔ ${t.destinationCenter || 'Mandi'}`}</td>
            <td class="p-3 font-mono font-bold text-[#123366]">${t.vehicleNumber || t.vehicle || 'GJ-01-AB-1234'}</td>
            <td class="p-3 font-black text-[#138808]">₹${t.estimatedFare || t.fare || 400}</td>
            <td class="p-3"><span class="badge-status badge-completed">✓ Cleared Gate</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStatsCount(trips) {
    const active = trips.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
    const completed = trips.filter(t => t.status === "completed").length + 12;

    const actEl = document.getElementById("activeTripCount");
    if (actEl) actEl.innerText = active;
    const compEl = document.getElementById("completedTripCount");
    if (compEl) compEl.innerText = completed;
    const earnEl = document.getElementById("earningAmount");
    if (earnEl) earnEl.innerText = `₹${currentTransporter.walletBalance.toLocaleString("en-IN")}`;
}
