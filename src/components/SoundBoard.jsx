import React, { useCallback, useEffect, useMemo, useRef } from 'react';

const getPlayingStyle = (state) => {
    if (!state) return undefined;
    const color = state === 'drill' ? '#ff4081' : 'var(--primary-color)';
    return {
        background: color,
        borderColor: color,
        boxShadow: `0 0 15px ${color}`
    };
};

const drawWaveform = (canvas, buffer) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!buffer) return;

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / width));
    const amp = height / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 1) {
        const start = x * step;
        const end = Math.min(start + step, data.length);
        let min = 1;
        let max = -1;
        for (let i = start; i < end; i += 1) {
            const v = data[i];
            if (v < min) min = v;
            if (v > max) max = v;
        }
        const y1 = (1 - max) * amp;
        const y2 = (1 - min) * amp;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y1);
        ctx.lineTo(x + 0.5, y2);
        ctx.stroke();
    }
};

const Waveform = ({ id, buffer, className, loadProgress, registerPlayhead }) => {
    const canvasRef = useRef(null);
    const bufferRef = useRef(buffer);

    useEffect(() => {
        bufferRef.current = buffer;
    }, [buffer]);

    const resizeAndDraw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.max(1, Math.floor(rect.width * dpr));
        const targetHeight = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }
        drawWaveform(canvas, bufferRef.current);
    }, []);

    useEffect(() => {
        resizeAndDraw();
    }, [resizeAndDraw, loadProgress, buffer]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if (!container) return;
        let rafId = 0;
        const handle = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(resizeAndDraw);
        };
        const ro = new ResizeObserver(handle);
        ro.observe(container);
        window.addEventListener('resize', handle);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', handle);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [resizeAndDraw]);

    return (
        <div className={`sound-wave ${className || ''}`}>
            <canvas ref={canvasRef} />
            <span className="playhead" ref={registerPlayhead(id)} />
        </div>
    );
};

const SoundBoard = ({ voices, character, playingSounds, onPlaySound, compact, audioBuffers, loadProgress, audioCtxRef, playheadInfo }) => {
    const list = useMemo(() => voices[character] || [], [voices, character]);
    const playheadEls = useRef(new Map());

    const registerPlayhead = useCallback(
        (id) => (el) => {
            if (!el) {
                playheadEls.current.delete(id);
                return;
            }
            playheadEls.current.set(id, el);
        },
        []
    );

    useEffect(() => {
        let rafId = 0;
        const tick = () => {
            const ctx = audioCtxRef?.current;
            const now = ctx ? ctx.currentTime : 0;
            list.forEach(v => {
                const el = playheadEls.current.get(v.id);
                if (!el) return;
                const info = playheadInfo?.current?.[v.id];
                if (!info || !ctx) {
                    el.style.opacity = '0';
                    return;
                }
                const durationSec = info.durationSec || 0;
                if (durationSec <= 0) {
                    el.style.opacity = '0';
                    return;
                }
                let t = now - info.startTime;
                if (t < 0) t = 0;
                const frac = info.loop ? (t % durationSec) / durationSec : Math.min(t / durationSec, 1);
                el.style.opacity = '0.9';
                el.style.left = `calc(${(frac * 100).toFixed(2)}% - 1px)`;
            });
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [list, audioCtxRef, playheadInfo]);

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
                        <span className="sound-label">{v.label}</span>
                        <Waveform
                            id={v.id}
                            buffer={audioBuffers?.current?.[v.file]}
                            className={compact ? 'compact' : ''}
                            loadProgress={loadProgress}
                            registerPlayhead={registerPlayhead}
                        />
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
