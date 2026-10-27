# Security reopening checklist

## Current posture
- Keep the live Firestore rules deny-all until this policy has been reviewed and tested in a separate Firebase project.
- Adding `firestore.rules` to GitHub does **not** publish it to Firebase. Do not copy/paste it into production as a shortcut.
- This initial policy intentionally permits only a signed-in student to read their own `users/{studentId}` document and update its `settings` field. Admin access requires the trusted Firebase Auth custom claim `admin: true`.
- All other collections remain denied by default. Existing score, AI, chat, storage, and admin workflows are expected to remain unavailable until individually migrated.

## Before a public test
1. Create a separate Firebase project for testing. Do not use production data.
2. Create test-only Authentication accounts; do not reuse any previously exposed password.
3. Add trusted server-side provisioning for accounts and custom claims. Never set admin claims from browser code.
4. Test rules with the Firebase Emulator Suite or Rules Playground:
   - signed-out requests are denied;
   - one student cannot read another student's profile;
   - a student cannot change `role`, `name`, password fields, scores, or any other field besides `settings`;
   - a student cannot list all users;
   - only a trusted admin claim can list/manage users;
   - all unreviewed collections remain denied.
5. Migrate each feature to token-authenticated requests and its own least-privilege rules or trusted server endpoint.
6. Search the whole repository for plaintext password reads/writes and localStorage-only authorization.
7. Verify sign-in, sign-out, password change, account recovery, rate limiting, and unauthorized access cases.
8. Publish only the tested rules to the test project, then run a limited test with non-sensitive data.
9. Keep production closed until the same checks pass and rollback steps are ready.

## Important limitation
The current browser-only app has no trusted Admin SDK endpoint for creating users or assigning admin claims. Until that exists, admin and other collection access should remain blocked; do not weaken rules to make the UI appear to work.
