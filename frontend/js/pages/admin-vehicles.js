/**
 * ParkSmart - Admin Vehicles Controller (admin-vehicles.js)
 *
 * Coordinates:
 * - Master vehicle fleet & RFID tag registry
 * - Search query filtering (plate, RFID tag, driver, make/model)
 * - Safe vehicle removal with reservation checks
 * - Pagination controls
 */

import { requireAuth } from '../auth.js';
import { getVehicles, getUsers, deleteVehicle } from '../api.js';
import {
  initLayout,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  showToast,
  escapeHtml
} from '../ui.js';

let allFleet = [];
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'vehicles');

  const searchInput = document.getElementById('admin-vehicle-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  await fetchFleet();
});

async function fetchFleet() {
  const tbody = document.getElementById('admin-vehicles-tbody');
  renderTableLoading(tbody, 7, 5);

  const [vehiclesRes, usersRes] = await Promise.all([
    getVehicles(),
    getUsers()
  ]);

  const vehicles = vehiclesRes.data || [];
  const users = usersRes.data || [];

  allFleet = vehicles.map(v => {
    const owner = users.find(u => u.User_ID === v.User_ID);
    return {
      ...v,
      Owner_Name: owner ? owner.Name : 'N/A',
      Owner_Email: owner ? owner.Email : 'N/A'
    };
  });

  const countInfo = document.getElementById('fleet-count-info');
  if (countInfo) countInfo.textContent = `${allFleet.length} Total Vehicles Registered`;

  filterAndRenderTable();
}

function filterAndRenderTable() {
  const tbody = document.getElementById('admin-vehicles-tbody');
  const paginationContainer = document.getElementById('admin-vehicles-pagination');
  if (!tbody) return;

  let filtered = allFleet;

  if (searchQuery) {
    filtered = filtered.filter(v =>
      v.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      v.RFID_Tag.toLowerCase().includes(searchQuery) ||
      v.Brand.toLowerCase().includes(searchQuery) ||
      v.Owner_Name.toLowerCase().includes(searchQuery) ||
      String(v.Vehicle_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 7, "No vehicles found matching search criteria.");
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(v => `
    <tr>
      <td class="font-mono font-semibold" style="color:var(--color-primary);">
        #${v.Vehicle_ID}
      </td>
      <td>
        <span class="vehicle-number-plate" style="font-size:0.85rem; padding: 2px 7px;">
          ${escapeHtml(v.Vehicle_Number)}
        </span>
      </td>
      <td>
        <span class="badge badge-regular" style="font-family:var(--font-mono); font-size:0.75rem;">
          <i data-lucide="nfc" style="width:12px;height:12px;"></i>
          <span>${escapeHtml(v.RFID_Tag)}</span>
        </span>
      </td>
      <td>
        <div style="font-weight:700; color:var(--color-text-main);">${escapeHtml(v.Brand)}</div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="vehicle-color-dot" style="background-color:${escapeHtml(v.Color)};" title="${escapeHtml(v.Color)}"></span>
          <span class="text-xs font-mono text-muted">${escapeHtml(v.Color)}</span>
        </div>
      </td>
      <td>
        <div style="font-weight:600;">${escapeHtml(v.Owner_Name)}</div>
        <div class="text-xs text-muted">${escapeHtml(v.Owner_Email)}</div>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-danger btn-sm admin-delete-vehicle-btn" data-id="${v.Vehicle_ID}">
          <i data-lucide="trash-2"></i>
          <span>Delete</span>
        </button>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  tbody.querySelectorAll('.admin-delete-vehicle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const vId = Number(btn.getAttribute('data-id'));
      const vehicle = allFleet.find(v => v.Vehicle_ID === vId);
      if (!vehicle) return;

      if (!confirm(`Delete vehicle ${vehicle.Vehicle_Number} from registry?`)) return;

      btn.disabled = true;
      const res = await deleteVehicle(vId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchFleet();
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });

  renderPagination(paginationContainer, currentPage, totalPages, (newPage) => {
    currentPage = newPage;
    filterAndRenderTable();
  });
}
