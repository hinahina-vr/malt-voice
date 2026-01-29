export const getAppThemeStyle = (character) => ({
    '--primary-color': character === 'hinahina'
        ? 'var(--hina-color)'
        : character === 'kai'
            ? 'var(--kai-color)'
            : 'var(--others-color)',
    '--theme-bg': character === 'hinahina'
        ? 'rgba(255, 105, 180, 0.05)'
        : character === 'kai'
            ? 'rgba(92, 219, 211, 0.05)'
            : 'rgba(255, 215, 0, 0.05)'
});
