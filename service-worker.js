// service-worker.js — Rappels d'articles toutes les 2h (Periodic Background Sync)
// ⚠️ Doit être hébergé à la RACINE du site, au même niveau que index.html
// et servi en HTTPS (ou localhost) pour fonctionner.

const TAG = "douanes-rappel-2h";
const DEUX_HEURES = 2 * 60 * 60 * 1000;

// Petit pool d'articles+exemples (extrait — indépendant de l'app pour rester léger)
const ARTICLES_SW = [
  { num: 1, titre: "Définitions générales", exemple: "Le territoire douanier comprend l'ensemble du territoire national, les eaux territoriales et l'espace aérien — toute marchandise y entrant relève du Code des Douanes." },
  { num: 7, titre: "Marchandises fortement taxées", exemple: "Un droit ad valorem ≥ 20% (ou >25% de la valeur en cas de droit spécifique) classe la marchandise comme fortement taxée, avec des contrôles renforcés." },
  { num: 21, titre: "Marchandises prohibées", exemple: "Un conteneur d'articles de sport contrefaits (logo Nike imité) est prohibé même déclaré en transit vers la Gambie : saisie et poursuites." },
  { num: 23, titre: "Champ d'application des prohibitions", exemple: "Les prohibitions s'appliquent à TOUS les régimes douaniers, y compris transit et admission temporaire — pas seulement à l'importation définitive." },
  { num: 62, titre: "Manifeste des navires", exemple: "Tout capitaine de navire, y compris de la Marine nationale, doit déposer un manifeste au bureau de douane : aucune immunité douanière." },
  { num: 95, titre: "Conduite en douane", exemple: "Les marchandises introduites doivent être conduites au bureau de douane le plus proche dans les délais prévus, sauf cas de force majeure dûment signalé." },
  { num: 109, titre: "Liberté de destination douanière", exemple: "Une marchandise peut à tout moment recevoir une destination douanière (mise à la consommation, transit, entrepôt...), sous réserve des prohibitions de l'article 21." },
  { num: 114, titre: "Indépendance de chaque article d'une déclaration", exemple: "Sur une déclaration à 5 articles, une contestation sur le riz n'empêche pas la mainlevée immédiate des 4 autres articles non contestés." },
  { num: 142, titre: "Enlèvement des marchandises", exemple: "L'autorisation d'enlèvement (Art. 142) est le point de bascule : si le tarif baisse avant cette autorisation, le déclarant peut demander le taux le plus favorable." },
  { num: 154, titre: "Acquit-à-caution", exemple: "Un conteneur de riz en transit Dakar→Kidira doit être couvert par un acquit-à-caution garantissant le paiement des droits suspendus en cas de non-arrivée." },
  { num: 252, titre: "Dépôt de douane d'office", exemple: "Si le déclarant ne se présente pas 5 jours après convocation de vérification, les marchandises sont constituées d'office en dépôt de douane (Art. 252)." },
  { num: 306, titre: "Notification du procès-verbal", exemple: "Le PV est notifié au saisi présent par lecture immédiate, ou affiché 24h à l'unité de douane si le saisi est absent ou refuse de signer." },
  { num: 414, titre: "Droit de recours", exemple: "Même après décision de la Commission de règlement des litiges, le déclarant garde toujours le droit de recours prévu à l'article 414." }
];

function tirerArticle() {
  return ARTICLES_SW[Math.floor(Math.random() * ARTICLES_SW.length)];
}

async function notifierArticle() {
  const art = tirerArticle();
  await self.registration.showNotification(`📜 Art. ${art.num} — ${art.titre}`, {
    body: art.exemple,
    tag: TAG, // remplace toute notif précédente du même type (pas d'empilement)
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2307090F'/><text y='62' x='50' text-anchor='middle' font-size='55' fill='%23C49846'>⚖</text></svg>",
    badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23C49846'/></svg>",
    data: { url: "./" }
  });
}

// Vérifie le timestamp en cache pour respecter l'intervalle de 2h
// même si periodicsync se déclenche plus souvent que prévu (selon le navigateur)
async function verifierEtNotifier() {
  try {
    const cache = await caches.open("douanes-notif-meta");
    const res = await cache.match("derniere-notif");
    const dernier = res ? parseInt(await res.text(), 10) : 0;
    const maintenant = Date.now();
    if (maintenant - dernier >= DEUX_HEURES) {
      await notifierArticle();
      await cache.put("derniere-notif", new Response(String(maintenant)));
    }
  } catch (e) {
    // En cas d'erreur, on tente quand même une notification pour ne pas rester silencieux
    try { await notifierArticle(); } catch (e2) {}
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// API moderne (Chrome/Android, app installée) — meilleur effort, intervalle non garanti à la seconde
self.addEventListener("periodicsync", (event) => {
  if (event.tag === TAG) {
    event.waitUntil(verifierEtNotifier());
  }
});

// Repli : "sync" classique, déclenché à la reconnexion réseau
self.addEventListener("sync", (event) => {
  if (event.tag === TAG) {
    event.waitUntil(verifierEtNotifier());
  }
});

// Clic sur la notification → ouvre/affiche l'app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
