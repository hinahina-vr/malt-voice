export const buildVoiceIndex = (voices) => {
    const map = new Map();
    Object.values(voices).flat().forEach((voice) => {
        map.set(voice.id, voice);
    });
    return map;
};

export const buildVoiceOptions = (voices) => (
    Object.values(voices).flat().map((voice) => ({
        id: voice.id,
        label: voice.label
    }))
);
