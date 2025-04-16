let editingId = null;

    async function fetchBlogs() {
      const res = await fetch('/api/blogs');
      const blogs = await res.json();
      const container = document.getElementById('blogs');
      container.innerHTML = '';

      blogs.forEach(blog => {
        const div = document.createElement('div');
        div.className = 'blog-card';
        div.innerHTML = `
          <h3>${blog.title}</h3>
          <p><b>Описание:</b> ${blog.description || ''}</p>
          <button onclick="openBlog(${blog.id})">Открыть</button>
          <button onclick="openEdit(${blog.id}, \`${blog.title}\`, \`${blog.description || ''}\`, \`${blog.content.replace(/`/g, '\\`')}\`)">Изменить</button>
          <button onclick="deleteBlog(${blog.id})">Удалить</button>
        `;
        container.appendChild(div);
      });
    }

    async function addBlog() {
      const title = document.getElementById('title').value;
      const description = document.getElementById('description').value;
      const content = document.getElementById('content').value;

      await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, description })
      });

      document.getElementById('title').value = '';
      document.getElementById('description').value = '';
      document.getElementById('content').value = '';
      fetchBlogs();
    }

    function openEdit(id, title, description, content) {
      editingId = id;
      document.getElementById('editTitle').value = title;
      document.getElementById('editDescription').value = description;
      document.getElementById('editContent').value = content;
      document.getElementById('editModal').style.display = 'block';
    }

    async function saveEdit() {
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      const content = document.getElementById('editContent').value;

      await fetch(`/api/blogs/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, content })
      });

      closeEdit();
      fetchBlogs();
    }

    function closeEdit() {
      editingId = null;
      document.getElementById('editModal').style.display = 'none';
    }

    function deleteBlog(id) {
  if (confirm('Вы уверены, что хотите удалить этот блог? Это действие необратимо.')) {
    fetch(`/api/blogs/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Блог удален');
          location.reload();
        }
      });
  }
}
    function openBlog(id) {
  window.open(`/blog.html?id=${id}`, '_blank');
}

    fetchBlogs();