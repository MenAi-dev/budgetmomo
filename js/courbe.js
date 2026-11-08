// Courbe des dépenses par jour (Aperçu). SVG dessiné à la main, sans bibliothèque (repris du kit « Tâches »).
// Interactive : toucher ou glisser le doigt sur la courbe affiche le jour et ce qui a été dépensé ce jour-là.
// Période au choix : 7 ou 30 derniers jours (mémorisée sur l'appareil). La ligne en pointillés est le budget par jour
// (budget du mois ÷ nombre de jours) : un point au-dessus = une journée plus chère que prévu.
// Le trait se redessine (animation) à chaque nouvelle dépense.
const CLE_COURBE = 'budgetCourbe';
let cjJours = 7;
try{ const n = parseInt(localStorage.getItem(CLE_COURBE), 10); if(n === 7 || n === 30) cjJours = n; }catch(_){}
let cjDernierNombre = null;   // nombre de dépenses lors du dernier dessin (pour animer une nouvelle dépense)
let cjDonnees = [];           // [{ j, v, n }] pour la période affichée
let cjGeo = null;             // géométrie du dernier dessin (pour le toucher)

// Date locale AAAA-MM-JJ décalée de n jours
function cjDecaler(iso, n){
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return cleMois(d) + '-' + String(d.getDate()).padStart(2, '0');
}

// Montant dépensé et nombre de dépenses par jour, sur les n derniers jours (aujourd'hui compris)
function donneesCourbeJours(n){
  const parJour = {};
  depenses.forEach(d=>{
    if(!d.date) return;
    const p = parJour[d.date] || (parJour[d.date] = { v:0, n:0 });
    p.v += d.montant; p.n += 1;
  });
  const fin = auj(), out = [];
  for(let i = n - 1; i >= 0; i--){
    const j = cjDecaler(fin, -i), p = parJour[j];
    out.push({ j, v: p ? p.v : 0, n: p ? p.n : 0 });
  }
  return out;
}

// Courbe lisse qui ne dépasse pas les points (interpolation cubique monotone)
function cheminLisse(p){
  const n = p.length;
  if(n < 2) return `M${p[0].x},${p[0].y}`;
  const h = [], d = [];
  for(let i = 0; i < n - 1; i++){ h[i] = p[i+1].x - p[i].x; d[i] = (p[i+1].y - p[i].y) / h[i]; }
  const m = [d[0]];
  for(let i = 1; i < n - 1; i++) m[i] = d[i-1] * d[i] <= 0 ? 0 : (d[i-1] + d[i]) / 2;
  m[n-1] = d[n-2];
  for(let i = 0; i < n - 1; i++){
    if(d[i] === 0){ m[i] = 0; m[i+1] = 0; continue; }
    const a = m[i] / d[i], b = m[i+1] / d[i], s = a*a + b*b;
    if(s > 9){ const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i+1] = t * b * d[i]; }
  }
  let c = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for(let i = 0; i < n - 1; i++){
    c += `C${(p[i].x + h[i]/3).toFixed(1)},${(p[i].y + m[i]*h[i]/3).toFixed(1)} ${(p[i+1].x - h[i]/3).toFixed(1)},${(p[i+1].y - m[i+1]*h[i]/3).toFixed(1)} ${p[i+1].x.toFixed(1)},${p[i+1].y.toFixed(1)}`;
  }
  return c;
}

const cjLibelle = j => new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'short' }).replace(/\./g, '');
const cjSousTotal = somme => somme ? `dépensés · ${cjJours} derniers jours` : `Aucune dépense ces ${cjJours} derniers jours`;

