/**
 * ParkSmart - Find & Reserve Parking Controller (user-find-parking.js)
 *
 * Coordinates the visual 2-step reservation workflow:
 * - Step 1: Parking lot facility cards with live capacity & availability metrics
 * - Step 2: Interactive spatial floor canvas with floor tabs and bay slot selectors
 * - Sticky booking summary with live hourly tariff computation & validation
 * - Reservation submission and confirmation modal
 */

import { requireAuth } from '../auth.js';
import {
  getLots,
  getBays,
  getVehicles,
  createReservation,
  calculateReservationCost,
  TARIFF_RATES
} from '../api.js';
import {
  initLayout,
  renderBadge,
  formatCurrency,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let selectedLot = null;
let currentFloor = 'Floor 1';
let selectedBay = null;
let userVehicles = [];
let allFacilityLots = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'find-parking');

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('booking-success-modal'));
  });

  // Setup Default Dates and Times
  setupDateTimeDefaults();

  // Load Facilities & User Vehicles
  await Promise.all([
    loadParkingFacilities(),
    loadUserVehicles(user.User_ID)
  ]);

  // Time & Date change listeners to dynamically recalculate fee
  const startTimeInput = document.getElementById('start-time');
  const endTimeInput = document.getElementById('end-time');
  const bookingDateInput = document.getElementById('booking-date');

  [startTimeInput, endTimeInput].forEach(input => {
    input.addEventListener('change', updateLiveEstimate);
  });

  // Reservation Form Submit Handler
  const form = document.getElementById('reservation-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleReservationSubmit(user.User_ID);
  });
});

/**
 * Configure default date (today) and times (next hour to +2 hours)
 */
function setupDateTimeDefaults() {
  const dateInput = document.getElementById('booking-date');
  const startTimeInput = document.getElementById('start-time');
  const endTimeInput = document.getElementById('end-time');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (dateInput) {
    dateInput.value = todayStr;
    dateInput.min = todayStr;
  }

  // Next round hour
  let nextHour = now.getHours() + 1;
  let endHour = nextHour + 2;

  if (nextHour >= 24) nextHour = 23;
  if (endHour >= 24) endHour = 23;

  const sH = String(nextHour).padStart(2, '0');
  const eH = String(endHour).padStart(2, '0');

  if (startTimeInput) startTimeInput.value = `${sH}:00`;
  if (endTimeInput) endTimeInput.value = `${eH}:00`;
}

/**
 * Step 1: Fetch and render parking facility cards
 */
