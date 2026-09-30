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
    const dejaFige = historiqueBudgets.some(h=>h.mois===dernierMoisVu);
    if(!dejaFige) figerBudgetMois(dernierMoisVu, 'auto');
  }
  if(dernierMoisVu !== moisEnCours){
    dernierMoisVu = moisEnCours;
    await sauvegarderTout();
  }
}

async function validerFigerBudget(){
  const mois = moisActuel();
  figerBudgetMois(mois, 'manuel');
  await sauvegarderTout();
  rendre();
  const btn = document.getElementById('btnFigerBudget');
  if(btn){
    const txt = btn.textContent;
    btn.textContent = 'Budget de ce mois figé ✓';
    setTimeout(()=>{ btn.textContent = txt; }, 2200);
  }
}

function renderHistoriqueBudgets(){
  const zone = document.getElementById('histoBudgetsBody');
  if(!zone) return;
  if(historiqueBudgets.length===0){
    zone.innerHTML = '<div class="vide">Aucun budget figé pour l\'instant. Il se figera automatiquement au changement de mois, ou tu peux le faire manuellement ci-dessous.</div>';
    return;
  }
  zone.innerHTML = historiqueBudgets.map((h,i)=>{
    const label = new Date(h.mois+'-01T00:00:00').toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
    const badge = h.methode==='auto' ? 'figé auto' : 'validé manuellement';
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
        <span class="histo-budget-mois">${label}<span class="histo-badge">${badge}</span></span>
        <div class="histo-budget-droite">
          <span class="histo-budget-total">${fmt(h.total)} FCFA</span>
          <button class="del" data-mois="${h.mois}" title="Supprimer ce budget figé">×</button>
        </div>
      </div>
      <div class="histo-budget-reel ${depasse?'neg':'pos'}">Dépensé réellement : ${fmt(totalDepMois)} FCFA — ${depasse ? 'dépassement de '+fmt(Math.abs(ecart)) : 'reste '+fmt(ecart)} FCFA</div>
      <div class="histo-budget-detail">${detail}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('#histoBudgetsBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerBudgetFige(b.dataset.mois));
  });
}

async function supprimerBudgetFige(mois){
  historiqueBudgets = historiqueBudgets.filter(h=>h.mois!==mois);
  await sauvegarderTout();
  rendre();
}

