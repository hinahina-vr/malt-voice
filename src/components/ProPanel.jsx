import React, { useMemo } from 'react';

const FILTER_TYPES = [
    { id: 'lowpass', label: 'LPF' },
    { id: 'highpass', label: 'HPF' },
    { id: 'bandpass', label: 'BPF' },
    { id: 'notch', label: 'NT' }
];

const sectionGridStyle = {
    gridColumn: '1 / -1',
    borderTop: '1px solid #444',
    paddingTop: '0.5rem',
    marginTop: '0.5rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.5rem'
};

const columnStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
};

const modeRowStyle = {
    display: 'flex',
    gap: '0.2rem',
    marginBottom: '0.2rem'
};

const mixerContainerStyle = {
    marginTop: '4px',
    borderTop: '1px solid #444',
    paddingTop: '4px',
    width: '100%'
};

const mixerListStyle = {
    maxHeight: '75px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
};

const modeButtonBaseStyle = {
    border: 'none',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '0.6rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    flex: 1,
    transition: 'background 0.2s'
};

const SliderRow = ({ label, valueLabel, min, max, step, value, onChange }) => {
    return (
        <div className="fx-row">
            <label>{valueLabel ? `${label} (${valueLabel})` : label}</label>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
        </div>
    );
};

const VSlider = ({ label, min, max, value, onChange }) => {
    return (
        <div className="v-slider">
            <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
            <label>{label}</label>
        </div>
    );
};

