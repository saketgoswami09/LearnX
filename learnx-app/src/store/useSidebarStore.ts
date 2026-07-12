import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  toggleMobile: () => void;
  setMobileOpen: (isOpen: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  toggleMobile:   () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  setMobileOpen:  (isOpen) => set({ isMobileOpen: isOpen }),
  setCollapsed:   (collapsed) => set({ isCollapsed: collapsed }),
}));
