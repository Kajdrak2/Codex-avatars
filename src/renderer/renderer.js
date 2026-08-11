'use strict';

const api = window.codexAvatars;

const translations = {
  en: {
    headerSubtitle: 'Independent companions for every Codex agent', language: 'Language', tour: 'Setup guide', feedback: 'Bug report / Suggestion', feedbackOpenError: 'GitHub could not be opened.',
    active: (count, dormant = 0) => count
      ? `${count} active agent${count > 1 ? 's' : ''}${dormant ? ` · ${dormant} sleeping` : ''}`
      : (dormant ? `${dormant} sleeping agent${dormant > 1 ? 's' : ''}` : 'Waiting for Codex'),
    paused: 'Avatars disabled', enableAvatars: 'Enable avatars', disableAvatars: 'Disable avatars',
    controlEyebrow: 'Always available', controlTitle: 'Overlay', passiveTitle: 'Passive mode',
    passiveCopy: 'Clicks pass through avatars. Turn it off here, from the tray icon, or with Ctrl + Alt + A.',
    startupTitle: 'Start with Windows', startupCopy: 'Keeps the invisible companion ready. Codex hooks can also start it on the first event.', startupError: 'Windows could not apply this startup setting.',
    avatarsEyebrow: 'Local library', avatarsTitle: 'Active avatars',
    avatarsCopy: 'Native Codex Pet v2 packages, independently assigned to main agents and subagents.',
    refresh: 'Refresh', emptyTitle: 'No compatible Pet detected', emptyCopy: 'Create or import a Pet, then refresh this library.',
    mainAvatarSize: 'Main agent size', subagentAvatarSize: 'Subagent size', labels: 'Show names', agentDetails: 'Show model + effort', dormantAgents: 'Show dormant agents', autoEnable: 'Automatically enable new Pets',
    dormantAgentsHelp: 'Keep recently idle or completed agents visible in a sleeping state for up to 30 minutes.',
    autoEnableHelp: 'A newly created or imported Pet joins the active rotation. Existing choices are never changed.',
    avatarAssignment: 'Avatar assignment', avatarAssignmentMaster: 'Match each main agent', avatarAssignmentRandom: 'Randomly distribute all Pets',
    reduceMotion: 'Reduce movement', codexPet: 'Local Pet', bundled: 'Bundled', enabled: 'Enabled', disabled: 'Disabled', share: 'Share',
    creatorEyebrow: 'Character studio', creatorTitle: 'Create a custom avatar',
    creatorCopy: 'Describe the character here. Codex opens a new task with a complete hatch-pet brief already filled in.',
    briefName: 'Name (optional)', briefStyle: 'Visual style', briefAppearance: 'What should the avatar look like?',
    briefAppearanceHelp: 'Include species or shape, clothes, face, silhouette, and any unmistakable details.',
    briefPersonality: 'Personality', briefPalette: 'Color palette', briefProps: 'Props or accessories', briefAvoid: 'Things to avoid',
    appearancePlaceholder: 'Example: a tiny round night librarian, deep-blue fur, oversized copper glasses, star-shaped satchel…',
    personalityPlaceholder: 'Curious, calm, slightly mischievous…', palettePlaceholder: 'Midnight blue, copper, warm cream…',
    propsPlaceholder: 'Satchel, floating book, tiny lantern…', avoidPlaceholder: 'No text, no weapons, not too realistic…',
    createInCodex: 'Create in Codex', copyPrompt: 'Copy prompt', createNote: 'The final Pet remains local on this computer.',
    styles: ['Automatic — recommended', 'Polished pixel art', 'Soft plush mascot', 'Handmade clay figure', 'Clean sticker illustration', 'Stylized 3D toy', 'Painterly storybook'],
    galleryEyebrow: 'Community library', galleryTitle: 'V2 Pet Marketplace',
    galleryCopy: 'Browse the Codex Avatars catalog together with Awesome Codex Pet. Mirrored Pets appear once; genuine variants remain available.',
    marketplaceSearchLabel: 'Search marketplace Pets', marketplaceSearchPlaceholder: 'Search by name, author, category…',
    marketplaceCategoryLabel: 'Filter marketplace category', marketplaceAllCategories: 'All categories', refreshMarketplace: 'Refresh catalog',
    marketplaceCategoryName: (category) => category,
    marketplaceLoading: 'Loading the community catalog…', marketplaceUnavailable: 'The marketplace is temporarily unavailable. Your local Pets still work normally.',
    marketplaceCount: (shown, total) => `${shown} of ${total} V2 Pets`, marketplaceCached: 'cached copy', marketplaceStale: 'offline copy', marketplacePartial: 'one source offline',
    marketplaceEmptyTitle: 'No matching V2 Pet', marketplaceEmptyCopy: 'Try another search or category.',
    marketplaceCredit: 'Merged from Codex Avatars and Awesome Codex Pet, with the Codex Avatars fork taking priority.', openMarketplace: 'Open catalog repository',
    marketplaceNonCommercial: 'Non-commercial',
    installMarketplacePet: 'Install', installingMarketplacePet: 'Installing…', installedMarketplacePet: 'Installed', marketplaceDetails: 'Details', reportMarketplacePet: 'Report',
    marketplaceBy: (author) => author ? `by ${author}` : 'Community Pet', marketplaceInstalled: (name) => `${name} is installed and ready in your local library.`,
    marketplaceAlreadyInstalled: (name) => `${name} is already installed.`, marketplaceInstallError: 'This Pet could not be installed safely.',
    reportDialogEyebrow: 'Community moderation', reportDialogTitle: 'Report this Pet',
    reportDialogCopy: 'Flag a copyright, safety, duplication, identity, quality, or technical concern for the catalog maintainer.',
    reportReasonLabel: 'Reason', reportDetailsLabel: 'What should be reviewed?',
    reportDetailsPlaceholder: 'Describe the concern clearly and include public evidence when available.',
    reportPublicNote: 'Continue opens a public GitHub issue already filled with this Pet’s verified catalog information. Remove any personal or secret information before submitting it.',
    reportCancel: 'Cancel', reportContinue: 'Continue on GitHub', reportOpened: 'The Pet report is ready on GitHub.', reportOpenError: 'The Pet report could not be opened.',
    reportReasonName: (value) => ({
      copyright: 'Copyright or attribution concern', inappropriate: 'Inappropriate or unsafe content', duplicate: 'Duplicate or misleading listing',
      broken: 'Broken or invalid Pet', impersonation: 'Impersonation or deceptive identity', other: 'Other concern',
    })[value] || value,
    localPackagesTitle: 'Local packages and portable sharing', localPackagesCopy: 'Import a V2 .codexpet file or open the folder used by Codex and the overlay.',
    importPet: 'Import a Pet package', openFolder: 'Open library folder',
    galleryHelp: 'Use Share on any Pet card to export a .codexpet file. Imports are validated and never overwrite an existing Pet.',
    submissionTitle: 'Submit one of your Pets', submissionCopy: 'Validate and publish a finished local V2 Pet directly from Codex Avatars—without opening Codex. Green submissions publish automatically.',
    submissionPetLabel: 'Local Pet to submit', submissionChoosePet: 'Choose a local V2 Pet', submitMarketplacePet: 'Submit with GitHub', openSubmissionGuide: 'Submission guide',
    submissionNote: 'A GitHub account is required to publish a Pet. No Codex credits are used, and no maintainer approval is required after green CI.',
    submissionMissing: 'Choose a local V2 Pet first.', submissionError: 'The Pet could not be submitted.', submissionSuccess: (url) => `Submission ready for automatic CI publication${url ? `: ${url}` : '.'}`,
    submissionDialogEyebrow: 'Direct contribution', submissionDialogTitle: 'Review and submit your Pet',
    submissionDialogCopy: 'Codex Avatars validates the local package, checks catalog duplicates, and prepares exactly three public files. After your GitHub confirmation, a green pull request is published automatically.',
    submissionPreviewContract: 'Native V2 · 1536 × 2288', submissionPreviewHelp: 'Review the complete atlas here before confirming every visual-quality item.',
    submissionGithubTitle: 'GitHub connection', githubChecking: 'Checking GitHub…', githubDisconnected: 'Not connected', githubConnected: (login) => `Connected as @${login}`,
    connectGithub: 'Connect GitHub', openGithub: 'Open GitHub', githubPreparing: 'Preparing a one-time code…', githubWaitingApproval: 'Waiting for approval on GitHub…', githubConnecting: 'Connecting…', githubConnectionCancelled: 'GitHub connection cancelled.', githubRequired: 'GitHub is required because the community catalog accepts Pets through public pull requests. On first use, the app opens GitHub in your browser so you can sign in or create an account. The official GitHub CLI stores the authorization; Codex Avatars never reads your token.',
    githubDeviceCodeLabel: 'Enter this code on GitHub', githubDeviceCodeHelp: 'The code is already copied to your clipboard and expires shortly.', copyGithubCode: 'Copy code', githubCodeCopied: 'GitHub code copied.',
    submissionName: 'Pet name', submissionSlug: 'Catalog Pet id', submissionAuthor: 'Author or handle', submissionCategory: 'Primary category',
    submissionSourceType: 'How the final asset was made', submissionCanonical: 'Canonical character or concept key',
    submissionCanonicalHelp: 'Generated immediately from the category and Pet id. Original characters also include the author handle. You can still edit it.', submissionDescription: 'Short description',
    submissionSourceNotes: 'Reuse / attribution details', submissionSourceNotesHelp: 'Required only when an existing, commissioned, private, fan, project, or otherwise attributable asset was used. Explain what was reused or adapted and who should be credited.',
    submissionSourceUrl: 'Public source URL (optional)', submissionTags: 'Tags (optional, comma-separated)', submissionVariant: 'Variant or uniqueness note (optional)',
    submissionVariantHelp: 'Required when the same canonical key already exists.', submissionLicense: 'License or non-commercial usage statement',
    submissionConfirmations: 'Required review and publication confirmations',
    confirmRights: 'I accurately described how the final asset was made and have the right to submit these files under the stated terms.',
    confirmFrames: 'I reviewed every frame for consistent identity, scale, baseline, and props.',
    confirmDirections: 'I reviewed both running directions, alternating gait, action meanings, and all 16 V2 look directions.',
    confirmEdges: 'I checked transparent edges on checkerboard, dark, and light backgrounds for colored residue.',
    confirmNonCommercial: 'I understand that this catalog is non-commercial unless a stricter stated license applies.',
    confirmPublic: 'I understand that submission creates or updates a public branch and pull request that may merge automatically after protected CI passes.',
    cancelSubmission: 'Cancel', confirmSubmission: 'Review & submit', submittingPet: 'Submitting…',
    sourceNotesPlaceholder: 'Explain what was reused or adapted, its origin, and who should be credited.',
    sourceUrlPlaceholder: 'https://…', tagsPlaceholder: 'ghost, rainbow, clay', variantPlaceholder: 'Explain the independent visual, animation, author, or runtime distinction.',
    sourceTypeName: (value) => ({
      original: 'Original artwork', 'ai-generated': 'Independently AI-generated', commissioned: 'Commissioned', 'fan-art': 'Fan art',
      'adapted-existing-asset': 'Adapted existing asset', 'private-source': 'Private source', 'github-or-project-source': 'GitHub or project source',
      'existing-pet-package': 'Existing Pet package', mascot: 'Mascot', meme: 'Meme', avatar: 'Avatar', object: 'Object', other: 'Other',
    })[value] || value,
    submissionStage: (stage) => ({
      'downloading-github-cli': 'Downloading and verifying the official GitHub CLI…',
      'waiting-for-github-authorization': 'Opening GitHub in your browser… Sign in or create an account, then approve access.',
      'github-device-code-copied': 'Your one-time code is ready above. Enter it on GitHub to continue.',
      'github-browser-open-failed': 'The code was copied. Use Open GitHub, then paste it on the device page.',
      'github-connected': 'GitHub connected.', 'validating-local-pet': 'Validating the local Pet v2 package…',
      'checking-marketplace-duplicates': 'Checking ids, names, canonical keys, and exact asset hashes…',
      'reading-marketplace-branch': 'Reading the current marketplace branch…', 'creating-github-fork': 'Preparing your GitHub fork…',
      'uploading-pet-files': 'Uploading the three Pet files…', 'checking-open-submissions': 'Checking for an existing submission…',
      'updating-pull-request': 'Updating the existing pull request…', 'opening-pull-request': 'Opening the public pull request…',
      'submission-complete': 'Pull request ready for automatic CI publication.', 'submission-cancelled': 'Submission cancelled. Nothing was published.',
    })[stage] || '',
    zoneEyebrow: 'Multi-monitor', zoneTitle: 'Roaming area', zoneCopy: 'Choose all screens, specific screens, or draw an exact area directly on the desktop.',
    allScreens: 'All screens', selectedScreens: 'Selected screens', customArea: 'Draw custom area', screen: 'Screen', primary: 'primary',
    customUnset: 'No custom area selected', customSummary: (r) => `${r.width} × ${r.height} at ${r.x}, ${r.y}`,
    customHelp: 'A full-screen selector will let you drag the desired rectangle.', pickZone: 'Select on screen',
    integrationEyebrow: 'Integration', integrationTitle: 'Codex plugin + lifecycle hooks',
    integrationCopy: 'The overlay works locally. Enabling the plugin adds the creation skill and lets Codex activity animate each companion.',
    stepPlugin: 'Install or enable the Codex Avatars plugin.', stepTrust: 'Review and trust its lifecycle hooks; they send only event ids and non-sensitive metadata.',
    stepCreate: 'Create a Pet with the form above, then it appears in the local library automatically.',
    openPlugin: 'Open plugin in Codex', enableHooks: 'Enable standalone hooks', disableHooks: 'Disable standalone hooks', docs: 'Pets documentation',
    runDemo: 'Run demo', stopDemo: 'Stop demo', pluginOpened: 'Codex is open. Enable the plugin, then review its hooks.',
    pluginUnavailable: 'The plugin bundle is missing from this installation.', hooksOn: 'Standalone hooks enabled.', hooksOff: 'Standalone hooks disabled.',
    promptOpened: 'A new Codex task opened with your avatar brief ready.', promptFallback: 'Codex could not be opened. The prompt was copied as a fallback.',
    promptCopied: 'Avatar prompt copied.', appearanceRequired: 'Describe what the avatar should look like first.',
    imported: (name) => `${name} was imported and added to your local gallery.`, exported: 'Portable Pet package created.',
    importError: 'This Pet package could not be imported.', exportError: 'This Pet could not be shared.', saveError: 'Could not save this setting.', zoneCancelled: 'Area selection cancelled.',
    onboardingWelcomeTitle: 'Welcome to Codex Avatars', onboardingWelcomeCopy: 'Each Codex agent gets an independent animated companion on your desktop.',
    onboardingWelcomeFeature: 'The overlay itself is invisible and click-through by default. The tray icon and Ctrl + Alt + A always give you control.',
    onboardingPluginTitle: 'Enable the plugin', onboardingPluginCopy: 'The companion can run alone, but the plugin makes the experience complete.',
    onboardingPluginFeature: 'Its creation skill invokes hatch-pet, validates the full Pet v2 atlas, and installs it locally. Its hooks connect agent lifecycle events to avatar states.',
    onboardingAvatarTitle: 'Create or import a Pet', onboardingAvatarCopy: 'Describe appearance, style, personality, colors, and props in the character studio.',
    onboardingAvatarFeature: 'Create in Codex opens a new task with the prompt ready. Portable .codexpet files make sharing simple.',
    onboardingZoneTitle: 'Choose where they roam', onboardingZoneCopy: 'Use every display, selected displays, or draw a rectangle like a screenshot selection.',
    onboardingZoneFeature: 'You can change this later. Passive mode remains reversible from settings, the tray, and the keyboard shortcut.',
    back: 'Back', next: 'Next', finish: 'Finish setup', stepLabel: (step) => `Step ${step} of 4`,
  },
  fr: {
    headerSubtitle: 'Des compagnons indépendants pour chaque agent Codex', language: 'Langue', tour: 'Guide de démarrage', feedback: 'Bug / suggestion', feedbackOpenError: 'Impossible d’ouvrir GitHub.',
    active: (count, dormant = 0) => count
      ? `${count} agent${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''}${dormant ? ` · ${dormant} endormi${dormant > 1 ? 's' : ''}` : ''}`
      : (dormant ? `${dormant} agent${dormant > 1 ? 's' : ''} endormi${dormant > 1 ? 's' : ''}` : 'En attente de Codex'),
    paused: 'Avatars désactivés', enableAvatars: 'Activer les avatars', disableAvatars: 'Désactiver les avatars',
    controlEyebrow: 'Toujours accessible', controlTitle: 'Overlay', passiveTitle: 'Mode passif',
    passiveCopy: 'Les clics traversent les avatars. Désactivez-le ici, depuis l’icône de zone de notification ou avec Ctrl + Alt + A.',
    startupTitle: 'Démarrer avec Windows', startupCopy: 'Garde le compagnon invisible prêt. Les hooks Codex peuvent aussi le lancer au premier événement.', startupError: 'Windows n\u2019a pas pu appliquer ce réglage de démarrage.',
    avatarsEyebrow: 'Bibliothèque locale', avatarsTitle: 'Avatars actifs',
    avatarsCopy: 'Packages Codex Pet v2 natifs, attribués indépendamment aux agents principaux et sous-agents.',
    refresh: 'Actualiser', emptyTitle: 'Aucun Pet compatible détecté', emptyCopy: 'Créez ou importez un Pet, puis actualisez la bibliothèque.',
    mainAvatarSize: 'Taille des agents principaux', subagentAvatarSize: 'Taille des sous-agents', labels: 'Afficher les noms', agentDetails: 'Afficher modèle + effort', dormantAgents: 'Afficher les agents dormants', autoEnable: 'Activer automatiquement les nouveaux Pets',
    dormantAgentsHelp: 'Conserve les agents récemment au repos ou terminés dans un état endormi pendant 30 minutes maximum.',
    autoEnableHelp: 'Un Pet nouvellement créé ou importé rejoint la rotation active. Les choix existants ne sont jamais modifiés.',
    avatarAssignment: 'Attribution des avatars', avatarAssignmentMaster: 'Même Pet que l’agent principal', avatarAssignmentRandom: 'Répartir aléatoirement tous les Pets',
    reduceMotion: 'Réduire les mouvements', codexPet: 'Pet local', bundled: 'Inclus', enabled: 'Activé', disabled: 'Désactivé', share: 'Partager',
    creatorEyebrow: 'Studio de personnage', creatorTitle: 'Créer un avatar personnalisé',
    creatorCopy: 'Décrivez le personnage ici. Codex ouvre une nouvelle tâche avec un brief hatch-pet complet déjà rempli.',
    briefName: 'Nom (facultatif)', briefStyle: 'Style visuel', briefAppearance: 'À quoi doit ressembler l’avatar ?',
    briefAppearanceHelp: 'Précisez l’espèce ou la forme, les vêtements, le visage, la silhouette et les détails distinctifs.',
    briefPersonality: 'Personnalité', briefPalette: 'Palette de couleurs', briefProps: 'Objets ou accessoires', briefAvoid: 'Éléments à éviter',
    appearancePlaceholder: 'Exemple : un minuscule bibliothécaire nocturne tout rond, fourrure bleu profond, grandes lunettes cuivre…',
    personalityPlaceholder: 'Curieux, calme, légèrement espiègle…', palettePlaceholder: 'Bleu nuit, cuivre, crème chaude…',
    propsPlaceholder: 'Sacoche, livre flottant, petite lanterne…', avoidPlaceholder: 'Pas de texte, pas d’armes, pas trop réaliste…',
    createInCodex: 'Créer dans Codex', copyPrompt: 'Copier le prompt', createNote: 'Le Pet final reste local sur cet ordinateur.',
    styles: ['Automatique — recommandé', 'Pixel art soigné', 'Mascotte peluche douce', 'Figurine en argile', 'Illustration sticker épurée', 'Jouet 3D stylisé', 'Personnage pictural de conte'],
    galleryEyebrow: 'Bibliothèque communautaire', galleryTitle: 'Marketplace de Pets V2',
    galleryCopy: 'Parcourez ensemble le catalogue Codex Avatars et Awesome Codex Pet. Les Pets miroirs n’apparaissent qu’une fois ; les vraies variantes restent disponibles.',
    marketplaceSearchLabel: 'Rechercher des Pets sur le marketplace', marketplaceSearchPlaceholder: 'Rechercher par nom, auteur, catégorie…',
    marketplaceCategoryLabel: 'Filtrer la catégorie du marketplace', marketplaceAllCategories: 'Toutes les catégories', refreshMarketplace: 'Actualiser le catalogue',
    marketplaceCategoryName: (category) => ({
      'Game Characters': 'Personnages de jeux', 'Anime Characters': 'Personnages d’anime', 'Original Characters': 'Personnages originaux',
      Mascots: 'Mascottes', Animals: 'Animaux', 'Fantasy Creatures': 'Créatures fantastiques', Robots: 'Robots',
      'Human Avatars': 'Avatars humains', Memes: 'Mèmes', 'Objects & Props': 'Objets et accessoires', Others: 'Autres',
    })[category] || category,
    marketplaceLoading: 'Chargement du catalogue communautaire…', marketplaceUnavailable: 'Le marketplace est temporairement indisponible. Vos Pets locaux continuent de fonctionner normalement.',
    marketplaceCount: (shown, total) => `${shown} Pet${total > 1 ? 's' : ''} V2 sur ${total}`, marketplaceCached: 'copie en cache', marketplaceStale: 'copie hors ligne', marketplacePartial: 'une source hors ligne',
    marketplaceEmptyTitle: 'Aucun Pet V2 correspondant', marketplaceEmptyCopy: 'Essayez une autre recherche ou catégorie.',
    marketplaceCredit: 'Fusion de Codex Avatars et Awesome Codex Pet, avec priorité au fork Codex Avatars.', openMarketplace: 'Ouvrir le dépôt du catalogue',
    marketplaceNonCommercial: 'Usage non commercial',
    installMarketplacePet: 'Installer', installingMarketplacePet: 'Installation…', installedMarketplacePet: 'Installé', marketplaceDetails: 'Détails', reportMarketplacePet: 'Signaler',
    marketplaceBy: (author) => author ? `par ${author}` : 'Pet communautaire', marketplaceInstalled: (name) => `${name} est installé et prêt dans votre bibliothèque locale.`,
    marketplaceAlreadyInstalled: (name) => `${name} est déjà installé.`, marketplaceInstallError: 'Ce Pet n’a pas pu être installé de manière sûre.',
    reportDialogEyebrow: 'Modération communautaire', reportDialogTitle: 'Signaler ce Pet',
    reportDialogCopy: 'Signalez au mainteneur du catalogue un problème de droits, de sécurité, de doublon, d’identité, de qualité ou de fonctionnement.',
    reportReasonLabel: 'Motif', reportDetailsLabel: 'Que faut-il vérifier ?',
    reportDetailsPlaceholder: 'Décrivez clairement le problème et ajoutez des preuves publiques si possible.',
    reportPublicNote: 'Continuer ouvre une issue GitHub publique déjà remplie avec les informations vérifiées de ce Pet. Retirez toute donnée personnelle ou secrète avant de l’envoyer.',
    reportCancel: 'Annuler', reportContinue: 'Continuer sur GitHub', reportOpened: 'Le signalement est prêt sur GitHub.', reportOpenError: 'Impossible d’ouvrir le signalement.',
    reportReasonName: (value) => ({
      copyright: 'Problème de droits d’auteur ou d’attribution', inappropriate: 'Contenu inapproprié ou dangereux', duplicate: 'Entrée dupliquée ou trompeuse',
      broken: 'Pet cassé ou invalide', impersonation: 'Usurpation ou identité trompeuse', other: 'Autre problème',
    })[value] || value,
    localPackagesTitle: 'Packages locaux et partage portable', localPackagesCopy: 'Importez un fichier .codexpet V2 ou ouvrez le dossier utilisé par Codex et l’overlay.',
    importPet: 'Importer un package Pet', openFolder: 'Ouvrir le dossier',
    galleryHelp: 'Utilisez Partager sur une carte pour exporter un fichier .codexpet. Les imports sont validés et n’écrasent jamais un Pet existant.',
    submissionTitle: 'Soumettre l’un de vos Pets', submissionCopy: 'Validez et publiez un Pet V2 local terminé directement depuis Codex Avatars, sans ouvrir Codex. Les soumissions vertes sont publiées automatiquement.',
    submissionPetLabel: 'Pet local à soumettre', submissionChoosePet: 'Choisir un Pet V2 local', submitMarketplacePet: 'Soumettre avec GitHub', openSubmissionGuide: 'Guide de soumission',
    submissionNote: 'Un compte GitHub est requis pour publier un Pet. Aucun crédit Codex ni validation manuelle du mainteneur ne sont nécessaires après une CI verte.',
    submissionMissing: 'Choisissez d’abord un Pet V2 local.', submissionError: 'Le Pet n’a pas pu être soumis.', submissionSuccess: (url) => `Soumission prête pour la publication automatique par la CI${url ? ` : ${url}` : '.'}`,
    submissionDialogEyebrow: 'Contribution directe', submissionDialogTitle: 'Vérifier et soumettre votre Pet',
    submissionDialogCopy: 'Codex Avatars valide le package local, contrôle les doublons du catalogue et prépare exactement trois fichiers publics. Après votre confirmation GitHub, une pull request verte est publiée automatiquement.',
    submissionPreviewContract: 'V2 natif · 1536 × 2288', submissionPreviewHelp: 'Examinez ici l’atlas complet avant de confirmer chaque point de qualité visuelle.',
    submissionGithubTitle: 'Connexion GitHub', githubChecking: 'Vérification de GitHub…', githubDisconnected: 'Non connecté', githubConnected: (login) => `Connecté en tant que @${login}`,
    connectGithub: 'Connecter GitHub', openGithub: 'Ouvrir GitHub', githubPreparing: 'Préparation du code à usage unique…', githubWaitingApproval: 'En attente de validation sur GitHub…', githubConnecting: 'Connexion…', githubConnectionCancelled: 'Connexion GitHub annulée.', githubRequired: 'GitHub est requis car le catalogue communautaire reçoit les Pets via des pull requests publiques. Lors de la première utilisation, l’application ouvre GitHub dans votre navigateur pour vous connecter ou créer un compte. GitHub CLI conserve l’autorisation ; Codex Avatars ne lit jamais votre jeton.',
    githubDeviceCodeLabel: 'Saisissez ce code sur GitHub', githubDeviceCodeHelp: 'Le code est déjà copié dans le presse-papiers et expire rapidement.', copyGithubCode: 'Copier le code', githubCodeCopied: 'Code GitHub copié.',
    submissionName: 'Nom du Pet', submissionSlug: 'Identifiant du Pet dans le catalogue', submissionAuthor: 'Auteur ou pseudo', submissionCategory: 'Catégorie principale',
    submissionSourceType: 'Comment l’asset final a été créé', submissionCanonical: 'Clé canonique du personnage ou concept',
    submissionCanonicalHelp: 'Générée immédiatement depuis la catégorie et l’identifiant du Pet. Les personnages originaux incluent aussi le pseudo d’auteur. Vous pouvez toujours la modifier.', submissionDescription: 'Description courte',
    submissionSourceNotes: 'Détails de réutilisation / attribution', submissionSourceNotesHelp: 'Obligatoire uniquement si un asset existant, commandé, privé, de fan, de projet ou nécessitant une attribution a été utilisé. Précisez ce qui a été réutilisé ou adapté et qui doit être crédité.',
    submissionSourceUrl: 'URL source publique (facultatif)', submissionTags: 'Tags (facultatifs, séparés par des virgules)', submissionVariant: 'Note de variante ou d’unicité (facultatif)',
    submissionVariantHelp: 'Obligatoire si la même clé canonique existe déjà.', submissionLicense: 'Licence ou conditions d’usage non commercial',
    submissionConfirmations: 'Vérifications et confirmations de publication obligatoires',
    confirmRights: 'J’ai décrit correctement la création de l’asset final et j’ai le droit de soumettre ces fichiers selon les conditions indiquées.',
    confirmFrames: 'J’ai vérifié chaque frame : identité, échelle, ligne de base et accessoires restent cohérents.',
    confirmDirections: 'J’ai vérifié les deux courses, l’alternance des pas, le sens des actions et les 16 directions de regard V2.',
    confirmEdges: 'J’ai contrôlé les contours transparents sur damier, fond sombre et fond clair pour repérer tout résidu coloré.',
    confirmNonCommercial: 'Je comprends que ce catalogue est non commercial sauf si une licence plus stricte s’applique.',
    confirmPublic: 'Je comprends que la soumission crée ou met à jour une branche et une pull request publiques qui peuvent être fusionnées automatiquement après une CI protégée réussie.',
    cancelSubmission: 'Annuler', confirmSubmission: 'Vérifier et soumettre', submittingPet: 'Soumission…',
    sourceNotesPlaceholder: 'Précisez ce qui a été réutilisé ou adapté, son origine et qui doit être crédité.',
    sourceUrlPlaceholder: 'https://…', tagsPlaceholder: 'fantôme, arc-en-ciel, argile', variantPlaceholder: 'Expliquez la différence visuelle, d’animation, d’auteur ou de runtime.',
    sourceTypeName: (value) => ({
      original: 'Illustration originale', 'ai-generated': 'Généré indépendamment par IA', commissioned: 'Commande', 'fan-art': 'Fan art',
      'adapted-existing-asset': 'Asset existant adapté', 'private-source': 'Source privée', 'github-or-project-source': 'Source GitHub ou projet',
      'existing-pet-package': 'Package Pet existant', mascot: 'Mascotte', meme: 'Mème', avatar: 'Avatar', object: 'Objet', other: 'Autre',
    })[value] || value,
    submissionStage: (stage) => ({
      'downloading-github-cli': 'Téléchargement et vérification de l’outil officiel GitHub CLI…',
      'waiting-for-github-authorization': 'Ouverture de GitHub dans votre navigateur… Connectez-vous ou créez un compte, puis autorisez l’accès.',
      'github-device-code-copied': 'Votre code à usage unique est prêt ci-dessus. Saisissez-le sur GitHub pour continuer.',
      'github-browser-open-failed': 'Le code a été copié. Utilisez Ouvrir GitHub, puis collez-le sur la page de connexion d’appareil.',
      'github-connected': 'GitHub est connecté.', 'validating-local-pet': 'Validation du package Pet V2 local…',
      'checking-marketplace-duplicates': 'Contrôle des identifiants, noms, clés canoniques et empreintes exactes…',
      'reading-marketplace-branch': 'Lecture de la branche actuelle du marketplace…', 'creating-github-fork': 'Préparation de votre fork GitHub…',
      'uploading-pet-files': 'Envoi des trois fichiers du Pet…', 'checking-open-submissions': 'Recherche d’une soumission existante…',
      'updating-pull-request': 'Mise à jour de la pull request existante…', 'opening-pull-request': 'Ouverture de la pull request publique…',
      'submission-complete': 'Pull request prête pour la publication automatique par la CI.', 'submission-cancelled': 'Soumission annulée. Rien n’a été publié.',
    })[stage] || '',
    zoneEyebrow: 'Multi-écrans', zoneTitle: 'Zone de déplacement', zoneCopy: 'Choisissez tous les écrans, certains écrans ou tracez une zone exacte directement sur le bureau.',
    allScreens: 'Tous les écrans', selectedScreens: 'Écrans sélectionnés', customArea: 'Tracer une zone', screen: 'Écran', primary: 'principal',
    customUnset: 'Aucune zone personnalisée', customSummary: (r) => `${r.width} × ${r.height} à ${r.x}, ${r.y}`,
    customHelp: 'Un sélecteur plein écran vous permettra de tracer le rectangle souhaité.', pickZone: 'Sélectionner à l’écran',
    integrationEyebrow: 'Intégration', integrationTitle: 'Plugin Codex + hooks de cycle de vie',
    integrationCopy: 'L’overlay fonctionne localement. Activer le plugin ajoute la compétence de création et permet à l’activité Codex d’animer chaque compagnon.',
    stepPlugin: 'Installez ou activez le plugin Codex Avatars.', stepTrust: 'Examinez et approuvez ses hooks ; ils ne transmettent que les identifiants d’événements et des métadonnées non sensibles.',
    stepCreate: 'Créez un Pet avec le formulaire ci-dessus : il apparaît ensuite automatiquement dans la bibliothèque locale.',
    openPlugin: 'Ouvrir le plugin dans Codex', enableHooks: 'Activer les hooks autonomes', disableHooks: 'Désactiver les hooks autonomes', docs: 'Documentation Pets',
    runDemo: 'Lancer la démo', stopDemo: 'Arrêter la démo', pluginOpened: 'Codex est ouvert. Activez le plugin, puis examinez ses hooks.',
    pluginUnavailable: 'Le package du plugin manque dans cette installation.', hooksOn: 'Hooks autonomes activés.', hooksOff: 'Hooks autonomes désactivés.',
    promptOpened: 'Une nouvelle tâche Codex s’est ouverte avec le brief de votre avatar.', promptFallback: 'Codex n’a pas pu être ouvert. Le prompt a été copié comme solution de secours.',
    promptCopied: 'Prompt de l’avatar copié.', appearanceRequired: 'Décrivez d’abord l’apparence de l’avatar.',
    imported: (name) => `${name} a été importé et ajouté à votre galerie locale.`, exported: 'Package Pet portable créé.',
    importError: 'Impossible d’importer ce package Pet.', exportError: 'Impossible de partager ce Pet.', saveError: 'Impossible d’enregistrer ce réglage.', zoneCancelled: 'Sélection de zone annulée.',
    onboardingWelcomeTitle: 'Bienvenue dans Codex Avatars', onboardingWelcomeCopy: 'Chaque agent Codex obtient un compagnon animé indépendant sur votre bureau.',
    onboardingWelcomeFeature: 'L’overlay lui-même est invisible et laisse passer les clics par défaut. L’icône de zone de notification et Ctrl + Alt + A vous rendent toujours la main.',
    onboardingPluginTitle: 'Activer le plugin', onboardingPluginCopy: 'Le compagnon peut fonctionner seul, mais le plugin complète l’expérience.',
    onboardingPluginFeature: 'Sa compétence de création appelle hatch-pet, valide l’atlas Pet v2 complet et l’installe localement. Ses hooks relient le cycle de vie des agents aux états des avatars.',
    onboardingAvatarTitle: 'Créer ou importer un Pet', onboardingAvatarCopy: 'Décrivez son apparence, son style, sa personnalité, ses couleurs et ses accessoires dans le studio.',
    onboardingAvatarFeature: 'Créer dans Codex ouvre une nouvelle tâche avec le prompt prêt. Les fichiers .codexpet simplifient le partage.',
    onboardingZoneTitle: 'Choisir où ils se déplacent', onboardingZoneCopy: 'Utilisez tous les écrans, certains écrans ou tracez un rectangle comme lors d’une capture.',
    onboardingZoneFeature: 'Vous pourrez le modifier plus tard. Le mode passif reste réversible depuis les réglages, la zone de notification et le raccourci.',
    back: 'Retour', next: 'Suivant', finish: 'Terminer', stepLabel: (step) => `Étape ${step} sur 4`,
  },
};

