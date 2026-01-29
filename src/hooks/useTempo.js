import { useCallback, useState } from 'react';
import {
    DEFAULT_BPM,
    DEFAULT_TAP_MAX_BPM,
    DEFAULT_TAP_MIN_BPM,
    DEFAULT_TAP_WINDOW_MS
} from '../constants/audioDefaults';

export const useTempo = ({
    initialBpm = DEFAULT_BPM,
    onPlaybackRateChange,
    onGrainSizeChange
} = {}) => {
    const [bpm, setBpm] = useState(initialBpm);
    const [tapTimes, setTapTimes] = useState([]);

    const handleTap = useCallback(() => {
        const now = Date.now();
        const times = tapTimes.filter((t) => now - t < DEFAULT_TAP_WINDOW_MS);
        times.push(now);

        if (times.length >= 3) {
            const intervals = [];
            for (let i = 1; i < times.length; i++) {
                intervals.push(times[i] - times[i - 1]);
            }
            const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const newBpm = Math.round(60000 / avgMs);

            if (newBpm > DEFAULT_TAP_MIN_BPM && newBpm < DEFAULT_TAP_MAX_BPM) {
                setBpm(newBpm);
                if (onPlaybackRateChange) {
                    onPlaybackRateChange(Number((newBpm / 120).toFixed(2)));
                }
                if (onGrainSizeChange) {
                    const note32 = (60 / newBpm) / 8;
                    onGrainSizeChange(Number(note32.toFixed(3)));
                }
            }
            if (times.length > 5) times.shift();
        }
        setTapTimes(times);
    }, [onGrainSizeChange, onPlaybackRateChange, tapTimes]);

    const resetTempo = useCallback(() => {
        setBpm(initialBpm);
        setTapTimes([]);
    }, [initialBpm]);

    return {
        bpm,
        setBpm,
        tapTimes,
        setTapTimes,
        handleTap,
        resetTempo
    };
};
