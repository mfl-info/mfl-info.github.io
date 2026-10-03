MFL Season 7 registration backend notes

1. Registration capacity
- Total: 56
- Captains: 8
- Players: 40
- Goalkeepers: 8
- Player and Goalkeeper fee: same amount

2. Important backend step
The public website now sends Goalkeeper as a registration type. Your Google Apps Script must also accept this value and apply the same fee as Player. The Apps Script should enforce the 8/40/8 limits server-side; browser limits alone are not secure.

3. Sheet summary
The Registration Summary page calls:
?action=summary&season=Season%207
and expects JSON like:
{"ok":true,"total":12,"approved":8,"paid":6,"confirmed":5}
If your current Apps Script does not provide this action, add it there. The page otherwise shows dashes rather than inventing numbers.

4. Weekly backup
A static GitHub Pages site cannot create a scheduled Google Sheet backup by itself. Use a Google Apps Script time-driven trigger once a week. Recommended flow:
- Copy the registration Sheet to a dated backup spreadsheet or export it to Drive.
- Trigger: Time-driven -> Week timer -> choose the day/time.
- Keep at least the last 4 weekly copies.
- Restrict backup access to the MFL management account.

5. Google Search
sitemap.xml and robots.txt are included. In Google Search Console, add https://mfl-info.github.io/ and submit:
https://mfl-info.github.io/sitemap.xml
Search Console verification/submission requires the site owner's Google account and cannot be completed from a static ZIP alone.
