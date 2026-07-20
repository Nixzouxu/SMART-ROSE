// src/modules/rca/rca-export.service.ts
// Generator PDF untuk "Lembar Kerja Investigasi Sederhana" (bands BIRU/HIJAU)

import PDFDocument from 'pdfkit';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { PeranTim, StatusRca } from '@prisma/client';

// ─────────────────────────────────────────────
//  Helper: format tanggal ke locale Indonesia
// ─────────────────────────────────────────────
const fmtDate = (d: Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

// ─────────────────────────────────────────────
//  Fetch semua data yang diperlukan
// ─────────────────────────────────────────────
const fetchSimpleRcaData = async (reportId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      trackingNumber: true,
      jenisInsiden: true,
      tanggalKejadian: true,
      lokasi: true,
      unitKerja: true,
      gradingAwal: true,
    },
  });
  if (!report) throw new ApiError(404, 'Laporan tidak ditemukan');

  const rca = await prisma.rootCauseAnalysis.findUnique({
    where: { reportId },
    include: {
      rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
      teamMembers: {
        where: { peran: PeranTim.KETUA },
        include: { user: { select: { nama: true } } },
        take: 1,
      },
    },
  });
  if (!rca) throw new ApiError(404, 'RCA untuk laporan ini belum dibuat');
  if (rca.jenisInvestigasi !== 'SEDERHANA') {
    throw new ApiError(400, 'Endpoint ini hanya untuk RCA dengan jenisInvestigasi = SEDERHANA');
  }

  const ketuaMember = rca.teamMembers[0];
  const namaKetua =
    ketuaMember?.user?.nama ?? ketuaMember?.namaLegacyText ?? rca.timKetuaLegacyText ?? '-';

  const tanggalSelesai =
    rca.status === StatusRca.FINAL || rca.status === StatusRca.DISETUJUI ? rca.updatedAt : null;

  return { report, rca, namaKetua, tanggalSelesai };
};

// ─────────────────────────────────────────────
//  Konstanta desain
// ─────────────────────────────────────────────
const MARGIN = 40;
const PAGE_W = 595.28; // A4 width in points
const CONTENT_W = PAGE_W - MARGIN * 2;
const BORDER_COLOR = '#333333';
const LABEL_BG = '#E8E8E8';
const HEADER_BG = '#1F4E79';
const TEXT_COLOR = '#1A1A1A';

