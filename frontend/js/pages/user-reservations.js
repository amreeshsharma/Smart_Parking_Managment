/**
 * ParkSmart - User Reservations Controller (user-reservations.js)
 *
 * Coordinates:
 * - Reservation history and upcoming booking table
 * - Filter tabs (All, Upcoming, Active, Completed, Cancelled) and live text search
 * - Cancellation workflow (frees space in real-time)
 * - Payment settlement modal with mode pickers and TXN ID generation
 */

import { requireAuth } from '../auth.js';
import {
  getReservations,
  cancelReservation,
  payPayment
} from '../api.js';
import {
  initLayout,
  renderBadge,
  formatCurrency,
  formatDate,
  formatTime,
  renderTableLoading,
  renderTableEmpty,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let allReservations = [];
let activeTab = 'All';
let searchQuery = '';
let selectedPaymentMode = 'UPI';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'reservations');

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal('view-res-modal');
      closeModal('pay-modal');
    });
  });

  // Status Tab Listeners
  const tabButtons = document.querySelectorAll('#status-tabs .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-status');
      filterAndRenderTable(user.User_ID);
    });
  });

  // Search Input Listener
  const searchInput = document.getElementById('reservation-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterAndRenderTable(user.User_ID);
    });
  }

  // Payment Mode Picker Options
  const modeOptions = document.querySelectorAll('.payment-mode-option');
  modeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      modeOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedPaymentMode = opt.getAttribute('data-mode');
    });
  });

  // Confirm Payment Button
  const confirmPayBtn = document.getElementById('confirm-pay-now-btn');
  if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', async () => {
      const payId = document.getElementById('pay-payment-id').value;
      if (!payId) return;

      confirmPayBtn.disabled = true;
      document.getElementById('confirm-pay-btn-text').textContent = 'Processing Payment...';

      const res = await payPayment(payId, selectedPaymentMode);
      if (res.success) {
        document.getElementById('pay-success-txn').textContent = res.data.Transaction_ID;
        document.getElementById('pay-success-state').style.display = 'block';
        showToast(res.message, 'success');

        setTimeout(async () => {
          closeModal('pay-modal');
          document.getElementById('pay-success-state').style.display = 'none';
          confirmPayBtn.disabled = false;
          document.getElementById('confirm-pay-btn-text').textContent = 'Pay Now';
          await fetchReservations(user.User_ID);
        }, 1200);
      } else {
        showToast(res.message, 'error');
        confirmPayBtn.disabled = false;
        document.getElementById('confirm-pay-btn-text').textContent = 'Pay Now';
      }
    });
  }

  // Initial Data Fetch
  await fetchReservations(user.User_ID);
});

async function fetchReservations(userId) {
  const tbody = document.getElementById('reservations-tbody');
  renderTableLoading(tbody, 7, 4);

  const res = await getReservations({ userId });
  allReservations = res.data || [];

  updateTabCounts();
  filterAndRenderTable(userId);
}

function updateTabCounts() {
  document.getElementById('count-all').textContent = allReservations.length;
  document.getElementById('count-upcoming').textContent = allReservations.filter(r => r.Status === 'Upcoming').length;
  document.getElementById('count-active').textContent = allReservations.filter(r => r.Status === 'Active').length;
  document.getElementById('count-completed').textContent = allReservations.filter(r => r.Status === 'Completed').length;
  document.getElementById('count-cancelled').textContent = allReservations.filter(r => r.Status === 'Cancelled').length;
}

