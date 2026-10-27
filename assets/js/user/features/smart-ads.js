// --- ADVANCED SMART AD LOGIC ---
let smartAdCfg = { enabled: false, interval: 0, watchSeconds: 0, url: "" };
let smartAdTimerId = null;
let smartAdAttempting = false;

const checkSmartAd = () => {
    // Function exists to avoid breaking auth state trigger, but logic handled in listener now.
};

function startSmartAdTimer() {
    clearTimeout(smartAdTimerId);
    // যদি এড বন্ধ থাকে বা URL না থাকে তাহলে টাইমার চলবে না
    if(!smartAdCfg.enabled || !smartAdCfg.url || !smartAdCfg.interval) return;

    smartAdTimerId = setTimeout(() => {
        // ভিডিও প্লেয়ার বা ডাউনলোড গেট ওপেন থাকলে ওভারল্যাপ করবে না
        if(document.getElementById('dl-gate-modal')?.style.display !== 'flex') {
            showSmartAdModal();
        } else {
            // ডাউনলোড গেট ওপেন থাকলে ৫ সেকেন্ড পর আবার ট্রাই করবে
            startSmartAdTimer(); 
        }
    }, smartAdCfg.interval * 1000);
}

function showSmartAdModal() {
    const modal = document.getElementById('ad-modal');
    const statusEl = document.getElementById('smart-ad-status');
    const watchBtn = document.getElementById('watch-ad-btn');
    const tryBtn = document.getElementById('smart-ad-try-btn');
    const msgEl = document.getElementById('smart-ad-msg');

    msgEl.textContent = `Please watch a ${smartAdCfg.watchSeconds}s ad to continue enjoying our platform.`;
    statusEl.classList.add('hidden');
    watchBtn.style.display = 'block';
    tryBtn.style.display = 'none';
    smartAdAttempting = false;

    modal.classList.add('visible');
}

function completeSmartAd() {
    const modal = document.getElementById('ad-modal');
    modal.classList.remove('visible');

    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg text-sm z-50 animate-pop-up';
    toast.innerText = 'Thanks for supporting us!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    // সফলভাবে দেখা শেষ হলে আবার নতুন করে রিকারিং টাইমার শুরু হবে
    startSmartAdTimer();
}

document.getElementById('watch-ad-btn').addEventListener('click', attemptSmartAd);
document.getElementById('smart-ad-try-btn').addEventListener('click', attemptSmartAd);

function attemptSmartAd() {
    if(smartAdAttempting) return;
    smartAdAttempting = true;

    const statusEl = document.getElementById('smart-ad-status');
    const watchBtn = document.getElementById('watch-ad-btn');
    const tryBtn = document.getElementById('smart-ad-try-btn');

    statusEl.classList.remove('hidden');
    statusEl.textContent = `Watching... stay ${smartAdCfg.watchSeconds}s`;
    statusEl.className = "text-xs text-yellow-400 font-bold mb-4 block";
    watchBtn.style.display = 'none';
    tryBtn.style.display = 'none';

    let attemptStartTime = Date.now();
    let hasLeftPage = false;

    const checkCompletion = () => {
        const elapsed = Date.now() - attemptStartTime;
        const needMs = smartAdCfg.watchSeconds * 1000;

        if (elapsed >= (needMs - 500)) {
            cleanup();
            completeSmartAd();
        } else {
            cleanup();
            smartAdAttempting = false;
            statusEl.textContent = `Returned early! Watched ${Math.floor(elapsed/1000)}s / ${smartAdCfg.watchSeconds}s.`;
            statusEl.className = "text-xs text-red-400 font-bold mb-4 block";
            tryBtn.style.display = 'block';
        }
    };

    const onVisChange = () => {
        if (document.hidden) hasLeftPage = true;
        else if (hasLeftPage) checkCompletion();
    };

    const onFocus = () => {
        if (hasLeftPage && !document.hidden) checkCompletion();
    };

    const onBlur = () => {
        hasLeftPage = true;
    };

    const cleanup = () => {
        document.removeEventListener('visibilitychange', onVisChange);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('blur', onBlur);
    };

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    const popup = window.open(smartAdCfg.url, '_blank');

    if(!popup){
        cleanup();
        smartAdAttempting = false;
        statusEl.textContent = 'Popup blocked! Please allow popups.';
        statusEl.className = "text-xs text-red-400 font-bold mb-4 block";
        tryBtn.style.display = 'block';
        return;
    }

    if (document.hidden || !document.hasFocus()) {
        hasLeftPage = true;
    }

    setTimeout(() => {
        if(smartAdAttempting){
            cleanup();
            smartAdAttempting = false;
            statusEl.textContent = 'Ad session timed out. Try Again.';
            statusEl.className = "text-xs text-red-400 font-bold mb-4 block";
            tryBtn.style.display = 'block';
        }
    }, Math.max(60000, smartAdCfg.watchSeconds * 5000));
}
