/**
 * ParkSmart - User Vehicles Controller (user-vehicles.js)
 *
 * Manages the driver's registered vehicle fleet:
 * - Card grid rendering
 * - Add & Edit vehicle modal workflows
 * - Validation (license plate uniqueness, RFID tag uniqueness, make/model)
 * - Safe deletion with active reservation checks
 */

import { requireAuth } from '../auth.js';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '../api.js';
import {
  initLayout,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let currentVehicles = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'vehicles');

  const addBtn = document.getElementById('add-vehicle-btn');
  const modal = document.getElementById('vehicle-modal');
  const form = document.getElementById('vehicle-form');
  const vehicleIdInput = document.getElementById('vehicle-id-input');
  const modalTitle = document.getElementById('vehicle-modal-title');
  const numInput = document.getElementById('vehicle-number');
  const rfidInput = document.getElementById('rfid-tag');
  const brandInput = document.getElementById('vehicle-brand');
  const numError = document.getElementById('vehicle-number-error');
  const rfidError = document.getElementById('rfid-tag-error');
  const brandError = document.getElementById('vehicle-brand-error');
  const alertEl = document.getElementById('vehicle-modal-alert');
  const saveBtn = document.getElementById('save-vehicle-btn');

  // Load and display vehicles
  await fetchAndRenderVehicles(user.User_ID);

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('vehicle-modal'));
  });

  // Open Add Modal
  addBtn.addEventListener('click', () => {
    form.reset();
    vehicleIdInput.value = '';
    modalTitle.textContent = 'Register New Vehicle';
    saveBtn.textContent = 'Save Vehicle';
    // Generate suggested RFID tag
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    rfidInput.value = `RFID-IND-${randomSuffix}`;
    clearErrors();
    updateColorSelection('#1E3A8A');
    openModal('vehicle-modal');
  });

  // Color selection click visual state
  const colorRadios = document.querySelectorAll('input[name="vehicle-color"]');
  colorRadios.forEach(radio => {
    radio.parentElement.addEventListener('click', () => {
      updateColorSelection(radio.value);
    });
  });

  function updateColorSelection(colorVal) {
    colorRadios.forEach(r => {
      const dot = r.parentElement.querySelector('.vehicle-color-dot');
      if (r.value === colorVal) {
        r.checked = true;
        dot.style.outline = '3px solid var(--color-primary)';
        dot.style.outlineOffset = '2px';
      } else {
        dot.style.outline = 'none';
      }
    });
  }

  function clearErrors() {
    [numInput, rfidInput, brandInput].forEach(el => el.classList.remove('is-invalid'));
    [numError, rfidError, brandError].forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    alertEl.style.display = 'none';
  }

  function validate() {
    clearErrors();
    let valid = true;

    const num = numInput.value.trim();
    if (!num || num.length < 5) {
      numInput.classList.add('is-invalid');
      numError.textContent = 'Please enter a valid vehicle license plate (e.g. MP09 AB 1234).';
      numError.style.display = 'flex';
      valid = false;
    }

    const rfid = rfidInput.value.trim();
    if (!rfid || rfid.length < 5) {
      rfidInput.classList.add('is-invalid');
      rfidError.textContent = 'Please enter a valid RFID Tag ID (e.g. RFID-IND-9011).';
      rfidError.style.display = 'flex';
      valid = false;
    }

    const brand = brandInput.value.trim();
    if (!brand || brand.length < 2) {
      brandInput.classList.add('is-invalid');
      brandError.textContent = 'Please specify the vehicle make & model.';
      brandError.style.display = 'flex';
      valid = false;
    }

    return valid;
  }

  // Form Submit (Create or Update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const selectedColor = document.querySelector('input[name="vehicle-color"]:checked')?.value || '#1E3A8A';
    const isEdit = !!vehicleIdInput.value;

    const payload = {
      Vehicle_Number: numInput.value.trim().toUpperCase(),
      RFID_Tag: rfidInput.value.trim().toUpperCase(),
      Brand: brandInput.value.trim(),
      Color: selectedColor,
      User_ID: user.User_ID
    };

    try {
      const response = isEdit
        ? await updateVehicle(vehicleIdInput.value, payload)
        : await addVehicle(payload);

      if (!response.success) {
        alertEl.textContent = response.message;
        alertEl.style.display = 'block';
        showToast(response.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Update Vehicle' : 'Save Vehicle';
        return;
      }

      showToast(response.message, 'success');
      closeModal('vehicle-modal');
      saveBtn.disabled = false;
      await fetchAndRenderVehicles(user.User_ID);

    } catch (err) {
      console.error(err);
      alertEl.textContent = 'Failed to save vehicle details.';
      alertEl.style.display = 'block';
      saveBtn.disabled = false;
    }
  });
});

