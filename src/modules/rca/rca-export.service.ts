// src/modules/rca/rca-export.service.ts
// Generator PDF untuk "Lembar Kerja Investigasi Sederhana" (bands BIRU/HIJAU)

import PDFDocument from 'pdfkit';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { PeranTim, KategoriFishbone, StatusRca } from '@prisma/client';

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
        take: 1,
        include: { user: true },
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

// ═══════════════════════════════════════════════════════════════════════════════
//  RCA LENGKAP — Fetch & PDF Generator
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
//  Fetch data untuk RCA_LENGKAP
// ─────────────────────────────────────────────
export const fetchLengkapRcaData = async (reportId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      trackingNumber: true,
      jenisInsiden: true,
      tanggalKejadian: true,
      lokasi: true,
      unitKerja: true,
    },
  });
  if (!report) throw new ApiError(404, 'Laporan tidak ditemukan');

  const rca = await prisma.rootCauseAnalysis.findUnique({
    where: { reportId },
    include: {
      teamMembers: { include: { user: true } },
      fiveWhyEntries: { orderBy: { urutan: 'asc' } },
      fishboneEntries: { orderBy: { urutan: 'asc' } },
      timelineEntries: { orderBy: { urutan: 'asc' } },
      rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
    },
  });
  if (!rca) throw new ApiError(404, 'RCA untuk laporan ini belum dibuat');
  if (rca.jenisInvestigasi !== 'RCA_LENGKAP') {
    throw new ApiError(400, 'Endpoint ini hanya untuk RCA dengan jenisInvestigasi = RCA_LENGKAP');
  }

  return { report, rca };
};