function filterAndRenderTable(userId) {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;

  let filtered = allReservations;

  if (activeTab !== 'All') {
    filtered = filtered.filter(r => r.Status.toLowerCase() === activeTab.toLowerCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(r =>
      r.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      r.Bay_Number.toLowerCase().includes(searchQuery) ||
      r.Lot_Name.toLowerCase().includes(searchQuery) ||
      String(r.Reservation_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(
      tbody,
      7,
      `No ${activeTab !== 'All' ? activeTab.toLowerCase() : ''} reservations match your criteria.`,
      `<a href="find-parking.html" class="btn btn-primary btn-sm"><i data-lucide="plus"></i><span>Book Parking Now</span></a>`
    );
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const isUpcoming = r.Status === 'Upcoming';
    const isPendingPayment = r.Payment_Status === 'Pending';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color: var(--color-primary);">
          #${r.Reservation_ID}
        </td>
        <td>
          <div style="font-weight: 700;">Bay ${escapeHtml(r.Bay_Number)}</div>
          <div class="text-xs text-muted">${escapeHtml(r.Lot_Name)} &bull; ${escapeHtml(r.Floor)}</div>
        </td>
        <td>
          <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
            ${escapeHtml(r.Vehicle_Number)}
          </span>
          <div class="text-xs text-muted" style="margin-top:2px;">${escapeHtml(r.Vehicle_Brand)}</div>
        </td>
        <td>
          <div style="font-weight:600;">${formatDate(r.Booking_Date)}</div>
          <div class="text-xs text-muted font-mono">${formatTime(r.Start_Time)} - ${formatTime(r.End_Time)}</div>
        </td>
        <td>
          ${renderBadge(r.Status)}
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            ${renderBadge(r.Payment_Status)}
            <span class="text-xs font-mono font-bold" style="color: var(--color-text-main);">
              ${formatCurrency(r.Amount)}
            </span>
          </div>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; justify-content: flex-end; gap: 0.35rem; align-items: center;">
            <button class="btn btn-ghost btn-sm view-btn" data-id="${r.Reservation_ID}">
              <i data-lucide="eye" style="width:14px;height:14px;"></i>
              <span>View</span>
            </button>

            ${isPendingPayment ? `
              <button class="btn btn-primary btn-sm pay-btn" data-id="${r.Reservation_ID}" data-payment-id="${r.Payment_ID}" data-amount="${r.Amount}" data-bay="${r.Bay_Number}">
                <i data-lucide="credit-card" style="width:14px;height:14px;"></i>
                <span>Pay</span>
              </button>
            ` : ''}

            ${isUpcoming ? `
              <button class="btn btn-danger btn-sm cancel-btn" data-id="${r.Reservation_ID}">
                <span>Cancel</span>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Attach View Handlers
  tbody.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const resId = Number(btn.getAttribute('data-id'));
      const r = allReservations.find(item => item.Reservation_ID === resId);
      if (!r) return;
      openViewModal(r);
    });
  });

  // Attach Cancel Handlers
  tbody.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resId = Number(btn.getAttribute('data-id'));
      if (!confirm(`Cancel reservation #${resId} for Bay ${btn.closest('tr').querySelector('td:nth-child(2) div').textContent}?`)) return;

      btn.disabled = true;
      const res = await cancelReservation(resId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchReservations(userId);
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });

  // Attach Pay Handlers
  tbody.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const payId = btn.getAttribute('data-payment-id');
      const amount = btn.getAttribute('data-amount');
      const bay = btn.getAttribute('data-bay');

      document.getElementById('pay-payment-id').value = payId;
      document.getElementById('pay-modal-amount').textContent = formatCurrency(amount);
      document.getElementById('pay-modal-desc').textContent = `Reservation Prepayment for Bay ${bay}`;
      document.getElementById('pay-success-state').style.display = 'none';

      openModal('pay-modal');
    });
  });
}

function openViewModal(r) {
  const body = document.getElementById('view-res-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.25rem;">
      <div>
        <div style="font-size:0.75rem; color:var(--color-text-subtle); text-transform:uppercase; font-weight:600;">Booking Reference</div>
        <div style="font-size:1.5rem; font-weight:800; font-family:var(--font-mono); color:var(--color-primary);">#${r.Reservation_ID}</div>
      </div>
      <div>
        ${renderBadge(r.Status)}
      </div>
    </div>

    <div style="background:var(--color-bg-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:1rem; display:flex; flex-direction:column; gap:0.75rem; font-size:0.875rem;">
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Facility:</span>
        <strong>${escapeHtml(r.Lot_Name)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Bay Space:</span>
        <strong style="color:var(--color-primary);">Bay ${escapeHtml(r.Bay_Number)} (${escapeHtml(r.Floor)})</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Bay Classification:</span>
        <span>${renderBadge(r.Bay_Type)}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Target Vehicle:</span>
        <span class="vehicle-number-plate" style="font-size:0.8rem; padding: 2px 6px;">${escapeHtml(r.Vehicle_Number)}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Booking Schedule:</span>
        <strong>${formatDate(r.Booking_Date)}, ${formatTime(r.Start_Time)} - ${formatTime(r.End_Time)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span class="text-muted">Payment Status:</span>
        <div>${renderBadge(r.Payment_Status)} &bull; <strong>${formatCurrency(r.Amount)}</strong></div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: body });
  openModal('view-res-modal');
}
