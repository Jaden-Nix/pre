'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { ConnectWallet } from './ConnectWallet';

export function Navbar() {
  return (
    <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="https://res.cloudinary.com/djslxbghy/image/upload/IMG_4551_e9bv2x.jpg" 
            alt="Predora Logo" 
            width={40} 
            height={40}
            className="rounded-xl"
          />
          <span className="font-sans font-bold text-xl tracking-tight">Predora</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#tech" className="hover:text-white transition-colors">Technology</a>
          <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
        </div>

        <div className="flex items-center gap-4">
          <ConnectWallet />
          <Link 
            href="/app" 
            className="group relative inline-flex items-center justify-center px-6 py-2.5 font-bold text-white transition-all duration-200 bg-white/10 font-sans rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 hover:bg-white/20 border border-white/10"
          >
            <span className="relative flex items-center gap-2">
              Launch App <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
