// Assign and persist a user ID across page loads
let user_id = localStorage.getItem("user_id");
if (!user_id) {
    user_id = "user-" + Math.floor(Math.random() * 100000);
    localStorage.setItem("user_id", user_id);
}

const DSO_COORDS = [25.1193, 55.3870];
const map = L.map('map').setView(DSO_COORDS, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let lastClickedLat = null;
let lastClickedLon = null;

// Handle map click to report smoke
map.on('click', function (e) {
    lastClickedLat = e.latlng.lat;
    lastClickedLon = e.latlng.lng;
    submitReport();
});


function submitReport () {
    const data = {
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        timestamp: Date.now(),
        user_id: user_id
    };

    fetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(() => {
        updateStatus();
        updateMap();
    });

    alert("Report submitted at: " + e.latlng.lat.toFixed(4) + ", " + e.latlng.lng.toFixed(4));
};


// Update report status
function updateStatus() {
    fetch('/status')
        .then(res => res.json())
        .then(data => {
            document.getElementById('statusBox').innerText =
                `Status: ${data.status} (${data.report_count} reports)`;
        });
}

// Update map markers
function updateMap() {
    fetch('/getReports')
        .then(res => res.json())
        .then(reports => {
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) map.removeLayer(layer);
            });

            reports.forEach(r => {
                const marker = L.marker([r.lat, r.lon]).addTo(map);
                const popupContent = `
                <b>Smoke Report</b><br>
                Confirmations: ${r.confirmations}<br>
                ${r.user_id === user_id ? `<button onclick="deleteReport('${r.id}')">Undo Report</button>` : `<button onclick="confirmReport('${r.id}')">Yes, I see it too</button>`}`;
                marker.bindPopup(popupContent);
            });
        });
}

function confirmReport(reportId) {
    const user_id = "anon-" + Math.floor(Math.random() * 1000);  // Random ID (or device ID)

    fetch('/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, user_id })
    }).then(() => {
        updateStatus();
        updateMap();
    });
}

function deleteReport(reportId) {
    fetch('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, user_id })
    }).then(() => {
        updateStatus();
        updateMap();
    });
}


setInterval(updateStatus, 3000);
setInterval(updateMap, 5000);

window.onload = () => {
    updateStatus();
    updateMap();
};
