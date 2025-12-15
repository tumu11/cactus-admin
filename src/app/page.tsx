"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Order } from "./types";

/**
 * STATUS
 */
const STATUS_OPTIONS = [
  "neu",
  "in_bearbeitung",
  "unterwegs",
  "geliefert",
  "storniert",
] as const;

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

/**
 * CUSTOMER TYPE
 * Supabase customers tablonun kolonlarına göre:
 * customer_number, name, owner_name, street, zip, city, phone, email, is_active
 */
type Customer = {
  customer_number: string;
  name: string | null;
  owner_name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
};

type CustomerMap = Record<string, Customer>;

function formatPriceEUR(value: number | null | undefined) {
  const v = typeof value === "number" ? value : 0;
  return `${v.toFixed(2).replace(".", ",")} €`;
}

function safeLower(x: unknown) {
  return String(x ?? "").toLowerCase();
}

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

  // ✅ Customers cache/map
  const [customersByNumber, setCustomersByNumber] = useState<CustomerMap>({});
  const [customersLoading, setCustomersLoading] = useState(false);

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

  /**
   * Orders çek
   */
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

      const list = (data || []) as Order[];
      setOrders(list);

      // ✅ Orders geldiyse, customer bilgilerini de çek (tek seferde)
      // Not: customers tablosunu komple çekmek burada en pratik (müşteri sayısı az).
      // İstersen ileride sadece gerekli customer_number’ları IN(...) ile çekeriz.
      await fetchCustomersForOrders();
    } catch (err) {
      console.error("Unexpected orders error:", err);
      setErrorMsg("Unerwarteter Fehler beim Laden der Bestellungen.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Customers çek
   * Burada HATA: company_name gibi olmayan kolonlar istenirse Supabase patlıyor.
   * Senin tabloda company_name YOK, name VAR.
   */
  const fetchCustomersForOrders = async () => {
    try {
      setCustomersLoading(true);

      const { data, error } = await supabase
        .from("customers")
        .select(
          "customer_number,name,owner_name,street,zip,city,phone,email,is_active"
        );

      if (error) {
        console.error('Customers fetch error:', error.message);
        return;
      }

      const map: CustomerMap = {};
      (data || []).forEach((c: any) => {
        const key = String(c.customer_number ?? "").trim();
        if (!key) return;
        map[key] = {
          customer_number: key,
          name: c.name ?? null,
          owner_name: c.owner_name ?? null,
          street: c.street ?? null,
          zip: c.zip ?? null,
          city: c.city ?? null,
          phone: c.phone ?? null,
          email: c.email ?? null,
          is_active: typeof c.is_active === "boolean" ? c.is_active : null,
        };
      });

      setCustomersByNumber(map);
    } catch (err) {
      console.error("Unexpected customers error:", err);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const filteredOrders = useMemo(() => {
    let list = orders;

    if (selectedStatusFilter !== "all") {
      list = list.filter((o) => o.status === selectedStatusFilter);
    }

    if (searchCustomer.trim()) {
      const s = searchCustomer.trim().toLowerCase();

      list = list.filter((o) => {
        const num = safeLower(o.customer_number);
        const note = safeLower((o as any).delivery_note);
        const customer = customersByNumber[String(o.customer_number)] || null;

        const name = safeLower(customer?.name);
        const owner = safeLower(customer?.owner_name);
        const phone = safeLower(customer?.phone);
        const email = safeLower(customer?.email);
        const city = safeLower(customer?.city);
        const street = safeLower(customer?.street);

        return (
          num.includes(s) ||
          note.includes(s) ||
          name.includes(s) ||
          owner.includes(s) ||
          phone.includes(s) ||
          email.includes(s) ||
          city.includes(s) ||
          street.includes(s)
        );
      });
    }

    return list;
  }, [orders, selectedStatusFilter, searchCustomer, customersByNumber]);

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

  // seçili siparişin müşteri bilgisi
  const selectedCustomer =
    selectedOrder ? customersByNumber[String(selectedOrder.customer_number)] : null;

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
          <button
            style={styles.secondaryBtn}
            onClick={fetchOrders}
            disabled={loading}
            title={customersLoading ? "Kundendaten werden ebenfalls geladen…" : ""}
          >
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
          placeholder="Suche: Kunde / Nummer / Tel / Mail…"
          value={searchCustomer}
          onChange={(e) => setSearchCustomer(e.target.value)}
          style={{ ...styles.input, maxWidth: 320 }}
        />
      </div>

      <div style={styles.mainLayout}>
        {/* Orders list */}
        <div style={styles.ordersList}>
          {errorMsg && (
            <div style={styles.errorBox}>
              {errorMsg}
            </div>
          )}

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
              {filteredOrders.map((o) => {
                const cust = customersByNumber[String(o.customer_number)] || null;
                const displayName = cust?.name?.trim() ? cust.name : String(o.customer_number);

                return (
                  <tr key={o.id} style={styles.tr}>
                    <td style={styles.td}>#{o.id}</td>

                    {/* ✅ Kunde: isim + altta numara */}
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Nr: {o.customer_number}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {new Date(o.created_at).toLocaleString("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>

                    <td style={styles.td}>{o.total_items}</td>

                    <td style={styles.td}>
                      {formatPriceEUR(o.total_price)}
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
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={styles.smallBtn}
                          onClick={() => setSelectedOrder(o)}
                        >
                          Details
                        </button>

                        <a
                          href={`/api/orders/${o.id}/lieferschein`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-black px-3 py-1.5 text-white text-sm hover:opacity-90"
                        >
                          Lieferschein (PDF)
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
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
              <div style={styles.detailHeaderRow}>
                <h2 style={{ marginTop: 0, marginBottom: 0 }}>
                  Bestellung #{selectedOrder.id}
                </h2>

                <button
                  style={styles.lieferscheinBtn}
                  onClick={() => window.open(`/api/orders/${selectedOrder.id}/lieferschein`, "_blank")}
                >
                  Lieferschein (PDF) öffnen
                </button>
              </div>

              {/* ✅ Customer Card */}
              <div style={styles.customerCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Kunde</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                      {selectedCustomer?.name?.trim()
                        ? selectedCustomer.name
                        : String(selectedOrder.customer_number)}
                    </div>

                    <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                      Kundennummer: <b style={{ color: "#0f172a" }}>{selectedOrder.customer_number}</b>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Status Kunde</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {selectedCustomer?.is_active === false ? "Inaktiv" : "Aktiv"}
                    </div>
                  </div>
                </div>

                <div style={styles.customerGrid}>
                  <div>
                    <div style={styles.customerLabel}>Ansprechpartner</div>
                    <div style={styles.customerValue}>
                      {selectedCustomer?.owner_name?.trim() ? selectedCustomer.owner_name : "-"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.customerLabel}>Telefon</div>
                    <div style={styles.customerValue}>
                      {selectedCustomer?.phone?.trim() ? selectedCustomer.phone : "-"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.customerLabel}>E-Mail</div>
                    <div style={styles.customerValue}>
                      {selectedCustomer?.email?.trim() ? selectedCustomer.email : "-"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.customerLabel}>Adresse</div>
                    <div style={styles.customerValue}>
                      {(selectedCustomer?.street || selectedCustomer?.zip || selectedCustomer?.city) ? (
                        <>
                          <div>{selectedCustomer.street || "-"}</div>
                          <div>
                            {(selectedCustomer.zip || "-")} {selectedCustomer.city || ""}
                          </div>
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>
                Datum:{" "}
                {new Date(selectedOrder.created_at).toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>

              <p style={{ marginTop: 12, fontSize: 14 }}>
                Artikel: <b>{selectedOrder.total_items}</b> · Summe:{" "}
                <b>{formatPriceEUR(selectedOrder.total_price)}</b>
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
                  {(selectedOrder.items || []).map((it: any, idx: number) => {
                    const qty = typeof it.qty === "number" ? it.qty : Number(it.qty ?? it.quantity ?? 0);
                    return (
                      <li key={idx}>
                        {qty}× {it.unit} – {it.name} ({formatPriceEUR(it.price)})
                      </li>
                    );
                  })}
                </ul>
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

// -------- Inline styles --------
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
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  select: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#cbd5e1",
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
    background: "#fff",
  },
  primaryBtn: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 999,
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    border: "none",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#0f172a",
    fontWeight: 600,
    fontSize: 13,
    border: "none",
    cursor: "pointer",
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#0ea5e9",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  },
  lieferscheinBtn: {
    padding: "6px 10px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#0ea5e9",
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: 700,
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
    fontWeight: 700,
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
    padding: "10px 10px",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 800,
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
    padding: "10px 10px",
    verticalAlign: "middle",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#0f172a",
    background: "#e5e7eb",
  },
  errorBox: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    background: "#fee2e2",
    color: "#7f1d1d",
    fontSize: 13,
    fontWeight: 700,
  },
  detailHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  customerCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    background: "#ffffff",
  },
  customerGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  customerLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 800,
    marginBottom: 3,
  },
  customerValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 600,
  },
};
