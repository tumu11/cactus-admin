import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";
import type { Order, OrderItem } from "../../app/types";
import path from "path";
import { Font } from "@react-pdf/renderer";

const fontPath = (p: string) => path.join(process.cwd(), "public", "fonts", p);

Font.register({
    family: "Inter",
    fonts: [
        { src: fontPath("Inter-Light.ttf"), fontWeight: 300 },
        { src: fontPath("Inter-Regular.ttf"), fontWeight: 400 },
        { src: fontPath("Inter-SemiBold.ttf"), fontWeight: 600 },
    ],
});

type CustomerInfo = {
    name?: string | null;
    owner_name?: string | null;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
};

type Props = {
    order: Order;
    items: OrderItem[];
    customer?: CustomerInfo | null;
    logoUrl: string; // absolute URL
};

function formatPrice(value: number | null | undefined): string {
    const v = typeof value === "number" ? value : 0;
    return v.toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateLike: string | null | undefined): string {
    if (!dateLike) return "-";
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return String(dateLike);
    return d.toLocaleDateString("de-DE");
}

function formatDateTime(dateLike: string | null | undefined): string {
    if (!dateLike) return "-";
    const d = new Date(dateLike);
    if (isNaN(d.getTime())) return String(dateLike);
    return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function paymentLabel(method: Order["payment_method"]): string {
    if (method === "bar") return "Barzahlung";
    if (method === "rechnung") return "Auf Rechnung";
    return "-";
}

function getQty(item: OrderItem): number {
    const q = (item as any).qty ?? (item as any).quantity;
    if (typeof q === "number") return q;
    const parsed = Number(q);
    return isNaN(parsed) ? 0 : parsed;
}

const styles = StyleSheet.create({
    page: {
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 26,

        fontSize: 8.6,
        lineHeight: 1.12,
        color: "#111827",

        fontFamily: "Inter",
        fontWeight: 300, // 🔥 default LIGHT
        position: "relative",
    },

    watermark: {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 360,
        height: 360,
        transform: "translate(-180px, -180px)",
        opacity: 0.04, // ⬅ daha zarif
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 15,
    },

    // Firma bloğunu daha sık yapıyoruz
    companyBlock: {
        width: "60%",
    },

    // satır arası az olsun diye her satıra aynı style uygulayacağız
    lineTight: {
        marginBottom: 1.4, // ✅ önce çok boşluk vardı
    },

    companyName: {
        fontSize: 11,
        fontWeight: 600, // SemiBold
        marginBottom: 4,
    },

    companyBold: {
        fontWeight: 600, // ✅ 700 yerine 600
    },

    logoBox: {
        width: "40%",
        alignItems: "flex-end",
    },

    logo: {
        width: 66,
        height: 66,
        objectFit: "contain",
        borderRadius: 10,
        marginBottom: 5,
    },

    title: {
        fontSize: 15,
        fontWeight: 600, // ✅ 700 yerine 600
    },

    sectionTitle: {
        fontSize: 9.6,
        fontWeight: 600,
        marginTop: 8,
        marginBottom: 5,
    },

    paragraph: {
        fontSize: 8.6,
        lineHeight: 1.3,
        fontWeight: 300, // Light
    },

    // tablolar daha ince/daha minimal
    metaTable: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },

    metaRowHeader: {
        flexDirection: "row",
        backgroundColor: "#eef2f7",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
    },

    metaRow: {
        flexDirection: "row",
    },

    metaCell: {
        paddingVertical: 3.5,
        paddingHorizontal: 5,
        borderRightWidth: 1,
        borderRightColor: "#cbd5e1",
        flexGrow: 1,
        flexBasis: 0,
    },

    metaCellLast: {
        borderRightWidth: 0,
    },

    metaHeadText: {
        fontSize: 8.1,
        fontWeight: 600,
    },

    metaBodyText: {
        fontSize: 8.4,
        fontWeight: 300,
    },

    itemsTable: {
        marginTop: 7,
        borderWidth: 1,
        borderColor: "#cbd5e1",
    },

    itemsHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#eef2f7",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
    },

    itemRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },

    // ✅ satır içi paddingleri daha da azalt
    cellPos: { width: "5%", paddingVertical: 3.5, paddingHorizontal: 4 },
    cellName: { width: "40%", paddingVertical: 3.5, paddingHorizontal: 4 },
    cellUnit: { width: "15%", paddingVertical: 3.5, paddingHorizontal: 4 },
    cellQty: {
        width: "8%",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
        textAlign: "right",
    },
    cellPrice: {
        width: "22%",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
        textAlign: "right",
    },
    cellTotal: {
        width: "19%",
        paddingVertical: 3.5,
        paddingHorizontal: 4,
        textAlign: "right",
    },

    bold: {
        fontWeight: 600, // SemiBold, asla 700 yok
    },

    subtotalRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 6,
    },

    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 70,
    },

    signBlock: {
        width: "42%",
    },

    signLine: {
        borderTopWidth: 1,
        borderTopColor: "#111827",
        marginBottom: 4,
    },

    signLabel: {
        fontSize: 9,
        fontWeight: 600,
    },
});

