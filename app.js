/* Duftfinder – Oberfläche */

const SCHRITTE = ["fuer", "charakter", "anlass", "budget"];
const MAX_TRAITS = 5;

/* Shop-Suchlinks für den Prototyp. In Phase 2 durch Awin-Deeplinks mit Partner-ID ersetzen. */
const SHOPS = [
  { name: "Idealo (Preisvergleich)", url: q => `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${q}` },
  { name: "Douglas", url: q => `https://www.douglas.de/de/search?q=${q}` },
  { name: "Flaconi", url: q => `https://www.flaconi.de/search/?q=${q}` },
  { name: "Notino", url: q => `https://www.notino.de/search.asp?exps=${q}` },
  { name: "Parfumdreams", url: q => `https://www.parfumdreams.de/?m=5&search=${q}` },
  { name: "Amazon", url: q => `https://www.amazon.de/s?k=${q}` }
];

const FARBEN = [
  ["aquat", "#9cc7d8"], ["zitr", "#efd27a"], ["gourmand", "#d9a46b"], ["süß", "#e5ad9e"], ["rose", "#e7a0b1"],
  ["weißblum", "#f0d7c2"], ["blumig", "#efbfcd"], ["pudrig", "#cdbfdc"], ["moschus", "#dcd2e6"], ["oud", "#8a6347"],
  ["tabak", "#a7764b"], ["rauchig", "#9c9088"], ["ledrig", "#8f6a52"], ["amber", "#d6984d"], ["orient", "#c58448"],
  ["würz", "#c98a5a"], ["grün", "#a7c98a"], ["holz", "#b58e6a"], ["aromat", "#a9c0a0"], ["chypre", "#b9a27e"], ["frucht", "#f0a98a"]
];

const FUER_TEXT = { m: "Herren", w: "Damen", u: "Unisex" };

/* Anonyme Klickzählung mit GoatCounter (ohne Cookies). Aus, solange ZAEHLER leer ist.
   Einrichten: kostenlos auf goatcounter.com anmelden und den gewählten Code hier eintragen, z. B. "duftfinder". */
const ZAEHLER = "";
if (ZAEHLER) {
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://gc.zgo.at/count.js";
  sc.dataset.goatcounter = `https://${ZAEHLER}.goatcounter.com/count`;
  document.head.appendChild(sc);
}
function zaehle(name) {
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); }
  catch (e) { /* Zählung darf nie die App stören */ }
}

/* Vorschläge im Suchfeld, solange noch nichts eingegeben ist */
const BELIEBT = ["dior-sauvage", "chanel-bleu", "creed-aventus", "mfk-br540", "ysl-libre", "lancome-lveb", "ysl-blackopium", "armani-adg", "pdm-layton", "jpg-lemale"];

let state = neuerStart();

function neuerStart(geschenk = false) {
  return {
    screen: "start",
    a: { geschenk, fuer: null, traits: [], anlass: null, saison: null, budget: null, stil: "beides" }
  };
}

