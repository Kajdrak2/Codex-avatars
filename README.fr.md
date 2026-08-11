# Codex Avatars

Codex Avatars donne un compagnon animé indépendant à la tâche principale et à chaque sous-agent Codex. Les personnages utilisent le format natif des Pets Codex v2 et se déplacent directement sur un ou plusieurs écrans, sans dock, panneau coloré ni fond visible.

> État du projet : la version `0.7.0` est publiée sur GitHub. Elle ajoute le marketplace externe de Pets V2, la publication automatique après une CI protégée, le signalement public des Pets depuis l’application, la soumission directe via GitHub, la réconciliation continue des tâches multiples, une étape visible pour le code d’appareil GitHub, des aperçus fiables pour les Pets propres au fork et le retour guidé décrits plus bas. L’installeur n’est pas encore signé.

## Ce qui est déjà pris en charge

- Overlay réellement invisible : seuls les avatars et leurs étiquettes sont dessinés.
- Un personnage distinct par `agent_id`, y compris l’agent principal.
- Animations Pets Codex v2 pour le déplacement, le travail, l’attente et la fin de tâche.
- Choix des avatars actifs depuis la bibliothèque locale `~/.codex/pets`.
- Détection automatique d’un nouvel avatar créé dans Work ou Codex.
- Déplacement selon la disposition réelle des écrans Windows, en franchissant seulement des bords communs et les écrans intermédiaires.
- Sélection visuelle de la zone personnalisée directement sur le bureau, comme une capture d’écran.
- Titre de chaque tâche Codex principale et nom réel de chaque sous-tâche de collaboration, avec modèle et effort affichables séparément.
- Tailles réglables indépendamment pour les agents principaux et les sous-agents.
- Aperçu immédiat des deux tailles pendant le déplacement des curseurs.
- Affichage facultatif des agents récemment au repos ou terminés sous forme de Pets endormis et immobiles pendant 30 minutes maximum.
- Les événements de fin reçus en retard ne peuvent plus faire réapparaître un avatar endormi expiré.
- Formulaire de création personnalisé ouvrant une tâche Codex avec le prompt déjà préparé.
- Parcours, recherche, aperçu et installation directe des Pets V2 dédupliqués du fork contrôlé Codex Avatars et du catalogue original Awesome Codex Pet.
- Validation et soumission directe d’un Pet V2 local au catalogue via GitHub, sans consommer de crédits Codex.
- Signalement d’un Pet publié depuis sa carte du marketplace au moyen d’une issue GitHub publique préremplie.
- Ouverture directe d’un signalement de bug ou d’une suggestion GitHub guidée, avec la version installée préremplie.
- Import et partage de packages `.codexpet` validés depuis la galerie locale.
- Mode passif avec trois portes de sortie permanentes : réglages, icône de notification Windows et `Ctrl+Alt+A`.
- Bouton pour masquer ou réafficher tous les avatars depuis les réglages ou l’icône de notification, sans fermer le compagnon.
- Démarrage automatique au premier événement de session Codex ; démarrage avec Windows disponible en secours.
- Transport local et limité à des métadonnées autorisées.

## Pourquoi il reste un petit renderer local

Le plugin assure l’intégration à ChatGPT/Codex : hooks, installation, commandes et création d’avatars. Une interface de plugin s’exécute toutefois dans une iframe à l’intérieur de ChatGPT ; elle ne peut pas créer une fenêtre système toujours au-dessus des autres applications.

Le dessin sur le bureau est donc assuré par un petit processus Electron local. L’installeur l’embarque de façon autonome ; l’utilisateur final n’a besoin ni de Node.js, ni de Git, ni d’un terminal après téléchargement.

## Installation simple — recommandée

