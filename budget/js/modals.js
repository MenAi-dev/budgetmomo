function remplirSelectCategories(select, valeur){
  select.innerHTML = CATEGORIES.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  if(CATEGORIES.some(c=>c.id===valeur)) select.value = valeur;
}
function ouvrirModal(catId){
  depenseEnEdition = null;
  categoriePourAjout = catId;
  const cat = CATEGORIES.find(c=>c.id===catId);
  document.getElementById('modalTitre').textContent = 'Ajouter une dépense';
  document.getElementById('modalSub').textContent = cat.nom + ' — budget ' + fmt(cat.budget) + ' FCFA';
  document.getElementById('champCat').hidden = true;
  document.getElementById('btnValider').textContent = 'Ajouter';
  document.getElementById('inputMontant').value = '';
  document.getElementById('inputDate').value = auj();
  document.getElementById('inputNote').value = '';
  document.getElementById('overlay').classList.add('actif');
  document.getElementById('inputMontant').focus();
}
function ouvrirEditionDepense(id){
  const d = depenses.find(x=>x.id===id);
  if(!d) return;
  depenseEnEdition = id;
  categoriePourAjout = d.cat;
  document.getElementById('modalTitre').textContent = 'Modifier la dépense';
  document.getElementById('modalSub').textContent = d.recId
    ? 'Dépense récurrente : seule cette occurrence est modifiée'
    : 'Corrige le montant, la date, la note ou le poste';
  remplirSelectCategories(document.getElementById('inputCat'), d.cat);
  document.getElementById('champCat').hidden = false;
  document.getElementById('btnValider').textContent = 'Enregistrer';
  document.getElementById('inputMontant').value = d.montant;
  document.getElementById('inputDate').value = d.date || auj();
  document.getElementById('inputNote').value = d.note || '';
  document.getElementById('overlay').classList.add('actif');
  document.getElementById('inputMontant').focus();
}
function fermerModal(){
  document.getElementById('overlay').classList.remove('actif');
  categoriePourAjout = null;
  depenseEnEdition = null;
}

// Avertit quand une dépense fait franchir le seuil de 80 % ou le budget d'un poste.
function verifierAlerte(catId, depAvant){
  const c = CATEGORIES.find(x=>x.id===catId);
  if(!c) return;
  const dep = depensePar(catId);
  if(dep > c.budget){
    toast(depAvant <= c.budget
      ? c.nom + ' dépasse son budget de ' + fmt(dep - c.budget) + ' FCFA'
      : c.nom + ' : ' + fmt(dep - c.budget) + ' FCFA au-dessus du budget', 'danger');
  } else if(c.budget > 0 && dep >= c.budget*SEUIL_ALERTE && depAvant < c.budget*SEUIL_ALERTE){
    toast(c.nom + ' : ' + Math.round(dep/c.budget*100) + ' % du budget utilisé', 'alerte');
  }
}

async function validerAjout(){
  const montant = parseFloat(document.getElementById('inputMontant').value);
  if(!montant || montant<=0) return;
  const date = document.getElementById('inputDate').value || auj();
  const note = document.getElementById('inputNote').value.trim();
  let catCible;
  let depAvant;
  if(depenseEnEdition){
    const d = depenses.find(x=>x.id===depenseEnEdition);
    if(!d){ fermerModal(); return; }
    catCible = document.getElementById('inputCat').value || d.cat;
    depAvant = depensePar(catCible);
    Object.assign(d, { cat:catCible, montant, date, note });
  } else {
    catCible = categoriePourAjout;
    depAvant = depensePar(catCible);
    depenses.push({ id: nouvelId(), cat: catCible, montant, note, date });
  }
  await sauvegarderTout();
  fermerModal();
  rendre();
  declencherPulse(document.getElementById('totalDepense'));
  const carteEl = document.querySelector(`.carte[data-cat="${catCible}"]`);
  if(carteEl) carteEl.classList.add('flash');
  verifierAlerte(catCible, depAvant);
}
async function supprimerDepense(id){
  depenses = depenses.filter(d=>d.id!==id);
  await sauvegarderTout();
  rendre();
}

