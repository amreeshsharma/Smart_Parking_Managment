/**
 * ParkSmart - Admin Bays Controller (admin-bays.js)
 *
 * Coordinates:
 * - Multi-criteria bay filtering (Lot, Floor, Type, Status)
 * - Add & edit modal workflows
 * - Validation (unique Bay_Number per lot)
 * - Pagination controls and safe deletion
 */

import { requireAuth } from '../auth.js';
import { getLots, getAdminBays, addBay, updateBay, deleteBay, TARIFF_RATES } from '../api.js';
import {
  initLayout,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let allLots = [];
let allBays = [];
let filterLot = 'All';
let filterFloor = 'All';
let filterType = 'All';
let filterStatus = 'All';
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'bays');

  const addBtn = document.getElementById('add-bay-btn');
  const form = document.getElementById('bay-form');
  const bayIdInput = document.getElementById('bay-id-input');
  const modalTitle = document.getElementById('bay-modal-title');
  const lotInput = document.getElementById('bay-lot-input');
  const numInput = document.getElementById('bay-number-input');
  const floorInput = document.getElementById('bay-floor-input');
  const typeInput = document.getElementById('bay-type-input');
  const statusInput = document.getElementById('bay-status-input');
  const numError = document.getElementById('bay-number-error');
  const alertEl = document.getElementById('bay-modal-alert');
  const submitBtn = document.getElementById('bay-submit-btn');

  // Filter Dropdowns
  const lotFilterSelect = document.getElementById('filter-lot-select');
  const floorFilterSelect = document.getElementById('filter-floor-select');
  const typeFilterSelect = document.getElementById('filter-type-select');
  const statusFilterSelect = document.getElementById('filter-status-select');

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('bay-modal'));
  });

  // Load Lots & Populate selects
  const lotsRes = await getLots();
  allLots = lotsRes.data || [];

  lotFilterSelect.innerHTML = '<option value="All">All Facilities</option>' +
    allLots.map(l => `<option value="${l.Lot_ID}">${escapeHtml(l.Lot_Name)}</option>`).join('');

  lotInput.innerHTML = allLots.map(l => `<option value="${l.Lot_ID}">${escapeHtml(l.Lot_Name)}</option>`).join('');

  // Filter Change Handlers
  lotFilterSelect.addEventListener('change', (e) => {
    filterLot = e.target.value;
    currentPage = 1;
    filterAndRenderTable();
  });
  floorFilterSelect.addEventListener('change', (e) => {
    filterFloor = e.target.value;
    currentPage = 1;
    filterAndRenderTable();
  });
  typeFilterSelect.addEventListener('change', (e) => {
    filterType = e.target.value;
    currentPage = 1;
    filterAndRenderTable();
  });
  statusFilterSelect.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    currentPage = 1;
    filterAndRenderTable();
  });

  // Open Add Bay Modal
  addBtn.addEventListener('click', () => {
    form.reset();
    bayIdInput.value = '';
    modalTitle.textContent = 'Add Parking Bay';
    submitBtn.textContent = 'Save Bay';
    clearErrors();
    openModal('bay-modal');
  });

  function clearErrors() {
    numInput.classList.remove('is-invalid');
    numError.style.display = 'none';
    alertEl.style.display = 'none';
  }

  function validate() {
    clearErrors();
    const num = numInput.value.trim();
    if (!num || num.length < 2) {
      numInput.classList.add('is-invalid');
      numError.textContent = 'Bay number must be specified (e.g. B-109).';
      numError.style.display = 'flex';
      return false;
    }
    return true;
  }

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const isEdit = !!bayIdInput.value;
    const payload = {
      Lot_ID: Number(lotInput.value),
      Bay_Number: numInput.value.trim().toUpperCase(),
      Floor: floorInput.value,
      Bay_Type: typeInput.value,
      Status: statusInput.value
    };

    try {
      const res = isEdit
        ? await updateBay(bayIdInput.value, payload)
        : await addBay(payload);

      if (!res.success) {
        alertEl.textContent = res.message;
        alertEl.style.display = 'block';
        showToast(res.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Update Bay' : 'Save Bay';
        return;
      }

      showToast(res.message, 'success');
      closeModal('bay-modal');
      submitBtn.disabled = false;
      await fetchAllBays();

    } catch (err) {
      console.error(err);
      alertEl.textContent = 'Failed to save bay.';
      alertEl.style.display = 'block';
      submitBtn.disabled = false;
    }
  });

  await fetchAllBays();
});

