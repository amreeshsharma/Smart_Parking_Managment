/**
 * ParkSmart - Single Data Access Layer (api.js)
 *
 * Implements a unified asynchronous API client for the frontend.
 * - When CONFIG.USE_MOCK is true: interacts with an in-memory database persisted to localStorage,
 *   with artificial latency (300ms) to test loading skeletons & UI states.
 * - When CONFIG.USE_MOCK is false: delegates calls over HTTP fetch to the Express REST backend.
 *
 * All functions return uniform promise responses: { success: boolean, data: any, message: string }
 */

import { CONFIG } from './config.js';
import { INITIAL_MOCK_DATA } from './mock-data.js';

const MOCK_STORAGE_KEY = `${CONFIG.STORAGE_PREFIX}mock_db_v1`;
const ARTIFICIAL_DELAY_MS = 320;

// Rates per hour (in INR)
export const TARIFF_RATES = {
  Regular: 40,
  EV: 60,
  Disabled: 20,
  Compact: 30
};

/**
 * Artificial delay helper for realistic loading simulation in mock mode
 */
const sleep = (ms = ARTIFICIAL_DELAY_MS) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retrieve or initialize the in-memory mock database in localStorage
 */
function getMockDB() {
  const existing = localStorage.getItem(MOCK_STORAGE_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.warn("Failed to parse mock database from storage. Re-seeding.", e);
    }
  }
  // Deep clone initial data
  const initial = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Persist modified mock database to localStorage
 */
function saveMockDB(db) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

/**
 * Reset mock database back to initial factory data
 */
export async function resetDatabase() {
  await sleep(150);
  const initial = JSON.parse(JSON.stringify(INITIAL_MOCK_DATA));
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
  return { success: true, data: null, message: "Mock database reset to factory state." };
}

/**
 * Generic fetch wrapper for live backend communication
 */
async function liveFetch(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem(`${CONFIG.STORAGE_PREFIX}auth_token`);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for slow Render wakeups

  let slowNoticeTimer = null;
  if (typeof window !== 'undefined') {
    slowNoticeTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('parksmart-server-slow', {
        detail: { message: 'Server is waking up, please wait (Render free tier may take 30-60s)...' }
      }));
    }, 3500);
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (slowNoticeTimer) clearTimeout(slowNoticeTimer);

    let result;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { message: text || `Server responded with status ${response.status}` };
    }

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: result.message || `Request failed with status ${response.status}`
      };
    }
    return {
      success: true,
      data: result.data !== undefined ? result.data : result,
      message: result.message || 'Success'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (slowNoticeTimer) clearTimeout(slowNoticeTimer);
    console.error(`[liveFetch] ${method} ${endpoint} failed:`, error);
    if (error.name === 'AbortError') {
      return {
        success: false,
        data: null,
        message: 'Request timed out waiting for server. If deployed on Render, the free instance may still be waking up. Please retry in a moment.'
      };
    }
    const isConnRefused = error.message && (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('connection refused')
    );
    return {
      success: false,
      data: null,
      message: isConnRefused
        ? `Cannot connect to API server at ${CONFIG.API_BASE_URL}. Ensure the backend is running (run 'npm start' in backend/).`
        : (error.message || 'Network error connecting to backend service.')
    };
  }
}

// ==========================================================================
// 1. Authentication & Profile
// ==========================================================================

export async function login(email, password, role = 'User') {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check users first
    let user = db.users ? db.users.find(u =>
      u.Email.toLowerCase() === cleanEmail &&
      u.Password === password
    ) : null;

    // Check admins if not found in users
    if (!user && db.admins) {
      const admin = db.admins.find(a =>
        a.Email.toLowerCase() === cleanEmail &&
        a.Password === password
      );
      if (admin) {
        user = {
          User_ID: admin.Admin_ID,
          Admin_ID: admin.Admin_ID,
          Name: admin.Name,
          Email: admin.Email,
          Role: 'Admin',
          Lot_ID: admin.Lot_ID
        };
      }
    }

    if (!user) {
      return {
        success: false,
        data: null,
        message: "Invalid credentials. Please verify your email and password."
      };
    }

    // Generate simulated JWT token
    const token = `mock-jwt-token-${user.User_ID || user.Admin_ID}-${Date.now()}`;
    const userSafe = { ...user };
    delete userSafe.Password;

    return {
      success: true,
      data: { user: userSafe, token },
      message: `Welcome back, ${user.Name}!`
    };
  }

  return liveFetch('/auth/login', 'POST', { email, password, role });
}

export async function register(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const cleanEmail = (data.Email || '').trim().toLowerCase();
    if (db.users.some(u => u.Email.toLowerCase() === cleanEmail)) {
      return { success: false, data: null, message: "An account with this email address already exists." };
    }

    const nextId = db.users.length ? Math.max(...db.users.map(u => u.User_ID)) + 1 : 1;
    const newUser = {
      User_ID: nextId,
      Name: data.Name.trim(),
      Email: cleanEmail,
      Phone: data.Phone.trim(),
      Password: data.Password, // Backend will bcrypt hash
      Role: data.Role || 'User'
    };

    db.users.push(newUser);
    saveMockDB(db);

    const userSafe = { ...newUser };
    delete userSafe.Password;
    const token = `mock-jwt-token-${newUser.User_ID}-${Date.now()}`;

    return {
      success: true,
      data: { user: userSafe, token },
      message: "Registration successful! You may now sign in."
    };
  }

  return liveFetch('/auth/register', 'POST', data);
}

