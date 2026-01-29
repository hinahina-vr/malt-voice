import { useEffect } from 'react';
import { decodeSettings } from '../utils/settingsCodec';

export const useSettingsRestore = ({ voices, onApplySettings, onRestoreTriggers }) => {
    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get('p');
        if (!param) return;

        const decoded = decodeSettings(param, voices);
        if (!decoded.ok) {
            if (decoded.version !== undefined) {
                console.warn('Unknown settings version or old URL', decoded.version);
                alert('URLの形式が古いため読み込めませんでした。\\n新しいURLを作成してください。');
            } else if (decoded.error) {
                console.error('Failed to decode settings', decoded.error);
            }
            return;
        }

        onApplySettings(decoded);

        if (decoded.restored.length > 0) {
            onRestoreTriggers(decoded.restored);
        }

        window.history.replaceState({}, '', window.location.pathname);
    }, [voices, onApplySettings, onRestoreTriggers]);
};
