'use strict';
// No input reads, payloads, persistence, endpoint, Auth or authorization simulation.
(function(){
 for(const form of document.querySelectorAll('form[data-qa-plan]')){
  form.addEventListener('submit',function(event){
   event.preventDefault();
   const status=form.querySelector('[data-qa-status]');
   if(status)status.textContent='Operación retenida. No se enviaron datos. Si una operación anterior quedó UNKNOWN, requiere conciliación independiente; no reintentes.';
  });
 }
})();
