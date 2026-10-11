async function adminApiRequest(url, options = {}) {
  if (window.location.protocol === 'file:') {
    throw new Error('Ouvrez cette page depuis le domaine Cloudflare Pages. Les fonctions admin ne fonctionnent pas depuis un fichier local.');
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('API Cloudflare inaccessible. Vérifiez que le site et ses Pages Functions sont déployés.');
  }

  const contentType = response.headers.get('Content-Type') || '';
  let result;

  if (contentType.includes('application/json')) {
    try {
      result = await response.json();
    } catch {
      throw new Error('La réponse de l’API Cloudflare est invalide.');
    }
  } else {
    if (response.status === 403) {
      throw new Error('Accès refusé. Connectez-vous avec le compte autorisé dans Cloudflare Access.');
    }

    if (response.status === 404) {
      throw new Error('API introuvable. Vérifiez que le déploiement Cloudflare inclut le dossier functions.');
    }

    throw new Error(`Réponse Cloudflare inattendue (HTTP ${response.status}). Vérifiez Access et le déploiement Pages.`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session Cloudflare Access manquante ou expirée. Connectez-vous puis rechargez cette page.');
    }

    throw new Error(result.error || `La requête a échoué (HTTP ${response.status}).`);
  }

  return result;
}
