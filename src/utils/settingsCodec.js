const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const toBase64 = (bigInt) => {
    let str = "";
    let n = bigInt;
    while (n > 0n) {
        str = CHARSET[Number(n & 63n)] + str;
        n >>= 6n;
    }
    return str || "0";
};

const fromBase64 = (str) => {
    let n = 0n;
    for (let i = 0; i < str.length; i++) {
        n = (n << 6n) + BigInt(CHARSET.indexOf(str[i]));
    }
    return n;
};

export const encodeSettings = ({
    voices,
    playingSounds,
    activeLoopsRef,
    grainSize,
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
    bpm,
    loopMode,
    drillMode,
    seqTracks,
    seqSteps,
    seqTrackMutes,
    seqTrackRetrig
}) => {
    let b = 0n;
    const push = (val, bits) => { b = (b << BigInt(bits)) + BigInt(val); };

    // --- SOUNDS ---
    push(0, 8); // Terminator for sounds

    const allVoices = Object.values(voices).flat();
    const activeIds = Object.keys(playingSounds).filter(k => playingSounds[k] === 'drill' || playingSounds[k] === 'loop');

    activeIds.forEach(id => {
        const vIndex = allVoices.findIndex(v => v.id === id) + 1;
        if (vIndex > 0) {
            const isDrill = playingSounds[id] === 'drill';
            const modeVal = isDrill ? 2 : 1;

            if (isDrill) {
                const src = activeLoopsRef?.current?.[id];
                const currentGrain = src && src.src && src.src._customGrain ? src.src._customGrain : grainSize;
                const gVal = Math.round((currentGrain - 0.01) / 0.99 * 63);
                push(gVal, 6);
            }

            push(modeVal, 2);
            push(vIndex, 6);
        }
    });

    // --- SEQUENCER ---
    const tracksCount = 4;
    const stepsPerTrack = 16;

    for (let row = 0; row < tracksCount; row++) {
        for (let step = 0; step < stepsPerTrack; step++) {
            const active = seqSteps?.[row]?.[step] ? 1 : 0;
            push(active, 1);
        }
    }

    for (let row = 0; row < tracksCount; row++) {
        const id = seqTracks?.[row] || null;
        const vIndex = id ? (allVoices.findIndex(v => v.id === id) + 1) : 0;
        push(Math.max(0, Math.min(63, vIndex)), 6);
    }

    for (let row = 0; row < tracksCount; row++) {
        push(seqTrackMutes?.[row] ? 1 : 0, 1);
    }

    for (let row = 0; row < tracksCount; row++) {
        push(seqTrackRetrig?.[row] ? 1 : 0, 1);
    }

    // --- GLOBAL SETTINGS ---
    const fType = ['lowpass', 'highpass', 'bandpass', 'notch'].indexOf(filterType);

    push(drillMode ? 1 : 0, 1);
    push(loopMode ? 1 : 0, 1);

    push(fType < 0 ? 0 : fType, 2);
    push(Math.round((filterFreq + 100) / 200 * 31), 5);
    push(Math.round(filterQ / 20 * 15), 4);
    [eqHigh, eqMid, eqLow].forEach(v => push(Math.round((v + 12) / 24 * 15), 4));
    push(Math.round(reverbMix / 100 * 15), 4);
    push(Math.round((reverbDecay - 0.1) / 4.9 * 15), 4);
    push(Math.round(echoMix / 100 * 15), 4);
    push(Math.round((echoTime - 0.1) / 0.9 * 15), 4);
    push(Math.round(echoFeedback / 0.9 * 15), 4);
    push(Math.round((playbackRate - 0.5) / 1.5 * 15), 4);
    push(Math.round((timeStretch - 0.5) / 1.5 * 15), 4);
    push(Math.max(0, Math.min(255, bpm - 40)), 8);

    // VERSION HEADER (Last pushed -> First popped)
    push(2, 4); // v2

    return toBase64(b);
};

