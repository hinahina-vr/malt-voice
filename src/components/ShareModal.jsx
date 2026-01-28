import React from 'react';

const ShareModal = ({ open, onPlay }) => {
    if (!open) return null;

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="modal-content" style={{ background: '#222', padding: '2rem', borderRadius: '10px', textAlign: 'center', border: '1px solid #444', maxWidth: '400px', width: '90%' }}>
                <img src="/images/loading_bg.jpg" alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #444' }} />
                <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.2rem' }}>モルトバトルサンプラーへようこそ！</h2>
                <div style={{ color: '#888', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        音が鳴るけどいい？
                    </div>
                </div>
                <button
                    onClick={onPlay}
                    style={{
                        background: 'var(--primary-color)',
                        color: '#000',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '1rem 3rem',
                        cursor: 'pointer',
                        boxShadow: '0 0 20px var(--primary-color)'
                    }}
                >
                    エーヤオ
                </button>
            </div>
        </div>
    );
};

export default ShareModal;
