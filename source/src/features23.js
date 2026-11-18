/* ================= You = your training dashboard; More = plan, settings, gear, guides and connections ================= */
var _youMenu23 = VIEWS.you;
TITLES.more = 'More';
VIEWS.more = function () {
  var h = _youMenu23();
  /* the dashboard teaser and its summary tiles live on You now */
  var box = document.createElement('div'); box.innerHTML = h;
  Array.prototype.slice.call(box.children).forEach(function (el) { if (/\b(dashhero|tiles)\b/.test(el.className || '')) el.remove(); });
  h = box.innerHTML;
  return h.replace(/<div class="pagehead"><h1>You<\/h1>/, '<div class="pagehead"><h1>More</h1><p>Your plan, settings, gear, guides and connections.</p>');
};
VIEWS.you = function () { return VIEWS.dash(); };
/* pages that used to sit under You now sit under More; the dashboard is You */
Object.keys(TABOF).forEach(function (k) { if (TABOF[k] === 'you') TABOF[k] = 'more'; });
TABOF.dash = 'you';
