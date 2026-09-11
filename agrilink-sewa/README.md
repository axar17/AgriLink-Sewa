# AGRILINK SEWA

**A Smart Agriculture Procurement, Mandi Queue Management, Farmer Verification and Logistics Coordination System**  
*Built for Smart India Hackathon (SIH)*

---

## 🌾 Project Overview

**AGRILINK SEWA** is a national-grade digital agriculture platform designed to resolve the three biggest bottlenecks in India's agricultural supply chain:
1. **Unregulated Mandi Congestion & Chaos:** Farmers wait for days in unregulated queues outside APMC mandis.
2. **Lack of Transparent Farmer Verification:** Difficulty verifying authentic registered farmers at weighing gates.
3. **Fragmented Rural Logistics:** High post-harvest losses due to unavailability of timely transport from farm gates to procurement centers.

The platform unites **Farmers**, **Transporters**, and **Mandi Procurement Officials** into a single, real-time, database-backed digital ecosystem.

---

## 🏛️ System Architecture

```
agrilink-sewa/
├── index.html                   # Landing & smart role-based routing
├── login.html                   # Centralized authentication & citizen registration
├── farmer.html                  # National Farmer Portal (Continuous slot booking, Digital Gate Pass)
├── mandi_operator.html          # Mandi Operator Portal (Queue, verification, gate pass clearance)
├── transporter_dashboard.html   # Transporter Portal (Requests, fleet management, live trip milestones)
├── transporter_booking.html     # Dedicated Farm Transport Coordination interface
├── firestore.rules              # Cloud Firestore role-based security rules
├── README.md                    # Project documentation & SIH judge demo guide
├── css/
│   └── common.css               # Shared government portal styling, Tricolor accents, print styles
└── js/
    ├── firebase-config.js       # Firebase Modular SDK v10 initialization
    ├── auth.js                  # Centralized auth state, role verification & route guards
    ├── login.js                 # Login & Registration controllers with Firestore profile writes
    ├── farmer.js                # Farmer slot booking, dynamic APMCs, gate pass & QR rendering
    ├── mandi.js                 # Mandi queue management, verification approve/reject, live stats
    ├── transporter.js           # Transporter requests, fleet assignment & trip lifecycle
    ├── language.js              # Centralized multi-language dictionary (EN, HI, GU, MR)
    ├── common.js                # Shared UI utilities (toasts, modals, status badges, SVG QR)
    └── seed-data.js             # 1-Click SIH demo dataset population script
```

---

## 🔥 Cloud Firestore Database Schema

The system uses standard Cloud Firestore collections:

