interface EmailOpts {
  preheader?: string;
  heading: string;
  intro?: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}

export function renderEmail({ preheader, heading, intro, body, cta, footer }: EmailOpts): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#060B14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#EFF4FF;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#060B14;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#0F1E30;border:1px solid rgba(245,197,24,0.15);border-radius:16px;overflow:hidden;">

        <!-- Header bar -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:left;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="display:inline-block;width:32px;height:32px;border-radius:50%;background:#F5C518;text-align:center;line-height:32px;font-size:18px;vertical-align:middle;margin-right:10px;">☀️</div>
                  <span style="font-size:18px;font-weight:800;color:#F5C518;letter-spacing:-0.01em;vertical-align:middle;">FluroSolar</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#EFF4FF;line-height:1.3;">${heading}</h1>
            ${intro ? `<p style="margin:0 0 18px;font-size:15px;color:#7A95B0;line-height:1.6;">${intro}</p>` : ""}
            <div style="font-size:15px;line-height:1.7;color:#EFF4FF;">${body}</div>
            ${cta ? `
              <div style="margin:28px 0 12px;">
                <a href="${cta.href}" style="display:inline-block;background:#F5C518;color:#08101C;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;">${cta.label}</a>
              </div>
            ` : ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(8,16,28,0.4);">
            <p style="margin:0;font-size:12px;color:#3A5268;line-height:1.6;">
              ${footer || "Questions? Reply to this email or contact us at fluroservices@gmail.com"}
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#3A5268;">
              FluroSolar · Solar panel cleaning subscriptions<br/>
              <a href="https://flurosolar.com" style="color:#F5C518;text-decoration:none;">flurosolar.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}
