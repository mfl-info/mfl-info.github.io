MFL Website - Season 7 registration + Season 6 archive
Open index.html after extracting the ZIP.

Pages: Home | Team | Schedule | Result | Updates | About | FAQ | Contact (+ Rules, Register, Status)
Season 6 pages (Team, Schedule, Result, Scorers, Awards) are the archive. Home shows Season 7.

THINGS TO SET (config.js)
- contactEmail: put the MFL email here when it is ready. It then appears on Contact page and in the footer.
- opensAt, fees, scriptUrl: registration settings (keep fees the same as the Apps Script FEES).

BEFORE YOU PUBLISH
- Facebook preview needs your real website address. Run:  python3 set-site-url.py https://your-site-address
  (This fills the og:image link in every page. assets/og-image.png is the preview picture.)
- After publishing, paste the link in the Facebook Sharing Debugger to refresh the preview.

AGE LIMIT: 12 to 25. The form checks this in register.html. If your Apps Script also checks age, change it there too.
STILL TO ANNOUNCE (shown as "to be announced" on Rules / FAQ): closing date, refund policy.

LANGUAGE BUTTON (English / Bangla)
- The button in the footer (bottom of every page) switches the whole site. It is not in the top menu. The visitor's choice is remembered on their phone.
- config.js: defaultLang "en" (English first) or "bn" (Bangla first).
- Bangla texts live in the data-bn="..." attribute of each element (and in i18n.js for messages made by JavaScript).
- Names of teams and players stay in English on purpose. Season 6 news items are translated; team profile pages are only partly translated.

LOGOS
- assets/mfl-logo.png = new MFL logo (transparent background), used in the top bar of every page.
- assets/sponsor-city-cosmetics.png and assets/sponsor-northbyte.png = sponsor tiles on Home and About.
- Old MFL-6 logo files are still in assets/ (not used on pages now).

LOGO ANIMATION
- The logo (top bar and Home hero) plays a 7-second loop: hold, light flash, shrink to a point, burst back. It is in style.css (search "logoloop"). To stop it, delete the line starting ".logo-anim,.brand-logo{animation:...". It is turned off automatically for visitors who set "reduce motion" on their phone.

Player Profiles: Season 6 lists all 56 squad nicknames. Opening a profile card shows both the player's full name and nickname.

PLAYER CARDS
- A player card link carries ONLY the player id, e.g. id.html?pid=MFL-S6-001. Name, goals, roles and team are read from the players list in mfl-data.js, so a link cannot be edited to show made-up details.
- To add or change a player, edit the "players" list in mfl-data.js. Photos go in assets/players/<playerId>.jpg.
