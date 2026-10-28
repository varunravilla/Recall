# Local P4 interface observations — October 26, 2026

Environment: production frontend build served by `src/main.ts` at
`http://127.0.0.1:3189`, with disposable MongoDB and a synthetic account. This is
local interface evidence, not a check of the updated code on the public deployment.

| Check | Observation |
| --- | --- |
| Registration | A new synthetic account reached Inbox through the visible form. |
| Review entry | Saved displayed a synthetic concert inserted through the normal caption endpoint. Review opened its type, action and time fields. |
| Edit and confirmation | Changing the action to “Buy two Late Train tickets” and selecting Save reminder opened a pending saved item with the edited title. |
| Direct-page reload | Reloading the saved detail URL preserved its edited title, pending state and reminder time. |
| Completion | Mark complete returned to Saved with a Completed badge. The Done filter kept the item visible. |
| Missing item | A nonexistent saved URL showed “This item is unavailable. It may have been deleted.” and retained Back/navigation controls. |
| Phone layout | Add photos at 390 × 844 displayed its heading, picker, folder action and navigation without horizontal overflow. DOM client and scroll widths both measured 390. |
| Keyboard entry | Tab reached the Skip to content link. This is a limited check, not a complete keyboard or screen-reader audit. |

Screenshots: [completed item](p4-local-completed.jpg),
[missing-item message](p4-local-missing.jpg), [phone import screen](p4-local-phone.jpg).

No photo-picker upload or provider analysis ran in this interface check. The
caption fixture has no stored image, so this does not prove browser image
rendering. The separate photo adapter tests cover stored bytes and owner checks.
The preview database and synthetic accounts disappear when its process stops.
