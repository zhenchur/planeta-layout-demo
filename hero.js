const hero = document.querySelector(".tabs__cards-slider");

if (hero) {
  const desktop = window.matchMedia("(min-width: 1024px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const nav = hero.querySelector(".segmented-control__wrap");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const sprite = hero
    .querySelector(".cards__button use")
    .getAttribute("href")
    .split("#")[0];
  const panels = [
    ...hero.querySelectorAll(".tabs__cards-slider-content > .tab__panel"),
  ];
  const tabs = document.createElement("div");
  const cardPositions = [
    "is-top",
    "is-left",
    "is-right",
    "is-middle",
    "is-bottom",
    "is-going-to-stack",
    "is-hidden",
  ];
  let activeGroup = -1;
  let activeCard = 0;
  let autoplay;
  let deckTransition;
  let pendingCard;
  let cancelPanelTransition;
  let hintTimer;
  let handHint;

  tabs.className = "segmented-control";
  tabs.setAttribute("data-v-bd72431e", "");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Категории событий");

  const groups = panels.map((panel, index) => {
    const title = panel.querySelector(".cards-slider__title");
    const name = title.textContent.trim();
    const stack = panel.querySelector(".cards");
    const cards = [...stack.querySelectorAll(":scope > .card")];
    const imageFrame = document.createElement("div");
    imageFrame.className = "cards-slider__hero";
    imageFrame.setAttribute("data-v-ce949c8d", "");
    imageFrame.setAttribute("aria-hidden", "true");
    title.after(imageFrame);

    const images = cards.map((card) => {
      const image = card.querySelector(".card__image");
      const layer = document.createElement("div");
      layer.className = "hero__item";
      layer.setAttribute("data-v-ce949c8d", "");
      if (image) {
        const desktopImage = image.cloneNode();
        desktopImage.className = "hero__img";
        desktopImage.alt = "";
        desktopImage.width = 1042;
        desktopImage.height = 740;
        layer.append(desktopImage);
      }
      imageFrame.append(layer);
      return layer;
    });

    const itemWrap = document.createElement("div");
    const item = document.createElement("div");
    const tab = document.createElement("button");
    const label = document.createElement("span");
    itemWrap.className = "segmented-control__item-wrap";
    item.className = "segmented-control__item";
    itemWrap.setAttribute("data-v-bd72431e", "");
    item.setAttribute("data-v-bd72431e", "");
    tab.type = "button";
    tab.className = "button button--tab button--sm button-height--md";
    tab.id = `hero-tab-${index + 1}`;
    tab.setAttribute("data-v-4d972139", "");
    tab.setAttribute("role", "tab");
    label.className = "button__text";
    label.setAttribute("data-v-4d972139", "");
    label.textContent = name;
    tab.append(label);
    item.append(tab);
    itemWrap.append(item);

    if (index < panels.length - 1) {
      const separator = document.createElementNS(svgNamespace, "svg");
      const shape = document.createElementNS(svgNamespace, "use");
      separator.setAttribute("class", "segmented-control__separator");
      separator.setAttribute("data-v-bd72431e", "");
      separator.setAttribute("viewBox", "0 0 53 46");
      separator.setAttribute("aria-hidden", "true");
      shape.setAttribute("href", `${sprite}#icon-segmented-control-separator`);
      separator.append(shape);
      itemWrap.append(separator);
    }

    tabs.append(itemWrap);
    panel.id = `hero-panel-${index + 1}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    tab.setAttribute("aria-controls", panel.id);
    tab.addEventListener("click", () => selectGroup(index));

    const previous = panel.querySelector(".cards__button--prev");
    const next = panel.querySelector(".cards__button--next");
    previous.setAttribute("aria-label", "Предыдущая карточка");
    next.setAttribute("aria-label", "Следующая карточка");
    previous.addEventListener("click", () => moveCard(-1));
    next.addEventListener("click", () => moveCard(1));

    return {
      panel,
      tab,
      stack,
      cards,
      images,
      arrows: [previous, next],
      cancelSwipe: enableCardSwipe(stack),
    };
  });

  function duration() {
    if (reducedMotion.matches) return 0;
    return desktop.matches ? 1000 : 430;
  }

  function cardIndex(offset, count) {
    return (activeCard + offset + count) % count;
  }

  function applyPositions(elements, positions, fallback) {
    const roles = new Map(
      positions.map(([offset, role]) => [
        cardIndex(offset, elements.length),
        role,
      ]),
    );
    elements.forEach((element, index) => {
      const role = roles.get(index) ?? fallback;
      element.classList.remove(...cardPositions, "reset");
      if (role) element.classList.add(role);
    });
  }

  function positionCards(group, positions) {
    applyPositions(group.cards, positions);
    for (const card of group.cards)
      card.inert = !card.classList.contains("is-top");
  }

  function renderRestingDeck(group) {
    const positions = desktop.matches
      ? [
          [0, "is-top"],
          [1, "is-left"],
          [-1, "is-right"],
        ]
      : [
          [0, "is-top"],
          [1, "is-middle"],
          [2, "is-bottom"],
        ];
    positionCards(group, positions);
    applyPositions(group.images, desktop.matches ? positions : [], "is-hidden");
  }

  function setDeckMoving(group, moving) {
    group.stack.classList.toggle("is-moving-card", moving);
    for (const button of group.arrows) button.disabled = moving;
  }

  function resetDeck(group) {
    window.clearTimeout(deckTransition);
    deckTransition = undefined;
    pendingCard = undefined;
    group.cancelSwipe();
    setDeckMoving(group, false);
    hero.style.setProperty("--swipe-duration", "0ms");
    renderRestingDeck(group);
    // Commit the resting poses before enabling transitions for the next gesture.
    group.stack.getBoundingClientRect();
    hero.style.setProperty("--swipe-duration", `${duration()}ms`);
  }

  function restartAutoplay() {
    window.clearTimeout(autoplay);
    if (desktop.matches && !reducedMotion.matches && !document.hidden) {
      autoplay = window.setTimeout(() => moveCard(1), 6000);
    }
  }

  function moveCard(direction) {
    if (deckTransition !== undefined) return;
    const group = groups[activeGroup];
    const count = group.cards.length;
    const next = cardIndex(direction, count);
    const finish = () => {
      deckTransition = undefined;
      pendingCard = undefined;
      activeCard = next;
      renderRestingDeck(group);
      setDeckMoving(group, false);
      restartHint();
    };

    if (!duration()) {
      finish();
      restartAutoplay();
      return;
    }

    setDeckMoving(group, true);
    if (desktop.matches) {
      const outgoingSide = direction === 1 ? "is-right" : "is-left";
      const incomingSide = direction === 1 ? "is-left" : "is-right";
      positionCards(group, [
        [direction, "is-top"],
        [0, outgoingSide],
        [-direction, "is-going-to-stack"],
        [2 * direction, incomingSide],
      ]);
      // Only the two participating images stay visible until the deck settles.
      applyPositions(
        group.images,
        [
          [direction, "is-top"],
          [0, outgoingSide],
        ],
        "is-hidden",
      );
    } else {
      positionCards(group, [
        [0, "is-going-to-stack"],
        [1, "is-top"],
        [2, "is-middle"],
        [3, "is-bottom"],
      ]);
    }

    pendingCard = next;
    deckTransition = window.setTimeout(finish, duration());
    restartAutoplay();
  }

  function animatePanel(panel, previousPanel, direction) {
    const isDesktop = desktop.matches;
    const transition = isDesktop ? "cards-slider" : "mobile-slider";
    const active = `${transition}-enter-active`;
    const from = `${transition}-enter-from`;
    const to = `${transition}-enter-to`;
    const side = `${transition}--${direction}`;
    const leaveActive = `${transition}-leave-active`;
    const leaveFrom = `${transition}-leave-from`;
    const leaveTo = `${transition}-leave-to`;
    const hidePrevious = () => {
      previousPanel.style.display = "none";
      previousPanel.classList.remove(leaveActive, leaveFrom, leaveTo);
    };

    previousPanel.classList.add(leaveActive, leaveFrom);
    panel.classList.add(active, from, side);
    panel.style.display = "";
    let leaveTimer;
    let enterTimer;
    // Paint the start pose before starting the CSS transitions, as Vue does.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        panel.classList.replace(from, to);
        previousPanel.classList.replace(leaveFrom, leaveTo);
        if (isDesktop) leaveTimer = window.setTimeout(hidePrevious, 420);
        else hidePrevious();
        enterTimer = window.setTimeout(
          () => cancelPanelTransition?.(),
          isDesktop ? 500 : 620,
        );
      });
    });
    cancelPanelTransition = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(enterTimer);
      window.clearTimeout(leaveTimer);
      hidePrevious();
      panel.classList.remove(active, from, to, side);
      cancelPanelTransition = undefined;
    };
  }

  function selectGroup(index) {
    if (index === activeGroup) return;
    const previous = activeGroup;
    const animate = previous !== -1 && !reducedMotion.matches;
    cancelPanelTransition?.();
    if (previous !== -1) groups[previous].cancelSwipe();
    activeGroup = index;
    activeCard = 0;
    groups.forEach(({ panel, tab }, groupIndex) => {
      const selected = groupIndex === index;
      const visible = animate ? groupIndex === previous : selected;
      panel.style.display = visible ? "" : "none";
      panel.inert = !selected;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected);
      tab.tabIndex = selected ? 0 : -1;
    });
    resetDeck(groups[index]);
    if (animate) {
      animatePanel(
        groups[index].panel,
        groups[previous].panel,
        index > previous ? "next" : "prev",
      );
    }
    restartAutoplay();
    restartHint();
  }

  function restartHint() {
    window.clearTimeout(hintTimer);
    if (handHint) {
      const leaving = handHint;
      handHint = undefined;
      leaving.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reducedMotion.matches ? 0 : 280,
        easing: "ease",
        fill: "forwards",
      }).onfinish = () => leaving.remove();
    }
    if (!desktop.matches && !reducedMotion.matches && !document.hidden) {
      hintTimer = window.setTimeout(showHint, 15000);
    }
  }

  function showHint() {
    const group = groups[activeGroup];
    if (group.stack.classList.contains("is-moving-card")) {
      restartHint();
      return;
    }
    const preview = group.cards[activeCard].querySelector(
      ".card__preview-wrap",
    );
    if (!preview) return;

    const icon = document.createElementNS(svgNamespace, "svg");
    const shape = document.createElementNS(svgNamespace, "use");
    icon.setAttribute("class", "hand-hint__img");
    icon.setAttribute("data-v-ce949c8d", "");
    shape.setAttribute("href", `${sprite}#icon-hand-hint`);
    icon.append(shape);
    handHint = document.createElement("div");
    handHint.className = "hand-hint";
    handHint.setAttribute("data-v-ce949c8d", "");
    handHint.setAttribute("aria-hidden", "true");
    handHint.append(icon);
    preview.append(handHint);
    handHint.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 280,
      easing: "ease",
    });
    hintTimer = window.setTimeout(restartHint, 6000);
  }

  function enableCardSwipe(stack) {
    let pointer = null;
    let startX;
    let distance;
    let draggedCard;
    let suppressClick = false;
    let resetTimer;
    stack.style.touchAction = "pan-y";

    stack.addEventListener("pointerdown", (event) => {
      if (
        desktop.matches ||
        deckTransition !== undefined ||
        event.button !== 0 ||
        pointer !== null
      )
        return;
      draggedCard = event.target.closest(".card.is-top");
      if (!draggedCard) return;
      window.clearTimeout(resetTimer);
      draggedCard.classList.remove("reset");
      pointer = event.pointerId;
      startX = event.clientX;
      distance = 0;
      suppressClick = false;
    });

    stack.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointer) return;
      distance = event.clientX - startX;
      if (!suppressClick && Math.abs(distance) < 8) return;
      if (!suppressClick) stack.setPointerCapture(pointer);
      suppressClick = true;
      stack.classList.add("dragging", "is-moving-card");
      draggedCard.style.transform = `translateX(${distance}px) rotate(${distance / 30}deg)`;
    });

    function cancelSwipe() {
      if (pointer === null) return;
      if (stack.hasPointerCapture(pointer))
        stack.releasePointerCapture(pointer);
      pointer = null;
      stack.classList.remove("dragging", "is-moving-card");
      draggedCard.style.removeProperty("transform");
    }

    const releaseSwipe = (event) => {
      if (event.pointerId !== pointer) return;
      const card = draggedCard;
      cancelSwipe();
      if (!suppressClick) return;
      if (event.type === "pointerup" && Math.abs(distance) >= 80) {
        moveCard(1);
      } else if (duration()) {
        card.classList.add("reset");
        resetTimer = window.setTimeout(
          () => card.classList.remove("reset"),
          duration(),
        );
      }
    };

    stack.addEventListener("pointerup", releaseSwipe);
    stack.addEventListener("pointercancel", releaseSwipe);
    stack.addEventListener("dragstart", (event) => event.preventDefault());
    stack.addEventListener("pointerleave", (event) => {
      if (!suppressClick) releaseSwipe(event);
    });
    stack.addEventListener(
      "click",
      (event) => {
        if (suppressClick && event.detail > 0) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
        }
      },
      { capture: true },
    );
    return cancelSwipe;
  }

  tabs.addEventListener("keydown", (event) => {
    let index;
    switch (event.key) {
      case "ArrowLeft":
        index = (activeGroup - 1 + groups.length) % groups.length;
        break;
      case "ArrowRight":
        index = (activeGroup + 1) % groups.length;
        break;
      case "Home":
        index = 0;
        break;
      case "End":
        index = groups.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectGroup(index);
    groups[index].tab.focus();
  });

  nav.replaceChildren(tabs);
  selectGroup(0);
  function resetMotion() {
    cancelPanelTransition?.();
    if (pendingCard !== undefined) activeCard = pendingCard;
    resetDeck(groups[activeGroup]);
    restartAutoplay();
    restartHint();
  }
  desktop.addEventListener("change", resetMotion);
  reducedMotion.addEventListener("change", resetMotion);
  document.addEventListener("visibilitychange", restartAutoplay);
  document.addEventListener("visibilitychange", restartHint);
  window.addEventListener("pointerdown", restartHint, { passive: true });
  window.addEventListener("scroll", restartHint, {
    passive: true,
    capture: true,
  });
}
