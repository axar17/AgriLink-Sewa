// =====================================================
// AGRILINK SEWA - UBER / PORTER AUTOMATED LOGISTICS ENGINE
// Rate card, automated driver dispatching, live trip lifecycle & OTP
// =====================================================

import { 
    createTransportRequest, 
    subscribeTransportRequests, 
    updateTransportRequest, 
    createTrip, 
    subscribeTrips, 
    updateTrip 
} from "./db-bus.js";
import { showToast, playChime, openModal, closeModal } from "./common.js";

// Standard Porter-Style Farm Logistics Rate Card
export const VEHICLE_RATES = {
    tractor: {
        key: "tractor",
        name: "Tractor / Trolley",
        icon: "fa-tractor",
        capacity: "30 - 40 Quintals",
        baseFare: 300,
        perKmRate: 18,
        description: "Best for rough village trails and field gate loading."
    },
    chhota_hathi: {
        key: "chhota_hathi",
        name: "Tata Ace / Chhota Hathi",
        icon: "fa-truck-pickup",
        capacity: "15 - 18 Quintals",
        baseFare: 250,
        perKmRate: 22,
        description: "Nimble, quick logistics for small & medium farmers."
    },
    pickup: {
        key: "pickup",
        name: "Pickup 8ft",
        icon: "fa-truck",
        capacity: "25 Quintals",
        baseFare: 350,
        perKmRate: 25,
        description: "Covered bed vehicle for fast mandi transit."
    },
    heavy_truck: {
        key: "heavy_truck",
        name: "Heavy Truck (14ft)",
        icon: "fa-boxes-stacked",
        capacity: "70 - 100 Quintals",
        baseFare: 600,
        perKmRate: 40,
        description: "Bulk harvest dispatch to primary APMC yard."
    }
};

/**
 * Transparent Fare Calculation
 */
export function calculateFare(vehicleKey, distanceKm = 6.8) {
    const rate = VEHICLE_RATES[vehicleKey] || VEHICLE_RATES.chhota_hathi;
    const distanceFare = Math.round(distanceKm * rate.perKmRate);
    const totalFare = rate.baseFare + distanceFare;
    return {
        vehicleKey: rate.key,
        vehicleName: rate.name,
        baseFare: rate.baseFare,
        perKmRate: rate.perKmRate,
        distanceKm: distanceKm,
        distanceFare: distanceFare,
        totalFare: totalFare
    };
}

/**
 * Porter Automated Booking Controller (Farmer Side)
 */
export class FarmerRideController {
    constructor(gpsMapInstance) {
        this.gpsMap = gpsMapInstance;
        this.selectedVehicle = "chhota_hathi";
        this.activeRequest = null;
        this.activeTrip = null;
        this.unsubscribeReqs = null;
        this.unsubscribeTrips = null;
    }

    init() {
        this.listenRides();
    }

    selectVehicle(vehicleKey) {
        this.selectedVehicle = vehicleKey;
        document.querySelectorAll(".uber-vehicle-card").forEach(c => c.classList.remove("selected", "border-[#138808]", "bg-green-50"));
        const el = document.getElementById(`veh-card-${vehicleKey}`);
        if (el) el.classList.add("selected", "border-[#138808]", "bg-green-50");
        this.updateFareUI();
    }

    updateFareUI() {
        const fare = calculateFare(this.selectedVehicle, 6.8);
        const fareEl = document.getElementById("estimatedFareAmount");
        if (fareEl) fareEl.innerText = `₹${fare.totalFare}`;
        const baseEl = document.getElementById("fareBaseRate");
        if (baseEl) baseEl.innerText = `Base: ₹${fare.baseFare} + ₹${fare.perKmRate}/km`;
    }

    /**
     * Start Uber-style search and dispatch
     */
    async bookRide(bookingDetails) {
        const fare = calculateFare(this.selectedVehicle, 6.8);
        const payload = {
            farmerName: bookingDetails.farmerName || "Ramesh Patel",
            phone: bookingDetails.phone || "9876543210",
            farmerPin: bookingDetails.pinCode || "382480",
            pickupLocation: bookingDetails.pickupLocation || "Village Rampur (Farm Gate)",
            pickupCoords: [23.1850, 72.5850],
            destinationCenter: bookingDetails.mandiName || "Gandhinagar Central APMC",
            destinationCoords: [23.2156, 72.6369],
            crop: bookingDetails.crop || "Wheat",
            quantity: bookingDetails.quantity || 40,
            vehicleType: fare.vehicleName,
            vehicleKey: this.selectedVehicle,
            estimatedDistanceKm: fare.distanceKm,
            estimatedFare: fare.totalFare,
            notes: bookingDetails.notes || "Farmer gate pickup"
        };

        // UI state: Searching Radar
        this.showSearchingRadar(true);
        playChime("success");

        try {
            this.activeRequest = await createTransportRequest(payload);
            showToast("Transport request broadcasted to nearby certified drivers!", "info");
        } catch (e) {
            console.error("Booking failed:", e);
            showToast("Booking failed: " + e.message, "error");
            this.showSearchingRadar(false);
        }
    }

