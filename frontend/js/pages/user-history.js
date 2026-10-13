/**
 * ParkSmart - User History Controller (user-history.js)
 *
 * Coordinates:
 * - Driver dwell and session telemetry log table
 * - Search query filtering
 * - Date range filtering (From & To date)
 * - Pagination controls
 * - Visual overstay penalty signaling
 */

import { requireAuth } from '../auth.js';
import { getSessions } from '../api.js';
import {
  initLayout,
  formatDateTime,
  formatCurrency,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  escapeHtml
} from '../ui.js';

let allSessions = [];
let searchQuery = '';
let dateFrom = '';
let dateTo = '';
let currentPage = 1;
const PAGE_SIZE = 6;

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'history');

  const searchInput = document.getElementById('session-search');
  const dateFromInput = document.getElementById('filter-date-from');
  const dateToInput = document.getElementById('filter-date-to');
  const resetBtn = document.getElementById('reset-filters-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  if (dateFromInput) {
    dateFromInput.addEventListener('change', (e) => {
      dateFrom = e.target.value;
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  if (dateToInput) {
    dateToInput.addEventListener('change', (e) => {
      dateTo = e.target.value;
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      searchQuery = '';
      dateFrom = '';
      dateTo = '';
      if (searchInput) searchInput.value = '';
      if (dateFromInput) dateFromInput.value = '';
      if (dateToInput) dateToInput.value = '';
      currentPage = 1;
      filterAndRenderTable();
    });
  }

  await fetchSessions(user.User_ID);
});

async function fetchSessions(userId) {
  const tbody = document.getElementById('history-tbody');
  renderTableLoading(tbody, 8, 4);

  const res = await getSessions({ userId });
  allSessions = res.data || [];

  filterAndRenderTable();
}

function filterAndRenderTable() {
  const tbody = document.getElementById('history-tbody');
  const paginationContainer = document.getElementById('history-pagination');
  if (!tbody) return;

  let filtered = allSessions;

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(s =>
      s.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      s.RFID_Tag.toLowerCase().includes(searchQuery) ||
      s.Bay_Number.toLowerCase().includes(searchQuery) ||
      s.Lot_Name.toLowerCase().includes(searchQuery) ||
      String(s.Session_ID).includes(searchQuery)
    );
  }

  // Date range filter
  if (dateFrom) {
    filtered = filtered.filter(s => {
      const entryDay = s.Entry_Time.split('T')[0];
      return entryDay >= dateFrom;
    });
  }
  if (dateTo) {
    filtered = filtered.filter(s => {
      const entryDay = s.Entry_Time.split('T')[0];
      return entryDay <= dateTo;
    });
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, "No parking sessions match the specified filter criteria.");
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(s => {
    const isLive = !s.Exit_Time;
    const hasPenalty = s.Penalty_Amount > 0;

    return `
      <tr>
        <td class="font-mono font-semibold" style="color: var(--color-primary);">
          #${s.Session_ID}
        </td>
        <td>
          <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
            ${escapeHtml(s.Vehicle_Number)}
          </span>
          <div class="text-xs text-muted" style="margin-top:2px;">
            ${escapeHtml(s.Vehicle_Brand)} &bull; ${escapeHtml(s.RFID_Tag)}
          </div>
        </td>
        <td>
          <div style="font-weight:700;">Bay ${escapeHtml(s.Bay_Number)}</div>
          <div class="text-xs text-muted">${escapeHtml(s.Lot_Name)} &bull; ${escapeHtml(s.Floor)}</div>
        </td>
        <td class="text-xs font-mono">
          ${formatDateTime(s.Entry_Time)}
        </td>
        <td class="text-xs font-mono">
          ${isLive ? `
            <span class="badge badge-active" style="padding: 2px 6px;">
              <span class="pulse-dot"></span>
              <span>Parked (Live)</span>
            </span>
          ` : formatDateTime(s.Exit_Time)}
        </td>
        <td>
          <span class="font-mono font-semibold" style="font-size:0.85rem;">
            ${escapeHtml(s.Duration)}
          </span>
        </td>
        <td>
          ${s.Overstay_Minutes > 0 ? `
            <span class="badge badge-overstay">
              <i data-lucide="alert-circle" style="width:12px;height:12px;"></i>
              <span>${s.Overstay_Minutes}m Overstay</span>
            </span>
          ` : `
            <span class="text-xs text-muted">0 min</span>
          `}
        </td>
        <td style="text-align: right;">
          <span class="font-mono font-bold" style="color: ${hasPenalty ? 'var(--status-occupied)' : 'var(--color-text-subtle)'};">
            ${formatCurrency(s.Penalty_Amount)}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Render pagination
  renderPagination(paginationContainer, currentPage, totalPages, (newPage) => {
    currentPage = newPage;
    filterAndRenderTable();
  });
}
