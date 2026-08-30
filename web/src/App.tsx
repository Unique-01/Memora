import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { CaptureForm } from './components/CaptureForm';
import { CaptureFeedback } from './components/CaptureFeedback';
import { MemoryCard } from './components/MemoryCard';
import { MemoriesPage } from './components/MemoriesPage';
import { MemoryDetailPage } from './components/MemoryDetailPage';
import { AskPage } from './components/AskPage';
import { captureMemory, queryMemories } from './services/memoryApi';
import type { CaptureOutcome, MemoryView } from './services/memoryApi';

type CaptureState =
  | { phase: 'idle' | 'submitting' }
  | { phase: 'captured'; memory: Extract<CaptureOutcome, { kind: 'captured' }>['memory'] }
  | { phase: 'unsupported'; reason?: string }
  | { phase: 'ambiguous'; reason?: string }
  | { phase: 'error' };

type AskState =
  | { kind: 'idle' }
  | { kind: 'found'; answer: string; memories: MemoryView[] }
  | { kind: 'unsupported'; reason?: string }
  | { kind: 'ambiguous'; reason?: string }
  | { kind: 'error' };

export default function App() {
  const [activeTab, setActiveTab] = useState<'capture' | 'memories' | 'ask'>('capture');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [state, setState] = useState<CaptureState>({ phase: 'idle' });

  const [askInput, setAskInput] = useState('');
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askOutcome, setAskOutcome] = useState<AskState>({ kind: 'idle' });

  async function handleSubmit() {
    if (input.trim().length === 0) return;
    setState({ phase: 'submitting' });
    try {
      const outcome = await captureMemory(input);
      switch (outcome.kind) {
        case 'captured':
          setInput('');
          setState({ phase: 'captured', memory: outcome.memory });
          break;
        case 'unsupported':
          setState({ phase: 'unsupported', reason: outcome.reason });
          break;
        case 'ambiguous':
          setState({ phase: 'ambiguous', reason: outcome.reason });
          break;
      }
    } catch {
      setState({ phase: 'error' });
    }
  }

  async function handleAskSubmit() {
    if (askInput.trim().length === 0 || askSubmitting) return;
    setAskSubmitting(true);
    setAskOutcome({ kind: 'idle' });
    try {
      const outcome = await queryMemories(askInput);
      switch (outcome.kind) {
        case 'found':
          setAskOutcome({ kind: 'found', answer: outcome.answer, memories: outcome.memories });
          break;
        case 'unsupported':
          setAskOutcome({ kind: 'unsupported', reason: outcome.reason });
          break;
        case 'ambiguous':
          setAskOutcome({ kind: 'ambiguous', reason: outcome.reason });
          break;
      }
    } catch {
      setAskOutcome({ kind: 'error' });
    } finally {
      setAskSubmitting(false);
    }
  }

  const submitting = state.phase === 'submitting';

  function handleTabChange(tab: 'capture' | 'memories' | 'ask') {
    setActiveTab(tab);
    setSelectedMemoryId(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-10">
      <header className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Memory assistant
        </h1>
        <p className="mt-1 text-slate-500">
          Tell me something in your own words — I'll figure out what it means.
        </p>
      </header>

      <div className="mt-4">
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {activeTab === 'capture' && (
        <div className="flex-1">
          <CaptureForm
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            submitting={submitting}
          />

          <div aria-live="polite" className="mt-6 space-y-4">
            {!submitting && state.phase === 'captured' && (
              <MemoryCard memory={state.memory} />
            )}
            {!submitting && state.phase === 'unsupported' && (
              <CaptureFeedback kind="unsupported" reason={state.reason} />
            )}
            {!submitting && state.phase === 'ambiguous' && (
              <CaptureFeedback kind="ambiguous" reason={state.reason} />
            )}
            {!submitting && state.phase === 'error' && <CaptureFeedback kind="error" />}
          </div>
        </div>
      )}

      {activeTab === 'memories' && !selectedMemoryId && (
        <div className="flex-1">
          <MemoriesPage onSelectMemory={setSelectedMemoryId} />
        </div>
      )}

      {activeTab === 'memories' && selectedMemoryId && (
        <div className="flex-1">
          <MemoryDetailPage
            memoryId={selectedMemoryId}
            onBack={() => setSelectedMemoryId(null)}
          />
        </div>
      )}

      {activeTab === 'ask' && !selectedMemoryId && (
        <div className="flex-1">
          <AskPage
            input={askInput}
            onInputChange={setAskInput}
            onSubmit={handleAskSubmit}
            submitting={askSubmitting}
            outcome={askOutcome}
            onSelectMemory={setSelectedMemoryId}
          />
        </div>
      )}

      {activeTab === 'ask' && selectedMemoryId && (
        <div className="flex-1">
          <MemoryDetailPage
            memoryId={selectedMemoryId}
            onBack={() => setSelectedMemoryId(null)}
          />
        </div>
      )}
    </main>
  );
}
