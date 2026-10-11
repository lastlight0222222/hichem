const suggestionList = document.getElementById('suggestionList');
const suggestionStatus = document.getElementById('suggestionStatus');
const availableStatuses = [
  ['new', 'Nouveau'],
  ['reviewing', 'En cours'],
  ['planned', 'À ajouter'],
  ['declined', 'Refusé']
];

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createSuggestionCard(suggestion) {
  const card = document.createElement('article');
  card.className = 'admin-card';

  const meta = createTextElement(
    'div',
    'admin-meta',
    `${new Date(suggestion.created_at).toLocaleString('fr-FR')} · Notification Discord : ${suggestion.notification_status === 'sent' ? 'envoyée' : suggestion.notification_status === 'failed' ? 'en échec' : 'en attente'}`
  );
  const title = createTextElement('h2', '', suggestion.topic);
  const subject = createTextElement('p', '', `Matière : ${suggestion.subject}`);
  const details = createTextElement('p', '', suggestion.details || 'Aucun détail fourni.');
  const controls = document.createElement('div');
  controls.className = 'admin-controls';

  const statusSelect = document.createElement('select');
  statusSelect.setAttribute('aria-label', `Statut de ${suggestion.topic}`);

  availableStatuses.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === suggestion.status;
    statusSelect.append(option);
  });

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Enregistrer le statut';
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;

    try {
      const result = await adminApiRequest('/api/admin/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: suggestion.id, status: statusSelect.value })
      });

      suggestionStatus.textContent = 'Statut mis à jour.';
      suggestion.status = statusSelect.value;
    } catch (error) {
      suggestionStatus.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Supprimer';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm('Supprimer définitivement cette suggestion ?')) {
      return;
    }

    deleteButton.disabled = true;

    try {
      await adminApiRequest(`/api/admin/suggestions?id=${encodeURIComponent(suggestion.id)}`, {
        method: 'DELETE'
      });

      card.remove();
      suggestionStatus.textContent = 'Suggestion supprimée.';

      if (!suggestionList.querySelector('.admin-card')) {
        suggestionList.append(createTextElement('p', 'admin-empty', 'Aucune suggestion pour le moment.'));
      }
    } catch (error) {
      suggestionStatus.textContent = error.message;
      deleteButton.disabled = false;
    }
  });

  controls.append(statusSelect, saveButton, deleteButton);
  card.append(meta, title, subject, details, controls);
  return card;
}

async function loadSuggestions() {
  try {
    const result = await adminApiRequest('/api/admin/suggestions', { cache: 'no-store' });

    suggestionList.replaceChildren();

    if (result.suggestions.length === 0) {
      suggestionList.append(createTextElement('p', 'admin-empty', 'Aucune suggestion pour le moment.'));
    } else {
      result.suggestions.forEach(suggestion => {
        suggestionList.append(createSuggestionCard(suggestion));
      });
    }

    suggestionStatus.textContent = `${result.suggestions.length} suggestion(s) chargée(s).`;
  } catch (error) {
    suggestionStatus.textContent = error.message;
  }
}

loadSuggestions();
