'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Copy,
  FolderInput, GraduationCap, HelpCircle, LayoutDashboard,
  Plus, Search, Settings,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CreateCourseModal } from '@/components/course/CreateCourseModal';
import { useSidebarStore } from '@/store/useSidebarStore';

const NAV = [
  { href: '/',         icon: LayoutDashboard, label: 'Overview'  },
  { href: '/library',  icon: BookOpen,        label: 'Library'   },
  { href: '/search',   icon: Search,          label: 'Search'    },
  { href: '/import',   icon: FolderInput,     label: 'Import'    },
  { href: '/settings', icon: Settings,        label: 'Settings'  },
];

/* Reusable tooltip wrapper — shows label on the right when collapsed */
function Tip({ label, children, side = 'right' }: { label: string; children: React.ReactNode; side?: string }) {
  return (
    <div className="relative group/tip">
      {children}
      <span
        className={`
          pointer-events-none absolute top-1/2 -translate-y-1/2 z-[100]
          ${side === 'right' ? 'left-[calc(100%+10px)]' : 'right-[calc(100%+10px)]'}
          whitespace-nowrap rounded-[7px] bg-[#182230] px-2.5 py-1.5
          text-[11px] font-semibold text-white shadow-lg
          opacity-0 scale-95 transition-all duration-150
          group-hover/tip:opacity-100 group-hover/tip:scale-100
        `}
      >
        {label}
        {/* arrow */}
        <span
          className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${
            side === 'right'
              ? '-left-1.5 border-r-[#182230]'
              : '-right-1.5 border-l-[#182230]'
          }`}
        />
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const { isCollapsed, isMobileOpen, toggleCollapse, setMobileOpen, setCollapsed } = useSidebarStore();
  const email = 'saketgirigoswami4141@gmail.com';

  /* ── Close mobile on route change ── */
  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  /* ── Adaptive collapse: lesson player → collapsed, others → expanded ── */
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    const isLesson = /\/course\/.+\/lesson\/.+/.test(pathname);
    setCollapsed(isLesson);
  }, [pathname, setCollapsed]);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* optional */ }
  };

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/25 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col
          border-r border-[var(--line)] bg-white
          transition-[transform,width] duration-200 ease-out
          md:sticky md:top-0 md:translate-x-0
          ${isCollapsed ? 'w-[272px] md:w-[62px]' : 'w-[272px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ── Logo row ───────────────────────────────── */}
        <div className={`flex h-[68px] items-center border-b border-[var(--line)] ${isCollapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
          {isCollapsed ? (
            /* collapsed: logo icon is the tooltip trigger */
            <Tip label="LearnX — Learning workspace">
              <Link href="/" aria-label="LearnX overview" className="flex size-9 items-center justify-center rounded-[10px] bg-[#182230] text-white shadow-sm hover:bg-[#293545] transition-colors">
                <GraduationCap size={18} strokeWidth={2.15} />
              </Link>
            </Tip>
          ) : (
            <>
              <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="LearnX overview">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#182230] text-white shadow-sm">
                  <GraduationCap size={18} strokeWidth={2.15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold tracking-[-.02em] text-[#182230]">LearnX</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[#98a2b3]">Learning workspace</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label="Collapse navigation"
                className="hidden rounded-md p-1.5 text-[#98a2b3] transition-colors hover:bg-[#f1f3f6] hover:text-[#344054] md:inline-flex"
              >
                <ChevronLeft size={17} />
              </button>
            </>
          )}

          {/* Expand chevron when collapsed */}
          {isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Expand navigation"
              className="hidden md:inline-flex absolute left-[62px] top-[22px] -translate-x-1/2 size-5 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[#98a2b3] shadow-sm transition-colors hover:border-[#2563a6] hover:text-[#2563a6]"
            >
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* ── New course button ───────────────────────── */}
        <div className={`pt-4 ${isCollapsed ? 'px-[11px]' : 'px-4'}`}>
          {isCollapsed ? (
            <Tip label="New course">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex size-10 items-center justify-center rounded-[10px] bg-[#182230] text-white shadow-sm transition-colors hover:bg-[#293545] active:translate-y-px"
              >
                <Plus size={17} strokeWidth={2.2} />
              </button>
            </Tip>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="ui-btn ui-btn-primary w-full"
            >
              <Plus size={17} strokeWidth={2.2} /> New course
            </button>
          )}
        </div>

        {/* ── Nav links ──────────────────────────────── */}
        <nav
          aria-label="Primary"
          className={`flex-1 overflow-y-auto py-5 custom-scrollbar ${isCollapsed ? 'space-y-1 px-[11px]' : 'space-y-0.5 px-3'}`}
        >
          {!isCollapsed && (
            <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[.1em] text-[#c5ccd6]">
              Workspace
            </p>
          )}

          {NAV.map(({ href, icon: Icon, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

            const linkClass = `
              relative flex items-center gap-3 rounded-[9px] text-[13px] font-semibold
              transition-all duration-150
              ${isCollapsed
                ? 'h-10 w-10 justify-center p-0'
                : 'h-10 px-3'
              }
              ${active
                ? 'bg-[#eef4fc] text-[#1d4f86]'
                : 'text-[#667085] hover:bg-[#f4f6f8] hover:text-[#344054]'
              }
            `;

            const iconEl = (
              <>
                {/* Left accent bar for active */}
                {active && (
                  <span
                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#2563a6]"
                    aria-hidden="true"
                  />
                )}
                <span className="sidebar-nav-icon">
                  <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {!isCollapsed && <span>{label}</span>}
              </>
            );

            return isCollapsed ? (
              <Tip key={href} label={label}>
                <Link href={href} className={linkClass} aria-label={label}>
                  {iconEl}
                </Link>
              </Tip>
            ) : (
              <Link key={href} href={href} className={linkClass}>
                {iconEl}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ─────────────────────────────────── */}
        <div className={`space-y-1 border-t border-[var(--line)] py-3 ${isCollapsed ? 'px-[11px]' : 'px-3'}`}>

          {/* Help & Support */}
          {isCollapsed ? (
            <Tip label="Help &amp; Support">
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-[9px] text-[#98a2b3] transition-colors hover:bg-[#f4f6f8] hover:text-[#344054]"
                aria-label="Help and support"
              >
                <HelpCircle size={17} strokeWidth={1.8} />
              </button>
            </Tip>
          ) : (
            <button
              type="button"
              className="flex h-9 w-full items-center gap-3 rounded-[9px] px-3 text-[13px] font-semibold text-[#98a2b3] transition-colors hover:bg-[#f4f6f8] hover:text-[#344054]"
              aria-label="Help and support"
            >
              <HelpCircle size={16} strokeWidth={1.8} />
              <span>Help &amp; Support</span>
            </button>
          )}

          {/* User avatar */}
          {isCollapsed ? (
            <Tip label={`${email} — click to copy`}>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex size-10 items-center justify-center rounded-[9px] transition-colors hover:bg-[#f4f6f8]"
                aria-label="Copy email"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[#dbeafe] text-[11px] font-bold text-[#1d4f86]">
                  SG
                </span>
              </button>
            </Tip>
          ) : (
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-[#f4f6f8]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dbeafe] text-[11px] font-bold text-[#1d4f86]">
                SG
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-[#344054]">Saket giri goswami</span>
                <span className="block truncate text-[10px] text-[#98a2b3]">{email}</span>
              </span>
              <span className="text-[#98a2b3]">
                {copied ? <Check size={14} className="text-[#167a55]" /> : <Copy size={14} />}
              </span>
            </button>
          )}
        </div>
      </aside>

      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