const elements = {
  activeCount: document.querySelector('#active-count'), language: document.querySelector('#language-select'), tour: document.querySelector('#tour-button'), feedback: document.querySelector('#feedback-button'),
  overlayEnabledButton: document.querySelector('#overlay-enabled-button'),
  passive: document.querySelector('#passive-toggle'), startup: document.querySelector('#startup-toggle'), avatarGrid: document.querySelector('#avatar-grid'),
  avatarEmpty: document.querySelector('#avatar-empty'), mainAvatarSize: document.querySelector('#main-avatar-size'), mainAvatarSizeValue: document.querySelector('#main-avatar-size-value'),
  subagentAvatarSize: document.querySelector('#subagent-avatar-size'), subagentAvatarSizeValue: document.querySelector('#subagent-avatar-size-value'),
  labels: document.querySelector('#labels-toggle'), agentDetails: document.querySelector('#agent-details-toggle'), dormantAgents: document.querySelector('#dormant-agents-toggle'), autoEnable: document.querySelector('#new-avatars-toggle'), avatarAssignment: document.querySelector('#avatar-assignment-select'),
  reduceMotion: document.querySelector('#motion-toggle'), displayList: document.querySelector('#display-list'), customActions: document.querySelector('#custom-zone-actions'),
  customSummary: document.querySelector('#custom-zone-summary'), hooksButton: document.querySelector('#legacy-hooks-button'), openPluginButton: document.querySelector('#open-plugin-button'),
  demoButton: document.querySelector('#demo-button'), briefForm: document.querySelector('#avatar-brief-form'), toast: document.querySelector('#toast'),
  onboarding: document.querySelector('#onboarding-dialog'), onboardingBack: document.querySelector('#onboarding-back'), onboardingNext: document.querySelector('#onboarding-next'),
  marketplaceSearch: document.querySelector('#marketplace-search'), marketplaceCategory: document.querySelector('#marketplace-category'),
  marketplaceGrid: document.querySelector('#marketplace-grid'), marketplaceStatus: document.querySelector('#marketplace-status'), marketplaceEmpty: document.querySelector('#marketplace-empty'),
  refreshMarketplace: document.querySelector('#refresh-marketplace'), submissionPet: document.querySelector('#submission-pet'), submitMarketplacePet: document.querySelector('#submit-marketplace-pet'),
  submissionDialog: document.querySelector('#marketplace-submission-dialog'), submissionForm: document.querySelector('#marketplace-submission-form'),
  submissionAtlas: document.querySelector('#submission-atlas-preview'), submissionPreviewName: document.querySelector('#submission-preview-name'),
  submissionGithubStatus: document.querySelector('#submission-github-status'), connectGithub: document.querySelector('#connect-marketplace-github'),
  githubDeviceCodePanel: document.querySelector('#github-device-code-panel'), githubDeviceCode: document.querySelector('#github-device-code'),
  copyGithubDeviceCode: document.querySelector('#copy-github-device-code'), openGithubDevicePage: document.querySelector('#open-github-device-page'),
  submissionSourceNotesField: document.querySelector('#submission-source-notes-field'),
  submissionProgress: document.querySelector('#marketplace-submission-progress'), confirmSubmission: document.querySelector('#confirm-marketplace-submission'),
  submissionClose: document.querySelector('#submission-dialog-close'), submissionCancel: document.querySelector('#submission-dialog-cancel'),
  reportDialog: document.querySelector('#marketplace-report-dialog'), reportForm: document.querySelector('#marketplace-report-form'),
  reportPetName: document.querySelector('#report-pet-name'), reportPetSlug: document.querySelector('#report-pet-slug'),
  reportClose: document.querySelector('#report-dialog-close'), reportCancel: document.querySelector('#report-dialog-cancel'),
  reportConfirm: document.querySelector('#confirm-marketplace-report'),
};

