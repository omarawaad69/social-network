// js/api.js - ماي سمسم
const API_BASE = 'https://social-api.omarawaad69.workers.dev'; // ⚠️ استبدل XXXXX بالخاص بك

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// إرسال بيانات JSON
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

// جلب البيانات
async function apiGet(path) {
  const res = await fetch(API_BASE + path, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  return res.json();
}

// رفع ملفات (FormData) - **لا نحدد Content-Type يدويًا**
async function apiPostFormData(path, formData) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
      // نترك Content-Type فارغًا ليضبطه المتصفح تلقائيًا مع الحدود (boundary)
    },
    body: formData
  });
  return res.json();
}
