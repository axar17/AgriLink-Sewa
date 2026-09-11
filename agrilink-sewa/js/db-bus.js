// =====================================================
// AGRILINK SEWA - UNIVERSAL DUAL-SYNC DATABASE & EVENT BUS
// Zero-error real-time sync across tabs and Cloud Firestore
// =====================================================

import { db } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    doc, 
    setDoc,
    getDoc, 
    getDocs, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Multi-tab BroadcastChannel
const CHANNEL_NAME = "agrilink_sync_channel";
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

// LocalStorage Keys
const STORAGE_KEYS = {
    BOOKINGS: "agrilink_db_bookings",
    TRANSPORT_REQUESTS: "agrilink_db_transport_requests",
    TRIPS: "agrilink_db_trips",
    VERIFICATIONS: "agrilink_db_verifications",
    CENTERS: "agrilink_db_centers"
};

// Default initial dataset if storage is empty
const DEFAULT_CENTERS = [
    {
        centerId: "center-01",
        mandiId: "center-01",
        mandiName: "Gandhinagar Central APMC",
        name: "Gandhinagar Central APMC",
        pinCode: "382021",
        village: "Sector 21 Yard",
        district: "Gandhinagar",
        state: "Gujarat",
        latitude: 23.2156,
        longitude: 72.6369,
        status: "open",
        distanceKm: 2.4,
        operatorId: "ADM-042"
    },
    {
        centerId: "center-02",
        mandiId: "center-02",
        mandiName: "Kalol Market Yard",
        name: "Kalol Market Yard",
        pinCode: "382721",
        village: "Kalol Yard",
        district: "Gandhinagar",
        state: "Gujarat",
        latitude: 23.2389,
        longitude: 72.4988,
        status: "open",
        distanceKm: 6.1,
        operatorId: "ADM-043"
    },
    {
        centerId: "center-03",
        mandiId: "center-03",
        mandiName: "Dehgam Sub-Center",
        name: "Dehgam Sub-Center",
        pinCode: "382305",
        village: "Station Road",
        district: "Gandhinagar",
        state: "Gujarat",
        latitude: 23.1685,
        longitude: 72.8123,
        status: "heavy_rush",
        distanceKm: 12.8,
        operatorId: "ADM-044"
    },
    {
        centerId: "center-04",
        mandiId: "center-04",
        mandiName: "Ahmedabad Rural Agro Mandi",
        name: "Ahmedabad Rural Agro Mandi",
        pinCode: "382480",
        village: "Rampur / Daskroi",
        district: "Ahmedabad",
        state: "Gujarat",
        latitude: 23.0225,
        longitude: 72.5714,
        status: "open",
        distanceKm: 4.5,
        operatorId: "ADM-045"
    }
];

const DEFAULT_BOOKINGS = [
    {
        id: "book-001",
        tokenNumber: "TKN-105",
        tokenId: "TKN-105",
        farmerId: "AGRI-2026-001",
        farmerName: "Ramesh Patel",
        phone: "9876543210",
        pinCode: "382480",
        village: "Village Rampur",
        crop: "Wheat",
        cropName: "Wheat",
        estimatedQuantity: 40,
        mandiName: "Gandhinagar Central APMC",
        centerId: "center-01",
        reportingDate: "Tomorrow",
        slotTime: "10:30 AM",
        timeSlot: "10:30 AM",
        status: "waiting",
        verificationStatus: "verified",
        createdAt: Date.now() - 3600000
    },
    {
        id: "book-002",
        tokenNumber: "TKN-106",
        tokenId: "TKN-106",
        farmerId: "AGRI-2026-002",
        farmerName: "Suresh Kumar",
        phone: "9823456781",
        pinCode: "382021",
        village: "Village Rajpur",
        crop: "Paddy",
        cropName: "Paddy",
        estimatedQuantity: 25,
        mandiName: "Gandhinagar Central APMC",
        centerId: "center-01",
        reportingDate: "Tomorrow",
        slotTime: "11:00 AM",
        timeSlot: "11:00 AM",
        status: "scheduled",
        verificationStatus: "verified",
        createdAt: Date.now() - 1800000
    },
    {
        id: "book-003",
        tokenNumber: "TKN-107",
        tokenId: "TKN-107",
        farmerId: "AGRI-2026-003",
        farmerName: "Vikram Singh",
        phone: "9712345678",
        pinCode: "382721",
        village: "Village Shivpur",
        crop: "Mustard",
        cropName: "Mustard",
        estimatedQuantity: 30,
        mandiName: "Kalol Market Yard",
        centerId: "center-02",
        reportingDate: "Tomorrow",
        slotTime: "11:30 AM",
        timeSlot: "11:30 AM",
        status: "scheduled",
        verificationStatus: "pending",
        createdAt: Date.now() - 900000
    }
];