let settings = null;
let avatars = [];
let displays = [];
let hooksInstalled = false;
let pluginAvailable = false;
let demoRunning = false;
let onboardingStep = 0;
let toastTimer = null;
let currentAgentState = { sessions: [] };
let sizePreviewFrame = null;
let marketplace = null;
let marketplaceLoading = false;
let marketplaceError = false;
let marketplaceThumbnailObserver = null;
const marketplaceInstalling = new Set();
let marketplaceSubmissionStatus = null;
let marketplaceSubmissionBusy = false;
let marketplaceSubmissionOperation = '';
let marketplaceGithubDeviceCode = '';
let lastSuggestedSubmissionPetSlug = '';
let lastSuggestedCanonicalKey = '';
let lastAutomaticSubmissionAuthor = '';
let selectedSubmissionAvatar = null;
let selectedReportPet = null;
const SUBMISSION_AUTHOR_STORAGE_KEY = 'codex-avatars.marketplace-author';
const MARKETPLACE_REPORT_REASONS = ['copyright', 'inappropriate', 'duplicate', 'broken', 'impersonation', 'other'];

function c() { return translations[settings?.language === 'fr' ? 'fr' : 'en']; }
function setText(selector, value) { const element = document.querySelector(selector); if (element) element.textContent = value; }
function displayVersion(value) { return String(value || '').replace(/-beta\.(\d+)$/i, ' β$1'); }

