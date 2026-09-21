(function () {
  "use strict";

  var config = window.PMX_CONFIG;
  var trackedParameterNames = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

  if (!config) throw new Error("PMX_CONFIG no está disponible.");

  function readAttribution(search) {
    var source = new URLSearchParams(search);
    return trackedParameterNames.reduce(function (attribution, name) {
      var value = source.get(name);
      if (value) attribution[name] = value;
      return attribution;
    }, {});
  }

  function preserveAttribution(destination, attribution) {
    if (!destination) return "";
    var url;
    try { url = new URL(destination, window.location.href); } catch (error) { return ""; }
    Object.keys(attribution).forEach(function (name) {
      if (!url.searchParams.has(name)) url.searchParams.set(name, attribution[name]);
    });
    return url.href;
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value || "";
  }

  function configureLink(id, destination, attribution, unavailableLabel) {
    var link = document.getElementById(id);
    if (!link) return null;
    var safeDestination = preserveAttribution(destination, attribution);
    if (!safeDestination) {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", unavailableLabel || "URL pendiente de validación");
      return link;
    }
    link.href = safeDestination;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-disabled");
    link.removeAttribute("title");
    return link;
  }

  function configureInternalLink(id, destination, attribution, unavailableLabel) {
    var link = document.getElementById(id);
    if (!link) return null;
    var safeDestination = preserveAttribution(destination, attribution);
    if (!safeDestination) {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", unavailableLabel || "URL pendiente de validación");
      return link;
    }
    link.href = safeDestination;
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("title");
    return link;
  }

  function attachTracking(link, eventName, eventParameters) {
    if (!link || !link.hasAttribute("href")) return;
    link.addEventListener("click", function () {
      window.pmxTrack(eventName, Object.assign({
        cta_id: link.id,
        destination_type: eventParameters.destination_type,
        destination_url: link.href
      }, eventParameters));
    });
  }

  function renderGame() {
    var isHome = config.homeAway === "HOME";
    var isAway = config.homeAway === "AWAY";
    var gameLabel = config.gameLabel || config.kickerDesktop || config.kickerMobile || "";
    var kicker = [config.week, gameLabel].filter(Boolean).join(" · ");
    var opponent = config.opponent || "RIVAL PENDIENTE";

    setText("game-kicker-mobile", kicker);
    setText("game-kicker-desktop", kicker);
    setText("game-heading-primary", isHome ? opponent : "PACKERS");
    setText("game-heading-secondary", isHome ? "@ PACKERS" : (isAway ? "@ " + opponent : opponent));
    setText("game-datetime", [config.date, config.time ? config.time + " CDMX" : ""].filter(Boolean).join(" · "));
    setText("game-venue", (config.venue || "").toUpperCase() + (config.venue ? " · CDMX" : ""));
    document.querySelector(".venue-lock").textContent = config.venueWording;
    document.body.classList.toggle("state-data-pending", Boolean(config.dataPending));

    var lockup = document.getElementById("team-lockup");
    var packersTeamLogo = document.getElementById("packers-team-logo");
    var opponentTeamLogo = document.getElementById("opponent-team-logo");
    var lockupSeparator = document.getElementById("team-lockup-separator");
    var packersLogoSrc = config.teamLogos && config.teamLogos.PACKERS;
    var opponentLogoSrc = config.teamLogos && config.teamLogos[config.opponent];
    if (lockup && packersTeamLogo && opponentTeamLogo && packersLogoSrc && opponentLogoSrc) {
      if (isHome) {
        packersTeamLogo.src = opponentLogoSrc;
        packersTeamLogo.alt = config.opponentLong || config.opponent || "Rival";
        opponentTeamLogo.src = packersLogoSrc;
        opponentTeamLogo.alt = "Green Bay Packers";
      } else {
        packersTeamLogo.src = packersLogoSrc;
        packersTeamLogo.alt = "Green Bay Packers";
        opponentTeamLogo.src = opponentLogoSrc;
        opponentTeamLogo.alt = config.opponentLong || config.opponent || "Rival";
      }
      if (lockupSeparator) lockupSeparator.textContent = (isHome || isAway) ? "@" : "VS";
      lockup.hidden = false;
    } else if (lockup) {
      lockup.hidden = true;
    }

    var image = document.getElementById("hero-image");
    if (config.heroImageUrl) {
      image.src = config.heroImageUrl;
      image.hidden = false;
      image.parentElement.classList.add("has-image");
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      image.parentElement.classList.remove("has-image");
    }
  }

  function renderSocialLinks(attribution) {
    var list = document.getElementById("social-links");
    var labels = {
      instagram: { mark: "IG", label: "Instagram" },
      x: { mark: "X", label: "@Packers_Mx" },
      facebook: { mark: "FB", label: "Facebook" },
      tiktok: { mark: "TT", label: "TikTok" },
      youtube: { mark: "YT", label: "YouTube" }
    };
    list.replaceChildren();
    Object.keys(labels).forEach(function (network) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      var destination = preserveAttribution(config.socialUrls[network], attribution);
      link.className = "social-link";
      link.id = "social-" + network;
      var socialMark = document.createElement("span");
      socialMark.className = "social-link__mark";
      socialMark.textContent = labels[network].mark;
      var socialLabel = document.createElement("span");
      socialLabel.className = "social-link__label";
      socialLabel.textContent = labels[network].label;
      var socialArrow = document.createElement("span");
      socialArrow.className = "social-link__arrow";
      socialArrow.setAttribute("aria-hidden", "true");
      socialArrow.textContent = "↗";
      link.append(socialMark, socialLabel, socialArrow);
      if (destination) {
        link.href = destination;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.addEventListener("click", function () {
          window.pmxTrack("CLICK_SOCIAL", {
            cta_id: link.id,
            destination_type: "social",
            destination_url: link.href,
            social_network: network
          });
        });
      } else {
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("title", "URL social pendiente de validación");
      }
      item.appendChild(link);
      list.appendChild(item);
    });
  }

  function renderPromo(attribution) {
    var section = document.getElementById("promo-section");
    if (!config.promoEnabled) { section.hidden = true; return; }
    setText("promo-title", config.promoTitle || "PROMOCIÓN PENDIENTE");
    setText("promo-description", config.promoDescription || "Contenido pendiente de validación.");
    configureLink("promo-link", config.promoUrl, attribution, "URL de promoción pendiente de validación");
    attachTracking(document.getElementById("promo-link"), "CLICK_PROMO", {
      destination_type: "promotion",
      promo_id: config.promoId || config.gameId + "_promo"
    });
    section.hidden = false;
  }

  function renderSpecial() {
    var section = document.getElementById("special-section");
    if (!config.specialEnabled) { section.hidden = true; return; }
    setText("special-title", config.specialTitle || "DINÁMICA ESPECIAL");
    setText("special-description", config.specialDescription || "");
    section.hidden = false;
  }

  function renderQuiniela(attribution) {
    var section = document.getElementById("quiniela-section");
    var quiniela = config.quiniela;
    if (!section || !quiniela || !quiniela.enabled) {
      if (section) section.hidden = true;
      return;
    }

    setText("quiniela-label", quiniela.label || "QUINIELA");
    setText("quiniela-title", quiniela.title || "TODOS LOS PICKS");
    setText("quiniela-meta", quiniela.meta || "");
    setText("quiniela-description", quiniela.description || "");

    var memberPreview = document.getElementById("quiniela-member-preview");
    if (memberPreview) {
      memberPreview.replaceChildren();
      (quiniela.members || []).forEach(function (member) {
        var item = document.createElement("span");
        item.textContent = member;
        memberPreview.appendChild(item);
      });
    }

    var quinielaLink = configureInternalLink("quiniela-link", quiniela.url, attribution, "URL de quiniela pendiente de validación");
    attachTracking(quinielaLink, "CLICK_QUINIELA", { destination_type: "editorial" });
    section.hidden = false;
  }

  function render() {
    var attribution = window.PMX_ANALYTICS.getAttribution();
    window.PMX_ATTRIBUTION = Object.freeze(Object.assign({}, attribution));
    renderGame();

    var registrationLink = configureLink("registration-link", config.registrationUrl, attribution);
    var mapsLink = configureLink("maps-link", config.mapsUrl, attribution, "URL de Maps pendiente de validación");
    var calendarLink = configureLink("calendar-link", config.calendarUrl, attribution, "URL de calendario pendiente de validación");
    var calendarHeaderLink = configureLink("calendar-link-header", config.calendarUrl, attribution, "URL de calendario pendiente de validación");
    var gopackgoLink = configureLink("gopackgo-link", config.gopackgoUrl, attribution, "URL de GoPackGo MX pendiente de validación");
    var gopackgoHeaderLink = configureLink("gopackgo-link-header", config.gopackgoUrl, attribution, "URL de GoPackGo MX pendiente de validación");

    attachTracking(registrationLink, "CLICK_REGISTRO", { destination_type: "registration", cta_id: "confirma_tu_asistencia" });
    attachTracking(mapsLink, "CLICK_MAPS", { destination_type: "maps" });
    attachTracking(calendarLink, "CLICK_CALENDAR", { destination_type: "calendar" });
    attachTracking(calendarHeaderLink, "CLICK_CALENDAR", { destination_type: "calendar" });
    attachTracking(gopackgoLink, "CLICK_GOPACKGO", { destination_type: "gopackgo" });
    attachTracking(gopackgoHeaderLink, "CLICK_GOPACKGO", { destination_type: "gopackgo" });

    renderPromo(attribution);
    renderSpecial();
    renderQuiniela(attribution);
    renderSocialLinks(attribution);

    window.PMX_ANALYTICS.trackOnce("HUB_VIEW", {}, "hub-view");
    if (attribution.utm_source === "onsite" && attribution.utm_medium === "qr") {
      window.PMX_ANALYTICS.trackOnce("QR_OPEN", {}, "qr-open");
    }
  }

  window.PMX_HUB = Object.freeze({ readAttribution: readAttribution, preserveAttribution: preserveAttribution });
  render();
})();
