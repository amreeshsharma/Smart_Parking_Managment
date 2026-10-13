/**
 * ParkSmart - Admin Reservations Controller (admin-reservations.js)
 *
 * Coordinates:
 * - Master reservation audit table
 * - Filter tabs (All, Upcoming, Active, Completed, Cancelled)
 * - Text search query (driver name, license plate, bay, facility)
 * - CSV export of booking ledger
 * - Space release / cancellation
 */

import { requireAuth } from '../auth.js';
import { getReservations, cancelReservation } from '../api.js';
import {
  initLayout,
  renderBadge,
  formatCurrency,
  formatDate,
  formatTime,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  showToast,
  escapeHtml
} from '../ui.js';

let allReservations = [];
let currentTab = 'All';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'reservations');

  const searchInput = document.getElementById('admin-res-search');
  const exportBtn = document.getElementById('export-reservations-csv-btn');

  // Tab Listeners
  const tabBtns = document.querySelectorAll('#admin-res-tabs .tab-btn');
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

  // Export CSV Handler
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportReservationsCSV();
    });
  }

  await fetchReservations();
});

async function fetchReservations() {
  const tbody = document.getElementById('admin-res-tbody');
  renderTableLoading(tbody, 8, 5);

  const res = await getReservations();
  allReservations = res.data || [];

  updateCounts();
  filterAndRenderTable();
}

function updateCounts() {
  document.getElementById('count-all').textContent = allReservations.length;
  document.getElementById('count-upcoming').textContent = allReservations.filter(r => r.Status === 'Upcoming').length;
  document.getElementById('count-active').textContent = allReservations.filter(r => r.Status === 'Active').length;
  document.getElementById('count-completed').textContent = allReservations.filter(r => r.Status === 'Completed').length;
  document.getElementById('count-cancelled').textContent = allReservations.filter(r => r.Status === 'Cancelled').length;
}

function filterAndRenderTable() {
  const tbody = document.getElementById('admin-res-tbody');
  const paginationContainer = document.getElementById('admin-res-pagination');
  if (!tbody) return;

  let filtered = allReservations;

  if (currentTab !== 'All') {
    filtered = filtered.filter(r => r.Status.toLowerCase() === currentTab.toLowerCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(r =>
      r.User_Name.toLowerCase().includes(searchQuery) ||
      r.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      r.Bay_Number.toLowerCase().includes(searchQuery) ||
      r.Lot_Name.toLowerCase().includes(searchQuery) ||
      String(r.Reservation_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, `No ${currentTab !== 'All' ? currentTab.toLowerCase() : ''} bookings found matching criteria.`);
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(r => {
    const isUpcoming = r.Status === 'Upcoming';

    return `
      <tr>
        <td class="font-mono font-semibold" style="color:var(--color-primary);">
          #${r.Reservation_ID}
        </td>
        <td>
          <div style="font-weight:700; color:var(--color-text-main);">${escapeHtml(r.User_Name)}</div>
          <div class="text-xs text-muted">ID: USR-0${r.User_ID}</div>
        </td>
        <td>
          <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
            ${escapeHtml(r.Vehicle_Number)}
          </span>
          <div class="text-xs text-muted" style="margin-top:2px;">${escapeHtml(r.Vehicle_Brand)}</div>
        </td>
        <td>
          <div style="font-weight:700;">Bay ${escapeHtml(r.Bay_Number)}</div>
          <div class="text-xs text-muted">${escapeHtml(r.Lot_Name)} &bull; ${escapeHtml(r.Floor)}</div>
        </td>
        <td>
          <div style="font-weight:600;">${formatDate(r.Booking_Date)}</div>
          <div class="text-xs text-muted font-mono">${formatTime(r.Start_Time)} - ${formatTime(r.End_Time)}</div>
        </td>
        <td>
          <span class="font-mono font-bold" style="font-size:0.95rem;">
            ${formatCurrency(r.Amount)}
          </span>
          <div style="margin-top:2px;">${renderBadge(r.Payment_Status)}</div>
        </td>
        <td>
          ${renderBadge(r.Status)}
        </td>
        <td style="text-align: right;">
          ${isUpcoming ? `
            <button class="btn btn-danger btn-sm admin-cancel-btn" data-id="${r.Reservation_ID}">
              <span>Cancel</span>
            </button>
          ` : `
            <span class="text-xs text-muted font-mono">Recorded</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Cancel Handler
  tbody.querySelectorAll('.admin-cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resId = Number(btn.getAttribute('data-id'));
      if (!confirm(`Confirm administrative cancellation of booking #${resId}? Bay will be released immediately.`)) return;

      btn.disabled = true;
      const res = await cancelReservation(resId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchReservations();
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

function exportReservationsCSV() {
  if (allReservations.length === 0) {
    showToast("No reservations available to export.", "error");
    return;
  }

  const headers = ["Reservation_ID", "Driver_Name", "Vehicle_Plate", "Facility", "Bay_Number", "Floor", "Booking_Date", "Start_Time", "End_Time", "Status", "Amount", "Payment_Status"];
  const rows = allReservations.map(r => [
    r.Reservation_ID,
    `"${(r.User_Name || '').replace(/"/g, '""')}"`,
    `"${r.Vehicle_Number}"`,
    `"${(r.Lot_Name || '').replace(/"/g, '""')}"`,
    r.Bay_Number,
    r.Floor,
    r.Booking_Date,
    r.Start_Time,
    r.End_Time,
    r.Status,
    r.Amount,
    r.Payment_Status
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `parksmart_reservations_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("Reservations ledger exported successfully.", "success");
}
