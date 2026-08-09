'use strict';

const FEEDBACK_BASE_URL = 'https://github.com/Kajdrak2/Codex-avatars/issues/new';
const PET_REPORT_BASE_URL = 'https://github.com/Kajdrak2/awesome-codex-pet/issues/new';
const FEEDBACK_KINDS = new Set(['bug', 'suggestion']);
const PET_REPORT_REASONS = Object.freeze([
  'copyright',
  'inappropriate',
  'duplicate',
  'broken',
  'impersonation',
  'other',
]);
const PET_REPORT_REPOSITORIES = new Set([
  'Kajdrak2/awesome-codex-pet',
  'legeling/awesome-codex-pet',
]);

function buildFeedbackUrl({ kind, version, language = 'en' }) {
  if (!FEEDBACK_KINDS.has(kind)) throw new Error('Unsupported feedback type.');
  const french = language === 'fr';
  const safeVersion = String(version || 'unknown').trim().slice(0, 64) || 'unknown';
  const url = new URL(FEEDBACK_BASE_URL);
  url.searchParams.set('title', kind === 'bug' ? '[Bug] ' : '[Suggestion] ');
  url.searchParams.set('labels', kind === 'bug' ? 'bug' : 'enhancement');
  url.searchParams.set('body', feedbackBody({ kind, version: safeVersion, french }));
  return url.toString();
}

function feedbackBody({ kind, version, french }) {
  if (kind === 'bug') {
    return french
      ? `### Problème rencontré\n\nDécrivez clairement le problème.\n\n### Étapes pour le reproduire\n\n1. \n2. \n3. \n\n### Résultat attendu\n\n\n### Environnement\n\n- Codex Avatars : ${version}\n- Version de Windows : \n- Nombre et disposition des écrans : \n\n### Captures ou journaux utiles\n\nAjoutez uniquement des informations ne contenant aucun secret ni donnée personnelle.`
      : `### What happened?\n\nDescribe the problem clearly.\n\n### Steps to reproduce\n\n1. \n2. \n3. \n\n### Expected behavior\n\n\n### Environment\n\n- Codex Avatars: ${version}\n- Windows version: \n- Display count and layout: \n\n### Helpful screenshots or logs\n\nInclude only information that contains no secrets or personal data.`;
  }
  return french
    ? `### Suggestion\n\nDécrivez l’amélioration souhaitée.\n\n### Problème ou besoin\n\nQuel usage cette suggestion faciliterait-elle ?\n\n### Fonctionnement proposé\n\nComment devrait-elle fonctionner dans Codex Avatars ?\n\n### Informations complémentaires\n\n- Codex Avatars : ${version}`
    : `### Suggestion\n\nDescribe the improvement you would like.\n\n### Problem or need\n\nWhat workflow would this suggestion improve?\n\n### Proposed behavior\n\nHow should it work in Codex Avatars?\n\n### Additional context\n\n- Codex Avatars: ${version}`;
}

function reportText(value, maximum) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maximum);
}

function reportReason(reason, french) {
  const labels = french
    ? {
        copyright: 'Problème de droits d’auteur ou d’attribution',
        inappropriate: 'Contenu inapproprié ou dangereux',
        duplicate: 'Entrée dupliquée ou trompeuse',
        broken: 'Pet cassé ou invalide',
        impersonation: 'Usurpation ou identité trompeuse',
        other: 'Autre problème',
      }
    : {
        copyright: 'Copyright or attribution concern',
        inappropriate: 'Inappropriate or unsafe content',
        duplicate: 'Duplicate or misleading listing',
        broken: 'Broken or invalid Pet',
        impersonation: 'Impersonation or deceptive identity',
        other: 'Other concern',
      };
  return labels[reason];
}

function buildPetReportUrl({ pet, reason, details, version, language = 'en' }) {
  if (!PET_REPORT_REASONS.includes(reason)) throw new Error('Unsupported Pet report reason.');
  if (!pet || typeof pet !== 'object' || Array.isArray(pet)) throw new Error('The reported Pet is invalid.');

  const slug = reportText(pet.slug, 128).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(slug)) throw new Error('The reported Pet id is invalid.');
  const repository = reportText(pet.repository, 128);
  if (!PET_REPORT_REPOSITORIES.has(repository)) throw new Error('The reported Pet source is not trusted.');
  const ref = reportText(pet.ref, 128);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(ref)) throw new Error('The reported Pet revision is invalid.');
  const explanation = reportText(details, 2_000);
  if (explanation.length < 10) throw new Error('A short explanation is required for a Pet report.');

  const french = language === 'fr';
  const name = reportText(pet.name, 120).replace(/\s+/g, ' ') || slug;
  const safeVersion = reportText(version || 'unknown', 64).replace(/\s+/g, ' ') || 'unknown';
  const sourceUrl = `https://github.com/${repository}/tree/${encodeURIComponent(ref)}/pets/${encodeURIComponent(slug)}`;
  const url = new URL(PET_REPORT_BASE_URL);
  url.searchParams.set('title', `[Pet report] ${name} (${slug})`);
  url.searchParams.set('labels', 'pet-report');
  url.searchParams.set('body', french
    ? `### Pet signalé\n\n- Nom : ${name}\n- Identifiant catalogue : \`${slug}\`\n- Dépôt source : \`${repository}\`\n- Révision source : \`${ref}\`\n- Fichiers publics : ${sourceUrl}\n\n### Motif\n\n${reportReason(reason, true)}\n\n### Détails\n\n${explanation}\n\n### Informations\n\n- Rapport préparé dans Codex Avatars ${safeVersion}\n- Ce rapport est public. Retirez toute donnée personnelle ou secrète avant de l’envoyer.`
    : `### Reported Pet\n\n- Name: ${name}\n- Catalog id: \`${slug}\`\n- Source repository: \`${repository}\`\n- Source revision: \`${ref}\`\n- Public files: ${sourceUrl}\n\n### Reason\n\n${reportReason(reason, false)}\n\n### Details\n\n${explanation}\n\n### Information\n\n- Report prepared in Codex Avatars ${safeVersion}\n- This report is public. Remove any personal or secret information before submitting it.`);
  return url.toString();
}

module.exports = {
  FEEDBACK_BASE_URL,
  PET_REPORT_BASE_URL,
  PET_REPORT_REASONS,
  buildFeedbackUrl,
  buildPetReportUrl,
};
