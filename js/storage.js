const CLE_STOCKAGE = 'budgetData';

async function chargerTout(){
  // Stockage local au navigateur (persiste entre les rechargements de la page,
  // tant que tu utilises le même navigateur sur le même appareil).
  try{
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if(brut){
      const data = JSON.parse(brut);
      if(Array.isArray(data.categories) && data.categories.length) CATEGORIES = data.categories;
      depenses = Array.isArray(data.depenses) ? data.depenses : [];
      entrees = Array.isArray(data.entrees) ? data.entrees : [];
      epargnes = Array.isArray(data.epargnes) ? data.epargnes : [];
      historiqueBudgets = Array.isArray(data.historiqueBudgets) ? data.historiqueBudgets : [];
      recurrentes = Array.isArray(data.recurrentes) ? data.recurrentes : [];
      const o = data.objectifEpargne;
      objectifEpargne = (o && typeof o.cible === 'number' && o.cible > 0 && /^\d{4}-\d{2}-\d{2}$/.test(o.date))
        ? { nom: typeof o.nom === 'string' ? o.nom : '', cible: o.cible, date: o.date } : null;
      dernierMoisVu = typeof data.dernierMoisVu === 'string' ? data.dernierMoisVu : null;
      prevRestantTotal = totalBudget();
      return;
    }
  }catch(e){ console.error('Erreur de lecture des données', e); }

  // Migration depuis un ancien format (clés séparées) si présent
  try{
    const sauvCat = localStorage.getItem('categories');
    if(sauvCat){
      const sauvegarde = JSON.parse(sauvCat);
      if(Array.isArray(sauvegarde) && sauvegarde.length) CATEGORIES = sauvegarde;
    } else {
      const sauvBudgets = localStorage.getItem('budgets');
      if(sauvBudgets){
        const sauvegarde = JSON.parse(sauvBudgets);
        CATEGORIES.forEach(c=>{ if(sauvegarde[c.id] != null) c.budget = sauvegarde[c.id]; });
      }
    }
  }catch(e){ /* rien à migrer */ }
  try{
    const sauvDep = localStorage.getItem('depenses');
    depenses = sauvDep ? JSON.parse(sauvDep) : [];
  }catch(e){ depenses = []; }
  try{
    const sauvEnt = localStorage.getItem('entrees');
    entrees = sauvEnt ? JSON.parse(sauvEnt) : [];
  }catch(e){ entrees = []; }

  prevRestantTotal = totalBudget();
  await sauvegarderTout(); // consolide tout de suite pour les prochaines visites
}

async function sauvegarderTout(){
  try{
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ categories: CATEGORIES, depenses, entrees, epargnes, historiqueBudgets, recurrentes, objectifEpargne, dernierMoisVu }));
  }catch(e){ console.error('Erreur de sauvegarde', e); }
}

// Fige un instantané du budget courant (par poste) pour un mois donné.
// methode: 'auto' (déclenché par le changement de mois) ou 'manuel' (bouton discret).
