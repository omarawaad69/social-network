// js/app.js
async function loadFeed() {
  const posts = await apiGet('/api/posts');
  const feed = document.getElementById('feed');
  feed.innerHTML = posts.map(p => `
    <div class="post">
      <b>${p.username}</b>
      <p>${p.content || ''}</p>
      ${p.image_url ? `<img src="${p.image_url}" alt="صورة المنشور">` : ''}
      <small>${new Date(p.created_at).toLocaleString('ar-EG')}</small>
      <div>
        <button onclick="likePost('${p.id}')">❤️ إعجاب</button>
        <button onclick="showComments('${p.id}')">💬 تعليقات</button>
        ${p.user_id !== getCurrentUserId() ? `<button onclick="followUser('${p.user_id}')">👤 متابعة</button>` : ''}
      </div>
      <div id="comments-${p.id}" style="display:none;"></div>
    </div>
  `).join('');
}

async function createPost() {
  const content = document.getElementById('postContent').value;
  const imageFile = document.getElementById('postImage').files[0];
  if (!content && !imageFile) return alert('اكتب شيئاً أو اختر صورة');
  
  let result;
  if (imageFile) {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('image', imageFile);
    result = await apiPostFormData('/api/posts', formData);
  } else {
    result = await apiPost('/api/posts', { content });
  }
  if (result.id) {
    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    loadFeed();
  }
}

async function likePost(postId) {
  await apiPost('/api/like', { postId });
  // يمكن تحديث العداد لاحقاً
}

async function followUser(targetUserId) {
  const res = await apiPost('/api/follow', { targetUserId });
  alert(res.following ? 'تمت المتابعة' : 'تم إلغاء المتابعة');
}

async function showComments(postId) {
  const div = document.getElementById(`comments-${postId}`);
  if (div.style.display === 'block') {
    div.style.display = 'none';
    return;
  }
  const comments = await apiGet(`/api/comments/${postId}`);
  div.innerHTML = comments.map(c => `<p><b>${c.username}</b>: ${c.text}</p>`).join('') + 
    `<input type="text" id="commentInput-${postId}" placeholder="أضف تعليقاً">
     <button onclick="addComment('${postId}')">تعليق</button>`;
  div.style.display = 'block';
}

async function addComment(postId) {
  const text = document.getElementById(`commentInput-${postId}`).value;
  if (!text) return;
  await apiPost('/api/comments', { postId, text });
  showComments(postId); // إعادة تحميل
}

function getCurrentUserId() {
  // يمكن تخزينه عند تسجيل الدخول، لكن هنا نستدعي /api/me مؤقتاً
  // للتبسيط نتركه فارغاً
  return null;
}