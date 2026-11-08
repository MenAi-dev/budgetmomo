// Conseils budget (onglet Analyse) : une grille de cartes ; au toucher, la fiche s'ouvre DEPUIS la carte,
// une petite animation illustre le conseil, puis les détails apparaissent (repris des « lois du temps » du kit Tâches).
// Glisser à gauche / à droite pour changer de fiche, vers le bas pour fermer. Certaines fiches ajoutent un calcul
// « Pour toi » à partir de tes propres chiffres (revenus, dépenses).

// [nom, origine, ce qu'il dit, ce que tu fais]
const CONSEILS = [
  ['La règle 50/30/20', 'Elizabeth Warren · 2005',
    'Partage tes revenus en trois : 50 % pour les besoins (loyer, nourriture, transport), 30 % pour les envies, 20 % pour l\'épargne.',
    'Range chaque poste en « besoin » ou « envie », et vise 20 % de tes revenus en épargne chaque mois.'],
  ['L\'épargne d\'abord', 'George S. Clason · 1926',
    'On met de côté dès que l\'argent arrive, avant de dépenser. Épargner « ce qui reste » à la fin du mois ne marche presque jamais.',
    'Le jour du salaire, ajoute tout de suite une épargne dans l\'onglet Argent. Même petite, mais tout de suite.'],
  ['Le fonds d\'urgence', 'Règle de prudence financière',
    'Une réserve de 3 à 6 mois de dépenses protège des coups durs : maladie, panne, perte de revenu.',
    'Crée un objectif d\'épargne « Fonds d\'urgence » et alimente-le chaque mois, avant les envies.'],
  ['Les petites dépenses', 'L\'« effet latte » · David Bach',
    'Les petites sommes répétées pèsent lourd : 500 FCFA par jour, c\'est 15 000 FCFA par mois et 180 000 par an.',
    'Regarde ta courbe des dépenses par jour : repère la petite dépense qui revient, et décide si elle vaut ce prix.'],
  ['La règle des 24 heures', 'Contre l\'achat impulsif',
    'Une envie d\'achat non prévue ? Attends 24 heures. Très souvent, l\'envie passe d\'elle-même.',
    'Note l\'achat, et reviens-y demain. S\'il est toujours utile et qu\'il rentre dans le budget, fais-le sans culpabilité.'],
  ['Chaque franc a un rôle', 'Le budget base zéro · Peter Pyhrr, 1970',
    'Avant le début du mois, donne une mission à chaque franc : un poste ou une épargne. Revenus − répartition = 0.',
    'Dans « Modifier le budget », répartis tout ton revenu entre tes postes et l\'épargne, jusqu\'au dernier franc.'],
  ['La boule de neige', 'Remboursement des dettes · Dave Ramsey',
    'Pour rembourser plusieurs dettes, commence par la plus petite. Chaque dette soldée libère de l\'argent pour la suivante.',
    'Classe tes dettes de la plus petite à la plus grande. Paie le minimum partout, et tout le reste sur la plus petite.'],
  ['La dépense prioritaire', 'L\'essentiel en premier',
    'Loyer, factures, scolarité : ce qui ne peut pas attendre se paie en début de mois, avant tout le reste.',
    'Ajoute ces paiements en dépenses récurrentes (onglet Historique) : ils seront comptés automatiquement chaque mois.'],
  ['Le bilan du soir', 'Deux minutes par jour',
    'Une dépense oubliée fausse tout le budget. Noter chaque soir ce qui a été dépensé garde les chiffres justes.',
    'Chaque soir, ouvre l\'appli et ajoute les dépenses du jour : taxi, marché, crédit téléphone…']
];

