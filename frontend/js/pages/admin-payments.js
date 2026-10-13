/**
 * ParkSmart - Admin Payments Controller (admin-payments.js)
 *
 * Coordinates:
 * - Master financial audit ledger
 * - Status tab filtering (All, Paid, Pending, Failed)
 * - Search query filtering (TXN ID, driver, vehicle plate)
 * - CSV financial ledger export
 * - Pagination controls
 */

import { requireAuth } from '../auth.js';
import { getPayments } from '../api.js';
import {
  initLayout,
  formatCurrency,
  formatDateTime,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  showToast,
  escapeHtml
} from '../ui.js';

let allPayments = [];
let currentTab = 'All';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'payments');

  const searchInput = document.getElementById('admin-pay-search');
  const exportBtn = document.getElementById('export-payments-csv-btn');

  // Status Tab Listeners
  const tabBtns = document.querySelectorAll('#admin-pay-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-status');
      currentPage = 1;
      filterAndRenderTable();
    });
  });

  // Search Filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  // Export CSV
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportPaymentsCSV();
    });
  }

  await fetchPayments();
});

async function fetchPayments() {
  const tbody = document.getElementById('admin-payments-tbody');
  renderTableLoading(tbody, 8, 5);

  const res = await getPayments();
  allPayments = res.data || [];

  updateCounts();
  filterAndRenderTable();
}

function updateCounts() {
  document.getElementById('count-pay-all').textContent = allPayments.length;
  document.getElementById('count-pay-paid').textContent = allPayments.filter(p => p.Payment_Status === 'Paid').length;
  document.getElementById('count-pay-pending').textContent = allPayments.filter(p => p.Payment_Status === 'Pending').length;
  document.getElementById('count-pay-failed').textContent = allPayments.filter(p => p.Payment_Status === 'Failed').length;
}

function filterAndRenderTable() {
  const tbody = document.getElementById('admin-payments-tbody');
  const paginationContainer = document.getElementById('admin-payments-pagination');
  if (!tbody) return;

  let filtered = allPayments;

  if (currentTab !== 'All') {
    filtered = filtered.filter(p => p.Payment_Status.toLowerCase() === currentTab.toLowerCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.Transaction_ID.toLowerCase().includes(searchQuery) ||
      p.User_Name.toLowerCase().includes(searchQuery) ||
      p.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      p.Payment_Type.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, `No ${currentTab !== 'All' ? currentTab.toLowerCase() : ''} financial records found.`);
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(p => {
    const isPenalty = p.Payment_Type === 'Penalty';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color:var(--color-primary); font-size:0.8125rem;">
          ${escapeHtml(p.Transaction_ID)}
        </td>
        <td>
          <div style="font-weight:700; color:${isPenalty ? 'var(--status-occupied)' : 'var(--color-text-main)'};">
            ${escapeHtml(p.Payment_Type)}
          </div>
          <div class="text-xs text-muted">Booking #${p.Reservation_ID}</div>
        </td>
        <td>
          <div style="font-weight:600;">${escapeHtml(p.User_Name)}</div>
          <span class="vehicle-number-plate" style="font-size:0.75rem; padding:1px 6px; margin-top:2px; display:inline-block;">
            ${escapeHtml(p.Vehicle_Number)}
          </span>
        </td>
        <td>
          <div style="font-weight:600;">Bay ${escapeHtml(p.Bay_Number)}</div>
          <div class="text-xs text-muted">${escapeHtml(p.Lot_Name)}</div>
        </td>
        <td>
          <span class="badge badge-regular" style="font-size:0.75rem;">
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
          <span class="font-mono font-bold" style="font-size:1rem; color:${isPenalty ? 'var(--status-occupied)' : 'var(--color-text-main)'};">
            ${formatCurrency(p.Amount)}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  renderPagination(paginationContainer, currentPage, totalPages, (newPage) => {
    currentPage = newPage;
    filterAndRenderTable();
  });
}

function exportPaymentsCSV() {
  if (allPayments.length === 0) {
    showToast("No payment records available to export.", "error");
    return;
  }

  const headers = ["Payment_ID", "Transaction_ID", "Driver_Name", "Vehicle_Plate", "Facility", "Bay_Number", "Amount", "Payment_Type", "Payment_Mode", "Payment_Status", "Payment_Date", "Reservation_ID"];
  const rows = allPayments.map(p => [
    p.Payment_ID,
    `"${p.Transaction_ID}"`,
    `"${(p.User_Name || '').replace(/"/g, '""')}"`,
    `"${p.Vehicle_Number}"`,
    `"${(p.Lot_Name || '').replace(/"/g, '""')}"`,
    p.Bay_Number,
    p.Amount,
    p.Payment_Type,
    p.Payment_Mode,
    p.Payment_Status,
    `"${p.Payment_Date}"`,
    p.Reservation_ID
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `parksmart_revenue_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Financial CSV ledger exported.", "success");
}
