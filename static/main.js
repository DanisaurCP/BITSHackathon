// Assign and persist a user ID across page loads
let user_id = localStorage.getItem("user_id");
if (!user_id) {
    user_id = "user-" + Math.floor(Math.random() * 100000);
    localStorage.setItem("user_id", user_id);
}

navigator.geolocation.getCurrentPosition((position) => {
    localStorage.setItem('user_lat', position.coords.latitude);
    localStorage.setItem('user_lon', position.coords.longitude);
});

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
    const form = `
        <b>New Report</b><br>
        <input id="reportTitle" placeholder="Title" /><br>
        <textarea id="reportDesc" placeholder="Description"></textarea><br>
        <button onclick="submitReport(${e.latlng.lat}, ${e.latlng.lng})">Submit</button>
    `;

    L.popup()
        .setLatLng(e.latlng)
        .setContent(form)
        .openOn(map);

});

map.on('moveend', updateStatus);

function submitReport(lat, lon) {
    const title = document.getElementById("reportTitle").value;
    const desc = document.getElementById("reportDesc").value;

    const data = {
        lat,
        lon,
        title,
        description: desc,
        timestamp: Date.now(),
        user_id: user_id
    };

    fetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(() => {
        map.closePopup();
        updateStatus();
        updateMap();
    });
}

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

            document.getElementById('statusBox').innerText =
                `Visible Reports: ${count}`;
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
                let level = "Unconfirmed";
                if (r.confirmations >= 2 && r.confirmations < 6) 
                    level = "Likely Incident";
                else if (r.confirmations >= 6)
                    level = "Confirmed";

                const popupContent = `
                    <b>${r.title || "Smoke Report"}</b><br>
                    ${r.description ? r.description + '<br>' : ''}
                    <i>Status: ${level}</i><br>
                    Confirmations: ${r.confirmations}<br> 
                    ${r.user_id === user_id
                    ? `<button onclick="deleteReport('${r.id}')">Undo Report</button>`: `<button onclick="confirmReport('${r.id}')">Yes, I see it too</button>`}
                `;
                marker.bindPopup(popupContent);

                const myLat = parseFloat(localStorage.getItem('user_lat'));
                const myLon = parseFloat(localStorage.getItem('user_lon'));

                reports.forEach(r => {
                    const dist = getDistance(myLat, myLon, r.lat, r.lon); // in km
                    if (r.confirmations >= 2 && dist < 2 && !r.notified) {
                        alert("⚠️ Alert: A likely incident has been reported near your location.");
                        r.notified = true;
                    }
                });

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

function getDistance(lat1, lon1, lat2, lon2) {
    const toRad = x => x * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}



setInterval(updateStatus, 3000);
setInterval(updateMap, 5000);

window.onload = () => {
    updateStatus();
    updateMap();
};
