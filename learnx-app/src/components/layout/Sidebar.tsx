'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Search, Settings,
  Zap, FolderOpen, Plus, Copy, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { CreateCourseModal } from '@/components/course/CreateCourseModal';
import logo from "@/../public/logo.png";
import Image from "next/image";
import { useSidebarStore } from '@/store/useSidebarStore';

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/library', icon: BookOpen, label: 'Library' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/import', icon: FolderOpen, label: 'Import' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isCollapsed, isMobileOpen, toggleCollapse, setMobileOpen } = useSidebarStore();

  const email = "saketgirigoswami4141@gmail.com";

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      {/* ── MOBILE OVERLAY ── */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed md:relative top-0 left-0 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0 z-50 font-sans transition-all duration-300 ease-in-out
        ${isCollapsed ? 'md:w-[80px]' : 'md:w-[260px]'}
        w-[260px]
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* ── LOGO & HEADER ── */}
        <div className={`p-5 pb-2 shrink-0 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'mb-4' : 'mb-6'}`}>
            <div className="w-[34px] h-[34px] shrink-0">
              <Image src={logo} alt="LearnX Logo" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-[15px] text-gray-900 leading-tight">LearnX</span>
                <span className="text-[10px] font-semibold text-gray-400 tracking-widest">LEARNING OS</span>
              </div>
            )}
          </div>
          
          {/* Collapse Toggle (Desktop only) */}
          <button 
            onClick={toggleCollapse}
            className={`hidden md:flex p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors ${isCollapsed ? 'absolute -right-3 top-6 bg-white border border-gray-200 shadow-sm rounded-full p-1' : 'mb-6'}`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className={`px-4 pb-4 ${isCollapsed ? 'px-3' : ''}`}>
          <button
            onClick={() => setShowCreate(true)}
            title={isCollapsed ? "New Course" : undefined}
            className={`w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]
              ${isCollapsed ? 'p-2.5 aspect-square' : 'px-4 py-2.5'}
            `}
          >
            <Plus size={16} />
            {!isCollapsed && "New Course"}
          </button>
        </div>

        {/* ── NAVIGATION ── */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && (
            <div className="px-3 py-2 mt-2">
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                Navigate
              </span>
            </div>
          )}

          {NAV.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl transition-all font-medium ${
                  isCollapsed ? 'justify-center p-3 mb-1' : 'px-3 py-2.5 text-[13.5px]'
                } ${isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                {!isCollapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* ── USER PROFILE & SPONSOR FOOTER ── */}
        <div className={`p-4 border-t border-gray-100 shrink-0 flex flex-col gap-3 ${isCollapsed ? 'items-center px-2' : ''}`}>

          {/* Digital Heroes Required Button */}
          {!isCollapsed ? (
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/80 text-indigo-600 text-[12.5px] font-bold rounded-xl transition-colors shadow-sm"
            >
              Built for Digital Heroes
            </a>
          ) : (
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Built for Digital Heroes"
              className="w-full flex items-center justify-center p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/80 text-indigo-600 rounded-xl transition-colors shadow-sm aspect-square"
            >
              <Zap size={16} />
            </a>
          )}

          {/* User Profile Block */}
          <div className={`flex items-center rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group relative ${isCollapsed ? 'p-1 justify-center' : 'gap-3 px-2 py-1.5'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-orange-400 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
              SG
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-bold text-gray-900 truncate">Saket giri goswami</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-gray-500 truncate group-hover:text-indigo-600 transition-colors">
                    {email}
                  </span>
                </div>
              </div>
            )}

            {/* Hover Copy Button */}
            {!isCollapsed && (
              <button
                onClick={handleCopyEmail}
                className="absolute right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:text-indigo-600 hover:border-indigo-200 focus:outline-none"
                title="Copy Email"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            )}
          </div>

        </div>
      </aside>

      {/* Course Modal Injection */}
      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} />}
    </>
  );
}