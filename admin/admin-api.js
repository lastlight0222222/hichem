async function adminApiRequest(url, options = {}) {
  if (window.location.protocol === 'file:') {
    throw new Error('Ouvrez cette page depuis le domaine Netlify. Les fonctions admin ne fonctionnent pas depuis un fichier local.');
  }

  let response;

  try {
    response = await fetch(url, { ...options, credentials: 'same-origin' });
  } catch {
    throw new Error('API Netlify inaccessible. Vérifiez que le site et ses fonctions Netlify sont déployés.');
  }

  const contentType = response.headers.get('Content-Type') || '';
  let result;

  if (contentType.includes('application/json')) {
    try {
      result = await response.json();
    } catch {
      throw new Error('La réponse de l’API Netlify est invalide.');
    }
  } else {
    if (response.status === 403) {
      throw new Error('Accès refusé. Connectez-vous à l’espace administrateur.');
    }

    if (response.status === 404) {
      throw new Error('API introuvable. Vérifiez la configuration et le déploiement Netlify.');
    }

    throw new Error(`Réponse Netlify inattendue (HTTP ${response.status}). Vérifiez le déploiement des fonctions.`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Votre session administrateur a expiré. Reconnectez-vous.');
    }

    throw new Error(result.error || `La requête a échoué (HTTP ${response.status}).`);
  }

  return result;
}