1. Ouvre la [dernière release de Codex Avatars](https://github.com/Kajdrak2/Codex-avatars/releases/latest), télécharge le fichier Windows `.exe` sous **Assets**, puis lance-le.
2. Ouvre l’installeur et termine l’assistant.
3. Dans la page Codex qui s’ouvre, installe **Codex Avatars** et vérifie ses hooks.

L’installeur place le compagnon dans le profil Windows, active immédiatement les hooks locaux, embarque le marketplace et le plugin, enregistre le chemin exact du renderer et ouvre les réglages. La confirmation finale dans Codex reste volontaire : un installeur ne doit pas accepter des hooks de sécurité à la place de l’utilisateur.

L’installeur Windows publié n’est pas encore signé ; Microsoft SmartScreen peut donc afficher un avertissement.

Lorsqu’une release GitHub plus récente est disponible, le compagnon propose d’ouvrir sa page au démarrage. La mise à jour reste volontaire : il faut télécharger et lancer l’installeur normal, sans remplacement silencieux de l’exécutable.

## Installation depuis Git — développement

Prérequis : Windows 10/11, Node.js 22 ou plus récent et une version actuelle de l’application de bureau ChatGPT avec Codex.

```powershell
git clone https://github.com/Kajdrak2/Codex-avatars.git codex-avatars
cd codex-avatars
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Le script :

1. installe exactement les dépendances verrouillées avec `npm ci` ;
2. déclare ce checkout comme marketplace Codex local ;
3. tente d’installer le plugin `codex-avatars@codex-avatars-local` ;
4. enregistre le chemin du renderer source pour les futurs démarrages ;
5. lance le compagnon en arrière-plan.

Ensuite, redémarre ChatGPT, ouvre **Plugins**, choisis **Codex Avatars Local**, active **Codex Avatars** et vérifie ses hooks lorsque Codex le demande. Les hooks non gérés sont volontairement soumis à cette validation de confiance.

Prévisualiser sans rien modifier :

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -WhatIf
```

## Utilisation

L’overlay n’a volontairement aucun panneau. Ouvre les réglages depuis l’icône **Codex Avatars** dans la zone de notification Windows.

- **Mode passif** : tous les clics traversent l’overlay. `Ctrl+Alt+A` permet toujours de le basculer.
- **Désactiver les avatars** : masque l’overlay tout en gardant le processus et l’état des agents prêts ; le même bouton ou l’action de zone de notification le restaure immédiatement.
- **Mode interactif** : les zones des avatars deviennent saisissables et les personnages peuvent être déplacés.
- **Avatars actifs** : chaque Pet peut être activé ou désactivé ; les agents sont distribués de façon déterministe entre les choix actifs.
- **Zone** : sélectionne tous les écrans, coche plusieurs moniteurs ou trace directement un rectangle sur le bureau ; fais glisser un avatar par un bord commun pour le déposer sur l’écran voisin.
- **Tailles principale/sous-agent, noms, modèle/effort, agents dormants et mouvement** : les options s’appliquent immédiatement et sont conservées localement.
- **Démo** : le même bouton la lance et l’arrête, puis supprime tous les agents synthétiques.

## Marketplace communautaire V2

Les réglages fusionnent le [fork de catalogue contrôlé par Codex Avatars](https://github.com/Kajdrak2/awesome-codex-pet) avec le catalogue original [Awesome Codex Pet](https://github.com/legeling/awesome-codex-pet). Le fork est prioritaire : un identifiant identique ou une spritesheet strictement identique n’apparaît qu’une fois, tandis que des assets d’empreintes différentes restent disponibles comme vraies variantes. Les nouveaux Pets présents uniquement dans l’original restent donc visibles sans dupliquer les entrées miroirs. Codex Avatars n’affiche que les entrées V2 natives (`1536x2288`, 8 colonnes × 11 lignes), avec recherche et filtres par catégorie. Chaque source possède son propre cache validé ; l’indisponibilité de l’une ne bloque ni l’autre catalogue, ni les Pets locaux, ni l’overlay.

Le bouton **Installer** télécharge uniquement `pet.json` et `spritesheet.webp` depuis le dépôt source autorisé du Pet. L’application vérifie les tailles et SHA-256 déclarés, le manifeste V2 et les dimensions de l’atlas, installe les deux fichiers de façon atomique et refuse d’écraser un autre Pet local portant le même identifiant. Elle n’exécute jamais les scripts shell des catalogues.

Pour contribuer, sélectionne un Pet V2 local terminé dans **Soumettre l’un de vos Pets**, puis **Soumettre avec GitHub**. Un compte GitHub est obligatoire car le catalogue reçoit les contributions sous forme de pull requests publiques ; Codex ne s’ouvre pas et aucun crédit Codex n’est utilisé. Le formulaire intégré affiche l’atlas final, valide les dimensions V2 et la limite amont de 5 Mo, contrôle les identifiants, clés canoniques, noms et empreintes exactes, puis recueille auteur, catégorie, type de source, conditions non commerciales et confirmations explicites de revue visuelle. Pour un Pet original ou généré indépendamment, les notes de source sont créées automatiquement ; le champ de réutilisation/attribution n’apparaît que si le type de source exige des précisions.

La première connexion utilise le parcours navigateur de l’outil officiel GitHub CLI. Codex Avatars réutilise d’abord une session GitHub CLI fonctionnelle lorsqu’elle existe déjà. Sinon, l’application télécharge une version Windows épinglée depuis la release officielle `cli/cli`, vérifie les SHA-256 de l’archive et de l’exécutable, attend le code temporaire, le copie puis ouvre GitHub afin que l’utilisateur se connecte ou crée un compte. **Ouvrir GitHub** reste disponible pendant l’autorisation et l’annulation ne bloque jamais la fenêtre de soumission. GitHub CLI gère les identifiants ; Codex Avatars retire les jetons d’environnement ambiants et ne lit jamais de jeton. Le login GitHub connecté devient l’auteur proposé par défaut et est mémorisé localement. La clé canonique apparaît immédiatement depuis la catégorie et l’identifiant du Pet, inclut l’auteur pour les personnages originaux et reste modifiable. Après une confirmation native séparée, l’application crée directement une branche quand le compte connecté contrôle `Kajdrak2/awesome-codex-pet` ; les autres contributeurs utilisent un fork existant ou nouvellement créé dans le même réseau. Elle enregistre exactement `submission.json`, `pet.json` et `spritesheet.webp` avec le format JSON Prettier exigé par le catalogue. Si le même Pet possède déjà une soumission ouverte, Codex Avatars met à jour la pull request correspondante la plus récente au lieu d’en créer une autre ; sinon, l’application ouvre une pull request prête pour revue vers le catalogue contrôlé. Une soumission ciblée n’est publiée automatiquement qu’après la réussite du workflow protégé pour son commit exact. Un Pet déjà publié peut être signalé depuis sa carte : l’application prépare une issue GitHub publique et l’utilisateur garde la main sur son envoi final. Les deux catalogues et chaque Pet conservent leurs auteurs et conditions de licence.

## Créer un avatar depuis Work ou Codex

Dans les réglages, ouvre le studio de personnage, décris l’apparence, le style, la personnalité, les couleurs, les accessoires et ce qu’il faut éviter, puis choisis **Créer dans Codex**. L’application ouvre `codex://threads/new` avec le prompt prêt. Ce préremplissage étant un détail de l’application de bureau qui n’est pas encore documenté comme contrat public, le même prompt n’est copié qu’en solution de secours si l’ouverture échoue.

La tâche générée invoque explicitement `$hatch-pet`, résout le Python fourni par le runtime Codex avant tout script, vérifie Pillow, produit un atlas v2 validé de `1536x2288`, puis installe `pet.json` et `spritesheet.webp` ensemble sous `~/.codex/pets/<pet-id>`. Le renderer actualise cette bibliothèque toutes les cinq secondes et active les nouveaux Pets lorsque l’option correspondante est cochée.

Le même avatar reste compatible avec le sélecteur **Réglages > Pets** de l’application de bureau ChatGPT.

## Vie privée

Le hook ne copie que : nom de l’événement, identifiants de session/tour/agent, type d’agent, éventuels nom/modèle/effort et nom final du dossier de projet. Le chemin complet du dossier de travail ne traverse jamais le bridge. Il exclut les prompts, arguments d’outils, sorties de commandes, transcriptions, messages, contenus de fichiers et secrets.

Comme les hooks ne publient pas encore les titres de tâche, le nom de tâche de collaboration, le modèle ou l’effort, le compagnon lit le titre principal dans l’index local `session_index.jsonl` et surveille cet index pour détecter les renommages, puis corrèle `agent_id` avec le rollout correspondant et n’en extrait que `agent_path`, `model` et `effort`. Aucun contenu de conversation n’est recopié dans son état ou ses réglages.

Les événements passent par le canal local `codex-avatars-v1`. Aucun serveur TCP ni service distant n’est utilisé.

La consultation du marketplace, l’installation de Pets, la vérification des mises à jour, la soumission GitHub directe et l’ouverture d’un signalement public de Pet sont les fonctions réseau sortantes facultatives. Le processus principal récupère les deux manifestes publics, les aperçus depuis `codexpet.top` et les fichiers du Pet choisi uniquement depuis des chemins fixes de `Kajdrak2/awesome-codex-pet` ou `legeling/awesome-codex-pet`. La soumission utilise un téléchargement GitHub CLI officiel fixe et des endpoints API ciblant le fork contrôlé après autorisation navigateur et confirmation explicite. Un signalement ouvre une URL d’issue GitHub fixe qui contient uniquement le motif choisi, l’explication bornée écrite par l’utilisateur, la version de l’application et les métadonnées publiques vérifiées du catalogue ; l’utilisateur l’envoie ensuite sur GitHub. Le renderer sandboxé conserve `connect-src 'none'` et ne reçoit que des métadonnées bornées, des URL d’images locales, l’état de connexion et la progression.

## Commandes de développement

```powershell
npm ci
npm test
npm start
npm run start:background
npm run preview
npm run preview:settings
npm run demo
npm run dist
```

`npm run dist` construit l’installeur autonome recommandé. La release GitHub joint également une archive source/plugin pour le développement depuis Git.

## Limites actuelles

- Les hooks Codex donnent un `agent_id` à `SubagentStart` et `SubagentStop`, mais les hooks d’outils n’identifient pas individuellement leur sous-agent. L’outil n’invente donc pas l’auteur d’une commande.
- Le marketplace intégré est un catalogue communautaire tiers, pas un service officiel OpenAI. La consultation peut utiliser un cache récent hors ligne, mais l’installation d’un nouveau Pet nécessite une connexion.
- Publier un Pet exige un compte GitHub, un contrôle de doublons en direct, une autorisation navigateur et une confirmation native finale ; aucun crédit Codex n’est nécessaire.
- De nombreux Pets communautaires ont des conditions non commerciales ou représentent des personnages tiers. L’utilisateur reste responsable de vérifier la licence et la source affichées en amont.
- Un plugin seul ne peut pas dessiner au-dessus de tout Windows ; le renderer local est une contrainte du système, pas une intégration simulée.
- La version publique devra être signée avant une diffusion large afin d’éviter l’avertissement SmartScreen.

Consulte [docs/architecture.md](docs/architecture.md), [CONTRIBUTING.md](CONTRIBUTING.md) et [SECURITY.md](SECURITY.md).

## Licence

MIT
