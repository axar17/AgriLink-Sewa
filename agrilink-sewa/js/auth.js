// =====================================================
// AGRILINK SEWA - CENTRALIZED AUTHENTICATION & ROLE GUARDS
// Enforces role-based route protection & profile loading
// =====================================================

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast } from "./common.js";

let cachedUserProfile = null;

/**
 * Get current loaded user profile
 */
export function getCurrentProfile() {
    return cachedUserProfile;
}

/**
 * Maps database roles to their authorized destination dashboards
 */
export function getRoleRedirectUrl(role) {
    switch (role) {
        case "farmer":
        case "farmers":
            return "farmer.html";
        case "transporter":
        case "transporters":
            return "transporter_dashboard.html";
        case "mandi_operator":
        case "mandi_operators":
        case "operator":
            return "mandi_operator.html";
        default:
            return "login.html";
    }
}

/**
 * Standardize role name
 */
export function normalizeRole(role) {
    if (!role) return "";
    const r = role.toLowerCase().trim();
    if (r === "farmers" || r === "farmer") return "farmer";
    if (r === "transporters" || r === "transporter") return "transporter";
    if (r === "mandi_operators" || r === "mandi_operator" || r === "operator") return "mandi_operator";
    return r;
}

/**
 * Protect page and verify that logged-in user possesses the required role
 * @param {string} requiredRole - 'farmer' | 'transporter' | 'mandi_operator'
 * @param {function} onAuthorized - Callback called with user profile when verified
 */
export function protectPage(requiredRole, onAuthorized) {
    const normalizedRequired = normalizeRole(requiredRole);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.warn("[AgriLink Auth] No active session found. Redirecting to login.html...");
            window.location.href = "login.html";
            return;
        }

        try {
            // First check the centralized users collection
            let userDoc = await getDoc(doc(db, "users", user.uid));
            let userData = null;
            let actualRole = "";

            if (userDoc.exists()) {
                userData = userDoc.data();
                actualRole = normalizeRole(userData.role);
            } else {
                // Fallback check in legacy/role-specific collections
                const farmerSnap = await getDoc(doc(db, "farmers", user.uid));
                if (farmerSnap.exists()) {
                    userData = farmerSnap.data();
                    actualRole = "farmer";
                } else {
                    const transSnap = await getDoc(doc(db, "transporters", user.uid));
                    if (transSnap.exists()) {
                        userData = transSnap.data();
                        actualRole = "transporter";
                    } else {
                        const mandiSnap = await getDoc(doc(db, "mandi_operators", user.uid));
                        if (mandiSnap.exists()) {
                            userData = mandiSnap.data();
                            actualRole = "mandi_operator";
                        }
                    }
                }
            }

            if (!userData) {
                alert("Account profile data not found! Please register properly.");
                await signOut(auth);
                window.location.href = "login.html";
                return;
            }

            // Role Verification Guard
            if (actualRole !== normalizedRequired) {
                console.warn(`[AgriLink Auth] Role mismatch: User has '${actualRole}', required '${normalizedRequired}'`);
                alert(`Access Denied: Your account role is '${actualRole}'. Redirecting to your designated portal.`);
                window.location.href = getRoleRedirectUrl(actualRole);
                return;
            }

            // Fetch extra role-specific profile document if needed
            let roleSpecificData = {};
            if (actualRole === "farmer") {
                const fSnap = await getDoc(doc(db, "farmers", user.uid));
                if (fSnap.exists()) roleSpecificData = fSnap.data();
            } else if (actualRole === "transporter") {
                const tSnap = await getDoc(doc(db, "transporters", user.uid));
                if (tSnap.exists()) roleSpecificData = tSnap.data();
            } else if (actualRole === "mandi_operator") {
                const mSnap = await getDoc(doc(db, "mandiOperators", user.uid));
                if (mSnap.exists()) {
                    roleSpecificData = mSnap.data();
                } else {
                    const mSnap2 = await getDoc(doc(db, "mandi_operators", user.uid));
                    if (mSnap2.exists()) roleSpecificData = mSnap2.data();
                }
            }

            cachedUserProfile = {
                uid: user.uid,
                email: user.email,
                role: actualRole,
                name: userData.name || userData.fullName || userData.full_name || userData.ownerName || userData.admin_name || "User",
                phone: userData.phone || userData.phone_number || "",
                pinCode: userData.pinCode || userData.pin_code || userData.mandi_pin_code || "N/A",
                verificationStatus: roleSpecificData.verificationStatus || "pending",
                ...userData,
                ...roleSpecificData
            };

            // Update standard header elements if present
            updateHeaderProfileUI(cachedUserProfile);

            if (typeof onAuthorized === "function") {
                onAuthorized(cachedUserProfile);
            }
        } catch (error) {
            console.error("[AgriLink Auth] Error verifying user role:", error);
            showToast("Failed to verify user profile: " + error.message, "error");
        }
    });
}

/**
 * Populate standard UI header elements across portals
 */
function updateHeaderProfileUI(profile) {
    const nameElem = document.getElementById("userName");
    if (nameElem) nameElem.innerText = profile.name;

    const initialsElem = document.getElementById("userInitials");
    if (initialsElem && profile.name) {
        initialsElem.innerText = profile.name.charAt(0).toUpperCase();
    }

    const pinElem = document.getElementById("userPin");
    if (pinElem) pinElem.innerText = profile.pinCode || profile.pin_code || "N/A";

    const operatorIdElem = document.getElementById("operatorId");
    if (operatorIdElem && profile.role === "transporter") {
        operatorIdElem.innerText = `Transporter ID: ${profile.transporterId || "TRN-" + profile.uid.slice(0, 4).toUpperCase()}`;
    } else if (operatorIdElem && profile.role === "mandi_operator") {
        operatorIdElem.innerText = `Operator ID: ${profile.mandiId || "ADM-" + profile.uid.slice(0, 4).toUpperCase()}`;
    }
}

/**
 * Universal logout handler
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        cachedUserProfile = null;
        window.location.href = "login.html";
    } catch (err) {
        console.error("Logout error:", err);
        window.location.href = "login.html";
    }
}

// Attach globally to window for onclick handlers
if (typeof window !== "undefined") {
    window.logoutUser = logoutUser;
}
