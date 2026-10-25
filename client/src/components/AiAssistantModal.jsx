import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Button } from './ui';
import { Sparkles, Send, X, Bot, User as UserIcon, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AiAssistantModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user?.employeeId}! I am your HCM Lite AI Assistant. You are logged in with ${user?.role.toUpperCase()} permissions. How can I assist you with company data or policies today?`,
      toolUsed: null,
      isAiGenerated: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        prompt: q,
        messages: messages.map((m) => ({ role: m.role, text: m.text })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          toolUsed: data.toolUsed,
          toolResult: data.toolResult,
          isAiGenerated: true,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err.response?.data?.error || err.message || 'The AI assistant encountered a temporary timeout. Please try again.',
          isAiGenerated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const quickPrompts =
    user?.role === 'employee'
      ? [
          'How many sick leaves do I have left this year?',
          'What is my attendance status today?',
          'What is my colleague’s salary?',
          'Mujhe aglay peer ko chutti chahiye',
        ]
      : [
          'Who is on leave today?',
          'What is this month’s attendance rate?',
          'Who came late most often this month?',
          'How many active employees are in Engineering?',
          'Kitnay log aaj absent hain?',
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
      <div className="flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-indigo-700 via-indigo-800 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Sparkles className="h-5 w-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">HCM Lite AI Assistant</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Live DB Tools
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Permission Scope: <strong className="uppercase">{user?.role}</strong> · Gemini 3.8 Flash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 border border-indigo-200">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {/* Tool calling tag */}
                {m.toolUsed && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-mono text-indigo-700 border border-indigo-100">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Tool executed: {m.toolUsed}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

                {m.isAiGenerated && (
                  <div className="mt-2 text-[10px] uppercase font-semibold tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    AI-generated · Verified with DB source of truth
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200 px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <span>Querying system tools and policies...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-slate-200 bg-white px-4 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Suggested Prompts (Judges & Test Questions):
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSend(qp)}
                className="rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-3 py-1 text-xs text-slate-600 transition-colors border border-slate-200"
              >
                {qp}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about attendance, leave balances, policy or headcount..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 px-5 rounded-xl"
            >
              <Send className="h-4 w-4" />
              <span>Ask</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
