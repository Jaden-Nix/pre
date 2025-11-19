'use client';

export function AnimatedBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 overflow-hidden bg-[#050505]">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600 blur-[80px] opacity-60 animate-[floatBlob_25s_infinite_alternate]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-sky-500 blur-[80px] opacity-60 animate-[floatBlob_30s_infinite_alternate_-5s]" />
      <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-600 blur-[80px] opacity-40 animate-[floatBlob_20s_infinite_alternate]" />
      <div className="absolute inset-0 grid-pattern" />
    </div>
  );
}