export async function updateProfile(userId, data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const index = db.users.findIndex(u => u.User_ID === Number(userId));

    if (index === -1) {
      return { success: false, data: null, message: "User not found." };
    }

    if (data.Name) db.users[index].Name = data.Name.trim();
    if (data.Phone) db.users[index].Phone = data.Phone.trim();

    saveMockDB(db);
    const userSafe = { ...db.users[index] };
    delete userSafe.Password;

    return { success: true, data: userSafe, message: "Profile details updated successfully." };
  }

  return liveFetch(`/users/${userId}`, 'PUT', data);
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = db.users.find(u => u.User_ID === Number(userId));

    if (!user) {
      return { success: false, data: null, message: "User not found." };
    }

    if (user.Password !== currentPassword) {
      return { success: false, data: null, message: "Current password does not match." };
    }

    user.Password = newPassword;
    saveMockDB(db);
    return { success: true, data: null, message: "Password updated successfully." };
  }

  return liveFetch(`/users/${userId}/password`, 'PATCH', { currentPassword, newPassword });
}

// ==========================================================================
// 2. Vehicles
// ==========================================================================

export async function getVehicles(userId = null) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    let list = db.vehicles;
    if (userId !== null && userId !== undefined) {
      list = list.filter(v => v.User_ID === Number(userId));
    }
    return { success: true, data: list, message: "Vehicles retrieved." };
  }

  const query = userId ? `?userId=${userId}` : '';
  return liveFetch(`/vehicles${query}`);
}

export async function addVehicle(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const plate = (data.Vehicle_Number || '').trim().toUpperCase();
    const rfid = (data.RFID_Tag || '').trim().toUpperCase();

    // Check uniqueness
    if (db.vehicles.some(v => v.Vehicle_Number.toUpperCase() === plate)) {
      return { success: false, data: null, message: `Vehicle number '${plate}' is already registered.` };
    }
    if (db.vehicles.some(v => v.RFID_Tag.toUpperCase() === rfid)) {
      return { success: false, data: null, message: `RFID Tag '${rfid}' is already assigned to another vehicle.` };
    }

    const nextId = db.vehicles.length ? Math.max(...db.vehicles.map(v => v.Vehicle_ID)) + 1 : 1;
    const newVehicle = {
      Vehicle_ID: nextId,
      Vehicle_Number: plate,
      RFID_Tag: rfid,
      Brand: data.Brand.trim(),
      Color: data.Color || '#1E3A8A',
      User_ID: Number(data.User_ID)
    };

    db.vehicles.push(newVehicle);
    saveMockDB(db);

    return { success: true, data: newVehicle, message: "Vehicle added successfully." };
  }

  return liveFetch('/vehicles', 'POST', data);
}

export async function updateVehicle(id, data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const vehicleId = Number(id);
    const index = db.vehicles.findIndex(v => v.Vehicle_ID === vehicleId);

    if (index === -1) {
      return { success: false, data: null, message: "Vehicle not found." };
    }

    const plate = (data.Vehicle_Number || '').trim().toUpperCase();
    const rfid = (data.RFID_Tag || '').trim().toUpperCase();

    if (db.vehicles.some(v => v.Vehicle_ID !== vehicleId && v.Vehicle_Number.toUpperCase() === plate)) {
      return { success: false, data: null, message: `Vehicle number '${plate}' is already registered.` };
    }
    if (db.vehicles.some(v => v.Vehicle_ID !== vehicleId && v.RFID_Tag.toUpperCase() === rfid)) {
      return { success: false, data: null, message: `RFID Tag '${rfid}' is already registered.` };
    }

    db.vehicles[index] = {
      ...db.vehicles[index],
      Vehicle_Number: plate,
      RFID_Tag: rfid,
      Brand: data.Brand.trim(),
      Color: data.Color || db.vehicles[index].Color
    };

    saveMockDB(db);
    return { success: true, data: db.vehicles[index], message: "Vehicle updated successfully." };
  }

  return liveFetch(`/vehicles/${id}`, 'PUT', data);
}

export async function deleteVehicle(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const vehicleId = Number(id);

    // Guard: check if vehicle has active reservations
    const hasActive = db.reservations.some(r => r.Vehicle_ID === vehicleId && (r.Status === 'Active' || r.Status === 'Upcoming'));
    if (hasActive) {
      return {
        success: false,
        data: null,
        message: "Cannot delete vehicle with active or upcoming reservations. Please complete or cancel them first."
      };
    }

    db.vehicles = db.vehicles.filter(v => v.Vehicle_ID !== vehicleId);
    saveMockDB(db);
    return { success: true, data: null, message: "Vehicle deleted successfully." };
  }

  return liveFetch(`/vehicles/${id}`, 'DELETE');
}

// ==========================================================================
// 3. Parking Lots & Bays
// ==========================================================================

