'use strict';

const FIELD_LIMITS = Object.freeze({
  name: 80,
  appearance: 1_200,
  style: 80,
  personality: 400,
  palette: 240,
  props: 400,
  avoid: 400,
});

function cleanField(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeAvatarBrief(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) result[key] = cleanField(source[key], limit);
  if (!result.appearance) throw new Error('An appearance description is required.');
  return result;
}

function buildAvatarPrompt(value, language = 'en') {
  const brief = normalizeAvatarBrief(value);
  const french = language === 'fr';
  const labels = french
    ? { name: 'Nom', appearance: 'Apparence', style: 'Style', personality: 'Personnalité', palette: 'Couleurs', props: 'Accessoires', avoid: 'À éviter' }
    : { name: 'Name', appearance: 'Appearance', style: 'Style', personality: 'Personality', palette: 'Colors', props: 'Props', avoid: 'Avoid' };
  const details = Object.entries(labels)
    .filter(([key]) => brief[key])
    .map(([key, label]) => `- ${label}: ${brief[key]}`)
    .join('\n');

  const completionRequirement = french
    ? "Ne t'arrete pas apres l'assemblage ou la validation structurelle. Termine les trois revues de directions a l'aveugle et le controle visuel final, puis installe ensemble pet.json et spritesheet.webp sous `%USERPROFILE%/.codex/pets/<pet-id>` avant de declarer la reussite."
    : 'Do not stop after atlas assembly or structural validation. Complete the three blind direction reviews and final visual QA, then install pet.json and spritesheet.webp together under `%USERPROFILE%/.codex/pets/<pet-id>` before reporting success.';
  const chromaRequirement = french
    ? "Avant de generer, choisis une couleur chroma precise et interdis exactement cette couleur dans le personnage. Pour une palette arc-en-ciel, ne suppose pas que le magenta ou le cyan sont absents : reserve explicitement la couleur chroma dans les prompts et dans la palette a eviter."
    : 'Before generating, choose one exact chroma-key color and explicitly exclude it from the character. For a rainbow palette, do not assume magenta or cyan is absent: reserve the chroma color in the prompts and the palette to avoid.';

  if (french) {
    return [
      'Utilise directement $hatch-pet pour créer puis installer un avatar animé Codex Pet v2 soigné dans ma bibliothèque locale Codex Avatars. N’invoque pas de skill wrapper avant Hatch Pet.',
      '',
      'Brief du personnage :',
      details,
      completionRequirement,
      chromaRequirement,
      '',
      'Avant tout script Python ou validateur, appelle load_workspace_dependencies, utilise le chemin Python exact qu’il retourne et vérifie que Pillow peut être importé. N’utilise jamais la commande Python système comme solution de repli.',
      '',
      'Suis le workflow $hatch-pet complet : les 9 lignes d’animation, les 16 directions de regard, la validation déterministe de l’atlas 1536 × 2288 et le contrôle visuel final. Si le runtime fourni est temporairement indisponible, arrête-toi sans créer de fichiers incomplets et conserve un point de reprise clair. Demande-moi uniquement les informations réellement manquantes.',
    ].join('\n');
  }

  return [
    'Use $hatch-pet directly to create and install a polished animated Codex Pet v2 avatar in my local Codex Avatars library. Do not invoke a wrapper skill before Hatch Pet.',
    '',
    'Character brief:',
    details,
    completionRequirement,
    chromaRequirement,
    '',
    'Before running any Python script or validator, call load_workspace_dependencies, use the exact Python path it returns, and verify that Pillow imports successfully. Never fall back to the system Python command.',
    '',
    'Follow the complete $hatch-pet workflow: all 9 animation rows, 16 look directions, deterministic 1536 × 2288 atlas validation, and final visual QA. If the bundled runtime is temporarily unavailable, stop without creating incomplete files and leave a clear resume point. Ask only for information that is genuinely missing.',
  ].join('\n');
}

function codexNewThreadUrl(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A prompt is required.');
  return `codex://threads/new?prompt=${encodeURIComponent(prompt)}`;
}

module.exports = {
  buildAvatarPrompt,
  codexNewThreadUrl,
  normalizeAvatarBrief,
};