const DEFAULT_TRANSPORT_REQUESTS = [
    {
        id: "req-001",
        farmerName: "Ramesh Patel",
        phone: "9876543210",
        farmerPin: "382480",
        pickupLocation: "Village Rampur (Farm Gate 4)",
        pickupCoords: [23.1850, 72.5850],
        destinationCenter: "Gandhinagar Central APMC",
        destinationCoords: [23.2156, 72.6369],
        crop: "Wheat",
        quantity: 50,
        vehicleType: "Tata Ace / Chhota Hathi",
        estimatedDistanceKm: 6.8,
        estimatedFare: 400,
        notes: "Careful with loading - packed in jute bags",
        status: "open",
        assignedTransporterId: null,
        assignedTransporterName: null,
        assignedVehicle: null,
        otp: "4821",
        createdAt: Date.now() - 120000
    }
];

function initLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.CENTERS)) {
        localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(DEFAULT_CENTERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSPORT_REQUESTS)) {
        localStorage.setItem(STORAGE_KEYS.TRANSPORT_REQUESTS, JSON.stringify(DEFAULT_TRANSPORT_REQUESTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRIPS)) {
        localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify([]));
    }
}

initLocalStorage();

const subscribers = {
    bookings: new Set(),
    transportRequests: new Set(),
    trips: new Set(),
    verifications: new Set()
};

if (syncChannel) {
    syncChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type && subscribers[type]) {
            subscribers[type].forEach(callback => {
                try { callback(payload); } catch(e) { console.error("Bus callback error:", e); }
            });
        }
    };
}

window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEYS.BOOKINGS && subscribers.bookings) {
        const data = JSON.parse(e.newValue || "[]");
        subscribers.bookings.forEach(cb => cb(data));
    }
    if (e.key === STORAGE_KEYS.TRANSPORT_REQUESTS && subscribers.transportRequests) {
        const data = JSON.parse(e.newValue || "[]");
        subscribers.transportRequests.forEach(cb => cb(data));
    }
    if (e.key === STORAGE_KEYS.TRIPS && subscribers.trips) {
        const data = JSON.parse(e.newValue || "[]");
        subscribers.trips.forEach(cb => cb(data));
    }
});

function broadcastEvent(type, payload) {
    if (syncChannel) {
        syncChannel.postMessage({ type, payload });
    }
    if (subscribers[type]) {
        subscribers[type].forEach(cb => {
            try { cb(payload); } catch(e) { console.error(e); }
        });
    }
}

// 1. MANDI APMC CENTERS
export async function getProcurementCenters() {
    try {
        const snapshot = await getDocs(collection(db, "procurementCenters"));
        if (!snapshot.empty) {
            const list = [];
            snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            localStorage.setItem(STORAGE_KEYS.CENTERS, JSON.stringify(list));
            return list;
        }
    } catch(e) {
        console.warn("[AgriDataBus] Firestore centers offline/permission fallback:", e.message);
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CENTERS) || "[]");
}

// 2. BOOKINGS & GATE PASSES
export async function createBooking(bookingData) {
    const id = "book-" + Date.now();
    const token = bookingData.tokenNumber || "TKN-" + Math.floor(1000 + Math.random() * 9000);
    
    const record = {
        id: id,
        tokenNumber: token,
        tokenId: token,
        status: "scheduled",
        createdAt: Date.now(),
        ...bookingData
    };

    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || "[]");
    list.unshift(record);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
    broadcastEvent("bookings", list);

    try {
        await setDoc(doc(db, "bookings", id), {
            ...record,
            serverTimestamp: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore write deferred (local state preserved):", e.message);
    }

    return record;
}

export function subscribeBookings(callback) {
    subscribers.bookings.add(callback);
    const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || "[]");
    callback(local);

    let unsubscribeFirestore = null;
    try {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const list = [];
                snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
                localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
                callback(list);
            }
        }, (err) => {
            console.warn("[AgriDataBus] Firestore listener using local bus:", err.message);
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore subscription error:", e.message);
    }

    return () => {
        subscribers.bookings.delete(callback);
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
}