export async function getLots() {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    // Augment lots with live bay counts
    const lotsWithMetrics = db.lots.map(lot => {
      const lotBays = db.bays.filter(b => b.Lot_ID === lot.Lot_ID);
      const availableCount = lotBays.filter(b => b.Status === 'Available').length;
      const occupiedCount = lotBays.filter(b => b.Status === 'Occupied').length;
      const reservedCount = lotBays.filter(b => b.Status === 'Reserved').length;

      return {
        ...lot,
        Total_Bays: lotBays.length,
        Available_Bays: availableCount,
        Occupied_Bays: occupiedCount,
        Reserved_Bays: reservedCount,
        Occupancy_Percentage: lotBays.length ? Math.round((occupiedCount / lotBays.length) * 100) : 0
      };
    });

    return { success: true, data: lotsWithMetrics, message: "Parking lots retrieved." };
  }

  return liveFetch('/lots');
}

export async function getLot(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const lot = db.lots.find(l => l.Lot_ID === Number(id));
    if (!lot) return { success: false, data: null, message: "Parking lot not found." };
    return { success: true, data: lot, message: "Lot details retrieved." };
  }

  return liveFetch(`/lots/${id}`);
}

export async function addLot(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const nextId = db.lots.length ? Math.max(...db.lots.map(l => l.Lot_ID)) + 1 : 1;
    const newLot = {
      Lot_ID: nextId,
      Lot_Name: data.Lot_Name.trim(),
      Location: data.Location.trim(),
      Total_Bays: Number(data.Total_Bays) || 24,
      Open_Time: data.Open_Time || "06:00",
      Close_Time: data.Close_Time || "23:00"
    };

    db.lots.push(newLot);

    // Automatically provision default bays across floors
    const numFloors = Number(data.Floors) || (data.Bays_Per_Floor ? Math.max(1, Math.round((Number(data.Total_Bays) || 24) / Number(data.Bays_Per_Floor))) : 3);
    const perFloor = Number(data.Bays_Per_Floor) || Math.ceil((Number(data.Total_Bays) || 24) / numFloors);
    const bayCount = Number(data.Total_Bays) || (numFloors * perFloor);
    newLot.Total_Bays = bayCount;

    const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let nextBayId = db.bays.length ? Math.max(...db.bays.map(b => b.Bay_ID)) + 1 : 1;

    for (let f = 1; f <= numFloors; f++) {
      const pfx = prefixes[(f - 1) % prefixes.length];
      for (let s = 1; s <= perFloor; s++) {
        if ((f - 1) * perFloor + s > bayCount) break;
        const bayType = s <= 2 ? 'EV' : (s <= 3 ? 'Disabled' : (s <= 5 ? 'Compact' : 'Regular'));
        db.bays.push({
          Bay_ID: nextBayId++,
          Bay_Number: `${pfx}-${f}${String(s).padStart(2, '0')}`,
          Floor: `Floor ${f}`,
          Bay_Type: bayType,
          Status: 'Available',
          Lot_ID: newLot.Lot_ID
        });
      }
    }

    saveMockDB(db);
    return { success: true, data: newLot, message: "Parking lot created with default bays." };
  }

  return liveFetch('/admin/lots', 'POST', data);
}

export async function updateLot(id, data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const lotId = Number(id);
    const index = db.lots.findIndex(l => l.Lot_ID === lotId);

    if (index === -1) {
      return { success: false, data: null, message: "Parking lot not found." };
    }

    db.lots[index] = {
      ...db.lots[index],
      Lot_Name: data.Lot_Name.trim(),
      Location: data.Location.trim(),
      Open_Time: data.Open_Time,
      Close_Time: data.Close_Time
    };

    saveMockDB(db);
    return { success: true, data: db.lots[index], message: "Parking lot updated." };
  }

  return liveFetch(`/admin/lots/${id}`, 'PUT', data);
}

export async function deleteLot(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const lotId = Number(id);

    // Guard: check active reservations
    const lotBays = db.bays.filter(b => b.Lot_ID === lotId).map(b => b.Bay_ID);
    const hasActive = db.reservations.some(r => lotBays.includes(r.Bay_ID) && (r.Status === 'Active' || r.Status === 'Upcoming'));
    if (hasActive) {
      return {
        success: false,
        data: null,
        message: "Cannot delete lot with active or scheduled reservations."
      };
    }

    db.lots = db.lots.filter(l => l.Lot_ID !== lotId);
    db.bays = db.bays.filter(b => b.Lot_ID !== lotId);
    saveMockDB(db);

    return { success: true, data: null, message: "Parking lot and associated bays deleted." };
  }

  return liveFetch(`/admin/lots/${id}`, 'DELETE');
}

export async function getAdminBays(params = {}) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    let bays = (db.bays || []).map(b => {
      const lot = (db.lots || []).find(l => l.Lot_ID === b.Lot_ID);
      return {
        ...b,
        Lot_Name: lot ? lot.Lot_Name : `Lot #${b.Lot_ID}`
      };
    });

    const lotId = params.lot_id || params.lotId || params.lot;
    if (lotId && String(lotId).toLowerCase() !== 'all') {
      bays = bays.filter(b => b.Lot_ID === Number(lotId));
    }
    if (params.floor && String(params.floor).toLowerCase() !== 'all') {
      bays = bays.filter(b => String(b.Floor).toLowerCase().includes(String(params.floor).toLowerCase()));
    }
    const bayType = params.bay_type || params.bayType;
    if (bayType && String(bayType).toLowerCase() !== 'all') {
      bays = bays.filter(b => String(b.Bay_Type).toLowerCase() === String(bayType).toLowerCase());
    }
    if (params.status && String(params.status).toLowerCase() !== 'all') {
      bays = bays.filter(b => String(b.Status).toLowerCase() === String(params.status).toLowerCase());
    }

    return { success: true, data: bays, message: "Bays retrieved." };
  }

  const queryParams = new URLSearchParams();
  const lotId = params.lot_id || params.lotId || params.lot;
  if (lotId && String(lotId).toLowerCase() !== 'all') queryParams.set('lot_id', lotId);
  if (params.floor && String(params.floor).toLowerCase() !== 'all') queryParams.set('floor', params.floor);
  const bayType = params.bay_type || params.bayType;
  if (bayType && String(bayType).toLowerCase() !== 'all') queryParams.set('bay_type', bayType);
  if (params.status && String(params.status).toLowerCase() !== 'all') queryParams.set('status', params.status);

  const qs = queryParams.toString();
  return liveFetch(`/admin/bays${qs ? `?${qs}` : ''}`);
}

