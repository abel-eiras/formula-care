/**
 * reCAPTCHA Enterprise opcional contra el envío masivo de solicitudes.
 * Solo se exige si están las tres variables de entorno.
 */
const ACCION = 'solicitar_cita';

export function captchaActivo(): boolean {
  return !!(process.env.RECAPTCHA_ENTERPRISE_API_KEY && process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID && process.env.RECAPTCHA_SITE_KEY);
}

export async function verificarCaptcha(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const { RECAPTCHA_ENTERPRISE_API_KEY: apiKey, RECAPTCHA_ENTERPRISE_PROJECT_ID: proyecto, RECAPTCHA_SITE_KEY: siteKey } = process.env;
  try {
    const respuesta = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${proyecto}/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { token, expectedAction: ACCION, siteKey } }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!respuesta.ok) return false;
    const datos = (await respuesta.json()) as { tokenProperties?: { valid?: boolean } };
    return datos.tokenProperties?.valid === true;
  } catch (error) {
    console.error('Error al verificar reCAPTCHA:', error);
    return false;
  }
}
