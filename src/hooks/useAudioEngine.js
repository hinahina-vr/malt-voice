import { useEffect, useRef, useState } from 'react';
import { createImpulseResponse, mapFilterFrequency } from '../utils/audioUtils';

export const useAudioEngine = ({
    voices,
    filterType,
    filterFreq,
    filterQ,
    eqLow,
    eqMid,
    eqHigh,
    reverbMix,
    reverbDecay,
    echoMix,
    echoTime,
    echoFeedback,
    playbackRate,
    loopMode,
    drillMode,
    restartOnClick,
    grainSize,
    loopVolumes,
    setPlayingSounds
}) => {
    const audioCtxRef = useRef(null);
    const audioBuffers = useRef({});
    const filterNode = useRef(null);
    const eqNodes = useRef({});
    const masterGain = useRef(null);

    const reverbNode = useRef(null);
    const reverbGain = useRef(null);
    const echoNode = useRef(null);
    const echoFeedbackNode = useRef(null);
    const echoGain = useRef(null);

    const activeLoops = useRef({});
    const activeOneshots = useRef({});

    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const master = ctx.createGain();
        master.connect(ctx.destination);
        masterGain.current = master;

        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 20000;
        f.connect(master);
        filterNode.current = f;

        // Reverb
        const rev = ctx.createConvolver();
        rev.buffer = createImpulseResponse(ctx, 2.0, 2.0, false);
        const revGain = ctx.createGain();
        revGain.gain.value = 0;

        f.connect(revGain);
        revGain.connect(rev);
        rev.connect(master);

        reverbNode.current = rev;
        reverbGain.current = revGain;

        // Echo
        const dly = ctx.createDelay(5.0);
        dly.delayTime.value = 0.3;
        const dlyFb = ctx.createGain();
        dlyFb.gain.value = 0.4;
        const dlyGain = ctx.createGain();
        dlyGain.gain.value = 0;

        f.connect(dlyGain);
        dlyGain.connect(dly);
        dly.connect(master);

        dly.connect(dlyFb);
        dlyFb.connect(dly);

        echoNode.current = dly;
        echoFeedbackNode.current = dlyFb;
        echoGain.current = dlyGain;

        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 3000;
        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.value = 200;

        low.connect(mid);
        mid.connect(high);
        high.connect(f);

        eqNodes.current = { low, mid, high };

        const loadDocs = async () => {
            const allVoices = Object.values(voices).flat();
            if (!allVoices.length) { setIsLoading(false); return; }
            setIsLoading(true);
            let loaded = 0;
            for (const v of allVoices) {
                try {
                    const res = await fetch(`/sounds/${v.file}`);
                    const ab = await res.arrayBuffer();
                    audioBuffers.current[v.file] = await ctx.decodeAudioData(ab);
                } catch (e) { console.error(e); }
                loaded++;
                setProgress(Math.floor((loaded / allVoices.length) * 100));
            }
            setTimeout(() => setIsLoading(false), 500);
        };
        loadDocs();

        return () => ctx.close();
    }, []);

    useEffect(() => {
        if (!filterNode.current || !audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;

        const f = filterNode.current;
        f.type = filterType;
        f.Q.setTargetAtTime(filterQ, now, 0.1);
        f.frequency.setTargetAtTime(mapFilterFrequency(filterFreq), now, 0.1);

        const { low, mid, high } = eqNodes.current;
        if (low) low.gain.setTargetAtTime(eqLow, now, 0.1);
        if (mid) mid.gain.setTargetAtTime(eqMid, now, 0.1);
        if (high) high.gain.setTargetAtTime(eqHigh, now, 0.1);

        if (reverbGain.current) reverbGain.current.gain.setTargetAtTime(reverbMix / 100, now, 0.1);
        if (echoGain.current) echoGain.current.gain.setTargetAtTime(echoMix / 100, now, 0.1);
        if (echoNode.current) echoNode.current.delayTime.setTargetAtTime(echoTime, now, 0.1);
        if (echoFeedbackNode.current) echoFeedbackNode.current.gain.setTargetAtTime(echoFeedback, now, 0.1);
    }, [filterType, filterFreq, filterQ, eqLow, eqMid, eqHigh, reverbMix, echoMix, echoTime, echoFeedback]);

    useEffect(() => {
        if (!audioCtxRef.current || !reverbNode.current) return;
        const buf = createImpulseResponse(audioCtxRef.current, 2.0, reverbDecay, false);
        reverbNode.current.buffer = buf;
    }, [reverbDecay]);

    const playSound = (soundFile, id, forcedMode = null, forcedGrain = null) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        let mode = forcedMode;
        if (!mode) {
            if (drillMode) mode = 'drill';
            else if (loopMode) mode = 'loop';
            else mode = 'oneshot';
        }

        if (!forcedMode) {
            if (mode === 'drill' || mode === 'loop') {
                if (activeLoops.current[id]) {
                    try { activeLoops.current[id].src.stop(); } catch (e) { }
                    delete activeLoops.current[id];
                    setPlayingSounds(p => {
                        const next = { ...p };
                        delete next[id];
                        return next;
                    });
                    return;
                }
            }
            if (mode === 'oneshot' && restartOnClick && activeOneshots.current[id]) {
                try { activeOneshots.current[id].stop(); } catch (e) { }
                delete activeOneshots.current[id];
            }
        } else {
            if (activeLoops.current[id]) {
                try { activeLoops.current[id].src.stop(); } catch (e) { }
                delete activeLoops.current[id];
            }
        }

        const buffer = audioBuffers.current[soundFile];
        if (buffer) {
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.playbackRate.value = playbackRate;

            const gainNode = ctx.createGain();
            const initialVol = loopVolumes[id] !== undefined ? loopVolumes[id] : 1.0;
            gainNode.gain.value = initialVol;

            if (mode === 'drill') {
                src.loop = true;
                src.loopStart = 0;
                src.loopEnd = forcedGrain || grainSize;
                src._customGrain = src.loopEnd;
                activeLoops.current[id] = { src, gain: gainNode };
                setPlayingSounds(p => ({ ...p, [id]: 'drill' }));
            } else if (mode === 'loop') {
                src.loop = true;
                activeLoops.current[id] = { src, gain: gainNode };
                setPlayingSounds(p => ({ ...p, [id]: 'loop' }));
            } else {
                if (restartOnClick && activeOneshots.current[id]) {
                    try { activeOneshots.current[id].stop(); } catch (e) { }
                    delete activeOneshots.current[id];
                }
                setPlayingSounds(p => ({ ...p, [id]: 'oneshot' }));
                setTimeout(() => setPlayingSounds(p => {
                    if (p[id] === 'oneshot') {
                        const next = { ...p };
                        delete next[id];
                        return next;
                    }
                    return p;
                }), 100);
            }

            src.connect(gainNode);

            if (eqNodes.current.low) gainNode.connect(eqNodes.current.low);
            else gainNode.connect(ctx.destination);

            if (mode === 'oneshot') {
                activeOneshots.current[id] = src;
                src.onended = () => {
                    if (activeOneshots.current[id] === src) {
                        delete activeOneshots.current[id];
                    }
                };
            }

            src.start(0);
        }
    };

    return {
        audioCtxRef,
        audioBuffers,
        filterNode,
        eqNodes,
        masterGain,
        reverbNode,
        reverbGain,
        echoNode,
        echoFeedbackNode,
        echoGain,
        activeLoops,
        isLoading,
        progress,
        playSound
    };
};