### 1. `users/{uid}`
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "role": "farmer | transporter | mandi_operator",
  "pinCode": "string",
  "status": "active",
  "createdAt": "timestamp"
}
```

### 2. `farmers/{uid}`
```json
{
  "userId": "string",
  "fullName": "string",
  "phone": "string",
  "village": "string",
  "district": "string",
  "state": "string",
  "pinCode": "string",
  "farmerId": "AGRI-2026-XXXX",
  "verificationStatus": "pending | verified | rejected",
  "createdAt": "timestamp"
}
```

### 3. `transporters/{uid}`
```json
{
  "userId": "string",
  "ownerName": "string",
  "phone": "string",
  "vehicleNumber": "string",
  "vehicleType": "Truck",
  "capacity": "50 Quintals",
  "basePinCode": "string",
  "verificationStatus": "verified",
  "availability": "available | busy",
  "vehicles": [
    { "type": "Truck", "regNo": "GJ-01-AB-1234", "status": "available" },
    { "type": "Tractor / Trolley", "regNo": "GJ-05-CD-5678", "status": "available" },
    { "type": "Mini Vehicle", "regNo": "GJ-02-EF-9087", "status": "available" }
  ]
}
```

### 4. `mandiOperators/{uid}`
```json
{
  "userId": "string",
  "name": "string",
  "mandiName": "Gandhinagar Central APMC",
  "mandiId": "MND-001",
  "pinCode": "382021",
  "status": "active"
}
```

### 5. `procurementCenters/{centerId}`
```json
{
  "name": "Gandhinagar Central APMC",
  "location": "Sector 21 Yard",
  "district": "Gandhinagar",
  "state": "Gujarat",
  "pinCode": "382021",
  "capacityPerDay": 200,
  "currentQueue": 3,
  "status": "open | heavy_rush | closed",
  "distanceKm": 2.4
}
```

### 6. `bookings/{bookingId}`
```json
{
  "bookingId": "string",
  "tokenNumber": "AGR-2026-8492",
  "farmerId": "string",
  "farmerName": "Ramesh Patel",
  "farmerPhone": "9876543210",
  "farmerPin": "382480",
  "centerId": "center-01",
  "centerName": "Gandhinagar Central APMC",
  "crop": "Wheat",
  "estimatedQuantity": 40,
  "reportingDate": "Tomorrow",
  "slotTime": "10:15 AM",
  "status": "booked | arrived | verified | waiting | completed | rejected",
  "needsTransport": false,
  "transportRequestId": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 7. `transportRequests/{requestId}`
```json
{
  "requestId": "TRN-1001",
  "bookingId": "string",
  "farmerId": "string",
  "farmerName": "Ramesh Patel",
  "farmerPhone": "9876543210",
  "pickupLocation": "Village Rampur, PIN: 382480",
  "destinationCenter": "Gandhinagar Central APMC",
  "crop": "Wheat",
  "quantity": 50,
  "vehicleType": "Truck",
  "status": "open | accepted | in_transit | delivered | cancelled",
  "assignedTransporterId": null,
  "assignedTransporterName": null,
  "assignedVehicle": null,
  "createdAt": "timestamp"
}
```

### 8. `trips/{tripId}`
```json
{
  "tripId": "string",
  "transportRequestId": "string",
  "transporterId": "string",
  "farmerName": "Ramesh Patel",
  "crop": "Wheat",
  "vehicleNumber": "GJ-01-AB-1234",
  "vehicleType": "Truck",
  "pickupLocation": "Village Rampur",
  "destination": "Gandhinagar Central APMC",
  "status": "assigned | started | arrived | completed",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## ⚙️ Firebase Setup Steps

The codebase is pre-configured with a live test Firebase project (`agrilink-sewa.firebaseapp.com`). To connect your own Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project named `agrilink-sewa` (or any name).
3. **Enable Authentication:**
   - Go to **Build** → **Authentication** → **Sign-in method**.
   - Enable **Email/Password**.
4. **Enable Cloud Firestore:**
   - Go to **Build** → **Firestore Database** → **Create Database**.
   - Choose your nearest cloud region (e.g., `asia-south1` Mumbai).
   - Start in **Test mode** (or paste the rules from `firestore.rules`).
5. **Update Credentials:**
   - Open `js/firebase-config.js`.
   - Replace the `firebaseConfig` object with your project credentials:
   ```javascript
   export const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

---

## 🚀 How to Run the Project Locally

Because the application uses ES6 modular JavaScript (`import/export`), it must be served over a local HTTP server:

### Option 1: Python Built-in Server (Recommended)
Open PowerShell or Terminal inside the `agrilink-sewa` folder and run:
```bash
python -m http.server 8080
```
Open your browser and navigate to:
```
http://localhost:8080
```

### Option 2: VS Code Live Server
1. Open the `agrilink-sewa` directory in VS Code.
2. Right click on `login.html` or `index.html` and choose **Open with Live Server**.

---

## 🎯 Step-by-Step SIH Competition Demonstration Guide

Follow this live demonstration script to showcase the complete connected workflow to SIH judges:

### 🌟 Step 1: Pre-populate Demo Data (1-Click)
1. Open `http://localhost:8080/login.html`.
2. Click the **Seed Demo Data (1-Click)** button on the login screen (or inside the Mandi/Transporter top bar).
3. Cloud Firestore will be populated with realistic APMC centers, pending farmer verifications, open transport requests, and sample queue bookings.

### 👨‍🌾 Step 2: Farmer Registration & Slot Booking
1. On `login.html`, click **New User Registration**.
2. Select **Kisan (Farmer)**.
3. Fill in:
   - Email: `kisan1@agrilink.in`
   - Password: `password123`
   - Name: `Ramesh Patel`
   - Mobile: `9876543210`
   - Village PIN: `382480`
4. Click **Submit Registration**, then login.
5. You are redirected to `farmer.html`.
6. Notice:
   - Dynamic Nearby Centers loaded from Firestore (Gandhinagar Central APMC).
   - Farmer Verification Badge in top header shows **VERIFICATION PENDING**.
7. Click on **Gandhinagar Central APMC**.
8. Select an arrival time slot (e.g., `10:15 AM`).
9. In the confirmation screen:
   - Select Crop: `Wheat (गेहूं)`
   - Quantity: `40 Quintals`
   - Check **Need Transportation Support for this harvest?**
10. Click **Confirm & Sync with Database**.
11. **Instant Result:**
    - Unique Token generated: `AGR-2026-XXXX`.
    - SVG Digital Gate Pass rendered with scanable QR code.
    - Click **Return to Dashboard** — notice the dashboard enters **Active Pass Locked Mode** with a live status tracker.

### 🏛️ Step 3: Mandi Operator Live Queue & Farmer Verification
*(Open in a separate browser tab or window)*
1. Navigate to `http://localhost:8080/login.html` and login as Mandi Operator (or register as Mandi Admin).
2. You are routed to `mandi_operator.html`.
3. In **Farmer Verification Requests**:
   - Notice `Ramesh Patel` appears live!
   - Click **Approve**.
   - **Switch back to the Farmer tab:** Notice the header badge instantly turns into **✓ VERIFIED FARMER** in real-time without refreshing!
4. In **Upcoming & Waiting Queue**:
   - The booking appears with time slot `10:15 AM`.
   - When the tractor reaches the gate, click **Mark Arrived**.
   - The button transitions to **Clear Gate**.
   - Click **Clear Gate** — the record moves into **Completed Entries**, and the **Processed Today** counter increments.
   - **Switch to Farmer tab:** The farmer's Gate Pass status updates to **Completed** in real-time!

### 🚚 Step 4: Transporter Fleet Assignment & Trip Lifecycle
*(Open in another browser tab)*
1. Navigate to `login.html` and login as Transporter.
2. You are routed to `transporter_dashboard.html`.
3. Under **New Transport Requests**:
   - The request created by Ramesh Patel is visible live.
   - Click **View Verification** to inspect the farmer's credentials and trust badge.
   - Click **Accept**.
4. A modal appears showing available vehicles from the fleet (`Truck - GJ-01-AB-1234`).
5. Click **Confirm Booking**.
6. The request moves into **Active Trips**:
   - Milestone 1: Click **Start Trip** (Status updates to `Started`).
   - Milestone 2: Click **Reached Mandi** (Status updates to `Arrived`).
   - Milestone 3: Click **Complete Delivery** (Status updates to `Completed`).
7. The trip is logged under **Recent Completed Trips**, and **Today's Earnings** updates.

### 🌐 Step 5: Multi-Language Switch Demonstration
1. On any portal, click the language dropdown in the top bar.
2. Select **हिन्दी (Hindi)**, **ગુજરાતી (Gujarati)**, or **मराठी (Marathi)**.
3. Every heading, status pill, table label, and even numerical counters translate instantaneously.

---

## 🔒 Security & Data Integrity

- **Role-Based Access Control (RBAC):** Users cannot access portal pages outside their database-verified role (`protectPage()` guard redirects unauthorized users).
- **Atomic Queue Management:** Prevents overbooking and ensures queue counts synchronize safely.
- **Client-Side Scalable QR:** High-resolution vector SVG QR codes generated entirely offline with zero external CDN dependencies.
- **Multi-lingual Persistence:** Remembers user language preference via `localStorage`.

---

## 🏆 Smart India Hackathon (SIH) Compliance

AGRILINK SEWA fulfills the core SIH problem statements regarding agricultural efficiency, transparency, and rural logistics coordination:
- ✅ Real-time data pipeline powered by Cloud Firestore `onSnapshot()`.
- ✅ No fake static arrays — 100% database-backed workflow.
- ✅ National government portal design standards (Tricolor, NIC styling, responsive desktop/tablet/mobile layouts).
- ✅ Turn-key evaluation ready with pre-configured Firebase and 1-click demo seeding.
