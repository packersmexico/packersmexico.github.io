(function () {
  "use strict";

  var data = window.PMX_QUINIELA_DATA;
  var analytics = window.PMX_ANALYTICS;
  var list = document.getElementById("quiniela-games");
  var controls = document.getElementById("member-controls");
  var viewTitle = document.getElementById("view-title");
  var backLink = document.getElementById("back-hub-link");
  var carousel = document.getElementById("editorial-carousel");
  var carouselPrev = document.getElementById("carousel-prev");
  var carouselNext = document.getElementById("carousel-next");
  var carouselPosition = document.getElementById("carousel-position");
  var carouselDots = document.getElementById("carousel-dots");

  if (!data || !list || !controls || !carousel) {
    throw new Error("La configuración de la quiniela no está disponible.");
  }

  var totalGames = data.games.length;
  var totalPicks = totalGames * data.members.length;
  var stickerAssets = data.memberStickers || {};
  var teamLogos = data.teamLogos || {};
  var slideCount = Math.ceil(totalGames / 2) + 3;

  function createElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function matchupParts(matchup) {
    var parts = matchup.split(" @ ");
    return { away: parts[0] || matchup, home: parts[1] || "" };
  }

  function consensusCounts(game) {
    var counts = {};
    data.members.forEach(function (member) {
      var pick = game.picks[member];
      counts[pick] = (counts[pick] || 0) + 1;
    });
    return Object.keys(counts).sort(function (a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return a.localeCompare(b);
    }).map(function (team) {
      return { team: team, count: counts[team] };
    });
  }

  function consensusFor(game) {
    return consensusCounts(game).map(function (item) {
      return item.team + " " + item.count + "/" + data.members.length;
    }).join(" · ");
  }

  function createMemberMark(member, compact) {
    var wrap = createElement("span", compact ? "member-mark member-mark--compact" : "member-mark");
    var src = stickerAssets[member];
    if (src) {
      var img = document.createElement("img");
      img.className = "member-mark__image";
      img.src = src;
      img.alt = member;
      img.loading = "lazy";
      img.addEventListener("error", function () {
        wrap.replaceChildren(createElement("span", "member-mark__fallback", member));
      }, { once: true });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(createElement("span", "member-mark__fallback", member));
    }
    return wrap;
  }

  function createTeamMark(team) {
    var wrap = createElement("span", "team-mark");
    var src = teamLogos[team];
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = team;
      img.loading = "lazy";
      img.addEventListener("error", function () {
        wrap.replaceChildren(createElement("strong", "team-mark__fallback", team));
      }, { once: true });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(createElement("strong", "team-mark__fallback", team));
    }
    return wrap;
  }

  function createEditorialPick(member, pick) {
    var item = createElement("div", "editorial-pick");
    item.append(createMemberMark(member, true), createElement("strong", "editorial-pick__team", pick));
    return item;
  }

  function createEditorialGame(game) {
    var gameNode = createElement("article", "editorial-game");
    var parts = matchupParts(game.matchup);
    var counts = consensusCounts(game);

    var top = createElement("div", "editorial-game__top");
    var identity = createElement("div", "editorial-game__identity");
    var away = createElement("div", "editorial-team");
    away.append(createTeamMark(parts.away), createElement("span", "editorial-team__abbr", parts.away));
    var at = createElement("span", "editorial-game__at", "@");
    var home = createElement("div", "editorial-team");
    home.append(createTeamMark(parts.home), createElement("span", "editorial-team__abbr", parts.home));
    identity.append(away, at, home);

    var info = createElement("div", "editorial-game__info");
    info.append(
      createElement("p", "editorial-game__datetime", game.datetime),
      createElement("p", "editorial-game__consensus", consensusFor(game))
    );
    top.append(identity, info);

    var meter = createElement("div", "consensus-meter");
    if (counts.length) {
      counts.forEach(function (item, index) {
        var piece = createElement("span", "consensus-meter__piece consensus-meter__piece--" + index);
        piece.style.width = ((item.count / data.members.length) * 100) + "%";
        piece.title = item.team + " " + item.count + "/" + data.members.length;
        meter.appendChild(piece);
      });
    }

    var picks = createElement("div", "editorial-picks");
    data.members.forEach(function (member) {
      picks.appendChild(createEditorialPick(member, game.picks[member]));
    });

    gameNode.append(top, meter, picks);
    return gameNode;
  }

  function createSlide(className, label) {
    var slide = createElement("article", "editorial-slide " + className);
    slide.setAttribute("aria-label", label);
    return slide;
  }

  function renderCoverSlide() {
    var slide = createSlide("editorial-slide--cover", "Portada de la Quiniela Week 1");
    var logo = document.createElement("img");
    logo.className = "editorial-cover__logo";
    logo.src = "../../assets/PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg";
    logo.alt = "PACKERS MÉXICO";

    var countLine = createElement("p", "editorial-cover__count", data.members.length + " integrantes · " + totalGames + " partidos · " + totalPicks + " picks");
    var core = createElement("div", "editorial-cover__core");
    core.append(
      createElement("p", "editorial-cover__eyebrow", "QUINIELA · " + data.week),
      createElement("h2", "editorial-cover__title", "ASÍ QUEDARON NUESTROS PICKS"),
      countLine
    );

    var footer = createElement("div", "editorial-cover__footer");
    footer.append(
      createElement("span", "editorial-cover__rule"),
      createElement("p", "editorial-cover__prompt", "Desliza · compara · elige tu pick")
    );

    slide.append(logo, core, footer);
    return slide;
  }

  function renderGameSlides() {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < data.games.length; i += 2) {
      var page = Math.floor(i / 2) + 2;
      var slide = createSlide("editorial-slide--games", "Lámina " + page + " de matchups");
      slide.appendChild(createElement("p", "editorial-slide__eyebrow", data.week + " · PICKS"));
      var gamesWrap = createElement("div", "editorial-slide__games");
      gamesWrap.appendChild(createEditorialGame(data.games[i]));
      if (data.games[i + 1]) gamesWrap.appendChild(createEditorialGame(data.games[i + 1]));
      slide.appendChild(gamesWrap);
      fragment.appendChild(slide);
    }
    return fragment;
  }

  function renderMatrixSlide() {
    var slide = createSlide("editorial-slide--matrix", "Matriz completa de los picks");
    slide.append(
      createElement("p", "editorial-slide__eyebrow", "TABLA COMPLETA"),
      createElement("h2", "editorial-matrix__title", data.members.length + " × " + totalGames)
    );

    var viewport = createElement("div", "editorial-matrix__viewport");
    var table = document.createElement("table");
    table.className = "editorial-matrix";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    headRow.appendChild(createElement("th", "editorial-matrix__matchup-head", "JUEGO"));
    data.members.forEach(function (member) {
      var th = document.createElement("th");
      th.appendChild(createMemberMark(member, true));
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    var tbody = document.createElement("tbody");
    data.games.forEach(function (game) {
      var tr = document.createElement("tr");
      var matchup = createElement("th", "editorial-matrix__matchup", game.matchup);
      matchup.scope = "row";
      tr.appendChild(matchup);
      data.members.forEach(function (member) {
        tr.appendChild(createElement("td", "", game.picks[member]));
      });
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    viewport.appendChild(table);
    slide.append(viewport, createElement("p", "editorial-matrix__hint", "Desliza dentro de la tabla si necesitas ver todas las columnas."));
    return slide;
  }

  function renderCloseSlide() {
    var slide = createSlide("editorial-slide--close", "Cierre editorial de la Quiniela");
    var consensus = data.games.map(function (game) {
      var counts = consensusCounts(game);
      return counts.length && counts[0].count === data.members.length ? counts[0].team : null;
    }).filter(Boolean);

    var closest = data.games.map(function (game) {
      var counts = consensusCounts(game);
      return { game: game.matchup, margin: counts.length > 1 ? counts[0].count - counts[1].count : data.members.length };
    }).sort(function (a, b) { return a.margin - b.margin; })[0];

    slide.append(
      createElement("p", "editorial-slide__eyebrow", "CIERRE · " + data.week),
      createElement("h2", "editorial-close__title", "¿QUÉ PICK CAMBIARÍAS?"),
      createElement("p", "editorial-close__copy", consensus.length ? "Unanimidades: " + consensus.join(" · ") + "." : "El board no tuvo unanimidades esta semana."),
      createElement("p", "editorial-close__copy", closest ? "El duelo más dividido: " + closest.game + "." : ""),
      createElement("p", "editorial-close__cta", "Compara los 144 picks y cuéntanos cuál cambiarías.")
    );
    return slide;
  }

  function renderEditorialCarousel() {
    carousel.replaceChildren();
    carousel.appendChild(renderCoverSlide());
    carousel.appendChild(renderGameSlides());
    carousel.appendChild(renderMatrixSlide());
    carousel.appendChild(renderCloseSlide());

    if (carouselDots) {
      carouselDots.replaceChildren();
      for (var i = 0; i < slideCount; i += 1) {
        carouselDots.appendChild(createElement("span", "carousel-dot" + (i === 0 ? " is-active" : "")));
      }
    }
  }

  function currentSlideIndex() {
    var width = carousel.clientWidth || 1;
    return Math.max(0, Math.min(slideCount - 1, Math.round(carousel.scrollLeft / width)));
  }

  function updateCarouselStatus() {
    var index = currentSlideIndex();
    if (carouselPosition) carouselPosition.textContent = (index + 1) + " / " + slideCount;
    if (carouselDots) {
      carouselDots.querySelectorAll(".carousel-dot").forEach(function (dot, dotIndex) {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    }
  }

  function moveCarousel(direction) {
    carousel.scrollBy({ left: direction * carousel.clientWidth, behavior: "smooth" });
  }

  function renderAll() {
    list.replaceChildren();
    list.classList.remove("member-view");
    if (viewTitle) viewTitle.textContent = "TODOS · " + totalPicks + " PICKS";

    data.games.forEach(function (game, gameIndex) {
      var article = createElement("article", "quiniela-game");
      article.setAttribute("aria-labelledby", "game-" + gameIndex);

      var header = createElement("header", "quiniela-game__header");
      var titleWrap = createElement("div", "quiniela-game__title-wrap");
      var title = createElement("h4", "quiniela-game__title", game.matchup);
      title.id = "game-" + gameIndex;
      titleWrap.append(title, createElement("p", "quiniela-game__datetime", game.datetime));

      var consensus = createElement("p", "quiniela-game__consensus");
      consensus.append(
        createElement("span", "quiniela-game__consensus-label", "CONSENSO"),
        createElement("strong", "quiniela-game__consensus-value", consensusFor(game))
      );
      header.append(titleWrap, consensus);

      var grid = createElement("div", "picks-grid");
      data.members.forEach(function (member) {
        var pick = createElement("div", "pick-item");
        pick.append(
          createMemberMark(member, true),
          createElement("strong", "pick-item__team", game.picks[member])
        );
        grid.appendChild(pick);
      });

      article.append(header, grid);
      list.appendChild(article);
    });
  }

  function renderMember(member) {
    list.replaceChildren();
    list.classList.add("member-view");
    if (viewTitle) viewTitle.textContent = member + " · " + totalGames + " PICKS";

    data.games.forEach(function (game, gameIndex) {
      var article = createElement("article", "member-pick");
      article.setAttribute("aria-labelledby", "member-game-" + gameIndex);
      var info = createElement("div", "member-pick__info");
      var title = createElement("h4", "member-pick__matchup", game.matchup);
      title.id = "member-game-" + gameIndex;
      info.append(title, createElement("p", "member-pick__datetime", game.datetime));
      article.append(info, createElement("strong", "member-pick__team", game.picks[member]));
      list.appendChild(article);
    });
  }

  function setActiveButton(selectedValue) {
    controls.querySelectorAll("button").forEach(function (button) {
      var active = button.dataset.member === selectedValue;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function selectView(value) {
    setActiveButton(value);
    if (value === "ALL") renderAll();
    else renderMember(value);
  }

  function buildControls() {
    controls.replaceChildren();

    var allButton = createElement("button", "member-filter member-filter--all", "TODOS");
    allButton.type = "button";
    allButton.dataset.member = "ALL";
    allButton.setAttribute("aria-pressed", "false");
    allButton.addEventListener("click", function () { selectView("ALL"); });
    controls.appendChild(allButton);

    data.members.forEach(function (member) {
      var button = createElement("button", "member-filter member-filter--person");
      button.type = "button";
      button.dataset.member = member;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Ver picks de " + member);
      button.appendChild(createMemberMark(member, false));
      button.addEventListener("click", function () { selectView(member); });
      controls.appendChild(button);
    });
  }

  function preserveAttributionOnBackLink() {
    if (!backLink || !analytics) return;
    var attribution = analytics.getAttribution();
    var url = new URL(backLink.getAttribute("href"), window.location.href);
    Object.keys(attribution).forEach(function (name) {
      if (attribution[name] && !url.searchParams.has(name)) url.searchParams.set(name, attribution[name]);
    });
    backLink.href = url.href;
  }

  renderEditorialCarousel();
  buildControls();
  selectView("ALL");
  preserveAttributionOnBackLink();
  updateCarouselStatus();

  carousel.addEventListener("scroll", function () {
    window.requestAnimationFrame(updateCarouselStatus);
  }, { passive: true });
  if (carouselPrev) carouselPrev.addEventListener("click", function () { moveCarousel(-1); });
  if (carouselNext) carouselNext.addEventListener("click", function () { moveCarousel(1); });

  if (analytics) {
    analytics.trackOnce("VIEW_QUINIELA_W01", {
      cta_id: "quiniela-w01-page",
      destination_type: "editorial"
    }, "view-quiniela-w01");
  }
})();
