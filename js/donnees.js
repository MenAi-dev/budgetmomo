// Sauvegarde : export JSON / CSV et import d'un fichier de sauvegarde.

const CLE_DERNIER_EXPORT = 'budgetDernierExport';
const SEUIL_RAPPEL_SAUVEGARDE_JOURS = 14;
const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const RE_COULEUR = /^#[0-9a-fA-F]{3,8}$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_MOIS = /^\d{4}-\d{2}$/;

function telecharger(nom, contenu, type){
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function marquerExport(){
  try{ localStorage.setItem(CLE_DERNIER_EXPORT, new Date().toISOString()); }catch(e){}
  majInfoSauvegarde();
}

function joursDepuisSauvegarde(){
  let iso = null;
  try{ iso = localStorage.getItem(CLE_DERNIER_EXPORT); }catch(e){}
  const d = iso ? new Date(iso) : null;
  if(!d || isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function majInfoSauvegarde(){
  const jours = joursDepuisSauvegarde();
  const el = document.getElementById('infoSauvegarde');
  const rappel = document.getElementById('rappelSauvegarde');
  const aDesDonnees = depenses.length + entrees.length + epargnes.length > 0;
  const ancienne = jours === null || jours > SEUIL_RAPPEL_SAUVEGARDE_JOURS;
  if(el){
    el.textContent = jours === null ? "Tu n'as pas encore sauvegardé tes données."
      : 'Dernière sauvegarde : ' + (jours === 0 ? "aujourd'hui" : jours === 1 ? 'hier' : 'il y a ' + jours + ' jours') + '.';
    el.classList.toggle('attention', ancienne && aDesDonnees);
  }
  if(rappel){
    rappel.hidden = !(aDesDonnees && ancienne);
    const t = document.getElementById('rappelTexte');
    if(t) t.textContent = jours === null ? 'Pense à sauvegarder tes données.' : 'Dernière sauvegarde il y a ' + jours + ' jours.';
  }
}

async function exporterJSON(){
  const paquet = {
    app: 'mon-budget',
    version: 1,
    exporteLe: new Date().toISOString(),
    donnees: { categories: CATEGORIES, depenses, entrees, epargnes, historiqueBudgets, recurrentes, objectifEpargne, dernierMoisVu }
  };
  const nom = 'mon-budget-' + auj() + '.json';
  const contenu = JSON.stringify(paquet, null, 2);
  // Sur téléphone : feuille de partage (WhatsApp, e-mail, Drive, Fichiers…). Ailleurs : téléchargement.
  try{
    const tactile = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const fichier = new File([contenu], nom, { type: 'application/json' });
    if(tactile && navigator.canShare && navigator.canShare({ files: [fichier] })){
      await navigator.share({ files: [fichier], title: 'Sauvegarde Mon Budget' });
      marquerExport();
      return;
    }
  }catch(e){
    if(e && e.name === 'AbortError') return; // annulé par la personne : rien à faire
  }
  telecharger(nom, contenu, 'application/json');
  marquerExport();
  toast('Sauvegarde enregistrée dans tes fichiers');
}

function celluleCSV(v, texte){
  let s = v == null ? '' : String(v);
  if(texte && /^[=+\-@\t\r]/.test(s)) s = "'" + s; // évite l'exécution de formules dans Excel
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exporterCSV(){
  const nomCat = id => { const c = CATEGORIES.find(c=>c.id===id); return c ? c.nom : 'Poste supprimé'; };
  const lignes = [
    ...depenses.map(d=>({ type:'Dépense', date:d.date, cat:nomCat(d.cat), montant:d.montant, note:d.note })),
    ...entrees.map(e=>({ type:'Entrée',  date:e.date, cat:'', montant:e.montant, note:e.note })),
    ...epargnes.map(e=>({ type:'Épargne', date:e.date, cat:'', montant:e.montant, note:e.note }))
  ].sort((a,b)=> (b.date||'').localeCompare(a.date||''));

  const csv = ['Type;Date;Catégorie;Montant (FCFA);Note']
    .concat(lignes.map(l=>[
      l.type, l.date || '', celluleCSV(l.cat, true), l.montant, celluleCSV(l.note, true)
    ].join(';')))
    .join('\r\n');
  telecharger('mon-budget-' + auj() + '.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
  marquerExport();
}

// ---------- Import ----------

const nettoyerTexte = (v, max=200) => typeof v === 'string' ? v.replace(/[<>]/g, '').trim().slice(0, max) : '';
const montantOk = n => typeof n === 'number' && isFinite(n) && n >= 0 && n <= 1e12;

function nettoyerCategories(liste){
  if(!Array.isArray(liste)) return [];
  return liste.filter(c=> c && RE_ID.test(c.id) && nettoyerTexte(c.nom) && montantOk(c.budget))
    .map((c,i)=>({
      id: c.id,
      nom: nettoyerTexte(c.nom, 40),
      budget: c.budget,
      couleur: RE_COULEUR.test(c.couleur) ? c.couleur : couleurAuto(i)
    }));
}

function nettoyerMouvements(liste, avecCat){
  if(!Array.isArray(liste)) return { ok:[], ignores:0 };
  const ok = liste.filter(x=> x && typeof x.montant === 'number' && isFinite(x.montant) && x.montant > 0 && x.montant <= 1e12
      && RE_DATE.test(x.date) && (!avecCat || RE_ID.test(x.cat)))
    .map(x=>{
      const m = { id: RE_ID.test(x.id) ? x.id : nouvelId(), montant: x.montant, note: nettoyerTexte(x.note), date: x.date };
      if(avecCat){
        m.cat = x.cat;
        if(RE_ID.test(x.recId)) m.recId = x.recId;
      }
      return m;
    });
  return { ok, ignores: liste.length - ok.length };
}

function nettoyerRecurrentes(liste){
  if(!Array.isArray(liste)) return [];
  return liste.filter(r=> r && RE_ID.test(r.id) && RE_ID.test(r.cat) && typeof r.montant === 'number'
      && isFinite(r.montant) && r.montant > 0 && r.montant <= 1e12
      && Number.isInteger(r.jour) && r.jour >= 1 && r.jour <= 31 && RE_MOIS.test(r.dernierMois))
    .map(r=>({ id: r.id, cat: r.cat, montant: r.montant, note: nettoyerTexte(r.note), jour: r.jour, dernierMois: r.dernierMois }));
}

function nettoyerObjectif(o){
  if(!o || typeof o !== 'object' || !montantOk(o.cible) || o.cible <= 0 || !RE_DATE.test(o.date)) return null;
  return { nom: nettoyerTexte(o.nom, 40), cible: o.cible, date: o.date };
}

function nettoyerHistorique(liste){
  if(!Array.isArray(liste)) return [];
  return liste.filter(h=> h && RE_MOIS.test(h.mois) && Array.isArray(h.categories))
    .map(h=>({
      mois: h.mois,
      categories: nettoyerCategories(h.categories),
      total: montantOk(h.total) ? h.total : 0,
      valideLe: typeof h.valideLe === 'string' ? h.valideLe.slice(0,40) : '',
      methode: h.methode === 'auto' ? 'auto' : 'manuel'
    }));
}

async function importerFichier(fichier){
  if(!fichier) return;
  try{
    if(fichier.size > 5 * 1024 * 1024) throw new Error('Fichier trop volumineux.');
    let brut;
    try{ brut = JSON.parse(await fichier.text()); }
    catch(e){ throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible)."); }

    const d = brut && typeof brut === 'object' && brut.donnees ? brut.donnees : brut;
    const cats = nettoyerCategories(d && d.categories);
    if(!cats.length) throw new Error("Ce fichier ne ressemble pas à une sauvegarde de Mon Budget (aucune catégorie trouvée).");

    const dep = nettoyerMouvements(d.depenses, true);
    const ent = nettoyerMouvements(d.entrees, false);
    const epa = nettoyerMouvements(d.epargnes, false);
    const histo = nettoyerHistorique(d.historiqueBudgets);
    const rec = nettoyerRecurrentes(d.recurrentes);
    const obj = nettoyerObjectif(d.objectifEpargne);
    const ignores = dep.ignores + ent.ignores + epa.ignores;

    let msg = 'Remplacer les données de l\'application par cette sauvegarde ?\n\n'
      + dep.ok.length + ' dépenses, ' + ent.ok.length + ' entrées, ' + epa.ok.length + ' épargnes, '
      + cats.length + ' catégories, ' + rec.length + ' récurrences, ' + histo.length + ' budgets figés' + (obj ? ', 1 objectif d\'épargne.' : '.');
    if(brut.exporteLe){
      const dt = new Date(brut.exporteLe);
      if(!isNaN(dt)) msg += '\nExportée le ' + dt.toLocaleDateString('fr-FR');
    }
    if(ignores) msg += '\n\n' + ignores + ' ligne(s) invalide(s) seront ignorée(s).';
    msg += '\n\nTes données actuelles seront remplacées. Si besoin, sauvegarde-les d\'abord.';
    if(!confirm(msg)) return;

    CATEGORIES = cats;
    depenses = dep.ok;
    entrees = ent.ok;
    epargnes = epa.ok;
    historiqueBudgets = histo.sort((a,b)=>b.mois.localeCompare(a.mois));
    recurrentes = rec;
    objectifEpargne = obj;
    dernierMoisVu = typeof d.dernierMoisVu === 'string' && RE_MOIS.test(d.dernierMoisVu) ? d.dernierMoisVu : null;
    await sauvegarderTout();
    await verifierChangementMois();
    await appliquerRecurrentes();
    rendre();
    alert('Sauvegarde restaurée.');
  }catch(e){
    alert(e.message || "L'import a échoué.");
  }finally{
    document.getElementById('inputImport').value = '';
  }
}
