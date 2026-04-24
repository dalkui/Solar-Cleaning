interface EmailOpts {
  preheader?: string;
  heading: string;
  intro?: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}

export function renderEmail({ preheader, heading, intro, body, cta, footer }: EmailOpts): string {
  const ctaBlock = cta
    ? `<p style="margin:24px 0 12px;"><a href="${cta.href}" style="display:inline-block;background:#F5C518;color:#08101C;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-family:Arial,sans-serif;">${cta.label}</a></p>`
    : "";

  const introBlock = intro
    ? `<p style="margin:0 0 18px;font-size:15px;color:#7A95B0;line-height:1.6;">${intro}</p>`
    : "";

  const preheaderBlock = preheader
    ? `<span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#060B14;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`
    : "";

  return `<div style="background:#060B14;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
${preheaderBlock}
<div style="max-width:560px;margin:0 auto;background:#0F1E30;border:1px solid rgba(245,197,24,0.15);border-radius:16px;overflow:hidden;">
  <div style="padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
    <span style="font-size:18px;font-weight:800;color:#F5C518;letter-spacing:-0.01em;">☀ FluroSolar</span>
  </div>
  <div style="padding:32px 28px;">
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#EFF4FF;line-height:1.3;">${heading}</h1>
    ${introBlock}
    <div style="font-size:15px;line-height:1.65;color:#EFF4FF;">${body}</div>
    ${ctaBlock}
  </div>
  <div style="padding:18px 28px 22px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(8,16,28,0.4);">
    <p style="margin:0;font-size:12px;color:#7A95B0;line-height:1.6;">
      ${footer || "Questions? Reply to this email or contact us at fluroservices@gmail.com"}
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#3A5268;">
      FluroSolar · <a href="https://flurosolar.com" style="color:#F5C518;text-decoration:none;">flurosolar.com</a>
    </p>
  </div>
</div>
</div>`;
}

export function renderEmailText({ heading, intro, body, cta, footer }: EmailOpts): string {
  const plain = body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const lines = [
    heading,
    "",
    intro || "",
    plain,
  ].filter(Boolean);
  if (cta) lines.push("", `${cta.label}: ${cta.href}`);
  if (footer) lines.push("", footer);
  lines.push("", "FluroSolar · https://flurosolar.com");
  return lines.join("\n");
}
