/**
 * ParkSmart - Login Page Controller (login.js)
 *
 * Handles User/Admin role toggle, demo credential quick-fill,
 * client-side form validation, password visibility toggling,
 * authentication dispatch via api.js and session routing.
 */

import { login } from '../api.js';
import { setLoggedInUser, getLoggedInUser } from '../auth.js';
import { showToast } from '../ui.js';

let selectedRole = 'User';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect automatically unless switching accounts
  const existingUser = getLoggedInUser();
  if (existingUser && existingUser.Role && !window.location.search.includes('switch')) {
    redirectUser(existingUser.Role);
    return;
  }

  // Initialize Lucide icons
  if (window.lucide) window.lucide.createIcons();

  const roleUserBtn = document.getElementById('role-user-btn');
  const roleAdminBtn = document.getElementById('role-admin-btn');
  const fillUserChip = document.getElementById('fill-user-chip');
  const fillAdminChip = document.getElementById('fill-admin-chip');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const loginAlert = document.getElementById('login-alert');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');
  const togglePasswordBtn = document.getElementById('toggle-password-btn');

  // 1. Role Toggle Handler
  const setRole = (role) => {
    selectedRole = role;
    if (role === 'User') {
      roleUserBtn.classList.add('active');
      roleAdminBtn.classList.remove('active');
      submitBtnText.textContent = 'Sign In as Driver';
    } else {
      roleAdminBtn.classList.add('active');
      roleUserBtn.classList.remove('active');
      submitBtnText.textContent = 'Sign In as Administrator';
    }
    clearErrors();
  };

  roleUserBtn.addEventListener('click', () => setRole('User'));
  roleAdminBtn.addEventListener('click', () => setRole('Admin'));

  // 2. Demo Quick-Fill Chips
  fillUserChip.addEventListener('click', () => {
    setRole('User');
    emailInput.value = 'user@parksmart.com';
    passwordInput.value = '123456';
    clearErrors();
  });

  fillAdminChip.addEventListener('click', () => {
    setRole('Admin');
    emailInput.value = 'admin@parksmart.com';
    passwordInput.value = '123456';
    clearErrors();
  });

  // 3. Password Visibility Toggle
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    togglePasswordBtn.innerHTML = isPassword
      ? '<i data-lucide="eye-off" style="width:18px;height:18px;"></i>'
      : '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
    if (window.lucide) window.lucide.createIcons({ root: togglePasswordBtn });
  });

  // 4. Form Validation Helpers
  const clearErrors = () => {
    emailInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');
    emailError.style.display = 'none';
    passwordError.style.display = 'none';
    loginAlert.style.display = 'none';
  };

  const validate = () => {
    clearErrors();
    let valid = true;

    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please enter your email address.';
      emailError.style.display = 'flex';
      valid = false;
    } else if (!emailRegex.test(email)) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please enter a valid email address (e.g. name@domain.com).';
      emailError.style.display = 'flex';
      valid = false;
    }

    const password = passwordInput.value;
    if (!password) {
      passwordInput.classList.add('is-invalid');
      passwordError.textContent = 'Please enter your password.';
      passwordError.style.display = 'flex';
      valid = false;
    } else if (password.length < 6) {
      passwordInput.classList.add('is-invalid');
      passwordError.textContent = 'Password must be at least 6 characters long.';
      passwordError.style.display = 'flex';
      valid = false;
    }

    return valid;
  };

  // 5. Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtnText.textContent = 'Authenticating...';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const response = await login(email, password, selectedRole);

      if (!response.success) {
        loginAlert.textContent = response.message;
        loginAlert.style.display = 'block';
        showToast(response.message, 'error');
        submitBtn.disabled = false;
        submitBtnText.textContent = selectedRole === 'User' ? 'Sign In as Driver' : 'Sign In as Administrator';
        return;
      }

      // Success
      setLoggedInUser(response.data.user, response.data.token);
      showToast(response.message, 'success');

      setTimeout(() => {
        const dest = sessionStorage.getItem('redirect_after_login');
        const userRole = (response.data?.user?.Role || '').toLowerCase();
        if (dest && !dest.includes('login.html')) {
          sessionStorage.removeItem('redirect_after_login');
          const isDestAdmin = dest.includes('/admin/');
          const isDestUser = dest.includes('/user/');
          if ((userRole === 'admin' && !isDestUser) || (userRole !== 'admin' && !isDestAdmin)) {
            window.location.href = dest;
            return;
          }
        }
        redirectUser(response.data?.user?.Role || 'User');
      }, 500);

    } catch (err) {
      console.error(err);
      loginAlert.textContent = 'An unexpected error occurred. Please try again.';
      loginAlert.style.display = 'block';
      showToast('Authentication failed', 'error');
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Sign In';
    }
  });

  function redirectUser(role) {
    const r = (role || '').toLowerCase();
    if (r === 'admin') {
      window.location.href = 'admin/dashboard.html';
    } else {
      window.location.href = 'user/dashboard.html';
    }
  }
});