export async function getBays(lotId, floor = null) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    let bays = db.bays.filter(b => b.Lot_ID === Number(lotId));

    if (floor) {
      bays = bays.filter(b => b.Floor.toLowerCase() === floor.toLowerCase());
    }

    return { success: true, data: bays, message: "Bays retrieved." };
  }

  const query = floor ? `?floor=${encodeURIComponent(floor)}` : '';
  return liveFetch(`/lots/${lotId}/bays${query}`);
}

export async function addBay(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const lotId = Number(data.Lot_ID);
    const bayNum = data.Bay_Number.trim().toUpperCase();

    if (db.bays.some(b => b.Lot_ID === lotId && b.Bay_Number.toUpperCase() === bayNum)) {
      return { success: false, data: null, message: `Bay '${bayNum}' already exists in this lot.` };
    }

    const nextId = db.bays.length ? Math.max(...db.bays.map(b => b.Bay_ID)) + 1 : 1;
    const newBay = {
      Bay_ID: nextId,
      Bay_Number: bayNum,
      Floor: data.Floor || "Floor 1",
      Bay_Type: data.Bay_Type || "Regular",
      Status: data.Status || "Available",
      Lot_ID: lotId
    };

    db.bays.push(newBay);
    // Update total bays count in lot
    const lot = db.lots.find(l => l.Lot_ID === lotId);
    if (lot) lot.Total_Bays = db.bays.filter(b => b.Lot_ID === lotId).length;

    saveMockDB(db);
    return { success: true, data: newBay, message: "Parking bay added successfully." };
  }

  return liveFetch('/admin/bays', 'POST', data);
}

export async function updateBay(id, data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const bayId = Number(id);
    const index = db.bays.findIndex(b => b.Bay_ID === bayId);

    if (index === -1) {
      return { success: false, data: null, message: "Parking bay not found." };
    }

    const bayNum = data.Bay_Number.trim().toUpperCase();
    const lotId = Number(data.Lot_ID || db.bays[index].Lot_ID);

    if (db.bays.some(b => b.Bay_ID !== bayId && b.Lot_ID === lotId && b.Bay_Number.toUpperCase() === bayNum)) {
      return { success: false, data: null, message: `Bay '${bayNum}' already exists in this lot.` };
    }

    db.bays[index] = {
      ...db.bays[index],
      Bay_Number: bayNum,
      Floor: data.Floor || db.bays[index].Floor,
      Bay_Type: data.Bay_Type || db.bays[index].Bay_Type,
      Status: data.Status || db.bays[index].Status
    };

    saveMockDB(db);
    return { success: true, data: db.bays[index], message: "Parking bay updated." };
  }

  return liveFetch(`/admin/bays/${id}`, 'PUT', data);
}

export async function deleteBay(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const bayId = Number(id);

    const hasActive = db.reservations.some(r => r.Bay_ID === bayId && (r.Status === 'Active' || r.Status === 'Upcoming'));
    if (hasActive) {
      return { success: false, data: null, message: "Cannot delete bay currently reserved or in an active session." };
    }

    const bay = db.bays.find(b => b.Bay_ID === bayId);
    db.bays = db.bays.filter(b => b.Bay_ID !== bayId);

    if (bay) {
      const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID);
      if (lot) lot.Total_Bays = db.bays.filter(b => b.Lot_ID === lot.Lot_ID).length;
    }

    saveMockDB(db);
    return { success: true, data: null, message: "Parking bay deleted." };
  }

  return liveFetch(`/admin/bays/${id}`, 'DELETE');
}

// ==========================================================================
// 4. Reservations & Booking
// ==========================================================================

export function calculateReservationCost(bayType = 'Regular', startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const minutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (minutes <= 0) return 0;
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const rate = TARIFF_RATES[bayType] || TARIFF_RATES.Regular;
  return hours * rate;
}

