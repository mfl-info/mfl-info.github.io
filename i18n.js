/* MFL language toggle (English / বাংলা). Texts with data-bn are swapped; the choice is remembered. */
(function(){
  var BN_JS = {
"Registration has not opened yet.": "রেজিস্ট্রেশন এখনো শুরু হয়নি।",
"Applications are not open yet. Please contact the organisers (see the Contact page).": "আবেদন এখনো চালু হয়নি। অনুগ্রহ করে আয়োজকদের সঙ্গে যোগাযোগ করুন (যোগাযোগ পেজ দেখুন)।",
"Registration has not opened yet. Please try again when the countdown ends.": "রেজিস্ট্রেশন এখনো শুরু হয়নি। কাউন্টডাউন শেষ হলে আবার চেষ্টা করুন।",
"This phone number has already applied. Use your Application ID on the Status page, or contact the organisers if you lost it.": "এই ফোন নম্বর দিয়ে আগেই আবেদন করা হয়েছে। স্ট্যাটাস পেজে আপনার অ্যাপ্লিকেশন আইডি ব্যবহার করুন, হারিয়ে ফেললে আয়োজকদের সঙ্গে যোগাযোগ করুন।",
"Something went wrong. Please try again in a moment.": "কিছু একটা সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।",
"Could not send your application. Check your internet connection and try again.": "আপনার আবেদন পাঠানো যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
"This page is not open yet. Please contact the organisers.": "এই পেজ এখনো চালু হয়নি। আয়োজকদের সঙ্গে যোগাযোগ করুন।",
"No application found for this ID and phone number. Check both and try again.": "এই আইডি ও ফোন নম্বরে কোনো আবেদন পাওয়া যায়নি। দুটোই দেখে আবার চেষ্টা করুন।",
"Could not connect. Check your internet connection and try again.": "সংযোগ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
"This TrxID has already been used. Check the number, or contact the organisers.": "এই TrxID আগেই ব্যবহার হয়েছে। নম্বরটি দেখুন, অথবা আয়োজকদের সঙ্গে যোগাযোগ করুন।",
"Payment is not open for this application. Refresh your status.": "এই আবেদনের জন্য পেমেন্ট খোলা নেই। স্ট্যাটাস রিফ্রেশ করুন।",
"Could not send your payment details. Check your internet connection and try again.": "পেমেন্টের তথ্য পাঠানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।",
"Copied": "কপি হয়েছে",
"Copy ID": "আইডি কপি করুন",
"Copy": "কপি",
"Sending…": "পাঠানো হচ্ছে…",
"Send application": "আবেদন পাঠান",
"Checking…": "যাচাই হচ্ছে…",
"Check status": "স্ট্যাটাস দেখুন",
"Submitting…": "জমা হচ্ছে…",
"Submit payment": "পেমেন্ট জমা দিন"
};
  var L = (window.CONFIG && CONFIG.defaultLang) || "en";
  try { var saved = localStorage.getItem("mfl-lang"); if (saved === "en" || saved === "bn") L = saved; } catch (e) {}
  window.getLang = function(){ return L; };
  window.t = function(s){ return L === "bn" && BN_JS[s] ? BN_JS[s] : s; };
  function apply(){
    var bn = L === "bn";
    document.documentElement.lang = bn ? "bn" : "en";
    document.documentElement.classList.toggle("is-bn", bn);
    document.querySelectorAll("[data-bn]").forEach(function(el){
      if (el.__en === undefined) el.__en = el.innerHTML;
      el.innerHTML = bn ? el.getAttribute("data-bn") : el.__en;
    });
    document.querySelectorAll("[data-bn-ph]").forEach(function(el){
      if (el.__ph === undefined) el.__ph = el.getAttribute("placeholder");
      el.setAttribute("placeholder", bn ? el.getAttribute("data-bn-ph") : el.__ph);
    });
    var h = document.documentElement;
    if (h.getAttribute("data-bn-title")) {
      if (!h.__title) h.__title = document.title;
      document.title = bn ? h.getAttribute("data-bn-title") : h.__title;
    }
    var b = document.getElementById("langbtn");
    if (b) { b.textContent = bn ? "English" : "বাংলা"; b.setAttribute("aria-label", bn ? "Switch to English" : "বাংলায় দেখুন"); }
    if (window.fillDynamic) fillDynamic();
    if (window.onLang) onLang();
  }
  window.setLang = function(l){
    L = l; try { localStorage.setItem("mfl-lang", l); } catch (e) {}
    apply();
  };
  document.addEventListener("DOMContentLoaded", function(){
    var b = document.getElementById("langbtn");
    if (b) b.addEventListener("click", function(){ setLang(L === "bn" ? "en" : "bn"); });
    apply();
  });
})();
