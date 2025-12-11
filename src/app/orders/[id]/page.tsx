// src/app/orders/[id]/page.tsx

import type { CSSProperties } from "react";
import { supabase } from "../../../lib/supabaseClient";
import type { Order, OrderItem } from "../../types";

type PageProps = {
  params: Promise<{ id: string }>;
};

const styles: Record<string, CSSProperties> = {
  pageRoot: {
    minHeight: "100vh",
    margin: 0,
    padding: "24px",
    boxSizing: "border-box",
    backgroundColor: "#e5e7eb", // gri arka plan
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  sheet: {
    width: "210mm", // A4 genişlik
    maxWidth: "900px",
    minHeight: "297mm",
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
    padding: "32px 40px",
    position: "relative",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827",
  },
  watermark: {
    position: "absolute",
    inset: "90px 40px 80px",
    backgroundImage: "url('/cactus-logo.png')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center center",
    backgroundSize: "60% auto",
    opacity: 0.06,
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  companyBlock: {
    fontSize: "12px",
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  companyBold: {
    fontWeight: 600,
  },
  logoBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  logoImg: {
    width: "80px",
    height: "80px",
    objectFit: "contain",
    borderRadius: "12px",
  },
  docTitle: {
    fontSize: "20px",
    fontWeight: 700,
    margin: 0,
  },
  metaTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "16px",
    marginBottom: "20px",
    fontSize: "11px",
  },
  metaTh: {
    border: "1px solid #cbd5e1",
    padding: "4px 6px",
    backgroundColor: "#e5e7eb",
    textAlign: "left",
    fontWeight: 600,
  },
  metaTd: {
    border: "1px solid #cbd5e1",
    padding: "4px 6px",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    marginTop: "16px",
    marginBottom: "4px",
  },
  paragraph: {
    fontSize: "11px",
    margin: 0,
  },
  itemsTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
    fontSize: "11px",
  },
  itemsTh: {
    border: "1px solid #cbd5e1",
    padding: "4px 6px",
    backgroundColor: "#e5e7eb",
    fontWeight: 600,
    textAlign: "left",
  },
  itemsTd: {
    border: "1px solid #e5e7eb",
    padding: "4px 6px",
    verticalAlign: "top",
  },
  itemsTdRight: {
    border: "1px solid #e5e7eb",
    padding: "4px 6px",
    textAlign: "right",
    verticalAlign: "top",
  },
  subtotalRow: {
    textAlign: "right",
    fontWeight: 600,
    paddingTop: "6px",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "80px",
    fontSize: "11px",
  },
  signBlock: {
    width: "40%",
  },
  signLine: {
    borderTop: "1px solid #111827",
    marginBottom: "4px",
  },
  signLabel: {
    fontSize: "11px",
  },
};

function formatPrice(value: number | null | undefined): string {
  const v = typeof value === "number" ? value : 0;
  return v.toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateLike: string | null | undefined): string {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return dateLike;
  return d.toLocaleDateString("de-DE");
}

function formatDateTime(dateLike: string | null | undefined): string {
  if (!dateLike) return "-";
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return dateLike;
  return d.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function paymentLabel(method: Order["payment_method"]): string {
  if (method === "bar") return "Barzahlung";
  if (method === "rechnung") return "Auf Rechnung";
  return "-";
}

function getQty(item: OrderItem): number {
  // Hem qty hem quantity olasılığını kapsayalım
  const q = (item as any).qty ?? (item as any).quantity;
  if (typeof q === "number") return q;
  const parsed = Number(q);
  return isNaN(parsed) ? 0 : parsed;
}

export default async function OrderLieferscheinPage({ params }: PageProps) {
  // ✅ params bir Promise, önce await ediyoruz
  const { id } = await params;

  const idNum = Number(id);

  if (!id || Number.isNaN(idNum)) {
    return (
      <div style={styles.pageRoot}>
        <div style={styles.sheet}>
          <p style={styles.content}>Ungültige Bestell-ID.</p>
        </div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", idNum)
    .single();

  // buradan sonrası senin mevcut kodun aynen devam etsin
  // ...


  if (error || !data) {
    console.error("Order fetch error:", error?.message);
    return (
      <div style={styles.pageRoot}>
        <div style={styles.sheet}>
          <div style={styles.content}>
            <p>Bestellung konnte nicht geladen werden.</p>
          </div>
        </div>
      </div>
    );
  }

  const order = data as Order;
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  const subtotal =
    typeof order.total_price === "number"
      ? order.total_price
      : items.reduce((sum, it) => sum + (it.price || 0) * getQty(it), 0);

  return (
    <div style={styles.pageRoot}>
      <div style={styles.sheet}>
        {/* Watermark */}
        <div style={styles.watermark} />

        <div style={styles.content}>
          {/* ÜST BÖLÜM */}
          <div style={styles.headerRow}>
            {/* Firma bilgileri */}
            <div style={styles.companyBlock}>
              <div style={styles.companyName}>Cactus Großhandel</div>
              <div>Holzeckstraße 1</div>
              <div>78224 Singen (Hohentwiel)</div>
              <div>Deutschland</div>
              <div style={{ marginTop: 4 }}>
                Tel: <span style={styles.companyBold}>+49 7732 123456</span>
              </div>
              <div>
                E-Mail: <span style={styles.companyBold}>info@cactusgrosshandel.com</span>
              </div>
            </div>

            {/* Sağ üst logo + başlık */}
            <div style={styles.logoBox}>
              <img src="/cactus-logo.png" alt="Cactus Logo" style={styles.logoImg} />
              <h1 style={styles.docTitle}>Lieferschein</h1>
            </div>
          </div>

          {/* Müşteri & tarih bilgileri tablosu */}
          <table style={styles.metaTable}>
            <thead>
              <tr>
                <th style={styles.metaTh}>Kundennummer</th>
                <th style={styles.metaTh}>Lieferschein-Nr.</th>
                <th style={styles.metaTh}>Datum</th>
                <th style={styles.metaTh}>Bestellung erstellt</th>
                <th style={styles.metaTh}>Zahlungsart</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.metaTd}>{order.customer_number}</td>
                <td style={styles.metaTd}>#{order.id}</td>
                <td style={styles.metaTd}>{formatDate(order.created_at)}</td>
                <td style={styles.metaTd}>{formatDateTime(order.created_at)}</td>
                <td style={styles.metaTd}>{paymentLabel(order.payment_method)}</td>
              </tr>
            </tbody>
          </table>

          {/* Lieferhinweis */}
          <div>
            <h3 style={styles.sectionTitle}>Lieferhinweis</h3>
            <p style={styles.paragraph}>
              {order.delivery_note && order.delivery_note.trim().length > 0
                ? order.delivery_note
                : "Kein Hinweis."}
            </p>
          </div>

          {/* ARTİKEL TABLOSU */}
          <h3 style={styles.sectionTitle}>
            Artikel · Anzahl: {order.total_items ?? items.length} · Summe (netto):{" "}
            {formatPrice(subtotal)}
          </h3>

          <table style={styles.itemsTable}>
            <thead>
              <tr>
                <th style={styles.itemsTh}>Pos.</th>
                <th style={styles.itemsTh}>Artikel</th>
                <th style={styles.itemsTh}>Einheit</th>
                <th style={styles.itemsTh}>Menge</th>
                <th style={styles.itemsTh}>Einzelpreis (netto)</th>
                <th style={styles.itemsTh}>Gesamt (netto)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const qty = getQty(it);
                const lineTotal = (it.price || 0) * qty;

                return (
                  <tr key={idx}>
                    <td style={styles.itemsTd}>{idx + 1}</td>
                    <td style={styles.itemsTd}>{it.name}</td>
                    <td style={styles.itemsTd}>{it.unit}</td>
                    <td style={styles.itemsTdRight}>{qty}</td>
                    <td style={styles.itemsTdRight}>{formatPrice(it.price)}</td>
                    <td style={styles.itemsTdRight}>{formatPrice(lineTotal)}</td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={styles.itemsTd}>
                    Keine Artikel vorhanden.
                  </td>
                </tr>
              )}

              {/* Zwischensumme */}
              <tr>
                <td colSpan={5} style={styles.itemsTdRight}>
                  <strong>Zwischensumme (netto):</strong>
                </td>
                <td style={styles.itemsTdRight}>
                  <strong>{formatPrice(subtotal)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* İMZA ALANI */}
          <div style={styles.footerRow}>
            <div style={styles.signBlock}>
              <div style={styles.signLine} />
              <div style={styles.signLabel}>Unterschrift Fahrer</div>
            </div>
            <div style={styles.signBlock}>
              <div style={styles.signLine} />
              <div style={styles.signLabel}>Unterschrift Kunde</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