export default function LieferscheinDocument({
    order,
    items,
    customer,
    logoUrl,
}: Props) {
    const subtotal =
        typeof order.total_price === "number"
            ? order.total_price
            : items.reduce((sum, it) => sum + (it.price || 0) * getQty(it), 0);

    const customerName = customer?.name ?? String(order.customer_number);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* watermark */}
                <Image src={logoUrl} style={styles.watermark} />

                {/* header */}
                <View style={styles.headerRow}>
                    <View style={styles.companyBlock}>
                        <Text style={styles.companyName}>Cactus Großhandel</Text>

                        <Text style={styles.lineTight}>Holzeckstraße 1</Text>
                        <Text style={styles.lineTight}>78224 Singen (Hohentwiel)</Text>
                        <Text style={styles.lineTight}>Deutschland</Text>

                        <Text style={styles.lineTight}>
                            Tel: <Text style={styles.companyBold}>+49 15568 538598</Text>
                        </Text>
                        <Text style={styles.lineTight}>
                            E-Mail:{" "}
                            <Text style={styles.companyBold}>info@cactusgrosshandel.com</Text>
                        </Text>
                        <Text style={styles.lineTight}>
                            Website:{" "}
                            <Text style={styles.companyBold}>www.cactusgrosshandel.com</Text>
                        </Text>
                    </View>

                    <View style={styles.logoBox}>
                        <Image src={logoUrl} style={styles.logo} />
                        <Text style={styles.title}>Lieferschein</Text>
                    </View>
                </View>

                {/* customer */}
                <Text style={styles.sectionTitle}>Empfänger (Kunde)</Text>
                <Text style={styles.paragraph}>
                    <Text style={styles.bold}>{customerName}</Text>
                    {"\n"}
                    {customer?.owner_name ? `Inhaber: ${customer.owner_name}\n` : ""}
                    {customer?.street ? `${customer.street}\n` : ""}
                    {customer?.zip || customer?.city
                        ? `${customer?.zip ?? ""} ${customer?.city ?? ""}\n`
                        : ""}
                    {customer?.phone ? `Tel: ${customer.phone}\n` : ""}
                    {customer?.email ? `E-Mail: ${customer.email}` : ""}
                </Text>

                {/* meta */}
                <View style={styles.metaTable}>
                    <View style={styles.metaRowHeader}>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaHeadText}>Kundennummer</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaHeadText}>Lieferschein-Nr.</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaHeadText}>Datum</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaHeadText}>Bestellung erstellt</Text>
                        </View>
                        <View style={[styles.metaCell, styles.metaCellLast]}>
                            <Text style={styles.metaHeadText}>Zahlungsart</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaBodyText}>{String(order.customer_number)}</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaBodyText}>#{String(order.id)}</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaBodyText}>{formatDate(order.created_at)}</Text>
                        </View>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaBodyText}>{formatDateTime(order.created_at)}</Text>
                        </View>
                        <View style={[styles.metaCell, styles.metaCellLast]}>
                            <Text style={styles.metaBodyText}>{paymentLabel(order.payment_method)}</Text>
                        </View>
                    </View>
                </View>

                {/* delivery note */}
                <Text style={styles.sectionTitle}>Lieferhinweis</Text>
                <Text style={styles.paragraph}>
                    {order.delivery_note && order.delivery_note.trim().length > 0
                        ? order.delivery_note
                        : "Kein Hinweis."}
                </Text>

                {/* items */}
                <Text style={styles.sectionTitle}>
                    Artikel · Anzahl: {String(order.total_items ?? items.length)} · Summe
                    (inkl. MwSt.): {formatPrice(subtotal)}
                </Text>

                <View style={styles.itemsTable}>
                    <View style={styles.itemsHeaderRow}>
                        <Text style={[styles.cellPos, styles.bold]}>Pos.</Text>
                        <Text style={[styles.cellName, styles.bold]}>Artikel</Text>
                        <Text style={[styles.cellUnit, styles.bold]}>Einheit</Text>
                        <Text style={[styles.cellQty, styles.bold]}>Menge</Text>
                        <Text style={[styles.cellPrice, styles.bold]}>
                            Einzelpreis (inkl. MwSt.)
                        </Text>
                        <Text style={[styles.cellTotal, styles.bold]}>Gesamt (inkl. MwSt.)</Text>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.itemRow}>
                            <Text style={[styles.cellName, { width: "100%" }]}>
                                Keine Artikel vorhanden.
                            </Text>
                        </View>
                    ) : (
                        items.map((it, idx) => {
                            const qty = getQty(it);
                            const lineTotal = (it.price || 0) * qty;

                            return (
                                <View key={`${idx}`} style={styles.itemRow}>
                                    <Text style={styles.cellPos}>{idx + 1}</Text>
                                    <Text style={styles.cellName}>{String(it.name ?? "")}</Text>
                                    <Text style={styles.cellUnit}>{String(it.unit ?? "")}</Text>
                                    <Text style={styles.cellQty}>{String(qty)}</Text>
                                    <Text style={styles.cellPrice}>{formatPrice(it.price)}</Text>
                                    <Text style={styles.cellTotal}>{formatPrice(lineTotal)}</Text>
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={styles.subtotalRow}>
                    <Text style={styles.bold}>Zwischensumme (inkl. MwSt.): </Text>
                    <Text style={styles.bold}>{formatPrice(subtotal)}</Text>
                </View>

                {/* signatures */}
                <View style={styles.footerRow}>
                    <View style={styles.signBlock}>
                        <View style={styles.signLine} />
                        <Text style={styles.signLabel}>Unterschrift Fahrer</Text>
                    </View>
                    <View style={styles.signBlock}>
                        <View style={styles.signLine} />
                        <Text style={styles.signLabel}>Unterschrift Kunde</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
