import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Globe, Send, Bot, User } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🔶' },
];

const QUICK_COMMANDS = [
  'Show all alerts',
  'Temperature status',
  'Batch & bird count',
  'Feed schedule today',
  'Projected profit',
];

export default function VoiceScreen() {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState('en');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: '🌾 Namaste! I am your Poultry AI Assistant. Ask me about flock status, alerts, temperature, feed schedules, or profit predictions. Type or speak your question!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendCommand = async (text: string) => {
    if (!text.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text, time: now }]);
    setInputText('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.response, time: now }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Connection error. Please ensure the backend server is running on port 5000.', time: now }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (listening) { setListening(false); return; }
    setListening(true);
    setTimeout(() => {
      const mockQuery = QUICK_COMMANDS[Math.floor(Math.random() * QUICK_COMMANDS.length)];
      setListening(false);
      sendCommand(mockQuery);
    }, 2500);
  };

  return (
    <div className="animate-fade-in">
      <h2 className="screen-title" style={{ marginBottom: '0.5rem' }}>Voice AI Assistant</h2>
      <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>
        Multilingual NLP assistant for hands-free farm management — English, Hindi &amp; Marathi supported
      </p>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Left: Voice controls */}
        <div>
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
            <div className="card-title"><Globe size={16} /> Language / भाषा</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              {LANGS.map(l => (
                <button key={l.code} className={`lang-pill ${lang === l.code ? 'active' : ''}`} onClick={() => setLang(l.code)} id={`lang-${l.code}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card ai-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ margin: '0 auto', width: 'fit-content' }}>
              <div className={`voice-orb ${listening ? 'listening' : ''}`} onClick={toggleListening} id="voice-orb">
                {listening ? (
                  <div className="voice-waveform">
                    {[1,2,3,4,5].map(i => <div key={i} className="voice-bar" />)}
                  </div>
                ) : (
                  <Mic size={40} color="#c4b5fd" />
                )}
              </div>
            </div>
            <p style={{ marginTop: '1.25rem', fontWeight: 600, fontSize: '1rem' }}>
              {listening ? <span className="text-secondary">🎤 Listening...</span> : <span className="text-muted">Tap to speak</span>}
            </p>
            {listening && (
              <button className="btn btn-outline" onClick={() => setListening(false)} style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                <MicOff size={14} /> Stop
              </button>
            )}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="card-title"><Volume2 size={16} /> Quick Commands</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {QUICK_COMMANDS.map(cmd => (
                <button key={cmd} onClick={() => sendCommand(cmd)} className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: '0.825rem' }} id={`cmd-${cmd.replace(/\s+/g,'-').toLowerCase()}`}>
                  <Send size={12} /> {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(139,92,246,0.5),rgba(59,130,246,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} className="text-secondary" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Poultry AI Assistant</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                Online — {LANGS.find(l => l.code === lang)?.label} mode
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
                {msg.sender === 'bot' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} className="text-secondary" />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '0.625rem 0.875rem',
                  borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg,var(--accent-primary),#2563eb)' : 'rgba(255,255,255,0.06)',
                  fontSize: '0.845rem', lineHeight: 1.5,
                  border: msg.sender === 'bot' ? '1px solid var(--border-card)' : 'none',
                }}>
                  {msg.text}
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                    {msg.time}
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={14} className="text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} className="text-secondary" />
                </div>
                <div style={{ padding: '0.625rem 1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 0.2, 0.4].map(d => (
                      <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-secondary)', animation: `wave-anim 0.8s ease-in-out ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border-card)', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              id="voice-text-input"
              className="field-input"
              placeholder="Type a command or question..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendCommand(inputText)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => sendCommand(inputText)} disabled={!inputText.trim() || loading} id="voice-send-btn">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
