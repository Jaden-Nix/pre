'use client';

import Link from 'next/link';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { FeatureCard } from '@/components/FeatureCard';
import { PhoneMockup } from '@/components/PhoneMockup';
import { MousePointerClick, Bot, ShieldCheck, PlayCircle, Cpu, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505]">
      <AnimatedBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Hero Text */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                LIVE ON TESTNET
              </div>

              <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Where Opinions have <br />
                <span className="gradient-text text-glow">Liquidity.</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                The first <strong className="text-white">AI-Native</strong> prediction market. Tap to bet, chat to earn, and let Gemini settle the score. Zero gas. 100% Gamified.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link 
                  href="/app" 
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black bg-white rounded-2xl hover:bg-sky-50 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95"
                >
                  Start Predicting
                </Link>
                <a 
                  href="https://youtu.be/6wzJkZcmDA0?si=ouKuFGotpul4kgHn" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm"
                >
                  <PlayCircle className="w-5 h-5 mr-2 text-sky-400" /> Watch Demo
                </a>
              </div>

              <div className="pt-8 flex items-center gap-6 text-sm text-gray-500 font-mono justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-500" /> Powered by Gemini
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" /> Instant Settlement
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built Different.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              We combined the best of DeFi, Generative AI, and Social Media to create a prediction market you'll actually use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MousePointerClick className="w-7 h-7" />}
              title="One-Tap Betting"
              description="Forget complex order books. Our Quick Play mode lets you tap through trending markets instantly. It's rapid-fire Alpha."
              color="sky"
            />
            <FeatureCard
              icon={<Bot className="w-7 h-7" />}
              title="Gemini AI Oracle"
              description="Markets settle instantly. Our autonomous AI Judge verifies real-world outcomes via Google Search so you get paid fast."
              color="purple"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-7 h-7" />}
              title="No-Loss Pools"
              description="Scared to lose? Join a Fixed Pot. Winners split the yield, and everyone gets their principal back. Risk-free degening."
              color="green"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-white/5 bg-black/40 relative z-10">
        <p className="text-gray-500 text-sm">© 2025 Predora. Built for the Future.</p>
      </footer>
    </main>
  );
}
