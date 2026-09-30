function depensePar(catId){
  return depenses.filter(d=>d.cat===catId).reduce((s,d)=>s+d.montant,0);
}

function rendre(){
  const budgetActuel = totalBudget();
  const totalDepense = depenses.reduce((s,d)=>s+d.montant,0);
  const totalRestant = budgetActuel - totalDepense;
  const totalEntreesGlobal = entrees.reduce((s,e)=>s+e.montant,0);
  const solde = totalEntreesGlobal - totalDepense;

  const soldeEl = document.getElementById('soldeDispo');
  animerValeur(soldeEl, prevSoldeTotal, solde, v => fmt(v)+' <small>FCFA</small>');
  soldeEl.className = 'valeur ' + (solde >= 0 ? 'pos' : 'neg');
  prevSoldeTotal = solde;
  document.getElementById('soldeEntrees').textContent = fmt(totalEntreesGlobal)+' FCFA';
  document.getElementById('soldeDepenses').textContent = fmt(totalDepense)+' FCFA';

  const totalDepenseEl = document.getElementById('totalDepense');
  const totalRestantEl = document.getElementById('totalRestant');
  animerValeur(totalDepenseEl, prevDepenseTotal, totalDepense, v => fmt(v)+' <small>FCFA</small>');
  animerValeur(totalRestantEl, prevRestantTotal, totalRestant, v => fmt(v)+' <small>FCFA</small>');
  totalRestantEl.className = 'valeur ' + (totalRestant >= 0 ? 'pos' : 'neg');
  document.getElementById('totalBudget').innerHTML = fmt(budgetActuel)+' <small>FCFA</small>';
  prevDepenseTotal = totalDepense;
  prevRestantTotal = totalRestant;

  const pctG = budgetActuel ? Math.min(100, (totalDepense/budgetActuel)*100) : 0;
  document.getElementById('barreGlobale').style.width = pctG+'%';
  document.getElementById('pctGlobal').textContent = Math.round(pctG)+'% utilisé';

  // Donut : répartition du budget par poste
  let acc = 0;
  const stops = CATEGORIES.map(c=>{
    const start = budgetActuel ? acc/budgetActuel*360 : 0;
    acc += c.budget;
    const end = budgetActuel ? acc/budgetActuel*360 : 0;
    return `${c.couleur} ${start}deg ${end}deg`;
  }).join(', ');
  const donutEl = document.getElementById('donut');
  donutEl.style.background = CATEGORIES.length ? `conic-gradient(${stops})` : 'rgba(255,255,255,0.08)';
  donutEl.style.setProperty('mask','radial-gradient(circle, transparent 56%, black 57%)');
  donutEl.style.setProperty('-webkit-mask','radial-gradient(circle, transparent 56%, black 57%)');
  document.getElementById('donutPct').textContent = Math.round(pctG)+'%';

  // Légende en lignes
  document.getElementById('legende').innerHTML = CATEGORIES.map((c,i)=>{
    const dep = depensePar(c.id);
    const pctCat = c.budget ? Math.round(Math.min(100, (dep/c.budget)*100)) : 0;
    return `
    <div class="leg-ligne" style="animation-delay:${i*0.05}s">
      <span class="dot" style="background:${c.couleur}"></span>
      <span class="nom">${c.nom}</span>
      <span class="montant">${fmt(dep)} / ${fmt(c.budget)} FCFA</span>
      <span class="pct-val" style="color:${pctCat>=100 ? 'var(--rouge)' : 'var(--bleu-clair)'}">${pctCat}%</span>
    </div>`;
  }).join('');

  document.getElementById('grille').innerHTML = CATEGORIES.map((c,i)=>{
    const dep = depensePar(c.id);
    const reste = c.budget - dep;
    const pctCat = c.budget ? Math.min(100, (dep/c.budget)*100) : 0;
    const depasse = dep > c.budget;
    const proche = !depasse && c.budget > 0 && dep >= c.budget*SEUIL_ALERTE;
    const couleurBarre = depasse ? 'var(--rouge)' : proche ? 'var(--orange)' : 'var(--bleu)';
    const couleurReste = depasse ? 'var(--rouge)' : proche ? 'var(--orange)' : 'var(--bleu-clair)';
    const tag = depasse ? '<span class="tag-alerte rouge">Dépassé</span>'
              : proche ? '<span class="tag-alerte">'+Math.round(dep/c.budget*100)+' %</span>' : '';
    return `
    <div class="carte" data-cat="${c.id}" style="animation-delay:${i*0.06}s">
      <div class="carte-head">
        <div class="nom">${c.nom}${tag}</div>
        <div class="carte-head-droite">
          <span class="budget">${fmt(c.budget)} FCFA</span>
          <button class="modif-btn" data-cat="${c.id}" title="Modifier le budget">✎</button>
          <button class="suppr-btn" data-cat="${c.id}" title="Supprimer la catégorie">🗑</button>
        </div>
      </div>
      <div class="barre"><div class="barre-fill" style="width:${pctCat}%; background:${couleurBarre}"></div></div>
      <div class="carte-foot">
        <span class="depense">${fmt(dep)} FCFA dépensé</span>
        <span class="reste" style="color:${couleurReste}">${depasse ? '-' : ''}${fmt(Math.abs(reste))} FCFA</span>
      </div>
      <button class="ajout-btn" data-cat="${c.id}">+ Ajouter une dépense</button>
    </div>`;
  }).join('');
  document.querySelectorAll('.ajout-btn').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirModal(b.dataset.cat));
  });
  document.querySelectorAll('.modif-btn').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirModalBudget(b.dataset.cat));
  });
  document.querySelectorAll('.suppr-btn').forEach(b=>{
    b.addEventListener('click', ()=>supprimerCategorie(b.dataset.cat));
  });

  const maxVal = Math.max(...CATEGORIES.map(c=>Math.max(c.budget, depensePar(c.id))), 1);
  document.getElementById('comparatifBody').innerHTML = CATEGORIES.map(c=>{
    const dep = depensePar(c.id);
    const budgetPct = (c.budget/maxVal)*100;
    const depPct = (dep/maxVal)*100;
    const depasse = dep > c.budget;
    return `
    <div class="comp-ligne">
      <div class="nom">${c.nom}</div>
      <div class="comp-piste">
        <div class="comp-fill ${depasse?'depasse':''}" style="width:${depPct}%"></div>
        <div class="comp-budget-marker" style="left:${budgetPct}%"></div>
      </div>
      <div class="comp-montant ${depasse?'depasse':''}">${fmt(dep)} FCFA</div>
    </div>`;
  }).join('');

  majOptionsFiltres();
  renderHistoriqueDepenses();
  renderRecurrentes();

  const histoEpargne = [...epargnes].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  if(histoEpargne.length===0){
    document.getElementById('histoEpargneBody').innerHTML = '<div class="vide">Aucune épargne enregistrée pour le moment.</div>';
  } else {
    document.getElementById('histoEpargneBody').innerHTML = histoEpargne.map((e,i)=>{
      const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) : '';
      return `
      <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
        <span class="dot"></span>
        <div>
          <div>${e.note ? e.note : 'Épargne'}</div>
          <div class="meta">${dateStr}</div>
        </div>
        <div class="montant">+${fmt(e.montant)} FCFA</div>
        <button class="del" data-id="${e.id}" title="Supprimer">×</button>
      </div>`;
    }).join('');
    document.querySelectorAll('#histoEpargneBody .del').forEach(b=>{
      b.addEventListener('click', ()=>supprimerEpargne(b.dataset.id));
    });
  }

  renderEntrees();
  renderEpargne();
  renderGraphiqueMois();
  renderGraphiqueRevenu();
  renderGraphiqueEpargne();
  renderHistoriqueBudgets();
}

