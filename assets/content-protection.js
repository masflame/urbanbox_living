(function () {
  'use strict';

  function isMobileOrTouchDevice() {
    var ua = navigator.userAgent || navigator.vendor || window.opera || '';
    var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    var hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return mobileRegex.test(ua) || hasTouch || coarsePointer;
  }

  // Only protect desktop. Do nothing on mobile/touch devices.
  if (isMobileOrTouchDevice()) {
    return;
  }

  function blockEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  // Disable context menu, drag, text selection, and copy actions.
  document.addEventListener('contextmenu', blockEvent, { capture: true });
  document.addEventListener('dragstart', blockEvent, { capture: true });
  document.addEventListener('selectstart', blockEvent, { capture: true });
  document.addEventListener('copy', blockEvent, { capture: true });
  document.addEventListener('cut', blockEvent, { capture: true });

  // Block common key combos used for viewing source/devtools/saving/printing.

  document.addEventListener(
    'keydown',
    function (event) {
      var key = (event.key || '').toLowerCase();
      var ctrlOrCmd = event.ctrlKey || event.metaKey;
      var blocked = false;

      if (event.key === 'F12') blocked = true;
      if (ctrlOrCmd && event.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k')) blocked = true;
      if (ctrlOrCmd && (key === 'u' || key === 's' || key === 'p' || key === 'a' || key === 'c' || key === 'x')) blocked = true;

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );

  // Optional devtools detection heuristic to hide content when opened.
  var threshold = 160;
  var warned = false;

  function lockPageIfDevtoolsOpen() {
    var widthGap = window.outerWidth - window.innerWidth;
    var heightGap = window.outerHeight - window.innerHeight;
    var devtoolsOpen = widthGap > threshold || heightGap > threshold;

    if (devtoolsOpen) {
      if (!warned) {
        warned = true;
        document.documentElement.innerHTML = '<head><title>Protected</title></head><body style="margin:0;background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;letter-spacing:.08em;text-transform:uppercase;">Protected Content</body>';
      }
    }
  }

  setInterval(lockPageIfDevtoolsOpen, 1000);
})();
