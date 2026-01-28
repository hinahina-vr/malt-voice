import React from 'react';

const FooterControls = ({ onShare, onReset }) => {
    return (
        <footer className="footer-controls">
            <button className="footer-btn share-btn" onClick={onShare}>
                この設定をXで共有
            </button>
            <button className="footer-btn reset-btn" onClick={onReset}>
                RESET
            </button>
        </footer>
    );
};

export default FooterControls;
