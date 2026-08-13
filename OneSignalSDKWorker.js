/*
 * CAMPMANAGER V3.3.3
 *
 * Même service worker qu'avant pour conserver OneSignal.
 * On ajoute simplement le module de cache hors connexion.
 *
 * Ne pas déplacer ce fichier : garder le même URL.
 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
importScripts("./campmanager-offline-worker.js");
