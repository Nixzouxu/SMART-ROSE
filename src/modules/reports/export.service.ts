// src/modules/reports/export.service.ts
// Fungsi ekspor RCA ke format Excel (ExcelJS) dan PDF (PDFKit).

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { db as prisma } from '@/config/db';
import { ApiError } from '@/utils/apiError';
import { Report, Prisma } from '@prisma/client';

type ReportWithRelations = Prisma.ReportGetPayload<{
  include: {
    pelapor: { select: { id: true; nama: true; unitKerja: true } };
    assignedTo: { select: { id: true; nama: true } };
  };
}>;

type RcaWithRelations = Prisma.RootCauseAnalysisGetPayload<{
  include: {
    disusunOleh: { select: { id: true; nama: true } };
    timelineEntries: { orderBy: { urutan: 'asc' } };
    timePersonGridEntries: { orderBy: { urutan: 'asc' } };
    fiveWhyEntries: { orderBy: { urutan: 'asc' } };
    fishboneEntries: { orderBy: { urutan: 'asc' } };
    rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } };
  };
}>;

interface RcaData {
  report: ReportWithRelations;
  rca: RcaWithRelations;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DashboardData = any;

/**
 * Ambil data RCA lengkap beserta report-nya dari database.
 */
const fetchRcaData = async (reportId: string): Promise<RcaData> => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      pelapor: { select: { id: true, nama: true, unitKerja: true } },
      assignedTo: { select: { id: true, nama: true } },
    },
  });

  if (!report) {
    throw new ApiError(404, 'Laporan tidak ditemukan');
  }

  const rca = await prisma.rootCauseAnalysis.findUnique({
    where: { reportId },
    include: {
      disusunOleh: { select: { id: true, nama: true } },
      timelineEntries: { orderBy: { urutan: 'asc' } },
      timePersonGridEntries: { orderBy: { urutan: 'asc' } },
      fiveWhyEntries: { orderBy: { urutan: 'asc' } },
      fishboneEntries: { orderBy: { urutan: 'asc' } },
      rencanaPerbaikanEntries: { orderBy: { urutan: 'asc' } },
    },
  });

  if (!rca) {
    throw new ApiError(404, 'RCA untuk laporan ini belum dibuat');
  }

  return { report, rca };
};

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const LABEL_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } },
  alignment: { wrapText: true, vertical: 'top' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const CELL_STYLE: Partial<ExcelJS.Style> = {
  alignment: { wrapText: true, vertical: 'top' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const applyRowStyle = (row: ExcelJS.Row, style: Partial<ExcelJS.Style>) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.style = { ...style };
  });
};

/**
 * Ekspor RCA ke format Excel menggunakan ExcelJS.
 * Mengembalikan Buffer yang siap dikirim sebagai response download.
 */
