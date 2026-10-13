/**
 * ParkSmart - User Profile Controller (user-profile.js)
 *
 * Coordinates:
 * - Driver contact information updates
 * - Password modification with client-side verification
 * - Mock database reset mechanism
 */

import { requireAuth, setLoggedInUser, getLoggedInUser } from '../auth.js';
import { updateProfile, changePassword, resetDatabase } from '../api.js';
import { initLayout, showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth('User');
  if (!user) return;

  initLayout('user', 'profile');

  // Prefill personal fields
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const phoneInput = document.getElementById('profile-phone');
  const avatarEl = document.getElementById('profile-avatar');

  if (nameInput) nameInput.value = user.Name || '';
  if (emailInput) emailInput.value = user.Email || '';
  if (phoneInput) phoneInput.value = user.Phone || '';
  if (avatarEl && user.Name) {
    avatarEl.textContent = user.Name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // 1. Details Form Handler
  const detailsForm = document.getElementById('profile-details-form');
  const nameError = document.getElementById('profile-name-error');
  const phoneError = document.getElementById('profile-phone-error');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  detailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    nameError.style.display = 'none';
    phoneError.style.display = 'none';

    const newName = nameInput.value.trim();
    const newPhone = phoneInput.value.trim();

    if (!newName || newName.length < 2) {
      nameError.textContent = 'Please enter your valid full name.';
      nameError.style.display = 'flex';
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!newPhone || !phoneRegex.test(newPhone)) {
      phoneError.textContent = 'Please enter a valid 10-digit mobile number.';
      phoneError.style.display = 'flex';
      return;
    }

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    const res = await updateProfile(user.User_ID, { Name: newName, Phone: newPhone });
    if (res.success) {
      setLoggedInUser(res.data);
      showToast(res.message, 'success');
      initLayout('user', 'profile'); // refresh user avatar in sidebar
    } else {
      showToast(res.message, 'error');
    }

    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = 'Save Changes';
  });

  // 2. Password Form Handler
  const pwdForm = document.getElementById('password-form');
  const currentPwdInput = document.getElementById('current-password');
  const newPwdInput = document.getElementById('new-password');
  const confirmNewPwdInput = document.getElementById('confirm-new-password');
  const curError = document.getElementById('current-password-error');
  const newError = document.getElementById('new-password-error');
  const confirmError = document.getElementById('confirm-new-password-error');
  const savePwdBtn = document.getElementById('save-password-btn');

  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    curError.style.display = 'none';
    newError.style.display = 'none';
    confirmError.style.display = 'none';

    const cur = currentPwdInput.value;
    const next = newPwdInput.value;
    const confirm = confirmNewPwdInput.value;

    if (!cur) {
      curError.textContent = 'Please enter your current password.';
      curError.style.display = 'flex';
      return;
    }
    if (!next || next.length < 6) {
      newError.textContent = 'New password must be at least 6 characters.';
      newError.style.display = 'flex';
      return;
    }
    if (next !== confirm) {
      confirmError.textContent = 'New passwords do not match.';
      confirmError.style.display = 'flex';
      return;
    }

    savePwdBtn.disabled = true;
    savePwdBtn.textContent = 'Updating...';

    const res = await changePassword(user.User_ID, cur, next);
    if (res.success) {
      showToast(res.message, 'success');
      pwdForm.reset();
    } else {
      showToast(res.message, 'error');
      curError.textContent = res.message;
      curError.style.display = 'flex';
    }

    savePwdBtn.disabled = false;
    savePwdBtn.textContent = 'Update Password';
  });

  // 3. Reset Demo Database Handler
  const resetBtn = document.getElementById('reset-db-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm("Reset the in-browser database to factory mock data? All newly added vehicles and bookings will be restored to seed state.")) return;

      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting...';

      const res = await resetDatabase();
      showToast(res.message, 'success');

      setTimeout(() => {
        window.location.reload();
      }, 700);
    });
  }
});
