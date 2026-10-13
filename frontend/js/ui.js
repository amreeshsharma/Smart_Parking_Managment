/**
 * ParkSmart - UI & Component Helpers (ui.js)
 *
 * Centralizes UI rendering helpers:
 * - Dynamic Sidebar & Topbar injection (User and Admin layouts)
 * - Accessible Modal management & Escape-key handling
 * - Toast notification dispatch system
 * - Status badges & formatting utilities
 * - Table states (Loading skeleton, Empty state, Error state)
 * - Safe HTML escaping for XSS prevention
 */

import { getLoggedInUser, logout } from './auth.js';

/**
 * Escapes unsafe HTML characters to prevent Cross-Site Scripting (XSS)
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format date string into human-readable format (e.g. 13 Oct 2026)
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return escapeHtml(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format ISO datetime into readable string
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return 'N/A';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return escapeHtml(isoStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format 24-hr time (e.g., "14:30") to 12-hr with AM/PM
 */
export function formatTime(timeStr) {
  if (!timeStr) return 'N/A';
  const parts = timeStr.split(':');
  if (parts.length < 2) return escapeHtml(timeStr);
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Render Pill Status Badge HTML
 */
export function renderBadge(status, type = 'status') {
  if (!status) return '';
  const clean = escapeHtml(status);
  const lower = status.toLowerCase();

  let badgeClass = 'badge-cancelled';
  let dotHtml = '<span class="badge-dot"></span>';

  if (['available', 'paid', 'completed', 'active'].includes(lower)) {
    badgeClass = `badge-${lower}`;
  } else if (['reserved', 'pending', 'upcoming'].includes(lower)) {
    badgeClass = `badge-${lower}`;
  } else if (['occupied', 'failed', 'overstay'].includes(lower)) {
    badgeClass = `badge-${lower}`;
  } else if (lower === 'ev') {
    badgeClass = 'badge-ev';
    dotHtml = '<i data-lucide="zap" style="width:12px;height:12px;"></i>';
  } else if (lower === 'disabled') {
    badgeClass = 'badge-disabled';
    dotHtml = '<i data-lucide="accessibility" style="width:12px;height:12px;"></i>';
  } else if (lower === 'compact') {
    badgeClass = 'badge-compact';
    dotHtml = '<i data-lucide="minimize-2" style="width:12px;height:12px;"></i>';
  } else if (lower === 'regular') {
    badgeClass = 'badge-regular';
    dotHtml = '<i data-lucide="car" style="width:12px;height:12px;"></i>';
  }

  return `<span class="badge ${badgeClass}">${dotHtml}<span>${clean}</span></span>`;
}

/**
 * Toast Notification Dispatcher
 */
export function showToast(titleOrMessage, type = 'info', optionalDesc = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const title = optionalDesc ? titleOrMessage : (type === 'error' ? 'Error' : (type === 'success' ? 'Success' : 'Notification'));
  const message = optionalDesc ? optionalDesc : titleOrMessage;

  const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss notification">
      <i data-lucide="x" style="width:14px;height:14px;"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons({ root: toast });

  const dismiss = () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  setTimeout(dismiss, 4000);
}

/**
 * Modal Dialog Controller
 */
export function openModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');

  // Focus trap / auto-focus first input or close button
  const focusable = backdrop.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled])');
  if (focusable) focusable.focus();

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal(modalId);
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  // Close on backdrop click
  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal(modalId);
  };
}

export function closeModal(modalId) {
  const backdrop = document.getElementById(modalId);
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
}

/**
 * Table Loading Skeleton
 */
export function renderTableLoading(tbody, colSpan, rowCount = 5) {
  if (!tbody) return;
  let html = '';
  for (let i = 0; i < rowCount; i++) {
    html += `
      <tr>
        <td colspan="${colSpan}" style="padding: 1rem;">
          <div class="skeleton skeleton-text" style="width: ${80 + (i % 3) * 5}%;"></div>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

/**
 * Table Empty State
 */
export function renderTableEmpty(tbody, colSpan, message = "No records found.", actionHtml = "") {
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}">
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="inbox"></i>
          </div>
          <h4 class="empty-state-title">No Records Found</h4>
          <p class="empty-state-text">${escapeHtml(message)}</p>
          ${actionHtml}
        </div>
      </td>
    </tr>
  `;
  if (window.lucide) window.lucide.createIcons({ root: tbody });
}

/**
 * Generic Pagination Component Renderer
 */
export function renderPagination(container, currentPage, totalPages, onPageChange) {
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let pagesHtml = '';
  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `
      <button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">
        ${p}
      </button>
    `;
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>
    </div>
    <div class="pagination-controls">
      <button class="page-btn" id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
        <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
      </button>
      ${pagesHtml}
      <button class="page-btn" id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
        <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons({ root: container });

  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = Number(btn.getAttribute('data-page'));
      onPageChange(page);
    });
  });

  const prevBtn = container.querySelector('#prev-page-btn');
  if (prevBtn) prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));

  const nextBtn = container.querySelector('#next-page-btn');
  if (nextBtn) nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
}

// ==========================================================================
// Centralized Layout Injection (User and Admin Sidebars & Topbars)
// ==========================================================================

