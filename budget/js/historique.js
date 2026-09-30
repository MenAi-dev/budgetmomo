// Historique des dépenses : recherche, filtres (poste, mois) et rendu de la liste.

function filtreActif(){
  return !!(filtreHisto.q.trim() || filtreHisto.cat || filtreHisto.mois);
}

function depensesFiltrees(){
  const mots = normaliser(filtreHisto.q).trim().split(/\s+/).filter(Boolean);
  return depenses.filter(d=>{
    if(filtreHisto.cat && d.cat !== filtreHisto.cat) return false;
    if(filtreHisto.mois && !(d.date || '').startsWith(filtreHisto.mois)) return false;
    if(mots.length){
      const cat = CATEGORIES.find(c=>c.id===d.cat);
      const texte = normaliser((cat ? cat.nom : 'Poste supprimé') + ' ' + (d.note || '') + ' ' + d.montant);
      if(!mots.every(m=>texte.includes(m))) return false;
    }
    return true;
  });
}

// Reconstruit les listes déroulantes (postes et mois présents dans les dépenses).
function majOptionsFiltres(){
  const selCat = document.getElementById('filtreCat');
  const selMois = document.getElementById('filtreMois');
  if(!selCat || !selMois) return;

  if(filtreHisto.cat && !CATEGORIES.some(c=>c.id===filtreHisto.cat)) filtreHisto.cat = '';
  selCat.innerHTML = '<option value="">Tous les postes</option>'
    + CATEGORIES.map(c=>`<option value="${c.id}">${c.nom}</option>`).join('');
  selCat.value = filtreHisto.cat;

  const mois = [...new Set(depenses.map(d=>(d.date || '').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)))]
    .sort().reverse();
  if(filtreHisto.mois && !mois.includes(filtreHisto.mois)) filtreHisto.mois = '';
  selMois.innerHTML = '<option value="">Tous les mois</option>'
    + mois.map(m=>{
      const label = new Date(m + '-01T00:00:00').toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
      return `<option value="${m}">${label}</option>`;
    }).join('');
  selMois.value = filtreHisto.mois;
}

function renderHistoriqueDepenses(){
  const corps = document.getElementById('histoBody');
  const resume = document.getElementById('filtreResumeTexte');
  const btnReset = document.getElementById('btnResetFiltres');
  if(!corps) return;

  const liste = depensesFiltrees().sort((a,b)=>
    (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
  const actif = filtreActif();
  const total = liste.reduce((s,d)=>s+d.montant, 0);

  if(resume){
    resume.textContent = depenses.length === 0 ? ''
      : (actif ? liste.length + ' sur ' + depenses.length : liste.length) + ' dépense' + (liste.length > 1 ? 's' : '')
        + ' · ' + fmt(total) + ' FCFA';
  }
  if(btnReset) btnReset.hidden = !actif;

  if(depenses.length === 0){
    corps.innerHTML = '<div class="vide">Aucune dépense enregistrée pour le moment.</div>';
    return;
  }
  if(liste.length === 0){
    corps.innerHTML = '<div class="vide">Aucune dépense ne correspond à ta recherche.</div>';
    return;
  }

  const anneeCourante = new Date().getFullYear();
  corps.innerHTML = liste.map((d,i)=>{
    const cat = CATEGORIES.find(c=>c.id===d.cat);
    let dateStr = '';
    if(d.date){
      const dt = new Date(d.date + 'T00:00:00');
      dateStr = dt.toLocaleDateString('fr-FR', dt.getFullYear() !== anneeCourante
        ? { day:'2-digit', month:'short', year:'numeric' } : { day:'2-digit', month:'short' });
    }
    return `
      <div class="ligne-tx" style="animation-delay:${Math.min(i,8)*0.03}s">
        <span class="dot" style="background:${cat ? cat.couleur : 'var(--gris)'}"></span>
        <div>
          <div>${cat ? cat.nom : 'Poste supprimé'}${d.note ? ' — '+d.note : ''}</div>
          <div class="meta">${dateStr}${d.recId ? ' · ↻ récurrente' : ''}</div>
        </div>
        <div class="montant">-${fmt(d.montant)} FCFA</div>
        <div class="actions-ligne">
          <button class="edit" data-id="${d.id}" title="Modifier">✎</button>
          <button class="del" data-id="${d.id}" title="Supprimer">×</button>
        </div>
      </div>`;
  }).join('');
  corps.querySelectorAll('.del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerDepense(b.dataset.id));
  });
  corps.querySelectorAll('.edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionDepense(b.dataset.id));
  });
}

function reinitialiserFiltres(){
  filtreHisto = { q:'', cat:'', mois:'' };
  document.getElementById('filtreQ').value = '';
  majOptionsFiltres();
  renderHistoriqueDepenses();
}
