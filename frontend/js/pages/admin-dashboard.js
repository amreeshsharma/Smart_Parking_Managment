/**
 * ParkSmart - Admin Dashboard Controller (admin-dashboard.js)
 *
 * Coordinates:
 * - Admin route protection (Role='Admin')
 * - Real-time telemetry statistics compilation
 * - Chart.js Bar Chart: Facility Capacity vs. Occupancy
 * - Chart.js Line Chart: Revenue Collection Trend
 * - Flagged Overstay Audit Table and Barrier Clearance
 */

import { requireAuth } from '../auth.js';
import { getAdminStats, markExit } from '../api.js';
import {
  initLayout,
  formatCurrency,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  showToast,
  escapeHtml
} from '../ui.js';

let occupancyChart = null;
let revenueChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'dashboard');

  await loadAdminDashboard();
});

async function loadAdminDashboard() {
  const tbody = document.getElementById('overstays-tbody');
  renderTableLoading(tbody, 7, 3);

  try {
    const res = await getAdminStats();
    if (!res.success) {
      showToast(res.message, 'error');
      return;
    }

    const data = res.data;

    // 1. Populate KPI Metrics
    document.getElementById('kpi-total-revenue').textContent = formatCurrency(data.totalRevenue);
    document.getElementById('kpi-occupancy-rate').textContent = `${data.overallOccupancyPct}%`;
    document.getElementById('kpi-occupancy-sub').innerHTML = `<span>${data.occupiedBays} occupied &bull; ${data.availableBays} bays free</span>`;
    document.getElementById('kpi-active-sessions').textContent = data.activeSessionsCount;
    document.getElementById('kpi-pending-settlements').textContent = formatCurrency(data.pendingRevenue);
    document.getElementById('kpi-overstay-count').textContent = `${data.overstayCount} flagged overstays`;

    // 2. Render Chart.js Occupancy Bar Chart
    renderOccupancyChart(data.lotChartData);

    // 3. Render Chart.js Revenue Line Chart
    renderRevenueChart(data.revenueTrend);

    // 4. Render Overstay Audit Table
    renderOverstaysTable(data.overstays);

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error("Failed to load admin stats:", err);
    showToast("Error retrieving facility telemetry", "error");
  }
}

/**
 * Render Facility Occupancy Stacked/Grouped Bar Chart
 */
function renderOccupancyChart(lotData) {
  const ctx = document.getElementById('occupancyBarChart');
  if (!ctx || !window.Chart) return;

  if (occupancyChart) occupancyChart.destroy();

  const labels = lotData.map(l => l.name);
  const occupiedValues = lotData.map(l => l.occupied);
  const reservedValues = lotData.map(l => l.reserved);
  const availableValues = lotData.map(l => l.available);

  occupancyChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Occupied',
          data: occupiedValues,
          backgroundColor: '#4F46E5',
          borderRadius: 6
        },
        {
          label: 'Reserved',
          data: reservedValues,
          backgroundColor: '#F59E0B',
          borderRadius: 6
        },
        {
          label: 'Available',
          data: availableValues,
          backgroundColor: '#10B981',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 12, weight: '500' }
          }
        },
        tooltip: {
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: { font: { family: 'Inter', size: 11 } }
        }
      }
    }
  });
}

/**
 * Render Revenue Line Chart
 */
function renderRevenueChart(trendData) {
  const ctx = document.getElementById('revenueLineChart');
  if (!ctx || !window.Chart) return;

  if (revenueChart) revenueChart.destroy();

  const labels = trendData.map(t => t.day);
  const values = trendData.map(t => t.revenue);

  revenueChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Daily Revenue (₹)',
          data: values,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#4F46E5',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Revenue: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: {
            font: { family: 'Inter', size: 11 },
            callback: (v) => `₹${v}`
          }
        }
      }
    }
  });
}

/**
 * Render Overstay Audit Table
 */
function renderOverstaysTable(overstays) {
  const tbody = document.getElementById('overstays-tbody');
  if (!tbody) return;

  if (overstays.length === 0) {
    renderTableEmpty(tbody, 7, "No overstaying vehicles currently recorded in facility audit logs.");
    return;
  }

  tbody.innerHTML = overstays.map(o => `
    <tr>
      <td class="font-mono font-semibold" style="color: var(--color-primary);">
        #${o.Session_ID}
      </td>
      <td>
        <span class="vehicle-number-plate" style="font-size:0.75rem; padding: 2px 6px;">
          ${escapeHtml(o.Vehicle_Number)}
        </span>
      </td>
      <td>
        <div style="font-weight:700;">Bay ${escapeHtml(o.Bay_Number)}</div>
        <div class="text-xs text-muted">${escapeHtml(o.Lot_Name)}</div>
      </td>
      <td>
        <span class="badge badge-overstay">
          <i data-lucide="clock" style="width:12px;height:12px;"></i>
          <span>${o.Overstay_Minutes} min</span>
        </span>
      </td>
      <td>
        <span class="font-mono font-bold" style="color: var(--status-occupied); font-size: 0.95rem;">
          ${formatCurrency(o.Penalty_Amount)}
        </span>
      </td>
      <td>
        ${o.Status === 'Active Live'
          ? '<span class="badge badge-occupied"><span class="pulse-dot"></span> Occupying Space</span>'
          : '<span class="badge badge-cancelled">Barrier Cleared</span>'
        }
      </td>
      <td style="text-align: right;">
        ${o.Status === 'Active Live' ? `
          <button class="btn btn-danger btn-sm clear-exit-btn" data-id="${o.Session_ID}">
            <i data-lucide="log-out" style="width:13px;height:13px;"></i>
            <span>Clear Exit</span>
          </button>
        ` : `
          <span class="text-xs text-muted">Audited</span>
        `}
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  tbody.querySelectorAll('.clear-exit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sId = btn.getAttribute('data-id');
      if (!confirm(`Register barrier clearance and mark departure for session #${sId}?`)) return;

      btn.disabled = true;
      const res = await markExit(sId);
      if (res.success) {
        showToast(res.message, 'success');
        await loadAdminDashboard();
      } else {
        showToast(res.message, 'error');
        btn.disabled = false;
      }
    });
  });
}
