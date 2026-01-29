import React from 'react';
import { Icons } from './Icons';

const HeaderControls = ({
    bgmList,
    currentBgm,
    onSelectBgm,
    volume,
    onVolumeChange,
    showPro,
    onTogglePro,
    selectedBgmData,
    showSeq,
    onToggleSeq
}) => {
    return (
        <header>
            <div className="header-logo-container">
                <img src="/images/header_logo.png" alt="Malt Battle Sampler" className="header-logo" />
            </div>
            <div className="controls">
                <div className="bgm-control-group">
                    <div className="label-row">
                        <Icons.Music />
                        <span style={{ flexShrink: 0 }}>BGM</span>
                        {selectedBgmData && (
                            <div className="marquee-container">
                                <div className="marquee-content">{selectedBgmData.credit}</div>
                            </div>
                        )}
                    </div>
                    <div className="bgm-buttons">
                        {bgmList.map(b => (
                            <button
                                key={b.id}
                                className={`bgm-btn ${currentBgm === b.id ? 'active' : ''}`}
                                onClick={() => onSelectBgm(b.id)}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-right-group">
                    <div className="vol-control">
                        <span className="vol-label">VOL: {volume}</span>
                        <input type="range" min="0" max="10" value={volume} onChange={e => onVolumeChange(Number(e.target.value))} />
                    </div>

                    <button className={`pro-toggle-btn ${showPro ? 'active' : ''}`} onClick={onTogglePro}>
                        PRO
                    </button>
                    <button className={`seq-toggle-btn ${showSeq ? 'active' : ''}`} onClick={onToggleSeq}>
                        SEQ
                    </button>
                </div>
            </div>
        </header>
    );
};

export default HeaderControls;
