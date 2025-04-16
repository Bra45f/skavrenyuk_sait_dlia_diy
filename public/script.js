const blogId = new URLSearchParams(window.location.search).get('id');


function change(id) {
    var stars = document.getElementsByClassName('rating-star');
    var rating = document.getElementById(id + '_hidden').value;
    
    for(var i = 0; i < stars.length; i++) {
        if(i < rating) {
            stars[i].src = 'IMG-TEST/fi-sr-star2.png';
        } else {
            stars[i].src = 'IMG-TEST/fi-rr-star.png';
        }
    }
    
    document.getElementById('ratingValue').value = rating;
}

async function sendComment() {
    const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    alert('Пожалуйста, войдите в аккаунт, чтобы оставить комментарий.');
    window.location.href = "/login.html";
    return;
  }

  const comment = document.getElementById('comment').value;
  const id = new URLSearchParams(window.location.search).get('id');

  await fetch(`/api/blogs/${id}/comments`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ text: comment })
  });

  document.getElementById('comment').value = '';
  loadComments();
}


async function loadComments() {
    const blogId = new URLSearchParams(window.location.search).get('id');

    try {
        const res = await fetch(`/api/blogs/${blogId}/comments`);
        const comments = await res.json();
        const container = document.getElementById('comments');
        container.innerHTML = comments.map(c => `<p>${c.text}</p>`).join('');
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
    }
}

async function fetchAverageRating() {
    const blogId = new URLSearchParams(window.location.search).get('id');

    try {
        const response = await fetch(`/api/blogs/${blogId}/average_rating`);
        const data = await response.json();
        const average = isNaN(data.average_rating) ? 0.0 : data.average_rating;
        document.getElementById('averageRating').innerText = average.toFixed(1);
    } catch (error) {
        console.error('Ошибка загрузки среднего рейтинга:', error);
    }
}

// Загружаем средний рейтинг при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    fetchAverageRating();
    loadComments();
});

const checkLogin = async () => {
    const res = await fetch('/api/session');
    const data = await res.json();
    return data.loggedIn;
  }

async function saveRating() {
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) {
      alert('Пожалуйста, войдите в аккаунт, чтобы оценить блог.');
      window.location.href = "/login.html";
      return;
    }
    const rating = document.getElementById('ratingValue').value;
    const blogId = new URLSearchParams(window.location.search).get('id');

    try {
        const response = await fetch(`/api/blogs/${blogId}/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });

        const data = await response.json();
        alert('Спасибо за ваш отзыв!');
        fetchAverageRating();
    } catch (error) {
        console.error('Ошибка при сохранении рейтинга:', error);
        alert('Ошибка при сохранении рейтинга');
    }
}
