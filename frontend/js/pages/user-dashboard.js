/**
 * ParkSmart - User Dashboard Controller (user-dashboard.js)
 *
 * Coordinates driver telemetry overview:
 * - Route protection (enforces Role='User')
 * - KPI stat computation
 * - Live active session telemetry with 1-second running timer
 * - RFID Gate Pass modal controller
 * - Session exit trigger (simulates vehicle exit)
 * - Upcoming reservations and recent payments feeds
 */

import { requireAuth } from '../auth.js';
import {
  getActiveSessionForUser,
  getReservations,
  getPayments,
  getVehicles,
  markExit,
  cancelReservation
} from '../api.js';
import {
  initLayout,
  renderBadge,
  formatCurrency,
  formatDate,
  formatTime,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Enforce Authentication Guard
  const user = requireAuth('User');
  if (!user) return;

  // 2. Initialize App Layout Shell
  initLayout('user', 'dashboard');

  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${user.Name}`;

  // 3. Load Dashboard Telemetry Data
  await loadDashboardData(user.User_ID);

  // Setup Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('gate-pass-modal'));
  });
});

async function loadDashboardData(userId) {
  try {
    // Parallel fetch of driver resources
    const [vehiclesRes, activeRes, reservationsRes, paymentsRes] = await Promise.all([
      getVehicles(userId),
      getActiveSessionForUser(userId),
      getReservations({ userId }),
      getPayments({ userId })
    ]);

    const vehicles = vehiclesRes.data || [];
    const activeSession = activeRes.data;
    const allReservations = reservationsRes.data || [];
    const payments = paymentsRes.data || [];

    // 1. Update KPI Stat Cards
    const vehiclesCountEl = document.getElementById('stat-vehicles-count');
    const upcomingCountEl = document.getElementById('stat-upcoming-bookings');
    const activeCountEl = document.getElementById('stat-active-sessions');
    const activeSubEl = document.getElementById('stat-active-sub');
    const totalSpentEl = document.getElementById('stat-total-spent');

    if (vehiclesCountEl) vehiclesCountEl.textContent = vehicles.length;

    const upcomingList = allReservations.filter(r => r.Status === 'Upcoming');
    if (upcomingCountEl) upcomingCountEl.textContent = upcomingList.length;

    if (activeCountEl) activeCountEl.textContent = activeSession ? '1' : '0';
    if (activeSubEl) {
      activeSubEl.innerHTML = activeSession
        ? `<span class="pulse-dot"></span><span style="color:var(--status-available-text);font-weight:600;">Bay ${escapeHtml(activeSession.Bay_Number)} Occupied</span>`
        : `<span class="text-muted">No live session active</span>`;
    }

    const totalSpent = payments
      .filter(p => p.Payment_Status === 'Paid')
      .reduce((sum, p) => sum + p.Amount, 0);
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);

    // 2. Render Active Session Telemetry Card
    renderActiveSession(activeSession, userId);

    // 3. Render Upcoming Reservations Table
    renderUpcomingReservations(upcomingList, userId);

    // 4. Render Recent Payments List
    renderRecentPayments(payments.slice(0, 4));

    if (window.lucide) window.lucide.createIcons();

  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showToast("Failed to load telemetry data", "error");
  }
}

/**
 * Render the Active Parking Session Telemetry Card
 */
function renderActiveSession(session, userId) {
  const container = document.getElementById('active-session-container');
  if (!container) return;

  if (timerInterval) clearInterval(timerInterval);

  if (!session) {
    container.innerHTML = `
      <div class="card" style="margin-bottom: 2rem; padding: 2rem; text-align: center; background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);">
        <div style="width: 3.5rem; height: 3.5rem; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
          <i data-lucide="parking-circle" style="width: 2rem; height: 2rem;"></i>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">No Active Parking Session</h3>
        <p class="text-sm text-muted" style="max-width: 26rem; margin: 0 auto 1.25rem;">
          Your vehicles are currently outside facility boundaries. Need to secure a spot before arrival?
        </p>
        <a href="find-parking.html" class="btn btn-primary">
          <i data-lucide="map-pin"></i>
          <span>Find &amp; Reserve Parking Bay</span>
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons({ root: container });
    return;
  }

  // Calculate elapsed time from Entry_Time
  const entryDate = new Date(session.Entry_Time);

  container.innerHTML = `
    <div class="telemetry-card">
      <div class="telemetry-header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="pulse-dot"></span>
          <div>
            <div style="font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
              <span>Live Parking Telemetry</span>
              <span class="telemetry-badge">Occupancy Active</span>
            </div>
            <p style="font-size: 0.8rem; opacity: 0.9; margin-top: 2px;">
              LPR &amp; RFID verified at Inbound Gate #01 &bull; ${escapeHtml(session.Lot_Name)}
            </p>
          </div>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" id="open-gate-pass-btn" style="background:#FFFFFF; color:var(--color-primary); font-weight:700;">
          <i data-lucide="qr-code"></i>
          <span>Gate Pass QR</span>
        </button>
      </div>

      <div class="telemetry-body">
        <div class="telemetry-grid">
          <!-- Col 1: Vehicle -->
          <div class="telemetry-cell">
            <span class="telemetry-cell-label">Vehicle Profile</span>
            <div style="margin: 0.5rem 0;">
              <span class="vehicle-number-plate">${escapeHtml(session.Vehicle_Number)}</span>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-main); margin-top: 0.4rem;">
                ${escapeHtml(session.Vehicle_Brand)}
              </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--color-text-subtle); display: flex; justify-content: space-between;">
              <span>RFID: <strong>${escapeHtml(session.RFID_Tag)}</strong></span>
              <span style="color: var(--status-available-text); font-weight: 600;">● Matched</span>
            </div>
          </div>

          <!-- Col 2: Bay -->
          <div class="telemetry-cell">
            <span class="telemetry-cell-label">Assigned Space</span>
            <div style="margin: 0.5rem 0;">
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); font-family: var(--font-mono);">
                Bay ${escapeHtml(session.Bay_Number)}
              </div>
              <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.2rem;">
                ${escapeHtml(session.Floor)} &bull; ${renderBadge(session.Bay_Type)}
              </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">
              Tariff: <strong>₹${session.Tariff_Rate}/hr</strong>
            </div>
          </div>

          <!-- Col 3: Live Duration & Fare -->
          <div class="telemetry-cell">
            <span class="telemetry-cell-label">Elapsed Session Time</span>
            <div class="telemetry-timer" id="live-session-timer">00h : 00m : 00s</div>
            <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem;">
              Entry: <strong>${formatTime(session.Entry_Time.split('T')[1] || '')}</strong>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border); flex-wrap: wrap;">
          <a href="reservations.html" class="btn btn-secondary btn-sm">
            <i data-lucide="calendar"></i>
            <span>Reservation Details</span>
          </a>
          <button type="button" class="btn btn-danger btn-sm" id="depart-now-btn">
            <i data-lucide="log-out"></i>
            <span>Simulate Gate Exit (Depart)</span>
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  // Live timer tick
  const updateTimer = () => {
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now - entryDate) / 1000));
    const h = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(diffSeconds % 60).padStart(2, '0');
    const timerDisplay = document.getElementById('live-session-timer');
    if (timerDisplay) {
      timerDisplay.textContent = `${h}h : ${m}m : ${s}s`;
    }
  };
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);

  // QR Modal Hook
  const openQrBtn = document.getElementById('open-gate-pass-btn');
  if (openQrBtn) {
    openQrBtn.addEventListener('click', () => {
      const plateEl = document.getElementById('modal-qr-plate');
      const rfidEl = document.getElementById('modal-qr-rfid');
      if (plateEl) plateEl.textContent = session.Vehicle_Number;
      if (rfidEl) rfidEl.textContent = session.RFID_Tag;
      openModal('gate-pass-modal');
    });
  }

  // Depart / Mark Exit Hook
  const departBtn = document.getElementById('depart-now-btn');
  if (departBtn) {
    departBtn.addEventListener('click', async () => {
      if (!confirm("Confirm vehicle exit from parking facility? Barrier will register departure.")) return;

      departBtn.disabled = true;
      departBtn.textContent = 'Processing Exit...';

      const res = await markExit(session.Session_ID);
      if (res.success) {
        showToast(res.message, res.data.Penalty_Amount > 0 ? 'error' : 'success');
        await loadDashboardData(userId);
      } else {
        showToast(res.message, 'error');
        departBtn.disabled = false;
        departBtn.textContent = 'Simulate Gate Exit';
      }
    });
  }
}

/**
 * Render Upcoming Reservations Table
 */
function renderUpcomingReservations(reservations, userId) {
  const tbody = document.getElementById('upcoming-reservations-tbody');
  if (!tbody) return;

  if (reservations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem;" class="text-muted">
          No scheduled upcoming bookings. <a href="find-parking.html" class="text-primary font-semibold">Book a bay now &rarr;</a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reservations.slice(0, 5).map(r => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--color-text-main);">Bay ${escapeHtml(r.Bay_Number)}</div>
        <div class="text-xs text-muted">${escapeHtml(r.Lot_Name)} &bull; ${escapeHtml(r.Floor)}</div>
      </td>
      <td>
        <span class="vehicle-number-plate" style="font-size:0.8rem; padding: 2px 6px;">${escapeHtml(r.Vehicle_Number)}</span>
      </td>
      <td>
        <div style="font-weight: 600;">${formatDate(r.Booking_Date)}</div>
        <div class="text-xs text-muted">${formatTime(r.Start_Time)} - ${formatTime(r.End_Time)}</div>
      </td>
      <td>
        ${renderBadge(r.Status)}
      </td>
      <td>
        <button class="btn btn-ghost btn-sm cancel-res-btn" data-id="${r.Reservation_ID}" title="Cancel booking">
          Cancel
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.cancel-res-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm("Are you sure you want to cancel this reservation?")) return;
      btn.disabled = true;
      const res = await cancelReservation(id);
      if (res.success) {
        showToast("Reservation cancelled successfully.", "success");
        await loadDashboardData(userId);
      } else {
        showToast(res.message, "error");
        btn.disabled = false;
      }
    });
  });
}

/**
 * Render Recent Payments List
 */
function renderRecentPayments(payments) {
  const container = document.getElementById('recent-payments-list');
  if (!container) return;

  if (payments.length === 0) {
    container.innerHTML = `<div class="text-sm text-muted" style="padding: 1rem 0;">No payment history recorded.</div>`;
    return;
  }

  container.innerHTML = payments.map(p => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--color-border);">
      <div>
        <div style="font-weight: 700; color: var(--color-text-main); font-size: 0.9rem;">
          ${escapeHtml(p.Payment_Type)}
        </div>
        <div class="text-xs text-muted" style="margin-top: 2px;">
          ${escapeHtml(p.Transaction_ID)} &bull; ${escapeHtml(p.Payment_Mode)}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.95rem; color: ${p.Payment_Type === 'Penalty' ? 'var(--status-occupied)' : 'var(--color-text-main)'};">
          ${formatCurrency(p.Amount)}
        </div>
        <div style="margin-top: 2px;">
          ${renderBadge(p.Payment_Status)}
        </div>
      </div>
    </div>
  `).join('');
}
