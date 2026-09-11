// =====================================================
// AGRILINK SEWA - STANDARDIZED DEMO DATA SEEDING UTILITY
// Full schema compliance with mandiId, mandiName, pinCode (STRING)
// =====================================================

import { db } from "./firebase-config.js";
import { 
    collection, 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast } from "./common.js";

/**
 * Seed standardized Procurement Centers, Demo Farmers, and Transport Requests
 */
export async function seedDemoData() {
    console.log("[AgriLink Seed] Seeding standardized database collections with mandiId and mandiName...");
    showToast("Seeding realistic SIH demo data with standardized Mandi names...", "info", 2000);

    try {
        // 1. Procurement Centers (Standardized schema with both mandiId & mandiName)
        const centers = [
            {
                centerId: "center-01",
                mandiId: "center-01",
                mandiName: "Gandhinagar Central APMC",
                name: "Gandhinagar Central APMC",
                pinCode: "382021",
                village: "Sector 21 Yard",
                taluka: "Gandhinagar",
                district: "Gandhinagar",
                state: "Gujarat",
                latitude: 23.2156,
                longitude: 72.6369,
                status: "open",
                capacityPerDay: 500,
                currentQueue: 3,
                operatorId: "ADM-042",
                distanceKm: 2.4
            },
            {
                centerId: "center-02",
                mandiId: "center-02",
                mandiName: "Kalol Market Yard",
                name: "Kalol Market Yard",
                pinCode: "382721",
                village: "Kalol Yard",
                taluka: "Kalol",
                district: "Gandhinagar",
                state: "Gujarat",
                latitude: 23.2389,
                longitude: 72.4988,
                status: "open",
                capacityPerDay: 350,
                currentQueue: 1,
                operatorId: "ADM-043",
                distanceKm: 6.1
            },
            {
                centerId: "center-03",
                mandiId: "center-03",
                mandiName: "Dehgam Sub-Center",
                name: "Dehgam Sub-Center",
                pinCode: "382305",
                village: "Station Road",
                taluka: "Dehgam",
                district: "Gandhinagar",
                state: "Gujarat",
                latitude: 23.1685,
                longitude: 72.8123,
                status: "heavy_rush",
                capacityPerDay: 250,
                currentQueue: 8,
                operatorId: "ADM-044",
                distanceKm: 12.8
            },
            {
                centerId: "center-04",
                mandiId: "center-04",
                mandiName: "Ahmedabad Rural Agro Center",
                name: "Ahmedabad Rural Agro Center",
                pinCode: "382480",
                village: "Rampur / Daskroi",
                taluka: "Daskroi",
                district: "Ahmedabad",
                state: "Gujarat",
                latitude: 23.0225,
                longitude: 72.5714,
                status: "open",
                capacityPerDay: 400,
                currentQueue: 2,
                operatorId: "ADM-045",
                distanceKm: 4.5
            },
            {
                centerId: "center-05",
                mandiId: "center-05",
                mandiName: "Central Delhi Grain Procurement Mandi",
                name: "Central Delhi Grain Procurement Mandi",
                pinCode: "110001",
                village: "Connaught Yard",
                taluka: "Central",
                district: "Central Delhi",
                state: "Delhi",
                latitude: 28.6315,
                longitude: 77.2167,
                status: "open",
                capacityPerDay: 600,
                currentQueue: 5,
                operatorId: "ADM-046",
                distanceKm: 3.2
            }
        ];

        for (const c of centers) {
            await setDoc(doc(db, "procurementCenters", c.centerId), {
                ...c,
                location: `${c.village}, ${c.taluka}`,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        // 2. Demo Farmers with Standardized pinCode
        const demoFarmers = [
            {
                uid: "farmer-demo-01",
                userId: "farmer-demo-01",
                fullName: "Ramesh Patel",
                full_name: "Ramesh Patel",
                phone: "9876543210",
                phone_number: "9876543210",
                village: "Rampur",
                district: "Ahmedabad",
                state: "Gujarat",
                pinCode: "382480",
                farmerId: "AGRI-2026-001",
                verificationStatus: "pending",
                role: "farmers"
            },
            {
                uid: "farmer-demo-02",
                userId: "farmer-demo-02",
                fullName: "Rajesh Sharma",
                full_name: "Rajesh Sharma",
                phone: "9823456781",
                phone_number: "9823456781",
                village: "Sector 22",
                district: "Gandhinagar",
                state: "Gujarat",
                pinCode: "382021",
                farmerId: "AGRI-2026-002",
                verificationStatus: "pending",
                role: "farmers"
            }
        ];

        for (const f of demoFarmers) {
            await setDoc(doc(db, "farmers", f.uid), {
                ...f,
                createdAt: serverTimestamp()
            }, { merge: true });
        }

        // 3. Open Transport Requests with standardized mandiId & mandiName
        const demoTransport = [
            {
                id: "transport-req-01",
                requestId: "TRN-1001",
                farmerId: "farmer-demo-01",
                farmerName: "Ramesh Patel",
                farmerPhone: "9876543210",
                crop: "Wheat",
                quantity: 50,
                pickupLocation: "Village Rampur, PIN: 382480",
                mandiId: "center-01",
                mandiName: "Gandhinagar Central APMC",
                destinationCenter: "Gandhinagar Central APMC",
                destination: "Gandhinagar Central APMC",
                vehicleType: "Truck",
                status: "open"
            },
            {
                id: "transport-req-02",
                requestId: "TRN-1002",
                farmerId: "farmer-demo-02",
                farmerName: "Suresh Kumar",
                farmerPhone: "9898765432",
                crop: "Cotton",
                quantity: 30,
                pickupLocation: "Village Rajpur, PIN: 382721",
                mandiId: "center-02",
                mandiName: "Kalol Market Yard",
                destinationCenter: "Kalol Market Yard",
                destination: "Kalol Market Yard",
                vehicleType: "Tractor / Trolley",
                status: "open"
            }
        ];

        for (const t of demoTransport) {
            await setDoc(doc(db, "transportRequests", t.id), {
                ...t,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        // 4. Sample Queue Bookings with standardized mandiId and mandiName
        const demoBookings = [
            {
                id: "booking-demo-01",
                bookingId: "booking-demo-01",
                tokenNumber: "TKN-105",
                token_id: "TKN-105",
                farmerName: "Ramesh Patel",
                farmer_name: "Ramesh Patel",
                mandiId: "center-01",
                mandiName: "Gandhinagar Central APMC",
                centerId: "center-01",
                centerName: "Gandhinagar Central APMC",
                mandi_name: "Gandhinagar Central APMC",
                crop: "Wheat",
                crop_name: "Wheat",
                estimatedQuantity: 40,
                estimated_qty: 40,
                slotTime: "10:30 AM",
                time_slot: "10:30 AM",
                reportingDate: "Tomorrow",
                status: "booked"
            }
        ];

        for (const b of demoBookings) {
            await setDoc(doc(db, "bookings", b.id), {
                ...b,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
        }

        showToast("✓ Standardized SIH demo data successfully seeded in Firestore!");
        console.log("[AgriLink Seed] Seeding completed with standardized mandiId and mandiName.");

    } catch (err) {
        console.error("[AgriLink Seed] Error seeding demo data:", err);
        showToast("Seeding failed: " + err.message, "error");
    }
}

if (typeof window !== "undefined") {
    window.seedDemoData = seedDemoData;
}
