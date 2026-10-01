const CATEGORIES_DEFAUT = [
  { id:'transport', nom:'Transport',       budget:30000, couleur:'#2F6FED' },
  { id:'nourriture', nom:'Nourriture',     budget:8000,  couleur:'#5C8CFF' },
  { id:'famille', nom:'Charge Famille',    budget:10000, couleur:'#0E3690' },
  { id:'perso', nom:'Perso',               budget:22000, couleur:'#8DB0FF' },
  { id:'imprevu', nom:'Imprévu',           budget:5000,  couleur:'#1C4FBD' },
  { id:'epargne', nom:'Épargne',           budget:15000, couleur:'#A9C4FF' },
];
let CATEGORIES = CATEGORIES_DEFAUT.map(c=>({...c}));
const PALETTE_AUTO = ['#2F6FED','#5C8CFF','#0E3690','#8DB0FF','#1C4FBD','#A9C4FF','#3C5FCC','#6E86BF','#173B7A','#C3D4FF'];
const couleurAuto = i => PALETTE_AUTO[i % PALETTE_AUTO.length];

const totalBudget = () => CATEGORIES.reduce((s,c)=>s+c.budget,0);
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const auj = () => new Date().toISOString().slice(0,10);
const moisActuel = () => new Date().toISOString().slice(0,7);

let depenses = [];
let entrees = [];
let epargnes = [];
let historiqueBudgets = []; // budgets figés par mois : { mois, categories, total, valideLe, methode }
let dernierMoisVu = null;
let recurrentes = []; // modèles de dépenses mensuelles : { id, cat, montant, note, jour, dernierMois }
let depenseEnEdition = null;
let recurrenteEnEdition = null;
let filtreHisto = { q:'', cat:'', mois:'' };
const SEUIL_PREVISION_JOUR = 5; // pas de prévision avant le 5 du mois (trop peu de données)
let objectifEpargne = null; // { nom, cible, date }
let entreeEnEdition = null;
let epargneEnEdition = null;
const SEUIL_ALERTE = 0.8; // avertissement à 80 % du budget d'un poste
let categoriePourAjout = null;
let categoriePourBudget = null;
let prevDepenseTotal = 0;
let prevRestantTotal = totalBudget();
let prevEntreesTotal = 0;
let prevEpargneTotal = 0;
let prevSoldeTotal = 0;