// ─────────────────────────────────────────────
//  Generator RCA LENGKAP (pdfkit)
// ─────────────────────────────────────────────
export const generateRcaLengkapPdf = async (reportId: string): Promise<Buffer> => {
  const { report, rca } = await fetchLengkapRcaData(reportId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── helpers (diisolasi di dalam promise, tidak menyentuh fungsi SEDERHANA) ───
    const checkPageBreak = (neededHeight: number) => {
      const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
      if (remaining < neededHeight) doc.addPage();
    };

    const sectionTitle = (text: string) => {
      doc.moveDown(0.4);
      checkPageBreak(30);
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
      checkPageBreak(height);
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

    const drawTableHeader = (headers: { label: string; w: number }[]) => {
      checkPageBreak(25);
      const hY = doc.y;
      let hx = MARGIN;
      headers.forEach((h) => {
        doc.rect(hx, hY, h.w, 20).fill(LABEL_BG).stroke(BORDER_COLOR);
        doc
          .fillColor(TEXT_COLOR)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(h.label, hx + 3, hY + 5, { width: h.w - 6, align: 'center' });
        hx += h.w;
      });
      doc.y = hY + 20;
      doc.fillColor(TEXT_COLOR);
    };

    const drawTableRows = <T>(
      entries: T[],
      getCells: (e: T) => { val: string; w: number; bold?: boolean }[],
      emptyMessage: string,
    ) => {
      if (entries.length === 0) {
        const rY = doc.y;
        checkPageBreak(28);
        doc.rect(MARGIN, rY, CONTENT_W, 28).fill('#FFFFFF').stroke(BORDER_COLOR);
        doc
          .font('Helvetica-Oblique')
          .fontSize(8)
          .fillColor('#777777')
          .text(emptyMessage, MARGIN, rY + 10, { width: CONTENT_W, align: 'center' });
        doc.y = rY + 28;
        return;
      }
      entries.forEach((entry) => {
        const cells = getCells(entry);
        // Hitung tinggi dinamis agar teks panjang tidak tumpang tindih
        const rH = Math.max(
          24,
          ...cells.map(
            (c) =>
              doc
                .font(c.bold ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(8)
                .heightOfString(c.val || '-', { width: c.w - 8 }) + 10,
          ),
        );
        checkPageBreak(rH);
        const rY = doc.y;
        let rx = MARGIN;
        cells.forEach((c) => {
          doc.rect(rx, rY, c.w, rH).fill('#FFFFFF').stroke(BORDER_COLOR);
          doc
            .font(c.bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8)
            .fillColor(TEXT_COLOR)
            .text(c.val || '-', rx + 4, rY + 5, { width: c.w - 8 });
          rx += c.w;
        });
        doc.y = rY + rH;
      });
    };

    // ══════════════════════════════════════════════════════════════
    //  HEADER UTAMA
    // ══════════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, 10).fill(HEADER_BG);
    const titleY = doc.y;
    doc.rect(MARGIN, titleY, CONTENT_W, 40).fill(HEADER_BG).stroke(BORDER_COLOR);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('LAPORAN ROOT CAUSE ANALYSIS (RCA) LENGKAP', MARGIN, titleY + 14, {
        align: 'center',
        width: CONTENT_W,
      });
    doc.y = titleY + 50;
    doc.fillColor(TEXT_COLOR);

    // ══════════════════════════════════════════════════════════════
    //  A. IDENTITAS INSIDEN & TIM INVESTIGASI
    // ══════════════════════════════════════════════════════════════
    sectionTitle('A.  IDENTITAS INSIDEN & TIM INVESTIGASI');
    labelBox('No. Tracking', report.trackingNumber ?? '-');
    labelBox('Jenis Insiden', String(report.jenisInsiden));
    labelBox('Tanggal Kejadian', fmtDate(report.tanggalKejadian) || '-');

    // filter(Boolean) mencegah string literal "null" muncul kalau lokasi/unitKerja kosong
    const lokasiText = [report.lokasi, report.unitKerja].filter(Boolean).join('  —  ') || '-';
    labelBox('Lokasi / Unit Kerja', lokasiText);

    const getTeam = (role: PeranTim) =>
      rca.teamMembers
        .filter((m) => m.peran === role)
        .map((m) => m.user?.nama ?? m.namaLegacyText ?? '-')
        .join(', ') || '-';

    labelBox('Ketua Tim Investigasi', getTeam(PeranTim.KETUA));
    labelBox('Sekretaris', getTeam(PeranTim.SEKRETARIS));
    labelBox('Anggota Tim', getTeam(PeranTim.ANGGOTA));

    // ══════════════════════════════════════════════════════════════
    //  B. KRONOLOGI KEJADIAN
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    sectionTitle('B.  KRONOLOGI KEJADIAN');
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
    const kronologiText = rca.kronologiSingkat || '-';
    const kronologiHeight = doc.heightOfString(kronologiText, { width: CONTENT_W });
    checkPageBreak(kronologiHeight + 10);
    doc.text(kronologiText, MARGIN, doc.y, { width: CONTENT_W, align: 'justify' });
    doc.y += 10;

    // ══════════════════════════════════════════════════════════════
    //  C. ANALISIS 5-WHY
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    sectionTitle('C.  ANALISIS 5-WHY');
    checkPageBreak(25);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(`Masalah Awal: ${rca.masalahAwal5Why || '-'}`, MARGIN, doc.y, { width: CONTENT_W });
    doc.y += 10;

    drawTableHeader([
      { label: 'Tahapan', w: 60 },
      { label: 'Penyebab (Why)', w: CONTENT_W - 60 },
    ]);
    drawTableRows(
      rca.fiveWhyEntries,
      (fw) => [
        { val: `Why ${fw.urutan}`, w: 60, bold: true },
        { val: fw.jawaban, w: CONTENT_W - 60 },
      ],
      'Tidak ada entri 5-Why',
    );

    // ══════════════════════════════════════════════════════════════
    //  D. FISHBONE TABEL
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    sectionTitle('D.  ANALISIS TULANG IKAN (FISHBONE)');
    const fishboneData = Object.values(KategoriFishbone).map((kategori) => {
      const entries = rca.fishboneEntries.filter((e) => e.kategori === kategori);
      const penyebabText =
        entries.length > 0
          ? entries.map((e, idx) => `${idx + 1}. ${e.penyebab}`).join('\n')
          : 'Tidak ada temuan';
      return { kategori, penyebab: penyebabText };
    });

    drawTableHeader([
      { label: 'Kategori (5M+E)', w: 120 },
      { label: 'Penyebab yang Berkontribusi', w: CONTENT_W - 120 },
    ]);
    drawTableRows(
      fishboneData,
      (f) => [
        { val: f.kategori, w: 120, bold: true },
        { val: f.penyebab, w: CONTENT_W - 120 },
      ],
      'Tidak ada data',
    );

    // ══════════════════════════════════════════════════════════════
    //  E. TIMELINE KEJADIAN
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    sectionTitle('E.  TIMELINE KEJADIAN');

    const tw1 = CONTENT_W * 0.15;
    const tw2 = CONTENT_W * 0.25;
    const tw3 = CONTENT_W * 0.2;
    const tw4 = CONTENT_W * 0.2;
    const tw5 = CONTENT_W - tw1 - tw2 - tw3 - tw4;

    drawTableHeader([
      { label: 'Waktu', w: tw1 },
      { label: 'Kejadian', w: tw2 },
      { label: 'Info Tambahan', w: tw3 },
      { label: 'Good Practice', w: tw4 },
      { label: 'Masalah', w: tw5 },
    ]);
    drawTableRows(
      rca.timelineEntries,
      (t) => [
        { val: t.waktu ?? '-', w: tw1 },
        { val: t.kejadian ?? '-', w: tw2 },
        { val: t.informasiTambahan ?? '-', w: tw3 },
        { val: t.goodPractice ?? '-', w: tw4 },
        { val: t.masalahPelayanan ?? '-', w: tw5 },
      ],
      'Tidak ada data timeline',
    );

    // ══════════════════════════════════════════════════════════════
    //  F. RENCANA PERBAIKAN
    // ══════════════════════════════════════════════════════════════
    doc.moveDown(0.5);
    sectionTitle('F.  RENCANA PERBAIKAN');

    const rw1 = CONTENT_W * 0.18; // Akar Masalah
    const rw2 = CONTENT_W * 0.22; // Rekomendasi
    const rw3 = CONTENT_W * 0.2; // Tindakan
    const rw4 = CONTENT_W * 0.15; // PIC
    const rw5 = CONTENT_W * 0.12; // Target
    const rw6 = CONTENT_W - rw1 - rw2 - rw3 - rw4 - rw5; // Status

    drawTableHeader([
      { label: 'Akar Masalah', w: rw1 },
      { label: 'Rekomendasi Solusi', w: rw2 },
      { label: 'Tindakan', w: rw3 },
      { label: 'Pelaksana', w: rw4 },
      { label: 'Target', w: rw5 },
      { label: 'Status', w: rw6 },
    ]);
    drawTableRows(
      rca.rencanaPerbaikanEntries,
      (r) => [
        { val: r.akarMasalah, w: rw1 },
        { val: r.rekomendasiSolusi, w: rw2 },
        { val: r.tindakanPerbaikan, w: rw3 },
        { val: r.pelaksana, w: rw4 },
        { val: r.targetWaktu, w: rw5 },
        { val: String(r.status), w: rw6 },
      ],
      'Tidak ada data rencana perbaikan',
    );

    // ══════════════════════════════════════════════════════════════
    //  FOOTER HALAMAN
    // ══════════════════════════════════════════════════════════════
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
