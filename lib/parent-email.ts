import { Resend } from "resend";

function appOrigin(): string {
  const u = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return u.replace(/\/$/, "");
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Studelio <onboarding@resend.dev>";
}

export type ParentEmailResult = { ok: true } | { ok: false; reason: string };

export async function sendParentNewAccountEmail(params: {
  to: string;
  studentName: string;
  temporaryPassword: string;
}): Promise<ParentEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "RESEND_API_KEY manquant" };
  }

  const loginUrl = `${appOrigin()}/auth/login`;
  const resend = new Resend(key);

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: params.to,
    subject: `${params.studentName} a rejoint Studelio — ton accès parent`,
    html: `
      <p>Bonjour,</p>
      <p><strong>${escapeHtml(params.studentName)}</strong> vient de créer un compte élève sur Studelio. Un espace parent a été ouvert pour toi afin de suivre sa progression (résultats, statistiques, activité).</p>
      <p><strong>Connexion :</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p><strong>Email :</strong> ${escapeHtml(params.to)}</p>
      <p><strong>Mot de passe provisoire :</strong> <code style="font-size:14px;padding:2px 6px;background:#f4f4f5;border-radius:4px">${escapeHtml(params.temporaryPassword)}</code></p>
      <p>Change ce mot de passe après ta première connexion dès que l’option sera disponible dans les paramètres.</p>
      <p>— L’équipe Studelio</p>
    `,
  });

  if (error) {
    console.error("[Resend] parent new account:", error);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function sendParentChildLinkedEmail(params: {
  to: string;
  studentName: string;
}): Promise<ParentEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "RESEND_API_KEY manquant" };
  }

  const loginUrl = `${appOrigin()}/auth/login`;
  const resend = new Resend(key);

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: params.to,
    subject: `${params.studentName} a relié son compte à ton espace parent Studelio`,
    html: `
      <p>Bonjour,</p>
      <p><strong>${escapeHtml(params.studentName)}</strong> vient de s’inscrire sur Studelio et t’a désigné comme parent. Tu peux déjà suivre son activité depuis ton espace habituel.</p>
      <p><strong>Connexion :</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      <p>— L’équipe Studelio</p>
    `,
  });

  if (error) {
    console.error("[Resend] parent child linked:", error);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
