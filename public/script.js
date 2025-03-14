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

async function fetchAverageRating() {
    try {
        const response = await fetch('/api/average_rating');
        const data = await response.json();
        
        // Проверяем, является ли data.average_rating числом
        const average = isNaN(data.average_rating) ? 0.0 : data.average_rating;
        
        document.getElementById('averageRating').innerText = average.toFixed(1);
    } catch (error) {
        console.error('Ошибка загрузки среднего рейтинга:', error);
    }
}

// Загружаем средний рейтинг при загрузке страницы
document.addEventListener('DOMContentLoaded', fetchAverageRating);

async function saveRating() {
    const rating = document.getElementById('ratingValue').value;
    
    try {
    const response = await fetch('/api/ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating })
    });
    
    const data = await response.json();
    console.log('Рейтинг сохранен:', data);
    alert('Спасибо за ваш отзыв!');
    fetchAverageRating();
    } catch (error) {
    console.error('Ошибка при сохранении:', error);
    alert('Что-то пошло не так, пожалуйста, повторите попытку');
    }
   }
