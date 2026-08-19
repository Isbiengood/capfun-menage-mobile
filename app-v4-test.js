/*
 * ============================================================
 * CAMPMANAGER V4 TEST — CLIENT MOBILE SUPABASE
 * ============================================================
 *
 * Cette version est volontairement séparée de la V3 stable.
 * Elle utilise uniquement les fonctions RPC V4 TEST de Supabase.
 * Aucune écriture directe dans les tables n'est faite par le navigateur.
 */

(function () {
  "use strict";

  const CLE_PRENOM = "campManagerV4TestPrenom";
  const CLE_SOMBRE = "campManagerV4TestModeSombre";

  const etat = {
    client: null,
    prenom: "",
    personnes: [],
    abonnement: null,
    minuteurRealtime: null,
    chargementEnCours: false,
    toastTimer: null
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", initialiser);

  async function initialiser() {
    memoriserElements();
    brancherEvenements();
    appliquerModeSombreInitial();
    actualiserEtatReseau();

    window.addEventListener("online", actualiserEtatReseau);
    window.addEventListener("offline", actualiserEtatReseau);

    try {
      initialiserSupabase();
      await chargerConfiguration();
      initialiserRealtime();
      restaurerOuChoisirPrenom();
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  function memoriserElements() {
    [
      "boutonActualiser",
      "boutonReglages",
      "erreurPrincipale",
      "nomUtilisateur",
      "etatTechnique",
      "badgeVitesse",
      "listeTaches",
      "zoneAvenir",
      "listeAvenir",
      "voilePrenom",
      "selectPrenom",
      "validerPrenom",
      "voileReglages",
      "prenomReglages",
      "changerPrenom",
      "modeSombre",
      "reinitialiserDemo",
      "versionAffichee",
      "etatRealtime",
      "fermerReglages",
      "toast"
    ].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function brancherEvenements() {
    el.boutonActualiser.addEventListener("click", function () {
      chargerLogements(true);
    });

    el.boutonReglages.addEventListener("click", ouvrirReglages);
    el.fermerReglages.addEventListener("click", fermerReglages);

    el.validerPrenom.addEventListener("click", validerPrenom);

    el.selectPrenom.addEventListener("change", function () {
      el.validerPrenom.disabled = !String(el.selectPrenom.value || "").trim();
    });

    el.changerPrenom.addEventListener("click", function () {
      fermerReglages();
      ouvrirChoixPrenom();
    });

    el.modeSombre.addEventListener("change", function () {
      localStorage.setItem(CLE_SOMBRE, el.modeSombre.checked ? "1" : "0");
      document.body.classList.toggle("sombre", el.modeSombre.checked);
    });

    el.reinitialiserDemo.addEventListener("click", reinitialiserDemo);
  }

  function initialiserSupabase() {
    const config = window.CAMPMANAGER_V4_CONFIG || {};

    if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Configuration Supabase V4 manquante.");
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("La bibliothèque Supabase n'a pas pu être chargée.");
    }

    etat.client = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 5
          }
        }
      }
    );

    el.versionAffichee.textContent =
      "CampManager " + (config.VERSION || "V4 TEST") + " · Supabase Paris";
  }

  async function chargerConfiguration() {
    const debut = performance.now();
    const reponse = await etat.client.rpc("charger_application_v4");

    if (reponse.error) {
      throw reponse.error;
    }

    const donnees = reponse.data || {};
    etat.personnes = Array.isArray(donnees.personnes) ? donnees.personnes : [];

    remplirSelectPrenoms();
    afficherTemps(debut, "Configuration");
  }

  function remplirSelectPrenoms() {
    el.selectPrenom.innerHTML = '<option value="">Choisir un prénom…</option>';

    etat.personnes.forEach(function (personne) {
      const option = document.createElement("option");
      option.value = personne.prenom;
      option.textContent = personne.prenom + libelleRole(personne);
      el.selectPrenom.appendChild(option);
    });
  }

  function libelleRole(personne) {
    if (personne.femmeDeChambre && personne.gouvernante) {
      return " · double rôle";
    }
    if (personne.gouvernante) {
      return " · gouvernante";
    }
    if (personne.femmeDeChambre) {
      return " · ménage";
    }
    return "";
  }

  function restaurerOuChoisirPrenom() {
    let prenom = "";

    try {
      prenom = String(localStorage.getItem(CLE_PRENOM) || "").trim();
    } catch (erreur) {}

    const existe = etat.personnes.some(function (personne) {
      return personne.prenom === prenom;
    });

    if (!existe) {
      ouvrirChoixPrenom();
      return;
    }

    etat.prenom = prenom;
    appliquerPrenomAffiche();
    chargerLogements(true);
  }

  function ouvrirChoixPrenom() {
    el.selectPrenom.value = etat.prenom || "";
    el.validerPrenom.disabled = !el.selectPrenom.value;
    el.voilePrenom.classList.remove("cache");
  }

  function validerPrenom() {
    const prenom = String(el.selectPrenom.value || "").trim();

    if (!prenom) {
      return;
    }

    etat.prenom = prenom;

    try {
      localStorage.setItem(CLE_PRENOM, prenom);
    } catch (erreur) {}

    el.voilePrenom.classList.add("cache");
    appliquerPrenomAffiche();
    chargerLogements(true);
  }

  function appliquerPrenomAffiche() {
    el.nomUtilisateur.textContent = "👤 " + (etat.prenom || "—");
    el.prenomReglages.textContent = etat.prenom || "—";
  }

  async function chargerLogements(afficherMessage) {
    if (!etat.client || !etat.prenom || etat.chargementEnCours) {
      return;
    }

    etat.chargementEnCours = true;
    el.boutonActualiser.disabled = true;
    masquerErreur();

    const debut = performance.now();

    try {
      const reponse = await etat.client.rpc("charger_logements_v4", {
        p_prenom: etat.prenom
      });

      if (reponse.error) {
        throw reponse.error;
      }

      const donnees = reponse.data || {};
      rendreTaches(donnees.logements || []);
      rendreAvenir(donnees.controlesAVenir || []);
      afficherTemps(debut, "Données");

      if (afficherMessage) {
        const duree = Math.round(performance.now() - debut);
        afficherToast("Actualisé en " + duree + " ms");
      }
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      etat.chargementEnCours = false;
      el.boutonActualiser.disabled = false;
    }
  }

  function rendreTaches(taches) {
    el.listeTaches.innerHTML = "";

    if (!taches.length) {
      const vide = document.createElement("div");
      vide.className = "vide";
      vide.innerHTML = "✅ Aucune tâche disponible pour le moment.<br><small>Les changements des autres téléphones arriveront automatiquement.</small>";
      el.listeTaches.appendChild(vide);
      return;
    }

    taches.forEach(function (tache) {
      el.listeTaches.appendChild(creerCarteTache(tache, false));
    });
  }

  function rendreAvenir(taches) {
    el.listeAvenir.innerHTML = "";

    if (!taches.length) {
      el.zoneAvenir.classList.add("cache");
      return;
    }

    el.zoneAvenir.classList.remove("cache");

    taches.forEach(function (tache) {
      el.listeAvenir.appendChild(creerCarteTache(tache, true));
    });
  }

  function creerCarteTache(tache, avenir) {
    const carte = document.createElement("article");
    carte.className = "carte" + (avenir ? " carte-avenir" : "");
    carte.dataset.tacheId = tache.tacheId || "";

    const haut = document.createElement("div");
    haut.className = "carte-haut";

    const priorite = document.createElement("div");
    priorite.className = "priorite";
    priorite.textContent = tache.priorite || "⚪";

    const numero = document.createElement("div");
    numero.className = "numero";
    numero.textContent = tache.logement || "—";

    const etatAffiche = document.createElement("div");
    etatAffiche.className = "etat " + classeEtat(tache.etatMenage);
    etatAffiche.textContent = tache.etatMenage || "—";

    haut.appendChild(priorite);
    haut.appendChild(numero);
    haut.appendChild(etatAffiche);

    const details = document.createElement("div");
    details.className = "details";

    const lignes = [];

    if (tache.personnel) {
      lignes.push("<b>Personnel :</b> " + echapper(tache.personnel));
    }
    if (tache.gouvernante) {
      lignes.push("<b>Check :</b> " + echapper(tache.gouvernante));
    }
    if (tache.acces) {
      lignes.push("<b>Accès :</b> " + echapper(tache.acces));
    }
    if (avenir) {
      lignes.push("<b>Statut :</b> contrôle à venir");
    }

    details.innerHTML = lignes.join(" · ");

    carte.appendChild(haut);
    carte.appendChild(details);

    if (!avenir && tache.actionSuivante) {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "action" + (tache.mode === "controle" ? " controle" : "");
      bouton.textContent = libelleAction(tache);
      bouton.addEventListener("click", function () {
        validerTache(tache, carte, bouton);
      });
      carte.appendChild(bouton);
    }

    return carte;
  }

  function classeEtat(valeur) {
    if (valeur === "À faire") return "etat-a-faire";
    if (valeur === "À vérifier") return "etat-a-verifier";
    if (valeur === "À recontrôler") return "etat-a-recontroler";
    return "";
  }

  function libelleAction(tache) {
    if (tache.mode === "menage_controle") {
      return "✅ Ménage + contrôle terminé → Prêt";
    }
    if (tache.mode === "controle") {
      return "✅ Contrôle terminé → Prêt";
    }
    return "✅ Ménage terminé → À vérifier";
  }

  async function validerTache(tache, carte, bouton) {
    if (!tache.tacheId || !etat.prenom) {
      return;
    }

    const texteInitial = bouton.textContent;
    bouton.disabled = true;
    bouton.textContent = "Enregistrement…";
    carte.classList.add("en-cours");

    const debut = performance.now();

    try {
      const reponse = await etat.client.rpc("avancer_etat_menage_v4", {
        p_tache_id: tache.tacheId,
        p_prenom: etat.prenom,
        p_etat_actuel: tache.etatMenage
      });

      if (reponse.error) {
        throw reponse.error;
      }

      const duree = Math.round(performance.now() - debut);
      const resultat = reponse.data || {};

      afficherToast(
        (resultat.logement || tache.logement) +
        " → " +
        (resultat.nouvelEtat || tache.actionSuivante) +
        " · " + duree + " ms"
      );

      await chargerLogements(false);
    } catch (erreur) {
      afficherErreur(erreur);
      bouton.disabled = false;
      bouton.textContent = texteInitial;
      carte.classList.remove("en-cours");
    }
  }

  function initialiserRealtime() {
    if (!etat.client) {
      return;
    }

    if (etat.abonnement) {
      etat.client.removeChannel(etat.abonnement);
    }

    etat.abonnement = etat.client
      .channel("campmanager-v4-test-taches")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "taches_menage"
        },
        function () {
          planifierRafraichissementRealtime();
        }
      )
      .subscribe(function (statut) {
        if (statut === "SUBSCRIBED") {
          el.etatRealtime.textContent = "Realtime : 🟢 connecté";
        } else if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") {
          el.etatRealtime.textContent = "Realtime : 🟠 " + statut;
        } else {
          el.etatRealtime.textContent = "Realtime : " + statut;
        }
      });
  }

  function planifierRafraichissementRealtime() {
    if (!etat.prenom) {
      return;
    }

    clearTimeout(etat.minuteurRealtime);
    etat.minuteurRealtime = setTimeout(function () {
      chargerLogements(false);
      afficherToast("🔄 Mise à jour reçue en temps réel");
    }, 180);
  }

  async function reinitialiserDemo() {
    const ok = window.confirm(
      "Réinitialiser uniquement les quatre logements TEST ?\n\nLes données réelles ne sont pas concernées."
    );

    if (!ok) {
      return;
    }

    el.reinitialiserDemo.disabled = true;
    el.reinitialiserDemo.textContent = "Réinitialisation…";

    try {
      const reponse = await etat.client.rpc("reinitialiser_demo_v4");

      if (reponse.error) {
        throw reponse.error;
      }

      afficherToast("🧪 Démo V4 réinitialisée");
      fermerReglages();
      await chargerLogements(false);
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      el.reinitialiserDemo.disabled = false;
      el.reinitialiserDemo.textContent = "🧪 Réinitialiser les logements TEST";
    }
  }

  function ouvrirReglages() {
    appliquerPrenomAffiche();
    el.voileReglages.classList.remove("cache");
  }

  function fermerReglages() {
    el.voileReglages.classList.add("cache");
  }

  function appliquerModeSombreInitial() {
    let sombre = false;

    try {
      sombre = localStorage.getItem(CLE_SOMBRE) === "1";
    } catch (erreur) {}

    el.modeSombre.checked = sombre;
    document.body.classList.toggle("sombre", sombre);
  }

  function actualiserEtatReseau() {
    if (!el.etatTechnique) {
      return;
    }

    el.etatTechnique.textContent = navigator.onLine
      ? "🟢 En ligne · Supabase Paris"
      : "🟠 Hors connexion";
  }

  function afficherTemps(debut, libelle) {
    const duree = Math.round(performance.now() - debut);
    el.badgeVitesse.textContent = duree + " ms";
    el.badgeVitesse.title = libelle + " chargées en " + duree + " ms";
  }

  function afficherErreur(erreur) {
    const message = messageErreur(erreur);
    el.erreurPrincipale.textContent = "❌ " + message;
    el.erreurPrincipale.classList.remove("cache");
    console.error("CampManager V4 TEST", erreur);
  }

  function masquerErreur() {
    el.erreurPrincipale.classList.add("cache");
    el.erreurPrincipale.textContent = "";
  }

  function messageErreur(erreur) {
    if (!erreur) return "Erreur inconnue.";
    if (typeof erreur === "string") return erreur;
    if (erreur.message) return erreur.message;
    return "Erreur de communication avec Supabase.";
  }

  function afficherToast(message) {
    clearTimeout(etat.toastTimer);
    el.toast.textContent = message;
    el.toast.classList.remove("cache");
    etat.toastTimer = setTimeout(function () {
      el.toast.classList.add("cache");
    }, 2400);
  }

  function echapper(valeur) {
    return String(valeur == null ? "" : valeur)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