function renderEntrees(){
  const total = entrees.reduce((s,e)=>s+e.montant,0);
  animerValeur(document.getElementById('totalEntrees'), prevEntreesTotal, total, v=>fmt(v)+' <small>FCFA</small>');
  prevEntreesTotal = total;
  const tri = [...entrees].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  const body = document.getElementById('entreesBody');
  if(tri.length===0){
    body.innerHTML = '<div class="vide">Aucune entrée enregistrée pour le moment.</div>';
    return;
  }
  body.innerHTML = tri.map((e,i)=>{
    const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
    return `
    <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
      <span class="dot"></span>
      <div>
        <div>${e.note ? e.note : 'Entrée'}</div>
        <div class="meta">${dateStr}</div>
      </div>
      <div class="montant">+${fmt(e.montant)} FCFA</div>
      <button class="del" data-id="${e.id}" title="Supprimer">×</button>
    </div>`;
  }).join('');
  document.querySelectorAll('#entreesBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerEntree(b.dataset.id));
  });
}

function renderEpargne(){
  const total = epargnes.reduce((s,e)=>s+e.montant,0);
  animerValeur(document.getElementById('totalEpargne'), prevEpargneTotal, total, v=>fmt(v)+' <small>FCFA</small>');
  prevEpargneTotal = total;
  const tri = [...epargnes].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.id||'').localeCompare(a.id||''));
  const body = document.getElementById('epargneBody');
  if(tri.length===0){
    body.innerHTML = '<div class="vide">Aucune épargne enregistrée pour le moment.</div>';
    return;
  }
  body.innerHTML = tri.map((e,i)=>{
    const dateStr = e.date ? new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
    return `
    <div class="ligne-entree" style="animation-delay:${Math.min(i,8)*0.03}s">
      <span class="dot"></span>
      <div>
        <div>${e.note ? e.note : 'Épargne'}</div>
        <div class="meta">${dateStr}</div>
      </div>
      <div class="montant">+${fmt(e.montant)} FCFA</div>
      <button class="del" data-id="${e.id}" title="Supprimer">×</button>
    </div>`;
  }).join('');
  document.querySelectorAll('#epargneBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerEpargne(b.dataset.id));
  });
}

