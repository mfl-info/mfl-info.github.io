MFL ADMIN PANEL - SETUP AND USE
===============================

A. ONE-TIME SETUP (about 10 minutes)
1. Google Sheet > Extensions > Apps Script.
   Select ALL the old code, delete it, paste the whole new  apps-script-code.gs , press Ctrl+S.
2. Set your admin password (it is kept ONLY here, never in the website files):
   Left menu > Project Settings (gear) > "Script properties" > Add script property
   Property: ADMIN_PASSWORD     Value: (your secret password, at least 6 characters)  > Save.
3. In the function list at the top choose  setup  > Run. Allow the permissions (Advanced > Go to ... > Allow).
   It creates the tabs: Applications, Offline, Content, Summary, and the weekly backup.
4. Deploy > Manage deployments > pencil > Version: New version > Deploy.
   (First time ever? Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone > Deploy.)
   Copy the Web app URL that ends with /exec.
5. Open  config.js  and paste that link between the quotes:   scriptUrl: "https://script.google.com/macros/s/.../exec"
6. Upload the website files to GitHub (the zip contents, with index.html at the top, NOT inside another folder).
   NEVER upload apps-script-code.gs to GitHub (it holds your payment number).

B. LOG IN
Open  https://mfl-info.github.io/admin.html  and type the password. (8 wrong tries = locked for 15 minutes. Login lasts 6 hours.)

C. WHAT EACH TAB DOES
Overview      Online / Offline / Combined / Remaining and the count per type. Public visitors only see the COMBINED number.
Applications  Online applicants. Call them, then set Approved / Rejected. When the TrxID matches your bKash/Nagad SMS set Confirmed.
              A Rejected application frees its place. "Download CSV" saves the list.
Offline       Add cash / in-person registrations (name, type, payment, status). Only "Confirmed" ones use a place.
              Online + offline share the same 56 places (8 Captains, 40 Players, 8 Goalkeepers). It refuses to go over the limit.
News          Announcements shown on the Updates page.
Season 7      Teams, Schedule, Results (with scorers and Man of the Match), Awards. Empty = "Coming soon / To be announced".
              Man of the Match shows "Not published" until you type a name.
Media         Gallery photos (upload from your phone or paste a link) and highlight videos.
Edit pages    Open any page, press the gold "Edit text" button at the bottom-left, click any text, type, press Save.
              Switch the site to Bangla first if you want to change the Bangla text. "Undo my edits" restores the original text of that page.
Settings      Registration mode: Automatic (uses the opening/closing time) / Open now / Locked. Opening time, closing time,
              and a notice bar that shows on top of every page.

D. BEFORE THE REAL LAUNCH
- Run the function  clearTestData  once in Apps Script to delete test applications and test offline entries.
- Settings: choose  Automatic  and check the opening time is 2026-12-16 00:00. The closing time stays empty until you decide it.

E. IF SOMETHING GOES WRONG
- "Admin password is not set"      -> step A2 (property name must be exactly ADMIN_PASSWORD).
- "No connection" on the login page -> scriptUrl in config.js is empty or old; Deploy a New version (A4).
- You changed the code but nothing changed -> Deploy > Manage deployments > pencil > New version > Deploy.
- A text edit does not show          -> refresh once. If the page structure was changed later, that old edit is skipped on purpose.
- Photo upload fails                  -> choose a JPG/PNG; the panel shrinks it automatically. Photos are stored in your Google Drive folder "MFL Uploads".
- Forgot the password                 -> Apps Script > Project Settings > Script properties > change ADMIN_PASSWORD.
