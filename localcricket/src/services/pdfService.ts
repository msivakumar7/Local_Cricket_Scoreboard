import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MatchState, BatterStats, BowlerStats } from '../domain/types';
import { legalBallsToOverString, calculateCRR } from '../domain/rules';

export function generateMatchPDF(state: MatchState): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const config = state.config;
  const pageW = doc.internal.pageSize.getWidth();

  function getTeamName(id: string) {
    return id === config.teamA.id ? config.teamA.name : config.teamB.name;
  }
  function getPlayerName(teamId: string, playerId: string) {
    const team = teamId === config.teamA.id ? config.teamA : config.teamB;
    return team.players.find(p => p.id === playerId)?.name ?? playerId;
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 101, 192);
  doc.text('LocalCricket Scorecard', pageW / 2, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(23, 43, 77);
  doc.text(`${config.teamA.name} vs ${config.teamB.name}`, pageW / 2, 26, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(96, 117, 138);
  const dateStr = new Date(config.date).toLocaleDateString('en-IN', { dateStyle: 'long' });
  doc.text(`${config.format.oversPerInnings} overs · ${dateStr}${config.venue ? ' · ' + config.venue : ''}`, pageW / 2, 32, { align: 'center' });

  if (state.result) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 101, 192);
    doc.text(state.result.resultText, pageW / 2, 39, { align: 'center' });
  }

  let y = 46;

  state.innings.forEach((innings, idx) => {
    const battingTeamName = getTeamName(innings.battingTeamId);
    const crr = calculateCRR(innings.totalRuns, innings.legalBalls);

    // Innings header
    doc.setFillColor(13, 71, 161);
    doc.rect(10, y, pageW - 20, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${battingTeamName} — Innings ${innings.inningsNumber}: ${innings.totalRuns}/${innings.wickets} (${legalBallsToOverString(innings.legalBalls)} ov, CRR ${crr.toFixed(2)})`,
      14, y + 5.5
    );
    y += 12;

    // Build batting rows
    const batterOrder = innings.battingOrder
      .map(id => innings.batterStats[id])
      .filter(Boolean) as BatterStats[];

    const battingRows = batterOrder.map(b => [
      getPlayerName(innings.battingTeamId, b.playerId),
      b.isRetiredHurt ? 'retired hurt' : b.isOut ? (b.dismissalText || 'out') : !b.didBat ? 'did not bat' : 'not out',
      b.didBat ? String(b.runs) : '—',
      b.didBat ? String(b.balls) : '—',
      b.didBat ? String(b.fours) : '—',
      b.didBat ? String(b.sixes) : '—',
      b.didBat ? b.strikeRate.toFixed(0) : '—',
    ]);

    // Add extras and total
    battingRows.push([
      'Extras', `W ${innings.extras.wides} NB ${innings.extras.noBalls} B ${innings.extras.byes} LB ${innings.extras.legByes}`,
      String(innings.extras.total), '', '', '', '',
    ]);
    battingRows.push([
      'TOTAL', `${innings.wickets} wkts, ${legalBallsToOverString(innings.legalBalls)} ov`,
      String(innings.totalRuns), '', '', '', '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Batter', 'Dismissal', 'R', 'B', '4s', '6s', 'SR']],
      body: battingRows,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 14 },
        4: { halign: 'right', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 18 },
      },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // Fall of wickets
    if (innings.fallOfWickets.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(96, 117, 138);
      doc.text('Fall of Wickets:', 10, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(23, 43, 77);
      const fowText = innings.fallOfWickets
        .map(f => `${f.wicketNumber}-${f.score} (${getPlayerName(innings.battingTeamId, f.batterId)}, ${f.overText})`)
        .join('  ');
      const fowLines = doc.splitTextToSize(fowText, pageW - 20);
      doc.text(fowLines, 10, y);
      y += fowLines.length * 4 + 4;
    }

    // Bowling
    const bowlerOrder = [...new Set(innings.deliveries.map(d => d.bowlerId))];
    const bowlers = bowlerOrder.map(id => innings.bowlerStats[id]).filter(Boolean) as BowlerStats[];
    const bowlingRows = bowlers.map(b => [
      getPlayerName(innings.bowlingTeamId, b.playerId),
      legalBallsToOverString(b.legalBalls),
      String(b.maidens),
      String(b.runs),
      String(b.wickets),
      b.economy.toFixed(2),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Bowler', 'O', 'M', 'R', 'W', 'ECON']],
      body: bowlingRows,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'right', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 20 },
      },
      alternateRowStyles: { fillColor: [245, 249, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (idx < state.innings.length - 1 && y > 240) {
      doc.addPage();
      y = 15;
    }
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(96, 117, 138);
    doc.text(`Page ${i} of ${pageCount} — Generated by LocalCricket`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  const filename = `${config.teamA.name.replace(/\s+/g, '_')}_vs_${config.teamB.name.replace(/\s+/g, '_')}_${config.date}.pdf`;
  doc.save(filename);
}
