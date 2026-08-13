/*
 * ============================================================
 * CAMPMANAGER V3.3.3 — CACHE HORS CONNEXION
 * ============================================================
 *
 * Ce fichier est importé par OneSignalSDKWorker.js.
 *
 * Il ne met en cache QUE le conteneur GitHub Pages CampManager.
 * L'iframe Apps Script est sur un autre domaine et n'est pas mise
 * en cache : les données sont conservées séparément via snapshot.
 */

const CACHE_CAMPMANAGER_V33 =
  "campmanager-shell-v3.3.3";

const CHEMIN_CAMPMANAGER =
  "/capfun-menage-mobile/";

const FICHIERS_CAMPMANAGER = [
  CHEMIN_CAMPMANAGER,
  CHEMIN_CAMPMANAGER + "index.html",
  CHEMIN_CAMPMANAGER + "config.js",
  CHEMIN_CAMPMANAGER + "manifest.json"
];


/*
 * Pré-cache du squelette.
 * Un fichier manquant ne doit pas faire échouer toute l'installation.
 */
self.addEventListener(
  "install",
  function(evenement) {
    evenement.waitUntil(
      caches
        .open(
          CACHE_CAMPMANAGER_V33
        )
        .then(
          function(cache) {
            return Promise.all(
              FICHIERS_CAMPMANAGER.map(
                function(url) {
                  return fetch(
                    url,
                    {
                      cache:
                        "reload"
                    }
                  )
                    .then(
                      function(reponse) {
                        if (
                          reponse &&
                          reponse.ok
                        ) {
                          return cache.put(
                            url,
                            reponse.clone()
                          );
                        }
                      }
                    )
                    .catch(
                      function() {
                        // Un asset pourra être récupéré au prochain passage.
                      }
                    );
                }
              )
            );
          }
        )
        .then(
          function() {
            return self.skipWaiting();
          }
        )
    );
  }
);


/*
 * Purge des anciens caches CampManager uniquement.
 */
self.addEventListener(
  "activate",
  function(evenement) {
    evenement.waitUntil(
      caches
        .keys()
        .then(
          function(noms) {
            return Promise.all(
              noms.map(
                function(nom) {
                  if (
                    nom.indexOf(
                      "campmanager-shell-"
                    ) ===
                      0 &&
                    nom !==
                      CACHE_CAMPMANAGER_V33
                  ) {
                    return caches.delete(
                      nom
                    );
                  }
                }
              )
            );
          }
        )
        .then(
          function() {
            return self.clients.claim();
          }
        )
    );
  }
);


/*
 * Réseau d'abord, cache en secours.
 *
 * On filtre strictement le chemin CampManager afin de ne pas
 * interférer avec d'autres éventuels projets GitHub Pages.
 */
self.addEventListener(
  "fetch",
  function(evenement) {
    const requete =
      evenement.request;

    if (
      requete.method !==
        "GET"
    ) {
      return;
    }

    let url;

    try {
      url =
        new URL(
          requete.url
        );
    } catch (erreur) {
      return;
    }

    if (
      url.origin !==
        self.location.origin ||
      url.pathname.indexOf(
        CHEMIN_CAMPMANAGER
      ) !==
        0
    ) {
      return;
    }

    evenement.respondWith(
      fetch(
        requete
      )
        .then(
          function(reponse) {
            if (
              reponse &&
              reponse.ok
            ) {
              const copie =
                reponse.clone();

              caches
                .open(
                  CACHE_CAMPMANAGER_V33
                )
                .then(
                  function(cache) {
                    cache.put(
                      requete,
                      copie
                    );
                  }
                );
            }

            return reponse;
          }
        )
        .catch(
          function() {
            return caches
              .match(
                requete
              )
              .then(
                function(reponseCache) {
                  if (
                    reponseCache
                  ) {
                    return reponseCache;
                  }

                  /*
                   * Navigation vers /capfun-menage-mobile/ :
                   * on retourne index.html si le chemin exact
                   * n'était pas présent dans le cache.
                   */
                  if (
                    requete.mode ===
                      "navigate"
                  ) {
                    return caches.match(
                      CHEMIN_CAMPMANAGER +
                      "index.html"
                    );
                  }

                  return undefined;
                }
              );
          }
        )
    );
  }
);
