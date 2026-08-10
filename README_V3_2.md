# CAPFUN MÉNAGE MOBILE — V3.2

## À renseigner dans config.js

1. `APPS_SCRIPT_URL`
   - URL publique Apps Script terminant par `/exec`.

2. `ONESIGNAL_APP_ID`
   - App ID OneSignal.
   - Cette valeur est publique et peut rester dans GitHub.

## Fichiers à mettre à la racine du dépôt GitHub Pages

- index.html
- config.js
- manifest.json
- OneSignalSDKWorker.js

## Apps Script

Ajouter :
- `96_Notifications_OneSignal_V3_2.gs`

Remplacer :
- `Web_Js.html` par `Web_Js_V3_2_notifications_vibration.html`

Puis exécuter une fois :
- `configurerOneSignalV32()`
- `installerDeclencheurNotificationsV32()`

## Important

La clé REST OneSignal ne doit jamais être mise dans GitHub.
Elle est enregistrée dans les Script Properties par `configurerOneSignalV32()`.

## Fonctionnement

Quand Réception passe manuellement un logement sur `Parti` :
- le personnel affecté à ce logement est lu ;
- chaque prénom devient un External ID OneSignal ;
- une notification ciblée est envoyée à ces téléphones.

Le rafraîchissement automatique de l'application reste fixé à 15 secondes.
Lorsqu'une nouvelle tâche apparaît pendant que l'application est ouverte,
une vibration de secours est déclenchée si le navigateur le permet.
