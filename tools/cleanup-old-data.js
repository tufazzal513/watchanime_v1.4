/* ONE-TIME CLEANUP of data that belonged to removed systems (comments, downloads, ads, free/VIP server).
 * HOW TO USE
 *  1. Deploy the new version first, open the ADMIN PANEL and log in as admin.
 *  2. Open the browser console (F12 -> Console), paste this whole file, press Enter.
 *  3. Run  cleanupOldData()        -> only SHOWS what would be deleted (dry run)
 *  4. Run  cleanupOldData(true)    -> really deletes it. This cannot be undone.
 * Movies that only had a VIP/second link keep it: it is moved to the single Video Link first.
 */
window.cleanupOldData = async function (really) {
    const updates = {};
    const log = [];
    const nodes = ['comments', 'downloadLinks', 'analytics/downloadGate'];
    const keys = ['dlGateEnabled', 'dlAdLimit', 'dlAdSeconds', 'dlAdUrl',
                  'smartAdEnabled', 'adTimer', 'smartAdWatchSeconds', 'adUrl',
                  'commentModEnabled', 'commentDislikeThreshold'];
    nodes.forEach(n => { updates[n] = null; log.push('delete node: ' + n); });
    keys.forEach(k => { updates['settings/' + k] = null; log.push('delete setting: settings/' + k); });

    const snap = await db.ref('movies').once('value');
    const movies = snap.val() || {};
    let moved = 0, nulled = 0;
    Object.entries(movies).forEach(([id, m]) => {
        if (m.server2 !== undefined) { if (!m.server1 && m.server2) { updates[`movies/${id}/server1`] = m.server2; moved++; } updates[`movies/${id}/server2`] = null; nulled++; }
        if (m.allowDownload !== undefined) { updates[`movies/${id}/allowDownload`] = null; nulled++; }
        Object.entries(m.seasons || {}).forEach(([sk, eps]) => {
            (eps || []).forEach((e, i) => {
                const base = `movies/${id}/seasons/${sk}/${i}`;
                if (e.server2 !== undefined) { if (!e.server1 && e.server2) { updates[base + '/server1'] = e.server2; moved++; } updates[base + '/server2'] = null; nulled++; }
                if (e.allowDownload !== undefined) { updates[base + '/allowDownload'] = null; nulled++; }
            });
        });
    });
    log.push(`movie/episode fields to remove: ${nulled}, second links moved to Video Link: ${moved}`);
    console.log(log.join('\n'));
    if (!really) { console.log('DRY RUN only. Run cleanupOldData(true) to delete for real.'); return; }
    await db.ref().update(updates);
    console.log('Done. Old data removed.');
};
console.log('Loaded. Run cleanupOldData() first (dry run).');
