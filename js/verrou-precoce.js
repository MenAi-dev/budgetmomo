// Chargé dans <head>, juste APRÈS les feuilles de style, avant l'affichage : évite tout « éclair » au démarrage.
// 1. Si un code PIN est défini, l'application démarre déjà verrouillée (aucun contenu visible avant la saisie).
// 2. Le style (One UI ou Apple), le thème (clair / sombre, ou celui du téléphone en « Auto »), la couleur principale
//    et la taille du texte choisis dans les Réglages sont posés tout de suite. La logique complète est dans js/reglages.js.
// 3. L'écran de bienvenue (js/accueil.js) est préparé : il couvre la page dès le premier affichage.
try{
  var racine = document.documentElement;
  if(localStorage.getItem('budgetPin')) racine.classList.add('verrouille');
  racine.classList.add('avec-splash');
  var p = JSON.parse(localStorage.getItem('budgetPrefs') || 'null') || {};
  var clair = p.theme === 'clair' ||
    ((p.theme !== 'sombre') && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
  racine.setAttribute('data-theme', clair ? 'light' : 'dark');
  var accent = p.accent === 'turquoise' ? 'sarcelle' : p.accent; // ancien nom (avant v43)
  var accents = ['bleu','indigo','violet','rose','rouge','orange','vert','menthe','sarcelle','cyan','marron'];
  racine.setAttribute('data-accent', accents.indexOf(accent) >= 0 ? accent : 'bleu');
  if(p.texte === 'grand') racine.setAttribute('data-texte', 'grand');
  // Style : One UI par défaut ; « Apple » active css/apple.css, « Verre » active css/verre.css (par-dessus One UI)
  var style = (p.style === 'apple' || p.style === 'verre') ? p.style : 'oneui';
  racine.setAttribute('data-style', style);
  var fApple = document.getElementById('cssApple'), fVerre = document.getElementById('cssVerre');
  if(fApple) fApple.disabled = style !== 'apple';
  if(fVerre) fVerre.disabled = style !== 'verre';
}catch(e){}
