const loginPanel = document.getElementById('adminLoginPanel');
const loginForm = document.getElementById('adminLoginForm');
const loginStatus = document.getElementById('adminLoginStatus');
const loginButton = document.getElementById('adminLoginButton');
const adminContent = document.getElementById('adminContent');
const logoutButton = document.getElementById('adminLogoutButton');
let adminScriptsLoaded = false;

function loadAdminScripts() {
  if (adminScriptsLoaded) return;
  adminScriptsLoaded = true;

  ['admin.js', 'admin-pdfs.js'].forEach((source) => {
    const script = document.createElement('script');
    script.src = source;
    script.onerror = () => {
      loginStatus.textContent = `Impossible de charger ${source}. Rechargez la page.`;
    };
    document.body.append(script);
  });
}

function showAdmin() {
  loginPanel.hidden = true;
  adminContent.hidden = false;
  logoutButton.hidden = false;
  loadAdminScripts();
}

function showLogin(message) {
  loginPanel.hidden = false;
  adminContent.hidden = true;
  logoutButton.hidden = true;
  loginStatus.textContent = message;
}

async function checkAdminSession() {
  try {
    await adminApiRequest('/api/admin-session', { cache: 'no-store' });
    showAdmin();
  } catch (error) {
    showLogin(error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = 'Connexion…';

  try {
    const password = new FormData(loginForm).get('password');
    await adminApiRequest('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    loginForm.reset();
    showAdmin();
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;

  try {
    await adminApiRequest('/api/admin-logout', { method: 'POST' });
    showLogin('Vous êtes déconnecté.');
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    logoutButton.disabled = false;
  }
});

checkAdminSession();
