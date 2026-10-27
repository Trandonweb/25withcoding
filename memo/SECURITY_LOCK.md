# Memo feature emergency lock

The five browser pages under `memo/` have been replaced with a static maintenance notice. They no longer initialize Firebase, query notes, or contain the former hard-coded master key. The previous versions remain in Git history.

**Important:** this UI change does not secure the Firebase backend by itself. The memo feature uses a separate Firebase project, `memo-5123c`. Its rules must be set to deny all reads and writes in Firebase Console (Firestore Database → Rules), then published. The file `memo/firestore.rules` is an emergency deny-all policy for that project only. Confirm the project ID before applying it. Do not deploy this file to `points2026-f5e50` by mistake.

Do not restore memo access until a proper authentication/authorization design and rules tests exist. The former client-side master key was not a secure access control.
