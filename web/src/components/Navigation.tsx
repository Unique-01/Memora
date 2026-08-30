interface NavigationProps {
  activeTab: 'capture' | 'memories' | 'ask';
  onTabChange: (tab: 'capture' | 'memories' | 'ask') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav aria-label="Main navigation" className="mb-8 flex border-b border-slate-200">
      <button
        type="button"
        onClick={() => onTabChange('capture')}
        className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
          activeTab === 'capture'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        Remember
      </button>
      <button
        type="button"
        onClick={() => onTabChange('memories')}
        className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
          activeTab === 'memories'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        Memories
      </button>
      <button
        type="button"
        onClick={() => onTabChange('ask')}
        className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
          activeTab === 'ask'
            ? 'border-indigo-600 text-indigo-600'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        Ask
      </button>
    </nav>
  );
}

