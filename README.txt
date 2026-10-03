MFL Website - Season 7 registration + Season 6 archive
Open index.html after extracting the ZIP.

Pages: Home | Team | Schedule | Result | Updates | About | FAQ | Contact (+ Rules, Register, Status)
Season 6 pages (Team, Schedule, Result, Scorers, Awards) are the archive. Home shows Season 7.

THINGS TO SET (config.js)
- contactEmail: put the MFL email here when it is ready. It then appears on Contact page and in the footer.
- opensAt, fees, scriptUrl: registration settings (keep fees the same as the Apps Script FEES).

BEFORE YOU PUBLISH
- The Facebook preview address (https://mfl-info.github.io) is already filled in on every page. If you ever change the website address, find and replace it in all .html files. assets/og-image.png is the preview picture.
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

IMAGES
- Images are already compressed (textures and photos as JPG, the logo as WebP). Keep new player photos under about 150 KB each (720 px wide is enough).

MOBILE BOTTOM NAVIGATION (phones and tablets up to 900 px wide; desktop is not changed)
- Five tabs in this order: Team, Schedule, Home (middle), Result, About. Updates is a link in the footer on mobile.
- The curved notch and the round gold button follow the active tab and slide when you open another page.
- Pages that are not one of the five (Register, FAQ, Rules ...) show a plain bar with no button.
- All of the code is in ONE block at the end of style.css ("Mobile bottom navigation") and ONE block in script.js. The old stacked fixes were removed.
- sw.js cache name was changed to mfl-s7-v4 so phones load the new files. Change the number again every time you edit style.css or script.js.

LEADERBOARD FONT
- Player names, ranks and goals on scorer.html use the Anton font (loaded from Google Fonts on that page only). Fallback if it cannot load: Bebas Neue, Impact. To change the font, edit the "Leaderboard" block at the end of style.css and the Anton link in scorer.html.

GALLERY (gallery.html)
- SEASON LOGOS shows Season 6 (red background version), then Seasons 5, 4, 3, 2, 1. MFL MEDIA & SPONSORS keeps only the sponsors.
- Season 6 on the Results page still uses assets/mfl-season6-main-transparent.png (transparent logo).
- Season logos are WebP files in assets/ (mfl-season1-logo.webp ... mfl-season5-logo.webp).

GOOGLE SEARCH
- Every page has a canonical link, sitemap.xml lists all pages, robots.txt allows search engines.
- In Google Search Console (search.google.com/search-console) add https://mfl-info.github.io/ with the "HTML tag" method, then paste your code in index.html where it says PASTE_CODE_HERE (and remove the comment marks), upload, and press Verify. Then submit https://mfl-info.github.io/sitemap.xml