function renderGraphiqueMois(){
  const moisEl = document.getElementById('moisSelect');
  if(!moisEl.value) moisEl.value = moisActuel();
  const mois = moisEl.value;
  const label = document.getElementById('moisSelectLabel');
  if(label){
    const court = new Date(mois+'-01T00:00:00').toLocaleDateString('fr-FR', {month:'short', year:'numeric'});
    label.textContent = court.replace('.', '');
  }
  const depMois = depenses.filter(d=>d.date && d.date.startsWith(mois));
  const entMois = entrees.filter(e=>e.date && e.date.startsWith(mois));
  const totalDepMois = depMois.reduce((s,d)=>s+d.montant,0);
  const totalEntMois = entMois.reduce((s,e)=>s+e.montant,0);
  document.getElementById('moisDepense').textContent = fmt(totalDepMois)+' FCFA';
  document.getElementById('moisEntree').textContent = fmt(totalEntMois)+' FCFA';

  const conteneur = document.getElementById('barresMois');
  if(totalDepMois === 0){
    conteneur.innerHTML = '<div class="mois-vide">Aucune dépense enregistrée pour ce mois.</div>';
    return;
  }
  const parCategorie = CATEGORIES.map(c=>({
    ...c,
    total: depMois.filter(d=>d.cat===c.id).reduce((s,d)=>s+d.montant,0)
  }));
  const max = Math.max(...parCategorie.map(c=>c.total), 1);
  conteneur.innerHTML = parCategorie.map((c,i)=>{
    const h = c.total ? Math.max(6, (c.total/max)*150) : 2;
    return `
    <div class="barre-col">
      <div class="valeur-barre">${c.total ? fmt(c.total) : ''}</div>
      <div class="barre-visuelle" style="height:0px; background:${c.couleur}; transition-delay:${i*0.05}s" data-h="${h}"></div>
      <div class="label-barre">${c.nom}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      document.querySelectorAll('.barre-visuelle').forEach(el=>{
        el.style.height = el.dataset.h + 'px';
      });
    });
  });
}

function renderGraphiqueRevenu(){
  const maintenant = new Date();
  const mois = [];
  for(let i=5;i>=0;i--){
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth()-i, 1);
    mois.push({ cle: d.toISOString().slice(0,7), label: d.toLocaleDateString('fr-FR',{month:'short'}) });
  }
  const totaux = mois.map(m=>({
    ...m,
    total: entrees.filter(e=>e.date && e.date.startsWith(m.cle)).reduce((s,e)=>s+e.montant,0)
  }));
  const moyenne = totaux.reduce((s,m)=>s+m.total,0) / totaux.length;
  document.getElementById('revenuMoyenne').textContent = fmt(moyenne)+' FCFA';
  document.getElementById('revenuCeMois').textContent = fmt(totaux[totaux.length-1].total)+' FCFA';

  const conteneur = document.getElementById('barresRevenu');
  if(totaux.every(m=>m.total===0)){
    conteneur.innerHTML = '<div class="mois-vide">Aucune entrée enregistrée sur les 6 derniers mois.</div>';
    return;
  }
  const max = Math.max(...totaux.map(m=>m.total), 1);
  conteneur.innerHTML = totaux.map((m,i)=>{
    const h = m.total ? Math.max(6, (m.total/max)*150) : 2;
    return `
    <div class="barre-col">
      <div class="valeur-barre">${m.total ? fmt(m.total) : ''}</div>
      <div class="barre-visuelle" style="height:0px; background:var(--vert); transition-delay:${i*0.05}s" data-h="${h}"></div>
      <div class="label-barre">${m.label}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      conteneur.querySelectorAll('.barre-visuelle').forEach(el=>{
        el.style.height = el.dataset.h + 'px';
      });
    });
  });
}

