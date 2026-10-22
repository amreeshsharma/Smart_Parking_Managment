/**
 * ParkSmart - Admin Lots Controller (admin-lots.js)
 *
 * Coordinates:
 * - Municipal parking facility management
 * - Add & edit modal workflows
 * - Validation (Open_Time < Close_Time, Total_Bays positive)
 * - Safe facility deletion with active reservation checks
 */

import { requireAuth } from '../auth.js';
import { getLots, addLot, updateLot, deleteLot } from '../api.js';
import {
  initLayout,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let allLots = [];
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'lots');

  const addBtn = document.getElementById('add-lot-btn');
  const searchInput = document.getElementById('lot-search');
  const form = document.getElementById('lot-form');
  const lotIdInput = document.getElementById('lot-id-input');
  const modalTitle = document.getElementById('lot-modal-title');
  const nameInput = document.getElementById('lot-name-input');
  const locInput = document.getElementById('lot-location-input');
  const floorsInput = document.getElementById('lot-floors-input');
  const baysPerFloorInput = document.getElementById('lot-bays-per-floor-input');
  const layoutFields = document.getElementById('lot-layout-fields');
  const baysInput = document.getElementById('lot-bays-input');
  const openInput = document.getElementById('lot-open-input');
  const closeInput = document.getElementById('lot-close-input');
  const nameError = document.getElementById('lot-name-error');
  const locError = document.getElementById('lot-location-error');
  const baysError = document.getElementById('lot-bays-error');
  const hoursError = document.getElementById('lot-hours-error');
  const alertEl = document.getElementById('lot-modal-alert');
  const submitBtn = document.getElementById('lot-submit-btn');

  // Auto calculate total bays from floors * bays per floor
  const autoCalcBays = () => {
    if (floorsInput && baysPerFloorInput && baysInput) {
      const f = Math.max(1, Number(floorsInput.value) || 1);
      const b = Math.max(1, Number(baysPerFloorInput.value) || 24);
      baysInput.value = f * b;
    }
  };
  if (floorsInput) floorsInput.addEventListener('input', autoCalcBays);
  if (baysPerFloorInput) baysPerFloorInput.addEventListener('input', autoCalcBays);

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('lot-modal'));
  });

  // Open Add Modal
  addBtn.addEventListener('click', () => {
    form.reset();
    lotIdInput.value = '';
    modalTitle.textContent = 'Add Municipal Parking Facility';
    submitBtn.textContent = 'Create Facility';
    if (layoutFields) layoutFields.style.display = 'grid';
    if (floorsInput) floorsInput.value = '1';
    if (baysPerFloorInput) baysPerFloorInput.value = '24';
    if (baysInput) baysInput.value = '24';
    baysInput.parentElement.style.display = 'block';
    clearErrors();
    openModal('lot-modal');
  });

  // Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterAndRenderTable();
    });
  }

  function clearErrors() {
    [nameInput, locInput, baysInput, openInput, closeInput].forEach(el => el.classList.remove('is-invalid'));
    [nameError, locError, baysError, hoursError].forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    alertEl.style.display = 'none';
  }

  function validate() {
    clearErrors();
    let valid = true;

    const name = nameInput.value.trim();
    if (!name || name.length < 3) {
      nameInput.classList.add('is-invalid');
      nameError.textContent = 'Facility name must contain at least 3 characters.';
      nameError.style.display = 'flex';
      valid = false;
    }

    const loc = locInput.value.trim();
    if (!loc || loc.length < 4) {
      locInput.classList.add('is-invalid');
      locError.textContent = 'Please provide a valid location address.';
      locError.style.display = 'flex';
      valid = false;
    }

    const bays = Number(baysInput.value);
    if (!lotIdInput.value && (!bays || bays < 1)) {
      baysInput.classList.add('is-invalid');
      baysError.textContent = 'Total bays must be a positive integer.';
      baysError.style.display = 'flex';
      valid = false;
    }

    const openTime = openInput.value;
    const closeTime = closeInput.value;
    if (openTime && closeTime && openTime >= closeTime && closeTime !== '23:59') {
      hoursError.textContent = 'Open time must be earlier than close time.';
      hoursError.style.display = 'flex';
      valid = false;
    }

    return valid;
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const isEdit = !!lotIdInput.value;
    const payload = {
      Lot_Name: nameInput.value.trim(),
      Location: locInput.value.trim(),
      Total_Bays: Number(baysInput.value) || 24,
      Open_Time: openInput.value,
      Close_Time: closeInput.value
    };

    if (!isEdit && floorsInput && baysPerFloorInput) {
      payload.Floors = Number(floorsInput.value) || 1;
      payload.Bays_Per_Floor = Number(baysPerFloorInput.value) || 24;
      payload.Total_Bays = Number(baysInput.value) || (payload.Floors * payload.Bays_Per_Floor);
    }

    try {
      const res = isEdit
        ? await updateLot(lotIdInput.value, payload)
        : await addLot(payload);

      if (!res.success) {
        alertEl.textContent = res.message;
        alertEl.style.display = 'block';
        showToast(res.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Update Facility' : 'Save Facility';
        return;
      }

      showToast(res.message, 'success');
      closeModal('lot-modal');
      submitBtn.disabled = false;
      await fetchLots();

    } catch (err) {
      console.error(err);
      alertEl.textContent = 'Failed to save facility details.';
      alertEl.style.display = 'block';
      submitBtn.disabled = false;
    }
  });

  await fetchLots();
});

