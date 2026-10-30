import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../assets/logoBase64';
import type { MatchState, BatterStats, BowlerStats } from '../domain/types';
import { legalBallsToOverString, calculateCRR } from '../domain/rules';

export function generateMatchPDF(state: MatchState): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const config = state.config;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageW - marginLeft - marginRight; // 182mm

  function getTeamName(id: string) {
    return id === config.teamA.id ? config.teamA.name : config.teamB.name;
  }
  function getPlayerName(teamId: string, playerId: string) {
    const team = teamId === config.teamA.id ? config.teamA : config.teamB;
    return team.players.find(p => p.id === playerId)?.name ?? playerId;
  }

  let y = 12;

  // 1. Official Crowned Golden Lion Logo & Header Branding
  const logoW = 16;
  const logoH = 18.9; // Aspect ratio of 498 x 588
  try {
    doc.addImage(LOGO_BASE64, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
  } catch {
    // Graceful fallback if image decoding fails in test environment
  }
  y += logoH + 3.5;

  // App Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 71, 161); // #0D47A1
  doc.text('LOCAL CRICKET SCORECARD', pageW / 2, y, { align: 'center' });
  y += 5.5;

  // Match Title & Opponents
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(23, 43, 77); // #172B4D
  doc.text(`${config.teamA.name}  vs  ${config.teamB.name}`, pageW / 2, y, { align: 'center' });
  y += 4.5;

  // Match Metadata: Format, Date, Venue
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(96, 117, 138); // #60758A
  const dateStr = new Date(config.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const venueText = config.venue ? ` · Venue: ${config.venue}` : '';
  doc.text(`${config.title} · ${config.format.oversPerInnings} Overs Match · ${dateStr}${venueText}`, pageW / 2, y, { align: 'center' });
  y += 6.5;

  // 2. Highlighted Match Result Box
  if (state.result && state.result.resultText) {
    const resultText = state.result.resultText.toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);

    const splitResult = doc.splitTextToSize(resultText, contentWidth - 16);
    const boxHeight = Math.max(8, 5 + splitResult.length * 4.5);

    // Subtle blue highlighted container with accent border
    doc.setFillColor(235, 245, 254); // #EBF5FE
    doc.setDrawColor(33, 150, 243);  // #2196F3
    doc.roundedRect(marginLeft, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(13, 71, 161);
    const textOffsetY = y + (boxHeight / 2) + (splitResult.length === 1 ? 1.5 : 0);
    doc.text(splitResult, pageW / 2, textOffsetY, { align: 'center' });
    y += boxHeight + 6;
  }

  // 3. Process Each Innings
  state.innings.forEach((innings) => {
    // If not enough vertical space remains for innings start, break to next page
    if (y > pageH - 75) {
      doc.addPage();
      y = 15;
    }

    const battingTeamName = getTeamName(innings.battingTeamId);
    const bowlingTeamName = getTeamName(innings.bowlingTeamId);
    const crr = calculateCRR(innings.totalRuns, innings.legalBalls);

    // Innings Header Banner
    doc.setFillColor(13, 71, 161); // #0D47A1
    doc.roundedRect(marginLeft, y, contentWidth, 7.5, 1, 1, 'F');
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${battingTeamName} Innings — ${innings.totalRuns}/${innings.wickets} (${legalBallsToOverString(innings.legalBalls)} ov, CRR ${crr.toFixed(2)})`,
      marginLeft + 4,
      y + 5.2
    );
    y += 10;

    // Batting Section Heading
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(96, 117, 138);
    doc.text('BATTING', marginLeft, y);
    y += 3;

    // Build Batting Rows
    const batterOrder = innings.battingOrder
      .map(id => innings.batterStats[id])
      .filter(Boolean) as BatterStats[];

    const battingTableBody: (string | { content: string; colSpan?: number; styles?: any })[][] = [];

    // Individual Batter Rows
    batterOrder.forEach(b => {
      const pName = getPlayerName(innings.battingTeamId, b.playerId);
      const dismissalStr = b.isRetiredHurt
        ? 'retired hurt'
        : b.isOut
          ? (b.dismissalText || 'out')
          : !b.didBat
            ? 'did not bat'
            : 'not out';

      battingTableBody.push([
        pName,
        dismissalStr,
        b.didBat ? String(b.runs) : '—',
        b.didBat ? String(b.balls) : '—',
        b.didBat ? String(b.fours) : '—',
        b.didBat ? String(b.sixes) : '—',
        b.didBat ? b.strikeRate.toFixed(1) : '—',
      ]);
    });

    // Extras Row
    const extrasDetail = `(b ${innings.extras.byes}, lb ${innings.extras.legByes}, w ${innings.extras.wides}, nb ${innings.extras.noBalls}${innings.extras.penalties ? `, p ${innings.extras.penalties}` : ''})`;
    battingTableBody.push([
      { content: 'Extras', styles: { fontStyle: 'bold', textColor: [23, 43, 77] } },
      { content: extrasDetail, styles: { textColor: [96, 117, 138] } },
      { content: String(innings.extras.total), styles: { fontStyle: 'bold', halign: 'right' } },
      '', '', '', '',
    ]);

    // Total Score Row
    const totalDetail = `${legalBallsToOverString(innings.legalBalls)} Overs, RR: ${crr.toFixed(2)} (${innings.wickets} wkts)`;
    battingTableBody.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold', textColor: [13, 71, 161] } },
      { content: totalDetail, styles: { fontStyle: 'bold', textColor: [13, 71, 161] } },
      { content: String(innings.totalRuns), styles: { fontStyle: 'bold', halign: 'right', textColor: [13, 71, 161], fontSize: 9 } },
      '', '', '', '',
    ]);

    // Did Not Bat Row (if any squad player did not bat)
    const teamObj = innings.battingTeamId === config.teamA.id ? config.teamA : config.teamB;
    const didNotBatNames = teamObj.players
      .filter(p => !innings.battingOrder.includes(p.id) || !innings.batterStats[p.id]?.didBat)
      .map(p => p.name);

    if (didNotBatNames.length > 0) {
      battingTableBody.push([
        { content: 'Did not bat', styles: { fontStyle: 'italic', textColor: [96, 117, 138] } },
        { content: didNotBatNames.join(', '), colSpan: 6, styles: { textColor: [96, 117, 138], fontStyle: 'normal' } },
      ]);
    }

    // AutoTable Batting Grid: Full 182mm width matching page layout
    autoTable(doc, {
      startY: y,
      head: [['Batter', 'Dismissal', 'R', 'B', '4s', '6s', 'SR']],
      body: battingTableBody,
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [23, 43, 77],
        lineColor: [220, 231, 245],
        lineWidth: 0.15,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [21, 101, 192], // #1565C0
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 42 },
        1: { halign: 'left', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 16 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 16 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 253],
      },
      didParseCell: (data) => {
        // Highlight Extras and Total rows with distinctive styling
        const rowIndex = data.row.index;
        const totalRows = battingTableBody.length;
        const isTotalRow = rowIndex === totalRows - (didNotBatNames.length > 0 ? 2 : 1);
        const isExtrasRow = rowIndex === totalRows - (didNotBatNames.length > 0 ? 3 : 2);

        if (isTotalRow) {
          data.cell.styles.fillColor = [227, 242, 253]; // #E3F2FD
        } else if (isExtrasRow) {
          data.cell.styles.fillColor = [240, 246, 253];
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 4.5;

    // 4. Fall of Wickets Structured Grid
    if (innings.fallOfWickets.length > 0) {
      if (y > pageH - 45) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(96, 117, 138);
      doc.text('FALL OF WICKETS', marginLeft, y);
      y += 3;

      const fowItems = innings.fallOfWickets.map(
        f => `${f.wicketNumber}-${f.score} (${getPlayerName(innings.battingTeamId, f.batterId)}, ${f.overText} ov)`
      );

      // Distribute in up to 3 columns per row
      const fowRows: string[][] = [];
      for (let k = 0; k < fowItems.length; k += 3) {
        fowRows.push([
          fowItems[k] || '',
          fowItems[k + 1] || '',
          fowItems[k + 2] || '',
        ]);
      }

      autoTable(doc, {
        startY: y,
        body: fowRows,
        margin: { left: marginLeft, right: marginRight },
        tableWidth: contentWidth,
        styles: {
          fontSize: 7.8,
          cellPadding: 1.8,
          textColor: [23, 43, 77],
          lineColor: [220, 231, 245],
          lineWidth: 0.15,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 253],
        },
        theme: 'grid',
      });

      y = (doc as any).lastAutoTable.finalY + 4.5;
    }

    // 5. Bowling Scorecard Table: Exactly 182mm wide matching batting table
    if (y > pageH - 45) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(96, 117, 138);
    doc.text(`BOWLING — ${bowlingTeamName.toUpperCase()}`, marginLeft, y);
    y += 3;

    const bowlerOrder = [...new Set(innings.deliveries.map(d => d.bowlerId))];
    const bowlers = bowlerOrder
      .map(id => innings.bowlerStats[id])
      .filter(Boolean) as BowlerStats[];

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
      body: bowlingRows.length > 0 ? bowlingRows : [['No bowling data', '—', '—', '—', '—', '—']],
      margin: { left: marginLeft, right: marginRight },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [23, 43, 77],
        lineColor: [220, 231, 245],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [21, 101, 192],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 72 },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
        5: { halign: 'right', cellWidth: 22 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 253],
      },
    });

    y = (doc as any).lastAutoTable.finalY + 4.5;

    // 6. Partnerships Breakdown
    const validPartnerships = innings.partnerships.filter(p => p.runs > 0 || p.isActive);
    if (validPartnerships.length > 0) {
      if (y > pageH - 35) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(96, 117, 138);
      doc.text('PARTNERSHIPS', marginLeft, y);
      y += 3;

      const partRows = validPartnerships.map(p => [
        `${getPlayerName(innings.battingTeamId, p.batterAId)} & ${getPlayerName(innings.battingTeamId, p.batterBId)}`,
        `${p.runs} runs (${p.balls} balls)`,
        p.wicketNumber ? `For wicket ${p.wicketNumber}` : (p.isActive ? 'Active unbroken' : 'Completed'),
      ]);

      autoTable(doc, {
        startY: y,
        body: partRows,
        margin: { left: marginLeft, right: marginRight },
        tableWidth: contentWidth,
        styles: {
          fontSize: 7.8,
          cellPadding: 1.8,
          textColor: [23, 43, 77],
          lineColor: [220, 231, 245],
          lineWidth: 0.15,
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 52 },
          2: { cellWidth: 50, textColor: [96, 117, 138] },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 253],
        },
        theme: 'grid',
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }
  });

  // 7. Page Footers & Numbering on Every Page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageH - 9;

    // Subtle divider line
    doc.setDrawColor(220, 231, 245);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, footerY - 3, pageW - marginRight, footerY - 3);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(96, 117, 138);

    doc.text('Local Cricket Scorecard', marginLeft, footerY);
    doc.text(`${config.teamA.name} vs ${config.teamB.name}`, pageW / 2, footerY, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginRight, footerY, { align: 'right' });
  }

  // 8. Save Generated PDF
  const cleanTeamA = config.teamA.name.replace(/\s+/g, '_');
  const cleanTeamB = config.teamB.name.replace(/\s+/g, '_');
  const filename = `${cleanTeamA}_vs_${cleanTeamB}_${config.date}.pdf`;
  try {
    doc.save(filename);
  } catch {
    // In headless/test environments where FileSaver is not active
  }

  return doc;
}