function renderGraphiqueEpargne(){
  const maintenant = new Date();
  const mois = [];
  for(let i=5;i>=0;i--){
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth()-i, 1);
    mois.push({ cle: d.toISOString().slice(0,7), label: d.toLocaleDateString('fr-FR',{month:'short'}) });
  }
  const totaux = mois.map(m=>({
    ...m,
    total: epargnes.filter(e=>e.date && e.date.startsWith(m.cle)).reduce((s,e)=>s+e.montant,0)
  }));
  const moyenne = totaux.reduce((s,m)=>s+m.total,0) / totaux.length;
  document.getElementById('epargneMoyenne').textContent = fmt(moyenne)+' FCFA';
  document.getElementById('epargneCeMois').textContent = fmt(totaux[totaux.length-1].total)+' FCFA';

  const conteneur = document.getElementById('barresEpargne');
  if(totaux.every(m=>m.total===0)){
    conteneur.innerHTML = '<div class="mois-vide">Aucune épargne enregistrée sur les 6 derniers mois.</div>';
    return;
  }
  const max = Math.max(...totaux.map(m=>m.total), 1);
  conteneur.innerHTML = totaux.map((m,i)=>{
    const h = m.total ? Math.max(6, (m.total/max)*150) : 2;
    return `
    <div class="barre-col">
      <div class="valeur-barre">${m.total ? fmt(m.total) : ''}</div>
      <div class="barre-visuelle" style="height:0px; background:var(--bleu-clair); transition-delay:${i*0.05}s" data-h="${h}"></div>
      <div class="label-barre">${m.label}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      conteneur.querySelectorAll('.barre-visuelle').forEach(el=>{
        el.style.height = el.dataset.h + 'px';
      });
    });
  });
}

