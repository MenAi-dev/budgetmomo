// Écran de bienvenue au lancement : logo animé, salutation selon l'heure, prénom lettre par lettre,
// une phrase sur le budget du mois (« Reste à dépenser : 85 000 FCFA »), puis transition vers l'application.
// Toucher l'écran le passe. Sans prénom enregistré, il est demandé une seule fois (« Plus tard » ne redemande pas).
// Avec un code PIN, l'accueil joue après le déverrouillage. Lancé par js/app.js une fois les données chargées.
const CLE_PRENOM_DEMANDE = 'budgetPrenomDemande';

function lancerAccueil(){
  const s = document.getElementById('splash'), racine = document.documentElement;
  if(!s || !racine.classList.contains('avec-splash')) return;
  const rapide = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Le logo « Mon Budget » (icons/logo-mon-budget.png) : c'est le logo de l'intérieur de l'appli.
  // L'icône avec la courbe (icons/app-icon-*.png) est celle de l'écran d'accueil du téléphone.
  const LOGO = `<img class="sp-logo" src="icons/logo-mon-budget.png" alt="" width="104" height="104">`;

  function salutation(){
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? 'Bonjour' : h >= 12 && h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }
  // Une phrase sur le mois en cours : ce qui reste à dépenser, et combien par jour
  function resume(){
    try{
      const budget = budgetDepenses(); // l'objectif d'épargne n'est pas de l'argent à dépenser
      if(!budget) return 'Définis ton budget du mois pour commencer.';
      const dep = depensesDuMois(moisActuel()).reduce((t, d)=>t + d.montant, 0);
      const reste = budget - dep;
      const ctx = contexteMois();
      const mois = nomMoisLong(moisActuel());
      if(reste < 0) return `Budget de ${mois} dépassé de <b>${fmt(-reste)} FCFA</b>. On reprend la main ?`;
      const joursRestants = ctx.joursMois - ctx.jour + 1;
      const parJour = joursRestants > 0 ? reste / joursRestants : reste;
      return `Reste à dépenser : <b>${fmt(reste)} FCFA</b>`
        + (joursRestants > 1 ? `<br>soit environ ${fmt(parJour)} FCFA par jour jusqu'à la fin de ${mois}.` : ` pour ${mois}.`);
    }catch(_){ return ''; }
  }

  let fini = false;
  function fermer(){
    if(fini) return;
    fini = true;
    s.classList.add('sortie');
    document.removeEventListener('keydown', surTouche);
    setTimeout(()=>{
      racine.classList.remove('avec-splash');
      s.remove();
      document.body.classList.remove('entree'); void document.body.offsetWidth; document.body.classList.add('entree');
      if(typeof rendreCourbeJours === 'function') rendreCourbeJours(); // la courbe connaît enfin sa vraie largeur
    }, rapide ? 50 : 520);
  }
  function surTouche(e){ if(e.key === 'Escape' || e.key === 'Enter') fermer(); }

  function jouer(){
    const nom = prefs.prenom;
    const lettres = [...nom].map((c, i)=>`<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    s.innerHTML = `<div class="sp-boite">
        ${LOGO}
        <div class="sp-salut">${salutation()}${nom ? ',' : ''}</div>
        ${nom ? `<div class="sp-nom" aria-label="${esc(nom)}">${lettres}</div>` : ''}
        <div class="sp-sous">${resume()}</div>
        <div class="sp-barre"><i></i></div>
      </div>`;
    s.classList.add('joue');
    setTimeout(fermer, rapide ? 900 : 2900 + Math.min(nom.length, 14) * 45);
    s.addEventListener('click', fermer);
    document.addEventListener('keydown', surTouche);
  }

  // Première fois : on demande le prénom
  function demanderPrenom(){
    try{ localStorage.setItem(CLE_PRENOM_DEMANDE, '1'); }catch(_){}
    s.innerHTML = `<form class="sp-boite sp-form" id="spForm" autocomplete="off">
        ${LOGO}
        <div class="sp-salut">Bienvenue</div>
        <div class="sp-question">Comment t'appelles-tu ?</div>
        <input id="spNom" type="text" maxlength="30" placeholder="Ton prénom" autocomplete="given-name" enterkeyhint="go">
        <button class="btn-valider" type="submit">Continuer</button>
        <button class="lien-discret" type="button" id="spPasser">Plus tard</button>
      </form>`;
    setTimeout(()=>{ const c = document.getElementById('spNom'); if(c) c.focus(); }, 700);
    document.getElementById('spForm').addEventListener('submit', e=>{
      e.preventDefault();
      const v = document.getElementById('spNom').value.trim().slice(0, 30);
      if(!v){ document.getElementById('spNom').focus(); return; }
      prefs = nettoyerPrefs({ ...prefs, prenom: v });
      sauverPrefs();
      appliquerPrefs(); // l'en-tête affiche « Bonjour … »
      jouer();
    });
    document.getElementById('spPasser').addEventListener('click', jouer);
  }

  function lancer(){
    let dejaDemande = false;
    try{ dejaDemande = !!localStorage.getItem(CLE_PRENOM_DEMANDE); }catch(_){}
    (prefs.prenom || dejaDemande) ? jouer() : demanderPrenom();
  }

  // Avec un code PIN : l'accueil attend le déverrouillage
  if(racine.classList.contains('verrouille')){
    const mo = new MutationObserver(()=>{ if(!racine.classList.contains('verrouille')){ mo.disconnect(); lancer(); } });
    mo.observe(racine, { attributes:true, attributeFilter:['class'] });
  } else lancer();
}
