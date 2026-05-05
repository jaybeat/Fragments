import { useState } from 'react';
import { usePlayer } from '../PlayerContext';
import { EPISODES } from '../data/episodes';

export default function Tweaks() {
  const { state, dispatch } = usePlayer();
  const [visible, setVisible] = useState(false);
  const { tweaks } = state;

  return (
    <>
      <button
        className="tweaks-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label="Toggle tweaks"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <div className={`tweaks ${visible ? 'visible' : ''}`}>
        <h3>Tweaks</h3>

        <div className="tweak-row">
          <label>Theme</label>
          <select
            value={state.theme}
            onChange={(e) => dispatch({ type: 'SET_THEME', payload: e.target.value as 'warm-light' | 'warm-dark' })}
          >
            <option value="warm-light">Warm Light</option>
            <option value="warm-dark">Warm Dark</option>
          </select>
        </div>

        <div className="tweak-row">
          <label>Episode</label>
          <select
            value={state.episodeId}
            onChange={(e) => dispatch({ type: 'SET_EPISODE', payload: e.target.value })}
          >
            {EPISODES.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.speakerName} — {ep.subtitle}
              </option>
            ))}
          </select>
        </div>

        <div className="tweak-row">
          <label>Header tone</label>
          <div className="swatches">
            {[
              { key: 'black', v: '#0c0c0e' },
              { key: 'navy', v: '#0b1220' },
              { key: 'plum', v: '#1a0f1e' },
            ].map((h) => (
              <div
                key={h.key}
                className={`swatch ${tweaks.accentHeader === h.v ? 'active' : ''}`}
                style={{ background: h.v }}
                onClick={() => dispatch({ type: 'UPDATE_TWEAKS', payload: { accentHeader: h.v } })}
              />
            ))}
          </div>
        </div>

        <div className="tweak-row">
          <label>
            Blue hue <span>{tweaks.blueHue}°</span>
          </label>
          <input
            type="range"
            min={180}
            max={320}
            value={tweaks.blueHue}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_TWEAKS', payload: { blueHue: Number(e.target.value) } })
            }
          />
        </div>

        <div className="tweak-row">
          <label>
            Violet hue <span>{tweaks.violetHue}°</span>
          </label>
          <input
            type="range"
            min={240}
            max={360}
            value={tweaks.violetHue}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_TWEAKS', payload: { violetHue: Number(e.target.value) } })
            }
          />
        </div>

        <div className="tweak-row">
          <label>
            Blur <span>{tweaks.blur}px</span>
          </label>
          <input
            type="range"
            min={10}
            max={140}
            value={tweaks.blur}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_TWEAKS', payload: { blur: Number(e.target.value) } })
            }
          />
        </div>
      </div>
    </>
  );
}
