// stores/cartStore.ts
import { create } from 'zustand';

interface CartItem {
  product_id: number;
  product_name: string;
  selling_price: number;
  quantity: number;
  image_url?: string | null;
  available_stock: number;
}

interface CartState {
  items: CartItem[];
  transactionId: number | null;
  addItem: (product: any) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  grandTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  transactionId: null,

  addItem: (product) => {
    const existing = get().items.find(i => i.product_id === product.product_id);
    
    // Pastikan harga dan nama ada
    const selling_price = product.selling_price ?? 0;
    const product_name = product.product_name ?? 'Produk Tanpa Nama';
    const stockData = Array.isArray(product.stocks) ? product.stocks[0] : product.stocks;
    const available_stock = stockData?.available_quantity ?? 0;

    if (available_stock <= 0) return; // Prevent adding if out of stock

    if (existing) {
      if (existing.quantity >= available_stock) return; // Prevent adding more than available

      set({ items: get().items.map(i =>
        i.product_id === product.product_id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )});
    } else {
      set({ items: [...get().items, { 
        product_id: product.product_id,
        product_name: product_name,
        selling_price: selling_price,
        quantity: 1, 
        image_url: product.image_url,
        available_stock: available_stock
      }] });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter(i => i.product_id !== productId) });
  },

  updateQty: (productId, qty) => {
    const item = get().items.find(i => i.product_id === productId);
    if (!item) return;

    if (qty <= 0) {
      get().removeItem(productId);
    } else {
      // Respect stock limit
      const finalQty = Math.min(qty, item.available_stock);
      set({ items: get().items.map(i =>
        i.product_id === productId ? { ...i, quantity: finalQty } : i
      )});
    }
  },

  subtotal: () => get().items.reduce((sum, i) => sum + i.selling_price * i.quantity, 0),
  grandTotal: () => get().subtotal(),

  clearCart: () => set({ items: [], transactionId: null }),
}));