export const decodeSettings = (str, voices) => {
    try {
        let b = fromBase64(str);
        const pop = (bits) => {
            const mask = (1n << BigInt(bits)) - 1n;
            const val = Number(b & mask);
            b >>= BigInt(bits);
            return val;
        };

        const version = pop(4);
        if (version !== 1 && version !== 2) {
            return { ok: false, version };
        }

        const allVoices = Object.values(voices).flat();
        const restored = [];
        let seq = null;

        const decodeShared = () => {
            const d_bpm = pop(8);
            const d_tstretch = version === 2 ? pop(4) : null;
            const d_pitch = pop(4);
            const d_efbk = pop(4);
            const d_etime = pop(4);
            const d_emix = pop(4);
            const d_rdecay = pop(4);
            const d_rmix = pop(4);
            const d_eql = pop(4);
            const d_eqm = pop(4);
            const d_eqh = pop(4);
            const d_fres = pop(4);
            const d_ffreq = pop(5);
            const d_ftype = pop(2);

            const d_loop = pop(1);
            const d_drill = pop(1);

            const bpm = d_bpm + 40;
            const playbackRate = Number((d_pitch / 15 * 1.5 + 0.5).toFixed(1));
            const timeStretch = d_tstretch == null
                ? 1.0
                : Number((d_tstretch / 15 * 1.5 + 0.5).toFixed(1));
            const echoFeedback = Number((d_efbk / 15 * 0.9).toFixed(2));
            const echoTime = Number((d_etime / 15 * 0.9 + 0.1).toFixed(2));
            const echoMix = Math.round(d_emix / 15 * 100);
            const reverbDecay = Number((d_rdecay / 15 * 4.9 + 0.1).toFixed(1));
            const reverbMix = Math.round(d_rmix / 15 * 100);
            const eqLow = Math.round(d_eql / 15 * 24 - 12);
            const eqMid = Math.round(d_eqm / 15 * 24 - 12);
            const eqHigh = Math.round(d_eqh / 15 * 24 - 12);
            const filterQ = Number((d_fres / 15 * 20).toFixed(1));
            const filterFreq = Math.round(d_ffreq / 31 * 200 - 100);
            const filterType = ['lowpass', 'highpass', 'bandpass', 'notch'][d_ftype] || 'lowpass';

            const loopMode = d_loop === 1;
            const drillMode = d_drill === 1;

            return {
                settings: {
                    bpm,
                    playbackRate,
                    timeStretch,
                    echoFeedback,
                    echoTime,
                    echoMix,
                    reverbDecay,
                    reverbMix,
                    eqLow,
                    eqMid,
                    eqHigh,
                    filterQ,
                    filterFreq,
                    filterType,
                    loopMode,
                    drillMode
                }
            };
        };

        const decodeSequencer = () => {
            const tracksCount = 4;
            const stepsPerTrack = 16;
            const retrig = Array(tracksCount).fill(false);
            const mutes = Array(tracksCount).fill(false);
            const tracks = Array(tracksCount).fill(null);
            const steps = Array.from({ length: tracksCount }, () => Array(stepsPerTrack).fill(false));

            for (let row = tracksCount - 1; row >= 0; row--) {
                retrig[row] = pop(1) === 1;
            }
            for (let row = tracksCount - 1; row >= 0; row--) {
                mutes[row] = pop(1) === 1;
            }
            for (let row = tracksCount - 1; row >= 0; row--) {
                const idx = pop(6);
                tracks[row] = idx > 0 ? (allVoices[idx - 1]?.id || null) : null;
            }
            for (let row = tracksCount - 1; row >= 0; row--) {
                for (let step = stepsPerTrack - 1; step >= 0; step--) {
                    steps[row][step] = pop(1) === 1;
                }
            }

            return { tracks, steps, mutes, retrig };
        };

        const { settings } = decodeShared();

        if (version === 2) {
            seq = decodeSequencer();
        }

        const note32 = (60 / settings.bpm) / 8;
        const grainSize = Number(note32.toFixed(3));

        while (true) {
            if (b <= 0n) break;

            const sIdx = pop(6);
            if (sIdx === 0) break;

            const sMode = pop(2);
            let sGrain = null;

            if (sMode === 2) {
                const gVal = pop(6);
                sGrain = (gVal / 63 * 0.99) + 0.01;
            }

            const targetSound = allVoices[sIdx - 1];
            if (targetSound) {
                restored.push({
                    sound: targetSound,
                    mode: sMode === 2 ? 'drill' : 'loop',
                    grain: sGrain
                });
            }
        }

        return {
            ok: true,
            settings,
            grainSize,
            restored,
            seq
        };
    } catch (e) {
        return { ok: false, error: e };
    }
};
