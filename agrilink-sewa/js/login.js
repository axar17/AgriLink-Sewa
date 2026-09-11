// =====================================================
// AGRILINK SEWA - LOGIN & CITIZEN REGISTRATION CONTROLLER
// Strict role verification against Cloud Firestore
// =====================================================

import { auth, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getRoleRedirectUrl, normalizeRole } from "./auth.js";
import { showToast } from "./common.js";

/**
 * Handle Citizen Registration
 */
export async function registerUser() {
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const rawRole = document.getElementById("regRole").value;
    const role = normalizeRole(rawRole);

    if (!email || !password) {
        showToast("Email and Password are required.", "error");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters.", "error");
        return;
    }

    const regBtn = document.getElementById("regSubmitBtn") || document.querySelector('button[onclick="registerUser()"]');
    const originalText = regBtn ? regBtn.innerHTML : "Submit Registration";
    if (regBtn) {
        regBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Registering...`;
        regBtn.disabled = true;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let name = "";
        let phone = "";
        let pin = "";

        if (role === "farmer") {
            name = (document.getElementById("f_name")?.value || "").trim() || "Kisan";
            phone = (document.getElementById("f_phone")?.value || "").trim() || "9876543210";
            pin = (document.getElementById("f_pin")?.value || "").trim() || "382480";
            const farmerId = "AGRI-2026-" + Math.floor(1000 + Math.random() * 9000);

            // 1. Central users doc
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                role: "farmer",
                pinCode: pin,
                status: "active",
                createdAt: serverTimestamp()
            });

            // 2. Specific farmers doc
            await setDoc(doc(db, "farmers", user.uid), {
                userId: user.uid,
                fullName: name,
                full_name: name,
                phone: phone,
                phone_number: phone,
                pinCode: pin,
                pin_code: pin,
                village: "Rampur",
                district: "Gandhinagar",
                state: "Gujarat",
                farmerId: farmerId,
                verificationStatus: "pending",
                role: "farmers",
                createdAt: serverTimestamp()
            });
        } 
        else if (role === "transporter") {
            name = (document.getElementById("t_name")?.value || "").trim() || "Transporter Partner";
            const vehicle = (document.getElementById("t_vehicle")?.value || "").trim().toUpperCase() || "GJ-01-AB-1234";
            pin = (document.getElementById("t_pin")?.value || "").trim() || "382010";

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                role: "transporter",
                pinCode: pin,
                status: "active",
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, "transporters", user.uid), {
                userId: user.uid,
                ownerName: name,
                driver_name: name,
                vehicleNumber: vehicle,
                vehicle_no: vehicle,
                vehicleType: "Truck",
                capacity: "50 Quintals",
                basePinCode: pin,
                operating_pin_code: pin,
                verificationStatus: "verified",
                availability: "available",
                is_available: true,
                vehicles: [
                    { type: "Truck", regNo: vehicle, status: "available" },
                    { type: "Tractor / Trolley", regNo: "GJ-05-CD-5678", status: "available" },
                    { type: "Mini Vehicle", regNo: "GJ-02-EF-9087", status: "available" }
                ],
                role: "transporters",
                createdAt: serverTimestamp()
            });
        } 
        else if (role === "mandi_operator") {
            name = (document.getElementById("o_name")?.value || "").trim() || "Mandi Official";
            const mandiName = (document.getElementById("o_mandi")?.value || "").trim() || "Gandhinagar Central APMC";
            pin = (document.getElementById("o_pin")?.value || "").trim() || "382021";

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                role: "mandi_operator",
                pinCode: pin,
                status: "active",
                createdAt: serverTimestamp()
            });

            const opData = {
                userId: user.uid,
                name: name,
                admin_name: name,
                mandiName: mandiName,
                mandi_name: mandiName,
                mandiId: "MND-" + Math.floor(100 + Math.random() * 900),
                pinCode: pin,
                mandi_pin_code: pin,
                status: "active",
                role: "mandi_operators",
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, "mandiOperators", user.uid), opData);
            await setDoc(doc(db, "mandi_operators", user.uid), opData);
        }

        showToast("Registration successful! Please login with your credentials.");
        toggleAuthView("login");
        document.getElementById("loginEmail").value = email;
        document.getElementById("loginPassword").value = "";

    } catch (error) {
        console.error("Registration error:", error);
        showToast("Registration failed: " + error.message, "error");
    } finally {
        if (regBtn) {
            regBtn.innerHTML = originalText;
            regBtn.disabled = false;
        }
    }
}

/**
 * Handle Secure Login with Database Role Verification
 */
export async function loginUser() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const selectedRoleInput = document.getElementById("loginRole").value;
    const selectedRole = normalizeRole(selectedRoleInput);

    if (!email || !password) {
        showToast("Please enter both Email and Password.", "error");
        return;
    }

    const loginBtn = document.getElementById("loginSubmitBtn") || document.querySelector('button[onclick="loginUser()"]');
    const originalText = loginBtn ? loginBtn.innerHTML : "Secure Login";
    if (loginBtn) {
        loginBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Verifying...`;
        loginBtn.disabled = true;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Verify role directly from Firestore
        let userDoc = await getDoc(doc(db, "users", uid));
        let actualRole = "";

        if (userDoc.exists()) {
            actualRole = normalizeRole(userDoc.data().role);
        } else {
            // Check fallback collections
            const farmerDoc = await getDoc(doc(db, "farmers", uid));
            if (farmerDoc.exists()) actualRole = "farmer";
            else {
                const transDoc = await getDoc(doc(db, "transporters", uid));
                if (transDoc.exists()) actualRole = "transporter";
                else {
                    const mandiDoc = await getDoc(doc(db, "mandi_operators", uid));
                    if (mandiDoc.exists()) actualRole = "mandi_operator";
                }
            }
        }

        if (!actualRole) {
            showToast("Account record not found in system database.", "error");
            await auth.signOut();
            return;
        }

        // Enforce role consistency
        if (selectedRole && actualRole !== selectedRole) {
            showToast(`Role mismatch: Your account is registered as '${actualRole}', but you selected '${selectedRole}'. Redirecting to ${actualRole} portal...`, "error");
            setTimeout(() => {
                window.location.href = getRoleRedirectUrl(actualRole);
            }, 1800);
            return;
        }

        showToast("Login successful! Redirecting...");
        setTimeout(() => {
            window.location.href = getRoleRedirectUrl(actualRole);
        }, 600);

    } catch (error) {
        console.error("Login error:", error);
        showToast("Login failed: " + error.message, "error");
    } finally {
        if (loginBtn) {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    }
}

/**
 * Toggle between Login and Registration views
 */
export function toggleAuthView(view) {
    const loginSection = document.getElementById("login-section");
    const regSection = document.getElementById("register-section");

    if (!loginSection || !regSection) return;

    if (view === "register") {
        loginSection.classList.add("hidden");
        regSection.classList.remove("hidden");
    } else {
        regSection.classList.add("hidden");
        loginSection.classList.remove("hidden");
    }
}

/**
 * Switch dynamic input fields based on selected registration role
 */
export function switchRegFields() {
    const role = document.getElementById("regRole").value;
    const normalized = normalizeRole(role);

    document.querySelectorAll(".dynamic-fields").forEach((el) => {
        el.classList.remove("active");
        el.style.display = "none";
    });

    const targetField = document.getElementById("fields-" + normalized) || document.getElementById("fields-" + role);
    if (targetField) {
        targetField.classList.add("active");
        targetField.style.display = "block";
    }
}

// Attach functions to window for direct HTML event bindings
if (typeof window !== "undefined") {
    window.registerUser = registerUser;
    window.loginUser = loginUser;
    window.toggleAuthView = toggleAuthView;
    window.switchRegFields = switchRegFields;
}
