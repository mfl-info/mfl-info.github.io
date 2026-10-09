/* ===========================================================
   EDIT HERE: the only file you need to change for registration.
   =========================================================== */
const CONFIG = {
  defaultLang:  "en",                          // "en" = English first, "bn" = Bangla first. Visitors can switch with the button.
  contactName:  "Nasemul Iqbal Rownok",
  contactEmail: "mfl.official2021@gmail.com",                            // put the MFL email here when it is ready, e.g. "mfl@gmail.com". Leave empty to hide it.
  season:    "Season 7",                       // shown on the pages
  fees:      { Player: 280, Goalkeeper: 280, Captain: 700 },
  capacity:  { Captain: 8, Player: 40, Goalkeeper: 8, Total: 56 },    // shown on the form. Keep same as the Apps Script FEES.
  opensAt:   "2026-12-16T00:00:00+06:00",     // registration opens 16 Dec 2026, 12:00 AM (Bangladesh).
  closesAt:  "",                           // Optional: add the official closing date/time when confirmed.
  scriptUrl: "https://script.google.com/macros/s/AKfycbz8O1pvB2wqZgU8mb_LTNxCXUIBxUAYpsbfIRMunRImxNT4v4Q-dhOexgYk1pBSBOdg/exec"                                  
};
