# סונו גאצ'ה

Tomer's protocol picker for Torah-to-Suno songs. Paste the verses, pull a card (or pick one),
and the page opens Telegram with a ready message to Hermes. Static site — no server.

- `protocols.js` — the cards (texts, meters, Suno settings). Add a protocol here.
- `style.css` — one colour world and decor per protocol (`[data-t=Pn]` blocks).
- `app.js` — machine, reveal, message building (splits drafts longer than Telegram allows).
