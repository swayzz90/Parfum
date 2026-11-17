/* Duftfinder – Matching-Logik (regelbasiert, ohne Server)
 * Punktwert = Profil-Treffer (Duftwelten oder Charakter) + Wirkung/Tageszeit/Büro + Jahreszeit
 *             − Abstand zur gewünschten Nähe (Intensität)
 */

const EIG_BY_ID = Object.fromEntries(EIGENSCHAFTEN.map(e => [e.id, e]));
const WELT_BY_ID = Object.fromEntries(DUFTWELTEN.map(e => [e.id, e]));
const WIRK_BY_ID = Object.fromEntries(WIRKUNGEN.map(e => [e.id, e]));
const ZEIT_BY_ID = Object.fromEntries(ZEITEN.map(e => [e.id, e]));
const JZ_BY_ID = Object.fromEntries(JAHRESZEITEN.map(e => [e.id, e]));

function akkSumme(gewichte, duft) {
  let s = 0;
  for (const [k, w] of Object.entries(gewichte)) s += w * (duft.akk[k] || 0);
  return s;
}

function passtGeschlecht(duft, fuer) {
  return fuer === "egal" || duft.fuer === "u" || duft.fuer === fuer;
}

/* Profil-Quellen: gewählte Duftwelten oder Charakterzüge */
function quellen(a) {
  return a.modus === "charakter"
    ? (a.traits || []).map(id => EIG_BY_ID[id]).filter(Boolean)
    : (a.welten || []).map(id => WELT_BY_ID[id]).filter(Boolean);
}

/* Geschätzter Preis: echter Preis aus feed.json, sonst typischer Preis der Preisklasse */
function preisSchaetzung(d) {
  if (d.feed) {
    const liste = Array.isArray(d.feed.angebote) ? d.feed.angebote.map(x => Number(x.preis)).filter(p => p > 0) : [];
    if (Number(d.feed.preis) > 0) liste.push(Number(d.feed.preis));
    if (liste.length) return Math.min(...liste);
  }
  return PREIS_TYPISCH[d.preis] || 100;
}
function imPreisrahmen(d, maxEuro) {
  return maxEuro == null || preisSchaetzung(d) <= maxEuro;
}
/* Höchste Preisklasse, die ins Budget passt (für die "günstige Alternative") */
function maxKlasse(maxEuro) {
  if (maxEuro == null) return 4;
  let k = 1;
  for (const [klasse, p] of Object.entries(PREIS_TYPISCH)) if (p <= maxEuro) k = Math.max(k, Number(klasse));
  return k;
}
function anzahlImBudget(a) {
  return DUEFTE.filter(d => passtGeschlecht(d, a.fuer || "egal") && imPreisrahmen(d, a.maxEuro)).length;
}

function zielIntensitaet(a) {
  let z = a.naehe || 3;
  for (const id of a.wirkung || []) z += 0.5 * (WIRK_BY_ID[id]?.int || 0);
  z += ZEIT_BY_ID[a.zeit]?.int || 0;
  if (a.modus === "charakter") z += 0.15 * (a.traits || []).reduce((s, id) => s + (EIG_BY_ID[id]?.int || 0), 0);
  else z += 0.3 * quellen(a).reduce((s, q) => s + (q.int || 0), 0) / Math.max(1, quellen(a).length);
  if (a.buero) z = Math.min(z, BUERO.maxInt);
  return Math.min(5, Math.max(1, z));
}