// Une illustration animée par conseil (SVG 240 × 110, animée en CSS : css/modules.css)
const ILLUSTRATIONS_CONSEILS = [
  // 50/30/20 : trois colonnes qui montent l'une après l'autre
  `<path class="f-axe" d="M14 96H226"/>
   <rect class="f-plein f-monte" style="--d:.45s" x="30" y="26" width="46" height="70" rx="6"/>
   <rect class="f-plein f-monte f-env" style="--d:.7s" x="97" y="54" width="46" height="42" rx="6"/>
   <rect class="f-plein f-monte f-ep" style="--d:.95s" x="164" y="68" width="46" height="28" rx="6"/>
   <text class="f-app f-fort" style="--d:.9s" x="53" y="19" text-anchor="middle">50 %</text>
   <text class="f-app f-fort" style="--d:1.15s" x="120" y="47" text-anchor="middle">30 %</text>
   <text class="f-app f-fort" style="--d:1.4s" x="187" y="61" text-anchor="middle">20 %</text>
   <text x="53" y="109" text-anchor="middle">besoins</text><text x="120" y="109" text-anchor="middle">envies</text><text x="187" y="109" text-anchor="middle">épargne</text>`,
  // Épargne d'abord : la part épargne quitte le salaire AVANT le reste
  `<text x="10" y="16">salaire du mois</text>
   <rect class="f-plein" x="62" y="24" width="168" height="26" rx="6"/>
   <rect class="f-ep f-glisse" x="10" y="24" width="48" height="26" rx="6"/>
   <text class="f-app f-blanc" style="--d:1.3s" x="72" y="41">à dépenser</text>
   <text class="f-app f-fort" style="--d:1.25s" x="66" y="88">← épargné en premier</text>`,
  // Fonds d'urgence : la réserve se remplit mois après mois
  `<text x="10" y="16">réserve, en mois de dépenses</text>
   ${[0,1,2,3,4,5].map(i=>`<rect class="f-plein f-pop${i > 2 ? ' f-env' : ''}" style="--d:${(.45 + i * .18).toFixed(2)}s" x="${14 + i * 36}" y="30" width="30" height="46" rx="6"/>`).join('')}
   <line class="f-seuil" x1="122" x2="122" y1="24" y2="86"/>
   <text class="f-app" style="--d:1.2s" x="122" y="100" text-anchor="middle">3 mois : minimum</text>
   <text class="f-app" style="--d:1.6s" x="230" y="100" text-anchor="end">6</text>`,
  // Petites dépenses : les petites pièces s'additionnent en une grosse barre
  `${[0,1,2,3,4,5,6,7,8,9].map(i=>`<circle class="f-piece f-pop" style="--d:${(.4 + i * .08).toFixed(2)}s" cx="${20 + i * 22}" cy="26" r="8"/>`).join('')}
   <text x="10" y="54">500 FCFA × 30 jours</text>
   <rect class="f-plein f-etire" style="--d:1.3s" x="10" y="64" width="220" height="28" rx="7"/>
   <text class="f-app f-blanc" style="--d:1.9s" x="22" y="83">= 15 000 FCFA par mois</text>`,
  // 24 heures : l'horloge tourne… et l'envie s'estompe
  `<g transform="translate(62 54)"><circle class="f-cadre" r="34"/><line class="f-aiguille f-tourne" x1="0" y1="0" x2="0" y2="-26"/><circle class="f-centre" r="3"/></g>
   <text x="62" y="106" text-anchor="middle">24 h</text>
   <g class="f-estompe" transform="translate(150 30)"><path class="f-trait-fixe" d="M0 4h10l7 28h36l7-22H14"/><circle class="f-centre" cx="22" cy="42" r="4"/><circle class="f-centre" cx="50" cy="42" r="4"/></g>
   <text class="f-app" style="--d:2s" x="186" y="96" text-anchor="middle">l'envie passe</text>`,
  // Chaque franc a un rôle : le revenu se découpe en enveloppes, il ne reste rien sans mission
  `<text x="10" y="16">revenus</text>
   <rect class="f-plein" x="10" y="22" width="220" height="22" rx="6"/>
   <rect class="f-plein f-pop" style="--d:.6s" x="10" y="60" width="76" height="26" rx="6"/>
   <rect class="f-plein f-pop f-env" style="--d:.8s" x="90" y="60" width="54" height="26" rx="6"/>
   <rect class="f-plein f-pop f-ep" style="--d:1s" x="148" y="60" width="40" height="26" rx="6"/>
   <rect class="f-plein f-pop f-ep2" style="--d:1.2s" x="192" y="60" width="38" height="26" rx="6"/>
   <text class="f-app" style="--d:1.5s" x="230" y="104" text-anchor="end">reste sans rôle : 0</text>`,
  // Boule de neige : la plus petite dette disparaît d'abord, puis la suivante
  `<rect class="f-plein f-solde" style="--d:.6s" x="10" y="18" width="60" height="20" rx="5"/>
   <rect class="f-plein f-solde" style="--d:1.5s" x="10" y="46" width="110" height="20" rx="5"/>
   <rect class="f-plein f-env" x="10" y="74" width="170" height="20" rx="5"/>
   <text x="78" y="33">petite</text><text x="128" y="61">moyenne</text><text x="188" y="89">grande</text>
   <circle class="f-boule" cx="214" cy="30" r="14"/>`,
  // Dépense prioritaire : le loyer passe en premier, coché
  `<rect class="f-plein f-pop" style="--d:.4s" x="10" y="12" width="220" height="26" rx="7"/>
   <text class="f-app f-blanc" style="--d:.6s" x="20" y="30">Loyer · factures</text>
   <path class="f-coche" d="M200 25l6 6 12-13"/>
   <rect class="f-ligne-g" x="10" y="46" width="220" height="24" rx="7"/><text x="20" y="62">Sorties</text>
   <rect class="f-ligne-g" x="10" y="78" width="220" height="24" rx="7"/><text x="20" y="94">Achats plaisir</text>`,
  // Bilan du soir : la lune, et les dépenses du jour cochées une à une
  `<path class="f-lune" d="M50 18a30 30 0 1 0 22 50 24 24 0 1 1-22-50z"/>
   ${[0,1,2].map(i=>`<rect class="f-ligne-g" x="100" y="${16 + i * 30}" width="130" height="22" rx="6"/>
     <path class="f-coche f-coche-p" style="--d:${(.7 + i * .35).toFixed(2)}s" d="M108 ${27 + i * 30}l4 4 8-9"/>
     <text x="126" y="${31 + i * 30}">${['taxi','marché','crédit'][i]}</text>`).join('')}`
];

