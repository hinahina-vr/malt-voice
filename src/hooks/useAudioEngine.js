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
    timeStretch,
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
    const oneshotTimeouts = useRef({});
    const playheadInfo = useRef({});

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

    const stopActiveOneshot = (id) => {
        const current = activeOneshots.current[id];
        if (!current) return;
        const sources = Array.isArray(current)
            ? current
            : current?.sources
                ? current.sources
                : [current];
        sources.forEach((src) => {
            try { src.stop(); } catch (e) { }
        });
        delete activeOneshots.current[id];
    };

    const scheduleOneshotCleanup = (id, durationMs, delayMs) => {
        if (oneshotTimeouts.current[id]) {
            clearTimeout(oneshotTimeouts.current[id]);
        }
        oneshotTimeouts.current[id] = setTimeout(() => {
            setPlayingSounds(p => {
                if (p[id] === 'oneshot') {
                    const next = { ...p };
                    delete next[id];
                    return next;
                }
                return p;
            });
            delete oneshotTimeouts.current[id];
            delete playheadInfo.current[id];
            stopActiveOneshot(id);
        }, durationMs + delayMs);
    };

    const playSound = (soundFile, id, forcedMode = null, forcedGrain = null, startTime = null, trackFx = null, forceRetrig = false) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const startAt = startTime ?? ctx.currentTime;

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
                    delete playheadInfo.current[id];
                    setPlayingSounds(p => {
                        const next = { ...p };
                        delete next[id];
                        return next;
                    });
                    return;
                }
            }
            if (mode === 'oneshot' && restartOnClick && activeOneshots.current[id]) {
                stopActiveOneshot(id);
                delete playheadInfo.current[id];
                if (oneshotTimeouts.current[id]) {
                    clearTimeout(oneshotTimeouts.current[id]);
                    delete oneshotTimeouts.current[id];
                }
            }
        } else {
            if (activeLoops.current[id]) {
                try { activeLoops.current[id].src.stop(); } catch (e) { }
                delete activeLoops.current[id];
                delete playheadInfo.current[id];
            }
        }

        const buffer = audioBuffers.current[soundFile];
        if (buffer) {
            const trackRate = trackFx && trackFx.playbackRate ? trackFx.playbackRate : 1.0;
            const trackStretch = trackFx && trackFx.timeStretch ? trackFx.timeStretch : 1.0;
            const effectiveRate = playbackRate * trackRate;
            const effectiveStretch = timeStretch * trackStretch;

            const gainNode = ctx.createGain();
            const initialVol = loopVolumes[id] !== undefined ? loopVolumes[id] : 1.0;
            const trackVol = trackFx && trackFx.volume !== undefined ? trackFx.volume : 1.0;
            gainNode.gain.value = initialVol * trackVol;

            let outputNode = gainNode;
            if (trackFx) {
                const tLow = ctx.createBiquadFilter();
                tLow.type = 'lowshelf';
                tLow.frequency.value = 200;
                tLow.gain.value = trackFx.eqLow ?? 0;

                const tMid = ctx.createBiquadFilter();
                tMid.type = 'peaking';
                tMid.frequency.value = 1000;
                tMid.gain.value = trackFx.eqMid ?? 0;

                const tHigh = ctx.createBiquadFilter();
                tHigh.type = 'highshelf';
                tHigh.frequency.value = 3000;
                tHigh.gain.value = trackFx.eqHigh ?? 0;

                const tFilter = ctx.createBiquadFilter();
                tFilter.type = trackFx.filterType || 'lowpass';
                tFilter.Q.value = trackFx.filterQ ?? 1;
                tFilter.frequency.value = mapFilterFrequency(trackFx.filterFreq ?? 100);

                gainNode.connect(tLow);
                tLow.connect(tMid);
                tMid.connect(tHigh);
                tHigh.connect(tFilter);
                outputNode = tFilter;

                if (trackFx.reverbMix && trackFx.reverbMix > 0 && masterGain.current) {
                    const rev = ctx.createConvolver();
                    rev.buffer = createImpulseResponse(ctx, 2.0, trackFx.reverbDecay ?? 2.0, false);
                    const revGain = ctx.createGain();
                    revGain.gain.value = trackFx.reverbMix / 100;
                    tFilter.connect(revGain);
                    revGain.connect(rev);
                    rev.connect(masterGain.current);
                }

                if (trackFx.echoMix && trackFx.echoMix > 0 && masterGain.current) {
                    const dly = ctx.createDelay(5.0);
                    dly.delayTime.value = trackFx.echoTime ?? 0.3;
                    const dlyFb = ctx.createGain();
                    dlyFb.gain.value = trackFx.echoFeedback ?? 0.4;
                    const dlyGain = ctx.createGain();
                    dlyGain.gain.value = trackFx.echoMix / 100;

                    tFilter.connect(dlyGain);
                    dlyGain.connect(dly);
                    dly.connect(masterGain.current);

                    dly.connect(dlyFb);
                    dlyFb.connect(dly);
                }
            }

            if (mode === 'oneshot' && effectiveStretch !== 1) {
                if (forceRetrig && activeOneshots.current[id]) {
                    stopActiveOneshot(id);
                    delete playheadInfo.current[id];
                    if (oneshotTimeouts.current[id]) {
                        clearTimeout(oneshotTimeouts.current[id]);
                        delete oneshotTimeouts.current[id];
                    }
                }
                const grainSizeSec = Math.max(0.03, Math.min(0.12, buffer.duration / 6));
                const sourceHop = grainSizeSec * effectiveRate;
                const outputHop = grainSizeSec * effectiveStretch;
                const grainFade = Math.min(0.01, grainSizeSec / 2);
                const sources = [];
                let sourcePos = 0;
                let outputTime = startAt;

                while (sourcePos < buffer.duration) {
                    const grainDur = Math.min(grainSizeSec, buffer.duration - sourcePos);
                    const grainSrc = ctx.createBufferSource();
                    grainSrc.buffer = buffer;
                    grainSrc.playbackRate.value = effectiveRate;

                    const grainGain = ctx.createGain();
                    grainGain.gain.setValueAtTime(0, outputTime);
                    grainGain.gain.linearRampToValueAtTime(1, outputTime + grainFade);
                    grainGain.gain.setValueAtTime(1, outputTime + Math.max(grainFade, grainDur - grainFade));
                    grainGain.gain.linearRampToValueAtTime(0, outputTime + grainDur);

                    grainSrc.connect(grainGain);
                    grainGain.connect(gainNode);

                    grainSrc.start(outputTime, sourcePos, grainDur);
                    sources.push(grainSrc);

                    sourcePos += sourceHop;
                    outputTime += outputHop;
                }

                setPlayingSounds(p => ({ ...p, [id]: 'oneshot' }));
                playheadInfo.current[id] = {
                    startTime: startAt,
                    durationSec: (buffer.duration / effectiveRate) * effectiveStretch,
                    loop: false,
                    mode: 'oneshot'
                };

                const durationMs = Math.max(60, ((buffer.duration / effectiveRate) * effectiveStretch) * 1000);
                const delayMs = Math.max(0, (startAt - ctx.currentTime) * 1000);
                scheduleOneshotCleanup(id, durationMs, delayMs);
                activeOneshots.current[id] = { sources, isGranular: true };

                if (eqNodes.current.low) outputNode.connect(eqNodes.current.low);
                else outputNode.connect(ctx.destination);
                return;
            }

            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.playbackRate.value = effectiveRate;

            if (mode === 'drill') {
                src.loop = true;
                src.loopStart = 0;
                src.loopEnd = forcedGrain || grainSize;
                src._customGrain = src.loopEnd;
                activeLoops.current[id] = { src, gain: gainNode };
                playheadInfo.current[id] = {
                    startTime: startAt,
                    durationSec: (src.loopEnd || grainSize) / effectiveRate,
                    loop: true,
                    mode: 'drill'
                };
                setPlayingSounds(p => ({ ...p, [id]: 'drill' }));
            } else if (mode === 'loop') {
                src.loop = true;
                activeLoops.current[id] = { src, gain: gainNode };
                playheadInfo.current[id] = {
                    startTime: startAt,
                    durationSec: buffer.duration / effectiveRate,
                    loop: true,
                    mode: 'loop'
                };
                setPlayingSounds(p => ({ ...p, [id]: 'loop' }));
            } else {
                if (forceRetrig && activeOneshots.current[id]) {
                    stopActiveOneshot(id);
                    delete playheadInfo.current[id];
                    if (oneshotTimeouts.current[id]) {
                        clearTimeout(oneshotTimeouts.current[id]);
                        delete oneshotTimeouts.current[id];
                    }
                }
                setPlayingSounds(p => ({ ...p, [id]: 'oneshot' }));
                playheadInfo.current[id] = {
                    startTime: startAt,
                    durationSec: buffer.duration / effectiveRate,
                    loop: false,
                    mode: 'oneshot'
                };
                const durationMs = Math.max(60, (buffer.duration / effectiveRate) * 1000);
                const delayMs = Math.max(0, (startAt - ctx.currentTime) * 1000);
                scheduleOneshotCleanup(id, durationMs, delayMs);
            }

            src.connect(gainNode);

            if (eqNodes.current.low) outputNode.connect(eqNodes.current.low);
            else outputNode.connect(ctx.destination);

            if (mode === 'oneshot') {
                activeOneshots.current[id] = src;
                src.onended = () => {
                    if (activeOneshots.current[id] === src) {
                        delete activeOneshots.current[id];
                        delete playheadInfo.current[id];
                        if (oneshotTimeouts.current[id]) {
                            clearTimeout(oneshotTimeouts.current[id]);
                            delete oneshotTimeouts.current[id];
                        }
                        setPlayingSounds(p => {
                            if (p[id] === 'oneshot') {
                                const next = { ...p };
                                delete next[id];
                                return next;
                            }
                            return p;
                        });
                    }
                };
            }

            src.start(startAt);
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
        playheadInfo,
        isLoading,
        progress,
        playSound
    };
};
