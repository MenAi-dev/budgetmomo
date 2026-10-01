// Dépenses d'un poste sur un mois (par défaut : le mois en cours).
function depensePar(catId, mois){
  return depensesDuMois(mois || moisActuel()).filter(d=>d.cat===catId).reduce((s,d)=>s+d.montant,0);
}

// Situation globale : l'épargne est retranchée des entrées, et un dépassement du budget du mois est pris sur l'épargne.
function situation(){
  const entreesTot = entrees.reduce((s,e)=>s+e.montant,0);
  const epargneBrute = epargnes.reduce((s,e)=>s+e.montant,0);
  const depTous = depenses.reduce((s,d)=>s+d.montant,0);
  const mc = moisActuel();
  const depMois = depensesDuMois(mc).reduce((s,d)=>s+d.montant,0);
  // Dépassement cumulé : chaque mois (jusqu'au mois en cours) dépassant son budget est pris sur l'épargne, définitivement.
  const mois = [...new Set(depenses.map(d=>(d.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m) && m<=mc))];
  let depassementTotal = 0, depassementMois = 0;
  mois.forEach(m=>{
    const fige = m < mc ? historiqueBudgets.find(h=>h.mois===m) : null; // mois en cours : budget actuel
    const budgetM = fige ? fige.total : totalBudget();
    const dep = depensesDuMois(m).reduce((s,d)=>s+d.montant,0);
    const exces = Math.max(0, dep - budgetM);
    depassementTotal += exces;
    if(m===mc) depassementMois = exces;
  });
  const prise = Math.min(depassementTotal, epargneBrute);
  return {
    entreesTot, epargneBrute, depTous, depMois, depassement: depassementTotal, depassementMois, prise,
    epargneNette: epargneBrute - prise,
    poche: entreesTot - epargneBrute - depTous + prise
  };
}

// Couleurs du graphique d'accueil (volontairement hors bleu, pour bien distinguer les postes).
const COULEURS_GRAPHIQUE = ['#FF9F0A','#30D158','#BF5AF2','#FF375F','#FFD60A','#AC8E68','#A3E635','#FF6B6B'];

// Répartition des dépenses du mois par poste.
function renderGraphiqueAccueil(){
  const bloc = document.getElementById('blocRepartition');
  const lignes = CATEGORIES
    .map((c,i)=>({ nom:c.nom, dep:depensePar(c.id), couleur:COULEURS_GRAPHIQUE[i % COULEURS_GRAPHIQUE.length] }))
    .filter(l=>l.dep>0)
    .sort((a,b)=>b.dep-a.dep);
  const total = lignes.reduce((s,l)=>s+l.dep,0);
  bloc.hidden = total === 0;
  if(total === 0) return;
  let acc = 0;
  const stops = lignes.map(l=>{
    const debut = acc/total*360; acc += l.dep; const fin = acc/total*360;
    return `${l.couleur} ${debut}deg ${fin}deg`;
  }).join(', ');
  const donut = document.getElementById('donut');
  donut.style.background = `conic-gradient(${stops})`;
  donut.style.setProperty('mask','radial-gradient(circle, transparent 56%, black 57%)');
  donut.style.setProperty('-webkit-mask','radial-gradient(circle, transparent 56%, black 57%)');
  document.getElementById('donutTotal').textContent = fmt(total);
  document.getElementById('legende').innerHTML = lignes.map((l,i)=>`
    <div class="leg-ligne" style="animation-delay:${i*0.05}s">
      <span class="dot" style="background:${l.couleur}"></span>
      <span class="nom">${l.nom}</span>
      <span class="montant">${fmt(l.dep)} FCFA</span>
      <span class="pct-val" style="color:var(--blanc)">${Math.round(l.dep/total*100)}%</span>
    </div>`).join('');
}

