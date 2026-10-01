function figerBudgetMois(mois, methode){
  const snapshot = {
    mois,
    categories: CATEGORIES.map(c=>({ id:c.id, nom:c.nom, budget:c.budget, couleur:c.couleur })),
    total: totalBudget(),
    valideLe: new Date().toISOString(),
    methode
  };
  historiqueBudgets = historiqueBudgets.filter(h=>h.mois!==mois);
  historiqueBudgets.push(snapshot);
  historiqueBudgets.sort((a,b)=>b.mois.localeCompare(a.mois));
}

// À chaque chargement de l'app : si on a changé de mois depuis la dernière visite,
// le budget tel qu'il était est figé automatiquement dans l'historique (une seule fois).
async function verifierChangementMois(){
  const moisEnCours = moisActuel();
  if(dernierMoisVu && dernierMoisVu !== moisEnCours){
    // Toujours (re)enregistré : le budget actuel est celui en vigueur à la fin du mois qui vient de se terminer.
    figerBudgetMois(dernierMoisVu, 'auto');
  }
  if(dernierMoisVu !== moisEnCours){
    dernierMoisVu = moisEnCours;
    await sauvegarderTout();
  }
}

function renderHistoriqueBudgets(){
  const zone = document.getElementById('histoBudgetsBody');
  if(!zone) return;
  const termines = historiqueBudgets.filter(h=>h.mois < moisActuel());
  if(termines.length===0){
    zone.innerHTML = '<div class="vide">Les mois terminés apparaîtront ici automatiquement.</div>';
    return;
  }
  zone.innerHTML = termines.map((h,i)=>{
    const label = new Date(h.mois+'-01T00:00:00').toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
    const depMoisListe = depenses.filter(d=>d.date && d.date.startsWith(h.mois));
    const totalDepMois = depMoisListe.reduce((s,d)=>s+d.montant,0);
    const ecart = h.total - totalDepMois;
    const depasse = totalDepMois > h.total;
    const detail = h.categories.map(c=>{
      const depCat = depMoisListe.filter(d=>d.cat===c.id).reduce((s,d)=>s+d.montant,0);
      const depasseCat = depCat > c.budget;
      return `
      <div class="histo-detail-ligne">
        <span class="dot" style="background:${c.couleur}"></span>
        <span class="nom">${c.nom}</span>
        <span class="valeurs ${depasseCat?'depasse':''}"><b>${fmt(depCat)}</b> / ${fmt(c.budget)} FCFA</span>
      </div>`;
    }).join('');
    return `
    <div class="histo-budget-carte" style="animation-delay:${Math.min(i,8)*0.03}s">
      <div class="histo-budget-head">
        <span class="histo-budget-mois">${label}</span>
        <div class="histo-budget-droite">
          <span class="histo-budget-total">${fmt(h.total)} FCFA</span>
        </div>
      </div>
      <div class="histo-budget-reel ${depasse?'neg':'pos'}">Dépensé réellement : ${fmt(totalDepMois)} FCFA — ${depasse ? 'dépassement de '+fmt(Math.abs(ecart)) : 'reste '+fmt(ecart)} FCFA</div>
      <div class="histo-budget-detail">${detail}</div>
    </div>`;
  }).join('');
}
