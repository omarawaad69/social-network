// js/api.js
const API_BASE = 'https://social-api.omarawaad69.workers.dev'; // نفس النطاق لأن Worker مربوط بنفس Pages عبر وظيفة Functions أو route

function getToken() {
  return localStorage.getItem('token');
}
function setToken(token) {
  localStorage.setItem('token', token);
}
function logout() {
  localStorage.removeItem('token');
  location.href = 'login.html';
}

async function apiPost(path, body) {
  const res = await fetch(path, {
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
  const res = await fetch(path, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}

// رفع صورة مع بيانات
async function apiPostFormData(path, formData) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  });
  return res.json();
}