export async function createReservation(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const bookingDate = data.Booking_Date;
    const startTime = data.Start_Time;
    const endTime = data.End_Time;
    const bayId = Number(data.Bay_ID);
    const vehicleId = Number(data.Vehicle_ID);

    // Business Rule 1: Booking Date cannot be in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (bookingDate < todayStr) {
      return { success: false, data: null, message: "Booking date cannot be in the past." };
    }

    // Business Rule 2: End_Time must be after Start_Time
    if (endTime <= startTime) {
      return { success: false, data: null, message: "End time must be after start time." };
    }

    // Business Rule 3: Check bay exists and is available
    const bay = db.bays.find(b => b.Bay_ID === bayId);
    if (!bay) {
      return { success: false, data: null, message: "Selected parking bay was not found." };
    }

    // Business Rule 4: Overlapping reservations check for this bay on this date
    const overlaps = db.reservations.some(r => {
      if (r.Bay_ID !== bayId || r.Booking_Date !== bookingDate) return false;
      if (r.Status === 'Cancelled' || r.Status === 'Completed') return false;
      // Overlap: existingStart < newEnd && newStart < existingEnd
      return (r.Start_Time < endTime && startTime < r.End_Time);
    });

    if (overlaps) {
      return {
        success: false,
        data: null,
        message: "This parking bay has already been booked by another driver for the selected time window. Please choose another bay."
      };
    }

    const nextResId = db.reservations.length ? Math.max(...db.reservations.map(r => r.Reservation_ID)) + 1 : 101;
    const isToday = bookingDate === todayStr;
    const status = isToday ? 'Active' : 'Upcoming';

    const newRes = {
      Reservation_ID: nextResId,
      Booking_Date: bookingDate,
      Start_Time: startTime,
      End_Time: endTime,
      Status: status,
      Vehicle_ID: vehicleId,
      Bay_ID: bayId
    };

    db.reservations.push(newRes);

    // Update bay status
    bay.Status = isToday ? 'Occupied' : 'Reserved';

    // Calculate cost and generate payment record
    const cost = calculateReservationCost(bay.Bay_Type, startTime, endTime);
    const nextPayId = db.payments.length ? Math.max(...db.payments.map(p => p.Payment_ID)) + 1 : 301;
    const txnId = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newPayment = {
      Payment_ID: nextPayId,
      Amount: cost,
      Payment_Type: "Reservation Fee",
      Payment_Mode: data.Payment_Mode || "UPI",
      Transaction_ID: txnId,
      Payment_Status: data.AutoPay ? "Paid" : "Pending",
      Payment_Date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      Reservation_ID: nextResId
    };
    db.payments.push(newPayment);

    // If reservation is Active today, create an active parking session
    if (status === 'Active') {
      const nextSessionId = db.sessions.length ? Math.max(...db.sessions.map(s => s.Session_ID)) + 1 : 201;
      db.sessions.push({
        Session_ID: nextSessionId,
        Entry_Time: new Date().toISOString(),
        Exit_Time: null,
        Reservation_ID: nextResId,
        Vehicle_ID: vehicleId,
        Bay_ID: bayId,
        Duration: "Live",
        Overstay_Minutes: 0,
        Penalty_Amount: 0.00
      });
    }

    saveMockDB(db);

    return {
      success: true,
      data: { reservation: newRes, payment: newPayment },
      message: `Reservation confirmed for Bay ${bay.Bay_Number}!`
    };
  }

  return liveFetch('/reservations', 'POST', data);
}

export async function cancelReservation(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const resId = Number(id);
    const res = db.reservations.find(r => r.Reservation_ID === resId);

    if (!res) {
      return { success: false, data: null, message: "Reservation not found." };
    }

    if (res.Status === 'Completed' || res.Status === 'Cancelled') {
      return { success: false, data: null, message: `Reservation is already ${res.Status.toLowerCase()}.` };
    }

    res.Status = 'Cancelled';

    // Free the bay
    const bay = db.bays.find(b => b.Bay_ID === res.Bay_ID);
    if (bay) {
      bay.Status = 'Available';
    }

    // If there is an active session, mark ended
    const session = db.sessions.find(s => s.Reservation_ID === resId && !s.Exit_Time);
    if (session) {
      session.Exit_Time = new Date().toISOString();
      session.Duration = "Cancelled";
    }

    saveMockDB(db);
    return { success: true, data: res, message: "Reservation cancelled and parking space released." };
  }

  return liveFetch(`/reservations/${id}/cancel`, 'PATCH');
}

export async function getReservations(filters = {}) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    let results = db.reservations.map(r => {
      const vehicle = db.vehicles.find(v => v.Vehicle_ID === r.Vehicle_ID) || {};
      const bay = db.bays.find(b => b.Bay_ID === r.Bay_ID) || {};
      const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID) || {};
      const user = db.users.find(u => u.User_ID === vehicle.User_ID) || {};
      const payment = db.payments.find(p => p.Reservation_ID === r.Reservation_ID && p.Payment_Type === 'Reservation Fee') || null;

      return {
        ...r,
        Vehicle_Number: vehicle.Vehicle_Number || 'N/A',
        Vehicle_Brand: vehicle.Brand || 'N/A',
        Vehicle_Color: vehicle.Color || '#94A3B8',
        User_ID: vehicle.User_ID,
        User_Name: user.Name || 'N/A',
        User_Email: user.Email || 'N/A',
        Bay_Number: bay.Bay_Number || 'N/A',
        Bay_Type: bay.Bay_Type || 'Regular',
        Floor: bay.Floor || 'Floor 1',
        Lot_ID: lot.Lot_ID,
        Lot_Name: lot.Lot_Name || 'N/A',
        Payment_ID: payment?.Payment_ID,
        Payment_Status: payment?.Payment_Status || 'Pending',
        Amount: payment?.Amount || 0
      };
    });

    if (filters.userId) {
      results = results.filter(r => r.User_ID === Number(filters.userId));
    }
    if (filters.status && filters.status !== 'All') {
      results = results.filter(r => r.Status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.lotId) {
      results = results.filter(r => r.Lot_ID === Number(filters.lotId));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(r =>
        r.Vehicle_Number.toLowerCase().includes(q) ||
        r.Bay_Number.toLowerCase().includes(q) ||
        r.Lot_Name.toLowerCase().includes(q) ||
        r.User_Name.toLowerCase().includes(q)
      );
    }

    // Sort newest reservations first
    results.sort((a, b) => b.Reservation_ID - a.Reservation_ID);

    return { success: true, data: results, message: "Reservations retrieved." };
  }

  const params = new URLSearchParams(filters).toString();
  return liveFetch(`/reservations?${params}`);
}

