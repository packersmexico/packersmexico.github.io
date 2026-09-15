(function () {
  "use strict";

  var timezone = "America/Mexico_City";
  var season = window.PMX_SEASON_2026;

  function todayISOInTimezone() {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    var values = parts.reduce(function (result, part) {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

    return [values.year, values.month, values.day].join("-");
  }

  function resolveCurrentGame() {
    if (!season || !Array.isArray(season.games) || !season.games.length) return null;

    var today = todayISOInTimezone();
    var upcoming = season.games.find(function (game) {
      return game.dateISO && game.dateISO >= today;
    });

    if (upcoming) return upcoming;

    var undated = season.games.find(function (game) {
      return !game.dateISO;
    });

    return undated || season.games[season.games.length - 1];
  }

  var activeGame = resolveCurrentGame();
  var activeWeek = activeGame ? activeGame.week : 1;
  var activeWeekLabel = "WEEK " + activeWeek;
  var activeOpponent = activeGame ? activeGame.short : "RIVAL PENDIENTE";
  var activeOpponentLong = activeGame ? activeGame.opponent : "Rival pendiente";
  var activeSite = activeGame ? activeGame.site : "AWAY";
  var activeSpecial = activeGame && activeGame.special ? activeGame.special : "";

  window.PMX_CONFIG = Object.freeze({
    gameId: "PMX-WS-2026-W" + String(activeWeek).padStart(2, "0"),
    gameLabel: activeSpecial,
    kickerMobile: activeSpecial,
    kickerDesktop: activeSpecial,
    week: activeWeekLabel,
    opponent: activeOpponent,
    opponentLong: activeOpponentLong,
    homeAway: activeSite,
    date: activeGame && activeGame.dateLabel ? activeGame.dateLabel : "FECHA PENDIENTE",
    time: activeGame && activeGame.time ? activeGame.time : "",
    timezone: timezone,
    venue: "Wingstop Condesa",
    venueWording: "Casa Oficial de Packers en CDMX",
    registrationUrl: "https://share.forms.app/form/6a96032ee64cd5f15d1688aa",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Wingstop%20Condesa&query_place_id=ChIJ8WFFePj_0YURO5krqxenfu8",
    heroImageUrl: "",
    dataPending: true,
    promoEnabled: false,
    promoTitle: "",
    promoDescription: "",
    promoUrl: "",
    specialEnabled: false,
    specialTitle: "",
    specialDescription: "",
    calendarUrl: "https://packersmexico.github.io/calendario/",
    gopackgoUrl: "https://youtu.be/BZBuRy3LHUY",
    quiniela: Object.freeze({
      enabled: true,
      week: "WEEK 1",
      label: "QUINIELA · WEEK 1",
      title: "TODOS LOS PICKS",
      meta: "9 integrantes · 16 partidos · 144 selecciones",
      description: "Consulta la selección completa del board y revisa los picks de cada integrante.",
      url: "https://packersmexico.github.io/quiniela/w01/",
      members: Object.freeze([
        "EL DOC",
        "ARI",
        "LALO",
        "ALEX",
        "LUIS C.",
        "DR PALMA",
        "JENNI",
        "RODRI",
        "IBRACHO"
      ])
    }),
    analytics: Object.freeze({
      GA4_MEASUREMENT_ID: "G-QEN5F5YY14",
      hubVersion: "p0-weekly-auto-v1",
      eventVersion: "1.1"
    }),
    socialUrls: Object.freeze({
      facebook: "https://www.facebook.com/gopackgomx/",
      instagram: "https://www.instagram.com/packers_mx/",
      x: "https://x.com/Packers_Mx",
      tiktok: "https://www.tiktok.com/@packers_mx",
      youtube: "https://www.youtube.com/@gopackgomx6092"
    })
  });
})();
