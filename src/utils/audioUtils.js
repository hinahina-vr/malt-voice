export const createImpulseResponse = (ctx, duration, decay, reverse) => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
};

export const mapFilterFrequency = (filterFreq) => {
    const norm = (filterFreq + 100) / 200;
    if (norm === 1) return 20000;
    if (norm === 0) return 20;
    return 20 * Math.pow(1000, norm);
};