async function loadParkingFacilities() {
  const container = document.getElementById('lots-selection-grid');
  if (!container) return;

  // Loading skeleton
  container.innerHTML = `
    <div class="card skeleton" style="height: 190px;"></div>
    <div class="card skeleton" style="height: 190px;"></div>
    <div class="card skeleton" style="height: 190px;"></div>
  `;

  try {
    const res = await getLots();
    if (!res.success) {
      throw new Error(res.message || "Failed to load facilities");
    }
    allFacilityLots = res.data || [];
  } catch (err) {
    console.error("Failed to fetch lots:", err);
    container.innerHTML = `
      <div class="card" style="grid-column: 1/-1; padding: 2rem; text-align: center;">
        <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--status-occupied-text);">
          Could not load parking facilities
        </div>
        <p class="text-sm text-muted" style="margin-bottom: 1rem;">
          ${escapeHtml(err.message || 'Please check server connection and try again.')}
        </p>
        <button type="button" class="btn btn-secondary btn-sm" id="retry-lots-btn">
          <span>Retry</span>
        </button>
      </div>
    `;
    document.getElementById('retry-lots-btn')?.addEventListener('click', loadParkingFacilities);
    return;
  }

  if (allFacilityLots.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1/-1; padding: 2rem; text-align: center;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">No Parking Facilities Available</h3>
        <p class="text-sm text-muted">There are currently no active parking lots in the system.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allFacilityLots.map((lot, idx) => `
    <div class="lot-card ${idx === 0 ? 'selected' : ''}" data-lot-id="${lot.Lot_ID}" id="lot-card-${lot.Lot_ID}">
      <div>
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
          <h3 class="lot-name">${escapeHtml(lot.Lot_Name)}</h3>
          <span class="badge badge-available" style="font-size:0.7rem;">
            ${lot.Available_Bays} Open
          </span>
        </div>
        <p class="lot-location">
          <i data-lucide="map-pin" style="width:13px;height:13px;"></i>
          <span>${escapeHtml(lot.Location)}</span>
        </p>

        <div class="lot-stats-bar">
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-muted);">
            <span>Occupancy Ratio</span>
            <strong>${lot.Occupancy_Percentage}%</strong>
          </div>
          <div class="lot-progress-bar">
            <div class="lot-progress-fill" style="width: ${lot.Occupancy_Percentage}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--color-text-subtle); margin-top: 0.35rem;">
            <span>Hours: ${lot.Open_Time} - ${lot.Close_Time}</span>
            <span>Total: ${lot.Total_Bays} Bays</span>
          </div>
        </div>
      </div>

      <button type="button" class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 0.75rem;">
        <span>Select Facility</span>
      </button>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Attach card click handlers
  container.querySelectorAll('.lot-card').forEach(card => {
    card.addEventListener('click', () => {
      const lotId = Number(card.getAttribute('data-lot-id'));
      selectLot(lotId);
    });
  });

  // Select first lot by default
  if (allFacilityLots.length > 0) {
    selectLot(allFacilityLots[0].Lot_ID);
  }
}

/**
 * Dynamically generate floor tabs based on the bays present in the selected facility
 */
async function updateFloorTabsForLot(lotId) {
  const tabsNav = document.getElementById('floor-tabs-nav');
  if (!tabsNav) return;

  try {
    const res = await getBays(lotId);
    const bays = res.data || [];
    const floorSet = new Set(bays.map(b => b.Floor).filter(Boolean));
    const floors = Array.from(floorSet);

    if (floors.length === 0) {
      floors.push('Floor 1');
    }

    floors.sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });

    if (!floors.includes(currentFloor)) {
      currentFloor = floors[0];
    }

    tabsNav.innerHTML = floors.map(f => `
      <button type="button" class="tab-btn ${f === currentFloor ? 'active' : ''}" data-floor="${escapeHtml(f)}">
        <span>${escapeHtml(f)}</span>
      </button>
    `).join('');

    tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFloor = btn.getAttribute('data-floor');
        if (selectedLot) {
          loadBayGrid(selectedLot.Lot_ID, currentFloor);
        }
      });
    });
  } catch (err) {
    console.error("Failed to load floors for lot:", err);
  }
}

/**
 * Switch selected parking facility
 */
async function selectLot(lotId) {
  selectedLot = allFacilityLots.find(l => l.Lot_ID === lotId);
  if (!selectedLot) return;

  document.querySelectorAll('.lot-card').forEach(c => {
    c.classList.remove('selected');
    if (Number(c.getAttribute('data-lot-id')) === lotId) {
      c.classList.add('selected');
    }
  });

  const titleEl = document.getElementById('grid-facility-title');
  const subEl = document.getElementById('grid-facility-sub');
  if (titleEl) titleEl.textContent = `Visual Bay Grid — ${selectedLot.Lot_Name}`;
  if (subEl) subEl.textContent = `Operating hours: ${selectedLot.Open_Time} to ${selectedLot.Close_Time} • MG Road Corridor`;

  // Deselect previous bay
  selectedBay = null;
  updateSummarySelection();

  // Dynamically update floor tabs and load bay grid
  await updateFloorTabsForLot(lotId);
  loadBayGrid(lotId, currentFloor);
}

/**
 * Step 2: Load and render interactive bay slots for facility & floor
 */
async function loadBayGrid(lotId, floor) {
  const sectorA = document.getElementById('bay-grid-sector-a');
  const sectorB = document.getElementById('bay-grid-sector-b');
  if (!sectorA || !sectorB) return;

  sectorA.innerHTML = '<div class="skeleton" style="height:90px;grid-column:1/-1;"></div>';
  sectorB.innerHTML = '';

  const res = await getBays(lotId, floor);
  const bays = res.data || [];

  if (bays.length === 0) {
    sectorA.innerHTML = '<div style="grid-column: 1/-1; padding: 1.5rem; text-align: center;" class="text-muted">No bays provisioned on this floor level.</div>';
    return;
  }

  // Split bays into Sector A (first half) and Sector B (second half)
  const mid = Math.ceil(bays.length / 2);
  const groupA = bays.slice(0, mid);
  const groupB = bays.slice(mid);

  sectorA.innerHTML = groupA.map(b => renderBaySlotHtml(b)).join('');
  sectorB.innerHTML = groupB.map(b => renderBaySlotHtml(b)).join('');

  if (window.lucide) window.lucide.createIcons();

  // Attach slot click listeners
  const allSlotEls = document.querySelectorAll('.bay-slot');
  allSlotEls.forEach(slotEl => {
    slotEl.addEventListener('click', () => {
      const bayId = Number(slotEl.getAttribute('data-bay-id'));
      const bay = bays.find(b => b.Bay_ID === bayId);

      if (!bay || bay.Status !== 'Available') {
        showToast(`Bay ${bay?.Bay_Number || ''} is currently ${bay?.Status || 'unavailable'}. Please pick an Available space.`, 'error');
        return;
      }

      // Deselect existing
      allSlotEls.forEach(s => s.classList.remove('selected'));
      slotEl.classList.add('selected');
      selectedBay = bay;
      updateSummarySelection();
    });
  });
}

function renderBaySlotHtml(bay) {
  const isAvail = bay.Status === 'Available';
  const isSelected = selectedBay && selectedBay.Bay_ID === bay.Bay_ID;

  let typeIcon = 'car';
  if (bay.Bay_Type === 'EV') typeIcon = 'zap';
  else if (bay.Bay_Type === 'Disabled') typeIcon = 'accessibility';
  else if (bay.Bay_Type === 'Compact') typeIcon = 'minimize-2';

  const statusClass = `status-${bay.Status.toLowerCase()}`;

  return `
    <div class="bay-slot ${statusClass} ${isSelected ? 'selected' : ''}" data-bay-id="${bay.Bay_ID}" title="Bay ${bay.Bay_Number} (${bay.Bay_Type}) - ${bay.Status}">
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
        <span class="bay-slot-number">${escapeHtml(bay.Bay_Number)}</span>
        <i data-lucide="${typeIcon}" style="width:14px;height:14px;"></i>
      </div>

      <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase;">
        ${escapeHtml(bay.Bay_Type)}
      </div>

      <div style="width: 100%; text-align: center;">
        <span style="font-size: 0.65rem; font-weight: 600; padding: 1px 6px; border-radius: var(--radius-full); background: rgba(255,255,255,0.7); display: inline-block;">
          ${escapeHtml(bay.Status)}
        </span>
      </div>
    </div>
  `;
}

/**
 * Load user's vehicles into the target vehicle dropdown
 */
async function loadUserVehicles(userId) {
  const select = document.getElementById('select-vehicle');
  const vehicleError = document.getElementById('vehicle-select-error');
  const submitBtn = document.getElementById('confirm-reservation-btn');
  if (!select) return;

  const res = await getVehicles(userId);
  userVehicles = res.data || [];

  if (userVehicles.length === 0) {
    select.innerHTML = '<option value="">No vehicles registered</option>';
    select.disabled = true;
    if (vehicleError) {
      vehicleError.innerHTML = 'No vehicles found in your fleet. <a href="vehicles.html" style="text-decoration:underline; font-weight:700; color:var(--color-primary); margin-left:4px;">Add a vehicle first &rarr;</a>';
      vehicleError.style.display = 'block';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.title = "Please add a registered vehicle first.";
    }
    return;
  }

  select.disabled = false;
  if (vehicleError) vehicleError.style.display = 'none';

  select.innerHTML = '<option value="">-- Choose registered vehicle --</option>' +
    userVehicles.map(v => `
      <option value="${v.Vehicle_ID}">
        ${escapeHtml(v.Vehicle_Number)} (${escapeHtml(v.Brand)})
      </option>
    `).join('');

  // Select first vehicle automatically
  if (userVehicles.length > 0) {
    select.value = userVehicles[0].Vehicle_ID;
  }
}

/**
 * Update the sticky booking summary panel with current selections
 */
function updateSummarySelection() {
  const bayNumEl = document.getElementById('summary-bay-number');
  const bayBadgeEl = document.getElementById('summary-bay-type-badge');
  const lotNameEl = document.getElementById('summary-lot-name');
  const submitBtn = document.getElementById('confirm-reservation-btn');

  if (!selectedBay) {
    if (bayNumEl) bayNumEl.textContent = 'None selected';
    if (bayBadgeEl) bayBadgeEl.innerHTML = '';
    if (lotNameEl) lotNameEl.textContent = 'Click an available bay on the map';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (bayNumEl) bayNumEl.textContent = `Bay ${selectedBay.Bay_Number}`;
  if (bayBadgeEl) bayBadgeEl.innerHTML = renderBadge(selectedBay.Bay_Type);
  if (lotNameEl) lotNameEl.textContent = `${selectedLot?.Lot_Name || ''} • ${selectedBay.Floor}`;
  if (submitBtn) submitBtn.disabled = false;

  updateLiveEstimate();
}

/**
 * Recalculate live estimated cost
 */
function updateLiveEstimate() {
  const startTime = document.getElementById('start-time')?.value;
  const endTime = document.getElementById('end-time')?.value;
  const costEl = document.getElementById('summary-total-cost');
  const durationTextEl = document.getElementById('summary-duration-text');
  const timeErrorEl = document.getElementById('time-window-error');

  if (timeErrorEl) timeErrorEl.style.display = 'none';

  if (!startTime || !endTime) return;

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);

  if (diffMinutes <= 0) {
    if (timeErrorEl) {
      timeErrorEl.textContent = 'End time must be later than start time.';
      timeErrorEl.style.display = 'flex';
    }
    if (costEl) costEl.textContent = '₹0.00';
    return;
  }

  const hours = Math.max(1, Math.ceil(diffMinutes / 60));
  const bayType = selectedBay ? selectedBay.Bay_Type : 'Regular';
  const total = calculateReservationCost(bayType, startTime, endTime);

  if (costEl) costEl.textContent = formatCurrency(total);
  if (durationTextEl) durationTextEl.textContent = `${hours} Hour${hours > 1 ? 's' : ''} @ ₹${TARIFF_RATES[bayType]}/hr`;
}

/**
 * Handle Reservation Form Submission
 */
async function handleReservationSubmit(userId) {
  const vehicleSelect = document.getElementById('select-vehicle');
  const dateInput = document.getElementById('booking-date');
  const startTimeInput = document.getElementById('start-time');
  const endTimeInput = document.getElementById('end-time');
  const paymentModeSelect = document.getElementById('payment-mode-select');
  const autoPayCheck = document.getElementById('autopay-check');
  const submitBtn = document.getElementById('confirm-reservation-btn');

  const vehicleError = document.getElementById('vehicle-select-error');
  const dateError = document.getElementById('date-select-error');
  const timeError = document.getElementById('time-window-error');

  // Reset errors
  [vehicleError, dateError, timeError].forEach(e => {
    if (e) e.style.display = 'none';
  });

  if (!selectedBay) {
    showToast("Please select an available parking bay from the map.", "error");
    return;
  }

  const vehicleId = Number(vehicleSelect.value);
  if (!vehicleId) {
    if (vehicleError) {
      vehicleError.textContent = 'Please choose a target vehicle from your fleet.';
      vehicleError.style.display = 'flex';
    }
    return;
  }

  const bookingDate = dateInput.value;
  const todayStr = new Date().toISOString().split('T')[0];
  if (!bookingDate || bookingDate < todayStr) {
    if (dateError) {
      dateError.textContent = 'Booking date cannot be in the past.';
      dateError.style.display = 'flex';
    }
    return;
  }

  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  if (!startTime || !endTime || endTime <= startTime) {
    if (timeError) {
      timeError.textContent = 'End time must be later than start time.';
      timeError.style.display = 'flex';
    }
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Securing Space...';

  const payload = {
    Bay_ID: selectedBay.Bay_ID,
    Vehicle_ID: vehicleId,
    Booking_Date: bookingDate,
    Start_Time: startTime,
    End_Time: endTime,
    Payment_Mode: paymentModeSelect.value,
    AutoPay: autoPayCheck.checked
  };

  try {
    const res = await createReservation(payload);

    if (!res.success) {
      showToast(res.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Reservation';
      return;
    }

    // Success! Show confirmation modal
    const { reservation, payment } = res.data;
    const vehicle = userVehicles.find(v => v.Vehicle_ID === vehicleId);

    document.getElementById('modal-success-bay').textContent = `Bay ${selectedBay.Bay_Number}`;
    document.getElementById('modal-success-lot').textContent = `${selectedLot ? selectedLot.Lot_Name : ''} • ${selectedBay.Floor}`;
    document.getElementById('modal-success-vehicle').textContent = vehicle ? `${vehicle.Vehicle_Number} (${vehicle.Brand})` : 'Vehicle Attached';
    document.getElementById('modal-success-schedule').textContent = `${bookingDate}, ${startTime} - ${endTime}`;
    document.getElementById('modal-success-fee').textContent = formatCurrency(payment?.Amount || 0);
    document.getElementById('modal-success-txn').textContent = (payment && payment.Transaction_ID) ? payment.Transaction_ID : 'Pending / N/A';

    openModal('booking-success-modal');
    showToast(res.message, 'success');

    // Refresh bays
    await loadBayGrid(selectedLot.Lot_ID, currentFloor);

  } catch (err) {
    console.error(err);
    showToast('Failed to create reservation.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reservation';
  }
}
