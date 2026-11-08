// Réglages : préférences personnelles (style One UI / Apple, thème, couleur principale, taille du texte, prénom, seuil d'alerte, vibrations).
// Elles sont mémorisées sur l'appareil (clé « budgetPrefs ») et incluses dans les sauvegardes.
// Au démarrage, js/verrou-precoce.js (chargé dans <head>) pose déjà le thème avant l'affichage : aucun éclair.

const CLE_PREFS = 'budgetPrefs';
const THEMES = ['auto', 'clair', 'sombre'];
const STYLES = ['oneui', 'apple'];
// Couleurs système d'Apple (la valeur exacte, claire ou sombre, est dans css/oneui.css) : [clé, nom, aperçu]
const COULEURS = [
  ['bleu','Bleu','#0A84FF'], ['indigo','Indigo','#5E5CE6'], ['violet','Violet','#BF5AF2'], ['rose','Rose','#FF375F'],
  ['rouge','Rouge','#FF453A'], ['orange','Orange','#FF9F0A'], ['vert','Vert','#30D158'], ['menthe','Menthe','#63E6E2'],
  ['sarcelle','Sarcelle','#40C8E0'], ['cyan','Cyan','#64D2FF'], ['marron','Marron','#AC8E68']
];
const ACCENTS = COULEURS.map(c=>c[0]);
const TEXTES = ['normal', 'grand'];
const SEUILS = [70, 80, 90];
// Barre d'état du téléphone, selon le style et le thème
const COULEUR_BARRE = { oneui:{ clair:'#F2F3F7', sombre:'#000000' }, apple:{ clair:'#F0F0F4', sombre:'#0C0C0F' } };

// Accepte n'importe quoi (fichier de sauvegarde, stockage modifié…) et renvoie des réglages toujours valides.
function nettoyerPrefs(p){
  const o = (p && typeof p === 'object') ? p : {};
  const accent = o.accent === 'turquoise' ? 'sarcelle' : o.accent; // ancien nom (avant v43)
  return {
    style: STYLES.includes(o.style) ? o.style : 'oneui',
    theme: THEMES.includes(o.theme) ? o.theme : 'auto',
    accent: ACCENTS.includes(accent) ? accent : 'bleu',
    texte: TEXTES.includes(o.texte) ? o.texte : 'normal',
    prenom: typeof o.prenom === 'string' ? o.prenom.trim().slice(0, 30) : '',
    seuil: SEUILS.includes(o.seuil) ? o.seuil : 80,
    vibrations: o.vibrations !== false
  };
}

let prefs = (()=>{
  try{ return nettoyerPrefs(JSON.parse(localStorage.getItem(CLE_PREFS))); }
  catch(e){ return nettoyerPrefs(null); }
})();

function sauverPrefs(){
  try{ localStorage.setItem(CLE_PREFS, JSON.stringify(prefs)); }
  catch(e){ toast("Impossible d'enregistrer les réglages (stockage plein ou bloqué).", 'danger'); }
}

// « Auto » = le thème du téléphone ; sinon le choix de la personne.
function themeEffectif(){
  if(prefs.theme !== 'auto') return prefs.theme;
  return (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'clair' : 'sombre';
}

// Applique les réglages à la page. redessiner : refaire l'affichage des données (utile si le seuil d'alerte change).
function appliquerPrefs(opts){
  const racine = document.documentElement;
  const theme = themeEffectif();
  racine.setAttribute('data-theme', theme === 'clair' ? 'light' : 'dark');
  // Style : la couche Apple (css/apple.css) se pose sur la couche One UI ; en « One UI », on la retire
  racine.setAttribute('data-style', prefs.style);
  const feuille = document.getElementById('cssApple');
  if(feuille) feuille.disabled = prefs.style !== 'apple';
  racine.setAttribute('data-accent', prefs.accent);
  const nomCouleur = COULEURS.find(c=>c[0] === prefs.accent);
  const elNom = document.getElementById('couleurNom');
  if(elNom) elNom.textContent = nomCouleur ? nomCouleur[1] : '';
  if(prefs.texte === 'grand') racine.setAttribute('data-texte', 'grand'); else racine.removeAttribute('data-texte');
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', COULEUR_BARRE[prefs.style][theme]);

  SEUIL_ALERTE = prefs.seuil / 100;
  const sousTitre = document.querySelector('header p');
  if(sousTitre) sousTitre.textContent = prefs.prenom ? 'Bonjour ' + prefs.prenom + ' 👋' : 'Suivi des dépenses par poste, en FCFA.';

  document.querySelectorAll('[data-pref]').forEach(b=>{
    b.setAttribute('aria-pressed', String(String(prefs[b.dataset.pref]) === b.dataset.valeur));
  });
  const champ = document.getElementById('prefPrenom');
  if(champ && document.activeElement !== champ) champ.value = prefs.prenom;
  const vib = document.getElementById('prefVibrations');
  if(vib) vib.checked = prefs.vibrations;
  if(opts && opts.redessiner && typeof rendre === 'function') rendre();
}

// ---------- Branchements ----------

// Pastilles de couleur (créées avant le branchement ci-dessous)
document.getElementById('pastilles').innerHTML = COULEURS.map(([k, n, c])=>
  `<button type="button" class="pastille" data-pref="accent" data-valeur="${k}" style="--c:${c}" aria-label="${n}" title="${n}"></button>`).join('');

document.querySelectorAll('[data-pref]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const cle = b.dataset.pref;
    if(String(prefs[cle]) === b.dataset.valeur) return;
    prefs = nettoyerPrefs({ ...prefs, [cle]: cle === 'seuil' ? Number(b.dataset.valeur) : b.dataset.valeur });
    sauverPrefs();
    if(cle === 'style'){
      // Léger fondu pendant le changement de style
      document.body.classList.remove('change-style'); void document.body.offsetWidth; document.body.classList.add('change-style');
      toast(prefs.style === 'apple' ? 'Style Apple' : 'Style One UI', 'info');
    }
    appliquerPrefs({ redessiner: cle === 'seuil' || cle === 'style' });
  });
});