async function supprimerCategorie(catId){
  const cat = CATEGORIES.find(c=>c.id===catId);
  if(!cat) return;
  const nbDepenses = depenses.filter(d=>d.cat===catId).length;
  const message = nbDepenses > 0
    ? `Supprimer la catégorie "${cat.nom}" ? ${nbDepenses} dépense(s) associée(s) seront aussi supprimées.`
    : `Supprimer la catégorie "${cat.nom}" ?`;
  if(!confirm(message)) return;
  CATEGORIES = CATEGORIES.filter(c=>c.id!==catId);
  depenses = depenses.filter(d=>d.cat!==catId);
  recurrentes = recurrentes.filter(r=>r.cat!==catId);
  await sauvegarderTout();
  if(categoriePourBudget===catId) fermerModalBudget();
  rendre();
}

function ouvrirModalBudget(catId){
  categoriePourBudget = catId;
  const cat = CATEGORIES.find(c=>c.id===catId);
  document.getElementById('modalBudgetSub').textContent = cat.nom + ' — budget actuel ' + fmt(cat.budget) + ' FCFA';
  document.getElementById('inputBudget').value = cat.budget;
  document.getElementById('overlayBudget').classList.add('actif');
  document.getElementById('inputBudget').focus();
}
function fermerModalBudget(){
  document.getElementById('overlayBudget').classList.remove('actif');
  categoriePourBudget = null;
}
async function validerBudget(){
  const montant = parseFloat(document.getElementById('inputBudget').value);
  if(isNaN(montant) || montant < 0) return;
  const cat = CATEGORIES.find(c=>c.id===categoriePourBudget);
  cat.budget = montant;
  await sauvegarderTout();
  fermerModalBudget();
  rendre();
}

function ouvrirModalEntree(){
  document.getElementById('inputEntreeMontant').value = '';
  document.getElementById('inputEntreeDate').value = auj();
  document.getElementById('inputEntreeNote').value = '';
  document.getElementById('overlayEntree').classList.add('actif');
  document.getElementById('inputEntreeMontant').focus();
}
function fermerModalEntree(){
  document.getElementById('overlayEntree').classList.remove('actif');
}
async function validerEntree(){
  const montant = parseFloat(document.getElementById('inputEntreeMontant').value);
  if(!montant || montant<=0) return;
  const date = document.getElementById('inputEntreeDate').value || auj();
  const note = document.getElementById('inputEntreeNote').value.trim();
  entrees.push({
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    montant,
    note,
    date
  });
  await sauvegarderTout();
  fermerModalEntree();
  rendre();
  declencherPulse(document.getElementById('totalEntrees'));
}
async function supprimerEntree(id){
  entrees = entrees.filter(e=>e.id!==id);
  await sauvegarderTout();
  rendre();
}

function ouvrirModalEpargne(){
  document.getElementById('inputEpargneMontant').value = '';
  document.getElementById('inputEpargneDate').value = auj();
  document.getElementById('inputEpargneNote').value = '';
  document.getElementById('overlayEpargne').classList.add('actif');
  document.getElementById('inputEpargneMontant').focus();
}
function fermerModalEpargne(){
  document.getElementById('overlayEpargne').classList.remove('actif');
}
async function validerEpargne(){
  const montant = parseFloat(document.getElementById('inputEpargneMontant').value);
  if(!montant || montant<=0) return;
  const date = document.getElementById('inputEpargneDate').value || auj();
  const note = document.getElementById('inputEpargneNote').value.trim();
  epargnes.push({
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    montant,
    note,
    date
  });
  await sauvegarderTout();
  fermerModalEpargne();
  rendre();
  declencherPulse(document.getElementById('totalEpargne'));
}
async function supprimerEpargne(id){
  epargnes = epargnes.filter(e=>e.id!==id);
  await sauvegarderTout();
  rendre();
}