const ModeButton = ({ label, active, activeBg, activeColor, onClick, disabled }) => {
    return (
        <button
            className={`loop-mode-btn ${active ? 'active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            style={{
                ...modeButtonBaseStyle,
                background: active ? activeBg : '#333',
                color: active ? activeColor : '#888',
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
            }}
        >
            {label}
        </button>
    );
};

const ActiveMixer = ({ ids, voiceById, loopVolumes, onLoopVolumeChange }) => {
    if (ids.length === 0) return null;

    return (
        <div style={mixerContainerStyle}>
            <div className="fx-title">ACTIVE MIXER</div>
            <div style={mixerListStyle}>
                {ids.map(id => {
                    const voice = voiceById.get(id);
                    if (!voice) return null;
                    return (
                        <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', paddingRight: '4px' }}>
                            <span style={{ fontSize: '0.6rem', width: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voice.label}</span>
                            <input
                                type="range"
                                min="0"
                                max="1.5"
                                step="0.1"
                                value={loopVolumes[id] !== undefined ? loopVolumes[id] : 1.0}
                                onChange={(e) => onLoopVolumeChange(id, Number(e.target.value))}
                                style={{ flex: 1, height: '15px' }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ProPanel = ({
    filterType,
    onFilterTypeChange,
    filterFreq,
    onFilterFreqChange,
    filterQ,
    onFilterQChange,
    eqHigh,
    onEqHighChange,
    eqMid,
    onEqMidChange,
    eqLow,
    onEqLowChange,
    loopMode,
    drillMode,
    onToggleLoopMode,
    onToggleDrillMode,
    restartOnClick,
    onToggleRestartOnClick,
    playbackRate,
    onPlaybackRateChange,
    grainSize,
    onGrainSizeChange,
    reverbMix,
    onReverbMixChange,
    reverbDecay,
    onReverbDecayChange,
    echoMix,
    onEchoMixChange,
    echoTime,
    onEchoTimeChange,
    echoFeedback,
    onEchoFeedbackChange,
    playingSounds,
    loopVolumes,
    onLoopVolumeChange,
    voices
}) => {
    const activeLoopIds = useMemo(
        () => Object.keys(playingSounds).filter(k => playingSounds[k] !== 'oneshot'),
        [playingSounds]
    );

    const voiceById = useMemo(() => {
        const map = new Map();
        Object.values(voices).flat().forEach(v => map.set(v.id, v));
        return map;
    }, [voices]);

    return (
        <div className="pro-panel-inline">
            <div className="fx-section">
                <div className="fx-title">FILTER ({filterType.toUpperCase()})</div>
                <div className="fx-types">
                    {FILTER_TYPES.map(t => (
                        <button key={t.id} className={filterType === t.id ? 'active' : ''} onClick={() => onFilterTypeChange(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <SliderRow label="FREQ" min="-100" max="100" value={filterFreq} onChange={onFilterFreqChange} />
                <SliderRow label="RES" min="0" max="20" value={filterQ} onChange={onFilterQChange} />
            </div>

            <div className="fx-section">
                <div className="fx-title">3-BAND EQ</div>
                <div className="eq-row">
                    <VSlider label="HI" min="-12" max="12" value={eqHigh} onChange={onEqHighChange} />
                    <VSlider label="MID" min="-12" max="12" value={eqMid} onChange={onEqMidChange} />
                    <VSlider label="LO" min="-12" max="12" value={eqLow} onChange={onEqLowChange} />
                </div>
            </div>

            <div className="fx-section" style={sectionGridStyle}>
                <div style={columnStyle}>
                    <div className="fx-title">MODE</div>
                    <div style={modeRowStyle}>
                        <ModeButton
                            label="LOOP"
                            active={loopMode && !drillMode}
                            activeBg="var(--primary-color)"
                            activeColor="#000"
                            onClick={onToggleLoopMode}
                        />
                        <ModeButton
                            label="DRILL"
                            active={drillMode}
                            activeBg="#ff4081"
                            activeColor="#fff"
                            onClick={onToggleDrillMode}
                        />
                    </div>
                    <div style={modeRowStyle}>
                        <ModeButton
                            label="RETRIG"
                            active={restartOnClick}
                            activeBg="#ffd54f"
                            activeColor="#000"
                            onClick={onToggleRestartOnClick}
                            disabled={loopMode || drillMode}
                        />
                    </div>

                    <SliderRow
                        label="PITCH"
                        valueLabel={`x${playbackRate}`}
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={playbackRate}
                        onChange={onPlaybackRateChange}
                    />
                    {drillMode && (
                        <SliderRow
                            label="GRAIN"
                            valueLabel={`${Math.round(grainSize * 1000)}ms`}
                            min="0.01"
                            max="1.0"
                            step="0.001"
                            value={grainSize}
                            onChange={onGrainSizeChange}
                        />
                    )}
                </div>

                <div style={columnStyle}>
                    <div className="fx-title">REVERB</div>
                    <SliderRow
                        label="MIX"
                        valueLabel={`${reverbMix}%`}
                        min="0"
                        max="100"
                        value={reverbMix}
                        onChange={onReverbMixChange}
                    />
                    <SliderRow
                        label="DECAY"
                        valueLabel={reverbDecay}
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={reverbDecay}
                        onChange={onReverbDecayChange}
                    />
                </div>

                <div style={columnStyle}>
                    <div className="fx-title">ECHO</div>
                    <SliderRow
                        label="MIX"
                        valueLabel={`${echoMix}%`}
                        min="0"
                        max="100"
                        value={echoMix}
                        onChange={onEchoMixChange}
                    />
                    <SliderRow
                        label="TIME"
                        valueLabel={`${echoTime}s`}
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={echoTime}
                        onChange={onEchoTimeChange}
                    />
                    <SliderRow
                        label="FBK"
                        valueLabel={echoFeedback}
                        min="0"
                        max="0.9"
                        step="0.05"
                        value={echoFeedback}
                        onChange={onEchoFeedbackChange}
                    />
                </div>

                <ActiveMixer
                    ids={activeLoopIds}
                    voiceById={voiceById}
                    loopVolumes={loopVolumes}
                    onLoopVolumeChange={onLoopVolumeChange}
                />
            </div>
        </div>
    );
};

export default ProPanel;
