import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { Readable } from "stream";
import { supabase } from "../../../../../lib/supabaseClient";
import type { Order, OrderItem } from "../../../../types";
import LieferscheinDocument from "../../../../../lib/pdf/LieferscheinDocument";

export const runtime = "nodejs";

function getBaseUrl(req: Request): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // ✅ Next 15: params Promise geliyor -> await şart
  const { id } = await ctx.params;
  const idNum = Number(id);

  if (!id || Number.isNaN(idNum)) {
    return new Response(`Ungültige Bestell-ID. id="${String(id)}"`, {
      status: 400,
    });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", idNum)
    .single();

  if (error || !data) {
    return new Response("Bestellung konnte nicht geladen werden.", {
      status: 404,
    });
  }

  const order = data as Order;

  const { data: customer } = await supabase
    .from("customers")
    .select("name, owner_name, street, zip, city, phone, email")
    .eq("customer_number", order.customer_number)
    .single();

  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];

  const baseUrl = getBaseUrl(req);
  const logoUrl = `${baseUrl}/cactus-logo.png`;

  const pdfNodeStream = await renderToStream(
    <LieferscheinDocument
      order={order}
      items={items}
      customer={customer}
      logoUrl={logoUrl}
    />
  );

  const webStream = (Readable as any).toWeb(pdfNodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lieferschein_${order.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