function rendreCourbeJours(){
  const zone = document.getElementById('courbeJours');
  if(!zone) return;
  const jours = donneesCourbeJours(cjJours);
  cjDonnees = jours;
  const somme = jours.reduce((s, x)=>s + x.v, 0);
  const ctx = contexteMois();
  const parJourBudget = budgetDepenses() / ctx.joursMois;
  const max = Math.max(1, parJourBudget * 1.15, ...jours.map(x=>x.v)) * 1.05;
  const anime = cjDernierNombre !== null && depenses.length > cjDernierNombre;
  cjDernierNombre = depenses.length;

  // Largeur utile de la carte (sans ses marges intérieures) ; 320 si l'Aperçu est masqué (redessinée à son retour)
  const cs = getComputedStyle(zone);
  const utile = zone.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
  const W = utile > 0 ? Math.max(240, Math.round(utile)) : 320, H = 150, g = 6, haut = 14, bas = 24;
  const x = i => g + i * (W - 2 * g) / (jours.length - 1);
  const y = v => haut + (1 - v / max) * (H - haut - bas);
  const pts = jours.map((d, i)=>({ x:x(i), y:y(d.v) }));
  const ligne = cheminLisse(pts);
  const aire = `${ligne}L${pts[pts.length-1].x.toFixed(1)},${H - bas}L${pts[0].x.toFixed(1)},${H - bas}Z`;
  cjGeo = { W, pts };

  // Étiquettes de l'axe : initiales des jours (7 j) ou 3 dates (30 j)
  const etiq = jours.map((d, i)=>{
    if(cjJours === 7){
      const l = new Date(d.j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'narrow' }).toUpperCase();
      return `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="${i === jours.length - 1 ? 'auj' : ''}">${l}</text>`;
    }
    if(i === 0 || i === Math.floor((jours.length - 1) / 2) || i === jours.length - 1){
      const l = new Date(d.j + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' }).replace(/\./g, '');
      return `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === jours.length - 1 ? 'end' : 'middle'}">${l}</text>`;
    }
    return '';
  }).join('');

  // Points des journées plus chères que le budget par jour
  const chers = parJourBudget > 0
    ? pts.map((p, i)=>jours[i].v > parJourBudget ? `<circle class="cj-cher" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3"/>` : '').join('')
    : '';
  const ligneBudget = parJourBudget > 0
    ? `<line class="cj-grille cj-tiret" x1="${g}" x2="${W - g}" y1="${y(parJourBudget).toFixed(1)}" y2="${y(parJourBudget).toFixed(1)}"/>
       <text class="cj-max" x="${W - g}" y="${(y(parJourBudget) - 5).toFixed(1)}" text-anchor="end">budget/jour ${kfmt(parJourBudget)}</text>`
    : '';

  zone.innerHTML = `
    <div class="cj-tete">
      <div>
        <div class="cj-titre">Dépenses par jour</div>
        <div class="cj-valeur" id="cjVal">${fmt(somme)} <small>FCFA</small></div>
        <div class="cj-sous" id="cjSub">${cjSousTotal(somme)}</div>
      </div>
      <div class="seg seg-2 cj-seg" role="group" aria-label="Période">
        <button type="button" class="seg-btn" data-cj="7" aria-pressed="${cjJours === 7}">7 j</button>
        <button type="button" class="seg-btn" data-cj="30" aria-pressed="${cjJours === 30}">30 j</button>
      </div>
    </div>
    <div class="cj-zone" id="cjZone">
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Courbe des dépenses par jour">
        <defs><linearGradient id="cjGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--accent)" stop-opacity="0.22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        <line class="cj-grille" x1="${g}" x2="${W - g}" y1="${y(0)}" y2="${y(0)}"/>
        ${ligneBudget}
        <path class="cj-aire" d="${aire}" fill="url(#cjGrad)"/>
        <path class="cj-ligne${anime ? ' anime' : ''}" d="${ligne}" pathLength="1"/>
        ${chers}
        <g id="cjCurseur" hidden><line class="cj-guide" id="cjGuide" y1="${haut}" y2="${H - bas}"/><circle class="cj-point" id="cjPoint" r="5"/></g>
        <circle class="cj-point cj-auj" id="cjAuj" cx="${pts[pts.length-1].x.toFixed(1)}" cy="${pts[pts.length-1].y.toFixed(1)}" r="4.5"/>
        ${etiq}
      </svg>
      ${depenses.length ? '' : '<div class="cj-vide">Ajoute une dépense : ta courbe commence ici.</div>'}
    </div>`;
}

// Interactions (une seule fois, par délégation)
(function(){
  const zone = document.getElementById('courbeJours');
  if(!zone) return;
  const el = id => document.getElementById(id);
  function indexDepuis(e){
    const z = el('cjZone');
    if(!z || !cjGeo) return -1;
    const r = z.getBoundingClientRect();
    const px = (e.clientX - r.left) * (cjGeo.W / r.width);
    let meilleur = 0, dmin = Infinity;
    cjGeo.pts.forEach((p, i)=>{ const d = Math.abs(p.x - px); if(d < dmin){ dmin = d; meilleur = i; } });
    return meilleur;
  }
  let dernierIndex = -1;
  function montrer(i){
    const p = cjGeo.pts[i], d = cjDonnees[i];
    if(!p || !d) return;
    el('cjCurseur').hidden = false;
    el('cjGuide').setAttribute('x1', p.x); el('cjGuide').setAttribute('x2', p.x);
    el('cjPoint').setAttribute('cx', p.x); el('cjPoint').setAttribute('cy', p.y);
    el('cjAuj').style.opacity = 0;
    el('cjVal').innerHTML = `${fmt(d.v)} <small>FCFA</small>`;
    el('cjSub').textContent = `${cjLibelle(d.j)} · ${d.n ? d.n + ' dépense' + (d.n > 1 ? 's' : '') : 'aucune dépense'}`;
    if(i !== dernierIndex){ dernierIndex = i; vibrer(''); }
  }
  function masquer(){
    if(!el('cjCurseur')) return;
    dernierIndex = -1;
    el('cjCurseur').hidden = true; el('cjAuj').style.opacity = 1;
    const somme = cjDonnees.reduce((s, x)=>s + x.v, 0);
    el('cjVal').innerHTML = `${fmt(somme)} <small>FCFA</small>`;
    el('cjSub').textContent = cjSousTotal(somme);
  }
  let actif = false;
  zone.addEventListener('pointerdown', e=>{ if(!e.target.closest('#cjZone')) return; actif = true; const i = indexDepuis(e); if(i >= 0) montrer(i); });
  zone.addEventListener('pointermove', e=>{ if(!e.target.closest('#cjZone')) return; if(actif || e.pointerType === 'mouse'){ const i = indexDepuis(e); if(i >= 0) montrer(i); } });
  ['pointerup', 'pointercancel'].forEach(t=>zone.addEventListener(t, e=>{ actif = false; if(e.pointerType !== 'mouse') masquer(); }));
  zone.addEventListener('pointerleave', ()=>{ actif = false; masquer(); });
  zone.addEventListener('click', e=>{
    const b = e.target.closest('[data-cj]');
    if(!b) return;
    cjJours = Number(b.dataset.cj) === 30 ? 30 : 7;
    try{ localStorage.setItem(CLE_COURBE, String(cjJours)); }catch(_){}
    rendreCourbeJours();
  });
  let t = null;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(rendreCourbeJours, 150); });
})();