function bewerte(duft, a) {
  /* Profil als Kosinus-Ähnlichkeit: Düfte mit vielen starken Akkorden
     bekommen so keinen Bonus nur fürs "Vielsein". */
  const qs = quellen(a);
  const wunsch = {};
  for (const q of qs) for (const [k, w] of Object.entries(q.akk)) wunsch[k] = (wunsch[k] || 0) + w;
  let skalar = 0, lw = 0, ld = 0;
  for (const [k, w] of Object.entries(wunsch)) { skalar += w * (duft.akk[k] || 0); lw += w * w; }
  for (const v of Object.values(duft.akk)) ld += v * v;
  const profil = lw && ld ? 10 * skalar / (Math.sqrt(lw) * Math.sqrt(ld)) : 0;

  const beitraege = [];
  for (const q of qs) {
    let summe = 0, bestK = null, bestV = 0;
    for (const [k, w] of Object.entries(q.akk)) {
      const v = w * (duft.akk[k] || 0);
      summe += v;
      if (v > bestV) { bestV = v; bestK = k; }
    }
    beitraege.push({ id: q.id, label: q.kurz || q.label, wert: summe, akkord: bestK });
  }
  beitraege.sort((x, y) => y.wert - x.wert);

  const wirkungen = (a.wirkung || []).map(id => WIRK_BY_ID[id]).filter(Boolean)
    .map(w => ({ label: w.label, wert: akkSumme(w.akk, duft) }));
  const wirkung = wirkungen.reduce((s, w) => s + w.wert, 0) / Math.max(1, wirkungen.length);
  const zeit = akkSumme(ZEIT_BY_ID[a.zeit]?.akk || {}, duft);
  const buero = a.buero ? akkSumme(BUERO.akk, duft) : 0;
  const saison = akkSumme(JZ_BY_ID[a.saison]?.akk || {}, duft);
  const abstand = Math.abs(duft.int - zielIntensitaet(a));
  const punkte = profil + 1.2 * wirkung + 0.6 * zeit + buero + saison - 0.6 * abstand;
  return { punkte, profil, wirkung, wirkungen, zeit, buero, saison, abstand, beitraege };
}

function liste(woerter) {
  return woerter.length > 1 ? woerter.slice(0, -1).join(", ") + " und " + woerter[woerter.length - 1] : woerter[0] || "";
}

function begruendung(r, a) {
  const top = r.beitraege.filter(b => b.wert >= 0.6 && b.akkord).slice(0, 2);
  let satz;
  if (a.modus === "charakter") {
    const wer = a.geschenk ? "die Person" : "du";
    const ist = a.geschenk ? "ist" : "bist";
    if (top.length === 2 && top[0].akkord === top[1].akkord) {
      satz = `Passt, weil ${wer} ${top[0].label.toLowerCase()} und ${top[1].label.toLowerCase()} ${ist} (${AKKORDE[top[0].akkord]}).`;
    } else if (top.length === 2) {
      satz = `Passt, weil ${wer} ${top[0].label.toLowerCase()} (${AKKORDE[top[0].akkord]}) und ${top[1].label.toLowerCase()} (${AKKORDE[top[1].akkord]}) ${ist}.`;
    } else if (top.length === 1) {
      satz = `Passt vor allem, weil ${wer} ${top[0].label.toLowerCase()} ${ist} (${AKKORDE[top[0].akkord]}).`;
    } else {
      satz = "Kein perfekter Charakter-Treffer, aber stark bei Wirkung und Budget.";
    }
  } else if (top.length === 2 && top[0].akkord === top[1].akkord) {
    satz = `Erinnert an „${top[0].label}“ und „${top[1].label}“ (${AKKORDE[top[0].akkord].toLowerCase()}).`;
  } else if (top.length) {
    satz = `Erinnert an ${liste(top.map(b => `„${b.label}“ (${AKKORDE[b.akkord].toLowerCase()})`))}.`;
  } else {
    satz = "Nicht ganz deine Duftwelt, aber stark bei Wirkung und Budget.";
  }
  const passend = (r.wirkungen || []).filter(w => w.wert >= 0.6).map(w => w.label.toLowerCase());
  if (passend.length) satz += ` Wirkt ${liste(passend)}.`;
  if (a.buero) satz += r.duft.int >= 4 || r.buero < 0 ? " Fürs Büro eher kräftig." : " Bürotauglich.";
  return satz;
}

