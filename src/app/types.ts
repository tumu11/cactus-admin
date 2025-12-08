// src/types.ts
export type OrderItem = {
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: number;
  customer_number: string;
  items: OrderItem[];
  total_price: number;
  total_items: number;
  status: string;
  payment_method?: "bar" | "rechnung" | null;
  delivery_note?: string | null;
  created_at: string;
};
