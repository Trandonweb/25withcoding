# Firebase project inventory and emergency containment

This inventory was found by searching the current website source. Firebase web config values (including API keys) are normally public identifiers; they are not authorization. Firestore rules and trusted server authorization determine whether data is protected.

## Projects found

| Firebase project ID | Used for | Rule file in this repository | Required action before public reopening |
|---|---|---|---|
| `points2026-f5e50` | Student profiles, roles, scores, attendance, main authentication-linked data | `firestore.rules` | Keep the currently reported deny-all production rules. Do not publish the baseline user-profile policy until tested. |
| `memo-5123c` | Saved notes / memo feature | `memo/firestore.rules` | Publish deny-all rules in the Firebase Console. Memo pages are now static maintenance notices. |
| `coby-ai-328dd` | COBY AI conversations/projects | `security-rules/coby-ai-328dd.firestore.rules` | Publish deny-all rules; AI data features will remain unavailable until ownership rules are reviewed. |
| `festivallikes` | Festival recommendation/like data; also referenced by event tools | `security-rules/festivallikes.firestore.rules` | Publish deny-all rules for the emergency test window; like/recommendation writes will be unavailable. |
| `festival2026-admin` | Festival order/kiosk data | `security-rules/festival2026-admin.firestore.rules` | Publish deny-all rules; order/kiosk features will remain unavailable. |

## Required sequence

1. In Firebase Console, open each exact project ID above and set Firestore Database → Rules to deny all reads and writes, then Publish. Confirm the project ID before publishing; never apply rules to a similarly named project by guess.
2. Keep the website's public static pages available for layout/link testing. Do not test with real student records, real scores, saved memos, AI chat history, or live orders.
3. Keep dynamic features disabled until each collection has a least-privilege ruleset and the Firebase Emulator Suite tests prove:
   - signed-out reads and writes are denied;
   - one student cannot access another student's data;
   - client-side role/profile changes cannot grant administrator privileges;
   - unauthorized score, attendance, order, memo, and conversation writes are denied.
4. Treat the files in this repository as *policy drafts only*. GitHub changes do not publish Firestore rules. No Firebase Console deployment was performed by this workflow.
5. Do not delete stored data as part of containment. Preserve it until access is controlled and the owner decides whether to retain or remove it.

## Reopening status

A static/public-site smoke test is separable from reopening the full data-backed application. The latter is not ready until the backend rules are confirmed in the Firebase Console and the protected workflows are tested. These emergency rules deliberately break dynamic features rather than expose them.