// ==========================================================================
// 5. Parking Sessions
// ==========================================================================

export async function getSessions(filters = {}) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    let list = db.sessions.map(s => {
      const vehicle = db.vehicles.find(v => v.Vehicle_ID === s.Vehicle_ID) || {};
      const bay = db.bays.find(b => b.Bay_ID === s.Bay_ID) || {};
      const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID) || {};
      const res = db.reservations.find(r => r.Reservation_ID === s.Reservation_ID) || {};
      const user = db.users.find(u => u.User_ID === vehicle.User_ID) || {};

      return {
        ...s,
        Vehicle_Number: vehicle.Vehicle_Number || 'N/A',
        Vehicle_Brand: vehicle.Brand || 'N/A',
        RFID_Tag: vehicle.RFID_Tag || 'N/A',
        User_ID: vehicle.User_ID,
        User_Name: user.Name || 'N/A',
        Bay_Number: bay.Bay_Number || 'N/A',
        Bay_Type: bay.Bay_Type || 'Regular',
        Floor: bay.Floor || 'Floor 1',
        Lot_ID: lot.Lot_ID,
        Lot_Name: lot.Lot_Name || 'N/A',
        Scheduled_End: res.End_Time || 'N/A'
      };
    });

    if (filters.userId) {
      list = list.filter(s => s.User_ID === Number(filters.userId));
    }
    if (filters.activeOnly) {
      list = list.filter(s => !s.Exit_Time);
    }
    if (filters.lotId) {
      list = list.filter(s => s.Lot_ID === Number(filters.lotId));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(s =>
        s.Vehicle_Number.toLowerCase().includes(q) ||
        s.RFID_Tag.toLowerCase().includes(q) ||
        s.Bay_Number.toLowerCase().includes(q) ||
        s.Lot_Name.toLowerCase().includes(q) ||
        s.User_Name.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.Session_ID - a.Session_ID);
    return { success: true, data: list, message: "Parking sessions retrieved." };
  }

  const params = new URLSearchParams(filters).toString();
  return liveFetch(`/sessions?${params}`);
}

export async function getActiveSessionForUser(userId) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const userVehicles = db.vehicles.filter(v => v.User_ID === Number(userId)).map(v => v.Vehicle_ID);
    const active = db.sessions.find(s => userVehicles.includes(s.Vehicle_ID) && !s.Exit_Time);

    if (!active) {
      return { success: true, data: null, message: "No active parking session found." };
    }

    const vehicle = db.vehicles.find(v => v.Vehicle_ID === active.Vehicle_ID) || {};
    const bay = db.bays.find(b => b.Bay_ID === active.Bay_ID) || {};
    const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID) || {};
    const res = db.reservations.find(r => r.Reservation_ID === active.Reservation_ID) || {};
    const payment = db.payments.find(p => p.Reservation_ID === active.Reservation_ID) || {};

    const enriched = {
      ...active,
      Vehicle_Number: vehicle.Vehicle_Number,
      Vehicle_Brand: vehicle.Brand,
      Vehicle_Color: vehicle.Color,
      RFID_Tag: vehicle.RFID_Tag,
      Bay_Number: bay.Bay_Number,
      Bay_Type: bay.Bay_Type,
      Floor: bay.Floor,
      Lot_Name: lot.Lot_Name,
      Start_Time: res.Start_Time,
      End_Time: res.End_Time,
      Amount: payment.Amount || 0,
      Tariff_Rate: TARIFF_RATES[bay.Bay_Type] || 40
    };

    return { success: true, data: enriched, message: "Active telemetry session retrieved." };
  }

  return liveFetch(`/sessions/active?userId=${userId}`);
}

