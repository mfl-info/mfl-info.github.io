/* ===========================================================
   EDIT HERE: the only file you need to change for registration.
   =========================================================== */
const CONFIG = {
  defaultLang:  "en",                          // "en" = English first, "bn" = Bangla first. Visitors can switch with the button.
  contactName:  "Nasemul Iqbal Rownok",
  contactEmail: "mfl.official2021@gmail.com",                            // put the MFL email here when it is ready, e.g. "mfl@gmail.com". Leave empty to hide it.
  season:    "Season 7",                       // shown on the pages
  fees:      { Player: 220, Goalkeeper: 220, Captain: 700 },
  capacity:  { Captain: 8, Player: 48, Goalkeeper: 8, Total: 64 },    // shown on the form. Keep same as the Apps Script FEES.
  opensAt:   "2026-12-01T00:00:00+06:00",     // registration opens 1 Dec 2026, 12:00 AM (Bangladesh).
  closesAt:  "2027-01-23T23:59:00+06:00",   // registration closes 23 Jan 2027, 11:59 PM (Bangladesh), or earlier if all 64 slots fill.
  scriptUrl: "https://script.google.com/macros/s/AKfycbwYUql-CUGIuwhD8M0q3T27xwsN0kG20pbu77RTQIlnowFlSMrBkW4YCdrx89HNNFgAOA/exec"                               
};