export const exportRcaToExcel = async (reportId: string): Promise<Buffer> => {
  const { report, rca } = await fetchRcaData(reportId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SMART-ROSE';
  workbook.created = new Date();

  // ============================================================
  // Sheet 1: Info Insiden
  // ============================================================
  const sheetInfo = workbook.addWorksheet('Info Insiden');
  sheetInfo.columns = [{ width: 30 }, { width: 50 }];

  const titleRowInfo = sheetInfo.addRow(['ROOT CAUSE ANALYSIS (RCA)']);
  sheetInfo.mergeCells('A1:B1');
  titleRowInfo.getCell(1).style = {
    font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };
  titleRowInfo.height = 28;

  const infoRows: [string, string][] = [
    ['Nomor Tracking', report.trackingNumber ?? '-'],
    ['Jenis Insiden', report.jenisInsiden],
    ['Tanggal Kejadian', report.tanggalKejadian.toLocaleDateString('id-ID')],
    ['Lokasi', report.lokasi],
    ['Unit Kerja', report.unitKerja],
    ['Grading Awal', report.gradingAwal],
    ['Grading Final', report.gradingFinal ?? '-'],
    ['Status Laporan', report.status],
    ['Pelapor', report.isAnonim ? 'Anonim' : (report.pelapor?.nama ?? '-')],
    ['Assigned To', report.assignedTo?.nama ?? '-'],
    ['Kronologi', report.kronologi],
    ['Dampak', report.dampak],
    ['', ''],
    ['TIM RCA', ''],
    ['Disusun Oleh', rca.disusunOleh.nama],
    ['Ketua Tim', rca.timKetuaLegacyText ?? '-'],
    ['Sekretaris Tim', rca.timSekretarisLegacyText ?? '-'],
    ['Anggota Tim', rca.timAnggotaLegacyText.join(', ') || '-'],
    ['', ''],
    ['DETAIL RCA', ''],
    ['Tipe Sub Insiden', rca.tipeSubInsiden ?? '-'],
    ['Kronologi Singkat', rca.kronologiSingkat],
    ['Observasi', rca.observasi ?? '-'],
    ['Dokumentasi', rca.dokumentasi ?? '-'],
    ['Tindakan Sesuai BANDS', rca.tindakanSesuaiBands ?? '-'],
    ['Daftar Interviewee', rca.daftarInterviewee.join(', ') || '-'],
    ['Status RCA', rca.status],
  ];

  infoRows.forEach(([label, value]) => {
    const row = sheetInfo.addRow([label, value]);
    if (label === '' && value === '') {
      row.height = 8;
    } else if (label === 'TIM RCA' || label === 'DETAIL RCA') {
      sheetInfo.mergeCells(`A${row.number}:B${row.number}`);
      row.getCell(1).style = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } },
        alignment: { horizontal: 'center' },
      };
    } else {
      row.getCell(1).style = { ...LABEL_STYLE };
      row.getCell(2).style = { ...CELL_STYLE };
      row.height = 20;
    }
  });

  // ============================================================
  // Sheet 2: Timeline
  // ============================================================
  const sheetTimeline = workbook.addWorksheet('Timeline Kronologi');
  sheetTimeline.columns = [
    { header: 'No', width: 6 },
    { header: 'Waktu', width: 20 },
    { header: 'Kejadian', width: 40 },
    { header: 'Informasi Tambahan', width: 30 },
    { header: 'Good Practice', width: 30 },
    { header: 'Masalah Pelayanan', width: 30 },
  ];

  const tlHeaderRow = sheetTimeline.getRow(1);
  applyRowStyle(tlHeaderRow, HEADER_STYLE);
  tlHeaderRow.height = 22;

  rca.timelineEntries.forEach((entry, idx) => {
    const row = sheetTimeline.addRow([
      idx + 1,
      entry.waktu,
      entry.kejadian,
      entry.informasiTambahan ?? '-',
      entry.goodPractice ?? '-',
      entry.masalahPelayanan ?? '-',
    ]);
    applyRowStyle(row, CELL_STYLE);
    row.height = 20;
  });

  // ============================================================
  // Sheet 3: Time Person Grid
  // ============================================================
  const sheetGrid = workbook.addWorksheet('Time Person Grid');
  sheetGrid.columns = [
    { header: 'No', width: 6 },
    { header: 'Staf', width: 25 },
    { header: 'Waktu', width: 20 },
    { header: 'Deskripsi', width: 50 },
  ];

  const gridHeaderRow = sheetGrid.getRow(1);
  applyRowStyle(gridHeaderRow, HEADER_STYLE);
  gridHeaderRow.height = 22;

  rca.timePersonGridEntries.forEach((entry, idx) => {
    const row = sheetGrid.addRow([idx + 1, entry.staf, entry.waktu, entry.deskripsi]);
    applyRowStyle(row, CELL_STYLE);
    row.height = 20;
  });

  // ============================================================
  // Sheet 4: 5 Why
  // ============================================================
  const sheet5Why = workbook.addWorksheet('5 Why');
  sheet5Why.columns = [
    { header: 'No', width: 6 },
    { header: 'Masalah / Jawaban', width: 80 },
  ];

  const whyHeaderRow = sheet5Why.getRow(1);
  applyRowStyle(whyHeaderRow, HEADER_STYLE);
  whyHeaderRow.height = 22;

  const masalahRow = sheet5Why.addRow(['Masalah Awal', rca.masalahAwal5Why]);
  masalahRow.getCell(1).style = { ...LABEL_STYLE };
  masalahRow.getCell(2).style = { ...CELL_STYLE };

  rca.fiveWhyEntries.forEach((entry) => {
    const row = sheet5Why.addRow([`Why ${entry.urutan}`, entry.jawaban]);
    row.getCell(1).style = { ...LABEL_STYLE };
    row.getCell(2).style = { ...CELL_STYLE };
    row.height = 20;
  });

  // ============================================================
  // Sheet 5: Fishbone
  // ============================================================
  const sheetFishbone = workbook.addWorksheet('Fishbone');
  sheetFishbone.columns = [
    { header: 'No', width: 6 },
    { header: 'Kategori', width: 20 },
    { header: 'Penyebab', width: 60 },
  ];

  const fbHeaderRow = sheetFishbone.getRow(1);
  applyRowStyle(fbHeaderRow, HEADER_STYLE);
  fbHeaderRow.height = 22;

  rca.fishboneEntries.forEach((entry, idx) => {
    const row = sheetFishbone.addRow([idx + 1, entry.kategori, entry.penyebab]);
    applyRowStyle(row, CELL_STYLE);
    row.height = 20;
  });

  // ============================================================
  // Sheet 6: Rencana Perbaikan
  // ============================================================
  const sheetRencana = workbook.addWorksheet('Rencana Perbaikan');
  sheetRencana.columns = [
    { header: 'No', width: 6 },
    { header: 'Akar Masalah', width: 30 },
    { header: 'Rekomendasi Solusi', width: 30 },
    { header: 'Tindakan Perbaikan', width: 30 },
    { header: 'Pelaksana', width: 20 },
    { header: 'Target Waktu', width: 15 },
    { header: 'Status', width: 15 },
  ];

  const rpHeaderRow = sheetRencana.getRow(1);
  applyRowStyle(rpHeaderRow, HEADER_STYLE);
  rpHeaderRow.height = 22;

  rca.rencanaPerbaikanEntries.forEach((entry, idx) => {
    const row = sheetRencana.addRow([
      idx + 1,
      entry.akarMasalah,
      entry.rekomendasiSolusi,
      entry.tindakanPerbaikan,
      entry.pelaksana,
      entry.targetWaktu,
      entry.status,
    ]);
    applyRowStyle(row, CELL_STYLE);
    row.height = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Ekspor RCA ke format PDF menggunakan PDFKit.
 * Mengembalikan Buffer yang siap dikirim sebagai response download.
 */
export const exportRcaToPdf = async (reportId: string): Promise<Buffer> => {
  const { report, rca } = await fetchRcaData(reportId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#1F4E79';
    const accentColor = '#2E75B6';
    const textColor = '#1A1A1A';
    const lightBg = '#D6E4F0';

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const sectionHeader = (title: string) => {
      doc.moveDown(0.5);
      doc.rect(doc.page.margins.left, doc.y, pageWidth, 20).fill(accentColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(title, doc.page.margins.left + 4, doc.y - 16, { width: pageWidth });
      doc.fillColor(textColor).font('Helvetica').fontSize(10);
      doc.moveDown(0.5);
    };

    const labelValue = (label: string, value: string) => {
      const labelWidth = 160;
      const valueWidth = pageWidth - labelWidth - 4;
      const startY = doc.y;
      doc.rect(doc.page.margins.left, startY, labelWidth, 16).fill(lightBg);
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label, doc.page.margins.left + 2, startY + 3, { width: labelWidth - 4 });
      doc.rect(doc.page.margins.left + labelWidth + 2, startY, valueWidth, 16).stroke('#CCCCCC');
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(value, doc.page.margins.left + labelWidth + 4, startY + 3, {
          width: valueWidth - 4,
        });
      doc.y = startY + 18;
    };

    // ---- Cover / Judul ----
    doc.rect(0, 0, doc.page.width, 70).fill(primaryColor);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('ROOT CAUSE ANALYSIS (RCA)', 0, 20, { align: 'center' });
    doc.fontSize(11).text('SMART-ROSE - Sistem Pelaporan Insiden Keselamatan Pasien', 0, 44, {
      align: 'center',
    });

    doc.moveDown(2.5);
    doc.fillColor(textColor).font('Helvetica').fontSize(10);

    // ---- Info Insiden ----
    sectionHeader('INFORMASI INSIDEN');
    labelValue('Nomor Tracking', report.trackingNumber ?? '-');
    labelValue('Jenis Insiden', report.jenisInsiden);
    labelValue('Tanggal Kejadian', report.tanggalKejadian.toLocaleDateString('id-ID'));
    labelValue('Lokasi', report.lokasi);
    labelValue('Unit Kerja', report.unitKerja);
    labelValue('Grading Awal', report.gradingAwal);
    labelValue('Grading Final', report.gradingFinal ?? '-');
    labelValue('Status Laporan', report.status);
    labelValue('Pelapor', report.isAnonim ? 'Anonim' : (report.pelapor?.nama ?? '-'));
    labelValue('Assigned To', report.assignedTo?.nama ?? '-');
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9).text('Kronologi:', { continued: false });
    doc.font('Helvetica').fontSize(9).text(report.kronologi, { width: pageWidth });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9).text('Dampak:', { continued: false });
    doc.font('Helvetica').fontSize(9).text(report.dampak, { width: pageWidth });

    // ---- Tim RCA ----
    sectionHeader('TIM RCA');
    labelValue('Disusun Oleh', rca.disusunOleh.nama);
    labelValue('Ketua Tim', rca.timKetuaLegacyText ?? '-');
    labelValue('Sekretaris Tim', rca.timSekretarisLegacyText ?? '-');
    labelValue('Anggota Tim', rca.timAnggotaLegacyText.join(', ') || '-');
    labelValue('Daftar Interviewee', rca.daftarInterviewee.join(', ') || '-');

    // ---- Detail RCA ----
    sectionHeader('DETAIL RCA');
    labelValue('Tipe Sub Insiden', rca.tipeSubInsiden ?? '-');
    labelValue('Status RCA', rca.status);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9).text('Kronologi Singkat:');
    doc.font('Helvetica').fontSize(9).text(rca.kronologiSingkat, { width: pageWidth });
    if (rca.tindakanSesuaiBands) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).text('Tindakan Sesuai BANDS:');
      doc.font('Helvetica').fontSize(9).text(rca.tindakanSesuaiBands, { width: pageWidth });
    }

    // ---- Timeline ----
    if (rca.timelineEntries.length > 0) {
      doc.addPage();
      sectionHeader('TIMELINE KRONOLOGI');
      const colWidths = [30, 80, 160, 100, 100, 100];
      const colHeaders = ['No', 'Waktu', 'Kejadian', 'Info Tambahan', 'Good Practice', 'Masalah'];
      const startX = doc.page.margins.left;
      let curX = startX;
      const headerY = doc.y;

      colHeaders.forEach((h, i) => {
        doc.rect(curX, headerY, colWidths[i], 16).fill(accentColor);
        doc
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(h, curX + 2, headerY + 3, { width: colWidths[i] - 4 });
        curX += colWidths[i];
      });

      doc.y = headerY + 18;
      doc.fillColor(textColor).font('Helvetica').fontSize(8);

      rca.timelineEntries.forEach((entry, idx) => {
        const rowY = doc.y;
        const cells = [
          String(idx + 1),
          entry.waktu,
          entry.kejadian,
          entry.informasiTambahan ?? '-',
          entry.goodPractice ?? '-',
          entry.masalahPelayanan ?? '-',
        ];
        curX = startX;
        cells.forEach((c, i) => {
          doc.rect(curX, rowY, colWidths[i], 16).stroke('#CCCCCC');
          doc.text(c, curX + 2, rowY + 3, { width: colWidths[i] - 4, height: 14 });
          curX += colWidths[i];
        });
        doc.y = rowY + 18;
      });
    }

    // ---- 5 Why ----
    sectionHeader('ANALISIS 5 WHY');
    doc.font('Helvetica-Bold').fontSize(9).text('Masalah Awal:');
    doc.font('Helvetica').fontSize(9).text(rca.masalahAwal5Why, { width: pageWidth });
    doc.moveDown(0.3);

    rca.fiveWhyEntries.forEach((entry) => {
      labelValue(`Why ${entry.urutan}`, entry.jawaban);
    });

    // ---- Fishbone ----
    if (rca.fishboneEntries.length > 0) {
      sectionHeader('FISHBONE (CAUSE & EFFECT)');
      rca.fishboneEntries.forEach((entry, idx) => {
        labelValue(`[${entry.kategori}] #${idx + 1}`, entry.penyebab);
      });
    }

    // ---- Rencana Perbaikan ----
    if (rca.rencanaPerbaikanEntries.length > 0) {
      doc.addPage();
      sectionHeader('RENCANA PERBAIKAN');

      rca.rencanaPerbaikanEntries.forEach((entry, idx) => {
        doc.moveDown(0.3);
        doc.rect(doc.page.margins.left, doc.y, pageWidth, 14).fill('#EBF5FB');
        doc
          .fillColor(primaryColor)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(`Rencana Perbaikan #${idx + 1}`, doc.page.margins.left + 2, doc.y - 11, {
            width: pageWidth,
          });
        doc.fillColor(textColor).font('Helvetica').fontSize(9);
        doc.y += 4;

        labelValue('Akar Masalah', entry.akarMasalah);
        labelValue('Rekomendasi Solusi', entry.rekomendasiSolusi);
        labelValue('Tindakan Perbaikan', entry.tindakanPerbaikan);
        labelValue('Pelaksana', entry.pelaksana);
        labelValue('Target Waktu', entry.targetWaktu);
        labelValue('Status', entry.status);
      });
    }

    // ---- Footer ----
    const pageCount = (doc as typeof doc & { _pageBuffer: unknown[] })._pageBuffer?.length ?? 1;
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(
        `Dokumen ini digenerate otomatis oleh SMART-ROSE pada ${new Date().toLocaleString('id-ID')} | Total halaman: ${pageCount}`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: 'center', width: pageWidth },
      );

    doc.end();
  });
};