/* Liefert drei unterschiedliche Karten + weitere Treffer */
function empfehle(a) {
  const maxPreis = maxKlasse(a.maxEuro);
  const rangliste = DUEFTE
    .filter(d => passtGeschlecht(d, a.fuer || "egal"))
    .map(d => ({ duft: d, ...bewerte(d, a) }))
    .sort((x, y) => y.punkte - x.punkte);

  const benutzt = new Set();
  const imBudget = r => imPreisrahmen(r.duft, a.maxEuro);

  /* Bester Treffer im Budget; ist der deutlich schwächer als der beste insgesamt,
     zeigen wir lieber den besseren und markieren ihn als "über Budget". */
  function nimm(bedingung, label) {
    const frei = rangliste.filter(x => !benutzt.has(x.duft.id) && bedingung(x));
    if (!frei.length) return null;
    const bester = frei[0];
    const imRahmen = frei.find(imBudget);
    const r = imRahmen && imRahmen.punkte >= 0.6 * bester.punkte ? imRahmen : bester;
    benutzt.add(r.duft.id);
    return { ...r, label, ueberBudget: !imBudget(r), warum: begruendung(r, a) };
  }

  const guenstigMax = Math.max(1, Math.min(2, maxPreis - 1));
  const nische = x => x.duft.nische;
  const bekannt = x => !x.duft.nische;
  let karten;

  if (a.stil === "bekannt") {
    const k1 = nimm(bekannt, "Top-Treffer");
    const k2 = nimm(bekannt, "Auch stark");
    const k3 = nimm(x => bekannt(x) && x.duft.preis <= guenstigMax, "Günstige Alternative") || nimm(bekannt, "Platz 3");
    karten = [k1, k2, k3];
  } else if (a.stil === "nische") {
    const k1 = nimm(nische, "Nischen-Treffer");
    const k2 = nimm(nische, "Auch stark");
    const grenze = k1 ? k1.duft.preis : 5;
    const k3 = nimm(x => nische(x) && x.duft.preis < grenze, "Günstigerer Nischenduft") || nimm(nische, "Platz 3");
    karten = [k1, k2, k3];
  } else {
    const k1 = nimm(bekannt, "Bekannter Treffer");
    const k2 = nimm(nische, "Nischen-Treffer");
    const k1Preis = k1 ? k1.duft.preis : 5;
    const k3 = k1Preis > 1
      ? nimm(x => x.duft.preis <= Math.min(guenstigMax, k1Preis - 1), "Günstige Alternative")
      : nimm(x => x.duft.preis <= 1, "Ebenfalls günstig");
    karten = [k1, k2, k3 || nimm(() => true, "Platz 3")];
  }
  karten = karten.filter(Boolean);

  const weitere = rangliste
    .filter(x => !benutzt.has(x.duft.id))
    .sort((x, y) => (imBudget(y) - imBudget(x)) || (y.punkte - x.punkte))
    .slice(0, 5)
    .map(r => ({ ...r, ueberBudget: !imBudget(r), warum: begruendung(r, a) }));

  return { karten, weitere };
}

/* ---------- Duftprofil: ähnliche Richtung, Regler, Duftverlauf ---------- */

function kosinus(a, b) {
  let s = 0, la = 0, lb = 0;
  for (const [k, v] of Object.entries(a)) { s += v * (b[k] || 0); la += v * v; }
  for (const v of Object.values(b)) lb += v * v;
  return la && lb ? s / Math.sqrt(la * lb) : 0;
}

/* Bekannte Referenz mit dem ähnlichsten Akkordprofil. Referenzen sind bekannte Marken ab 40 €,
   keine Nischendüfte und keine günstigen Alternativen. Bewusst "ähnliche Richtung", kein "riecht wie". */
function aehnlicheRichtung(d, min = 0.86) {
  let best = null, bestS = 0;
  for (const r of DUEFTE) {
    if (r.id === d.id || r.nische || r.preis < 2 || r.land === "VAE" || r.marke === d.marke) continue;
    if (d.fuer !== "u" && r.fuer !== "u" && r.fuer !== d.fuer) continue;
    const s = kosinus(d.akk, r.akk);
    if (s > bestS) { bestS = s; best = r; }
  }
  return bestS >= min ? { duft: best, wert: bestS } : null;
}

/* Drei Regler, jeweils 0 bis 1 (0 = linke Seite) */
function regler(d) {
  const a = k => d.akk[k] || 0;
  const frisch = a("zitrisch") + a("frisch") + a("aquatisch") + a("gruen") + .5 * a("aromatisch") + .4 * a("fruchtig");
  const warm = a("amber") + a("vanille") + a("gourmand") + a("wuerzig") + a("tabak") + a("oud")
    + a("ledrig") + a("rauchig") + a("weihrauch") + .5 * a("holzig");
  const suess = a("suess") + a("gourmand") + a("vanille") + .6 * a("fruchtig");
  const herb = a("holzig") + a("ledrig") + a("rauchig") + a("oud") + a("gruen") + .6 * a("aromatisch")
    + .5 * a("wuerzig") + .5 * a("weihrauch") + .5 * a("tabak") + .3 * a("zitrisch");
  const anteil = (l, r) => (r + .1) / (l + r + .2);
  return [
    { links: "frisch", rechts: "warm", wert: anteil(frisch, warm) },
    { links: "süß", rechts: "herb", wert: anteil(suess, herb) },
    { links: "dezent", rechts: "laut", wert: (d.int - 1) / 4 }
  ];
}

