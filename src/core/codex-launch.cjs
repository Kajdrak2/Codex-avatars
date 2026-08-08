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

  if (french) {
    return [
      'Utilise $create-codex-avatar pour créer puis installer un avatar animé Codex Pet v2 soigné dans ma bibliothèque locale Codex Avatars.',
      '',
      'Brief du personnage :',
      details,
      '',
      'Suis le workflow hatch-pet complet : les 9 lignes d’animation, les 16 directions de regard, la validation déterministe de l’atlas 1536 × 2288 et le contrôle visuel final. Demande-moi uniquement les informations réellement manquantes.',
    ].join('\n');
  }

  return [
    'Use $create-codex-avatar to create and install a polished animated Codex Pet v2 avatar in my local Codex Avatars library.',
    '',
    'Character brief:',
    details,
    '',
    'Follow the complete hatch-pet workflow: all 9 animation rows, 16 look directions, deterministic 1536 × 2288 atlas validation, and final visual QA. Ask only for information that is genuinely missing.',
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
