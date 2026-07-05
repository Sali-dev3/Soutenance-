const API_BASE = 'http://127.0.0.1:8000';
let token = null;
let reports = [];
let map;
let markersLayer;

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const sessionPill = document.getElementById('session-pill');
const loginBtn = document.getElementById('login-btn');
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const statsGrid = document.getElementById('stats-grid');
const reportsList = document.getElementById('reports-list');

function initMap() {
  map = L.map('map').setView([12.3714, -1.5197], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const response = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const payload = await response.json();
  if (!response.ok) {
    alert(payload.detail || 'Connexion impossible');
    return;
  }
  token = payload.token;
  sessionPill.textContent = `Connecté • ${username}`;
  loginView.hidden = true;
  dashboardView.hidden = false;
  await loadStats();
  await loadReports();
}

async function loadStats() {
  const response = await fetch(`${API_BASE}/api/stats`);
  const payload = await response.json();
  const stats = payload.stats || {};
  statsGrid.innerHTML = `
    <div class="stat"><span>Total</span><strong>${stats.total || 0}</strong></div>
    <div class="stat"><span>Nouveau</span><strong>${stats.nouveau || 0}</strong></div>
    <div class="stat"><span>En cours</span><strong>${stats.en_cours || 0}</strong></div>
    <div class="stat"><span>Résolu</span><strong>${stats.resolu || 0}</strong></div>
  `;
}

async function loadReports() {
  const search = searchInput.value;
  const status = statusFilter.value;
  const url = new URL(`${API_BASE}/api/reports`);
  if (search) url.searchParams.set('search', search);
  if (status) url.searchParams.set('status', status);
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json();
  reports = payload.reports || [];
  renderReports();
  renderMarkers();
}

function renderReports() {
  if (!reports.length) {
    reportsList.innerHTML = '<div class="item">Aucun signalement pour le moment.</div>';
    return;
  }

  reportsList.innerHTML = reports.map((report) => `
    <div class="item">
      <div class="top">
        <strong>#${report.tracking_number || report.id}</strong>
        <span class="tag ${statusClass(report.status)}">${report.status || 'Nouveau'}</span>
      </div>
      <p>${report.address || 'Adresse non renseignée'}</p>
      <p>${report.description || 'Aucune description'}</p>
      <p><strong>Quartier :</strong> ${report.district || '—'} • <strong>Secteur :</strong> ${report.sector || '—'}</p>
      <div class="top" style="margin-top:8px;">
        <select data-id="${report.id}" class="status-select">
          <option value="Nouveau" ${report.status === 'Nouveau' ? 'selected' : ''}>Nouveau</option>
          <option value="En cours" ${report.status === 'En cours' ? 'selected' : ''}>En cours</option>
          <option value="Résolu" ${report.status === 'Résolu' ? 'selected' : ''}>Résolu</option>
        </select>
        <button data-id="${report.id}" class="update-btn">Mettre à jour</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.update-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const select = document.querySelector(`select[data-id="${id}"]`);
      await updateStatus(id, select.value);
    });
  });
}

function renderMarkers() {
  markersLayer.clearLayers();
  reports.filter((report) => report.latitude && report.longitude).forEach((report) => {
    const marker = L.marker([report.latitude, report.longitude]).addTo(markersLayer);
    marker.bindPopup(`<strong>${report.tracking_number || report.id}</strong><br/>${report.address || ''}<br/>${report.description || ''}`);
  });
  if (reports.length && reports[0].latitude && reports[0].longitude) {
    map.setView([reports[0].latitude, reports[0].longitude], 13);
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API_BASE}/api/reports/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (response.ok) {
    await loadReports();
    await loadStats();
  }
}

function statusClass(status) {
  if (status === 'En cours') return 'en-cours';
  if (status === 'Résolu') return 'resolu';
  return 'nouveau';
}

loginBtn.addEventListener('click', login);
refreshBtn.addEventListener('click', loadReports);
searchInput.addEventListener('input', loadReports);
statusFilter.addEventListener('change', loadReports);

initMap();
