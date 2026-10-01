
const menu=document.querySelector('.menu'),links=document.querySelector('.links');
if(menu) menu.addEventListener('click',()=>links.classList.toggle('show'));
document.querySelectorAll('.links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('show')));

window.fillDynamic=function(){
  if(typeof CONFIG==='undefined')return;
  const $=id=>document.getElementById(id);
  const bn=!!(window.getLang&&getLang()==='bn');
  const N=v=>bn?String(v).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]):String(v);
  document.querySelectorAll('[data-fee]').forEach(e=>e.textContent='৳'+N(CONFIG.fees[e.dataset.fee]));
  document.querySelectorAll('[data-price]').forEach(e=>e.textContent=bn?'ফি ৳'+N(CONFIG.fees[e.dataset.price])+' (অনুমোদনের পর)':'Fee ৳'+CONFIG.fees[e.dataset.price]+' after approval');
  document.querySelectorAll('[data-tag]').forEach(e=>{const k=e.dataset.tag;e.textContent=bn?'সিজন '+N(CONFIG.season.replace(/\D/g,''))+' · '+(k==='APPLICATION'?'আবেদন':'স্ট্যাটাস'):CONFIG.season.toUpperCase()+' · '+k});
  const mail=CONFIG.contactEmail,nm=bn?'নাসিমুল ইকবাল রউনক':CONFIG.contactName;
  document.querySelectorAll('[data-contact]').forEach(e=>{e.innerHTML=(bn?'যোগাযোগ: ':'Contact: ')+nm+(mail?' · <a href="mailto:'+mail+'">'+mail+'</a>':'')});
  if(mail&&$('mailrow')){$('mailrow').style.display='block';$('maillink').textContent=mail;$('maillink').href='mailto:'+mail}
  if($('s7fee'))$('s7fee').textContent=bn?'অনুমোদনের পর ফি: খেলোয়াড় ৳'+N(CONFIG.fees.Player)+' · ক্যাপ্টেন ৳'+N(CONFIG.fees.Captain):'Fee after approval: Player ৳'+CONFIG.fees.Player+' · Captain ৳'+CONFIG.fees.Captain;
  if($('s7k')&&Date.parse(CONFIG.opensAt)<=Date.now())$('s7k').textContent=bn?'রেজিস্ট্রেশন চলছে':'Registration is open';
};

/* ===== Subtle page skeleton ===== */
(function(){
  var sk=document.createElement('div');
  sk.className='mfl-skeleton';
  sk.innerHTML='<div class="mfl-skeleton-card"><div class="mfl-skeleton-logo"></div><div class="mfl-skeleton-line w1"></div><div class="mfl-skeleton-line w2"></div><div class="mfl-skeleton-line w3"></div></div>';
  document.body.appendChild(sk);
  window.addEventListener('load',function(){setTimeout(function(){sk.classList.add('hide');setTimeout(function(){sk.remove()},500)},220)});
})();
window.addEventListener('DOMContentLoaded',()=>{
  fillDynamic();
  const $=id=>document.getElementById(id);
  if($('s7d')&&typeof CONFIG!=='undefined'){
    const open=Date.parse(CONFIG.opensAt),p=n=>String(n).padStart(2,'0');
    (function t(){let l=open-Date.now();
      if(l<=0){$('s7units').style.display='none';fillDynamic();return}
      const d=Math.floor(l/864e5);l-=d*864e5;const h=Math.floor(l/36e5);l-=h*36e5;const m=Math.floor(l/6e4);l-=m*6e4;
      $('s7d').textContent=d;$('s7h').textContent=p(h);$('s7m').textContent=p(m);$('s7s').textContent=p(Math.floor(l/1e3));
      setTimeout(t,1000-Date.now()%1000)})();
  }
});

/* ===== Mobile bottom navigation (5 items). Shown only on phones via CSS; desktop is unchanged. ===== */
(function(){
  var ICONS={
    'index.html':'<path d="M12 3.2 4.6 8v8.6c0 1.2 1 2.2 2.2 2.2h10.4c1.2 0 2.2-1 2.2-2.2V8L12 3.2Z"/><path d="M9.4 14.2c.7.9 1.5 1.3 2.6 1.3s1.9-.4 2.6-1.3"/>',
    'teams.html':'<circle cx="9" cy="8.5" r="3.2"/><path d="M3.2 19c.4-3.3 2.7-5.2 5.8-5.2s5.4 1.9 5.8 5.2"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.6 14c2.6.1 4.1 1.7 4.4 4.3"/>',
    'schedule.html':'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14.2h2M13.5 14.2h2.5M8 17h2"/>',
    'results.html':'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4.8v1.2A3.3 3.3 0 0 0 8 10.5M16 6h3.2v1.2a3.3 3.3 0 0 1-3.2 3.3"/><path d="M12 13v4M8.6 20h6.8M9.8 17h4.4"/>',
    'about.html':'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/><circle cx="12" cy="7.8" r=".7" fill="currentColor"/>'
  };
  var order=['teams.html','schedule.html','index.html','results.html','about.html'];
  var SHORT={'about.html':['About','সম্পর্কে']};
  var nav=document.querySelector('.links'); if(!nav) return;
  var src={}; nav.querySelectorAll('a').forEach(function(a){src[a.getAttribute('href')]=a;});
  var file=(location.pathname.split('/').pop()||'index.html');
  if(/^team-\d+\.html$/.test(file)) file='teams.html';
  if(file==='scorer.html'||file==='awards.html') file='results.html';
  var bar=document.createElement('nav'); bar.className='bnav'; bar.setAttribute('aria-label','Main');
  var html='<div class="bnav-bar"></div><div class="bnav-items">';
  order.forEach(function(h){
    var a=src[h]; if(!a) return;
    var on=(h===file);
    html+='<a href="'+h+'" class="bnav-i'+(on?' on':'')+(h==='index.html'?' home-center':'')+'"'+(on?' aria-current="page"':'')+'>'+
      '<span class="bnav-ic"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[h]+'</svg></span>'+
      '<span class="bnav-t"'+(SHORT[h]?' data-bn="'+SHORT[h][1]+'"':(a.getAttribute('data-bn')?' data-bn="'+a.getAttribute('data-bn')+'"':''))+'>'+(SHORT[h]?SHORT[h][0]:a.textContent)+'</span></a>';
  });
  bar.innerHTML=html+'</div>';
  document.body.appendChild(bar);
  function place(){
    bar.classList.remove('none');
    bar.style.setProperty('--cx','50%');
  }
  place(); window.addEventListener('resize',place); window.addEventListener('load',place);
  /* Updates is not in the bottom bar, so give phones a link to it in the footer */
  var fl=document.querySelector('footer .flinks');
  if(fl&&!fl.querySelector('[href="updates.html"]')){
    var up=nav.querySelector('a[href="updates.html"]');
    var ab=document.createElement('a'); ab.href='updates.html'; ab.className='only-m';
    ab.setAttribute('data-bn',up&&up.getAttribute('data-bn')?up.getAttribute('data-bn'):'আপডেট');
    ab.textContent='Updates'; fl.insertBefore(ab,fl.firstChild);
  }
})();
