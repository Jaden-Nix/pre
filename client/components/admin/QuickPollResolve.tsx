'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface QuickPoll {
  id: string;
  question: string;
  status: string;
  createdAt: string;
  votes: Record<string, number>;
  options: string[];
}

export function QuickPollResolve({ adminSecret }: { adminSecret: string }) {
  const [quickPolls, setQuickPolls] = useState<QuickPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchQuickPolls();
  }, []);

  const fetchQuickPolls = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/quick-polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
      });
      const data = await response.json();
      setQuickPolls(data.quickPolls || []);
    } catch (error) {
      console.error('Error fetching quick polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string, outcome: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/admin/resolve-quick-poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({
          adminSecret,
          quickPollId: id,
          outcome,
        }),
      });
      fetchQuickPolls();
    } catch (error) {
      console.error('Error resolving quick poll:', error);
    }
  };

  const totalPages = Math.ceil(quickPolls.length / itemsPerPage);
  const paginatedItems = quickPolls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold gradient-text">Quick Poll Resolution</h1>
        </div>
        <p className="text-gray-400">Manually resolve quick poll questions (multi-option)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <div key={item.id} className="glass-card p-6 rounded-xl">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{item.question}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      item.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.status}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {item.options.map((option, index) => (
                    <div key={index} className="p-3 bg-white/5 rounded-lg">
                      <div className="text-gray-400 text-sm mb-1">{option}</div>
                      <div className="text-xl font-bold">{item.votes[option] || 0} votes</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleResolve(item.id, option)}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/30 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve: {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
