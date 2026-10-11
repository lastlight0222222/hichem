const suggestionBox = document.getElementById('suggestionBox');

if (suggestionBox) {
  suggestionBox.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Votre avis</p>
      <h2>Un sujet à ajouter ?</h2>
    </div>
    <div class="suggestion-card">
      <form id="suggestionForm" class="suggestion-form">
        <label>
          Matière
          <input name="subject" type="text" maxlength="80" placeholder="Ex. Mathématiques" required>
        </label>
        <label>
          Sujet à ajouter
          <input name="topic" type="text" maxlength="120" placeholder="Ex. Nombres complexes" required>
        </label>
        <label>
          Détail (facultatif)
          <textarea name="details" rows="3" maxlength="500" placeholder="Que souhaitez-vous trouver sur ce sujet ?"></textarea>
        </label>
        <button class="primary-btn" type="submit">Proposer ce sujet</button>
        <p class="suggestion-note">Votre suggestion sera envoyée au propriétaire du site pour examen.</p>
        <p class="suggestion-status" id="suggestionStatus" role="status" aria-live="polite"></p>
      </form>
    </div>
  `;

  const suggestionForm = document.getElementById('suggestionForm');
  const suggestionStatus = document.getElementById('suggestionStatus');

  suggestionForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = suggestionForm.querySelector('button[type="submit"]');
    const formData = new FormData(suggestionForm);
    const suggestion = {
      subject: formData.get('subject').toString().trim(),
      topic: formData.get('topic').toString().trim(),
      details: formData.get('details').toString().trim()
    };

    submitButton.disabled = true;
    suggestionStatus.textContent = 'Envoi de votre suggestion…';

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestion)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Impossible d’envoyer la suggestion.');
      }

      suggestionStatus.textContent = result.notificationSent
        ? 'Merci ! Votre suggestion a été envoyée.'
        : 'Votre suggestion a été enregistrée, mais la notification n’a pas pu être envoyée.';
      suggestionForm.reset();
    } catch (error) {
      suggestionStatus.textContent = error.message || 'Erreur lors de l’envoi. Réessayez plus tard.';
    } finally {
      submitButton.disabled = false;
    }
  });
}
