// js/api.js
const API_BASE = 'https://social-api.omarawaad69.workers.dev'; // ⚠️ استبدل XXXXX

function getToken() { return localStorage.getItem('token'); }
function setToken(token) { localStorage.setItem('token', token); }
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(body)
  });
  return res.json();
}

// رفع ملفات مع FormData (بدون Content-Type)
async function apiPostFormData(path, formData) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
    },
    body: formData
  });
  // محاولة تحليل JSON حتى لو فشل (الخادم يرجع دائمًا JSON)
  return res.json();
}
