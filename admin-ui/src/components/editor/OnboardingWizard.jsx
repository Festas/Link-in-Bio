import { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Upload, Link as LinkIcon, Share2, Rocket } from 'lucide-react';
import useEditorStore from '../../stores/editorStore.js';
import THEME_TEMPLATES from '../../utils/themes.js';

const STARTER_TEMPLATES = [
  { id: 'creator', name: 'Creator', desc: 'Social-focused layout', theme: 'pastel', emoji: '🎨' },
  { id: 'business', name: 'Business', desc: 'Professional & clean', theme: 'monochrome', emoji: '💼' },
  { id: 'portfolio', name: 'Portfolio', desc: 'Visual showcase', theme: 'galaxy', emoji: '📸' },
  { id: 'music', name: 'Music', desc: 'Music & audio focused', theme: 'neon', emoji: '🎵' },
  { id: 'gaming', name: 'Gaming', desc: 'Gaming community', theme: 'cyberpunk', emoji: '🎮' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean & simple', theme: 'minimal', emoji: '✨' },
];

export default function OnboardingWizard({ onComplete }) {
  const { updateSettings, addBlock } = useEditorStore();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [profile, setProfile] = useState({ title: '', bio: '' });
  const [links, setLinks] = useState(['', '', '']);
  const [socials, setSocials] = useState({ youtube_url: '', instagram_url: '', tiktok_url: '' });

  const steps = [
    { title: 'Choose a Style', icon: Sparkles, desc: 'Pick a starting template' },
    { title: 'Your Profile', icon: Upload, desc: 'Set up your identity' },
    { title: 'Add Links', icon: LinkIcon, desc: 'Share your content' },
    { title: 'Connect Socials', icon: Share2, desc: 'Link your accounts' },
    { title: 'Ready to Launch!', icon: Rocket, desc: 'Preview & publish' },
  ];

  const next = async () => {
    if (step === 0 && selectedTemplate) {
      const tmpl = THEME_TEMPLATES.find(t => t.id === selectedTemplate);
      if (tmpl) await updateSettings(tmpl.tokens);
    }
    if (step === 1 && (profile.title || profile.bio)) {
      await updateSettings({ title: profile.title, bio: profile.bio });
    }
    if (step === 2) {
      for (const url of links.filter(u => u.trim())) {
        try { await addBlock('links', { title: '', url: url.trim() }); } catch {}
      }
    }
    if (step === 3) {
      const socialUpdates = {};
      Object.entries(socials).forEach(([k, v]) => { if (v.trim()) socialUpdates[k] = v.trim(); });
      if (Object.keys(socialUpdates).length) await updateSettings(socialUpdates);
    }
    if (step === 4) {
      localStorage.setItem('lib_onboarded', 'true');
      onComplete();
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[var(--editor-surface)] rounded-2xl border border-[var(--editor-border)] w-[560px] max-w-[95vw] shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-[var(--editor-bg)]">
          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="px-8 pt-6 pb-4">
          <div className="flex items-center gap-3">
            {(() => { const StepIcon = steps[step].icon; return <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400"><StepIcon size={20} /></div>; })()}
            <div>
              <h2 className="text-lg font-bold">{steps[step].title}</h2>
              <p className="text-sm text-[var(--editor-text-muted)]">{steps[step].desc}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 min-h-[280px]">
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3">
              {STARTER_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.theme)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    selectedTemplate === t.theme ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--editor-border)] hover:border-[var(--editor-border-focus)]'}`}>
                  <div className="text-3xl mb-2">{t.emoji}</div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[10px] text-[var(--editor-text-muted)] mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div className="settings-field"><label>Your Name / Brand</label>
                <input type="text" value={profile.title} onChange={e => setProfile(p => ({...p, title: e.target.value}))} placeholder="e.g. Jane Creator" />
              </div>
              <div className="settings-field"><label>Bio</label>
                <textarea value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} placeholder="Tell visitors about yourself..." rows={3} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--editor-text-muted)] mb-2">Add your most important links:</p>
              {links.map((link, i) => (
                <input key={i} type="url" value={link} onChange={e => { const n = [...links]; n[i] = e.target.value; setLinks(n); }}
                  placeholder={`https://...`} className="w-full px-4 py-3 bg-[var(--editor-bg)] border border-[var(--editor-border)] rounded-xl text-sm outline-none focus:border-indigo-500" />
              ))}
              <button onClick={() => setLinks(l => [...l, ''])} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add another</button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              {[['youtube_url', 'YouTube', 'https://youtube.com/@...'],['instagram_url', 'Instagram', 'https://instagram.com/...'],['tiktok_url', 'TikTok', 'https://tiktok.com/@...']].map(([key, label, ph]) => (
                <div key={key} className="settings-field"><label>{label}</label>
                  <input type="url" value={socials[key]} onChange={e => setSocials(s => ({...s, [key]: e.target.value}))} placeholder={ph} />
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">You&apos;re all set!</h3>
              <p className="text-sm text-[var(--editor-text-muted)]">Your page is ready. Click &quot;Launch&quot; to start editing and customizing.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-[var(--editor-border)]">
          <button onClick={() => { localStorage.setItem('lib_onboarded', 'true'); onComplete(); }}
            className="text-sm text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]">Skip</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-[var(--editor-border)] text-sm hover:bg-[var(--editor-surface-hover)]">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            <button onClick={next}
              className="flex items-center gap-1 px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium">
              {step === 4 ? 'Launch' : 'Continue'} {step < 4 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