async function fetchAllBays() {
  const tbody = document.getElementById('bays-tbody');
  renderTableLoading(tbody, 8, 5);

  try {
    const res = await getAdminBays();
    allBays = res.data || [];
  } catch (err) {
    console.error("Failed to fetch bays:", err);
    allBays = [];
  }

  filterAndRenderTable();
}

function filterAndRenderTable() {
  const tbody = document.getElementById('bays-tbody');
  const paginationContainer = document.getElementById('bays-pagination');
  if (!tbody) return;

  let filtered = allBays;

  if (filterLot !== 'All') {
    filtered = filtered.filter(b => b.Lot_ID === Number(filterLot));
  }
  if (filterFloor !== 'All') {
    filtered = filtered.filter(b => b.Floor.toLowerCase() === filterFloor.toLowerCase());
  }
  if (filterType !== 'All') {
    filtered = filtered.filter(b => b.Bay_Type.toLowerCase() === filterType.toLowerCase());
  }
  if (filterStatus !== 'All') {
    filtered = filtered.filter(b => b.Status.toLowerCase() === filterStatus.toLowerCase());
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, "No parking bays found matching the filter options.");
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(b => `
    <tr>
      <td class="font-mono font-semibold" style="color:var(--color-primary);">
        #${b.Bay_ID}
      </td>
      <td>
        <span style="font-weight:800; font-family:var(--font-mono); font-size:1rem; color:var(--color-text-main);">
          ${escapeHtml(b.Bay_Number)}
        </span>
      </td>
      <td>
        <div style="font-weight:600;">${escapeHtml(b.Lot_Name)}</div>
        <div class="text-xs text-muted">ID: FAC-0${b.Lot_ID}</div>
      </td>
      <td>
        <span class="badge badge-regular" style="font-size:0.75rem;">
          ${escapeHtml(b.Floor)}
        </span>
      </td>
      <td>
        ${renderBadge(b.Bay_Type)}
      </td>
      <td>
        <span class="text-xs font-mono font-bold">
          ₹${TARIFF_RATES[b.Bay_Type] || 40} / hr
        </span>
      </td>
      <td>
        ${renderBadge(b.Status)}
      </td>
      <td style="text-align: right;">
        <div style="display:flex; justify-content:flex-end; gap:0.35rem;">
          <button class="btn btn-ghost btn-sm edit-bay-btn" data-id="${b.Bay_ID}">
            <i data-lucide="edit-3"></i>
            <span>Edit</span>
          </button>
          <button class="btn btn-danger btn-sm delete-bay-btn" data-id="${b.Bay_ID}">
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Attach Edit Listeners
  tbody.querySelectorAll('.edit-bay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bId = Number(btn.getAttribute('data-id'));
      const bay = allBays.find(b => b.Bay_ID === bId);
      if (!bay) return;

      document.getElementById('bay-id-input').value = bay.Bay_ID;
      document.getElementById('bay-modal-title').textContent = 'Edit Parking Bay';
      document.getElementById('bay-lot-input').value = bay.Lot_ID;
      document.getElementById('bay-number-input').value = bay.Bay_Number;
      document.getElementById('bay-floor-input').value = bay.Floor;
      document.getElementById('bay-type-input').value = bay.Bay_Type;
      document.getElementById('bay-status-input').value = bay.Status;
      document.getElementById('bay-submit-btn').textContent = 'Update Bay';

      openModal('bay-modal');
    });
  });

  // Attach Delete Listeners
  tbody.querySelectorAll('.delete-bay-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bId = Number(btn.getAttribute('data-id'));
      const bay = allBays.find(b => b.Bay_ID === bId);
      if (!bay) return;

      if (!confirm(`Are you sure you want to delete Bay ${bay.Bay_Number}?`)) return;

      btn.disabled = true;
      const res = await deleteBay(bId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchAllBays();
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });

  // Pagination
  renderPagination(paginationContainer, currentPage, totalPages, (newPage) => {
    currentPage = newPage;
    filterAndRenderTable();
  });
}