function localize() {
  const copy = c();
  document.documentElement.lang = settings?.language === 'fr' ? 'fr' : 'en';
  const mapping = {
    '#header-subtitle': copy.headerSubtitle, '#language-label': copy.language, '#tour-button': copy.tour, '#feedback-button': copy.feedback,
    '#control-eyebrow': copy.controlEyebrow, '#control-title': copy.controlTitle, '#passive-title': copy.passiveTitle, '#passive-copy': copy.passiveCopy,
    '#startup-title': copy.startupTitle, '#startup-copy': copy.startupCopy, '#avatars-eyebrow': copy.avatarsEyebrow, '#avatars-title': copy.avatarsTitle,
    '#avatars-copy': copy.avatarsCopy, '#refresh-avatars': copy.refresh, '#avatar-empty-title': copy.emptyTitle, '#avatar-empty-copy': copy.emptyCopy,
    '#main-avatar-size-title': copy.mainAvatarSize, '#subagent-avatar-size-title': copy.subagentAvatarSize, '#labels-title': copy.labels, '#agent-details-title': copy.agentDetails,
    '#dormant-agents-title': copy.dormantAgents, '#dormant-agents-help': copy.dormantAgentsHelp, '#new-avatars-title': copy.autoEnable, '#avatar-assignment-title': copy.avatarAssignment,
    '#new-avatars-help': copy.autoEnableHelp, '#motion-title': copy.reduceMotion, '#creator-eyebrow': copy.creatorEyebrow, '#creator-title': copy.creatorTitle,
    '#creator-copy': copy.creatorCopy, '#brief-name-label': copy.briefName, '#brief-style-label': copy.briefStyle, '#brief-appearance-label': copy.briefAppearance,
    '#brief-appearance-help': copy.briefAppearanceHelp, '#brief-personality-label': copy.briefPersonality, '#brief-palette-label': copy.briefPalette,
    '#brief-props-label': copy.briefProps, '#brief-avoid-label': copy.briefAvoid, '#create-avatar': copy.createInCodex, '#copy-prompt': copy.copyPrompt,
    '#create-note': copy.createNote, '#gallery-eyebrow': copy.galleryEyebrow, '#gallery-title': copy.galleryTitle, '#gallery-copy': copy.galleryCopy,
    '#marketplace-search-label': copy.marketplaceSearchLabel, '#marketplace-category-label': copy.marketplaceCategoryLabel, '#refresh-marketplace': copy.refreshMarketplace,
    '#marketplace-empty-title': copy.marketplaceEmptyTitle, '#marketplace-empty-copy': copy.marketplaceEmptyCopy, '#marketplace-credit': copy.marketplaceCredit,
    '#open-marketplace': copy.openMarketplace, '#local-packages-title': copy.localPackagesTitle, '#local-packages-copy': copy.localPackagesCopy,
    '#submission-title': copy.submissionTitle, '#submission-copy': copy.submissionCopy, '#submission-pet-label': copy.submissionPetLabel,
    '#submit-marketplace-pet': copy.submitMarketplacePet, '#open-submission-guide': copy.openSubmissionGuide, '#submission-note': copy.submissionNote,
    '#submission-dialog-eyebrow': copy.submissionDialogEyebrow, '#submission-dialog-title': copy.submissionDialogTitle, '#submission-dialog-copy': copy.submissionDialogCopy,
    '#submission-preview-contract': copy.submissionPreviewContract, '#submission-preview-help': copy.submissionPreviewHelp, '#submission-github-title': copy.submissionGithubTitle,
    '#github-device-code-label': copy.githubDeviceCodeLabel, '#github-device-code-help': copy.githubDeviceCodeHelp,
    '#copy-github-device-code': copy.copyGithubCode, '#open-github-device-page': copy.openGithub,
    '#submission-github-required': copy.githubRequired, '#submission-name-label': copy.submissionName, '#submission-slug-label': copy.submissionSlug,
    '#submission-author-label': copy.submissionAuthor, '#submission-category-label': copy.submissionCategory, '#submission-source-type-label': copy.submissionSourceType,
    '#submission-canonical-label': copy.submissionCanonical, '#submission-canonical-help': copy.submissionCanonicalHelp, '#submission-description-label': copy.submissionDescription,
    '#submission-source-notes-label': copy.submissionSourceNotes, '#submission-source-notes-help': copy.submissionSourceNotesHelp, '#submission-source-url-label': copy.submissionSourceUrl,
    '#submission-tags-label': copy.submissionTags, '#submission-variant-label': copy.submissionVariant, '#submission-variant-help': copy.submissionVariantHelp,
    '#submission-license-label': copy.submissionLicense, '#submission-confirmations-title': copy.submissionConfirmations, '#submission-confirm-rights': copy.confirmRights,
    '#submission-confirm-frames': copy.confirmFrames, '#submission-confirm-directions': copy.confirmDirections, '#submission-confirm-edges': copy.confirmEdges,
    '#submission-confirm-noncommercial': copy.confirmNonCommercial, '#submission-confirm-public': copy.confirmPublic, '#submission-dialog-cancel': copy.cancelSubmission,
    '#report-dialog-eyebrow': copy.reportDialogEyebrow, '#report-dialog-title': copy.reportDialogTitle, '#report-dialog-copy': copy.reportDialogCopy,
    '#report-reason-label': copy.reportReasonLabel, '#report-details-label': copy.reportDetailsLabel, '#report-public-note': copy.reportPublicNote,
    '#report-dialog-cancel': copy.reportCancel, '#confirm-marketplace-report': copy.reportContinue,
    '#import-pet': copy.importPet, '#open-pet-folder': copy.openFolder, '#gallery-help': copy.galleryHelp, '#zone-eyebrow': copy.zoneEyebrow,
    '#zone-title': copy.zoneTitle, '#zone-copy': copy.zoneCopy, '#zone-all': copy.allScreens, '#zone-displays': copy.selectedScreens,
    '#zone-custom': copy.customArea, '#custom-zone-help': copy.customHelp, '#pick-zone': copy.pickZone, '#integration-eyebrow': copy.integrationEyebrow,
    '#integration-title': copy.integrationTitle, '#integration-copy': copy.integrationCopy, '#integration-step-plugin': copy.stepPlugin,
    '#integration-step-trust': copy.stepTrust, '#integration-step-create': copy.stepCreate, '#open-plugin-button': copy.openPlugin,
    '#pets-docs-button': copy.docs, '#onboarding-welcome-title': copy.onboardingWelcomeTitle, '#onboarding-welcome-copy': copy.onboardingWelcomeCopy,
    '#onboarding-welcome-feature': copy.onboardingWelcomeFeature, '#onboarding-plugin-title': copy.onboardingPluginTitle, '#onboarding-plugin-copy': copy.onboardingPluginCopy,
    '#onboarding-plugin-feature': copy.onboardingPluginFeature, '#onboarding-plugin-button': copy.openPlugin, '#onboarding-avatar-title': copy.onboardingAvatarTitle,
    '#onboarding-avatar-copy': copy.onboardingAvatarCopy, '#onboarding-avatar-feature': copy.onboardingAvatarFeature, '#onboarding-zone-title': copy.onboardingZoneTitle,
    '#onboarding-zone-copy': copy.onboardingZoneCopy, '#onboarding-zone-feature': copy.onboardingZoneFeature,
  };
  for (const [selector, value] of Object.entries(mapping)) setText(selector, value);
  setText('#avatar-assignment-master', copy.avatarAssignmentMaster);
  setText('#avatar-assignment-random', copy.avatarAssignmentRandom);
  elements.briefForm.elements.appearance.placeholder = copy.appearancePlaceholder;
  elements.briefForm.elements.personality.placeholder = copy.personalityPlaceholder;
  elements.briefForm.elements.palette.placeholder = copy.palettePlaceholder;
  elements.briefForm.elements.props.placeholder = copy.propsPlaceholder;
  elements.briefForm.elements.avoid.placeholder = copy.avoidPlaceholder;
  elements.marketplaceSearch.placeholder = copy.marketplaceSearchPlaceholder;
  elements.submissionForm.elements.sourceNotes.placeholder = copy.sourceNotesPlaceholder;
  elements.submissionForm.elements.sourceUrl.placeholder = copy.sourceUrlPlaceholder;
  elements.submissionForm.elements.tags.placeholder = copy.tagsPlaceholder;
  elements.submissionForm.elements.variantNote.placeholder = copy.variantPlaceholder;
  elements.reportForm.elements.details.placeholder = copy.reportDetailsPlaceholder;
  populateSelect(elements.reportForm.elements.reason, MARKETPLACE_REPORT_REASONS, copy.reportReasonName);
  [...elements.briefForm.elements.style.options].forEach((option, index) => {
    option.textContent = copy.styles[index];
    option.value = copy.styles[index];
  });
  elements.hooksButton.textContent = hooksInstalled ? copy.disableHooks : copy.enableHooks;
  elements.demoButton.textContent = demoRunning ? copy.stopDemo : copy.runDemo;
  elements.overlayEnabledButton.textContent = settings?.overlayEnabled ? copy.disableAvatars : copy.enableAvatars;
  populateMarketplaceSubmissionOptions();
  renderMarketplaceSubmissionStatus();
  renderOnboarding();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3_600);
}