// ─────────────────────────────────────────────
//  Generator utama
// ─────────────────────────────────────────────
export const generateRcaSimplePdf = async (reportId: string): Promise<Buffer> => {
  const { report, rca, namaKetua, tanggalSelesai } = await fetchSimpleRcaData(reportId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── helpers ──────────────────────────────────────────────────────────────

    const sectionTitle = (text: string) => {
      doc.moveDown(0.4);
      const y = doc.y;
      doc.rect(MARGIN, y, CONTENT_W, 18).fill(HEADER_BG).stroke(HEADER_BG);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(text, MARGIN + 4, y + 4, { width: CONTENT_W - 8 });
      doc.fillColor(TEXT_COLOR);
      doc.y = y + 20;
    };

    const labelBox = (label: string, value: string, height = 20) => {
      const labelW = 160;
      const valueW = CONTENT_W - labelW;
      const y = doc.y;
      doc.rect(MARGIN, y, labelW, height).fill(LABEL_BG).stroke(BORDER_COLOR);
      doc
        .fillColor(TEXT_COLOR)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(label, MARGIN + 3, y + 5, { width: labelW - 6, height: height - 6 });
      doc
        .rect(MARGIN + labelW, y, valueW, height)
        .fill('#FFFFFF')
        .stroke(BORDER_COLOR);
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(value || '-', MARGIN + labelW + 3, y + 5, { width: valueW - 6, height: height - 6 });
      doc.y = y + height;
      doc.fillColor(TEXT_COLOR);
    };

    const bigTextBox = (headerLabel: string, content: string | null, minHeight = 80) => {
      checkPageBreak(minHeight + 22);
      const y = doc.y;
      doc.rect(MARGIN, y, CONTENT_W, 16).fill(LABEL_BG).stroke(BORDER_COLOR);
      doc
        .fillColor(TEXT_COLOR)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(headerLabel, MARGIN + 4, y + 4, { width: CONTENT_W - 8 });

      let boxHeight = minHeight;
      if (content) {
        const textHeight = doc.heightOfString(content, { width: CONTENT_W - 12 });
        boxHeight = Math.max(minHeight, textHeight + 16);
      }

      doc
        .rect(MARGIN, y + 16, CONTENT_W, boxHeight)
        .fill('#FFFFFF')
        .stroke(BORDER_COLOR);
      if (content) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(TEXT_COLOR)
          .text(content, MARGIN + 6, y + 24, { width: CONTENT_W - 12 });
      }
      doc.y = y + 16 + boxHeight + 6;
    };

    const emptyCheckBox = (label: string, width: number, height: number, x: number, y: number) => {
      doc.rect(x, y, width, height).fill('#FFFFFF').stroke(BORDER_COLOR);
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#555555')
        .text(label, x + 4, y + 6, { width: width - 8 });
      doc.fillColor(TEXT_COLOR);
    };

    const checkPageBreak = (neededHeight: number) => {
      const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
      if (remaining < neededHeight) doc.addPage();
    };

    // ══════════════════════════════════════════════════════════════
    //  HEADER JUDUL
    // ══════════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, 10).fill(HEADER_BG);
    const titleY = doc.y;
    doc.rect(MARGIN, titleY, CONTENT_W, 52).fill(HEADER_BG).stroke(BORDER_COLOR);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('LEMBAR KERJA INVESTIGASI SEDERHANA', MARGIN, titleY + 8, {
        align: 'center',
        width: CONTENT_W,
      });
    doc.fontSize(9).text('untuk Bands Risiko BIRU / HIJAU', MARGIN, titleY + 26, {
      align: 'center',
      width: CONTENT_W,
    });
    doc
      .fontSize(7.5)
      .text('SMART-ROSE — Sistem Pelaporan Insiden Keselamatan Pasien', MARGIN, titleY + 41, {
        align: 'center',
        width: CONTENT_W,
      });
    doc.y = titleY + 60;
    doc.fillColor(TEXT_COLOR);

    // ══════════════════════════════════════════════════════════════
    //  INFO INSIDEN
    // ══════════════════════════════════════════════════════════════
    sectionTitle('INFORMASI INSIDEN');
    labelBox('No. Tracking', report.trackingNumber ?? '-');
    labelBox('Jenis Insiden', String(report.jenisInsiden));
    labelBox('Tanggal Kejadian', fmtDate(report.tanggalKejadian));
    labelBox(
      'Lokasi / Unit Kerja',
      `${report.lokasi}${report.unitKerja ? '  —  ' + report.unitKerja : ''}`,
    );
    labelBox('Grading Awal', String(report.gradingAwal ?? '-'));
    labelBox('Bands RCA', rca.tindakanBands ? String(rca.tindakanBands) : '-');

    // ══════════════════════════════════════════════════════════════
    //  1. PENYEBAB LANGSUNG
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    bigTextBox('1.  Penyebab Langsung Insiden', rca.penyebabLangsung ?? null, 80);

    // ══════════════════════════════════════════════════════════════
    //  2. AKAR MASALAH
    // ══════════════════════════════════════════════════════════════
    bigTextBox(
      '2.  Penyebab yang Melatarbelakangi / Akar Masalah Insiden',
      rca.masalahAwal5Why,
      80,
    );

    // ══════════════════════════════════════════════════════════════
    //  3. TABEL REKOMENDASI
    // ══════════════════════════════════════════════════════════════
    checkPageBreak(60);
    sectionTitle('3.  Rekomendasi');

    const col1 = CONTENT_W * 0.55;
    const col2 = CONTENT_W * 0.25;
    const col3 = CONTENT_W - col1 - col2;
    const tblHdrH = 20;

    const drawTableHeader = (headers: { label: string; w: number }[]) => {
      const hY = doc.y;
      let hx = MARGIN;
      headers.forEach((h) => {
        doc.rect(hx, hY, h.w, tblHdrH).fill(LABEL_BG).stroke(BORDER_COLOR);
        doc
          .fillColor(TEXT_COLOR)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(h.label, hx + 3, hY + 5, { width: h.w - 6 });
        hx += h.w;
      });
      doc.y = hY + tblHdrH;
      doc.fillColor(TEXT_COLOR);
    };

    const drawTableRows = (
      entries: typeof rca.rencanaPerbaikanEntries,
      getCells: (e: (typeof entries)[0]) => { val: string; w: number }[],
    ) => {
      if (entries.length === 0) {
        const rY = doc.y;
        let rx = MARGIN;
        [col1, col2, col3].forEach((w) => {
          doc.rect(rx, rY, w, 28).fill('#FFFFFF').stroke(BORDER_COLOR);
          rx += w;
        });
        doc.y = rY + 28;
        return;
      }
      entries.forEach((entry) => {
        const cells = getCells(entry);
        const rH = Math.max(
          24,
          ...cells.map((c) => doc.heightOfString(c.val, { width: c.w - 8 }) + 10),
        );
        checkPageBreak(rH);
        const rY = doc.y;
        let rx = MARGIN;
        cells.forEach((c) => {
          doc.rect(rx, rY, c.w, rH).fill('#FFFFFF').stroke(BORDER_COLOR);
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(TEXT_COLOR)
            .text(c.val || '-', rx + 3, rY + 5, { width: c.w - 6, height: rH - 8 });
          rx += c.w;
        });
        doc.y = rY + rH;
      });
    };

    drawTableHeader([
      { label: 'Rekomendasi', w: col1 },
      { label: 'Penanggung Jawab', w: col2 },
      { label: 'Tanggal', w: col3 },
    ]);
    drawTableRows(rca.rencanaPerbaikanEntries, (e) => [
      { val: e.rekomendasiSolusi, w: col1 },
      { val: e.pelaksana, w: col2 },
      { val: e.targetWaktu, w: col3 },
    ]);

    // ══════════════════════════════════════════════════════════════
    //  4. TABEL TINDAKAN
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    checkPageBreak(60);
    sectionTitle('4.  Tindakan yang akan Dilakukan');

    drawTableHeader([
      { label: 'Tindakan yang akan Dilakukan', w: col1 },
      { label: 'Penanggung Jawab', w: col2 },
      { label: 'Tanggal', w: col3 },
    ]);
    drawTableRows(rca.rencanaPerbaikanEntries, (e) => [
      { val: e.tindakanPerbaikan, w: col1 },
      { val: e.pelaksana, w: col2 },
      { val: e.targetWaktu, w: col3 },
    ]);

    // ══════════════════════════════════════════════════════════════
    //  5. SECTION MANAGER
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.6);
    checkPageBreak(120);
    sectionTitle('5.  Manager / Kepala Bagian / Kepala Unit');

    // Baris nama manajer
    labelBox('Nama Manajer / Ketua Tim', namaKetua, 22);

    // Baris tanggal mulai & selesai (2 kolom)
    const dateY = doc.y;
    const halfW = CONTENT_W / 2;
    const labelW2 = 105;

    doc.rect(MARGIN, dateY, labelW2, 22).fill(LABEL_BG).stroke(BORDER_COLOR);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(TEXT_COLOR)
      .text('Tgl. Mulai Investigasi:', MARGIN + 3, dateY + 6, { width: labelW2 - 4 });
    doc
      .rect(MARGIN + labelW2, dateY, halfW - labelW2, 22)
      .fill('#FFFFFF')
      .stroke(BORDER_COLOR);
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(fmtDate(rca.createdAt), MARGIN + labelW2 + 3, dateY + 6, {
        width: halfW - labelW2 - 6,
      });

    const col2Start = MARGIN + halfW;
    doc.rect(col2Start, dateY, labelW2, 22).fill(LABEL_BG).stroke(BORDER_COLOR);
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(TEXT_COLOR)
      .text('Tgl. Selesai Investigasi:', col2Start + 3, dateY + 6, { width: labelW2 - 4 });
    doc
      .rect(col2Start + labelW2, dateY, halfW - labelW2, 22)
      .fill('#FFFFFF')
      .stroke(BORDER_COLOR);
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(fmtDate(tanggalSelesai), col2Start + labelW2 + 3, dateY + 6, {
        width: halfW - labelW2 - 6,
      });
    doc.y = dateY + 22;
    doc.fillColor(TEXT_COLOR);

    // Kotak TTD kosong
    const sigY = doc.y + 4;
    const sigW = 180;
    const sigH = 65;
    doc.rect(MARGIN, sigY, sigW, sigH).fill('#FFFFFF').stroke(BORDER_COLOR);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#999999')
      .text('( Tanda Tangan )', MARGIN + 4, sigY + 4, { width: sigW - 8 });
    doc.y = sigY + sigH + 6;
    doc.fillColor(TEXT_COLOR);

    // ══════════════════════════════════════════════════════════════
    //  6. MANAJEMEN RISIKO
    // ══════════════════════════════════════════════════════════════
    checkPageBreak(120);
    sectionTitle('6.  Manajemen Risiko');

    const mrY = doc.y;
    const cbW = (CONTENT_W - 4) / 2;
    const cbH = 36;

    emptyCheckBox('Investigasi Lengkap:\n[ ]  YA          [ ]  TIDAK', cbW, cbH, MARGIN, mrY);
    emptyCheckBox(
      'Diperlukan Investigasi Lanjut:\n[ ]  YA          [ ]  TIDAK',
      cbW,
      cbH,
      MARGIN + cbW + 4,
      mrY,
    );
    doc.y = mrY + cbH + 4;

    const mr2Y = doc.y;
    emptyCheckBox('Tanggal (Manajemen Risiko):\n\n_______________', cbW, cbH, MARGIN, mr2Y);

    // Grading Ulang
    doc
      .rect(MARGIN + cbW + 4, mr2Y, cbW, cbH)
      .fill('#FFFFFF')
      .stroke(BORDER_COLOR);
    if (rca.tindakanBands) {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(TEXT_COLOR)
        .text('Investigasi Setelah Grading Ulang:', MARGIN + cbW + 7, mr2Y + 6);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1F4E79')
        .text(String(rca.tindakanBands), MARGIN + cbW + 7, mr2Y + 18);
    } else {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#555555')
        .text(
          'Investigasi Setelah Grading Ulang:\n[ ] Hijau   [ ] Kuning   [ ] Merah',
          MARGIN + cbW + 7,
          mr2Y + 6,
          { width: cbW - 10 },
        );
    }
    doc.fillColor(TEXT_COLOR);
    doc.y = mr2Y + cbH + 8;

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 32;
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#AAAAAA')
      .text(
        `SMART-ROSE  |  Dicetak: ${fmtDate(new Date())}  |  No. Tracking: ${report.trackingNumber ?? reportId}`,
        MARGIN,
        footerY,
        { align: 'center', width: CONTENT_W },
      );

    doc.end();
  });
};