export async function markExit(sessionId) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const sId = Number(sessionId);
    const session = db.sessions.find(s => s.Session_ID === sId);

    if (!session) {
      return { success: false, data: null, message: "Session not found." };
    }
    if (session.Exit_Time) {
      return { success: false, data: null, message: "Session has already exited." };
    }

    const now = new Date();
    session.Exit_Time = now.toISOString();

    // Calculate duration in hours & minutes
    const entryDate = new Date(session.Entry_Time);
    const diffMs = now - entryDate;
    const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    session.Duration = `${h}h ${m}m`;

    // Overstay check against reservation scheduled End_Time
    const res = db.reservations.find(r => r.Reservation_ID === session.Reservation_ID);
    let overstayMinutes = 0;
    let penaltyAmount = 0;

    if (res && res.End_Time) {
      const [endH, endM] = res.End_Time.split(':').map(Number);
      const scheduledEnd = new Date(entryDate);
      scheduledEnd.setHours(endH, endM, 0, 0);

      if (now > scheduledEnd) {
        overstayMinutes = Math.round((now - scheduledEnd) / (1000 * 60));
        penaltyAmount = overstayMinutes * 2; // Business Rule: Penalty 2 INR per minute
      }
    }

    session.Overstay_Minutes = overstayMinutes;
    session.Penalty_Amount = penaltyAmount;

    // Free the parking bay
    const bay = db.bays.find(b => b.Bay_ID === session.Bay_ID);
    if (bay) bay.Status = 'Available';

    // Mark reservation as completed
    if (res) res.Status = 'Completed';

    // If penalty generated, create a pending Penalty payment
    if (penaltyAmount > 0) {
      const nextPayId = db.payments.length ? Math.max(...db.payments.map(p => p.Payment_ID)) + 1 : 301;
      db.payments.push({
        Payment_ID: nextPayId,
        Amount: penaltyAmount,
        Payment_Type: "Penalty",
        Payment_Mode: "UPI",
        Transaction_ID: `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        Payment_Status: "Pending",
        Payment_Date: now.toISOString().replace('T', ' ').substring(0, 19),
        Reservation_ID: session.Reservation_ID
      });
    }

    saveMockDB(db);
    return {
      success: true,
      data: session,
      message: penaltyAmount > 0
        ? `Exit registered. Overstay of ${overstayMinutes} mins flagged. Penalty of ₹${penaltyAmount} generated.`
        : "Exit registered successfully. Parking space is now available."
    };
  }

  return liveFetch(`/sessions/${sessionId}/exit`, 'PATCH');
}

// ==========================================================================
// 6. Payments
// ==========================================================================

export async function getPayments(filters = {}) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    let list = db.payments.map(p => {
      const res = db.reservations.find(r => r.Reservation_ID === p.Reservation_ID) || {};
      const vehicle = db.vehicles.find(v => v.Vehicle_ID === res.Vehicle_ID) || {};
      const user = db.users.find(u => u.User_ID === vehicle.User_ID) || {};
      const bay = db.bays.find(b => b.Bay_ID === res.Bay_ID) || {};
      const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID) || {};

      return {
        ...p,
        User_ID: vehicle.User_ID,
        User_Name: user.Name || 'N/A',
        Vehicle_Number: vehicle.Vehicle_Number || 'N/A',
        Bay_Number: bay.Bay_Number || 'N/A',
        Lot_Name: lot.Lot_Name || 'N/A'
      };
    });

    if (filters.userId) {
      list = list.filter(p => p.User_ID === Number(filters.userId));
    }
    if (filters.status && filters.status !== 'All') {
      list = list.filter(p => p.Payment_Status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.type && filters.type !== 'All') {
      list = list.filter(p => p.Payment_Type.toLowerCase() === filters.type.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p =>
        p.Transaction_ID.toLowerCase().includes(q) ||
        p.Vehicle_Number.toLowerCase().includes(q) ||
        p.User_Name.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.Payment_ID - a.Payment_ID);
    return { success: true, data: list, message: "Payments retrieved." };
  }

  const params = new URLSearchParams(filters).toString();
  return liveFetch(`/payments?${params}`);
}

export async function payPayment(paymentId, paymentMode = 'UPI') {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const pId = Number(paymentId);
    const payment = db.payments.find(p => p.Payment_ID === pId);

    if (!payment) {
      return { success: false, data: null, message: "Payment record not found." };
    }
    if (payment.Payment_Status === 'Paid') {
      return { success: false, data: null, message: "Payment is already completed." };
    }

    payment.Payment_Status = 'Paid';
    payment.Payment_Mode = paymentMode;
    payment.Payment_Date = new Date().toISOString().replace('T', ' ').substring(0, 19);
    payment.Transaction_ID = `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    saveMockDB(db);
    return { success: true, data: payment, message: `Payment of ₹${payment.Amount} completed successfully via ${paymentMode}!` };
  }

  return liveFetch(`/payments/${paymentId}/pay`, 'POST', { paymentMode });
}

// ==========================================================================
// 7. Admin Dashboard Analytics & Management
// ==========================================================================

export async function getAdminStats() {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const totalRevenue = db.payments
      .filter(p => p.Payment_Status === 'Paid')
      .reduce((sum, p) => sum + p.Amount, 0);

    const pendingRevenue = db.payments
      .filter(p => p.Payment_Status === 'Pending')
      .reduce((sum, p) => sum + p.Amount, 0);

    const totalBays = db.bays.length;
    const occupiedBays = db.bays.filter(b => b.Status === 'Occupied').length;
    const reservedBays = db.bays.filter(b => b.Status === 'Reserved').length;
    const availableBays = db.bays.filter(b => b.Status === 'Available').length;
    const overallOccupancyPct = totalBays ? Math.round((occupiedBays / totalBays) * 100) : 0;

    const activeSessionsCount = db.sessions.filter(s => !s.Exit_Time).length;
    const overstayCount = db.sessions.filter(s => s.Overstay_Minutes > 0).length;

    // Chart 1: Lot capacity vs occupancy
    const lotChartData = db.lots.map(l => {
      const bays = db.bays.filter(b => b.Lot_ID === l.Lot_ID);
      const occ = bays.filter(b => b.Status === 'Occupied').length;
      const res = bays.filter(b => b.Status === 'Reserved').length;
      const free = bays.filter(b => b.Status === 'Available').length;
      return {
        name: l.Lot_Name.replace(' Facility', '').replace(' Multilevel', '').replace(' Deck', ''),
        occupied: occ,
        reserved: res,
        available: free,
        total: bays.length
      };
    });

    // Chart 2: Daily revenue trend (last 7 days simulation)
    const revenueTrend = [
      { day: 'Mon', revenue: 640 },
      { day: 'Tue', revenue: 780 },
      { day: 'Wed', revenue: 920 },
      { day: 'Thu', revenue: 1100 },
      { day: 'Fri', revenue: 1350 },
      { day: 'Sat', revenue: 1680 },
      { day: 'Today', revenue: Math.round(totalRevenue * 0.4) }
    ];

    // Recent overstay records for audit table
    const overstays = db.sessions
      .filter(s => s.Overstay_Minutes > 0)
      .map(s => {
        const vehicle = db.vehicles.find(v => v.Vehicle_ID === s.Vehicle_ID) || {};
        const bay = db.bays.find(b => b.Bay_ID === s.Bay_ID) || {};
        const lot = db.lots.find(l => l.Lot_ID === bay.Lot_ID) || {};
        return {
          Session_ID: s.Session_ID,
          Vehicle_Number: vehicle.Vehicle_Number || 'N/A',
          Bay_Number: bay.Bay_Number || 'N/A',
          Lot_Name: lot.Lot_Name || 'N/A',
          Overstay_Minutes: s.Overstay_Minutes,
          Penalty_Amount: s.Penalty_Amount,
          Status: s.Exit_Time ? 'Exited' : 'Active Live'
        };
      });

    return {
      success: true,
      data: {
        totalRevenue,
        pendingRevenue,
        totalBays,
        occupiedBays,
        reservedBays,
        availableBays,
        overallOccupancyPct,
        activeSessionsCount,
        overstayCount,
        lotChartData,
        revenueTrend,
        overstays
      },
      message: "Admin statistics compiled."
    };
  }

  return liveFetch('/admin/stats');
}