    showSearchingRadar(show) {
        const radar = document.getElementById("uberSearchingRadar");
        const form = document.getElementById("uberBookingForm");
        const driverCard = document.getElementById("uberDriverMatchedCard");

        if (radar) radar.classList.toggle("hidden", !show);
        if (form) form.classList.toggle("hidden", show);
        if (driverCard && show) driverCard.classList.add("hidden");
    }

    listenRides() {
        this.unsubscribeTrips = subscribeTrips((trips) => {
            if (!trips || trips.length === 0) return;
            // Find active trip matching recent request or farmer
            const trip = trips.find(t => t.status !== "completed" && t.status !== "cancelled");
            if (trip) {
                this.activeTrip = trip;
                this.onDriverAssigned(trip);
            } else if (this.activeTrip && trips.find(t => t.id === this.activeTrip.id && t.status === "completed")) {
                this.onTripCompleted();
            }
        });
    }

    onDriverAssigned(trip) {
        this.showSearchingRadar(false);
        const form = document.getElementById("uberBookingForm");
        if (form) form.classList.add("hidden");

        const card = document.getElementById("uberDriverMatchedCard");
        if (card) {
            card.classList.remove("hidden");
            document.getElementById("matchedDriverName").innerText = trip.transporterName || "Rajesh Kumar Logistics";
            document.getElementById("matchedVehicleNo").innerText = trip.vehicleNumber || "GJ-01-AB-1234";
            document.getElementById("matchedVehicleType").innerText = trip.vehicleType || "Tata Ace";
            document.getElementById("matchedRideOtp").innerText = trip.otp || "4821";
            document.getElementById("matchedDriverPhone").innerText = "+91 98251 40921";
            document.getElementById("matchedTripFare").innerText = `₹${trip.estimatedFare || 400}`;
            
            this.updateMilestoneUI(trip.status);
        }

        // Animate map if trip is in transit
        if (this.gpsMap) {
            if (trip.status === "in_transit") {
                this.gpsMap.setProgress(60);
                this.gpsMap.startLiveAnimation(20);
            } else if (trip.status === "arrived_pickup") {
                this.gpsMap.setProgress(10);
            } else if (trip.status === "arrived_mandi") {
                this.gpsMap.setProgress(95);
            }
        }
    }

    updateMilestoneUI(status) {
        const milestones = ["milestone_enroute", "milestone_arrived", "milestone_transit", "milestone_mandi"];
        milestones.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove("text-green-700", "font-bold", "bg-green-100");
        });

        const statusLabel = document.getElementById("matchedRideStatusText");
        if (status === "en_route_pickup") {
            if (statusLabel) statusLabel.innerText = "Driver is on the way to your farm";
            document.getElementById("milestone_enroute")?.classList.add("text-green-700", "font-bold", "bg-green-100");
        } else if (status === "arrived_pickup") {
            if (statusLabel) statusLabel.innerText = "Driver arrived at farm! Loading harvest";
            document.getElementById("milestone_arrived")?.classList.add("text-green-700", "font-bold", "bg-green-100");
        } else if (status === "in_transit") {
            if (statusLabel) statusLabel.innerText = "In Transit to APMC Mandi (Live GPS Active)";
            document.getElementById("milestone_transit")?.classList.add("text-green-700", "font-bold", "bg-green-100");
        } else if (status === "arrived_mandi") {
            if (statusLabel) statusLabel.innerText = "Arrived at Mandi Gate! Awaiting weighbridge entry";
            document.getElementById("milestone_mandi")?.classList.add("text-green-700", "font-bold", "bg-green-100");
        }
    }

    onTripCompleted() {
        showToast("Transport trip successfully completed & gate cleared!", "success", 5000);
        playChime("gate_clear");
        const card = document.getElementById("uberDriverMatchedCard");
        if (card) card.classList.add("hidden");
        const form = document.getElementById("uberBookingForm");
        if (form) form.classList.remove("hidden");
        this.activeTrip = null;
    }
}

// Global exposure
if (typeof window !== "undefined") {
    window.VEHICLE_RATES = VEHICLE_RATES;
    window.calculateFare = calculateFare;
    window.FarmerRideController = FarmerRideController;
}
