// SAFETY SCRIPT: hide splash immediately so it never gets stuck
(function() {
  var s = document.getElementById('splash');
  if (s) s.style.display = 'none';
  setTimeout(function() {
    var s3 = document.getElementById('splash');
    if (s3) s3.style.display = 'none';
  }, 500);
})();
// Error overlay — toggle with localStorage 'bs_debug' = '1' in console
if (localStorage.getItem('bs_debug') === '1') {
  window.onerror = function(msg, src, line, col, err) {
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;padding:10px;font-size:12px;font-family:monospace;z-index:99999;max-height:60vh;overflow:auto;white-space:pre-wrap';
      d.textContent = 'JS ERROR: ' + msg + ' @ line ' + line + ':' + col;
      if (document.body) document.body.appendChild(d);
    } catch(_) {}
    return false;
  };
}
