function figerBudgetMois(mois, methode){
  const snapshot = {
    mois,
    categories: CATEGORIES.map(c=>({ id:c.id, nom:c.nom, budget:c.budget, couleur:c.couleur, ...(estEpargne(c) ? { type:'epargne' } : {}) })),
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

// Résumé budget prévu / dépensé du mois affiché dans l'historique (mois terminés uniquement,
// et seulement si leur budget a été figé). Le détail par poste est repliable.
function renderResumeMoisHisto(){
  const zone = document.getElementById('histoResumeMois');
  if(!zone) return;
  const mois = moisAffiche();
  const h = (mois < moisActuel() && !rechercheEnCours()) ? historiqueBudgets.find(x=>x.mois===mois) : null;
  if(!h){ zone.innerHTML = ''; return; }
  const depMoisListe = depenses.filter(d=>d.date && d.date.startsWith(mois));
  const totalDepMois = depMoisListe.reduce((s,d)=>s+d.montant,0);
  const budgetDep = budgetDepensesFige(h), objectif = objectifEpargneFige(h);
  const ecart = budgetDep - totalDepMois;
  const depasse = totalDepMois > budgetDep;
  const epaMois = epargneDuMois(mois);
  const posteEp = h.categories.find(estEpargne);
  const ligneEpargne = posteEp ? `
      <div class="histo-detail-ligne">
        <span class="dot" style="background:var(--epargne)"></span>
        <span class="nom">${esc(posteEp.nom)} <small>(mis de côté / objectif)</small></span>
        <span class="valeurs"><b>${fmt(epaMois)}</b> / ${fmt(objectif)} FCFA</span>
      </div>` : '';
  const detail = h.categories.filter(c=>!estEpargne(c)).map(c=>{
    const depCat = depMoisListe.filter(d=>d.cat===c.id).reduce((s,d)=>s+d.montant,0);
    return `
      <div class="histo-detail-ligne">
        <span class="dot" style="background:${esc(c.couleur)}"></span>
        <span class="nom">${esc(c.nom)}</span>
        <span class="valeurs ${depCat > c.budget ? 'depasse' : ''}"><b>${fmt(depCat)}</b> / ${fmt(c.budget)} FCFA</span>
      </div>`;
  }).join('');
  zone.innerHTML = `
    <details class="histo-resume">
      <summary>
        <span class="histo-resume-txt">Budget dépenses : <b>${fmt(budgetDep)} FCFA</b></span>
        <span class="histo-budget-reel ${depasse?'neg':'pos'}">${depasse ? 'Dépassement de '+fmt(Math.abs(ecart)) : 'Reste '+fmt(ecart)} FCFA</span>
      </summary>
      <div class="histo-budget-detail">${detail}${ligneEpargne}</div>
    </details>`;
}