function rendre(){
  const budgetActuel = totalBudget();
  const totalDepenseTous = depenses.reduce((s,d)=>s+d.montant,0);            // cumul, pour l'argent en poche
  const totalDepense = depensesDuMois(moisActuel()).reduce((s,d)=>s+d.montant,0); // mois en cours
  const totalRestant = budgetActuel - totalDepense;
  const ctx = contexteMois();
  const nomMois = nomMoisLong(moisActuel());
  document.getElementById('labelDepense').textContent = 'Restant en ' + nomMois;
  document.getElementById('titrePostes').textContent = 'Postes · ' + nomMois;
  const sit = situation();
  const totalEntreesGlobal = sit.entreesTot;
  const solde = sit.poche;

  const soldeEl = document.getElementById('soldeDispo');
  animerValeur(soldeEl, prevSoldeTotal, solde, v => fmt(v)+' FCFA');
  soldeEl.className = solde >= 0 ? 'pos' : 'neg';
  prevSoldeTotal = solde;

  const totalDepenseEl = document.getElementById('totalDepense');
  const totalRestantEl = document.getElementById('totalRestant');
  animerValeur(totalDepenseEl, prevDepenseTotal, totalDepense, v => fmt(v)+' FCFA');
  animerValeur(totalRestantEl, prevRestantTotal, totalRestant, v => fmt(v)+' <small>FCFA</small>');
  totalRestantEl.className = 'resume-valeur ' + (totalRestant >= 0 ? 'pos' : 'neg');
  document.getElementById('totalBudget').textContent = fmt(budgetActuel)+' FCFA';
  prevDepenseTotal = totalDepense;
  prevRestantTotal = totalRestant;

  const pctG = budgetActuel ? Math.min(100, (totalDepense/budgetActuel)*100) : 0;
  document.getElementById('barreGlobale').style.width = pctG+'%';
  document.getElementById('pctGlobal').textContent = Math.round(pctG)+' %';
  const prevG = previsionFinDeMois(totalDepense, budgetActuel, ctx.jour, ctx.joursMois);
  const elPrevG = document.getElementById('previsionGlobale');
  elPrevG.textContent = (prevG && prevG.alerte) ? 'Au rythme actuel, le budget du mois sera dépassé (~' + fmt(prevG.fin) + ' FCFA)' : '';
  elPrevG.className = 'prevision-globale alerte';

  document.getElementById('grille').innerHTML = CATEGORIES.map((c,i)=>{
    const dep = depensePar(c.id);
    const reste = c.budget - dep;
    const pctCat = c.budget ? Math.min(100, (dep/c.budget)*100) : 0;
    const depasse = dep > c.budget;
    const proche = !depasse && c.budget > 0 && dep >= c.budget*SEUIL_ALERTE;
    const couleurBarre = depasse ? 'var(--rouge)' : proche ? 'var(--orange)' : 'var(--bleu)';
    const couleurReste = depasse ? 'var(--rouge)' : proche ? 'var(--orange)' : 'var(--bleu-clair)';
    const prev = previsionFinDeMois(dep, c.budget, ctx.jour, ctx.joursMois);
    const prevHtml = (prev && prev.alerte)
      ? '<div class="prevision alerte">Budget atteint vers le ' + prev.jourAtteint + ' ' + nomMois + ' à ce rythme</div>'
      : '';
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
      ${prevHtml}
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
        <div class="actions-ligne"><button class="edit" data-id="${e.id}" title="Modifier">✎</button><button class="del" data-id="${e.id}" title="Supprimer">×</button></div>
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
  renderObjectif();
  renderGraphiqueAccueil();
  brancherEditions();
  majInfoSauvegarde();
}

function brancherEditions(){
  document.querySelectorAll('#entreesBody .edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionEntree(b.dataset.id));
  });
  document.querySelectorAll('#epargneBody .edit, #histoEpargneBody .edit').forEach(b=>{
    b.addEventListener('click', ()=>ouvrirEditionEpargne(b.dataset.id));
  });
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
      <div class="actions-ligne"><button class="edit" data-id="${e.id}" title="Modifier">✎</button><button class="del" data-id="${e.id}" title="Supprimer">×</button></div>
    </div>`;
  }).join('');
  document.querySelectorAll('#entreesBody .del').forEach(b=>{
    b.addEventListener('click', ()=>supprimerEntree(b.dataset.id));
  });
}

function renderEpargne(){
  const sit = situation();
  const total = sit.epargneNette;
  const msg = document.getElementById('messageEpargne');
  if(msg){
    msg.textContent = sit.prise > 0 ? 'Budgets dépassés : ' + fmt(sit.prise) + ' FCFA ont été pris sur ton épargne.' : '';
    msg.style.display = sit.prise > 0 ? '' : 'none';
  }
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
      <div class="actions-ligne"><button class="edit" data-id="${e.id}" title="Modifier">✎</button><button class="del" data-id="${e.id}" title="Supprimer">×</button></div>
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
  // Carte masquée tant qu'il n'y a pas au moins 2 mois de données : un graphique à une seule barre n'apprend rien.
  const carteGraphique = document.getElementById('barresRevenu').closest('.graphique-mois');
  const moisAvecDonnees = totaux.filter(m=>m.total>0).length;
  carteGraphique.hidden = moisAvecDonnees < 2;
  if(moisAvecDonnees < 2) return;
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
  // Carte masquée tant qu'il n'y a pas au moins 2 mois de données : un graphique à une seule barre n'apprend rien.
  const carteGraphique = document.getElementById('barresEpargne').closest('.graphique-mois');
  const moisAvecDonnees = totaux.filter(m=>m.total>0).length;
  carteGraphique.hidden = moisAvecDonnees < 2;
  if(moisAvecDonnees < 2) return;
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

