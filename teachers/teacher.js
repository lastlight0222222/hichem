const loginPanel = document.getElementById('teacherLoginPanel');
const loginForm = document.getElementById('teacherLoginForm');
const loginButton = document.getElementById('teacherLoginButton');
const loginStatus = document.getElementById('teacherLoginStatus');
const teacherContent = document.getElementById('teacherContent');
const logoutButton = document.getElementById('teacherLogoutButton');
const uploadForm = document.getElementById('teacherUploadForm');
const uploadButton = document.getElementById('teacherUploadButton');
const uploadStatus = document.getElementById('teacherUploadStatus');
const maxPdfBytes = 4 * 1024 * 1024;

async function teacherApiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'same-origin'
    });
  } catch {
    throw new Error('API Netlify inaccessible. Vérifiez le déploiement du site.');
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Réponse Netlify invalide (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const error = new Error(result.error || `La requête a échoué (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return result;
}

function showLogin(message) {
  loginPanel.hidden = false;
  teacherContent.hidden = true;
  logoutButton.hidden = true;
  loginStatus.textContent = message;
}

function showUpload() {
  loginPanel.hidden = true;
  teacherContent.hidden = false;
  logoutButton.hidden = false;
}

async function checkTeacherSession() {
  try {
    await teacherApiRequest('/api/teacher-session', { cache: 'no-store' });
    showUpload();
  } catch (error) {
    showLogin(error.status === 401
      ? 'Connectez-vous pour téléverser un PDF.'
      : error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginStatus.textContent = 'Connexion…';

  try {
    const password = new FormData(loginForm).get('password');
    await teacherApiRequest('/api/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    loginForm.reset();
    showUpload();
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await teacherApiRequest('/api/teacher-logout', { method: 'POST' });
    showLogin('Vous êtes déconnecté.');
  } catch (error) {
    loginStatus.textContent = error.message;
  } finally {
    logoutButton.disabled = false;
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = uploadForm.elements.file.files[0];
  if (!file) {
    uploadStatus.textContent = 'Choisissez un fichier PDF.';
    return;
  }
  if (file.size > maxPdfBytes) {
    uploadStatus.textContent = 'Le PDF dépasse la limite de 4 Mo.';
    return;
  }

  uploadButton.disabled = true;
  uploadStatus.textContent = 'Téléversement du PDF…';
  try {
    await teacherApiRequest('/api/admin/pdfs', {
      method: 'POST',
      body: new FormData(uploadForm)
    });
    uploadForm.reset();
    uploadStatus.textContent = 'PDF ajouté et publié. L’administrateur peut maintenant l’associer à une leçon.';
  } catch (error) {
    uploadStatus.textContent = error.message;
  } finally {
    uploadButton.disabled = false;
  }
});

checkTeacherSession();