/* Charakterwort pro Note (erste passende Zeile gewinnt) */
const NOTEN_WORTE = [
  ["spritzig", ["zitrone", "zitrus", "bergamotte", "grapefruit", "limette", "mandarine", "orange", "yuzu", "petitgrain"]],
  ["frisch", ["minze", "meer", "salz", "aldehyd", "eukalyptus", "alge", "gurke", "anis", "metall", "feuerstein", "seerose"]],
  ["tabakig", ["tabak"]],
  ["grün", ["blatt", "blätter", "grüner tee", "schwarzer tee", "teeblüte", "tee", "grüne", "basilikum", "thymian", "lorbeer", "bambus", "cannabis", "oregano", "koriander", "rhabarber", "kletter", "papyrus"]],
  ["kräuterig", ["lavendel", "salbei", "rosmarin", "wacholder", "geranie"]],
  ["harzig", ["tanne", "kiefer", "zypresse", "harz", "labdanum", "myrrhe", "opoponax", "styrax", "perubalsam"]],
  ["geröstet", ["kaffee", "kakao", "schokolade", "kastanie", "praliné", "mandel", "pistazie"]],
  ["cremig", ["vanille", "tonka", "kokos", "milch", "kaschm", "sandel", "marshmallow"]],
  ["süß", ["karamell", "toffee", "honig", "zucker", "cupcake", "bienenwachs", "lakritz", "heliotrop"]],
  ["berauschend", ["rum", "cognac"]],
  ["fruchtig", ["apfel", "birne", "ananas", "beere", "litschi", "pfirsich", "aprikose", "pflaume", "melone", "mango", "feige", "quitte", "kiwi", "kaki", "mirabelle", "kirsche", "frucht", "früchte", "sapodilla", "datteln", "maninka"]],
  ["würzig", ["pfeffer", "zimt", "kardamom", "ingwer", "muskat", "nelke", "safran", "kümmel", "sternanis", "gewürz"]],
  ["pudrig", ["iris", "veilchen", "ambrette", "mimose"]],
  ["blumig", ["rose", "jasmin", "tuberose", "orangenblüte", "neroli", "ylang", "gardenie", "freesie", "maiglöckchen", "magnolie", "pfingstrose", "lotus", "orchidee", "hyazinthe", "osmanthus", "cyclamen", "wicke", "ringelblume", "geißblatt", "blüte", "blüten", "weißdorn", "glockenblume", "sykomore"]],
  ["rauchig", ["weihrauch", "birke", "teer", "rauch"]],
  ["ledrig", ["leder"]],
  ["dunkel", ["oud", "trüffel"]],
  ["erdig", ["patschuli", "vetiver", "eichenmoos", "moos"]],
  ["holzig", ["zeder", "holz", "hölzer", "guajak", "palisander", "teak", "mahagoni", "iso e"]],
  ["warm", ["amber", "ambra", "benzoe", "ambergris", "ambroxan"]],
  ["hautnah", ["moschus"]]
];

function notenWort(note) {
  const n = note.toLowerCase();
  for (const [wort, keys] of NOTEN_WORTE) if (keys.some(k => n.includes(k))) return wort;
  return null;
}

function verlauf(d) {
  const reihe = (label, noten) => {
    const zaehl = {};
    for (const n of noten) { const w = notenWort(n); if (w) zaehl[w] = (zaehl[w] || 0) + 1; }
    // häufigstes Wort; bei Gleichstand gewinnt die erste Note
    let wort = null, max = 0;
    for (const n of noten) { const w = notenWort(n); if (w && zaehl[w] > max) { max = zaehl[w]; wort = w; } }
    return { label, wort, noten: [...new Set(noten)].slice(0, 3) };
  };
  const alle = [...d.kopf, ...d.herz, ...d.basis];
  if (new Set(alle).size === 1) return [reihe("Von Anfang bis Ende", alle)];
  return [reihe("Erste Minuten", d.kopf), reihe("Nach einer Stunde", d.herz), reihe("Stunden später", d.basis)];
}


