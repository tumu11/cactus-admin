"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Aynı tipleri burada tekrar tanımlıyoruz (ileride istersen ayrı dosyaya alırız)
type OrderItem = {
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

type Order = {
  id: number;
  customer_number: string;
  total_price: number;
  total_items: number;
  status: string;
  payment_method?: string | null;
  delivery_note2?: string | null;
  created_at: string;
  items: OrderItem[] | null;
};

export default function OrderPrintPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const loadOrder = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) {
          console.error("Order fetch error:", error.message);
          setErrorMsg("Bestellung konnte nicht geladen werden.");
          return;
        }

        setOrder(data as Order);
      } catch (err) {
        console.error("Unexpected order error:", err);
        setErrorMsg("Unerwarteter Fehler beim Laden der Bestellung.");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <p>Bestellung wird geladen…</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div
        style={{
          padding: "24px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <p style={{ color: "#b91c1c" }}>{errorMsg || "Keine Bestellung gefunden."}</p>
      </div>
    );
  }

  const date = new Date(order.created_at);
  const dateStr = isNaN(date.getTime())
    ? order.created_at
    : date.toLocaleDateString("de-DE");

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* Üst bar: Yazdır butonu (print'te gizleyeceğiz) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
        className="no-print"
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Lieferschein (Demo)</h1>
        <button
          onClick={handlePrint}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: "1px solid #16a34a",
            backgroundColor: "#dcfce7",
            color: "#166534",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Drucken / PDF
        </button>
      </div>

      {/* Firma + Müşteri bilgileri */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Cactus Großhandel
          </h2>
          <p>Holzeckstraße 1</p>
          <p>78224 Singen (Hohentwiel)</p>
          <p>Deutschland</p>
          <p style={{ marginTop: 4 }}>Tel: +49 7732 123456</p>
          <p>E-Mail: info@cactusgrosshandel.com</p>
        </div>

        <div style={{ textAlign: "right", fontSize: 13 }}>
          <p>
            <strong>Lieferschein-Nr.:</strong> {order.id}
          </p>
          <p>
            <strong>Datum:</strong> {dateStr}
          </p>
          <p>
            <strong>Kundennummer:</strong> {order.customer_number}
          </p>
          {order.payment_method && (
            <p>
              <strong>Zahlungsart:</strong>{" "}
              {order.payment_method === "bar" ? "Barzahlung" : "Auf Rechnung"}
            </p>
          )}
        </div>
      </div>

      {/* Tablo başlığı */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Pos.</th>
            <th style={thStyle}>Artikel</th>
            <th style={thStyle}>Einheit</th>
            <th style={thStyle}>Menge</th>
            <th style={thStyle}>Einzelpreis (netto)</th>
            <th style={thStyle}>Gesamt (netto)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx}>
              <td style={tdStyleCenter}>{idx + 1}</td>
              <td style={tdStyleLeft}>{it.name}</td>
              <td style={tdStyleCenter}>{it.unit}</td>
              <td style={tdStyleCenter}>{it.quantity}</td>
              <td style={tdStyleRight}>
                {it.price.toFixed(2).replace(".", ",")} €
              </td>
              <td style={tdStyleRight}>
                {(it.price * it.quantity).toFixed(2).replace(".", ",")} €
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={6} style={tdStyleLeft}>
                Keine Positionen vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Toplamlar */}
      <div style={{ textAlign: "right", fontSize: 14, marginTop: 8 }}>
        <p>
          <strong>Zwischensumme (netto):</strong>{" "}
          {order.total_price.toFixed(2).replace(".", ",")} €
        </p>
        {/* İstersen burada KDV, Brutto vs. de ekleriz */}
      </div>

      {/* Lieferhinweis */}
      {order.delivery_note2 && order.delivery_note2.trim().length > 0 && (
        <div style={{ marginTop: 24, fontSize: 13 }}>
          <strong>Lieferhinweis / gewünschte Uhrzeit:</strong>
          <p>{order.delivery_note2}</p>
        </div>
      )}

      {/* İmza alanı */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <div>
          <p>______________________________</p>
          <p>Unterschrift Fahrer</p>
        </div>
        <div>
          <p>______________________________</p>
          <p>Unterschrift Kunde</p>
        </div>
      </div>

      {/* Basit print CSS: .no-print sınıfını yazdırmada gizlemek için */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}

// Küçük style helper'ları
const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "6px 4px",
  textAlign: "left",
};

const tdStyleLeft: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  padding: "4px 4px",
  textAlign: "left",
};

const tdStyleCenter: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  padding: "4px 4px",
  textAlign: "center",
};

const tdStyleRight: React.CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  padding: "4px 4px",
  textAlign: "right",
};
