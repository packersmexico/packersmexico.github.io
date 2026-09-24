(function () {
  "use strict";

  var config = window.PMX_CONFIG;
  var season = window.PMX_SEASON_2026;
  var analytics = window.PMX_ANALYTICS;
  var route = document.body && document.body.dataset ? document.body.dataset.shareRoute : "";
  var fallback = document.getElementById("share-fallback");
  var status = document.getElementById("share-status");

  var meta = Object.freeze({
    "partido": Object.freeze({ destinationType: "hub", ctaId: "share_partido" }),
    "asistencia": Object.freeze({ destinationType: "registration", ctaId: "share_asistencia" }),
    "como-llegar": Object.freeze({ destinationType: "maps", ctaId: "share_como_llegar" }),
    "quiniela": Object.freeze({ destinationType: "editorial", ctaId: "share_quiniela" })
  });

  function hubUrl() {
    return season && season.hubUrl ? season.hubUrl : "";
  }

  function destinationFor(name) {
    if (!config) return "";
    if (name === "partido") return hubUrl();
    if (name === "asistencia") return config.registrationUrl || "";
    if (name === "como-llegar") return config.mapsUrl || "";
    if (name === "quiniela") {
      if (config.quiniela && config.quiniela.enabled && config.quiniela.url) return config.quiniela.url;
      return hubUrl();
    }
    return "";
  }

  function attribution() {
    if (analytics && typeof analytics.getAttribution === "function") return analytics.getAttribution();
    var search = new URLSearchParams(window.location.search);
    return ["utm_source", "utm_medium", "utm_campaign", "utm_content"].reduce(function (result, name) {
      var value = search.get(name);
      if (value) result[name] = value;
      return result;
    }, {});
  }

  function withAttribution(destination) {
    var url = new URL(destination, window.location.origin);
    var values = attribution();
    Object.keys(values).forEach(function (name) {
      if (values[name] && !url.searchParams.has(name)) url.searchParams.set(name, values[name]);
    });
    return url.href;
  }

  function fail(message) {
    if (status) status.textContent = message || "No fue posible resolver el destino vigente.";
    var hub = hubUrl();
    if (fallback && hub) {
      fallback.href = hub;
      fallback.hidden = false;
      fallback.textContent = "ABRIR DIGITAL HUB";
    }
  }

  var routeMeta = meta[route];
  var destination = destinationFor(route);

  if (!routeMeta || !destination) {
    fail("Destino temporalmente no disponible.");
    return;
  }

  var finalUrl;
  try {
    finalUrl = withAttribution(destination);
  } catch (error) {
    fail("Destino temporalmente no disponible.");
    return;
  }

  var currentUrl = new URL(window.location.href);
  var resolvedUrl = new URL(finalUrl);
  if (currentUrl.origin === resolvedUrl.origin && currentUrl.pathname === resolvedUrl.pathname) {
    fail("La ruta vigente requiere revisión.");
    return;
  }

  if (fallback) {
    fallback.href = finalUrl;
    fallback.hidden = false;
  }
  if (status) status.textContent = "ABRIENDO DESTINO…";

  function navigate() {
    window.location.replace(finalUrl);
  }

  if (analytics && typeof analytics.trackThen === "function") {
    analytics.trackThen("SHARE_REDIRECT", {
      cta_id: routeMeta.ctaId,
      destination_type: routeMeta.destinationType,
      destination_url: finalUrl
    }, navigate, 900);
  } else {
    navigate();
  }
})();
