const blogId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!blogId) {
        console.error("blogId не найден в URL");
        return;
    }
    fetchAverageRating();
    loadComments();
    loadUserRating();
});

// Проверка логина
const checkLogin = async () => {
    const res = await fetch('/api/session');
    const data = await res.json();
    return data.loggedIn;
};

// Переключение звёздочек
function change(id) {
    const stars = document.getElementsByClassName('rating-star');
    const rating = document.getElementById(id + '_hidden').value;
    
    for (let i = 0; i < stars.length; i++) {
        if (i < rating) {
            stars[i].src = 'IMG-TEST/fi-sr-star2.png';
        } else {
            stars[i].src = 'IMG-TEST/fi-rr-star.png';
        }
    }
    
    document.getElementById('ratingValue').value = rating;
}

// Отправка комментария
async function sendComment() {
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) {
        alert('Пожалуйста, войдите в аккаунт, чтобы оставить комментарий.');
        window.location.href = "/login.html";
        return;
    }

    const comment = document.getElementById('comment').value;
    if (!comment.trim()) {
        alert('Комментарий не может быть пустым.');
        return;
    }

    try {
        await fetch(`/api/blogs/${blogId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: comment })
        });

        document.getElementById('comment').value = '';
        await loadComments();
    } catch (error) {
        console.error('Ошибка при отправке комментария:', error);
        alert('Ошибка при отправке комментария.');
    }
}

// Загрузка комментариев
async function loadComments() {
    try {
        const res = await fetch(`/api/blogs/${blogId}/comments`);
        const comments = await res.json();
        const container = document.getElementById('comments');
        container.innerHTML = comments.map(c => `<p><b>${c.username}:</b> ${c.text}</p>`).join('');
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
    }
}

// Получение среднего рейтинга
async function fetchAverageRating() {
    try {
        const response = await fetch(`/api/blogs/${blogId}/average_rating`);
        const data = await response.json();
        const average = data.average_rating !== null ? parseFloat(data.average_rating).toFixed(1) : "0.0";
        document.getElementById('averageRating').innerText = average;
    } catch (error) {
        console.error('Ошибка загрузки среднего рейтинга:', error);
    }
}

// Сохранение оценки
async function saveRating() {
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) {
        alert('Пожалуйста, войдите в аккаунт, чтобы оценить блог.');
        window.location.href = "/login.html";
        return;
    }

    const rating = document.getElementById('ratingValue').value;
    if (!rating) {
        alert('Выберите оценку перед отправкой.');
        return;
    }

    try {
        await fetch(`/api/blogs/${blogId}/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating })
        });

        alert('Спасибо за вашу оценку!');
        await fetchAverageRating(); // Перезагрузим средний рейтинг без перезагрузки страницы
    } catch (error) {
        console.error('Ошибка при сохранении рейтинга:', error);
        alert('Ошибка при сохранении рейтинга.');
    }
}

// Функция изменения оценки
async function loadUserRating() {
    const res = await fetch(`/api/blogs/${blogId}/user_rating`);
    const data = await res.json();

    if (data.rating !== null) {
        document.getElementById('ratingValue').value = data.rating;

        // Обновляем отображение звёзд
        const stars = document.getElementsByClassName('rating-star');
        for (let i = 0; i < stars.length; i++) {
            if (i < data.rating) {
                stars[i].src = 'IMG-TEST/fi-sr-star2.png';
            } else {
                stars[i].src = 'IMG-TEST/fi-rr-star.png';
            }
        }

        document.getElementById('ratingButton').innerText = 'Изменить оценку';
        document.getElementById('deleteRatingButton').style.display = 'inline-block';
    } else {
        document.getElementById('ratingButton').innerText = 'Оценить';
        document.getElementById('deleteRatingButton').style.display = 'none';
    }
}

// удаление оценки
async function deleteRating() {
    const res = await fetch(`/api/session`);
    const session = await res.json();
    if (!session.loggedIn) {
        alert('Войдите, чтобы удалить оценку');
        return;
    }
  
    try {
        await fetch(`/api/blogs/${blogId}/ratings`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
  
        alert('Оценка удалена');
        document.getElementById('ratingValue').value = '';
        fetchAverageRating();
        loadUserRating();
    } catch (error) {
        console.error('Ошибка при удалении оценки:', error);
    }
  }