export async function getUsers(filters = {}) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    let list = db.users.map(u => {
      const userVehicles = db.vehicles.filter(v => v.User_ID === u.User_ID);
      const userReservations = db.reservations.filter(r => userVehicles.some(v => v.Vehicle_ID === r.Vehicle_ID));

      const safeUser = { ...u };
      delete safeUser.Password;
      return {
        ...safeUser,
        Vehicle_Count: userVehicles.length,
        Reservation_Count: userReservations.length
      };
    });

    if (filters.role && filters.role !== 'All') {
      list = list.filter(u => u.Role.toLowerCase() === filters.role.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(u =>
        u.Name.toLowerCase().includes(q) ||
        u.Email.toLowerCase().includes(q) ||
        u.Phone.includes(q)
      );
    }

    return { success: true, data: list, message: "Users retrieved." };
  }

  const params = new URLSearchParams(filters).toString();
  return liveFetch(`/admin/users?${params}`);
}

export async function addUser(data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();

    const cleanEmail = (data.Email || '').trim().toLowerCase();
    if (db.users.some(u => u.Email.toLowerCase() === cleanEmail)) {
      return { success: false, data: null, message: "User with this email already exists." };
    }

    const nextId = db.users.length ? Math.max(...db.users.map(u => u.User_ID)) + 1 : 1;
    const newUser = {
      User_ID: nextId,
      Name: data.Name.trim(),
      Email: cleanEmail,
      Phone: data.Phone.trim(),
      Password: data.Password || '123456',
      Role: data.Role || 'User'
    };

    db.users.push(newUser);
    saveMockDB(db);

    const safeUser = { ...newUser };
    delete safeUser.Password;
    return { success: true, data: safeUser, message: "User created successfully." };
  }

  return liveFetch('/admin/users', 'POST', data);
}

export async function updateUser(id, data) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const userId = Number(id);
    const index = db.users.findIndex(u => u.User_ID === userId);

    if (index === -1) {
      return { success: false, data: null, message: "User not found." };
    }

    const cleanEmail = (data.Email || '').trim().toLowerCase();
    if (db.users.some(u => u.User_ID !== userId && u.Email.toLowerCase() === cleanEmail)) {
      return { success: false, data: null, message: "Email is already taken by another user." };
    }

    db.users[index] = {
      ...db.users[index],
      Name: data.Name.trim(),
      Email: cleanEmail,
      Phone: data.Phone.trim(),
      Role: data.Role || db.users[index].Role
    };

    saveMockDB(db);
    const safeUser = { ...db.users[index] };
    delete safeUser.Password;
    return { success: true, data: safeUser, message: "User updated successfully." };
  }

  return liveFetch(`/admin/users/${id}`, 'PUT', data);
}

export async function deleteUser(id) {
  if (CONFIG.USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const userId = Number(id);

    // Prevent deleting active user or admin 1
    if (userId === 1 || userId === 9) {
      return { success: false, data: null, message: "Demo primary accounts cannot be deleted." };
    }

    db.users = db.users.filter(u => u.User_ID !== userId);
    // Cascade delete vehicles
    db.vehicles = db.vehicles.filter(v => v.User_ID !== userId);

    saveMockDB(db);
    return { success: true, data: null, message: "User account and registered vehicles removed." };
  }

  return liveFetch(`/admin/users/${id}`, 'DELETE');
}
