(function(){
  const btn = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if(!btn || !nav) return;

  function setExpanded(isOpen){
    btn.setAttribute('aria-expanded', String(isOpen));
    nav.classList.toggle('is-open', isOpen);
  }

  btn.addEventListener('click', function(){
    const open = btn.getAttribute('aria-expanded') === 'true';
    setExpanded(!open);
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') setExpanded(false);
  });

  document.addEventListener('click', function(e){
    if(!nav.classList.contains('is-open')) return;
    if(nav.contains(e.target) || btn.contains(e.target)) return;
    setExpanded(false);
  });
})();
