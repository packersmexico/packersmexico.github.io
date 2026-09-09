(function () {
  "use strict";

  var data = window.PMX_QUINIELA_DATA;
  var analytics = window.PMX_ANALYTICS;
  var list = document.getElementById("quiniela-games");
  var controls = document.getElementById("member-controls");
  var viewTitle = document.getElementById("view-title");
  var backLink = document.getElementById("back-hub-link");

  if (!data || !list || !controls) {
    throw new Error("La configuración de la quiniela no está disponible.");
  }

  function createElement(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function consensusFor(game) {
    var counts = {};
    data.members.forEach(function (member) {
      var pick = game.picks[member];
      counts[pick] = (counts[pick] || 0) + 1;
    });

    return Object.keys(counts).sort(function (a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return a.localeCompare(b);
    }).map(function (team) {
      return team + " " + counts[team] + "/" + data.members.length;
    }).join(" · ");
  }

  function renderAll() {
    list.replaceChildren();
    list.classList.remove("member-view");
    if (viewTitle) viewTitle.textContent = "TODOS · 144 PICKS";

    data.games.forEach(function (game, gameIndex) {
      var article = createElement("article", "quiniela-game");
      article.setAttribute("aria-labelledby", "game-" + gameIndex);

      var header = createElement("header", "quiniela-game__header");
      var titleWrap = createElement("div", "quiniela-game__title-wrap");
      var title = createElement("h3", "quiniela-game__title", game.matchup);
      title.id = "game-" + gameIndex;
      var datetime = createElement("p", "quiniela-game__datetime", game.datetime);
      titleWrap.append(title, datetime);

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
          createElement("span", "pick-item__member", member),
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
    if (viewTitle) viewTitle.textContent = member + " · 16 PICKS";

    data.games.forEach(function (game, gameIndex) {
      var article = createElement("article", "member-pick");
      article.setAttribute("aria-labelledby", "member-game-" + gameIndex);
      var info = createElement("div", "member-pick__info");
      var title = createElement("h3", "member-pick__matchup", game.matchup);
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
    var values = ["ALL"].concat(data.members);
    values.forEach(function (value) {
      var label = value === "ALL" ? "TODOS" : value;
      var button = createElement("button", "member-filter", label);
      button.type = "button";
      button.dataset.member = value;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        selectView(value);
      });
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

  buildControls();
  selectView("ALL");
  preserveAttributionOnBackLink();

  if (analytics) {
    analytics.trackOnce("VIEW_QUINIELA_W01", {
      cta_id: "quiniela-w01-page",
      destination_type: "editorial"
    }, "view-quiniela-w01");
  }
})();
