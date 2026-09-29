
const menu=document.querySelector('.menu'),links=document.querySelector('.links');
if(menu) menu.addEventListener('click',()=>links.classList.toggle('show'));
document.querySelectorAll('.links a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('show')));