export const generateMassReportExcel = async (reports: Report[]): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Daftar Laporan');
  sheet.columns = [
    { header: 'Tracking Number', key: 'tracking', width: 20 },
    { header: 'Jenis Insiden', key: 'jenis', width: 20 },
    { header: 'Tanggal Kejadian', key: 'tanggal', width: 20 },
    { header: 'Unit Kerja', key: 'unit', width: 30 },
    { header: 'Grading', key: 'grading', width: 15 },
    { header: 'Status', key: 'status', width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  applyRowStyle(headerRow, HEADER_STYLE);

  reports.forEach((r) => {
    sheet.addRow({
      tracking: r.trackingNumber ?? '-',
      jenis: r.jenisInsiden,
      tanggal: new Date(r.tanggalKejadian).toLocaleDateString('id-ID'),
      unit: r.unitKerja,
      grading: r.gradingFinal ?? r.gradingAwal,
      status: r.status,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

export const generateMassReportPdf = async (reports: Report[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(16).text('Daftar Laporan Insiden', { align: 'center' });
    doc.moveDown(1);

    const colWidths = [120, 100, 100, 200, 80, 100];
    const headers = [
      'Tracking Number',
      'Jenis Insiden',
      'Tanggal',
      'Unit Kerja',
      'Grading',
      'Status',
    ];
    let startX = 40;
    let startY = doc.y;

    headers.forEach((h, i) => {
      doc.rect(startX, startY, colWidths[i], 20).fill('#1F4E79');
      doc
        .fillColor('#FFFFFF')
        .fontSize(10)
        .text(h, startX + 5, startY + 5, { width: colWidths[i] - 10 });
      startX += colWidths[i];
    });

    doc.y = startY + 20;
    doc.fillColor('#000000').font('Helvetica').fontSize(9);

    reports.forEach((r) => {
      if (doc.y > doc.page.height - 60) {
        doc.addPage({ layout: 'landscape' });
        doc.y = 40;
      }
      startX = 40;
      startY = doc.y;
      const row = [
        r.trackingNumber ?? '-',
        r.jenisInsiden,
        new Date(r.tanggalKejadian).toLocaleDateString('id-ID'),
        r.unitKerja,
        r.gradingFinal ?? r.gradingAwal,
        r.status,
      ];

      row.forEach((text, i) => {
        doc.rect(startX, startY, colWidths[i], 20).stroke('#CCCCCC');
        doc.text(text, startX + 5, startY + 5, { width: colWidths[i] - 10 });
        startX += colWidths[i];
      });
      doc.y = startY + 20;
    });

    doc.end();
  });
};

export const generateDashboardExcel = async (
  data: DashboardData,
  cakupan: string[],
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Dashboard Export');

  if (cakupan.includes('ringkasanStatistik') && data.ringkasanStatistik) {
    sheet.addRow(['Ringkasan Statistik']).font = { bold: true };
    sheet.addRow(['Total Laporan', data.ringkasanStatistik.total]);

    const selesai =
      data.ringkasanStatistik.byStatus?.find((s: any) => s.status === 'SELESAI')?.count || 0;
    sheet.addRow(['Laporan Selesai', selesai]);
    sheet.addRow(['Laporan Overdue', data.ringkasanStatistik.overdue]);
    sheet.addRow([]);
  }

  if (cakupan.includes('grafikJenisInsiden') && data.grafikJenisInsiden) {
    sheet.addRow(['Grafik Jenis Insiden']).font = { bold: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.grafikJenisInsiden.forEach((item: any) => {
      sheet.addRow([item.jenisInsiden, item.count]);
    });
    sheet.addRow([]);
  }

  if (cakupan.includes('grafikGrading') && data.grafikGrading) {
    sheet.addRow(['Grafik Grading']).font = { bold: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.grafikGrading.forEach((item: any) => {
      sheet.addRow([item.grading, item.count]);
    });
    sheet.addRow([]);
  }

  if (cakupan.includes('trenBulanan') && data.trenBulanan) {
    sheet.addRow(['Tren Bulanan']).font = { bold: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.trenBulanan.forEach((item: any) => {
      sheet.addRow([item.bulan, item.count]);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

export const generateDashboardPdf = async (
  data: DashboardData,
  cakupan: string[],
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(16).text('Dashboard Export', { align: 'center' });
    doc.moveDown(2);

    if (cakupan.includes('ringkasanStatistik') && data.ringkasanStatistik) {
      doc.font('Helvetica-Bold').fontSize(12).text('Ringkasan Statistik');
      doc.font('Helvetica').fontSize(10);
      doc.text(`Total Laporan: ${data.ringkasanStatistik.total}`);

      const selesai =
        data.ringkasanStatistik.byStatus?.find((s: any) => s.status === 'SELESAI')?.count || 0;
      doc.text(`Laporan Selesai: ${selesai}`);
      doc.text(`Laporan Overdue: ${data.ringkasanStatistik.overdue}`);
      doc.moveDown(1.5);
    }

    if (cakupan.includes('grafikJenisInsiden') && data.grafikJenisInsiden) {
      doc.font('Helvetica-Bold').fontSize(12).text('Grafik Jenis Insiden');
      doc.font('Helvetica').fontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.grafikJenisInsiden.forEach((item: any) => {
        doc.text(`${item.jenisInsiden}: ${item.count}`);
      });
      doc.moveDown(1.5);
    }

    if (cakupan.includes('grafikGrading') && data.grafikGrading) {
      doc.font('Helvetica-Bold').fontSize(12).text('Grafik Grading');
      doc.font('Helvetica').fontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.grafikGrading.forEach((item: any) => {
        doc.text(`${item.grading}: ${item.count}`);
      });
      doc.moveDown(1.5);
    }

    if (cakupan.includes('trenBulanan') && data.trenBulanan) {
      doc.font('Helvetica-Bold').fontSize(12).text('Tren Bulanan');
      doc.font('Helvetica').fontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.trenBulanan.forEach((item: any) => {
        doc.text(`${item.bulan}: ${item.count}`);
      });
    }

    doc.end();
  });
};
