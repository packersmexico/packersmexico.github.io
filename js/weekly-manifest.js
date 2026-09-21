(function () {
  "use strict";

  window.PMX_WEEKLY_MANIFEST = Object.freeze({
    version: "1.0",
    pmxId: "PMX-W3-AUTOMATION-001",
    updatedAt: "2026-09-21T11:50:00-06:00",
    timezone: "America/Mexico_City",
    operationalWeek: 3,

    game: Object.freeze({
      id: "PMX-WS-2026-W03",
      week: 3,
      matchup: "ATL @ GB",
      opponent: "Atlanta Falcons",
      opponentShort: "FALCONS",
      site: "HOME",
      dateISO: "2026-09-24",
      dateLabel: "JUE 24 SEP",
      time: "18:15",
      tv: "PRIME VIDEO",
      special: "HOME OPENER · ALUMNI WEEKEND",
      source: "NFL · Week 3 2026 schedule · verified 2026-09-21"
    }),

    quiniela: Object.freeze({
      participants: Object.freeze([
        "EL DOC",
        "ARI",
        "LALO",
        "ALEX",
        "LUIS C.",
        "DR PALMA",
        "JENNI",
        "RODRI",
        "IBRACHO"
      ]),
      guestDefault: "OFF",

      capture: Object.freeze({
        week: 3,
        status: "DRAFT_HOLD_CUTOFF_CONFIRMATION",
        games: 16,
        participants: 9,
        expectedPicks: 144,
        receivedPicks: 0,
        formId: "262634544487062",
        formUrl: "https://form.jotform.com/262634544487062",
        cutoff: null,
        shareState: "NO_COMPARTIR_AUN"
      }),

      public: Object.freeze({
        week: 2,
        status: "LIVE",
        enabled: true,
        label: "QUINIELA · WEEK 2",
        title: "TODOS LOS PICKS",
        meta: "9 integrantes · 16 partidos · 144 selecciones",
        description: "Consulta la selección completa del board y revisa los picks de cada integrante.",
        url: "https://packersmexico.github.io/quiniela/w02/"
      }),

      results: Object.freeze({
        week: 2,
        status: "WAITING_FINAL_GAME",
        finalGames: 15,
        totalGames: 16,
        lastGame: "NYG @ LAR",
        lastGameTime: "LUN 21 SEP · 18:15 CDMX",
        publicationState: "HOLD_RESULTS_FINAL"
      })
    }),

    wingstop: Object.freeze({
      week: 3,
      status: "PRODUCTION_INPUT_READY",
      publicationState: "HOLD_05",
      venue: "Wingstop Condesa",
      venueWording: "Casa Oficial de Packers en CDMX",
      cta: "CONFIRMA TU ASISTENCIA",
      promoEnabled: false
    }),

    routing: Object.freeze({
      F01: "INPUT_READY",
      F02: "INPUT_READY",
      F03: "WAITING_EVENT",
      F04: "WAITING_DATA_CUT",
      F05: "AUTOMATION_ACTIVE",
      F06: "AUTOMATION_ACTIVE",
      publication: "HOLD_05_READY_FOR_CLICK_REQUIRED"
    })
  });
})();
