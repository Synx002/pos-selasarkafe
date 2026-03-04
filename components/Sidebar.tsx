// components/Sidebar.tsx
import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname, Slot } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export type SidebarMenuItem = {
  label: string;
  icon: string;
  path: string;
};

interface SidebarProps {
  menu: SidebarMenuItem[];
  roleLabel?: string;
  /**
   * Warna aksen sidebar.
   * Owner    → biru  #E597A0
   * Storeman → teal  #E597A0
   * Kasir    → ungu  #E597A0
   */
  accentColor?: string;
}

const SIDEBAR_WIDTH = 220;
const MINI_SIDEBAR_WIDTH = 74;

export default function Sidebar({
  menu,
  roleLabel = 'Pengguna',
  accentColor = '#E597A0',
}: SidebarProps) {
  const { signOut, profile } = useAuthStore();

  // ✅ FIX: Wrap router hooks in try-catch agar tidak crash
  // saat komponen dirender sebelum NavigationContainer siap.
  let router: ReturnType<typeof useRouter> | null = null;
  let pathname = '/';
  try {
    router = useRouter();       // eslint-disable-line react-hooks/rules-of-hooks
    pathname = usePathname();   // eslint-disable-line react-hooks/rules-of-hooks
  } catch {
    // Navigator belum siap — komponen akan re-render saat siap
  }

  const [open, setOpen] = useState(true);
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  const accentBg = accentColor + '18';

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: open ? MINI_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setOpen(!open);
  };

  const handleLogout = async () => {
    await signOut();
    router?.replace('/auth/login');
  };

  const handleNavigate = (path: string) => {
    router?.push(path as any);
  };

  const avatarLetter = profile?.user_name?.[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView className="flex-1 flex-row bg-gray-100">

      {/* ── Sidebar Panel ── */}
      <Animated.View
        style={{
          width: sidebarAnim,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRightWidth: 1,
          borderRightColor: '#e5e7eb',
        }}
      >
        <View className="flex-1 py-6 justify-between">

          <View>
            {/* ── Brand ── */}
            <View 
              style={{ paddingHorizontal: open ? 16 : 0, alignItems: 'center' }} 
              className="mb-7"
            >
              <View
                className="rounded-2xl items-center justify-center mb-2"
                style={{ width: open ? 65 : 48, height: open ? 65 : 48, backgroundColor: '#E597A0' }}
              >
                <Image
                  source={require('../assets/selasar_logo.png')} // sesuaikan path
                  style={{ width: open ? 56 : 38, height: open ? 56 : 38 }}
                  resizeMode="contain"
                />
              </View>
              {open && (
                <>
                  <Text className="text-lg font-bold text-gray-900">Selasar</Text>
                  <Text className="text-xs text-gray-400 tracking-widest">Kafe POS</Text>
                  <View
                    className="h-0.5 w-10 rounded-full mt-2.5 opacity-60"
                    style={{ backgroundColor: accentColor }}
                  />
                </>
              )}
            </View>

            {/* ── Menu Items ── */}
            <View style={{ paddingHorizontal: open ? 12 : 0 }}>
              {menu.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <TouchableOpacity
                    key={item.path}
                    className="flex-row items-center py-2.5 rounded-xl mb-1"
                    style={{ 
                      backgroundColor: isActive ? accentBg : 'transparent',
                      paddingHorizontal: open ? 14 : 0,
                      justifyContent: open ? 'flex-start' : 'center',
                    }}
                    onPress={() => handleNavigate(item.path)}
                    activeOpacity={0.7}
                  >
                    {/* Active indicator bar */}
                    {isActive && open && (
                      <View
                        className="absolute left-0 rounded-r-sm"
                        style={{
                          top: 8,
                          bottom: 8,
                          width: 3,
                          backgroundColor: accentColor,
                        }}
                      />
                    )}
                    <MaterialIcons
                      name={item.icon as any}
                      size={21}
                      color={isActive ? accentColor : '#6b7280'}
                    />
                    {open && (
                      <Text
                        className="ml-3.5 text-sm"
                        style={{
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? accentColor : '#374151',
                        }}
                      >
                        {item.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Logout ── */}
          <View 
            style={{ paddingHorizontal: open ? 16 : 0, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
            className="pt-4"
          >
            <TouchableOpacity
              className="flex-row items-center py-2.5 rounded-xl bg-red-50"
              style={{ justifyContent: open ? 'flex-start' : 'center', paddingHorizontal: open ? 14 : 0 }}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <MaterialIcons name="logout" size={18} color="#e53935" />
              {open && <Text className="ml-2.5 text-red-600 font-semibold text-sm">Keluar</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>

      {/* ── Main Content ── */}
      <View className="flex-1">

        {/* ── Header Bar ── */}
        <View
          className="flex-row items-center justify-between bg-white px-4 py-3 border-b border-gray-100"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }}
        >
          {/* Toggle button */}
          <TouchableOpacity
            onPress={toggleSidebar}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: accentBg }}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={open ? 'chevron-left' : 'chevron-right'}
              size={22}
              color={accentColor}
            />
          </TouchableOpacity>

          {/* User info */}
          <View className="flex-row items-center gap-2.5">
            <View className="items-end">
              <Text className="text-sm font-bold text-gray-900">
                Halo, {profile?.user_name || 'Pengguna'}!
              </Text>
              <Text className="text-xs text-gray-400">{roleLabel}</Text>
            </View>
            {/* Avatar */}
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Text className="text-white font-bold text-sm">{avatarLetter}</Text>
            </View>
          </View>
        </View>

        {/* ── Page Content ── */}
        <View className="flex-1">
          <Slot />
        </View>

      </View>
    </SafeAreaView>
  );
}