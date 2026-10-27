// --- LIVE USERS PRESENCE SYSTEM ---
function setupPresence(user) {
    const onlineRef = db.ref('online_users/' + user.uid);
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            onlineRef.onDisconnect().remove();
            onlineRef.set({
                name: user.displayName || "User",
                last_seen: Date.now()
            });
            if(window.__presenceInterval) clearInterval(window.__presenceInterval);
            window.__presenceInterval = setInterval(()=>{
                onlineRef.update({ last_seen: Date.now() });
                if(user && user.uid) db.ref('users/' + user.uid).update({ last_seen: Date.now() });
            }, 30000);
        }
    });
}
