import React from 'react';

const StepSequencer = ({
    tracks,
    steps,
    options,
    onTrackChange,
    onToggleStep,
    isPlaying,
    onStart,
    onStop,
    currentStep,
    syncEnabled,
    onToggleSync,
    bpm,
    onBpmChange,
    onResetSteps
}) => {
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
                ))}
            </div>
        </div>
    );
};

export default StepSequencer;
