import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, View, Text, TouchableOpacity, TextInput, useWindowDimensions, ScrollView, ActivityIndicator, Image } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useCartStore } from '../../../stores/cartStore';

export default function POSScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const items = useCartStore(state => state.items);
  const addItem = useCartStore(state => state.addItem);
  const updateQty = useCartStore(state => state.updateQty);
  const subtotalFunc = useCartStore(state => state.subtotal);
  const taxFunc = useCartStore(state => state.tax);
  const grandTotalFunc = useCartStore(state => state.grandTotal);
  const clearCart = useCartStore(state => state.clearCart);

  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchInitialProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, stocks(available_quantity)')
        .eq('is_active', true)
        .limit(50);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialProducts();
  }, []);

  const totalItems = useMemo(() => items.reduce((acc, curr) => acc + curr.quantity, 0), [items]);
  
  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <View className={`flex-1 bg-gray-50 ${isMobile ? 'flex-col' : 'flex-row'}`}>
      
      {/* Search and Header for Mobile */}
      {isMobile && (
        <View className="bg-white p-4 border-b border-gray-100">
           <View className="flex-row items-center bg-gray-50 px-3 rounded-xl border border-gray-100">
            <MaterialIcons name="search" size={20} color="#9ca3af" />
            <TextInput
              placeholder="Cari menu..."
              value={search}
              onChangeText={setSearch}
              className="flex-1 h-12 ml-2 text-sm"
            />
          </View>
        </View>
      )}

      {/* Main Product List */}
      <View className="flex-1">
        {!isMobile && (
          <View className="bg-white border-b border-gray-100 p-5 flex-row justify-between items-center">
            <View>
              <Text className="text-xl font-bold text-gray-900">Menu Tersedia</Text>
              <Text className="text-gray-400 text-[10px]">Klik menu untuk menambah pesanan</Text>
            </View>
            <View className="flex-row items-center bg-gray-50 px-4 rounded-xl w-[250px] border border-gray-100">
              <MaterialIcons name="search" size={18} color="#9ca3af" />
              <TextInput
                placeholder="Cari..."
                value={search}
                onChangeText={setSearch}
                className="flex-1 h-10 ml-2 text-sm"
              />
            </View>
          </View>
        )}

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#E597A0" />
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.product_id.toString()}
            numColumns={isMobile ? 2 : 3}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => {
              const stock = Array.isArray(item.stocks) ? item.stocks[0]?.available_quantity : item.stocks?.available_quantity;
              const isOutOfStock = (stock || 0) <= 0;
              
              return (
                <TouchableOpacity
                  onPress={() => !isOutOfStock && addItem(item)}
                  activeOpacity={isOutOfStock ? 1 : 0.7}
                  className={`flex-1 m-1.5 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm ${isOutOfStock ? 'opacity-60' : ''}`}
                  style={{ elevation: 2 }}>
                  <View className="w-full h-24 bg-pink-50 rounded-xl items-center justify-center mb-2 overflow-hidden">
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <MaterialIcons name="fastfood" size={24} color="#E597A0" />
                    )}
                    {isOutOfStock && (
                      <View className="absolute inset-0 bg-black/40 items-center justify-center">
                        <Text className="text-white font-bold text-[10px]">Stok Habis</Text>
                      </View>
                    )}
                  </View>
                  <Text className="font-bold text-gray-900 text-xs mb-1" numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  <Text className="text-[#E597A0] font-bold text-xs mb-2">
                    Rp {item.selling_price?.toLocaleString('id-ID')}
                  </Text>
                  <View className="flex-row items-center">
                    <MaterialIcons name="inventory" size={10} color={isOutOfStock ? "#ef4444" : "#9ca3af"} />
                    <Text className={`text-[9px] ml-1 ${isOutOfStock ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                      Stok: {stock || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center mt-20">
                <MaterialIcons name="inventory-2" size={48} color="#ddd" />
                <Text className="text-gray-400 mt-2 text-xs">Menu tidak ditemukan</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Cart Side Panel */}
      <View 
        className={`${isMobile ? 'h-[280px]' : 'w-[380px]'} bg-white border-l border-gray-200 shadow-xl shadow-black`}
        style={!isMobile ? { borderLeftWidth: 1 } : { borderTopWidth: 1 }}>
        
        <View className="p-4 border-b border-gray-50 flex-row justify-between items-center">
          <View>
            <Text className="font-bold text-gray-900">Pesanan ({totalItems})</Text>
            {totalItems > 0 && <TouchableOpacity onPress={clearCart}><Text className="text-red-500 text-[10px] font-bold">Hapus Semua</Text></TouchableOpacity>}
          </View>
          <MaterialIcons name="shopping-bag" size={20} color="#E597A0" />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center mb-3 bg-gray-50 p-2 rounded-xl">
              <View className="w-10 h-10 rounded-lg bg-white overflow-hidden mr-3 items-center justify-center">
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <MaterialIcons name="fastfood" size={16} color="#E597A0" />
                )}
              </View>
              <View className="flex-1 pr-2">
                <Text className="font-bold text-gray-800 text-xs" numberOfLines={1}>{item.product_name}</Text>
                <Text className="text-[10px] text-gray-400">Rp {item.selling_price?.toLocaleString('id-ID')}</Text>
              </View>
              <View className="flex-row items-center bg-white rounded-lg border border-gray-100 p-0.5">
                <TouchableOpacity onPress={() => updateQty(item.product_id, item.quantity - 1)} className="w-6 h-6 items-center justify-center"><MaterialIcons name="remove" size={14} color="#E597A0" /></TouchableOpacity>
                <Text className="w-8 text-center font-bold text-gray-900 text-xs">{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQty(item.product_id, item.quantity + 1)} className="w-6 h-6 items-center justify-center"><MaterialIcons name="add" size={14} color="#E597A0" /></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-10 opacity-20">
              <MaterialIcons name="shopping-basket" size={40} color="#999" />
              <Text className="text-[10px] mt-2">Belum ada item</Text>
            </View>
          }
        />

        {/* Footer Summary */}
        <View className="p-4 bg-white border-t border-gray-100">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-400 text-[11px]">Total</Text>
            <Text className="font-bold text-gray-900 text-base">Rp {grandTotalFunc().toLocaleString('id-ID')}</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/cashier/transaction/payment')}
            disabled={items.length === 0}
            className={`h-12 rounded-xl items-center justify-center mt-2 ${items.length === 0 ? 'bg-gray-100' : 'bg-[#E597A0]'}`}>
            <Text className={`font-bold ${items.length === 0 ? 'text-gray-400' : 'text-white'}`}>Bayar Sekarang</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}