// Calcul « Pour toi » (facultatif) à partir des chiffres de la personne
function revenuMensuelRef(){
  const ceMois = entrees.filter(e=>(e.date || '').startsWith(moisActuel())).reduce((s, e)=>s + e.montant, 0);
  if(ceMois > 0) return { v:ceMois, source:'tes entrées de ce mois' };
  const parMois = {};
  entrees.forEach(e=>{ const m = (e.date || '').slice(0, 7); if(m) parMois[m] = (parMois[m] || 0) + e.montant; });
  const vals = Object.keys(parMois).sort().slice(-6).map(m=>parMois[m]);
  return vals.length ? { v:vals.reduce((s, x)=>s + x, 0) / vals.length, source:'la moyenne de tes entrées' } : null;
}
function depenseMensuelleRef(){
  const mc = moisActuel(), parMois = {};
  depenses.forEach(d=>{ const m = (d.date || '').slice(0, 7); if(m && m < mc) parMois[m] = (parMois[m] || 0) + d.montant; });
  const vals = Object.keys(parMois).sort().slice(-3).map(m=>parMois[m]);
  if(vals.length) return vals.reduce((s, x)=>s + x, 0) / vals.length;
  return totalBudget() || null; // pas encore de mois complet : on prend le budget
}
const POUR_TOI = {
  0: ()=>{
    const r = revenuMensuelRef();
    if(!r) return 'Ajoute tes entrées d\'argent : le calcul se fera sur tes revenus.';
    return `Sur ${fmt(r.v)} FCFA (${r.source}) : <b>${fmt(r.v * .5)}</b> besoins · <b>${fmt(r.v * .3)}</b> envies · <b>${fmt(r.v * .2)}</b> épargne.`;
  },
  2: ()=>{
    const d = depenseMensuelleRef();
    if(!d) return '';
    const ep = situation().epargneNette;
    const pct = Math.min(100, Math.round(ep / (d * 3) * 100));
    return `3 mois de dépenses ≈ <b>${fmt(d * 3)} FCFA</b> (6 mois ≈ ${fmt(d * 6)}). Ton épargne en couvre ${pct} %.`;
  },
  8: ()=>{
    const duJour = depenses.filter(x=>x.date === auj());
    const total = duJour.reduce((s, x)=>s + x.montant, 0);
    return duJour.length
      ? `Aujourd'hui : <b>${fmt(total)} FCFA</b> notés en ${duJour.length} dépense${duJour.length > 1 ? 's' : ''}. Rien d'oublié ?`
      : 'Aucune dépense notée aujourd\'hui. Vraiment rien ?';
  }
};

