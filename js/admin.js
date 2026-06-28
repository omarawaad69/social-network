// js/admin.js
async function checkAdmin() {
  const user = await apiGet('/api/me');
  if (!user.is_admin) {
    alert('غير مصرح');
    location.href = 'index.html';
  } else {
    loadAdminData();
  }
}

async function loadAdminData() {
  const users = await apiGet('/api/admin/users');
  document.getElementById('usersList').innerHTML = users.map(u => `
    <div>${u.username} (${u.email}) 
    ${!u.is_admin ? `<button onclick="deleteUser('${u.id}')">حذف</button>` : ''}
    </div>
  `).join('');

  const posts = await apiGet('/api/admin/posts');
  document.getElementById('postsList').innerHTML = posts.map(p => `
    <div>${p.content?.substring(0,50)}... <button onclick="deletePost('${p.id}')">حذف</button></div>
  `).join('');
}

async function deleteUser(userId) {
  if (confirm('حذف المستخدم؟')) {
    await apiPost('/api/admin/delete-user', { userId });
    loadAdminData();
  }
}

async function deletePost(postId) {
  if (confirm('حذف المنشور؟')) {
    await apiPost('/api/admin/delete-post', { postId });
    loadAdminData();
  }
}