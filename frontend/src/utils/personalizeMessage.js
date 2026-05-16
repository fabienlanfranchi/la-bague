/**
 * Résout les placeholders d'un message personnalisé selon le membre destinataire.
 * Placeholders pris en charge :
 *   - {{NOM_COMPLET}}     → m.nom_complet
 *   - {{NB_COTISATIONS}}  → m.situation_cotisation (nombre)
 *   - {{MONTANT_DU}}      → situation_cotisation × 200 (+ dettes optionnelles)
 *   - {{DETAIL_DETTES}}   → liste textuelle des dettes (libellé + montant)
 *   - {{PROFILE_URL}}     → URL profil
 *   - {{DASHBOARD_URL}}   → URL dashboard
 */
const COTISATION_AMOUNT = 200;

export const personalizeMessage = (text, member, dettes = []) => {
  if (!text || !member) return text || '';
  const nb = Number(member.situation_cotisation || 0);
  const dettesSum = (dettes || []).reduce((s, d) => s + Number(d.montant || 0), 0);
  const montantDu = nb * COTISATION_AMOUNT + dettesSum;
  const detailDettes = (dettes || [])
    .map((d) => `  • ${d.libelle || 'Dette'} : ${Number(d.montant || 0)} €`)
    .join('\n');

  return text
    .replaceAll('{{NOM_COMPLET}}', member.nom_complet || 'Cher membre')
    .replaceAll('{{NB_COTISATIONS}}', String(nb))
    .replaceAll('{{MONTANT_DU}}', String(montantDu))
    .replaceAll('{{DETAIL_DETTES}}', detailDettes)
    .replaceAll('{{PROFILE_URL}}', 'https://labagueimperiale.optizioni.app/profil')
    .replaceAll('{{DASHBOARD_URL}}', 'https://labagueimperiale.optizioni.app/dashboard');
};
