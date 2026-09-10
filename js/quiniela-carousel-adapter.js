(function () {
  "use strict";

  var feed = window.PMX_QUINIELA_CAROUSEL;
  var root = document.getElementById("editorial-carousel");
  var position = document.getElementById("carousel-position");
  var dots = document.getElementById("carousel-dots");

  if (!feed || !Array.isArray(feed.pages) || !feed.pages.length || !root) return;

  var fallbackNodes = Array.from(root.children).map(function (node) { return node.cloneNode(true); });
  var expected = feed.pages.length;
  var restored = false;

  function restoreFallback() {
    if (restored) return;
    restored = true;
    root.replaceChildren.apply(root, fallbackNodes);
    if (position) position.textContent = "1 / " + fallbackNodes.length;
    if (dots) {
      dots.replaceChildren();
      fallbackNodes.forEach(function (_, index) {
        var dot = document.createElement("span");
        dot.className = "carousel-dot" + (index === 0 ? " is-active" : "");
        dots.appendChild(dot);
      });
    }
  }

  function mountExact() {
    root.replaceChildren();
    feed.pages.forEach(function (src, index) {
      var slide = document.createElement("article");
      slide.className = "editorial-slide editorial-slide--exact";
      slide.setAttribute("aria-label", "Quiniela Week 1 · lámina " + (index + 1) + " de " + expected);

      var img = document.createElement("img");
      img.className = "editorial-slide__exact-image";
      img.src = src;
      img.alt = "Quiniela Week 1 · lámina " + (index + 1);
      img.loading = index < 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("error", restoreFallback, { once: true });

      slide.appendChild(img);
      root.appendChild(slide);
    });

    if (position) position.textContent = "1 / " + expected;
    if (dots) {
      dots.replaceChildren();
      feed.pages.forEach(function (_, index) {
        var dot = document.createElement("span");
        dot.className = "carousel-dot" + (index === 0 ? " is-active" : "");
        dots.appendChild(dot);
      });
    }
  }

  var probe = new Image();
  probe.onload = mountExact;
  probe.onerror = function () { /* keep dynamic fallback already rendered */ };
  probe.src = feed.pages[0];
})();
