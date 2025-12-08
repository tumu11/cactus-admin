"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Order } from "./types";

const STATUS_OPTIONS = [
  "neu",
  "in_bearbeitung",
  "unterwegs",
  "geliefert",
  "storniert",
];

const STATUS_LABEL: Record<string, string> = {
  neu: "Neu",
  in_bearbeitung: "In Bearbeitung",
  unterwegs: "Unterwegs",
  geliefert: "Geliefert",
  storniert: "Storniert",
};

const STATUS_COLOR: Record<string, string> = {
  neu: "#22c55e",
  in_bearbeitung: "#eab308",
  unterwegs: "#0ea5e9",
  geliefert: "#16a34a",
  storniert: "#ef4444",
};

export default function AdminPage() {
  // basit admin login (tek şifre)
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | string>("all");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ------- Fake login (env ile koruyalım) ----------
  const ADMIN_PASSWORD =
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "cactus-admin";

  const handleLogin = () => {
    if (adminPassInput === ADMIN_PASSWORD) {
      setLoggedIn(true);
    } else {
      alert("Falsches Admin-Passwort.");
    }
  };

  // ------- Orders çek ---------
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Orders fetch error:", error.message);
        setErrorMsg("Bestellungen konnten nicht geladen werden.");
        return;
      }

      setOrders((data || []) as Order[]);
    } catch (err) {
      console.error("Unexpected orders error:", err);
      setErrorMsg("Unerwarteter Fehler beim Laden der Bestellungen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      fetchOrders();
    }
  }, [loggedIn]);

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (selectedStatusFilter !== "all") {
      list = list.filter((o) => o.status === selectedStatusFilter);
    }

    if (searchCustomer.trim()) {
      const s = searchCustomer.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.customer_number.toLowerCase().includes(s) ||
          (o.delivery_note || "").toLowerCase().includes(s)
      );
    }

    return list;
  }, [orders, selectedStatusFilter, searchCustomer]);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (order.status === newStatus) return;

    if (!confirm(`Bestellung #${order.id} auf "${STATUS_LABEL[newStatus]}" setzen?`)) {
      return;
    }

    try {
      setUpdatingStatus(true);
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) {
        console.error("Update status error:", error.message);
        alert("Status konnte nicht aktualisiert werden.");
        return;
      }

      // local state güncelle
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error("Unexpected status update error:", err);
      alert("Unerwarteter Fehler beim Aktualisieren des Status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ---------- Login ekranı ----------
  if (!loggedIn) {
    return (
      <div style={styles.loginRoot}>
        <div style={styles.loginCard}>
          <h1 style={{ marginBottom: 8 }}>Cactus Admin</h1>
          <p style={{ marginBottom: 16, color: "#64748b" }}>
            Interner Bereich für Bestellungen.
          </p>

          <label style={styles.label}>
            Admin-Passwort
            <input
              type="password"
              value={adminPassInput}
              onChange={(e) => setAdminPassInput(e.target.value)}
              style={styles.input}
            />
          </label>

          <button style={styles.primaryBtn} onClick={handleLogin}>
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  // ---------- Admin panel ----------
  return (
    <div style={styles.appRoot}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Cactus Admin · Bestellungen</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
            Übersicht aller App-Bestellungen aus Supabase.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={fetchOrders} disabled={loading}>
            {loading ? "Aktualisiere…" : "Neu laden"}
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div style={styles.filtersRow}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={{
              ...styles.chip,
              ...(selectedStatusFilter === "all" ? styles.chipActive : {}),
            }}
            onClick={() => setSelectedStatusFilter("all")}
          >
            Alle
          </button>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              style={{
                ...styles.chip,
                ...(selectedStatusFilter === st ? styles.chipActive : {}),
              }}
              onClick={() => setSelectedStatusFilter(st)}
            >
              {STATUS_LABEL[st]}
            </button>
          ))}
        </div>

        <input
          placeholder="Nach Kundennummer / Notiz suchen…"
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          style={{ ...styles.input, maxWidth: 260 }}
        />
      </div>

      <div style={styles.mainLayout}>
        {/* Orders list */}
        <div style={styles.ordersList}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Kunde</th>
                <th style={styles.th}>Datum</th>
                <th style={styles.th}>Artikel</th>
                <th style={styles.th}>Summe</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}>#{o.id}</td>
                  <td style={styles.td}>{o.customer_number}</td>
                  <td style={styles.td}>
                    {new Date(o.created_at).toLocaleString("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td style={styles.td}>{o.total_items}</td>
                  <td style={styles.td}>
                    {o.total_price.toFixed(2).replace(".", ",")} €
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor:
                          STATUS_COLOR[o.status] || "rgba(148,163,184,0.2)",
                      }}
                    >
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.smallBtn}
                      onClick={() => setSelectedOrder(o)}
                    >
                      Details
                    </button>

                    <button
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "#0ea5e9",
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: 12,
                        cursor: "pointer",
                        marginLeft: 8,
                      }}
                      onClick={() => window.open(`/orders/${o.id}`, "_blank")}
                    >
                      Lieferschein
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#64748b" }}>
                    Keine Bestellungen gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        <div style={styles.detailPanel}>
          {selectedOrder ? (
            <>
              <h2 style={{ marginTop: 0 }}>Bestellung #{selectedOrder.id}</h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                Kunde: <b>{selectedOrder.customer_number}</b>
              </p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                Datum:{" "}
                {new Date(selectedOrder.created_at).toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>

              <p style={{ marginTop: 12, fontSize: 14 }}>
                Artikel: <b>{selectedOrder.total_items}</b> · Summe:{" "}
                <b>
                  {selectedOrder.total_price
                    .toFixed(2)
                    .replace(".", ",")}{" "}
                  €
                </b>
              </p>

              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Zahlungsart</h3>
                <p style={{ fontSize: 13, color: "#334155" }}>
                  {selectedOrder.payment_method === "bar"
                    ? "Barzahlung"
                    : selectedOrder.payment_method === "rechnung"
                      ? "Auf Rechnung"
                      : "–"}
                </p>
              </div>

              <div style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Lieferhinweis</h3>
                <p style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>
                  {selectedOrder.delivery_note || "Kein Hinweis."}
                </p>
              </div>

              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Artikel</h3>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13 }}>
                  {(selectedOrder.items || []).map((it, idx) => (
                    <li key={idx}>
                      {it.quantity}× {it.unit} – {it.name} (
                      {it.price.toFixed(2).replace(".", ",")} €)
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  style={styles.smallBtn}
                  onClick={() => window.open(`/orders/${selectedOrder.id}`, "_blank")}
                >
                  Lieferschein öffnen
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>Status ändern</h3>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder, e.target.value)}
                  disabled={updatingStatus}
                  style={styles.select}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABEL[st]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              Rechts einen Auftrag auswählen, um Details zu sehen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// -------- Basit inline "CSS" objeleri --------
const styles: Record<string, React.CSSProperties> = {
  loginRoot: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
  },
  loginCard: {
    background: "#ffffff",
    padding: 24,
    borderRadius: 16,
    width: 320,
    boxShadow: "0 10px 40px rgba(15,23,42,0.4)",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  input: {
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    padding: "8px 10px",
    fontSize: 14,
  },
  select: {
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    padding: "6px 8px",
    fontSize: 13,
  },
  primaryBtn: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 999,
    background: "#16a34a",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    border: "none",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#0f172a",
    fontWeight: 500,
    fontSize: 13,
    border: "none",
    cursor: "pointer",
  },
  smallBtn: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#0ea5e9",
    color: "#ffffff",
    fontSize: 12,
    border: "none",
    cursor: "pointer",
  },
  appRoot: {
    minHeight: "100vh",
    background: "#0f172a",
    padding: 24,
    boxSizing: "border-box",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    color: "#e2e8f0",
  },
  filtersRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#1f2937",
    padding: "6px 10px",
    fontSize: 12,
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  chipActive: {
    background: "#22c55e",
    borderColor: "#22c55e",
    color: "#022c22",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 16,
    height: "calc(100vh - 130px)",
  },
  ordersList: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 12,
    overflow: "auto",
  },
  detailPanel: {
    background: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    overflowY: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "6px 8px",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 600,
    fontSize: 12,
    color: "#475569",
    position: "sticky",
    top: 0,
    background: "#f8fafc",
    zIndex: 1,
  },
  tr: {
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "6px 8px",
    verticalAlign: "middle",
  },
  statusBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    color: "#0f172a",
    background: "#e5e7eb",
  },
};
