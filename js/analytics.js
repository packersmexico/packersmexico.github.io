(function () {
  "use strict";

  var config = window.PMX_CONFIG;
  var analyticsConfig = config && config.analytics ? config.analytics : {};
  var measurementId = analyticsConfig.GA4_MEASUREMENT_ID || "";
  var storageKey = "pmx_hub_attribution_v1";
  var utmNames = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  var allowedEvents = Object.freeze([
    "HUB_VIEW",
    "CLICK_REGISTRO",
    "CLICK_MAPS",
    "CLICK_PROMO",
    "CLICK_CALENDAR",
    "CLICK_GOPACKGO",
    "CLICK_SOCIAL",
    "QR_OPEN"
  ]);
  var onceKeys = new Set();
  var debugEnabled = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("pmx_debug") === "1";
  var debugAttempts = [];

  function publishDebugState() {
    if (!debugEnabled) return;
    document.documentElement.setAttribute("data-pmx-analytics-debug", JSON.stringify(debugAttempts));
  }

  function readCurrentAttribution() {
    var search = new URLSearchParams(window.location.search);
    return utmNames.reduce(function (result, name) {
      var value = search.get(name);
      if (value) result[name] = value;
      return result;
    }, {});
  }

  function readStoredAttribution() {
    try {
      var stored = JSON.parse(window.sessionStorage.getItem(storageKey) || "{}");
      return stored && typeof stored === "object" ? stored : {};
    } catch (error) {
      return {};
    }
  }

  function getAttribution() {
    var current = readCurrentAttribution();
    var attribution = Object.keys(current).length ? Object.assign({}, readStoredAttribution(), current) : readStoredAttribution();

    if (Object.keys(current).length) {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(attribution));
      } catch (error) {
        // Storage can be unavailable in strict privacy modes; tracking remains functional for the current page.
      }
    }

    return attribution;
  }

  function normalizedAttribution(attribution) {
    return utmNames.reduce(function (result, name) {
      result["pmx_" + name] = attribution[name] || "direct";
      return result;
    }, {});
  }

  function baseParameters() {
    return Object.assign({
      id_juego: config.gameId,
      hub_version: analyticsConfig.hubVersion || "p0",
      event_version: analyticsConfig.eventVersion || "1.0",
      page_location: window.location.href
    }, normalizedAttribution(getAttribution()));
  }

  function sanitizeParameters(parameters) {
    return Object.keys(parameters).reduce(function (result, key) {
      var value = parameters[key];
      if (["string", "number", "boolean"].includes(typeof value)) result[key] = value;
      return result;
    }, {});
  }

  function isEnabled() {
    return /^G-[A-Z0-9]+$/.test(measurementId) && typeof window.gtag === "function";
  }

  function recordDebugAttempt(eventName, parameters, sent) {
    if (!debugEnabled) return;
    debugAttempts.push(Object.freeze({
      eventName: eventName,
      parameters: Object.freeze(Object.assign({}, parameters)),
      sent: sent
    }));
    publishDebugState();
  }

  function pmxTrack(eventName, extraParams) {
    if (!allowedEvents.includes(eventName)) return false;

    var parameters = sanitizeParameters(Object.assign({}, baseParameters(), extraParams || {}));
    var enabled = isEnabled();

    recordDebugAttempt(eventName, parameters, enabled);
    if (!enabled) return false;

    window.gtag("event", eventName, parameters);
    return true;
  }

  function trackOnce(eventName, extraParams, uniqueKey) {
    var key = uniqueKey || eventName;
    if (onceKeys.has(key)) return false;
    onceKeys.add(key);
    pmxTrack(eventName, extraParams);
    return true;
  }

  function sendPageViewOnce() {
    var key = "standard-page-view";
    if (onceKeys.has(key)) return false;
    onceKeys.add(key);

    var parameters = sanitizeParameters(Object.assign({}, baseParameters(), {
      page_title: document.title
    }));
    var enabled = isEnabled();

    recordDebugAttempt("page_view", parameters, enabled);
    if (!enabled) return false;

    window.gtag("event", "page_view", parameters);
    return true;
  }

  function loadProvider() {
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) return false;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());

    // Automatic page views stay disabled so the Hub has one explicit source of truth.
    // The standard GA4 page_view is emitted exactly once below; HUB_VIEW remains independent.
    window.gtag("config", measurementId, { send_page_view: false });
    sendPageViewOnce();

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(script);
    return true;
  }

  if (!config) {
    throw new Error("PMX_CONFIG no está disponible para Analytics.");
  }

  var attribution = getAttribution();
  window.PMX_ATTRIBUTION = Object.freeze(Object.assign({}, attribution));
  window.pmxTrack = pmxTrack;
  window.PMX_ANALYTICS = Object.freeze({
    allowedEvents: allowedEvents,
    enabled: function () { return isEnabled(); },
    getAttribution: getAttribution,
    trackOnce: trackOnce,
    sendPageViewOnce: sendPageViewOnce,
    debugEnabled: debugEnabled,
    debugAttempts: debugAttempts
  });

  publishDebugState();
  loadProvider();
})();
