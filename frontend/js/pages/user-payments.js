/**
 * ParkSmart - User Payments Controller (user-payments.js)
 *
 * Coordinates:
 * - Payment and penalty transaction ledger
 * - Status tabs filtering (All, Paid, Pending, Failed)
 * - Search query filtering
 * - Settlement modal for outstanding fees & penalties
 */

import { requireAuth } from '../auth.js';
import { getPayments, payPayment } from '../api.js';
import {
  initLayout,
  renderBadge,
  formatCurrency,
  formatDateTime,
  renderTableLoading,
  renderTableEmpty,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let allPayments = [];
let currentTab = 'All';
let searchQuery = '';
let selectedMode = 'UPI';

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'payments');

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('user-pay-modal'));
  });

  // Tab Listeners
  const tabBtns = document.querySelectorAll('#payment-status-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-status');
      filterAndRenderTable(user.User_ID);
    });
  });

  // Search Listener
  const searchInput = document.getElementById('payment-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterAndRenderTable(user.User_ID);
    });
  }

  // Payment Mode Picker Options
  const modeOptions = document.querySelectorAll('#modal-payment-modes .payment-mode-option');
  modeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      modeOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedMode = opt.getAttribute('data-mode');
    });
  });

  // Pay Modal Submit
  const submitBtn = document.getElementById('modal-pay-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const pId = document.getElementById('modal-pay-id').value;
      if (!pId) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying...';

      const res = await payPayment(pId, selectedMode);
      if (res.success) {
        document.getElementById('modal-pay-txn').textContent = res.data.Transaction_ID;
        document.getElementById('modal-pay-success').style.display = 'block';
        showToast(res.message, 'success');

        setTimeout(async () => {
          closeModal('user-pay-modal');
          document.getElementById('modal-pay-success').style.display = 'none';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Pay Now';
          await fetchPayments(user.User_ID);
        }, 1200);
      } else {
        showToast(res.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pay Now';
      }
    });
  }

  await fetchPayments(user.User_ID);
});

async function fetchPayments(userId) {
  const tbody = document.getElementById('payments-tbody');
  renderTableLoading(tbody, 8, 4);

  const res = await getPayments({ userId });
  allPayments = res.data || [];

  updateCounts();
  filterAndRenderTable(userId);
}

function updateCounts() {
  document.getElementById('count-pay-all').textContent = allPayments.length;
  document.getElementById('count-pay-paid').textContent = allPayments.filter(p => p.Payment_Status === 'Paid').length;
  document.getElementById('count-pay-pending').textContent = allPayments.filter(p => p.Payment_Status === 'Pending').length;
  document.getElementById('count-pay-failed').textContent = allPayments.filter(p => p.Payment_Status === 'Failed').length;
}

function filterAndRenderTable(userId) {
  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;

  let filtered = allPayments;

  if (currentTab !== 'All') {
    filtered = filtered.filter(p => p.Payment_Status.toLowerCase() === currentTab.toLowerCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.Transaction_ID.toLowerCase().includes(searchQuery) ||
      p.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      p.Payment_Type.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, `No ${currentTab !== 'All' ? currentTab.toLowerCase() : ''} transactions found.`);
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isPending = p.Payment_Status === 'Pending';
    const isPenalty = p.Payment_Type === 'Penalty';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color: var(--color-primary); font-size: 0.8125rem;">
          ${escapeHtml(p.Transaction_ID)}
        </td>
        <td>
          <div style="font-weight: 700; color: ${isPenalty ? 'var(--status-occupied)' : 'var(--color-text-main)'};">
            ${escapeHtml(p.Payment_Type)}
          </div>
          <div class="text-xs text-muted">Ref Booking #${p.Reservation_ID}</div>
        </td>
        <td>
          <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
            ${escapeHtml(p.Vehicle_Number)}
          </span>
          <div class="text-xs text-muted" style="margin-top:2px;">Bay ${escapeHtml(p.Bay_Number)} &bull; ${escapeHtml(p.Lot_Name)}</div>
        </td>
        <td>
          <span class="badge badge-regular" style="font-size: 0.75rem;">
            ${escapeHtml(p.Payment_Mode)}
          </span>
        </td>
        <td class="text-xs font-mono">
          ${formatDateTime(p.Payment_Date)}
        </td>
        <td>
          ${renderBadge(p.Payment_Status)}
        </td>
        <td style="text-align: right;">
          <span class="font-mono font-bold" style="font-size: 0.95rem; color: ${isPenalty ? 'var(--status-occupied)' : 'var(--color-text-main)'};">
            ${formatCurrency(p.Amount)}
          </span>
        </td>
        <td style="text-align: right;">
          ${isPending ? `
            <button class="btn btn-primary btn-sm pay-now-btn" data-id="${p.Payment_ID}" data-amount="${p.Amount}" data-desc="${p.Payment_Type} - Bay ${p.Bay_Number}">
              <i data-lucide="credit-card" style="width:14px;height:14px;"></i>
              <span>Pay Now</span>
            </button>
          ` : `
            <span class="text-xs text-muted" style="display:inline-flex; align-items:center; gap:2px;">
              <i data-lucide="check" style="width:14px;height:14px;color:var(--status-available);"></i>
              <span>Settled</span>
            </span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Attach Pay Button Click Handlers
  tbody.querySelectorAll('.pay-now-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-id');
      const amount = btn.getAttribute('data-amount');
      const desc = btn.getAttribute('data-desc');

      document.getElementById('modal-pay-id').value = pId;
      document.getElementById('modal-pay-amount').textContent = formatCurrency(amount);
      document.getElementById('modal-pay-desc').textContent = desc;
      document.getElementById('modal-pay-success').style.display = 'none';

      openModal('user-pay-modal');
    });
  });
}