async function save(patch) {
  try {
    settings = await api.updateSettings(patch);
    localize();
    renderSettings();
    return settings;
  } catch {
    showToast(c().saveError);
    return null;
  }
}

function renderAvatarGrid() {
  elements.avatarGrid.replaceChildren();
  elements.avatarEmpty.hidden = avatars.length > 0;
  elements.avatarGrid.hidden = avatars.length === 0;
  const enabled = new Set(settings?.enabledAvatarIds || []);

  for (const avatar of avatars) {
    const card = document.createElement('article');
    card.className = `avatar-option${enabled.has(avatar.id) ? ' is-enabled' : ''}`;
    const preview = document.createElement('span');
    preview.className = 'pet-preview';
    // Use the same WebP delivery path as the overlay; native-image thumbnail
    // decoding is not reliable in every packaged Windows runtime.
    preview.style.backgroundImage = `url("${avatar.assetUrl}")`;
    preview.style.backgroundSize = `800% ${avatar.rows * 100}%`;
    const previewRow = Math.min(7, Math.max(0, avatar.rows - 1));
    preview.style.backgroundPosition = `0 ${previewRow * (100 / Math.max(1, avatar.rows - 1))}%`;
    const copyBlock = document.createElement('span');
    copyBlock.className = 'avatar-option-copy';
    const name = document.createElement('strong');
    name.textContent = avatar.displayName;
    const source = document.createElement('small');
    source.textContent = avatar.source === 'codex-pet' ? c().codexPet : c().bundled;
    copyBlock.append(name, source);
    const actions = document.createElement('span');
    actions.className = 'avatar-card-actions';
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'mini-button';
    share.textContent = c().share;
    share.addEventListener('click', async () => {
      try {
        const result = await api.exportPet(avatar.id);
        if (!result.cancelled) showToast(c().exported);
      } catch { showToast(c().exportError); }
    });
    const toggle = document.createElement('input');
    toggle.className = 'switch';
    toggle.type = 'checkbox';
    toggle.checked = enabled.has(avatar.id);
    toggle.setAttribute('aria-label', `${avatar.displayName}: ${toggle.checked ? c().enabled : c().disabled}`);
    toggle.addEventListener('change', () => {
      const next = new Set(settings.enabledAvatarIds);
      if (toggle.checked) next.add(avatar.id); else next.delete(avatar.id);
      void save({ enabledAvatarIds: [...next], avatarSelectionInitialized: true });
    });
    actions.append(share, toggle);
    card.append(preview, copyBlock, actions);
    elements.avatarGrid.append(card);
  }
}

function localizedMarketplaceName(pet) {
  const language = settings?.language === 'fr' ? 'fr' : 'en';
  return pet.localizedNames?.[language] || pet.name || pet.slug;
}

