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

window.onload = () => {
    updateStatus();
    updateMap();
};


let lastClickedLat = null;
let lastClickedLon = null;
// Handle map click to report smoke
map.on('click', function (e) {
    lastClickedLat = e.latlng.lat;
    lastClickedLon = e.latlng.lng;
    submitReport();
});

map.on('moveend', updateStatus);

function submitReport () {
    const data = {
        lat: lastClickedLat,
        lon: lastClickedLon,
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

    alert("Report submitted at: " + lastClickedLat.toFixed(4) + ", " + lastClickedLon.toFixed(4));
};



// Update report status
function updateStatus() {
    fetch('/getReports')
        .then(res => res.json())
        .then(reports => {
            const bounds = map.getBounds();
            const visibleReports = reports.filter(r => 
                bounds.contains([r.lat, r.lon])
            );

            const count = visibleReports.length;

            let status = "Unconfirmed";
            if (count >= 3 && count < 6) status = "Likely Incident";
            else if (count >= 6) status = "Confirmed";

            document.getElementById('statusBox').innerText =
                `Visible Reports: ${count} • Status: ${status}`;
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
                let iconColor = 'gray';
                if (r.confirmations >= 2 && r.confirmations < 6) 
                    iconColor = 'yellow';
                else if (r.confirmations >= 6) 
                    iconColor = 'red';
                
                const customIcon = L.icon({
                    iconUrl: `/static/icons/${iconColor}.png`,
                    iconSize: [32.8, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                    
                });
                
                
                const marker = L.marker([r.lat, r.lon], { icon: customIcon }).addTo(map);

                const popupContent = `
                <b>Smoke Report</b><br>
                Confirmations: ${r.confirmations}<br>
                ${r.user_id === user_id ? `<button onclick="deleteReport('${r.id}')">Undo Report</button>` : `<button onclick="confirmReport('${r.id}')">Yes, I see it too</button>`}`;
                marker.bindPopup(popupContent);
            });
        });
}

function confirmReport(reportId) {
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