const USER_NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: 'layout-dashboard', href: 'dashboard.html' },
  { id: 'find-parking', label: 'Find & Reserve', icon: 'map-pin', href: 'find-parking.html' },
  { id: 'vehicles', label: 'My Vehicles', icon: 'car', href: 'vehicles.html' },
  { id: 'reservations', label: 'My Bookings', icon: 'calendar', href: 'reservations.html' },
  { id: 'history', label: 'Parking History', icon: 'clock', href: 'history.html' },
  { id: 'payments', label: 'Payment Settlement', icon: 'credit-card', href: 'payments.html' },
  { id: 'profile', label: 'My Profile', icon: 'user', href: 'profile.html' }
];

const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Facility Telemetry', icon: 'layout-dashboard', href: 'dashboard.html' },
  { id: 'lots', label: 'Parking Facilities', icon: 'building-2', href: 'lots.html' },
  { id: 'bays', label: 'Manage Bays', icon: 'grid', href: 'bays.html' },
  { id: 'reservations', label: 'All Reservations', icon: 'calendar-check', href: 'reservations.html' },
  { id: 'sessions', label: 'Live Sessions', icon: 'radio', href: 'sessions.html' },
  { id: 'payments', label: 'Revenue & Audit', icon: 'receipt', href: 'payments.html' },
  { id: 'users', label: 'Driver Accounts', icon: 'users', href: 'users.html' },
  { id: 'vehicles', label: 'Registered Fleet', icon: 'car-front', href: 'vehicles.html' }
];

/**
 * Injects standard sidebar, topbar, mobile drawer and sets active page link
 *
 * @param {'user'|'admin'} role
 * @param {string} activePageId e.g. 'dashboard', 'find-parking', 'lots'
 */
export function initLayout(role = 'user', activePageId = 'dashboard') {
  const user = getLoggedInUser() || {
    Name: role === 'admin' ? 'Admin Operator' : 'Valued Driver',
    Email: 'demo@parksmart.com',
    Role: role === 'admin' ? 'Admin' : 'User'
  };

  const isUser = role.toLowerCase() === 'user';
  const navItems = isUser ? USER_NAV_ITEMS : ADMIN_NAV_ITEMS;
  const initials = user.Name ? user.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PS';

  // 1. Setup Layout Wrapper classes
  const layoutWrapper = document.querySelector('.app-layout');
  if (layoutWrapper && !isUser) {
    layoutWrapper.classList.add('admin-layout');
  }

  // 2. Build Sidebar HTML
  const sidebarNavHtml = navItems.map(item => {
    const isActive = item.id === activePageId;
    return `
      <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}" id="nav-${item.id}">
        <i data-lucide="${item.icon}"></i>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  const sidebarContainer = document.getElementById('app-sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = `
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <a href="${isUser ? 'dashboard.html' : 'dashboard.html'}" class="brand-logo">
            <img src="../assets/logo.svg" alt="ParkSmart Logo">
            <span>ParkSmart${!isUser ? ' <span style="font-size:0.75rem;padding:2px 6px;background:#4F46E5;color:#fff;border-radius:4px;vertical-align:middle;">ADMIN</span>' : ''}</span>
          </a>
          <button class="sidebar-close-btn" id="sidebar-close-btn" aria-label="Close navigation">
            <i data-lucide="x"></i>
          </button>
        </div>

        <div class="sidebar-nav">
          <div class="nav-section-title">${isUser ? 'Driver Portal' : 'Facility Control'}</div>
          ${sidebarNavHtml}
        </div>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="user-avatar">${initials}</div>
            <div class="user-meta">
              <div class="user-name" title="${escapeHtml(user.Name)}">${escapeHtml(user.Name)}</div>
              <div class="user-role-text">${escapeHtml(user.Role)} Mode</div>
            </div>
          </div>
          <button class="btn-icon" id="logout-btn" title="Sign Out" aria-label="Sign out">
            <i data-lucide="log-out" style="width:16px;height:16px;"></i>
          </button>
        </div>
      </aside>
    `;
  }

  // 3. Build Topbar HTML
  const topbarContainer = document.getElementById('app-topbar-container');
  if (topbarContainer) {
    const activeItem = navItems.find(i => i.id === activePageId);
    const pageTitle = activeItem ? activeItem.label : 'Dashboard';

    topbarContainer.innerHTML = `
      <header class="app-topbar">
        <div class="topbar-left">
          <button class="hamburger-btn" id="hamburger-btn" aria-label="Open sidebar menu">
            <i data-lucide="menu"></i>
          </button>
          <h1 class="topbar-title">${pageTitle}</h1>
        </div>

        <div class="topbar-right">
          ${!isUser ? `
            <div class="telemetry-badge" style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;">
              <span class="pulse-dot"></span>
              <span>Sensors Online</span>
            </div>
          ` : `
            <a href="find-parking.html" class="btn btn-primary btn-sm">
              <i data-lucide="plus" style="width:14px;height:14px;"></i>
              <span>Book Parking</span>
            </a>
          `}
          <div class="user-avatar" style="width:2rem;height:2rem;font-size:0.75rem;" title="${escapeHtml(user.Name)}">
            ${initials}
          </div>
        </div>
      </header>
    `;
  }

  // 4. Attach Responsive Mobile Drawer Listeners
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  const openDrawer = () => {
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
  };
  const closeDrawer = () => {
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // 5. Attach Logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }

  // 6. Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
