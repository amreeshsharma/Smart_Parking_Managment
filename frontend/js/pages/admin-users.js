/**
 * ParkSmart - Admin Users Controller (admin-users.js)
 *
 * Coordinates:
 * - Driver and administrator account ledger
 * - Role filtering & text query searching
 * - Add & edit user modal workflows
 * - Protected account deletion
 * - Pagination controls
 */

import { requireAuth } from '../auth.js';
import { getUsers, addUser, updateUser, deleteUser } from '../api.js';
import {
  initLayout,
  renderBadge,
  renderTableLoading,
  renderTableEmpty,
  renderPagination,
  openModal,
  closeModal,
  showToast,
  escapeHtml
} from '../ui.js';

let allUsers = [];
let currentRoleFilter = 'All';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 8;

document.addEventListener('DOMContentLoaded', async () => {
  const admin = requireAuth('Admin');
  if (!admin) return;

  initLayout('admin', 'users');

  const addBtn = document.getElementById('add-user-btn');
  const searchInput = document.getElementById('admin-user-search');
  const form = document.getElementById('admin-user-form');
  const userIdInput = document.getElementById('admin-user-id-input');
  const modalTitle = document.getElementById('user-modal-title');
  const nameInput = document.getElementById('admin-user-name');
  const emailInput = document.getElementById('admin-user-email');
  const phoneInput = document.getElementById('admin-user-phone');
  const roleSelect = document.getElementById('admin-user-role');
  const nameError = document.getElementById('admin-user-name-error');
  const emailError = document.getElementById('admin-user-email-error');
  const phoneError = document.getElementById('admin-user-phone-error');
  const alertEl = document.getElementById('user-modal-alert');
  const submitBtn = document.getElementById('admin-user-submit-btn');

  // Modal Close Handlers
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeModal('user-modal'));
  });

  // Role Tab Listeners
  const tabBtns = document.querySelectorAll('#user-role-tabs .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRoleFilter = btn.getAttribute('data-role');
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

  // Open Add User Modal
  addBtn.addEventListener('click', () => {
    form.reset();
    userIdInput.value = '';
    modalTitle.textContent = 'Create Driver / Operator Account';
    submitBtn.textContent = 'Create Account';
    clearErrors();
    openModal('user-modal');
  });

  function clearErrors() {
    [nameInput, emailInput, phoneInput].forEach(el => el.classList.remove('is-invalid'));
    [nameError, emailError, phoneError].forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    alertEl.style.display = 'none';
  }

  function validate() {
    clearErrors();
    let valid = true;

    const name = nameInput.value.trim();
    if (!name || name.length < 2) {
      nameInput.classList.add('is-invalid');
      nameError.textContent = 'Please enter a valid full name.';
      nameError.style.display = 'flex';
      valid = false;
    }

    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please provide a valid email address.';
      emailError.style.display = 'flex';
      valid = false;
    }

    const phone = phoneInput.value.trim();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      phoneInput.classList.add('is-invalid');
      phoneError.textContent = 'Please enter a valid 10-digit mobile number.';
      phoneError.style.display = 'flex';
      valid = false;
    }

    return valid;
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const isEdit = !!userIdInput.value;
    const payload = {
      Name: nameInput.value.trim(),
      Email: emailInput.value.trim(),
      Phone: phoneInput.value.trim(),
      Role: roleSelect.value
    };

    try {
      const res = isEdit
        ? await updateUser(userIdInput.value, payload)
        : await addUser(payload);

      if (!res.success) {
        alertEl.textContent = res.message;
        alertEl.style.display = 'block';
        showToast(res.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Update Account' : 'Create Account';
        return;
      }

      showToast(res.message, 'success');
      closeModal('user-modal');
      submitBtn.disabled = false;
      await fetchUsers();

    } catch (err) {
      console.error(err);
      alertEl.textContent = 'Failed to save account details.';
      alertEl.style.display = 'block';
      submitBtn.disabled = false;
    }
  });

  await fetchUsers();
});

async function fetchUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  renderTableLoading(tbody, 8, 4);

  const res = await getUsers();
  allUsers = res.data || [];

  updateCounts();
  filterAndRenderTable();
}

function updateCounts() {
  document.getElementById('count-users-all').textContent = allUsers.length;
  document.getElementById('count-users-user').textContent = allUsers.filter(u => u.Role === 'User').length;
  document.getElementById('count-users-admin').textContent = allUsers.filter(u => u.Role === 'Admin').length;
}

function filterAndRenderTable() {
  const tbody = document.getElementById('admin-users-tbody');
  const paginationContainer = document.getElementById('admin-users-pagination');
  if (!tbody) return;

  let filtered = allUsers;

  if (currentRoleFilter !== 'All') {
    filtered = filtered.filter(u => u.Role.toLowerCase() === currentRoleFilter.toLowerCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(u =>
      u.Name.toLowerCase().includes(searchQuery) ||
      u.Email.toLowerCase().includes(searchQuery) ||
      u.Phone.includes(searchQuery) ||
      String(u.User_ID).includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    renderTableEmpty(tbody, 8, `No ${currentRoleFilter !== 'All' ? currentRoleFilter.toLowerCase() : ''} accounts found.`);
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  tbody.innerHTML = pageItems.map(u => `
    <tr>
      <td class="font-mono font-semibold" style="color:var(--color-primary);">
        #${u.User_ID}
      </td>
      <td>
        <div style="font-weight:700; color:var(--color-text-main);">${escapeHtml(u.Name)}</div>
      </td>
      <td class="font-mono text-xs">
        ${escapeHtml(u.Email)}
      </td>
      <td class="font-mono text-xs">
        ${escapeHtml(u.Phone)}
      </td>
      <td>
        <span class="badge ${u.Role === 'Admin' ? 'badge-ev' : 'badge-regular'}" style="font-size:0.75rem;">
          ${escapeHtml(u.Role)}
        </span>
      </td>
      <td>
        <span class="font-mono font-semibold">${u.Vehicle_Count}</span>
        <span class="text-xs text-muted">Cars</span>
      </td>
      <td>
        <span class="font-mono font-semibold">${u.Reservation_Count}</span>
        <span class="text-xs text-muted">Visits</span>
      </td>
      <td style="text-align: right;">
        <div style="display:flex; justify-content:flex-end; gap:0.35rem;">
          <button class="btn btn-ghost btn-sm edit-user-btn" data-id="${u.User_ID}">
            <i data-lucide="edit-3"></i>
            <span>Edit</span>
          </button>
          <button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.User_ID}">
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons({ root: tbody });

  // Attach Edit Listeners
  tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uId = Number(btn.getAttribute('data-id'));
      const user = allUsers.find(u => u.User_ID === uId);
      if (!user) return;

      document.getElementById('admin-user-id-input').value = user.User_ID;
      document.getElementById('user-modal-title').textContent = 'Edit Account Details';
      document.getElementById('admin-user-name').value = user.Name;
      document.getElementById('admin-user-email').value = user.Email;
      document.getElementById('admin-user-phone').value = user.Phone;
      document.getElementById('admin-user-role').value = user.Role;
      document.getElementById('admin-user-submit-btn').textContent = 'Update Account';

      openModal('user-modal');
    });
  });

  // Attach Delete Listeners
  tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uId = Number(btn.getAttribute('data-id'));
      const user = allUsers.find(u => u.User_ID === uId);
      if (!user) return;

      if (!confirm(`Are you sure you want to delete account "${user.Name}" (${user.Email})?`)) return;

      btn.disabled = true;
      const res = await deleteUser(uId);
      if (res.success) {
        showToast(res.message, 'success');
        await fetchUsers();
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
