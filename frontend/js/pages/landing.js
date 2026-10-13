/**
 * ParkSmart - Landing Page Controller (landing.js)
 *
 * Manages public landing page interactivity:
 * - Lucide icon rendering
 * - Mobile navigation menu toggle
 * - Dynamic live mockup timer animation
 * - Session awareness (updates buttons to "Go to Dashboard" if logged in)
 */

import { getLoggedInUser } from '../auth.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Mobile Menu Toggle
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('public-nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });

    // Close mobile menu on clicking any link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
      });
    });
  }

  // 3. Mockup Timer Animation
  const timerEl = document.getElementById('mockup-timer');
  if (timerEl) {
    let seconds = 18 * 60 + 45; // 02h : 18m : 45s
    setInterval(() => {
      seconds++;
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      timerEl.textContent = `02h : ${m}m : ${s}s`;
    }, 1000);
  }

  // 4. Session Awareness: Update buttons if already authenticated
  const user = getLoggedInUser();
  if (user) {
    const loginBtn = document.getElementById('nav-login-btn');
    const registerBtn = document.getElementById('nav-register-btn');
    const targetUrl = user.Role.toLowerCase() === 'admin' ? 'admin/dashboard.html' : 'user/dashboard.html';

    if (loginBtn) {
      loginBtn.textContent = 'Dashboard';
      loginBtn.href = targetUrl;
    }
    if (registerBtn) {
      registerBtn.innerHTML = `<span>My Account (${user.Role})</span>`;
      registerBtn.href = targetUrl;
    }
  }
});
