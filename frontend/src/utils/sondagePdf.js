import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Génère un PDF officiel "La Bague Impériale" avec les résultats d'un sondage.
 * Retourne le blob pour partage ou déclenche le téléchargement.
 */
export const generateSondagePdf = (sondage, { download = true } = {}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 60;

  const GOLD = [212, 160, 36];
  const BORDEAUX = [122, 32, 32];
  const DARK = [30, 30, 30];

  // ===== EN-TÊTE =====
  doc.setFillColor(...BORDEAUX);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('La Bague Impériale', marginX, 45);
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Club de cigares depuis 2013', marginX, 62);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Document officiel — Résultats de sondage', marginX, 78);

  y = 125;

  // ===== TITRE DU SONDAGE =====
  doc.setTextColor(...DARK);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  const titre = sondage.titre || sondage.question || 'Sondage';
  const titreLines = doc.splitTextToSize(titre, pageWidth - 2 * marginX);
  doc.text(titreLines, marginX, y);
  y += titreLines.length * 20 + 8;

  // ===== MÉTADONNÉES =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const isAnonyme = sondage.is_anonyme !== false;
  const statut = sondage.status === 'termine' ? 'Clôturé' : 'Actif';
  const dateCreation = sondage.created_at
    ? new Date(sondage.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const dateFin = sondage.date_fin
    ? new Date(sondage.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Non définie';
  const meta = `Statut : ${statut}    ·    Confidentialité : ${isAnonyme ? 'Anonyme' : 'Public'}    ·    ${sondage.total_votes || 0} vote(s)`;
  doc.text(meta, marginX, y);
  y += 14;
  doc.text(`Créé le ${dateCreation}    ·    Date de fin : ${dateFin}`, marginX, y);
  y += 22;

  // Ligne de séparation dorée
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  // ===== QUESTIONS / RÉSULTATS =====
  const questions = sondage.questions?.length > 0
    ? sondage.questions
    : [{
        question: sondage.question || titre,
        options: sondage.options || [],
        vote_counts: sondage.votes || [],
        voters_by_option: sondage.voters_by_option,
      }];

  questions.forEach((q, qi) => {
    // Si on dépasse la page, en créer une nouvelle
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 60;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BORDEAUX);
    const qLines = doc.splitTextToSize(`${qi + 1}. ${q.question}`, pageWidth - 2 * marginX);
    doc.text(qLines, marginX, y);
    y += qLines.length * 16 + 4;

    const votes = q.vote_counts || [];
    const total = votes.reduce((s, v) => s + v, 0);

    // Tableau des résultats
    const head = [[
      'Option',
      'Votes',
      '%',
      ...(isAnonyme ? [] : ['Votants']),
    ]];
    const body = (q.options || []).map((opt, oi) => {
      const count = votes[oi] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const row = [opt, String(count), `${pct} %`];
      if (!isAnonyme) {
        const voters = q.voters_by_option?.[oi] || [];
        row.push(voters.length > 0 ? voters.join(', ') : '—');
      }
      return row;
    });

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, textColor: [40, 40, 40], cellPadding: 6 },
      headStyles: { fillColor: GOLD, textColor: BORDEAUX, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 244, 230] },
      columnStyles: isAnonyme
        ? { 0: { cellWidth: 280 }, 1: { halign: 'center', cellWidth: 60 }, 2: { halign: 'center', cellWidth: 60 } }
        : { 0: { cellWidth: 180 }, 1: { halign: 'center', cellWidth: 50 }, 2: { halign: 'center', cellWidth: 50 }, 3: { cellWidth: 'auto' } },
      margin: { left: marginX, right: marginX },
    });

    y = doc.lastAutoTable.finalY + 24;
  });

  // ===== PIED DE PAGE =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 50, pageWidth - marginX, pageHeight - 50);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'La Bague Impériale — Fondée en 2013 — Document généré automatiquement',
      pageWidth / 2,
      pageHeight - 32,
      { align: 'center' }
    );
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: 'right' });
    const now = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.text(now, marginX, pageHeight - 20);
  }

  const filename = `sondage_${(titre || 'resultats')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}_${new Date().toISOString().slice(0, 10)}.pdf`;

  if (download) {
    doc.save(filename);
  }

  return { blob: doc.output('blob'), filename };
};

/**
 * Ouvre le PDF dans un nouvel onglet (utile pour prévisualisation avant partage)
 */
export const openSondagePdf = (sondage) => {
  const { blob } = generateSondagePdf(sondage, { download: false });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