function searchable(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function marketplaceLicenseLabel(value) {
  const license = String(value || '');
  const formal = license.match(/CC\s+BY(?:-[A-Z]+)*\s+\d(?:\.\d)?/i);
  if (formal) return formal[0].toUpperCase().replace(/\s+/g, ' ');
  return /non-commercial/i.test(license) ? c().marketplaceNonCommercial : '';
}

function filteredMarketplacePets() {
  const pets = marketplace?.pets || [];
  const query = searchable(elements.marketplaceSearch.value.trim());
  const category = elements.marketplaceCategory.value;
  return pets.filter((pet) => {
    if (category && pet.primaryCategory !== category) return false;
    if (!query) return true;
    return searchable([
      localizedMarketplaceName(pet),
      pet.name,
      pet.author,
      pet.authorHandle,
      pet.primaryCategory,
      c().marketplaceCategoryName(pet.primaryCategory),
      pet.description,
      ...(pet.collections || []),
    ].join(' ')).includes(query);
  });
}

function loadMarketplaceThumbnail(image, slug) {
  if (image.dataset.loading || image.src) return;
  image.dataset.loading = 'true';
  void api.getMarketplaceThumbnail(slug).then((assetUrl) => {
    image.classList.toggle('is-atlas', /\.webp(?:$|[?#])/i.test(assetUrl));
    image.addEventListener('load', () => image.classList.add('is-loaded'), { once: true });
    image.src = assetUrl;
  }).catch(() => {
    delete image.dataset.loading;
  });
}

function observeMarketplaceThumbnail(image, slug) {
  if (!('IntersectionObserver' in window)) {
    loadMarketplaceThumbnail(image, slug);
    return;
  }
  marketplaceThumbnailObserver.observe(image);
}

function renderSubmissionPets() {
  const previous = elements.submissionPet.value;
  const available = avatars.filter((avatar) => Number(avatar.spriteVersionNumber) === 2);
  elements.submissionPet.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = c().submissionChoosePet;
  elements.submissionPet.append(placeholder);
  for (const avatar of available) {
    const option = document.createElement('option');
    option.value = avatar.id;
    option.textContent = avatar.displayName;
    elements.submissionPet.append(option);
  }
  if (available.some((avatar) => avatar.id === previous)) elements.submissionPet.value = previous;
  elements.submissionPet.disabled = available.length === 0;
  elements.submitMarketplacePet.disabled = !elements.submissionPet.value;
}

function submissionSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

function populateSelect(select, values, label) {
  const previous = select.value;
  select.replaceChildren();
  for (const value of values || []) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label(value);
    select.append(option);
  }
  if ((values || []).includes(previous)) select.value = previous;
}

function populateMarketplaceSubmissionOptions() {
  const categories = marketplaceSubmissionStatus?.categories || [];
  const sourceTypes = marketplaceSubmissionStatus?.sourceTypes || [];
  populateSelect(elements.submissionForm.elements.primaryCategory, categories, (value) => c().marketplaceCategoryName(value));
  populateSelect(elements.submissionForm.elements.sourceType, sourceTypes, (value) => c().sourceTypeName(value));
}

function renderMarketplaceSubmissionStatus() {
  const github = marketplaceSubmissionStatus?.github;
  const connected = Boolean(github?.connected);
  const connecting = marketplaceSubmissionOperation === 'connecting';
  const submitting = marketplaceSubmissionOperation === 'submitting';
  elements.submissionGithubStatus.textContent = connecting
    ? (marketplaceGithubDeviceCode ? c().githubWaitingApproval : c().githubPreparing)
    : (marketplaceSubmissionStatus
        ? (connected ? c().githubConnected(github.login) : c().githubDisconnected)
        : c().githubChecking);
  elements.submissionGithubStatus.classList.toggle('is-connected', connected);
  elements.connectGithub.textContent = c().connectGithub;
  elements.connectGithub.hidden = connecting;
  elements.connectGithub.disabled = submitting || connecting || connected;
  elements.githubDeviceCodePanel.hidden = connected || !marketplaceGithubDeviceCode;
  elements.copyGithubDeviceCode.disabled = !marketplaceGithubDeviceCode;
  elements.openGithubDevicePage.disabled = !marketplaceGithubDeviceCode;
  elements.confirmSubmission.textContent = submitting ? c().submittingPet : c().confirmSubmission;
  elements.confirmSubmission.disabled = marketplaceSubmissionBusy || !connected;
  elements.submissionClose.disabled = submitting;
  elements.submissionCancel.disabled = submitting;
}

function setMarketplaceGithubDeviceCode(value = '') {
  const normalized = String(value || '').trim().toUpperCase();
  marketplaceGithubDeviceCode = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized) ? normalized : '';
  elements.githubDeviceCode.textContent = marketplaceGithubDeviceCode;
  renderMarketplaceSubmissionStatus();
}

function setMarketplaceSubmissionProgress(message, error = false) {
  elements.submissionProgress.textContent = message || '';
  elements.submissionProgress.classList.toggle('is-error', error);
}

function friendlySubmissionError(error) {
  const message = String(error?.message || c().submissionError)
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .trim();
  return /GitHub connection was cancelled/i.test(message) ? c().githubConnectionCancelled : message;
}

function refreshSuggestedCanonicalKey(force = false) {
  const form = elements.submissionForm.elements;
  const prefix = marketplaceSubmissionStatus?.canonicalCategoryPrefixes?.[form.primaryCategory.value] || '';
  const author = submissionSlug(form.author.value);
  const pet = submissionSlug(form.petSlug.value || form.name.value);
  const useAuthor = form.primaryCategory.value === 'Original Characters' && author;
  const suggestion = prefix && pet ? (useAuthor ? `${prefix}/${author}/${pet}` : `${prefix}/${pet}`) : '';
  const current = form.canonicalKey.value.trim();
  if (force || !current || current === lastSuggestedCanonicalKey) form.canonicalKey.value = suggestion;
  lastSuggestedCanonicalKey = suggestion;
}

function storedSubmissionAuthor() {
  try {
    return String(localStorage.getItem(SUBMISSION_AUTHOR_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function rememberSubmissionAuthor(value) {
  const author = String(value || '').trim();
  if (!author) return;
  try {
    localStorage.setItem(SUBMISSION_AUTHOR_STORAGE_KEY, author);
  } catch {
    // A blocked renderer storage area must not prevent a submission.
  }
}

function defaultSubmissionIdentity() {
  const form = elements.submissionForm.elements;
  const login = marketplaceSubmissionStatus?.github?.login || '';
  const packagedAuthor = String(selectedSubmissionAvatar?.id || '').split('--')[1] || '';
  const suggestion = storedSubmissionAuthor() || login || packagedAuthor;
  const current = form.author.value.trim();
  if (suggestion && (!current || current === lastAutomaticSubmissionAuthor)) {
    form.author.value = suggestion;
    lastAutomaticSubmissionAuthor = suggestion;
    rememberSubmissionAuthor(suggestion);
  }
  refreshSuggestedCanonicalKey();
}

function updateSubmissionSourceNotes() {
  const form = elements.submissionForm.elements;
  const requiredTypes = marketplaceSubmissionStatus?.sourceTypesRequiringNotes || [];
  const required = requiredTypes.includes(form.sourceType.value);
  elements.submissionSourceNotesField.hidden = !required;
  form.sourceNotes.required = required;
}

async function openMarketplaceSubmissionDialog() {
  const avatar = avatars.find((candidate) => candidate.id === elements.submissionPet.value);
  if (!avatar) { showToast(c().submissionMissing); return; }
  selectedSubmissionAvatar = avatar;
  elements.submissionForm.reset();
  lastSuggestedCanonicalKey = '';
  lastAutomaticSubmissionAuthor = '';
  elements.submissionAtlas.src = avatar.assetUrl;
  elements.submissionAtlas.alt = `${avatar.displayName} Pet v2 atlas`;
  elements.submissionPreviewName.textContent = avatar.displayName;
  const localSlug = submissionSlug(String(avatar.id).split('--')[0]) || submissionSlug(avatar.displayName);
  lastSuggestedSubmissionPetSlug = localSlug;
  elements.submissionForm.elements.name.value = avatar.displayName;
  elements.submissionForm.elements.petSlug.value = localSlug;
  elements.submissionForm.elements.description.value = avatar.description || `A Codex Pet v2 companion named ${avatar.displayName}.`;
  elements.submissionForm.elements.license.value = 'Non-commercial use only.';
  defaultSubmissionIdentity();
  marketplaceSubmissionStatus = null;
  marketplaceSubmissionBusy = false;
  marketplaceSubmissionOperation = '';
  setMarketplaceGithubDeviceCode('');
  setMarketplaceSubmissionProgress('');
  renderMarketplaceSubmissionStatus();
  if (!elements.submissionDialog.open) elements.submissionDialog.showModal();
  try {
    marketplaceSubmissionStatus = await api.getMarketplaceSubmissionStatus();
    populateMarketplaceSubmissionOptions();
    const category = elements.submissionForm.elements.primaryCategory;
    if ([...category.options].some((option) => option.value === 'Original Characters')) category.value = 'Original Characters';
    const sourceType = elements.submissionForm.elements.sourceType;
    if ([...sourceType.options].some((option) => option.value === 'ai-generated')) sourceType.value = 'ai-generated';
    updateSubmissionSourceNotes();
    defaultSubmissionIdentity();
    renderMarketplaceSubmissionStatus();
  } catch (error) {
    setMarketplaceSubmissionProgress(friendlySubmissionError(error), true);
  }
}

function closeMarketplaceSubmissionDialog(force = false) {
  if (marketplaceSubmissionOperation === 'submitting' && !force) return;
  const cancelConnection = marketplaceSubmissionOperation === 'connecting';
  marketplaceSubmissionBusy = false;
  marketplaceSubmissionOperation = '';
  setMarketplaceGithubDeviceCode('');
  if (elements.submissionDialog.open) elements.submissionDialog.close();
  selectedSubmissionAvatar = null;
  elements.submissionAtlas.removeAttribute('src');
  if (cancelConnection) void api.cancelMarketplaceGithub().catch((error) => console.error(error));
}

function openMarketplaceReportDialog(pet) {
  selectedReportPet = pet;
  elements.reportForm.reset();
  populateSelect(elements.reportForm.elements.reason, MARKETPLACE_REPORT_REASONS, c().reportReasonName);
  elements.reportPetName.textContent = localizedMarketplaceName(pet);
  elements.reportPetSlug.textContent = pet.slug;
  elements.reportConfirm.disabled = false;
  if (!elements.reportDialog.open) elements.reportDialog.showModal();
}

function closeMarketplaceReportDialog() {
  if (elements.reportDialog.open) elements.reportDialog.close();
  selectedReportPet = null;
  elements.reportConfirm.disabled = false;
}

function marketplaceSubmissionPayload() {
  const form = elements.submissionForm.elements;
  return {
    avatarId: selectedSubmissionAvatar?.id || '',
    form: {
      name: form.name.value.trim(),
      petSlug: form.petSlug.value.trim(),
      author: form.author.value.trim(),
      primaryCategory: form.primaryCategory.value,
      sourceType: form.sourceType.value,
      canonicalKey: form.canonicalKey.value.trim(),
      description: form.description.value.trim(),
      sourceNotes: form.sourceNotes.value.trim(),
      sourceUrl: form.sourceUrl.value.trim(),
      tags: form.tags.value.trim(),
      variantNote: form.variantNote.value.trim(),
      license: form.license.value.trim(),
      confirmations: Object.fromEntries(
        ['rights', 'frames', 'directions', 'edges', 'nonCommercial', 'publicPullRequest']
          .map((key) => [key, Boolean(form[key].checked)]),
      ),
    },
  };
}

function renderMarketplace() {
  const copy = c();
  const pets = marketplace?.pets || [];
  const previousCategory = elements.marketplaceCategory.value;
  const categories = [...new Set(pets.map((pet) => pet.primaryCategory).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, settings?.language || 'en'));
  elements.marketplaceCategory.replaceChildren();
  const allCategories = document.createElement('option');
  allCategories.value = '';
  allCategories.textContent = copy.marketplaceAllCategories;
  elements.marketplaceCategory.append(allCategories);
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = copy.marketplaceCategoryName(category);
    elements.marketplaceCategory.append(option);
  }
  if (categories.includes(previousCategory)) elements.marketplaceCategory.value = previousCategory;

  const filtered = filteredMarketplacePets();
  elements.marketplaceStatus.classList.toggle('is-error', marketplaceError);
  if (marketplaceLoading) {
    elements.marketplaceStatus.textContent = copy.marketplaceLoading;
  } else if (marketplaceError) {
    elements.marketplaceStatus.textContent = copy.marketplaceUnavailable;
  } else if (marketplace) {
    const qualifier = marketplace.source === 'mixed'
      ? copy.marketplacePartial
      : (marketplace.stale ? copy.marketplaceStale : (marketplace.source === 'cache' ? copy.marketplaceCached : ''));
    elements.marketplaceStatus.textContent = `${copy.marketplaceCount(filtered.length, pets.length)}${qualifier ? ` · ${qualifier}` : ''}`;
  } else {
    elements.marketplaceStatus.textContent = '';
  }

  elements.refreshMarketplace.disabled = marketplaceLoading;
  elements.marketplaceEmpty.hidden = marketplaceLoading || marketplaceError || filtered.length > 0;
  elements.marketplaceGrid.hidden = marketplaceError || filtered.length === 0;
  elements.marketplaceGrid.replaceChildren();
  marketplaceThumbnailObserver?.disconnect();
  marketplaceThumbnailObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        marketplaceThumbnailObserver.unobserve(entry.target);
        loadMarketplaceThumbnail(entry.target, entry.target.dataset.slug);
      }
    }, { root: elements.marketplaceGrid, rootMargin: '120px' })
    : null;

  const installedIds = new Set(avatars.map((avatar) => avatar.id));
  for (const pet of filtered) {
    const name = localizedMarketplaceName(pet);
    const installed = installedIds.has(pet.slug);
    const installing = marketplaceInstalling.has(pet.slug);
    const card = document.createElement('article');
    card.className = `marketplace-card${installed ? ' is-installed' : ''}`;

    const preview = document.createElement('div');
    preview.className = 'marketplace-preview';
    const image = document.createElement('img');
    image.className = 'marketplace-thumbnail';
    image.alt = '';
    image.loading = 'lazy';
    image.dataset.slug = pet.slug;
    const placeholder = document.createElement('span');
    placeholder.className = 'marketplace-preview-placeholder';
    preview.append(image, placeholder);
    observeMarketplaceThumbnail(image, pet.slug);

    const cardCopy = document.createElement('div');
    cardCopy.className = 'marketplace-card-copy';
    const titleRow = document.createElement('div');
    titleRow.className = 'marketplace-card-title';
    const title = document.createElement('strong');
    title.textContent = name;
    title.title = name;
    titleRow.append(title);
    const author = document.createElement('span');
    author.className = 'marketplace-author';
    author.textContent = copy.marketplaceBy(pet.author || pet.authorHandle);
    const description = document.createElement('span');
    description.className = 'marketplace-description';
    description.textContent = pet.description || pet.license || pet.primaryCategory;
    description.title = pet.license || pet.description || '';
    const tags = document.createElement('div');
    tags.className = 'marketplace-tags';
    const licenseLabel = marketplaceLicenseLabel(pet.license);
    for (const label of [pet.primaryCategory, ...(pet.collections || []).slice(0, 1), licenseLabel]) {
      if (!label) continue;
      const tag = document.createElement('span');
      tag.className = 'marketplace-tag';
      tag.textContent = label === pet.primaryCategory ? copy.marketplaceCategoryName(label) : label;
      tags.append(tag);
    }
    cardCopy.append(titleRow, author, description, tags);

    const actions = document.createElement('div');
    actions.className = 'marketplace-card-actions';
    const install = document.createElement('button');
    install.type = 'button';
    install.className = 'primary-button';
    install.disabled = installed || installing;
    install.textContent = installed
      ? copy.installedMarketplacePet
      : (installing ? copy.installingMarketplacePet : copy.installMarketplacePet);
    install.addEventListener('click', async () => {
      marketplaceInstalling.add(pet.slug);
      renderMarketplace();
      try {
        const result = await api.installMarketplacePet(pet.slug);
        const refreshed = await api.refreshLibrary();
        avatars = refreshed.avatars || avatars;
        showToast(result.alreadyInstalled ? copy.marketplaceAlreadyInstalled(name) : copy.marketplaceInstalled(name));
      } catch (error) {
        console.error(error);
        showToast(copy.marketplaceInstallError);
      } finally {
        marketplaceInstalling.delete(pet.slug);
        renderAvatarGrid();
        renderMarketplace();
      }
    });
    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'quiet-button';
    details.textContent = copy.marketplaceDetails;
    details.addEventListener('click', () => void api.openMarketplacePet(pet.slug));
    const report = document.createElement('button');
    report.type = 'button';
    report.className = 'quiet-button marketplace-report-button';
    report.textContent = copy.reportMarketplacePet;
    report.addEventListener('click', () => openMarketplaceReportDialog(pet));
    actions.append(install, details, report);
    card.append(preview, cardCopy, actions);
    elements.marketplaceGrid.append(card);
  }
  renderSubmissionPets();
}

async function refreshMarketplace(force = false) {
  marketplaceLoading = true;
  marketplaceError = false;
  renderMarketplace();
  try {
    marketplace = await api.getMarketplace({ force });
  } catch (error) {
    console.error(error);
    marketplaceError = true;
  } finally {
    marketplaceLoading = false;
    renderMarketplace();
  }
}

function renderDisplays() {
  elements.displayList.replaceChildren();
  elements.displayList.hidden = settings?.zone.mode !== 'displays';
  const selected = new Set(settings?.zone.displayIds || []);
  for (const [index, display] of displays.entries()) {
    const label = document.createElement('label');
    label.className = 'display-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selected.has(display.id);
    const diagram = document.createElement('span');
    diagram.className = 'display-diagram';
    diagram.textContent = String(index + 1);
    const content = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = display.label || `${c().screen} ${index + 1}`;
    const dimensions = document.createElement('small');
    dimensions.textContent = `${display.workArea.width} × ${display.workArea.height}${display.primary ? ` · ${c().primary}` : ''}`;
    content.append(title, dimensions);
    input.addEventListener('change', () => {
      const next = new Set(settings.zone.displayIds);
      if (input.checked) next.add(display.id); else next.delete(display.id);
      if (next.size === 0) { input.checked = true; next.add(display.id); }
      void save({ zone: { mode: 'displays', displayIds: [...next] } });
    });
    label.append(input, diagram, content);
    elements.displayList.append(label);
  }
}

function renderCustomZone() {
  const active = settings?.zone.mode === 'custom';
  elements.customActions.hidden = !active;
  if (!active) return;
  elements.customSummary.textContent = settings.zone.custom ? c().customSummary(settings.zone.custom) : c().customUnset;
}

function renderSettings() {
  if (!settings) return;
  elements.language.value = settings.language;
  elements.overlayEnabledButton.textContent = settings.overlayEnabled ? c().disableAvatars : c().enableAvatars;
  elements.overlayEnabledButton.classList.toggle('is-paused', !settings.overlayEnabled);
  elements.overlayEnabledButton.setAttribute('aria-pressed', String(settings.overlayEnabled));
  elements.passive.checked = settings.passive;
  elements.mainAvatarSize.value = settings.mainAvatarSize;
  elements.mainAvatarSizeValue.textContent = `${settings.mainAvatarSize}px`;
  elements.subagentAvatarSize.value = settings.subagentAvatarSize;
  elements.subagentAvatarSizeValue.textContent = `${settings.subagentAvatarSize}px`;
  elements.labels.checked = settings.showLabels;
  elements.agentDetails.checked = settings.showAgentDetails;
  elements.dormantAgents.checked = settings.showDormantAgents;
  elements.autoEnable.checked = settings.autoEnableNewAvatars;
  elements.avatarAssignment.value = settings.avatarAssignmentMode;
  elements.reduceMotion.checked = settings.reducedMotion;
  const radio = document.querySelector(`input[name="zone-mode"][value="${settings.zone.mode}"]`);
  if (radio) radio.checked = true;
  elements.hooksButton.textContent = hooksInstalled ? c().disableHooks : c().enableHooks;
  elements.demoButton.textContent = demoRunning ? c().stopDemo : c().runDemo;
  renderAvatarGrid();
  renderMarketplace();
  renderDisplays();
  renderCustomZone();
  updateActiveCount(currentAgentState);
}

function updateActiveCount(state) {
  currentAgentState = state || { sessions: [] };
  if (settings && !settings.overlayEnabled) {
    elements.activeCount.textContent = c().paused;
    elements.activeCount.classList.remove('is-active');
    return;
  }
  const agents = currentAgentState.sessions.flatMap((session) => session.agents || []);
  const count = agents.filter((agent) => ['working', 'attention'].includes(agent.status)).length;
  const dormant = settings?.showDormantAgents
    ? agents.filter((agent) => ['idle', 'dormant'].includes(agent.status)).length
    : 0;
  elements.activeCount.textContent = c().active(count, dormant);
  elements.activeCount.classList.toggle('is-active', count > 0);
}

function avatarBrief() {
  const data = new FormData(elements.briefForm);
  return Object.fromEntries(['name', 'appearance', 'style', 'personality', 'palette', 'props', 'avoid'].map((key) => [key, String(data.get(key) || '').trim()]));
}

function renderOnboarding() {
  const copy = c();
  const pages = [...document.querySelectorAll('.onboarding-page')];
  pages.forEach((page, index) => { page.hidden = index !== onboardingStep; });
  [...document.querySelectorAll('.onboarding-progress span')].forEach((bar, index) => {
    bar.classList.toggle('is-active', index <= onboardingStep);
  });
  elements.onboardingBack.textContent = copy.back;
  elements.onboardingBack.disabled = onboardingStep === 0;
  elements.onboardingNext.textContent = onboardingStep === 3 ? copy.finish : copy.next;
  setText('#onboarding-step-label', copy.stepLabel(onboardingStep + 1));
}

function openOnboarding() {
  onboardingStep = 0;
  localize();
  if (!elements.onboarding.open) elements.onboarding.showModal();
}

elements.language.addEventListener('change', () => void save({ language: elements.language.value }));
elements.tour.addEventListener('click', openOnboarding);
elements.feedback.addEventListener('click', async () => {
  try {
    await api.openFeedback();
  } catch (error) {
    console.error(error);
    showToast(c().feedbackOpenError);
  }
});
elements.overlayEnabledButton.addEventListener('click', () => void save({ overlayEnabled: !settings.overlayEnabled }));
elements.passive.addEventListener('change', () => void save({ passive: elements.passive.checked }));
elements.startup.addEventListener('change', async () => {
  const requested = elements.startup.checked;
  elements.startup.disabled = true;
  try {
    elements.startup.checked = await api.setLaunchAtLogin(requested);
    if (elements.startup.checked !== requested) showToast(c().startupError);
  } catch (error) {
    console.error(error);
    elements.startup.checked = !requested;
    showToast(c().startupError);
  } finally {
    elements.startup.disabled = false;
  }
});
function previewAvatarSizes() {
  elements.mainAvatarSizeValue.textContent = `${elements.mainAvatarSize.value}px`;
  elements.subagentAvatarSizeValue.textContent = `${elements.subagentAvatarSize.value}px`;
  if (sizePreviewFrame !== null) return;
  sizePreviewFrame = requestAnimationFrame(() => {
    sizePreviewFrame = null;
    api.previewAvatarSizes({
      mainAvatarSize: Number(elements.mainAvatarSize.value),
      subagentAvatarSize: Number(elements.subagentAvatarSize.value),
    });
  });
}
function persistAvatarSizes() {
  void save({
    mainAvatarSize: Number(elements.mainAvatarSize.value),
    subagentAvatarSize: Number(elements.subagentAvatarSize.value),
  });
}
elements.mainAvatarSize.addEventListener('input', previewAvatarSizes);
elements.mainAvatarSize.addEventListener('change', persistAvatarSizes);
elements.subagentAvatarSize.addEventListener('input', previewAvatarSizes);
elements.subagentAvatarSize.addEventListener('change', persistAvatarSizes);
elements.labels.addEventListener('change', () => void save({ showLabels: elements.labels.checked }));
elements.agentDetails.addEventListener('change', () => void save({ showAgentDetails: elements.agentDetails.checked }));
elements.dormantAgents.addEventListener('change', () => void save({ showDormantAgents: elements.dormantAgents.checked }));
elements.autoEnable.addEventListener('change', () => void save({ autoEnableNewAvatars: elements.autoEnable.checked }));
elements.avatarAssignment.addEventListener('change', () => void save({ avatarAssignmentMode: elements.avatarAssignment.value }));
elements.reduceMotion.addEventListener('change', () => void save({ reducedMotion: elements.reduceMotion.checked }));

for (const radio of document.querySelectorAll('input[name="zone-mode"]')) {
  radio.addEventListener('change', async () => {
    if (!radio.checked) return;
    if (radio.value === 'custom') {
      const result = await api.pickCustomZone();
      if (result.cancelled) { renderSettings(); showToast(c().zoneCancelled); }
      return;
    }
    const patch = { mode: radio.value };
    if (radio.value === 'displays' && settings.zone.displayIds.length === 0) patch.displayIds = displays.map((display) => display.id);
    await save({ zone: patch });
  });
}

document.querySelector('#pick-zone').addEventListener('click', async () => {
  const result = await api.pickCustomZone();
  if (result.cancelled) showToast(c().zoneCancelled);
});
document.querySelector('#refresh-avatars').addEventListener('click', async () => {
  const result = await api.refreshLibrary(); avatars = result.avatars; renderAvatarGrid();
});
elements.marketplaceSearch.addEventListener('input', renderMarketplace);
elements.marketplaceCategory.addEventListener('change', renderMarketplace);
elements.refreshMarketplace.addEventListener('click', () => void refreshMarketplace(true));
document.querySelector('#open-marketplace').addEventListener('click', () => void api.openMarketplace());
document.querySelector('#open-submission-guide').addEventListener('click', () => void api.openSubmissionGuide());
elements.submissionPet.addEventListener('change', () => {
  elements.submitMarketplacePet.disabled = !elements.submissionPet.value;
});
elements.submitMarketplacePet.addEventListener('click', () => void openMarketplaceSubmissionDialog());
elements.submissionForm.elements.name.addEventListener('input', () => {
  const form = elements.submissionForm.elements;
  const suggestion = submissionSlug(form.name.value);
  if (!form.petSlug.value || form.petSlug.value === lastSuggestedSubmissionPetSlug) {
    form.petSlug.value = suggestion;
  }
  lastSuggestedSubmissionPetSlug = suggestion;
  refreshSuggestedCanonicalKey();
});
elements.submissionForm.elements.petSlug.addEventListener('input', () => refreshSuggestedCanonicalKey());
elements.submissionForm.elements.author.addEventListener('input', () => {
  lastAutomaticSubmissionAuthor = '';
  refreshSuggestedCanonicalKey();
});
elements.submissionForm.elements.author.addEventListener('change', () => {
  rememberSubmissionAuthor(elements.submissionForm.elements.author.value);
});
elements.submissionForm.elements.primaryCategory.addEventListener('change', () => refreshSuggestedCanonicalKey());
elements.submissionForm.elements.sourceType.addEventListener('change', updateSubmissionSourceNotes);
elements.connectGithub.addEventListener('click', async () => {
  setMarketplaceGithubDeviceCode('');
  marketplaceSubmissionBusy = true;
  marketplaceSubmissionOperation = 'connecting';
  setMarketplaceSubmissionProgress(c().submissionStage('waiting-for-github-authorization'));
  renderMarketplaceSubmissionStatus();
  try {
    const connectedStatus = await api.connectMarketplaceGithub();
    if (!elements.submissionDialog.open) return;
    marketplaceSubmissionStatus = connectedStatus;
    setMarketplaceGithubDeviceCode('');
    populateMarketplaceSubmissionOptions();
    updateSubmissionSourceNotes();
    defaultSubmissionIdentity();
    setMarketplaceSubmissionProgress(c().submissionStage('github-connected'));
  } catch (error) {
    console.error(error);
    setMarketplaceGithubDeviceCode('');
    if (elements.submissionDialog.open) setMarketplaceSubmissionProgress(friendlySubmissionError(error), true);
  } finally {
    marketplaceSubmissionBusy = false;
    marketplaceSubmissionOperation = '';
    renderMarketplaceSubmissionStatus();
  }
});
elements.copyGithubDeviceCode.addEventListener('click', async () => {
  if (!marketplaceGithubDeviceCode) return;
  try {
    await api.copyMarketplaceGithubDeviceCode(marketplaceGithubDeviceCode);
    showToast(c().githubCodeCopied);
  } catch (error) {
    setMarketplaceSubmissionProgress(friendlySubmissionError(error), true);
  }
});
elements.openGithubDevicePage.addEventListener('click', async () => {
  if (!marketplaceGithubDeviceCode) return;
  try {
    await api.openMarketplaceGithubAuthorization();
  } catch (error) {
    setMarketplaceSubmissionProgress(friendlySubmissionError(error), true);
  }
});
elements.submissionClose.addEventListener('click', () => closeMarketplaceSubmissionDialog());
elements.submissionCancel.addEventListener('click', () => closeMarketplaceSubmissionDialog());
elements.submissionDialog.addEventListener('cancel', (event) => {
  if (marketplaceSubmissionOperation === 'submitting') {
    event.preventDefault();
    return;
  }
  if (marketplaceSubmissionOperation === 'connecting') {
    event.preventDefault();
    closeMarketplaceSubmissionDialog();
  }
});
elements.submissionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedSubmissionAvatar || !elements.submissionForm.reportValidity()) return;
  if (!marketplaceSubmissionStatus?.github?.connected) {
    setMarketplaceSubmissionProgress(c().githubRequired, true);
    return;
  }
  marketplaceSubmissionBusy = true;
  marketplaceSubmissionOperation = 'submitting';
  rememberSubmissionAuthor(elements.submissionForm.elements.author.value);
  setMarketplaceSubmissionProgress(c().submissionStage('validating-local-pet'));
  renderMarketplaceSubmissionStatus();
  try {
    const result = await api.submitMarketplacePet(marketplaceSubmissionPayload());
    if (result.cancelled) {
      setMarketplaceSubmissionProgress(c().submissionStage('submission-cancelled'));
    } else {
      setMarketplaceSubmissionProgress(c().submissionStage('submission-complete'));
      showToast(c().submissionSuccess(result.url));
      closeMarketplaceSubmissionDialog(true);
    }
  } catch (error) {
    console.error(error);
    setMarketplaceSubmissionProgress(friendlySubmissionError(error), true);
    showToast(c().submissionError);
  } finally {
    marketplaceSubmissionBusy = false;
    marketplaceSubmissionOperation = '';
    renderMarketplaceSubmissionStatus();
  }
});
elements.reportClose.addEventListener('click', closeMarketplaceReportDialog);
elements.reportCancel.addEventListener('click', closeMarketplaceReportDialog);
elements.reportDialog.addEventListener('cancel', () => {
  selectedReportPet = null;
  elements.reportConfirm.disabled = false;
});
elements.reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedReportPet || !elements.reportForm.reportValidity()) return;
  elements.reportConfirm.disabled = true;
  try {
    await api.reportMarketplacePet(selectedReportPet.slug, {
      reason: elements.reportForm.elements.reason.value,
      details: elements.reportForm.elements.details.value.trim(),
    });
    closeMarketplaceReportDialog();
    showToast(c().reportOpened);
  } catch (error) {
    console.error(error);
    elements.reportConfirm.disabled = false;
    showToast(c().reportOpenError);
  }
});
elements.briefForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const brief = avatarBrief();
  if (!brief.appearance) { showToast(c().appearanceRequired); return; }
  try {
    const result = await api.createAvatar(brief);
    showToast(result.opened ? c().promptOpened : c().promptFallback);
  } catch { showToast(c().promptFallback); }
});
document.querySelector('#copy-prompt').addEventListener('click', async () => {
  const brief = avatarBrief();
  if (!brief.appearance) { showToast(c().appearanceRequired); return; }
  await api.copyCreatePrompt(brief); showToast(c().promptCopied);
});
document.querySelector('#import-pet').addEventListener('click', async () => {
  try {
    const result = await api.importPet();
    if (!result.cancelled) showToast(c().imported(result.imported.displayName || result.imported.id));
  } catch { showToast(c().importError); }
});
document.querySelector('#open-pet-folder').addEventListener('click', () => void api.openPetDirectory());
document.querySelector('#pets-docs-button').addEventListener('click', () => void api.openPetsDocs());
elements.demoButton.addEventListener('click', async () => {
  const result = await api.runDemo(); demoRunning = result.running; localize(); renderSettings();
});
elements.openPluginButton.addEventListener('click', async () => {
  const result = await api.openPlugin(); showToast(result.opened ? c().pluginOpened : c().pluginUnavailable);
});
document.querySelector('#onboarding-plugin-button').addEventListener('click', async () => {
  const result = await api.openPlugin(); showToast(result.opened ? c().pluginOpened : c().pluginUnavailable);
});
elements.hooksButton.addEventListener('click', async () => {
  const result = hooksInstalled ? await api.uninstallHooks() : await api.installHooks();
  hooksInstalled = result.installed; localize(); renderSettings(); showToast(hooksInstalled ? c().hooksOn : c().hooksOff);
});
elements.onboardingBack.addEventListener('click', () => { onboardingStep = Math.max(0, onboardingStep - 1); renderOnboarding(); });
elements.onboardingNext.addEventListener('click', async () => {
  if (onboardingStep < 3) { onboardingStep += 1; renderOnboarding(); return; }
  await save({ onboardingCompleted: true, pluginOnboardingShown: true });
  elements.onboarding.close();
});
document.querySelector('#onboarding-close').addEventListener('click', () => elements.onboarding.close());

