# Codex Avatars

Codex Avatars donne un compagnon animé indépendant à la tâche principale et à chaque sous-agent Codex. Les personnages utilisent le format natif des Pets Codex v2 et se déplacent directement sur un ou plusieurs écrans, sans dock, panneau coloré ni fond visible.

> État du projet : la version `0.4.0` fournit un installeur Windows autonome, un paquet plugin prêt pour Git et le partage portable des Pets. Aucun dépôt distant ni binaire signé n’est encore publié depuis ce checkout.

## Ce qui est déjà pris en charge

- Overlay réellement invisible : seuls les avatars et leurs étiquettes sont dessinés.
- Un personnage distinct par `agent_id`, y compris l’agent principal.
- Animations Pets Codex v2 pour le déplacement, le travail, l’attente et la fin de tâche.
- Choix des avatars actifs depuis la bibliothèque locale `~/.codex/pets`.
- Détection automatique d’un nouvel avatar créé dans Work ou Codex.
- Zone de déplacement sur tous les écrans, une sélection d’écrans ou un rectangle personnalisé.
- Sélection visuelle de la zone personnalisée directement sur le bureau, comme une capture d’écran.
- Titre de chaque tâche Codex principale et nom réel de chaque sous-tâche de collaboration, avec modèle et effort affichables séparément.
- Tailles réglables indépendamment pour les agents principaux et les sous-agents.
- Formulaire de création personnalisé ouvrant une tâche Codex avec le prompt déjà préparé.
- Import et partage de packages `.codexpet` validés depuis la galerie locale.
- Mode passif avec trois portes de sortie permanentes : réglages, icône de notification Windows et `Ctrl+Alt+A`.
- Démarrage automatique au premier événement de session Codex ; démarrage avec Windows disponible en secours.
- Transport local et limité à des métadonnées autorisées.

## Pourquoi il reste un petit renderer local

Le plugin assure l’intégration à ChatGPT/Codex : hooks, installation, commandes et création d’avatars. Une interface de plugin s’exécute toutefois dans une iframe à l’intérieur de ChatGPT ; elle ne peut pas créer une fenêtre système toujours au-dessus des autres applications.

Le dessin sur le bureau est donc assuré par un petit processus Electron local. L’installeur l’embarque de façon autonome ; l’utilisateur final n’a besoin ni de Node.js, ni de Git, ni d’un terminal après téléchargement.

## Installation simple — recommandée

1. Télécharge `Codex Avatars-Setup-0.4.0.exe` depuis la release GitHub.
2. Ouvre l’installeur et termine l’assistant.
3. Dans la page Codex qui s’ouvre, installe **Codex Avatars** et vérifie ses hooks.

L’installeur place le compagnon dans le profil Windows, active immédiatement les hooks locaux, embarque le marketplace et le plugin, enregistre le chemin exact du renderer et ouvre les réglages. La confirmation finale dans Codex reste volontaire : un installeur ne doit pas accepter des hooks de sécurité à la place de l’utilisateur.

La build locale actuelle n’est pas signée. Windows peut donc afficher SmartScreen tant qu’un certificat Authenticode n’est pas configuré pour la publication.

## Installation depuis Git — développement

Prérequis : Windows 10/11, Node.js 22 ou plus récent et une version actuelle de l’application de bureau ChatGPT avec Codex.

```powershell
git clone <adresse-du-depot> codex-avatars
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
- **Mode interactif** : les zones des avatars deviennent saisissables et les personnages peuvent être déplacés.
- **Avatars actifs** : chaque Pet peut être activé ou désactivé ; les agents sont distribués de façon déterministe entre les choix actifs.
- **Zone** : sélectionne tous les écrans, coche plusieurs moniteurs ou trace directement un rectangle sur le bureau.
- **Tailles principale/sous-agent, noms, modèle/effort et mouvement** : les options s’appliquent immédiatement et sont conservées localement.
- **Démo** : le même bouton la lance et l’arrête, puis supprime tous les agents synthétiques.

## Créer un avatar depuis Work ou Codex

Dans les réglages, ouvre le studio de personnage, décris l’apparence, le style, la personnalité, les couleurs, les accessoires et ce qu’il faut éviter, puis choisis **Créer dans Codex**. L’application ouvre `codex://threads/new` avec le prompt prêt. Ce préremplissage étant un détail de l’application de bureau qui n’est pas encore documenté comme contrat public, le même prompt n’est copié qu’en solution de secours si l’ouverture échoue.

La skill délègue au workflow officiel `hatch-pet`, produit un atlas v2 validé de `1536x2288`, puis installe `pet.json` et `spritesheet.webp` ensemble sous `~/.codex/pets/<pet-id>`. Le renderer actualise cette bibliothèque toutes les cinq secondes et active les nouveaux Pets lorsque l’option correspondante est cochée.

Le même avatar reste compatible avec le sélecteur **Réglages > Pets** de l’application de bureau ChatGPT.

## Vie privée

Le hook ne copie que : nom de l’événement, identifiants de session/tour/agent, type d’agent, éventuels nom/modèle/effort et nom final du dossier de projet. Le chemin complet du dossier de travail ne traverse jamais le bridge. Il exclut les prompts, arguments d’outils, sorties de commandes, transcriptions, messages, contenus de fichiers et secrets.

Comme les hooks ne publient pas encore les titres de tâche, le nom de tâche de collaboration, le modèle ou l’effort, le compagnon lit le titre principal dans l’index local `session_index.jsonl`, puis corrèle `agent_id` avec le rollout correspondant et n’en extrait que `agent_path`, `model` et `effort`. Aucun contenu de conversation n’est recopié dans son état ou ses réglages.

Les événements passent par le canal local `codex-avatars-v1`. Aucun serveur TCP ni service distant n’est utilisé.

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
- Il n’existe pas de marketplace publique officielle des Pets. La galerie intégrée fournit une couche sûre d’import/export, adaptée au partage par GitHub ou un autre catalogue ; voir [docs/pet-gallery.md](docs/pet-gallery.md).
- Un plugin seul ne peut pas dessiner au-dessus de tout Windows ; le renderer local est une contrainte du système, pas une intégration simulée.
- La version publique devra être signée avant une diffusion large afin d’éviter l’avertissement SmartScreen.

Consulte [docs/architecture.md](docs/architecture.md), [CONTRIBUTING.md](CONTRIBUTING.md) et [SECURITY.md](SECURITY.md).

## Licence

MIT
