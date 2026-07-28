import { Resend } from 'resend';
import { env } from '@/config/env';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'notifikasi@smartrose.id';

function baseTemplate(title: string, bodyHtml: string, ctaText?: string, ctaUrl?: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #1a56db;">${title}</h2>
    ${bodyHtml}
    ${
      ctaText && ctaUrl
        ? `
      <a href="${ctaUrl}" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#1a56db; color:#fff; text-decoration:none; border-radius:6px;">${ctaText}</a>
    `
        : ''
    }
    <p style="margin-top:24px; font-size:12px; color:#888;">Email otomatis dari Smart-Rose. Mohon tidak membalas email ini.</p>
  </div>`;
}

export async function sendNewReportNotification(
  adminEmails: string[],
  report: { trackingNumber: string; unitKerja: string; jenisInsiden: string },
) {
  const html = baseTemplate(
    'Laporan Insiden Baru Masuk',
    `<p>Ada laporan insiden baru yang perlu ditinjau:</p>
     <ul>
       <li><b>No. Tracking:</b> ${report.trackingNumber}</li>
       <li><b>Unit Kerja:</b> ${report.unitKerja}</li>
       <li><b>Jenis Insiden:</b> ${report.jenisInsiden}</li>
     </ul>`,
    'Lihat Laporan',
    `${env.EMAIL_BASE_URL}/admin/reports?q=${report.trackingNumber}`,
  );

  return resend.emails.send({
    from: FROM,
    to: adminEmails,
    subject: `[Smart-Rose] Laporan Baru: ${report.trackingNumber}`,
    html,
  });
}

export async function sendStatusChangeNotification(
  pelaporEmail: string,
  report: { trackingNumber: string; statusLama: string; statusBaru: string },
) {
  const html = baseTemplate(
    'Status Laporan Anda Diperbarui',
    `<p>Status laporan dengan nomor <b>${report.trackingNumber}</b> telah berubah:</p>
     <p>${report.statusLama} → <b>${report.statusBaru}</b></p>`,
    'Lihat Detail',
    `${env.EMAIL_BASE_URL}/laporan/${report.trackingNumber}`,
  );

  return resend.emails.send({
    from: FROM,
    to: pelaporEmail,
    subject: `[Smart-Rose] Status Laporan ${report.trackingNumber} Diperbarui`,
    html,
  });
}

export async function sendAssignmentNotification(
  investigatorEmail: string,
  report: { trackingNumber: string; unitKerja: string },
) {
  const html = baseTemplate(
    'Anda Ditugaskan untuk Investigasi',
    `<p>Anda ditugaskan untuk menginvestigasi laporan berikut:</p>
     <ul>
       <li><b>No. Tracking:</b> ${report.trackingNumber}</li>
       <li><b>Unit Kerja:</b> ${report.unitKerja}</li>
     </ul>`,
    'Mulai Investigasi',
    `${env.EMAIL_BASE_URL}/admin/reports?q=${report.trackingNumber}`,
  );

  return resend.emails.send({
    from: FROM,
    to: investigatorEmail,
    subject: `[Smart-Rose] Tugas Investigasi Baru: ${report.trackingNumber}`,
    html,
  });
}

export async function sendEmailChangedNotification({
  oldEmail,
  newEmail,
  nama,
}: {
  oldEmail: string;
  newEmail: string;
  nama: string;
}) {
  const html = baseTemplate(
    'Email Akun Anda Telah Diubah',
    `<p>Halo ${nama},</p>
     <p>Email akun Anda telah berhasil diubah menjadi: <b>${newEmail}</b>.</p>
     <p>Sebagai langkah keamanan, semua sesi login lama Anda telah diakhiri (invalidated). Silakan login kembali menggunakan email baru Anda.</p>
     <p>Jika Anda tidak merasa melakukan perubahan ini, segera hubungi Admin Utama.</p>`,
  );

  return Promise.all([
    resend.emails.send({
      from: FROM,
      to: oldEmail,
      subject: '🔐 [SMART-ROSE] Email Akun Anda Telah Diubah',
      html,
    }),
    resend.emails.send({
      from: FROM,
      to: newEmail,
      subject: '🔐 [SMART-ROSE] Email Akun Anda Telah Diubah',
      html,
    }),
  ]);
}