api.onState(updateActiveCount);
api.onSettings((value) => { settings = value.settings; displays = value.displays; localize(); renderSettings(); });
api.onLibrary((value) => { avatars = value.avatars || []; renderAvatarGrid(); renderMarketplace(); });
api.onDemo((value) => { demoRunning = Boolean(value.running); localize(); renderSettings(); });
api.onMarketplaceSubmissionProgress((value) => {
  if (!elements.submissionDialog.open) return;
  if (value?.stage === 'github-device-code-copied') {
    setMarketplaceGithubDeviceCode(value.code);
  }
  if (value?.login && marketplaceSubmissionStatus) {
    marketplaceSubmissionStatus.github = { installed: true, connected: true, login: value.login };
    renderMarketplaceSubmissionStatus();
  }
  const message = c().submissionStage(value?.stage);
  if (message) setMarketplaceSubmissionProgress(message);
});

async function initialize() {
  const bootstrap = await api.getBootstrap();
  settings = bootstrap.settings;
  avatars = bootstrap.avatars;
  displays = bootstrap.displays;
  hooksInstalled = bootstrap.hooks.installed;
  pluginAvailable = bootstrap.plugin.available;
  demoRunning = Boolean(bootstrap.demo?.running);
  elements.openPluginButton.disabled = !pluginAvailable;
  document.querySelector('#onboarding-plugin-button').disabled = !pluginAvailable;
  elements.startup.checked = bootstrap.launchAtLogin;
  setText('#version', `v${displayVersion(bootstrap.version)}`);
  localize();
  updateActiveCount(bootstrap.state);
  renderSettings();
  if (!settings.onboardingCompleted && !bootstrap.settingsCapture) openOnboarding();
  void refreshMarketplace(false);
}

void initialize().catch((error) => console.error(error));
