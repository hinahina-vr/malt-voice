import React, { useMemo } from 'react';

const getPlayingStyle = (state) => {
    if (!state) return undefined;
    const color = state === 'drill' ? '#ff4081' : 'var(--primary-color)';
    return {
        background: color,
        borderColor: color,
        boxShadow: `0 0 15px ${color}`
    };
};

const SoundBoard = ({ voices, character, playingSounds, onPlaySound, compact }) => {
    const list = useMemo(() => voices[character] || [], [voices, character]);

    return (
        <main className="content-area">
            <div className={`board ${compact ? 'compact' : ''}`} style={{ zIndex: 1, position: 'relative' }}>
                {list.map(v => (
                    <button
                        key={v.id}
                        className={`sound-btn ${playingSounds[v.id] ? 'playing' : ''}`}
                        style={getPlayingStyle(playingSounds[v.id])}
                        onPointerDown={() => onPlaySound(v.file, v.id)}
                    >
                        {v.label}
                    </button>
                ))}
                {list.length === 0 && (
                    <div className="construction">
                        <h2>{character === 'kai' ? 'KAI PAGE' : 'PAGE'}</h2>
                        <p>🚧 UNDER CONSTRUCTION 🚧</p>
                        <p>Coming Soon...</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SoundBoard;