function ouvrirModalGlobal(){
  const budgetActuel = totalBudget();
  document.getElementById('inputGlobalMontant').value = budgetActuel;
  document.getElementById('repartitionPourcent').innerHTML = CATEGORIES.map(c=>{
    const pct = budgetActuel ? Math.round((c.budget/budgetActuel)*1000)/10 : 0;
    return `
    <div class="pourcent-ligne">
      <span class="dot" style="background:${c.couleur}"></span>
      <span class="nom">${c.nom}</span>
      <input type="number" class="input-pourcent" data-cat="${c.id}" min="0" max="100" step="0.1" value="${pct}">
      <span class="pct-symbol">%</span>
    </div>`;
  }).join('');
  document.querySelectorAll('.input-pourcent').forEach(inp=>{
    inp.addEventListener('input', majTotalPourcent);
  });
  majTotalPourcent();
  document.getElementById('overlayGlobal').classList.add('actif');
}
function fermerModalGlobal(){
  document.getElementById('overlayGlobal').classList.remove('actif');
}
function majTotalPourcent(){
  const total = [...document.querySelectorAll('.input-pourcent')].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  const arrondi = Math.round(total*10)/10;
  const txt = document.getElementById('pourcentTotalTxt');
  const ok = Math.abs(total-100) <= 0.5;
  txt.textContent = 'Total saisi : ' + arrondi + '%' + (ok ? '' : ' — sera automatiquement ajusté à 100% à l\'application');
  txt.className = 'pourcent-total ' + (ok ? 'ok' : 'attention');
}
async function validerGlobal(){
  const global = Math.round(parseFloat(document.getElementById('inputGlobalMontant').value));
  if(isNaN(global) || global < 0) return;
  const inputs = [...document.querySelectorAll('.input-pourcent')];
  const valeurs = inputs.map(i=>({ cat:i.dataset.cat, pct: Math.max(0, parseFloat(i.value)||0) }));
  const sommePct = valeurs.reduce((s,v)=>s+v.pct,0);
  if(sommePct <= 0) return;
  // Méthode du plus grand reste : on arrondit chaque part à l'entier inférieur,
  // puis on distribue les unités restantes aux catégories les plus proches de
  // l'arrondi supérieur, afin que la somme finale corresponde exactement au
  // montant global saisi (au lieu de dériver de quelques FCFA par arrondi indépendant).
  const parts = valeurs.map(v=>{
    const brut = global * (v.pct/sommePct);
    return { cat:v.cat, entier:Math.floor(brut), reste: brut - Math.floor(brut) };
  });
  let restant = global - parts.reduce((s,p)=>s+p.entier,0);
  parts.sort((a,b)=>b.reste-a.reste);
  for(let i=0; i<parts.length && restant>0; i++, restant--){
    parts[i].entier += 1;
  }
  parts.forEach(p=>{
    const cat = CATEGORIES.find(c=>c.id===p.cat);
    if(cat) cat.budget = p.entier;
  });
  await sauvegarderTout();
  fermerModalGlobal();
  rendre();
  declencherPulse(document.getElementById('totalBudget'));
}

function ouvrirModalCategorie(){
  document.getElementById('inputCatNom').value = '';
  document.getElementById('inputCatBudget').value = '';
  document.getElementById('overlayCategorie').classList.add('actif');
  document.getElementById('inputCatNom').focus();
}
function fermerModalCategorie(){
  document.getElementById('overlayCategorie').classList.remove('actif');
}
async function validerCategorie(){
  const nom = document.getElementById('inputCatNom').value.trim();
  const budget = parseFloat(document.getElementById('inputCatBudget').value);
  if(!nom || isNaN(budget) || budget < 0) return;
  const id = 'cat_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  CATEGORIES.push({ id, nom, budget, couleur: couleurAuto(CATEGORIES.length) });
  await sauvegarderTout();
  fermerModalCategorie();
  rendre();
}

