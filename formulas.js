const formulaSubjects = [
  {
    title: 'Mathématiques',
    items: [
      { label: 'Suite arithmétique', expression: 'uₙ = u₀ + n r' },
      { label: 'Somme arithmétique', expression: 'u₀ + … + uₙ = (n + 1)(u₀ + uₙ) / 2' },
      { label: 'Suite géométrique', expression: 'uₙ = u₀ qⁿ' },
      { label: 'Somme géométrique', expression: 'u₀ + … + uₙ = u₀(1 − qⁿ⁺¹) / (1 − q), q ≠ 1' },
      { label: 'Dérivées usuelles', expression: '(xⁿ)′ = n xⁿ⁻¹  ·  (ln x)′ = 1/x  ·  (eˣ)′ = eˣ' },
      { label: 'Primitive puissance', expression: '∫xⁿ dx = xⁿ⁺¹ / (n + 1) + C, n ≠ −1' }
    ]
  },
  {
    title: 'Algorithmique',
    items: [
      { label: 'Recherche dichotomique', expression: 'milieu = ⌊(début + fin) / 2⌋' },
      { label: 'Reste et quotient', expression: 'a = b × (a div b) + (a mod b)' },
      { label: 'Algorithme d’Euclide', expression: 'PGCD(a, b) = PGCD(b, a mod b)' },
      { label: 'Complexité dichotomique', expression: 'T(n) = O(log₂ n)' }
    ]
  },
  {
    title: 'Bases de données',
    items: [
      { label: 'Sélectionner des colonnes', expression: 'SELECT colonnes FROM table WHERE condition;' },
      { label: 'Regrouper et compter', expression: 'SELECT champ, COUNT(*) FROM table GROUP BY champ;' },
      { label: 'Calculer une moyenne', expression: 'SELECT AVG(valeur) FROM table;' },
      { label: 'Relier deux tables', expression: 'SELECT … FROM A JOIN B ON A.id = B.id;' }
    ]
  },
  {
    title: 'Physique',
    items: [
      { label: 'Vitesse moyenne', expression: 'v = d / Δt' },
      { label: 'Accélération moyenne', expression: 'a = Δv / Δt' },
      { label: 'Deuxième loi de Newton', expression: 'ΣF⃗ = m a⃗' },
      { label: 'Loi d’Ohm', expression: 'U = R I' },
      { label: 'Puissance électrique', expression: 'P = U I' },
      { label: 'Énergie électrique', expression: 'E = P Δt' }
    ]
  }
];

const formulaGrid = document.getElementById('formulaGrid');

if (formulaGrid) {
  formulaSubjects.forEach((subject) => {
    const card = document.createElement('article');
    card.className = 'formula-card';

    const title = document.createElement('h3');
    title.textContent = subject.title;
    card.append(title);

    const list = document.createElement('dl');
    list.className = 'formula-list';

    subject.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'formula-item';

      const label = document.createElement('dt');
      label.textContent = item.label;

      const expression = document.createElement('dd');
      const code = document.createElement('code');
      code.textContent = item.expression;
      expression.append(code);

      row.append(label, expression);
      list.append(row);
    });

    card.append(list);
    formulaGrid.append(card);
  });
}
