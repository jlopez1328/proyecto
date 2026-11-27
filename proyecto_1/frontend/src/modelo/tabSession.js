// Only held in the current document's memory; never persisted in browser storage.
let currentKey;
export function tabSessionKey() {
  currentKey ||= crypto.randomUUID();
  return currentKey;
}
export function discardTabSession() {currentKey=undefined;}
window.addEventListener('pagehide',discardTabSession);
window.addEventListener('pageshow',event=>{
  if(event.persisted){
    discardTabSession();
    window.dispatchEvent(new Event('session-expired'));
  }
});
