'use client';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'sky' | 'purple' | 'green';
}

export function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
  };

  const hoverClasses = {
    sky: 'from-sky-500/5',
    purple: 'from-purple-500/5',
    green: 'from-green-500/5',
  };

  return (
    <div className="glass-card p-8 rounded-[32px] relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-br ${hoverClasses[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className={`w-14 h-14 ${colorClasses[color]} rounded-2xl flex items-center justify-center mb-8 border`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