/* "Ich mag schon einen Duft": ähnliche Düfte nach Akkordprofil.
   Drei Plätze: bekannte Marke (andere Marke), Nische, günstiger. Dazu bis zu fünf weitere. */
function aehnlichkeitWort(w) {
  return w >= 0.92 ? "Sehr ähnliche Richtung" : w >= 0.85 ? "Ähnliche Richtung" : "Verwandte Richtung";
}

function gemeinsameAkkorde(a, b) {
  return Object.keys(a.akk)
    .filter(k => a.akk[k] >= 0.4 && (b.akk[k] || 0) >= 0.4)
    .sort((x, y) => Math.min(b.akk[y], a.akk[y]) - Math.min(b.akk[x], a.akk[x]))
    .slice(0, 3)
    .map(k => AKKORDE[k].toLowerCase());
}

function aehnlichWarum(basis, r, slot) {
  const geteilt = gemeinsameAkkorde(basis, r.duft);
  const liste = geteilt.length > 1 ? geteilt.slice(0, -1).join(", ") + " und " + geteilt[geteilt.length - 1] : geteilt[0];
  let satz = `${aehnlichkeitWort(r.wert)}${liste ? ": ebenfalls " + liste : ""}.`;
  const diff = r.duft.int - basis.int;
  if (diff >= 2) satz += " Deutlich kräftiger.";
  else if (diff <= -2) satz += " Deutlich dezenter.";
  if (slot === "guenstig") satz += ` Günstiger (${["", "bis 40 €", "40–80 €", "80–150 €", "über 150 €"][r.duft.preis]}*).`;
  if (slot === "nische") satz += " Eigenständiger, aus der Nische.";
  return satz;
}

function aehnlicheDuefte(basis, anzahlWeitere = 5) {
  const passtGeschlecht = r => basis.fuer === "u" || r.fuer === "u" || r.fuer === basis.fuer;
  const liste = DUEFTE
    .filter(r => r.id !== basis.id && passtGeschlecht(r))
    .map(r => {
      const w = kosinus(basis.akk, r.akk);
      return { duft: r, wert: w, score: w - 0.03 * Math.abs(r.int - basis.int) };
    })
    .filter(r => r.wert >= 0.7)
    .sort((x, y) => y.score - x.score);

  const genommen = new Set();
  const nimm = (slot, label, test) => {
    const r = liste.find(x => !genommen.has(x.duft.id) && test(x.duft));
    if (!r) return null;
    genommen.add(r.duft.id);
    return { ...r, label, slot, warum: aehnlichWarum(basis, r, slot) };
  };
  const karten = [
    nimm("bekannt", "Bekannte Marke", d => !d.nische && d.marke !== basis.marke && d.preis >= 2),
    nimm("nische", "Nische", d => d.nische),
    nimm("guenstig", "Günstiger", d => d.preis < basis.preis || (basis.preis === 1 && d.preis === 1 && d.marke !== basis.marke))
  ].filter(Boolean);
  const weitere = liste.filter(x => !genommen.has(x.duft.id)).slice(0, anzahlWeitere)
    .map(r => ({ ...r, warum: aehnlichWarum(basis, r, "") }));
  return { karten, weitere };
}

/* Suche nach Name oder Marke, unempfindlich gegen Akzente und Groß/Klein */
function normalisiere(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").trim();
}
function sucheDuft(text, max = 8) {
  const teile = normalisiere(text).split(/\s+/).filter(Boolean);
  if (!teile.length) return [];
  return DUEFTE
    .map(d => {
      const hay = normalisiere(`${d.marke} ${d.name}`);
      if (!teile.every(t => hay.includes(t))) return null;
      const name = normalisiere(d.name);
      const rang = teile.some(t => name.startsWith(t)) ? 0 : 1;
      return { d, rang };
    })
    .filter(Boolean)
    .sort((a, b) => a.rang - b.rang || (a.d.nische - b.d.nische) || a.d.name.localeCompare(b.d.name))
    .slice(0, max)
    .map(x => x.d);
}

if (typeof module !== "undefined") module.exports = { anzahlImBudget, preisSchaetzung, imPreisrahmen, aehnlicheDuefte, sucheDuft, normalisiere, empfehle, bewerte, zielIntensitaet, aehnlicheRichtung, regler, verlauf, notenWort };