async function fetchLots() {
  const tbody = document.getElementById('lots-tbody');
  renderTableLoading(tbody, 7, 3);

  const res = await getLots();
  allLots = res.data || [];

  const countInfo = document.getElementById('lot-count-info');
  if (countInfo) countInfo.textContent = `${allLots.length} Facilities Active`;

  filterAndRenderTable();
}

function filterAndRenderTable() {
  const tbody = document.getElementById('lots-tbody');
  if (!tbody) return;

  let filtered = allLots;
  if (searchQuery) {
    filtered = filtered.filter(l =>
      l.Lot_Name.toLowerCase().includes(searchQuery) ||
      l.Location.toLowerCase().includes(searchQuery) ||
      String(l.Lot_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 7, "No parking facilities found matching your search.");
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td class="font-mono font-semibold" style="color:var(--color-primary);">
        #${l.Lot_ID}
      </td>
      <td>
        <div style="font-weight:700; color:var(--color-text-main);">${escapeHtml(l.Lot_Name)}</div>
        <div class="text-xs text-muted">ID: FAC-0${l.Lot_ID}</div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:0.35rem; color:var(--color-text-muted);">
          <i data-lucide="map-pin" style="width:14px;height:14px;color:var(--color-text-subtle);"></i>
          <span>${escapeHtml(l.Location)}</span>
        </div>
      </td>
      <td>
        <span class="font-mono font-bold" style="font-size:0.95rem;">${l.Total_Bays}</span>
        <span class="text-xs text-muted">Bays</span>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <div class="lot-progress-bar" style="width:70px;">
            <div class="lot-progress-fill" style="width:${l.Occupancy_Percentage}%;"></div>
          </div>
          <span class="text-xs font-mono font-semibold">${l.Occupancy_Percentage}%</span>
        </div>
        <div class="text-xs text-muted" style="margin-top:2px;">
          <strong style="color:var(--status-available-text);">${l.Available_Bays} Free</strong> &bull; ${l.Occupied_Bays} Occupied
        </div>
      </td>
      <td>
        <span class="badge badge-regular" style="font-size:0.75rem;">
          <i data-lucide="clock" style="width:12px;height:12px;"></i>
          <span>${l.Open_Time} - ${l.Close_Time}</span>
        </span>
      </td>
      <td style="text-align: right;">
        <div style="display:flex; justify-content:flex-end; gap:0.35rem;">
          <button class="btn btn-ghost btn-sm edit-lot-btn" data-id="${l.Lot_ID}">
            <i data-lucide="edit-3"></i>
            <span>Edit</span>
          </button>
          <button class="btn btn-danger btn-sm delete-lot-btn" data-id="${l.Lot_ID}">
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Attach Edit Listeners
  tbody.querySelectorAll('.edit-lot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lotId = Number(btn.getAttribute('data-id'));
      const lot = allLots.find(l => l.Lot_ID === lotId);
      if (!lot) return;

      document.getElementById('lot-id-input').value = lot.Lot_ID;
      document.getElementById('lot-modal-title').textContent = 'Edit Parking Facility';
      document.getElementById('lot-name-input').value = lot.Lot_Name;
      document.getElementById('lot-location-input').value = lot.Location;
      document.getElementById('lot-bays-input').value = lot.Total_Bays;
      document.getElementById('lot-bays-input').parentElement.style.display = 'none'; // cannot alter bay capacity directly from edit
      if (layoutFields) layoutFields.style.display = 'none';
      document.getElementById('lot-open-input').value = lot.Open_Time;
      document.getElementById('lot-close-input').value = lot.Close_Time;
      document.getElementById('lot-submit-btn').textContent = 'Update Facility';

      openModal('lot-modal');
    });
  });

  // Attach Delete Listeners
  tbody.querySelectorAll('.delete-lot-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lotId = Number(btn.getAttribute('data-id'));
      const lot = allLots.find(l => l.Lot_ID === lotId);
      if (!lot) return;

      if (!confirm(`Are you sure you want to delete "${lot.Lot_Name}" and its provisioned bays?`)) return;

      btn.disabled = true;
      const res = await deleteLot(lotId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchLots();
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });
}
