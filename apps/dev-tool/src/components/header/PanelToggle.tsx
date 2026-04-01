// PanelToggle — three-button pill toggle for left panel, home, right panel

import React from 'react';
import { PanelLeft, Home, PanelRight } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export const PanelToggle: React.FC = () => {
  const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const toggleLeft = useAppStore((s) => s.toggleLeftPanel);
  const toggleRight = useAppStore((s) => s.toggleRightPanel);
  const navigateToHome = useAppStore((s) => s.navigateToHome);

  return (
    <div className="panel-toggle-pill">
      <button
        className={`panel-toggle-btn ${leftPanelOpen ? 'panel-toggle-btn--active' : ''}`}
        onClick={toggleLeft}
        title="节点面板"
      >
        <PanelLeft size={14} />
        <span>节点</span>
      </button>

      <button
        className="panel-toggle-btn"
        onClick={navigateToHome}
        title="返回首页"
      >
        <Home size={14} />
        <span>Home</span>
      </button>

      <button
        className={`panel-toggle-btn ${rightPanelOpen ? 'panel-toggle-btn--active' : ''}`}
        onClick={toggleRight}
        title="属性面板"
      >
        <PanelRight size={14} />
        <span>属性</span>
      </button>
    </div>
  );
};
