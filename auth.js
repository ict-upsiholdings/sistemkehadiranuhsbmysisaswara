// auth.js

const validUsers = {
  "admin": "uhsb2025",
  "supervisor": "12345"
};

function login() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const errorBox = document.getElementById('errorBox');

  if (validUsers[user] && validUsers[user] === pass) {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', user);
    window.location.href = "admin.html";
  } else {
    errorBox.style.display = 'block';
  }
}

if (sessionStorage.getItem('isLoggedIn') === 'true') {
  window.location.href = "admin.html";
}
