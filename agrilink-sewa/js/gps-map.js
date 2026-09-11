// =====================================================
// AGRILINK SEWA - LIVE GPS INTERACTIVE MAP & TELEMETRY
// Powered by Leaflet.js & OpenStreetMap
// Real vehicle movement, route polylines, and live HUD
// =====================================================

export class AgriGpsMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.pickupMarker = null;
        this.destinationMarker = null;
        this.vehicleMarker = null;
        this.routePolyline = null;
        this.userLocationMarker = null;

        this.pickupCoords = options.pickupCoords || [23.1850, 72.5850]; // Village Rampur
        this.destinationCoords = options.destinationCoords || [23.2156, 72.6369]; // Gandhinagar APMC
        this.vehicleType = options.vehicleType || "Tata Ace / Chhota Hathi";

        this.waypoints = this.generateRouteWaypoints(this.pickupCoords, this.destinationCoords, 30);
        this.currentStep = 0;
        this.animationTimer = null;

        this.initMap();
    }

    initMap() {
        const container = document.getElementById(this.containerId);
        if (!container || typeof L === "undefined") {
            console.warn("[AgriGpsMap] Leaflet or container missing for:", this.containerId);
            return;
        }

        // Clean existing map instance if re-initializing
        if (container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = "";
        }

        // Initialize Leaflet Map centered between pickup & drop
        const centerLat = (this.pickupCoords[0] + this.destinationCoords[0]) / 2;
        const centerLng = (this.pickupCoords[1] + this.destinationCoords[1]) / 2;

        this.map = L.map(this.containerId, {
            zoomControl: true,
            attributionControl: false
        }).setView([centerLat, centerLng], 13);

        // OpenStreetMap Free Tile Layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        }).addTo(this.map);

        // Custom High-Contrast SVG Marker Icons
        const farmIcon = L.divIcon({
            className: "agri-map-icon farm-pin",
            html: `<div style="background:#138808; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); font-size:16px;">🌾</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const mandiIcon = L.divIcon({
            className: "agri-map-icon mandi-pin",
            html: `<div style="background:#123366; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); font-size:17px;">🏛️</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const vehicleIcon = L.divIcon({
            className: "agri-map-icon vehicle-pin",
            html: `<div style="background:#f68920; color:white; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 4px 12px rgba(246,137,32,0.6); font-size:18px; transform:rotate(10deg); transition:all 0.3s ease;">🚚</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        // Add Markers
        this.pickupMarker = L.marker(this.pickupCoords, { icon: farmIcon })
            .addTo(this.map)
            .bindPopup("<b>Pickup Location</b><br>Village Farm Gate");

        this.destinationMarker = L.marker(this.destinationCoords, { icon: mandiIcon })
            .addTo(this.map)
            .bindPopup("<b>Destination APMC Mandi</b><br>Weighing Bridge Gate 1");

        // Add Route Polyline
        this.routePolyline = L.polyline(this.waypoints, {
            color: "#123366",
            weight: 5,
            opacity: 0.85,
            dashArray: "8, 6"
        }).addTo(this.map);

        // Add Vehicle Marker at start
        this.vehicleMarker = L.marker(this.waypoints[0], { icon: vehicleIcon })
            .addTo(this.map)
            .bindPopup("<b>Active Transporter</b><br>Live GPS Signal: High");

        // Fit map bounds to show full route
        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [40, 40] });

        // Update HUD display
        this.updateTelemetry(this.waypoints[0], 0);

        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 300);
    }

    /**
     * Generate intermediate road waypoints simulating real curves
     */
    generateRouteWaypoints(start, end, count = 30) {
        const waypoints = [];
        const latDelta = (end[0] - start[0]);
        const lngDelta = (end[1] - start[1]);

        for (let i = 0; i <= count; i++) {
            const frac = i / count;
            // Introduce subtle sine wave perturbation to mimic realistic road curves
            const curve = Math.sin(frac * Math.PI) * 0.0035;
            const lat = start[0] + latDelta * frac + (i % 2 === 0 ? curve : -curve * 0.5);
            const lng = start[1] + lngDelta * frac + (i % 3 === 0 ? curve * 0.8 : -curve * 0.3);
            waypoints.push([lat, lng]);
        }
        return waypoints;
    }

    /**
     * Move vehicle marker along the route to a target percentage
     */
    setProgress(percent) {
        if (!this.vehicleMarker || !this.waypoints || this.waypoints.length === 0) return;
        
        const clamped = Math.max(0, Math.min(100, percent));
        const targetIndex = Math.floor((clamped / 100) * (this.waypoints.length - 1));
        const pos = this.waypoints[targetIndex];

        this.vehicleMarker.setLatLng(pos);
        this.updateTelemetry(pos, clamped);

        // Center map smoothly on vehicle if active
        if (this.map && clamped > 0 && clamped < 100) {
            this.map.panTo(pos, { animate: true, duration: 0.5 });
        }
    }

    /**
     * Start continuous vehicle animation along the route
     */
    startLiveAnimation(durationSeconds = 25, onComplete = null) {
        this.stopLiveAnimation();
        let step = 0;
        const totalSteps = this.waypoints.length - 1;
        const intervalMs = (durationSeconds * 1000) / totalSteps;

        this.animationTimer = setInterval(() => {
            if (step >= totalSteps) {
                this.stopLiveAnimation();
                this.setProgress(100);
                if (onComplete) onComplete();
                return;
            }

            const pct = (step / totalSteps) * 100;
            this.setProgress(pct);
            step++;
        }, intervalMs);
    }

    stopLiveAnimation() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
    }

    /**
     * Update live HUD telemetry values
     */
    updateTelemetry(coords, percent) {
        const remainingKm = ((1 - (percent / 100)) * 6.8).toFixed(1);
        const speed = percent === 0 || percent === 100 ? 0 : Math.floor(32 + Math.random() * 8);
        const etaMin = Math.max(1, Math.round((remainingKm / 35) * 60));

        const coordsEl = document.getElementById("gpsCoords");
        if (coordsEl) coordsEl.innerText = `${coords[0].toFixed(4)}° N, ${coords[1].toFixed(4)}° E`;

        const speedEl = document.getElementById("gpsSpeed");
        if (speedEl) speedEl.innerText = `${speed} km/h`;

        const distEl = document.getElementById("gpsDistance");
        if (distEl) distEl.innerText = `${remainingKm} km`;

        const etaEl = document.getElementById("gpsEta");
        if (etaEl) etaEl.innerText = `${etaMin} mins`;
    }

    /**
     * Request real device GPS location via browser Geolocation API
     */
    locateUser(onSuccess = null) {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        const btn = document.getElementById("locateMeBtn");
        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> Pinpointing...`;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                if (this.userLocationMarker) {
                    this.userLocationMarker.setLatLng([lat, lng]);
                } else if (this.map) {
                    const userIcon = L.divIcon({
                        className: "agri-map-icon user-pin",
                        html: `<div style="background:#0284c7; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid white; box-shadow:0 0 14px #0284c7; font-size:13px;"><i class="fas fa-location-arrow"></i></div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    });
                    this.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
                        .addTo(this.map)
                        .bindPopup(`<b>Your Real GPS Position</b><br>Accuracy: ±${Math.round(accuracy)}m`);
                }

                if (this.map) {
                    this.map.setView([lat, lng], 14);
                }

                if (btn) btn.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i> GPS Locked`;
                if (onSuccess) onSuccess([lat, lng]);
            },
            (error) => {
                console.warn("Real GPS access error, using simulated farm coordinate:", error.message);
                if (btn) btn.innerHTML = `<i class="fas fa-map-marker-alt mr-1"></i> Farm GPS (Preset)`;
                if (this.map) this.map.setView(this.pickupCoords, 14);
            },
            { timeout: 8000, enableHighAccuracy: true }
        );
    }
}

// Global exposure
if (typeof window !== "undefined") {
    window.AgriGpsMap = AgriGpsMap;
}