document.getElementById('prefPrenom').addEventListener('input', e=>{
  prefs = nettoyerPrefs({ ...prefs, prenom: e.target.value });
  sauverPrefs();
  appliquerPrefs();
});

document.getElementById('prefVibrations').addEventListener('change', e=>{
  prefs = nettoyerPrefs({ ...prefs, vibrations: e.target.checked });
  sauverPrefs();
  appliquerPrefs();
  if(prefs.vibrations) vibrer('succes'); // petit essai pour que la personne sente la vibration
});

// En mode « Auto », on suit le téléphone s'il change (passage jour / nuit).
if(window.matchMedia){
  const suivi = matchMedia('(prefers-color-scheme: light)');
  const surChangement = ()=>{ if(prefs.theme === 'auto') appliquerPrefs(); };
  if(suivi.addEventListener) suivi.addEventListener('change', surChangement);
}

document.getElementById('btnResetPrefs').addEventListener('click', ()=>{
  if(!confirm('Remettre tous les réglages (style, thème, couleur, texte, prénom, alertes) à leur valeur d\'origine ? Tes données ne sont pas touchées.')) return;
  prefs = nettoyerPrefs(null);
  sauverPrefs();
  appliquerPrefs({ redessiner:true });
  toast('Réglages réinitialisés');
});

// Recharge la dernière version de l'application : retire le service worker et son cache (jamais les données).
document.getElementById('btnMajApp').addEventListener('click', async ()=>{
  if(!confirm("Mettre à jour l'application ? Elle va se recharger. Tes données ne sont pas touchées.")) return;
  try{
    if('serviceWorker' in navigator){
      const inscriptions = await navigator.serviceWorker.getRegistrations();
      await Promise.all(inscriptions.map(i=>i.unregister()));
    }
    if(window.caches){
      const noms = await caches.keys();
      await Promise.all(noms.map(n=>caches.delete(n)));
    }
  }catch(e){}
  location.reload();
});

// ---------- Présentation de l'application (vidéo plein écran) ----------
// La vidéo (video/presentation.mp4) est lue en streaming : elle n'est pas dans le cache hors ligne (voir sw.js).
const VIDEO_PRES = 'video/presentation.mp4';
function ouvrirPresentation(){
  const v = document.getElementById('presVideo');
  if(!navigator.onLine){ toast('La vidéo de présentation demande une connexion internet.', 'info'); return; }
  if(!v.getAttribute('src')) v.src = VIDEO_PRES;
  v.currentTime = 0;
  document.getElementById('overlayPresentation').classList.add('actif');
  document.body.classList.add('fiche-ouverte');
  vibrer('');
  v.play().catch(()=>{});
}
function fermerPresentation(){
  const o = document.getElementById('overlayPresentation');
  if(!o.classList.contains('actif')) return;
  o.classList.remove('actif');
  document.body.classList.remove('fiche-ouverte');
  document.getElementById('presVideo').pause();
}
document.getElementById('presVideo').addEventListener('error', ()=>{
  if(!document.getElementById('overlayPresentation').classList.contains('actif')) return;
  fermerPresentation();
  toast('La vidéo ne peut pas être lue pour le moment.', 'alerte');
});
document.getElementById('presVideo').addEventListener('ended', ()=>setTimeout(fermerPresentation, 1200));
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-pres]');
  if(!b) return;
  if(b.dataset.pres === 'ouvrir') ouvrirPresentation(); else fermerPresentation();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') fermerPresentation(); });

document.getElementById('versionApp').textContent = VERSION_APP;
appliquerPrefs();
