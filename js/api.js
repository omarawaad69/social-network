// js/api.js
const API_BASE = 'https://social-api.omarawaad69.workers.dev'; // استبدل XXXXX بالخاص بك

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

async function apiPostFormData(path, formData) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  });
  return res.json();
}
