# Codex Avatars

Codex Avatars transforme l’activité multi-agent de Codex en une petite équipe animée sur le bureau Windows. Chaque sous-agent possède son propre personnage et évolue indépendamment.

> Aperçu initial : le prototype local fonctionne, mais la première version publique n’est pas encore signée ni publiée.

## Ce que l’outil affiche

- Un avatar pour la session Codex principale.
- Un avatar indépendant pour chaque `agent_id` annoncé par `SubagentStart`.
- Des animations de travail, d’attente, d’intervention, de réussite et de sortie.
- Des groupes séparés lorsque plusieurs projets Codex sont actifs.
- Un mode passif traversable par les clics, activable avec `Ctrl+Alt+A`.

Codex fournit un identifiant stable dans les hooks de cycle de vie des sous-agents. En revanche, la documentation des hooks d’outils ne fournit pas d’`agent_id` individuel. Codex Avatars représente donc fidèlement le cycle de vie de chaque agent sans inventer l’auteur d’une commande ou d’une modification.

## Vie privée

Tout reste sur l’ordinateur. Le hook transmet uniquement quelques métadonnées autorisées via un canal nommé Windows local. Les prompts, arguments d’outils, sorties de commandes, transcriptions, fichiers source et messages de l’assistant sont volontairement exclus.

## Installer sous Windows

Pour une version publiée, aucun outil de développement n’est nécessaire :

1. Télécharge `Codex Avatars-Setup-<version>.exe` depuis les Releases GitHub.
2. Lance l’installeur puis Codex Avatars.
3. Ouvre **Réglages** et sélectionne **Activer** sous Intégration Codex.
4. Vérifie et autorise le hook dans Codex lorsque cela est demandé, puis ouvre une nouvelle tâche.

C’est tout le parcours nécessaire pour un utilisateur. L’aperçu local actuel n’est pas signé ; une version publique devra être signée afin d’éviter les avertissements Windows inutiles.

## Lancer depuis les sources

Prérequis :

- Windows 10 ou 11 ;
- Node.js 22 ou plus récent ;
- une version actuelle de Codex avec les hooks de cycle de vie actifs.

```powershell
git clone <adresse-du-depot> codex-avatars
cd codex-avatars
npm install
npm start
```

Dans l’overlay, ouvre **Réglages**, puis sélectionne **Activer** sous Intégration Codex. Les entrées existantes de `~/.codex/hooks.json` sont conservées et une sauvegarde horodatée est créée avant chaque modification.

Le programme de désinstallation Windows retire uniquement les hooks de Codex Avatars avant d’effacer l’application. Tous les autres hooks personnels restent intacts.

Codex peut demander de vérifier et d’autoriser la nouvelle définition des hooks. Il s’agit d’une protection normale. Redémarre Codex ou ouvre une nouvelle tâche après l’activation.

## Commandes utiles

```powershell
npm test
npm run demo
npm run hooks:status
npm run hooks:install
npm run hooks:uninstall
npm run dist
```

`npm run demo` envoie des événements fictifs à un overlay déjà lancé. Les commandes de gestion des hooks sont des alternatives facultatives aux boutons de l’application.

## Architecture

```text
Hooks de cycle de vie Codex
            |
            | métadonnées autorisées uniquement
            v
Canal Windows local : codex-avatars-v1
            |
            v
Overlay Electron + registre d’agents en mémoire
```

La première version utilise les événements officiellement documentés `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PermissionRequest`, `SubagentStart` et `SubagentStop`. Un adaptateur App Server plus riche pourra être ajouté ensuite sans modifier le protocole de l’interface.

## Construire l’installeur Windows

```powershell
npm ci
npm test
npm run dist
```

L’installeur NSIS non signé est créé dans `dist/`. Les versions publiques devront être signées avant une diffusion large.

## Contribution et sécurité

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) et [SECURITY.md](SECURITY.md).

Les mainteneurs peuvent suivre [docs/releasing.md](docs/releasing.md) pour publier une version GitHub.

## Licence

MIT
