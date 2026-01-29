import React, { useState } from 'react';

const StepSequencer = ({
    tracks,
    steps,
    options,
    onTrackChange,
    trackMutes,
    onToggleMute,
    trackRetrig,
    onToggleRetrig,
    onToggleStep,
    isPlaying,
    onStart,
    onStop,
    currentStep,
    syncEnabled,
    onToggleSync,
    bpm,
    onBpmChange,
    onResetSteps,
    trackFx,
    onTrackFxChange
}) => {
    const [openFx, setOpenFx] = useState([false, false, false, false]);

    const toggleFx = (index) => {
        setOpenFx(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    return (
        <div className="seq-panel">
            <div className="seq-header">
                <div className="seq-title">STEP SEQUENCER</div>
                <div className="seq-bpm">
                    <span>BPM</span>
                    <input
                        type="number"
                        min="40"
                        max="300"
                        value={bpm}
                        onChange={(e) => onBpmChange(Number(e.target.value))}
                        disabled={syncEnabled}
                    />
                </div>
                <div className="seq-controls">
                    <button className="seq-reset-btn" onClick={onResetSteps}>
                        RESET
                    </button>
                    <button className={`seq-sync-btn ${syncEnabled ? 'active' : ''}`} onClick={onToggleSync}>
                        SYNC
                    </button>
                    <button className={`seq-play-btn ${isPlaying ? 'active' : ''}`} onClick={isPlaying ? onStop : onStart}>
                        {isPlaying ? 'STOP' : 'PLAY'}
                    </button>
                </div>
            </div>
            <div className="seq-grid">
                {steps.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="seq-row">
                        <div className="seq-row-main">
                            <div className="seq-track">
                                <div className="seq-track-label">T{rowIndex + 1}</div>
                                <select
                                    className="seq-track-select"
                                    value={tracks[rowIndex] || ''}
                                    onChange={(e) => onTrackChange(rowIndex, e.target.value || null)}
                                >
                                    <option value="">(none)</option>
                                    {options.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                                <button
                                    className={`seq-mute-toggle ${trackMutes?.[rowIndex] ? 'active' : ''}`}
                                    onClick={() => onToggleMute(rowIndex)}
                                >
                                    M
                                </button>
                                <button
                                    className={`seq-retrig-toggle ${trackRetrig?.[rowIndex] ? 'active' : ''}`}
                                    onClick={() => onToggleRetrig(rowIndex)}
                                >
                                    R
                                </button>
                                <button className={`seq-fx-toggle ${openFx[rowIndex] ? 'active' : ''}`} onClick={() => toggleFx(rowIndex)}>
                                    FX
                                </button>
                            </div>
                            <div className="seq-steps">
                                {row.map((active, stepIndex) => {
                                    const isCurrent = stepIndex === currentStep;
                                    const groupClass = stepIndex % 8 < 4 ? 'group-a' : 'group-b';
                                    return (
                                        <button
                                            key={`step-${rowIndex}-${stepIndex}`}
                                            className={`seq-step ${groupClass} ${active ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                            onClick={() => onToggleStep(rowIndex, stepIndex)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        {openFx[rowIndex] && (
                            <div className="seq-fx-panel">
                                <div className="seq-fx-section">
                                    <div className="fx-title">FILTER ({trackFx[rowIndex].filterType.toUpperCase()})</div>
                                    <div className="seq-fx-filter">
                                        <select
                                            value={trackFx[rowIndex].filterType}
                                            onChange={(e) => onTrackFxChange(rowIndex, { filterType: e.target.value })}
                                        >
                                            <option value="lowpass">LPF</option>
                                            <option value="highpass">HPF</option>
                                            <option value="bandpass">BPF</option>
                                            <option value="notch">NT</option>
                                        </select>
                                    </div>
                                    <div className="fx-row">
                                        <label>FREQ</label>
                                        <input
                                            type="range"
                                            min="-100"
                                            max="100"
                                            value={trackFx[rowIndex].filterFreq}
                                            onChange={(e) => onTrackFxChange(rowIndex, { filterFreq: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="fx-row">
                                        <label>RES</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="20"
                                            value={trackFx[rowIndex].filterQ}
                                            onChange={(e) => onTrackFxChange(rowIndex, { filterQ: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="seq-fx-section">
                                    <div className="fx-title">3-BAND EQ</div>
                                    <div className="eq-row">
                                        <div className="v-slider">
                                            <input
                                                type="range"
                                                min="-12"
                                                max="12"
                                                value={trackFx[rowIndex].eqHigh}
                                                onChange={(e) => onTrackFxChange(rowIndex, { eqHigh: Number(e.target.value) })}
                                            />
                                            <label>HI</label>
                                        </div>
                                        <div className="v-slider">
                                            <input
                                                type="range"
                                                min="-12"
                                                max="12"
                                                value={trackFx[rowIndex].eqMid}
                                                onChange={(e) => onTrackFxChange(rowIndex, { eqMid: Number(e.target.value) })}
                                            />
                                            <label>MID</label>
                                        </div>
                                        <div className="v-slider">
                                            <input
                                                type="range"
                                                min="-12"
                                                max="12"
                                                value={trackFx[rowIndex].eqLow}
                                                onChange={(e) => onTrackFxChange(rowIndex, { eqLow: Number(e.target.value) })}
                                            />
                                            <label>LO</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="seq-fx-section">
                                    <div className="fx-title">REVERB</div>
                                    <div className="fx-row">
                                        <label>MIX</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={trackFx[rowIndex].reverbMix}
                                            onChange={(e) => onTrackFxChange(rowIndex, { reverbMix: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="fx-row">
                                        <label>DECAY</label>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="5.0"
                                            step="0.1"
                                            value={trackFx[rowIndex].reverbDecay}
                                            onChange={(e) => onTrackFxChange(rowIndex, { reverbDecay: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="seq-fx-section">
                                    <div className="fx-title">ECHO</div>
                                    <div className="fx-row">
                                        <label>MIX</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={trackFx[rowIndex].echoMix}
                                            onChange={(e) => onTrackFxChange(rowIndex, { echoMix: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="fx-row">
                                        <label>TIME</label>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1.0"
                                            step="0.05"
                                            value={trackFx[rowIndex].echoTime}
                                            onChange={(e) => onTrackFxChange(rowIndex, { echoTime: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="fx-row">
                                        <label>FBK</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="0.9"
                                            step="0.05"
                                            value={trackFx[rowIndex].echoFeedback}
                                            onChange={(e) => onTrackFxChange(rowIndex, { echoFeedback: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="seq-fx-section">
                                    <div className="fx-title">PITCH</div>
                                    <div className="fx-row">
                                        <label>RATE</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2.0"
                                            step="0.1"
                                            value={trackFx[rowIndex].playbackRate}
                                            onChange={(e) => onTrackFxChange(rowIndex, { playbackRate: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="fx-row">
                                        <label>TIME</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2.0"
                                            step="0.1"
                                            value={trackFx[rowIndex].timeStretch}
                                            onChange={(e) => onTrackFxChange(rowIndex, { timeStretch: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="seq-fx-section">
                                    <div className="fx-title">VOLUME</div>
                                    <div className="fx-row">
                                        <label>VOL</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1.5"
                                            step="0.1"
                                            value={trackFx[rowIndex].volume}
                                            onChange={(e) => onTrackFxChange(rowIndex, { volume: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StepSequencer;
