# Calendar content (admin)

Visitors never see this note on the site.

## Add / remove earnings watchlist companies

Edit `earnings-watchlist.json`, commit, deploy (or wait for next briefing-window fetch).

`status: "pre-ipo"` keeps the name on the list without inventing a report date.
Fixtures are overwritten by `node scripts/fetch-event-calendar.mjs`.
