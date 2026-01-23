"use client";

import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";
import { useState, useCallback } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span className="text-xl font-bold text-slate-100">SRIA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              Funkcie
            </Link>
            <Link
              href="#map"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              Mapa
            </Link>
            <Link
              href="#pricing"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              Cenník
            </Link>
            <Link
              href="/auth/signin"
              className="text-slate-300 hover:text-slate-100 transition-colors"
            >
              Prihlásiť sa
            </Link>
            <Link
              href="/auth/signin"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              Začať
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-400 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded p-1"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Zavrieť menu" : "Otvoriť menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col gap-4">
              <Link
                href="#features"
                className="text-slate-400 hover:text-slate-100 transition-colors"
                onClick={closeMobileMenu}
              >
                Funkcie
              </Link>
              <Link
                href="#map"
                className="text-slate-400 hover:text-slate-100 transition-colors"
                onClick={closeMobileMenu}
              >
                Mapa
              </Link>
              <Link
                href="#pricing"
                className="text-slate-400 hover:text-slate-100 transition-colors"
                onClick={closeMobileMenu}
              >
                Cenník
              </Link>
              <Link
                href="/auth/signin"
                className="text-slate-300 hover:text-slate-100 transition-colors"
                onClick={closeMobileMenu}
              >
                Prihlásiť sa
              </Link>
              <Link
                href="/auth/signin"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-center"
                onClick={closeMobileMenu}
              >
                Začať
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
