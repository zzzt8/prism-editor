// SettingsPage — dev-tool user preferences page
//
// Currently hosts the "Editor · Live Preview" section. Future preferences
// (theme, autosave interval, etc.) should be added as additional sections
// following the same pattern.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppStore, LIVE_PREVIEW_DEBOUNCE_RANGE } from '../store/appStore';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const livePreviewEnabled = useAppStore((s) => s.livePreviewEnabled);
  const livePreviewDebounceMs = useAppStore((s) => s.livePreviewDebounceMs);
  const setLivePreviewEnabled = useAppStore((s) => s.setLivePreviewEnabled);
  const setLivePreviewDebounceMs = useAppStore((s) => s.setLivePreviewDebounceMs);

  const debounceMin = LIVE_PREVIEW_DEBOUNCE_RANGE.min;
  const debounceMax = LIVE_PREVIEW_DEBOUNCE_RANGE.max;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button
          className="settings-back-btn"
          onClick={() => navigate('/')}
          title="返回首页"
        >
          <ArrowLeft size={14} />
          <span>返回</span>
        </button>
        <h1 className="settings-title">设置</h1>
      </header>

      <main className="settings-main">
        <section className="settings-section">
          <h2 className="settings-section-title">Editor · Live Preview</h2>
          <p className="settings-section-hint">
            该选项只影响 frontend 工作流（targetPlatform = browser）的实时合成。
            关闭后，需要点击顶部"重跑"按钮才会执行。
          </p>

          <div className="settings-row">
            <label className="settings-row-label" htmlFor="settings-live-toggle">
              Live Preview
            </label>
            <div className="settings-row-control">
              <button
                id="settings-live-toggle"
                type="button"
                className={`settings-toggle ${livePreviewEnabled ? 'settings-toggle--on' : ''}`}
                onClick={() => setLivePreviewEnabled(!livePreviewEnabled)}
                aria-pressed={livePreviewEnabled}
                data-testid="settings-live-toggle"
              >
                <span className="settings-toggle-knob" />
              </button>
              <span className="settings-row-value">
                {livePreviewEnabled ? '已开启' : '已关闭'}
              </span>
            </div>
          </div>

          <div className="settings-row">
            <label className="settings-row-label" htmlFor="settings-debounce-slider">
              Debounce (ms)
            </label>
            <div className="settings-row-control">
              <input
                id="settings-debounce-slider"
                type="range"
                min={debounceMin}
                max={debounceMax}
                step={10}
                value={livePreviewDebounceMs}
                onChange={(e) => setLivePreviewDebounceMs(Number(e.target.value))}
                disabled={!livePreviewEnabled}
                className="settings-slider"
                data-testid="settings-debounce-slider"
              />
              <input
                type="number"
                min={debounceMin}
                max={debounceMax}
                step={10}
                value={livePreviewDebounceMs}
                onChange={(e) => setLivePreviewDebounceMs(Number(e.target.value))}
                disabled={!livePreviewEnabled}
                className="settings-number"
                data-testid="settings-debounce-number"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
