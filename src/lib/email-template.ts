function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inline: **negrita** y [texto](https://enlace). Todo lo demás se escapa. */
function inline(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Solo enlaces https: nada de javascript: ni otros esquemas.
  s = s.replace(
    /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
    '<a href="$2" style="color:#111">$1</a>',
  );
  return s;
}

/** Convierte el markdown del resumen (títulos, listas, párrafos) a HTML sencillo. */
export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const line of md.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    const h = t.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h2 style="font-size:16px;margin:20px 0 6px;color:#111">${inline(h[1])}</h2>`);
      continue;
    }
    const li = t.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push('<ul style="padding-left:20px;margin:6px 0">');
        inList = true;
      }
      out.push(`<li style="margin:4px 0">${inline(li[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p style="margin:6px 0">${inline(t)}</p>`);
  }
  closeList();
  return out.join("\n");
}

export function renderBriefHtml(markdown: string, fechaLabel: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;line-height:1.5">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:20px 24px">
      <p style="margin:0;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.04em">Panel de Vida · ${escapeHtml(fechaLabel)}</p>
      ${markdownToHtml(markdown)}
    </div>
    <p style="font-size:11px;color:#a1a1aa;text-align:center;margin-top:12px">Resumen generado automáticamente. Solo lectura: no se modifica nada en tu correo ni calendario.</p>
  </div>
</body></html>`;
}
