/**
 * ParkSmart - Admin Sessions Controller (admin-sessions.js)
 *
 * Coordinates:
 * - Real-time parking session monitoring
 * - Filtering (All, Live Inbound, Flagged Overstay, Completed Exits)
 * - Search query filtering (plate, RFID tag, driver, bay)
 * - Administrative "Mark Exit" action triggering dwell duration & penalty calculation
 */

import { requireAuth } from '../auth.js';
import { getSessions, markExit } from '../api.js';
import {
  initLayout,
  formatDateTime,
  formatCurrency,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  showToast,
  escapeHtml
} from '../ui.js';

let allSessions = [];
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'sessions');

  const searchInput = document.getElementById('admin-session-search');

  // Filter Tabs
  const tabBtns = document.querySelectorAll('#session-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
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

  await fetchSessions();
});

async function fetchSessions() {
  const tbody = document.getElementById('admin-sessions-tbody');
  renderTableLoading(tbody, 8, 5);

  const res = await getSessions();
  allSessions = res.data || [];

  updateCounts();
  filterAndRenderTable();
}

function updateCounts() {
  const liveCount = allSessions.filter(s => !s.Exit_Time).length;
  const overstayCount = allSessions.filter(s => s.Overstay_Minutes > 0).length;
  const exitedCount = allSessions.filter(s => !!s.Exit_Time).length;

  document.getElementById('count-sess-all').textContent = allSessions.length;
  document.getElementById('count-sess-live').textContent = liveCount;
  document.getElementById('count-sess-overstay').textContent = overstayCount;
  document.getElementById('count-sess-exited').textContent = exitedCount;

  const counterBadge = document.getElementById('live-active-counter');
  if (counterBadge) counterBadge.textContent = `${liveCount} Live Sessions`;
}

function filterAndRenderTable() {
  const tbody = document.getElementById('admin-sessions-tbody');
  const paginationContainer = document.getElementById('admin-sessions-pagination');
  if (!tbody) return;

  let filtered = allSessions;

  if (currentFilter === 'live') {
    filtered = filtered.filter(s => !s.Exit_Time);
  } else if (currentFilter === 'overstay') {
    filtered = filtered.filter(s => s.Overstay_Minutes > 0);
  } else if (currentFilter === 'exited') {
    filtered = filtered.filter(s => !!s.Exit_Time);
  }

  if (searchQuery) {
    filtered = filtered.filter(s =>
      s.Vehicle_Number.toLowerCase().includes(searchQuery) ||
      s.RFID_Tag.toLowerCase().includes(searchQuery) ||
      s.Bay_Number.toLowerCase().includes(searchQuery) ||
      s.Lot_Name.toLowerCase().includes(searchQuery) ||
      s.User_Name.toLowerCase().includes(searchQuery) ||
      String(s.Session_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, `No parking sessions found matching current filter.`);
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(s => {
    const isLive = !s.Exit_Time;
    const hasPenalty = s.Penalty_Amount > 0;

    return `
      <tr>
        <td class="font-mono font-semibold" style="color:var(--color-primary);">
          #${s.Session_ID}
        </td>
        <td>
          <div style="font-weight:700; color:var(--color-text-main);">${escapeHtml(s.User_Name)}</div>
          <div style="margin-top:2px;">
            <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
              ${escapeHtml(s.Vehicle_Number)}
            </span>
          </div>
          <div class="text-xs text-muted font-mono" style="margin-top:2px;">RFID: ${escapeHtml(s.RFID_Tag)}</div>
        </td>
        <td>
          <div style="font-weight:700;">Bay ${escapeHtml(s.Bay_Number)}</div>
          <div class="text-xs text-muted">${escapeHtml(s.Lot_Name)} &bull; ${escapeHtml(s.Floor)}</div>
          <div style="margin-top:2px;">${renderBadge(s.Bay_Type)}</div>
        </td>
        <td class="text-xs font-mono">
          ${formatDateTime(s.Entry_Time)}
        </td>
        <td class="text-xs font-mono">
          ${isLive ? `
            <span class="badge badge-active">
              <span class="pulse-dot"></span>
              <span>In Dwell</span>
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
              <i data-lucide="alert-triangle" style="width:12px;height:12px;"></i>
              <span>${s.Overstay_Minutes}m Overstay</span>
            </span>
            <div class="text-xs font-mono font-bold" style="color:var(--status-occupied); margin-top:2px;">
              Penalty: ${formatCurrency(s.Penalty_Amount)}
            </div>
          ` : `
            <span class="text-xs text-muted">Normal</span>
          `}
        </td>
        <td style="text-align: right;">
          ${isLive ? `
            <button class="btn btn-danger btn-sm mark-exit-btn" data-id="${s.Session_ID}">
              <i data-lucide="log-out" style="width:13px;height:13px;"></i>
              <span>Mark Exit</span>
            </button>
          ` : `
            <span class="text-xs text-muted font-mono">Exited</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Mark Exit Handler
  tbody.querySelectorAll('.mark-exit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sId = Number(btn.getAttribute('data-id'));
      const session = allSessions.find(s => s.Session_ID === sId);

      if (!confirm(`Register barrier departure clearance for session #${sId} (Vehicle: ${session?.Vehicle_Number})?`)) return;

      btn.disabled = true;
      btn.textContent = 'Processing...';

      const res = await markExit(sId);
      if (res.success) {
        showToast(res.message, res.data.Penalty_Amount > 0 ? 'error' : 'success');
        await fetchSessions();
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Mark Exit';
      }
    });
  });

  // Pagination
  renderPagination(paginationContainer, currentPage, totalPages, (newPage) => {
    currentPage = newPage;
    filterAndRenderTable();
  });
}
