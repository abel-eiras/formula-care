/**
 * Prueba de conexión SMTP (uso puntual, no commitear contraseñas).
 * Uso: SMTP_HOST=mail.formulafarma.com SMTP_PORT=465 SMTP_USER=... SMTP_PASS='...' node backend/scripts/test-smtp.mjs
 */
import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'mail.formulafarma.com';
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const secure = process.env.SMTP_SECURE !== 'false';
const user = process.env.SMTP_USER || 'formulacare@formulafarma.com';
const pass = process.env.SMTP_PASS;

if (!pass) {
  console.error('Falta SMTP_PASS en el entorno.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(process.env.SMTP_ACCEPT_SELF_SIGNED === 'true' && { tls: { rejectUnauthorized: false } }),
});

console.log('Probando conexión a', host + ':' + port, '(secure:', secure, ')...');

transporter
  .verify()
  .then(() => {
    console.log('OK: Conexión y autenticación correctas.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    if (err.code) console.error('Código:', err.code);
    process.exit(1);
  });