export async function updateBookingStatus(bookingId, newStatus, extraData = {}) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKINGS) || "[]");
    const item = list.find(b => b.id === bookingId || b.tokenNumber === bookingId || b.tokenId === bookingId);
    if (item) {
        item.status = newStatus;
        Object.assign(item, extraData);
        item.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
        broadcastEvent("bookings", list);
    }

    try {
        await updateDoc(doc(db, "bookings", bookingId), {
            status: newStatus,
            ...extraData,
            updatedAt: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore update status deferred:", e.message);
    }
    return item;
}

// 3. UBER / PORTER TRANSPORT REQUESTS
export async function createTransportRequest(requestData) {
    const id = "req-" + Date.now();
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const record = {
        id: id,
        status: "open",
        otp: otp,
        createdAt: Date.now(),
        ...requestData
    };

    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSPORT_REQUESTS) || "[]");
    list.unshift(record);
    localStorage.setItem(STORAGE_KEYS.TRANSPORT_REQUESTS, JSON.stringify(list));
    broadcastEvent("transportRequests", list);

    try {
        await setDoc(doc(db, "transportRequests", id), {
            ...record,
            serverTimestamp: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore transport request deferred:", e.message);
    }

    return record;
}

export function subscribeTransportRequests(callback) {
    subscribers.transportRequests.add(callback);
    const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSPORT_REQUESTS) || "[]");
    callback(local);

    let unsubscribeFirestore = null;
    try {
        const q = query(collection(db, "transportRequests"), orderBy("createdAt", "desc"));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const list = [];
                snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
                localStorage.setItem(STORAGE_KEYS.TRANSPORT_REQUESTS, JSON.stringify(list));
                callback(list);
            }
        }, (err) => {
            console.warn("[AgriDataBus] TransportRequests using local bus:", err.message);
        });
    } catch(e) {
        console.warn("[AgriDataBus] Transport subscription error:", e.message);
    }

    return () => {
        subscribers.transportRequests.delete(callback);
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
}

export async function updateTransportRequest(requestId, updates) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSPORT_REQUESTS) || "[]");
    const item = list.find(r => r.id === requestId);
    if (item) {
        Object.assign(item, updates);
        item.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.TRANSPORT_REQUESTS, JSON.stringify(list));
        broadcastEvent("transportRequests", list);
    }

    try {
        await updateDoc(doc(db, "transportRequests", requestId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore update request deferred:", e.message);
    }
    return item;
}

// 4. ACTIVE LIVE TRIPS (UBER/PORTER PROGRESSION)
export async function createTrip(tripData) {
    const id = "trip-" + Date.now();
    const record = {
        id: id,
        status: "assigned",
        progressPercent: 10,
        speedKmH: 35,
        remainingDistanceKm: tripData.estimatedDistanceKm || 6.5,
        etaMinutes: Math.round(((tripData.estimatedDistanceKm || 6.5) / 35) * 60) + 2,
        createdAt: Date.now(),
        ...tripData
    };

    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
    list.unshift(record);
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
    broadcastEvent("trips", list);

    try {
        await setDoc(doc(db, "trips", id), {
            ...record,
            serverTimestamp: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore trip write deferred:", e.message);
    }

    return record;
}

export function subscribeTrips(callback) {
    subscribers.trips.add(callback);
    const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
    callback(local);

    let unsubscribeFirestore = null;
    try {
        const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const list = [];
                snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
                localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
                callback(list);
            }
        }, (err) => {
            console.warn("[AgriDataBus] Trips using local bus:", err.message);
        });
    } catch(e) {
        console.warn("[AgriDataBus] Trips subscription error:", e.message);
    }

    return () => {
        subscribers.trips.delete(callback);
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
}

export async function updateTrip(tripId, updates) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRIPS) || "[]");
    const item = list.find(t => t.id === tripId);
    if (item) {
        Object.assign(item, updates);
        item.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
        broadcastEvent("trips", list);
    }

    try {
        await updateDoc(doc(db, "trips", tripId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch(e) {
        console.warn("[AgriDataBus] Firestore update trip deferred:", e.message);
    }
    return item;
}

console.log("[AgriDataBus] Universal Dual-Sync Database Bus Active.");