let conseilOuvert = -1;
const totalConseils = String(CONSEILS.length).padStart(2, '0');
function htmlConseil(i){
  const [nom, origine, dit, fais] = CONSEILS[i];
  let pourToi = '';
  try{ pourToi = POUR_TOI[i] ? POUR_TOI[i]() : ''; }catch(_){ pourToi = ''; }
  return `<div class="fc-num-grand">${String(i + 1).padStart(2, '0')} / ${totalConseils}</div>
    <h2 class="fc-nom" id="fcNom">${nom}</h2>
    <div class="fc-origine">${origine}</div>
    <svg class="fc-illu" viewBox="0 0 240 110" aria-hidden="true">${ILLUSTRATIONS_CONSEILS[i]}</svg>
    <div class="fc-bloc b1"><span class="fc-etiquette">Ce qu'il dit</span><p>${dit}</p></div>
    <div class="fc-bloc b2"><span class="fc-etiquette">Ce que tu fais</span><p>${fais}</p></div>
    ${pourToi ? `<div class="fc-bloc b3 fc-pour-toi"><span class="fc-etiquette">Pour toi</span><p>${pourToi}</p></div>` : ''}
    <div class="fc-points">${CONSEILS.map((_, k)=>`<i class="${k === i ? 'actif' : ''}"></i>`).join('')}</div>`;
}
function ouvrirConseil(i, source){
  const o = document.getElementById('overlayConseil'), panneau = document.getElementById('fcPanneau');
  conseilOuvert = i;
  document.getElementById('fcContenu').innerHTML = htmlConseil(i);
  // La fiche grandit depuis la carte touchée
  if(source){
    const r = source.getBoundingClientRect();
    panneau.style.setProperty('--ox', `${r.left + r.width / 2}px`);
    panneau.style.setProperty('--oy', `${r.top + r.height / 2}px`);
  }
  o.classList.remove('ferme'); o.classList.add('actif');
  document.body.classList.add('fiche-ouverte');
  vibrer('');
  setTimeout(()=>{ const f = o.querySelector('[data-fcact="fermer"]'); if(f) f.focus({ preventScroll:true }); }, 60);
}
function fermerConseil(){
  const o = document.getElementById('overlayConseil');
  if(!o.classList.contains('actif')) return;
  o.classList.add('ferme');
  document.body.classList.remove('fiche-ouverte');
  setTimeout(()=>{ o.classList.remove('actif', 'ferme'); conseilOuvert = -1; }, 260);
}
function changerConseil(sens){
  if(conseilOuvert < 0) return;
  const i = (conseilOuvert + sens + CONSEILS.length) % CONSEILS.length;
  const c = document.getElementById('fcContenu');
  c.classList.remove('vers-g', 'vers-d'); void c.offsetWidth;
  c.classList.add(sens > 0 ? 'vers-g' : 'vers-d');
  conseilOuvert = i;
  c.innerHTML = htmlConseil(i);
  vibrer('');
}

(function(){
  const grille = document.getElementById('conseils');
  if(!grille) return;
  grille.innerHTML = CONSEILS.map(([n], i)=>
    `<button type="button" class="fc-carte" style="--i:${i}" data-conseil="${i}" aria-label="Conseil : ${n}">
       <span class="fc-num">${String(i + 1).padStart(2, '0')}</span><b>${n}</b></button>`).join('');

  // Fenêtre créée une fois, à la fin de la page
  const o = document.createElement('div');
  o.className = 'overlay-conseil'; o.id = 'overlayConseil';
  o.innerHTML = `<div class="fc-panneau" id="fcPanneau" role="dialog" aria-modal="true" aria-labelledby="fcNom">
      <button class="fc-btn fc-fermer" type="button" data-fcact="fermer" aria-label="Fermer">✕</button>
      <div class="fc-contenu" id="fcContenu"></div>
      <div class="fc-nav">
        <button class="fc-btn" type="button" data-fcact="prec" aria-label="Conseil précédent">‹</button>
        <button class="fc-btn" type="button" data-fcact="suiv" aria-label="Conseil suivant">›</button>
      </div>
    </div>`;
  document.body.appendChild(o);

  document.addEventListener('click', e=>{
    const c = e.target.closest('[data-conseil]');
    if(c){ ouvrirConseil(Number(c.dataset.conseil), c); return; }
    const a = e.target.closest('[data-fcact]');
    if(a){ const v = a.dataset.fcact; v === 'fermer' ? fermerConseil() : changerConseil(v === 'suiv' ? 1 : -1); return; }
    if(e.target === o) fermerConseil();
  });
  document.addEventListener('keydown', e=>{
    if(conseilOuvert < 0) return;
    if(e.key === 'Escape') fermerConseil();
    else if(e.key === 'ArrowRight') changerConseil(1);
    else if(e.key === 'ArrowLeft') changerConseil(-1);
  });
  // Glisser à gauche / à droite pour changer de fiche, vers le bas pour fermer
  let x0 = null, y0 = null;
  o.addEventListener('touchstart', e=>{ x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive:true });
  o.addEventListener('touchend', e=>{
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) changerConseil(dx < 0 ? 1 : -1);
    else if(dy > 90 && Math.abs(dy) > Math.abs(dx) && document.getElementById('fcPanneau').scrollTop <= 0) fermerConseil();
    x0 = y0 = null;
  });
})();
