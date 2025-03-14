async function register() {
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
    });

    const text = await res.text();  // Получаем текст вместо JSON
    try {
        const data = JSON.parse(text);  // Попробуем распарсить текст как JSON
        alert(data.message);
        if (data.success) window.location.href = '/login';
    } catch (e) {
        console.error('Ошибка парсинга JSON:', text);
    }
}