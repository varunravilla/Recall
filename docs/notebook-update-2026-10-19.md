## P3 — October 19, 2026: import scope and validation

These are factual implementation notes, not a personal reflection or claimed user
study. They supplement the October 18 notebook entry.

A date-only local filter would reduce Gemini calls but also discard restaurant
menus, products and event posters without dates. The selected compromise is an
English text filter on smaller previews: text candidates reach Gemini, blank OCR
skips, and Include anyway/disabling the filter covers misses. This keeps the
filter's job separate from AI interpretation. The first use downloads OCR assets;
whole-library performance has not been benchmarked.

A useful screenshot does not require a reminder. Undated imports are saved as
Found, keeping their image and caption but creating no tracking/reminder and
inventing no date. Query contracts explicitly permit null dates. Known expired
items still skip. A supplied date that cannot be resolved, including ambiguous
fall-back or nonexistent spring-forward times, is rejected rather than silently
becoming an undated find. Food is represented as a place or product.

The visual revision reduces repeated copy and adds image cards, search/filters,
and deletion confirmation. Deleting removes the image and all interpretation,
tracking and reminder histories. A regression exposed cleanup firing even after
an owner refusal; reactions now require successful action responses. Tests verify
another account's failed delete leaves the records unchanged.

The final repository validation passes design, generation, backend and Vue checks,
production build, and 47 tests with 337 assertions. Added regressions cover logout
during inference, absent dates, invalid supplied times, ownership and deletion
histories. Real English OCR passed the synthetic concert and original review
sketch. These are fixture/API checks, not a complete browser or deployment test.

Earlier browser work covered registration, Inbox and the import layout. File-upload
permission was declined; no completed upload journey, mobile/zoom/screen-reader
verification or deployed-app result is claimed. The owner excluded slides,
recording, commits and deployment from this repository completion task. A detailed
interface checklist remains in the public repository for recording actual results.