/* ---------- Speicher (lokal, nur auf diesem Gerät) ---------- */
function lade(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function speichere(key, wert) {
  try { localStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* privat-Modus: egal */ }
}
let merkliste = lade("duftfinder.merkliste", []);
let feedback = lade("duftfinder.feedback", {});
/* Preisalarm: { id: { ziel: Zahl|null } }, zuletzt gesehene Preise: { id: Zahl }, Meldungen: { id: { alt, neu } } */
let alarme = lade("duftfinder.alarme", {});
let preise = lade("duftfinder.preise", {});
let meldungen = lade("duftfinder.meldungen", {});
let frisch = {}; // Meldungen, die in dieser Sitzung hervorgehoben werden

/* ---------- Helfer ---------- */
const $app = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DUFT_BY_ID = Object.fromEntries(DUEFTE.map(d => [d.id, d]));

function icon(note) {
  const n = note.toLowerCase();
  const treffer = NOTEN_ICONS.find(([k]) => n.includes(k));
  return treffer ? treffer[1] : "✦";
}

function farbe(d) {
  const fam = d.familie.toLowerCase();
  const staerkster = Object.entries(d.akk).sort((x, y) => y[1] - x[1])[0][0];
  const t = FARBEN.find(([k]) => fam.includes(k)) || FARBEN.find(([k]) => staerkster.includes(k));
  return t ? t[1] : "#c9b8a6";
}

function initialen(marke) {
  return marke.split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function flakon(d) {
  const c = farbe(d);
  return `<svg viewBox="0 0 100 130" width="88" height="114" aria-hidden="true">
    <rect x="38" y="6" width="24" height="18" rx="3" fill="#2a2420"/>
    <rect x="44" y="24" width="12" height="10" fill="#d6cdc2"/>
    <rect x="14" y="34" width="72" height="90" rx="16" fill="${c}" stroke="rgba(0,0,0,.12)"/>
    <rect x="22" y="42" width="9" height="64" rx="4.5" fill="#fff" opacity=".35"/>
    <rect x="30" y="70" width="40" height="26" rx="4" fill="#fffdf9" opacity=".92"/>
    <text x="50" y="88" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#221d18">${esc(initialen(d.marke))}</text>
  </svg>`;
}

/* Produktfoto aus dem Affiliate-Feed, sonst der gezeichnete Flakon.
   Lädt das Foto nicht, springt die Karte automatisch auf den Flakon zurück. */
function visual(d) {
  const f = flakon(d);
  if (!d.bild) return f;
  return `<img class="produktbild" src="${esc(d.bild)}" alt="${esc(d.marke + " " + d.name)}" loading="lazy" referrerpolicy="no-referrer"
    onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${f}</span>`;
}

function reglerHtml(d) {
  return `<div class="regler">${regler(d).map(r => `<div class="regler-zeile">
      <span>${r.links}</span>
      <span class="spur" role="img" aria-label="${Math.round(r.wert * 100)} % ${r.rechts}"><i style="left:${(6 + r.wert * 88).toFixed(1)}%"></i></span>
      <span>${r.rechts}</span></div>`).join("")}</div>`;
}

function verlaufHtml(d) {
  return `<div class="verlauf">${verlauf(d).map(z => `<div class="verlauf-zeile">
      <div class="vz-kopf"><span class="vz-zeit">${z.label}</span>${z.wort ? `<span class="vz-wort">${z.wort}</span>` : ""}</div>
      <div class="vz-noten">${z.noten.map(n => `<span class="vz-note"><span aria-hidden="true">${icon(n)}</span>${esc(n)}</span>`).join("")}</div>
    </div>`).join("")}</div>`;
}

function punkte(n, max = 5) {
  return `<span class="dots" aria-label="${n} von ${max}">${"●".repeat(n)}<i>${"●".repeat(max - n)}</i></span>`;
}

function preisText(p) {
  return ["", "bis 40 €", "40–80 €", "80–150 €", "über 150 €"][p];
}

const euro = n => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const feedPreis = d => d.feed && Number(d.feed.preis) > 0 ? Number(d.feed.preis) : null;

function shopLinks(d) {
  const q = encodeURIComponent(`${d.marke} ${d.name}`);
  const probe = encodeURIComponent(`${d.marke} ${d.name} Probe Abfüllung`);
  const p = feedPreis(d);
  const bester = p && d.feed.link
    ? `<a class="bester" href="${esc(d.feed.link)}" target="_blank" rel="sponsored noopener" data-zaehl="bester-preis/${esc(normalisiere(d.feed.shop || "shop").split(" ")[0])}/${d.id}">Bester Preis: ${euro(p)}*<span>${esc(d.feed.shop || "Shop")} ↗</span></a>` : "";
  return bester + `<a class="probe" href="https://www.google.com/search?q=${probe}" target="_blank" rel="noopener" data-zaehl="probe/${d.id}">Erst Probe holen<span>suchen ↗</span></a>`
    + SHOPS.map(s => `<a href="${s.url(q)}" target="_blank" rel="noopener" data-zaehl="shop/${normalisiere(s.name).split(" ")[0]}/${d.id}">${esc(s.name)}<span>öffnen ↗</span></a>`).join("")
    + `<p>${bester ? "* Partner-Link: Kaufst du darüber, bekommt der Duftfinder eine kleine Provision. Für dich ändert sich der Preis nicht." : "Prototyp: einfache Suchlinks. Später zeigt die App hier den günstigsten Preis."}</p>`;
}

/* ---------- Karten ---------- */
function karte(r) {
  const d = r.duft || r;
  const gemerkt = merkliste.includes(d.id);
  const fb = feedback[d.id];
  const bildText = typeof DUFTBILDER !== "undefined" ? DUFTBILDER[d.id] : "";
  const aehnlich = r.ohneAehnlich ? null : aehnlicheRichtung(d);
  return `<article class="card">
    <div class="card-visual" style="background: linear-gradient(160deg, ${farbe(d)}55, ${farbe(d)}18)">
      ${r.label ? `<span class="slot">${esc(r.label)}</span>` : ""}
      ${r.ueberBudget ? `<span class="over">über Budget</span>` : ""}
      ${visual(d)}
    </div>
    <div class="card-body" data-shopbox>
      <p class="card-brand">${esc(d.marke)}</p>
      <h3 class="card-name">${esc(d.name)}</h3>
      ${bildText ? `<p class="duftbild">„${esc(bildText)}“</p>` : ""}
      ${aehnlich ? `<p class="aehnlich">Ähnliche Duftrichtung wie <b>${esc(aehnlich.duft.marke)} ${esc(aehnlich.duft.name)}</b></p>` : ""}
      ${reglerHtml(d)}
      ${verlaufHtml(d)}
      <dl class="facts">
        <div><dt>Duftfamilie</dt><dd>${esc(d.familie)}</dd></div>
        <div><dt>Intensität</dt><dd>${punkte(d.int)}</dd></div>
        <div><dt>Herkunft</dt><dd>${esc(d.land)}</dd></div>
        <div><dt>Für</dt><dd>${FUER_TEXT[d.fuer]}</dd></div>
        <div><dt>Preisklasse</dt><dd>${preisText(d.preis)}*</dd></div>
        <div><dt>Typ</dt><dd>${d.nische ? "Nische" : "Bekannte Marke"}</dd></div>
      </dl>
      ${r.warum ? `<p class="why">${esc(r.warum)}</p>` : ""}
      <div class="card-actions">
        <button class="btn accent small" data-action="shops" data-id="${d.id}">Preise vergleichen</button>
        <button class="icon-btn ${gemerkt ? "on" : ""}" data-action="merken" data-id="${d.id}" aria-label="${gemerkt ? "Von Merkliste entfernen" : "Merken"}">${gemerkt ? "♥" : "♡"}</button>
        <button class="icon-btn ${fb === 1 ? "on" : ""}" data-action="fb" data-vote="1" data-id="${d.id}" aria-label="Passt">👍</button>
        <button class="icon-btn ${fb === -1 ? "on" : ""}" data-action="fb" data-vote="-1" data-id="${d.id}" aria-label="Passt nicht">👎</button>
      </div>
      <div class="shops">${shopLinks(d)}</div>
    </div>
  </article>`;
}

function weitereEintrag(r) {
  const d = r.duft;
  return `<div class="more-item" data-shopbox>
    <div class="row"><b>${esc(d.marke)} ${esc(d.name)}</b><span class="meta">${preisText(d.preis)}*${r.ueberBudget ? " · über Budget" : ""}</span></div>
    <p>${esc(d.familie)} · ${esc(r.warum)}</p>
    <button class="btn secondary small" style="margin-top:8px" data-action="shops" data-id="${d.id}">Preise vergleichen</button>
    <div class="shops">${shopLinks(d)}</div>
  </div>`;
}

/* ---------- Bildschirme ---------- */
function screenStart() {
  return `${alarmBanner()}<section class="hero">
    <p class="eyebrow">Parfümberatung in 60 Sekunden</p>
    <h1>Welcher Duft passt zu dir?</h1>
    <p>Wähle fünf Eigenschaften, Anlass und Budget. Du bekommst drei Düfte: einen bekannten, einen aus der Nische und eine günstige Alternative.</p>
    <div class="hero-actions">
      <button class="btn" data-action="los" data-value="ich">Für mich finden</button>
      <button class="btn secondary" data-action="los" data-value="geschenk">Als Geschenk finden</button>
      <button class="btn-link" data-action="suche">Du magst schon einen Duft? <b>Ähnliche finden →</b></button>
    </div>
    <div class="how">
      <div><b>1</b><span>Charakter statt Fachbegriffe: Du musst keine Duftnoten kennen.</span></div>
      <div><b>2</b><span>Ehrliche Karten mit Noten, Intensität und Herkunft statt Werbesprech.</span></div>
      <div><b>3</b><span>Direkt zu den Shops, um Preise zu vergleichen.</span></div>
    </div>
  </section>`;
}

function kopf(schritt, titel, hinweis) {
  const i = SCHRITTE.indexOf(schritt) + 1;
  return `<div class="progress"><span style="width:${(i / SCHRITTE.length) * 100}%"></span></div>
    <p class="step-label">Schritt ${i} von ${SCHRITTE.length}</p>
    <h2>${titel}</h2>${hinweis ? `<p class="hint">${hinweis}</p>` : ""}`;
}

function tile(group, value, label, tipp, aktiv) {
  return `<button class="tile ${aktiv ? "selected" : ""}" data-action="set" data-group="${group}" data-value="${value}" aria-pressed="${aktiv}">
    <strong>${esc(label)}</strong>${tipp ? `<small>${esc(tipp)}</small>` : ""}</button>`;
}

function navrow(weiterOk, weiterText = "Weiter") {
  return `<div class="navrow"><div class="navrow-inner">
    <button class="btn secondary" data-action="zurueck">Zurück</button>
    <button class="btn" data-action="weiter" ${weiterOk ? "" : "disabled"}>${weiterText}</button>
  </div></div>`;
}

function screenFuer() {
  const a = state.a;
  const titel = a.geschenk ? "Für wen ist das Geschenk?" : "Für wen suchst du?";
  return `<section class="step">${kopf("fuer", titel, "Unisex-Düfte sind immer mit dabei.")}
    <div class="tiles one">
      ${tile("fuer", "m", "Herren", "Herren- und Unisex-Düfte", a.fuer === "m")}
      ${tile("fuer", "w", "Damen", "Damen- und Unisex-Düfte", a.fuer === "w")}
      ${tile("fuer", "egal", "Unisex / egal", "Alle Düfte, nur der Charakter zählt", a.fuer === "egal")}
    </div></section>${navrow(!!a.fuer)}`;
}

function screenCharakter() {
  const a = state.a;
  const voll = a.traits.length >= MAX_TRAITS;
  const titel = a.geschenk ? "Wie ist die Person?" : "Wie würdest du dich beschreiben?";
  const chips = EIGENSCHAFTEN.map(e => {
    const on = a.traits.includes(e.id);
    return `<button class="chip ${on ? "selected" : ""}" data-action="trait" data-value="${e.id}" aria-pressed="${on}" ${!on && voll ? "disabled" : ""}>${esc(e.label)}</button>`;
  }).join("");
  return `<section class="step">${kopf("charakter", titel, "Wähle genau 5 Eigenschaften, die am besten passen.")}
    <div class="chips">${chips}</div>
    <p class="counter"><b>${a.traits.length}</b> von ${MAX_TRAITS} gewählt</p>
    </section>${navrow(a.traits.length === MAX_TRAITS)}`;
}

function screenAnlass() {
  const a = state.a;
  const wer = a.geschenk ? "Wann trägt die Person ihn am meisten?" : "Wann trägst du ihn am meisten?";
  return `<section class="step">${kopf("anlass", "Wofür soll der Duft sein?", "Der Anlass entscheidet, wie stark und in welche Richtung er geht.")}
    <div class="tiles">${ANLAESSE.map(x => tile("anlass", x.id, x.label, x.tipp, a.anlass === x.id)).join("")}</div>
    <h3>${wer}</h3>
    <div class="tiles three">${JAHRESZEITEN.map(x => tile("saison", x.id, x.label, "", a.saison === x.id)).join("")}</div>
    </section>${navrow(!!(a.anlass && a.saison))}`;
}

function screenBudget() {
  const a = state.a;
  return `<section class="step">${kopf("budget", "Wie viel möchtest du ausgeben?", "Für eine normale Flasche (meist 30–60 ml).")}
    <div class="tiles">${BUDGETS.map(x => tile("budget", x.id, x.label, "", a.budget === x.id)).join("")}</div>
    <h3>Welche Art von Düften?</h3>
    <div class="tiles one">
      ${tile("stil", "beides", "Beides", "Je ein bekannter, ein Nischen- und ein günstiger Duft", a.stil === "beides")}
      ${tile("stil", "bekannt", "Bekannte Marken", "Dior, Chanel, Armani und Co.", a.stil === "bekannt")}
      ${tile("stil", "nische", "Nische", "Seltener, eigenständiger, oft teurer", a.stil === "nische")}
    </div>
    </section>${navrow(!!a.budget, "Ergebnis zeigen")}`;
}

function screenErgebnis() {
  const a = state.a;
  const { karten, weitere } = empfehle(a);
  const tags = [
    a.fuer === "egal" ? "Unisex / egal" : FUER_TEXT[a.fuer],
    ...a.traits.map(id => EIGENSCHAFTEN.find(e => e.id === id).label),
    ANLAESSE.find(x => x.id === a.anlass).label,
    JAHRESZEITEN.find(x => x.id === a.saison).label,
    BUDGETS.find(x => x.id === a.budget).label
  ];
  state.letzteKarten = karten.map(k => k.duft);
  return `<section>
    <div class="result-head">
      <p class="step-label">${a.geschenk ? "Geschenk-Ergebnis" : "Dein Ergebnis"}</p>
      <h2>${a.geschenk ? "Drei Düfte, die zur Person passen" : "Drei Düfte, die zu dir passen"}</h2>
      <p>Tippe auf „Preise vergleichen“, um direkt zu den Shops zu kommen.</p>
      <div class="summary-tags">${tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>
    </div>
    <div class="cards">
      ${karten.map(karte).join("")}
      <aside class="ad" aria-label="Anzeige">
        <small>Anzeige</small>
        <p>Platzhalter für eine kleine Werbefläche, z. B. ein Partner-Banner mit einer aktuellen Sale-Aktion.</p>
      </aside>
    </div>
    <div class="more">
      <h3>Passt auch</h3>
      ${weitere.map(weitereEintrag).join("")}
    </div>
    <p class="footer" style="text-align:left;padding:10px 0 0">* Preisklasse ist ein grober Richtwert für eine übliche Flaschengröße.</p>
    <div class="end-actions">
      <button class="btn accent" data-action="teilen">Ergebnis teilen</button>
      <button class="btn secondary" data-action="aendern">Antworten ändern</button>
      <button class="btn secondary" data-action="neu">Neu starten</button>
    </div>
  </section>`;
}

function alarmBanner() {
  const n = Object.keys(meldungen).filter(id => merkliste.includes(id)).length;
  if (!n) return "";
  return `<button class="alarm-banner" data-action="merkliste">🔔 ${n === 1 ? "Ein Duft" : n + " Düfte"} auf deiner Merkliste ${n === 1 ? "ist" : "sind"} günstiger geworden<span>ansehen →</span></button>`;
}

function preisZeile(d) {
  const p = feedPreis(d);
  const m = frisch[d.id] || meldungen[d.id];
  if (!p) return `<span class="ml-preis leise">${preisText(d.preis)}* · echter Preis folgt</span>`;
  return `<span class="ml-preis ${m ? "gefallen" : ""}">ab ${euro(p)}${d.feed.shop ? " bei " + esc(d.feed.shop) : ""}${m && m.alt > p ? ` <s>${euro(m.alt)}</s>` : ""}</span>`;
}

function alarmBox(d) {
  const al = alarme[d.id];
  if (!al) return `<button class="alarm-btn" data-action="alarm" data-id="${d.id}">🔔 Preisalarm einschalten</button>`;
  return `<div class="alarm-an">
    <button class="alarm-btn on" data-action="alarm" data-id="${d.id}">🔔 Preisalarm an</button>
    <label>Wunschpreis <input type="number" inputmode="decimal" min="1" step="1" placeholder="optional" value="${al.ziel ?? ""}" data-ziel="${d.id}" aria-label="Wunschpreis in Euro, optional"> €</label>
  </div>`;
}

function merkZeile(d, geteilt) {
  const bildText = typeof DUFTBILDER !== "undefined" ? DUFTBILDER[d.id] : "";
  return `<div class="ml-item ${!geteilt && (frisch[d.id] || meldungen[d.id]) ? "hit" : ""}" data-shopbox>
    <div class="ml-top">
      <div class="ml-bild" style="background:${farbe(d)}33">${visual(d)}</div>
      <div class="ml-text">
        <p class="card-brand">${esc(d.marke)}</p>
        <b class="ml-name">${esc(d.name)}</b>
        ${bildText ? `<p class="ml-bildtext">${esc(bildText)}</p>` : ""}
        ${preisZeile(d)}
      </div>
      ${geteilt ? "" : `<button class="ml-x" data-action="merken" data-id="${d.id}" aria-label="Von Merkliste entfernen">✕</button>`}
    </div>
    ${geteilt ? "" : alarmBox(d)}
    <div class="ml-actions">
      <button class="btn accent small" data-action="shops" data-id="${d.id}">Preise vergleichen</button>
      <button class="btn secondary small" data-action="details" data-id="${d.id}">Details</button>
    </div>
    <div class="shops">${shopLinks(d)}</div>
    <div class="ml-details" id="det-${d.id}"></div>
  </div>`;
}

function screenMerkliste() {
  const liste = merkliste.map(id => DUFT_BY_ID[id]).filter(Boolean);
  const html = `<section>
    <div class="result-head"><h2>Deine Merkliste</h2>
    <p>${liste.length ? "Gespeichert auf diesem Gerät. Mit 🔔 zeigt dir die App beim nächsten Öffnen, wenn ein Duft günstiger geworden ist." : ""}</p></div>
    ${liste.length ? `<div class="ml-liste">${liste.map(d => merkZeile(d, false)).join("")}</div>
      <div class="end-actions"><button class="btn" data-action="liste-teilen">Als Wunschliste teilen</button>
      <p class="tipp">Praktisch vor Geburtstagen und Weihnachten: Wer den Link öffnet, sieht deine Düfte und kann direkt Preise vergleichen.</p></div>`
      : `<p class="empty">Noch nichts gemerkt. Tippe bei einem Duft auf ♡.</p>`}
    <div class="end-actions"><button class="btn secondary" data-action="home">Zur Startseite</button></div>
  </section>`;
  /* Meldungen gelten als gesehen, bleiben in dieser Sitzung aber markiert */
  if (Object.keys(meldungen).length) { Object.assign(frisch, meldungen); meldungen = {}; speichere("duftfinder.meldungen", meldungen); }
  return html;
}

function screenGeteilt() {
  const liste = (state.geteilt || []).map(id => DUFT_BY_ID[id]).filter(Boolean);
  const neu = liste.filter(d => !merkliste.includes(d.id)).length;
  return `<section>
    <div class="result-head"><p class="step-label">Geteilte Wunschliste</p><h2>${liste.length} ${liste.length === 1 ? "Duft" : "Düfte"} auf der Wunschliste</h2>
    <p>Jemand hat dir diese Düfte geschickt. Vergleiche Preise oder übernimm sie auf deine eigene Merkliste.</p></div>
    ${liste.length ? `<div class="ml-liste">${liste.map(d => merkZeile(d, true)).join("")}</div>` : `<p class="empty">Diese Liste ist leer oder der Link ist unvollständig.</p>`}
    <div class="end-actions">
      ${neu ? `<button class="btn accent" data-action="uebernehmen">Alle auf meine Merkliste (${neu})</button>` : ""}
      <button class="btn secondary" data-action="los" data-value="ich">Eigenen Duft finden</button>
    </div>
  </section>`;
}

function trefferHtml(q) {
  if (!normalisiere(q)) {
    return `<p class="treffer-titel">Beliebt</p><div class="chips">${BELIEBT.map(id => DUFT_BY_ID[id]).filter(Boolean)
      .map(d => `<button class="chip" data-action="basis" data-id="${d.id}">${esc(d.name.replace(/ (EDT|EDP|EDC|Parfum)$/, ""))}</button>`).join("")}</div>`;
  }
  const liste = sucheDuft(q);
  if (!liste.length) {
    return `<p class="empty">Diesen Duft haben wir noch nicht in der Bibliothek (aktuell ${DUEFTE.length} Düfte). Versuch es mit der Marke oder mach das Quiz.</p>`;
  }
  return liste.map(d => `<button class="treffer-zeile" data-action="basis" data-id="${d.id}">
      <span><small>${esc(d.marke)}</small><b>${esc(d.name)}</b></span><span class="pfeil">→</span></button>`).join("");
}

function screenSuche() {
  return `<section class="step">
    <p class="step-label">Duft-Suche</p>
    <h2>Welchen Duft magst du?</h2>
    <p class="hint">Gib Marke oder Name ein. Du bekommst Düfte in ähnlicher Richtung: einen bekannten, einen aus der Nische und einen günstigeren.</p>
    <input class="suchfeld" type="search" id="suchfeld" placeholder="z. B. Sauvage, Libre, Aventus" value="${esc(state.suche || "")}"
      autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Duft suchen">
    <div id="treffer" class="treffer">${trefferHtml(state.suche || "")}</div>
    <div class="end-actions"><button class="btn secondary" data-action="home">Zurück</button></div>
  </section>`;
}

function screenAehnlich() {
  const basis = DUFT_BY_ID[state.basis];
  if (!basis) return screenSuche();
  const { karten, weitere } = aehnlicheDuefte(basis);
  const haupt = karten.length ? karten : weitere.slice(0, 3);
  const rest = karten.length ? weitere : weitere.slice(3);
  state.letzteKarten = haupt.map(k => k.duft);
  const bildText = typeof DUFTBILDER !== "undefined" ? DUFTBILDER[basis.id] : "";
  return `<section>
    <div class="result-head">
      <p class="step-label">Ähnliche Richtung</p>
      <h2>Wenn du ${esc(basis.name.replace(/ (EDT|EDP|EDC)$/, ""))} magst</h2>
      <div class="basis"><small>Dein Duft</small><b>${esc(basis.marke)} ${esc(basis.name)}</b>${bildText ? `<i>„${esc(bildText)}“</i>` : ""}</div>
      <p>Berechnet aus den Duftnoten, nicht gerochen. Bevor du blind kaufst: erst eine Probe holen.</p>
    </div>
    ${haupt.length ? `<div class="cards">${haupt.map(k => karte({ ...k, ohneAehnlich: true })).join("")}</div>`
      : `<p class="empty">Zu diesem Duft finden wir in unserer Bibliothek nichts, das nah genug dran ist. Er ist ziemlich eigenständig. Probier das Quiz, um nach deinem Charakter zu suchen.</p>`}
    ${rest.length ? `<div class="more"><h3>Auch in dieser Richtung</h3>${rest.map(weitereEintrag).join("")}</div>` : ""}
    <p class="footer" style="text-align:left;padding:10px 0 0">* Preisklasse ist ein grober Richtwert für eine übliche Flaschengröße.</p>
    <div class="end-actions">
      ${haupt.length ? `<button class="btn accent" data-action="teilen">Ergebnis teilen</button>` : ""}
      <button class="btn secondary" data-action="suche">Anderen Duft suchen</button>
      <button class="btn secondary" data-action="los" data-value="ich">Quiz machen</button>
    </div>
  </section>`;
}

/* ---------- Rendern ---------- */
function render(scrollTop = true) {
  const s = state.screen;
  const html = {
    start: screenStart, fuer: screenFuer, charakter: screenCharakter, anlass: screenAnlass,
    budget: screenBudget, ergebnis: screenErgebnis, merkliste: screenMerkliste, geteilt: screenGeteilt,
    suche: screenSuche, aehnlich: screenAehnlich
  }[s]();
  $app.innerHTML = html;
  document.getElementById("saved-count").textContent = merkliste.length;
  document.querySelector(".saved-link").classList.toggle("ping", Object.keys(meldungen).some(id => merkliste.includes(id)));
  if (scrollTop) window.scrollTo(0, 0);
}

function gehe(screen) {
  state.screen = screen;
  render();
}

/* ---------- Aktionen ---------- */
document.addEventListener("click", e => {
  const link = e.target.closest("a[data-zaehl]");
  if (link) zaehle(link.dataset.zaehl);
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const act = el.dataset.action;
  const a = state.a;

  if (act === "home") { if (location.hash) history.replaceState(null, "", location.pathname); state = neuerStart(); render(); }
  else if (act === "merkliste") { state.vorher = state.screen === "merkliste" ? state.vorher : state.screen; gehe("merkliste"); }
  else if (act === "suche") { state = neuerStart(); state.suche = ""; gehe("suche"); document.getElementById("suchfeld")?.focus(); }
  else if (act === "basis") { const q = state.suche; state.basis = el.dataset.id; state.suche = q; zaehle(`suche/${el.dataset.id}`); gehe("aehnlich"); }
  else if (act === "los") { state = neuerStart(el.dataset.value === "geschenk"); gehe("fuer"); }
  else if (act === "set") { a[el.dataset.group] = el.dataset.value; render(false); }
  else if (act === "trait") {
    const id = el.dataset.value;
    if (a.traits.includes(id)) a.traits = a.traits.filter(t => t !== id);
    else if (a.traits.length < MAX_TRAITS) a.traits.push(id);
    render(false);
  }
  else if (act === "weiter") {
    const i = SCHRITTE.indexOf(state.screen);
    if (i === SCHRITTE.length - 1) zaehle("quiz/ergebnis");
    gehe(i < SCHRITTE.length - 1 ? SCHRITTE[i + 1] : "ergebnis");
  }
  else if (act === "zurueck") {
    const i = SCHRITTE.indexOf(state.screen);
    gehe(i > 0 ? SCHRITTE[i - 1] : "start");
  }
  else if (act === "shops") {
    const box = el.closest("[data-shopbox]")?.querySelector(":scope > .shops");
    if (box) box.classList.toggle("open");
  }
  else if (act === "merken") {
    const id = el.dataset.id;
    const raus = merkliste.includes(id);
    zaehle(raus ? "merkliste/entfernt" : `merkliste/gemerkt/${id}`);
    merkliste = raus ? merkliste.filter(x => x !== id) : [...merkliste, id];
    speichere("duftfinder.merkliste", merkliste);
    if (raus) { delete alarme[id]; delete meldungen[id]; speichere("duftfinder.alarme", alarme); speichere("duftfinder.meldungen", meldungen); }
    else if (merkliste.length === 1) alertSanft("Gemerkt. In der Merkliste kannst du einen Preisalarm setzen.");
    const y = window.scrollY; render(false); window.scrollTo(0, y);
  }
  else if (act === "fb") {
    const id = el.dataset.id, vote = Number(el.dataset.vote);
    feedback[id] = feedback[id] === vote ? 0 : vote;
    if (feedback[id]) zaehle(`feedback/${vote > 0 ? "passt" : "passt-nicht"}/${id}`);
    speichere("duftfinder.feedback", feedback);
    const y = window.scrollY; render(false); window.scrollTo(0, y);
  }
  else if (act === "alarm") {
    const id = el.dataset.id;
    if (alarme[id]) delete alarme[id];
    else {
      alarme[id] = { ziel: null };
      zaehle(`preisalarm/an/${id}`);
      const p = feedPreis(DUFT_BY_ID[id]);
      if (p) { preise[id] = p; speichere("duftfinder.preise", preise); } // aktueller Preis ist der Ausgangspunkt
    }
    speichere("duftfinder.alarme", alarme);
    const y = window.scrollY; render(false); window.scrollTo(0, y);
  }
  else if (act === "details") {
    const box = document.getElementById(`det-${el.dataset.id}`);
    if (box) {
      const offen = box.classList.toggle("open");
      box.innerHTML = offen ? karte({ duft: DUFT_BY_ID[el.dataset.id] }) : "";
      el.textContent = offen ? "Weniger" : "Details";
    }
  }
  else if (act === "liste-teilen") { zaehle("wunschliste/geteilt"); listeTeilen(); }
  else if (act === "uebernehmen") {
    zaehle("wunschliste/uebernommen");
    for (const id of state.geteilt || []) if (DUFT_BY_ID[id] && !merkliste.includes(id)) merkliste.push(id);
    speichere("duftfinder.merkliste", merkliste);
    history.replaceState(null, "", location.pathname);
    gehe("merkliste");
  }
  else if (act === "aendern") { gehe("charakter"); }
  else if (act === "neu") { state = neuerStart(); render(); }
  else if (act === "teilen") { zaehle("ergebnis/geteilt"); teilen(); }
});

/* Suchfeld: nur die Trefferliste neu zeichnen, damit die Tastatur offen bleibt */
document.addEventListener("input", e => {
  if (e.target.id !== "suchfeld") return;
  state.suche = e.target.value;
  document.getElementById("treffer").innerHTML = trefferHtml(state.suche);
});
document.addEventListener("keydown", e => {
  if (e.target.id !== "suchfeld" || e.key !== "Enter") return;
  e.preventDefault();
  const erster = document.querySelector("#treffer [data-action=basis]");
  if (erster) erster.click();
});

/* Wunschpreis eintragen */
document.addEventListener("change", e => {
  const id = e.target.dataset && e.target.dataset.ziel;
  if (!id || !alarme[id]) return;
  const v = parseFloat(String(e.target.value).replace(",", "."));
  alarme[id].ziel = v > 0 ? Math.round(v * 100) / 100 : null;
  speichere("duftfinder.alarme", alarme);
  alertSanft(alarme[id].ziel ? `Meldung, sobald er unter ${euro(alarme[id].ziel)} fällt.` : "Meldung bei jeder Preissenkung.");
});

async function listeTeilen() {
  const url = `${location.origin}${location.pathname}#liste=${merkliste.join(",")}`;
  const text = "Meine Duft-Wunschliste:";
  try {
    if (navigator.share) { await navigator.share({ title: "Meine Duft-Wunschliste", text, url }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); alertSanft("Link kopiert."); }
  catch (e) { alertSanft("Teilen geht hier leider nicht."); }
}

/* Geteilte Wunschliste aus dem Link lesen: …#liste=id1,id2 */
function leseLink() {
  const m = location.hash.match(/^#liste=([\w,-]+)/);
  if (!m) return false;
  state = neuerStart();
  state.geteilt = [...new Set(m[1].split(","))].filter(id => DUFT_BY_ID[id]).slice(0, 40);
  state.screen = "geteilt";
  return true;
}
window.addEventListener("hashchange", () => { if (leseLink()) render(); });

/* Preisalarm prüfen, sobald frische Preise aus feed.json da sind.
   Ohne Wunschpreis: Meldung bei jeder Senkung. Mit Wunschpreis: erst, wenn der Preis darunter liegt. */
function pruefeAlarme() {
  let neu = false;
  for (const id of merkliste) {
    const p = feedPreis(DUFT_BY_ID[id] || {});
    if (!p) continue;
    const alt = preise[id];
    const al = alarme[id];
    if (al) {
      const gesunken = alt != null && p < alt - 0.009;
      const unterZiel = al.ziel ? p <= al.ziel : true;
      const ersterTreffer = alt == null && al.ziel && p <= al.ziel;
      if ((gesunken && unterZiel) || ersterTreffer) { meldungen[id] = { alt: alt ?? p, neu: p }; neu = true; }
    }
    preise[id] = p;
  }
  speichere("duftfinder.preise", preise);
  if (neu) speichere("duftfinder.meldungen", meldungen);
  return neu;
}

async function teilen() {
  const namen = (state.letzteKarten || []).map(d => `${d.marke} ${d.name}`).join(", ");
  const text = `Meine Duft-Treffer: ${namen}. Gefunden mit dem Duftfinder.`;
  try {
    if (navigator.share) { await navigator.share({ title: "Duftfinder", text, url: location.href }); return; }
  } catch (e) {
    if (e && e.name === "AbortError") return; // Nutzer hat abgebrochen
  }
  try { await navigator.clipboard.writeText(`${text} ${location.href}`); alertSanft("Text kopiert."); }
  catch (e) { alertSanft("Teilen geht hier leider nicht."); }
}

function alertSanft(msg) {
  const p = document.createElement("p");
  p.textContent = msg;
  p.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:12px;z-index:9;font-size:.9rem";
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1800);
}

/* Optional: feed.json (später vom nächtlichen Feed-Job erzeugt) ergänzt Bilder, Preise und Links.
   Format: { "dior-sauvage": { "bild": "https://…", "preis": 89.9, "shop": "Douglas", "link": "https://…" }, … }
   Fehlt die Datei, läuft die App einfach ohne. */
fetch("feed.json", { cache: "no-cache" })
  .then(r => r.ok ? r.json() : {})
  .then(feed => {
    let geaendert = false;
    for (const [id, extra] of Object.entries(feed || {})) {
      const d = DUFT_BY_ID[id];
      if (d && extra && typeof extra === "object") { Object.assign(d, { feed: extra }); if (extra.bild) d.bild = extra.bild; geaendert = true; }
    }
    if (geaendert) { pruefeAlarme(); const y = window.scrollY; render(false); window.scrollTo(0, y); }
  })
  .catch(() => {});

leseLink();
render();