async function fetchAndRenderVehicles(userId) {
  const container = document.getElementById('vehicles-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card skeleton skeleton-card"></div>
    <div class="card skeleton skeleton-card"></div>
  `;

  const res = await getVehicles(userId);
  currentVehicles = res.data || [];

  if (currentVehicles.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="empty-state card">
          <div class="empty-state-icon">
            <i data-lucide="car"></i>
          </div>
          <h3 class="empty-state-title">No Registered Vehicles</h3>
          <p class="empty-state-text">
            Add your car or two-wheeler to enable RFID automated barrier entry and fast parking reservations.
          </p>
          <button class="btn btn-primary" id="empty-add-btn">
            <i data-lucide="plus"></i>
            <span>Register First Vehicle</span>
          </button>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ root: container });
    document.getElementById('empty-add-btn')?.addEventListener('click', () => {
      document.getElementById('add-vehicle-btn')?.click();
    });
    return;
  }

  container.innerHTML = currentVehicles.map(v => `
    <div class="vehicle-card" id="vehicle-card-${v.Vehicle_ID}">
      <div>
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.875rem;">
          <span class="vehicle-number-plate">${escapeHtml(v.Vehicle_Number)}</span>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="vehicle-color-dot" style="background-color: ${escapeHtml(v.Color)};" title="Vehicle Color"></span>
          </div>
        </div>

        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 0.35rem;">
          ${escapeHtml(v.Brand)}
        </h3>

        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem;">
          <span class="badge badge-regular" style="font-family: var(--font-mono); font-size: 0.75rem;">
            <i data-lucide="nfc" style="width:12px;height:12px;"></i>
            <span>${escapeHtml(v.RFID_Tag)}</span>
          </span>
          <span class="badge badge-available" style="font-size: 0.7rem;">Active FastPass</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
        <button class="btn btn-ghost btn-sm edit-vehicle-btn" data-id="${v.Vehicle_ID}">
          <i data-lucide="edit-3"></i>
          <span>Edit</span>
        </button>
        <button class="btn btn-danger btn-sm delete-vehicle-btn" data-id="${v.Vehicle_ID}">
          <i data-lucide="trash-2"></i>
          <span>Remove</span>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Attach Edit Handlers
  container.querySelectorAll('.edit-vehicle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const vId = Number(btn.getAttribute('data-id'));
      const vehicle = currentVehicles.find(v => v.Vehicle_ID === vId);
      if (!vehicle) return;

      document.getElementById('vehicle-id-input').value = vehicle.Vehicle_ID;
      document.getElementById('vehicle-modal-title').textContent = 'Edit Vehicle Details';
      document.getElementById('vehicle-number').value = vehicle.Vehicle_Number;
      document.getElementById('rfid-tag').value = vehicle.RFID_Tag;
      document.getElementById('vehicle-brand').value = vehicle.Brand;
      document.getElementById('save-vehicle-btn').textContent = 'Update Vehicle';

      const colorRadios = document.querySelectorAll('input[name="vehicle-color"]');
      colorRadios.forEach(r => {
        const dot = r.parentElement.querySelector('.vehicle-color-dot');
        if (r.value === vehicle.Color) {
          r.checked = true;
          dot.style.outline = '3px solid var(--color-primary)';
          dot.style.outlineOffset = '2px';
        } else {
          dot.style.outline = 'none';
        }
      });

      openModal('vehicle-modal');
    });
  });

  // Attach Delete Handlers
  container.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const vId = Number(btn.getAttribute('data-id'));
      const vehicle = currentVehicles.find(v => v.Vehicle_ID === vId);
      if (!vehicle) return;

      if (!confirm(`Are you sure you want to remove vehicle ${vehicle.Vehicle_Number}?`)) return;

      btn.disabled = true;
      const res = await deleteVehicle(vId);

      if (res.success) {
        showToast(res.message, 'success');
        await fetchAndRenderVehicles(userId);
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });
}
