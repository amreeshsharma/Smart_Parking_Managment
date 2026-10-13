/**
 * ParkSmart - Registration Page Controller (register.js)
 *
 * Implements client-side input validation (Name, Email, 10-digit Phone,
 * Password min length, Confirm password match, Terms consent),
 * password toggling, account creation dispatch via api.js, and auto-login routing.
 */

import { register } from '../api.js';
import { setLoggedInUser } from '../auth.js';
import { showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const form = document.getElementById('register-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const termsCheckbox = document.getElementById('terms-agree');

  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const phoneError = document.getElementById('phone-error');
  const passwordError = document.getElementById('password-error');
  const confirmPasswordError = document.getElementById('confirm-password-error');
  const termsError = document.getElementById('terms-error');
  const registerAlert = document.getElementById('register-alert');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = document.getElementById('submit-btn-text');

  // 1. Password Visibility Toggles
  const setupToggle = (btnId, inputEl) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isPwd = inputEl.getAttribute('type') === 'password';
      inputEl.setAttribute('type', isPwd ? 'text' : 'password');
      btn.innerHTML = isPwd
        ? '<i data-lucide="eye-off" style="width:18px;height:18px;"></i>'
        : '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
      if (window.lucide) window.lucide.createIcons({ root: btn });
    });
  };

  setupToggle('toggle-password-btn', passwordInput);
  setupToggle('toggle-confirm-password-btn', confirmPasswordInput);

  // 2. Clear Validation State
  const clearErrors = () => {
    [nameInput, emailInput, phoneInput, passwordInput, confirmPasswordInput].forEach(el => el.classList.remove('is-invalid'));
    [nameError, emailError, phoneError, passwordError, confirmPasswordError, termsError].forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    registerAlert.style.display = 'none';
  };

  // 3. Validation Logic
  const validate = () => {
    clearErrors();
    let valid = true;

    // Name
    const name = nameInput.value.trim();
    if (!name || name.length < 2) {
      nameInput.classList.add('is-invalid');
      nameError.textContent = 'Please enter your full name (at least 2 letters).';
      nameError.style.display = 'flex';
      valid = false;
    }

    // Email
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please provide a valid email address.';
      emailError.style.display = 'flex';
      valid = false;
    }

    // Phone (10-digit Indian standard)
    const phone = phoneInput.value.trim();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
      phoneInput.classList.add('is-invalid');
      phoneError.textContent = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      phoneError.style.display = 'flex';
      valid = false;
    }

    // Password
    const password = passwordInput.value;
    if (!password || password.length < 6) {
      passwordInput.classList.add('is-invalid');
      passwordError.textContent = 'Password must contain at least 6 characters.';
      passwordError.style.display = 'flex';
      valid = false;
    }

    // Confirm Password
    const confirmPassword = confirmPasswordInput.value;
    if (confirmPassword !== password) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordError.textContent = 'Passwords do not match.';
      confirmPasswordError.style.display = 'flex';
      valid = false;
    }

    // Terms
    if (!termsCheckbox.checked) {
      termsError.textContent = 'You must agree to the Terms of Service to create an account.';
      termsError.style.display = 'flex';
      valid = false;
    }

    return valid;
  };

  // 4. Submit Registration
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtnText.textContent = 'Creating Account...';

    const payload = {
      Name: nameInput.value.trim(),
      Email: emailInput.value.trim(),
      Phone: phoneInput.value.trim(),
      Password: passwordInput.value,
      Role: 'User'
    };

    try {
      const response = await register(payload);

      if (!response.success) {
        registerAlert.textContent = response.message;
        registerAlert.style.display = 'block';
        showToast(response.message, 'error');
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Create Free Account';
        return;
      }

      // Auto login on successful registration
      setLoggedInUser(response.data.user, response.data.token);
      showToast('Account registered successfully! Welcome to ParkSmart.', 'success');

      setTimeout(() => {
        window.location.href = 'user/dashboard.html';
      }, 700);

    } catch (err) {
      console.error(err);
      registerAlert.textContent = 'An unexpected error occurred during registration. Please retry.';
      registerAlert.style.display = 'block';
      showToast('Registration failed', 'error');
      submitBtn.disabled = false;
      submitBtnText.textContent = 'Create Free Account';
    }
  });
});
