# Firebase Realtime Database Rules

1. Firebase Console -> Realtime Database -> **Rules**.
2. **Copy your current Rules somewhere safe first** (so you can go back).
3. Replace everything with the content of `database.rules.json` and press **Publish**.
4. Test with a normal account AND an admin account:
   - normal: login, home loads, My List add/remove, play a video and come back later (resume), report a link
   - admin: open the admin panel, add/edit a movie, change settings, open Users and Dashboard

What the rules do
- `settings` is readable by everyone (the login screen needs the app name/logo; it also contains `adminUIDs`, which are only IDs, not secrets). Only admins can write it.
- movies / banners / categories / socialLinks / notifications: readable by logged-in users, writable only by admins.
- `users/<uid>`: a user can read and write only their own record (My List and watch progress live there). Only an admin can change `status` (frozen/deleted). A user can remove their own record only when the admin set it to `deleted`.
- `online_users`, `broken_links`, `analytics/errors`: admin read; users can only write what the app needs.
- `pwd_resets/<email-key>`: the "Forgot password" screen runs while the user is logged OUT, so this one node must be readable/writable without login (it only stores timestamps for the 24-hour reset limit). The whole `pwd_resets` list is admin-only. Note: because the limit is counted in the browser, someone could write fake entries for an email; this is how the original design works.
- Admins are the UIDs under `settings/adminUIDs/<uid>` (as the admin panel already checks).

Not covered / assumptions
- I could not run these rules against your database. If something stops working after publishing, use the **Rules Playground** in the console or restore your old rules.
- If you use a feature that writes to a path not listed above, it will be blocked until a rule is added.
