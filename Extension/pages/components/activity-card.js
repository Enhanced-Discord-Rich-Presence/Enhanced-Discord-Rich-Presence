(function () {
  function toStr(v) {
    return v == null ? "" : String(v);
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = toStr(value);
  }

  function setAttr(el, name, value) {
    if (!el) return;
    const v = toStr(value).trim();
    if (v === "") el.removeAttribute(name);
    else el.setAttribute(name, v);
  }

  function setImg(img, src, alt) {
    if (!img) return;
    setAttr(img, "src", src);
    img.alt = toStr(alt);
  }

  function parseTime(str) {
    const parts = (str || "").trim().split(":").map(Number);
    if (parts.some(Number.isNaN)) return NaN;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return NaN;
  }

  function formatHMS(str) {
    const clean = (str || "").trim();
    if (!clean) return "";
    const parts = clean.split(":").map(Number);
    if (parts.some(Number.isNaN)) return clean;

    if (parts.length === 2) {
      const [m, s] = parts;
      const total = m * 60 + s;
      if (m >= 60) {
        const h = Math.floor(total / 3600);
        const mm = Math.floor((total % 3600) / 60);
        const ss = total % 60;
        return `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      }
      return `${m}:${String(s).padStart(2, "0")}`;
    }

    if (parts.length === 3) {
      const [h, m, s] = parts;
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    return clean;
  }

  function getRemainingTime(current, total) {
    const toSec = (t) => {
      const p = (t || "").trim().split(":").map(Number);
      return p.some(Number.isNaN) ? 0 : p.length === 2 ? p[0]*60 + p[1] : p[0]*3600 + p[1]*60 + p[2];
    };
    
    const diff = Math.max(0, toSec(total) - toSec(current));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    return formatHMS(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
  }

  const SVGS = {
    watching: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5BAC75" d="M4 3a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H4ZM6 20a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H6Z" /></svg>`,
    gamelogo: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5BAC75" fill-rule="evenodd" d="M20.97 4.06c0 .18.08.35.24.43.55.28.9.82 1.04 1.42.3 1.24.75 3.7.75 7.09v4.91a3.09 3.09 0 0 1-5.85 1.38l-1.76-3.51a1.09 1.09 0 0 0-1.23-.55c-.57.13-1.36.27-2.16.27s-1.6-.14-2.16-.27c-.49-.11-1 .1-1.23.55l-1.76 3.51A3.09 3.09 0 0 1 1 17.91V13c0-3.38.46-5.85.75-7.1.15-.6.49-1.13 1.04-1.4a.47.47 0 0 0 .24-.44c0-.7.48-1.32 1.2-1.47l2.93-.62c.5-.1 1 .06 1.36.4.35.34.78.71 1.28.68a42.4 42.4 0 0 1 4.4 0c.5.03.93-.34 1.28-.69.35-.33.86-.5 1.36-.39l2.94.62c.7.15 1.19.78 1.19 1.47ZM20 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 7a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H7v1a1 1 0 1 1-2 0v-1H4a1 1 0 1 1 0-2h1V7Z" clip-rule="evenodd" /></svg>`,
    hourglass: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5BAC75" d="M9.1 8.85A.5.5 0 0 1 9.45 8h5.1a.5.5 0 0 1 .35.85l-.84.85a3.25 3.25 0 0 0 0 4.6l2.06 2.06A3 3 0 0 1 17 18.5v1.01a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1.01a3 3 0 0 1 .88-2.13l2.06-2.06a3.25 3.25 0 0 0 0-4.6l-.84-.85Z" /><path fill="#5BAC75" fill-rule="evenodd" d="M7 1a3 3 0 0 0-3 3v1.51a6 6 0 0 0 1.76 4.25l2.06 2.06c.1.1.1.26 0 .36l-2.06 2.06A6 6 0 0 0 4 18.5V20a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1.51a6 6 0 0 0-1.76-4.25l-2.06-2.06a.25.25 0 0 1 0-.36l2.06-2.06A6 6 0 0 0 20 5.5V4a3 3 0 0 0-3-3H7ZM6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1.51a4 4 0 0 1-1.17 2.83l-2.07 2.07c-.88.88-.88 2.3 0 3.18l2.07 2.07A4 4 0 0 1 18 18.49V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1.51a4 4 0 0 1 1.17-2.83l2.07-2.07c.88-.88.88-2.3 0-3.18L7.17 8.34A4 4 0 0 1 6 5.51V4Z" clip-rule="evenodd" /></svg>`,
    music: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path fill="#5BAC75" d="M8.65 1.51A2 2 0 0 0 6 3.41v9.88A3.98 3.98 0 0 0 4.5 13C2.57 13 1 14.34 1 16s1.57 3 3.5 3S8 17.66 8 16V5.4l11 3.81v7.08a3.98 3.98 0 0 0-1.5-.29c-1.93 0-3.5 1.34-3.5 3s1.57 3 3.5 3 3.5-1.34 3.5-3V7.03c0-.74-.47-1.4-1.18-1.65L8.65 1.51Z" /></svg>`
  };

  function setStaticTimeSVG(container, svgType) {
    const svgEl = container?.querySelector('svg');
    if (!svgEl || !SVGS[svgType]) return;
    svgEl.innerHTML = SVGS[svgType];
  }

  function setPlatformIcon(card) {
    const platformName = card.querySelector(".custom-activity-name");
    const platformIcon = card.querySelector(".platform-icon");
    const cardHeader = card.querySelector(".card-header");
    if (!platformIcon) return;

    const name = (platformName?.textContent || "").trim();
    
    if (name === "special") {
      const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/simple-icons/3.0.1/youtube.svg";
      platformIcon.style.maskImage = `url("${iconUrl}")`;
      platformIcon.style.webkitMaskImage = `url("${iconUrl}")`;
      platformIcon.style.display = "inline-block";
      if (platformName) {
        platformName.style.display = "none";
      }
      cardHeader?.classList.add("icon-compact");
      return;
    }
    
    if (name === "YouTube") {
      const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/simple-icons/3.0.1/youtube.svg";
      platformIcon.style.maskImage = `url("${iconUrl}")`;
      platformIcon.style.webkitMaskImage = `url("${iconUrl}")`;
      platformIcon.style.display = "inline-block";
      
      // Reset for other cases
      if (platformName) platformName.style.display = "";
      cardHeader?.classList.remove("icon-compact");
      return;
    }

    // Default case
    platformIcon.style.display = "none";
    if (platformName) platformName.style.display = "";
    cardHeader?.classList.remove("icon-compact");
  }

  function cleanLinks(card) {
    card.querySelectorAll(".text-link").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.trim() === "") {
        link.removeAttribute("href");
        link.style.cursor = "default";
        link.style.pointerEvents = "none";
      }
    });
  }

  function setRowVisibility(linkEl, textEl, textValue) {
    if (!linkEl) return;
    const hasText = toStr(textValue).trim() !== "";
    linkEl.style.display = hasText ? "block" : "none";
    if (textEl) textEl.style.display = hasText ? "block" : "none";
  }

  function getTimeDisplayConfig(statusPrefix, currentTime, totalTime) {
    const hasCurrent = toStr(currentTime).trim() !== '';
    const hasTotal = toStr(totalTime).trim() !== '';
    
    if (statusPrefix === 'Competing in') {
      if (hasCurrent && hasTotal) {
        return { showProgress: false, svgType: 'hourglass', displayTime: 'both', timeValue: `${getRemainingTime(currentTime, totalTime)}` };
      } else if (hasCurrent) {
        return { showProgress: false, svgType: 'gamelogo', displayTime: 'current', timeValue: formatHMS(currentTime) };
      } else if (hasTotal) {
        return { showProgress: false, svgType: 'hourglass', displayTime: 'total', timeValue: `${getRemainingTime("00:00", totalTime)}` };
      } else {
        return { showProgress: false, svgType: 'gamelogo', displayTime: 'none', timeValue: '0:00' };
      }
    }
    
    if (statusPrefix === 'Listening to') {
      if (hasCurrent && hasTotal) {
        return { showProgress: true, svgType: 'music', displayTime: 'both' };
      } else if (hasCurrent) {
        return { showProgress: false, svgType: 'music', displayTime: 'current', timeValue: formatHMS(currentTime) };
      } else if (hasTotal) {
        return { showProgress: false, svgType: 'music', displayTime: 'total', timeValue: "0:00" };
      } else {
        return { showProgress: false, svgType: 'music', displayTime: 'none', timeValue: '0:00' };
      }
    }

    if (statusPrefix === 'Playing') {
      if (hasCurrent && hasTotal) {
        return { showProgress: false, svgType: 'hourglass', displayTime: 'both', timeValue: `${getRemainingTime(currentTime, totalTime)}` }
      } else if (hasCurrent) {
        return { showProgress: false, svgType: 'gamelogo', displayTime: 'current', timeValue: formatHMS(currentTime) };
      } else if (hasTotal) {
        return { showProgress: false, svgType: 'gamelogo', displayTime: 'total', timeValue: `${getRemainingTime("00:00", totalTime)}` };
      } else {
        return { showProgress: false, svgType: 'gamelogo', displayTime: 'none', timeValue: '0:00' };
      }
    }
    
    // Default (Watching or others)
    if (hasCurrent && hasTotal) {
      return { showProgress: true, svgType: 'watching', displayTime: 'both' };
    } else if (hasTotal) {
      return { showProgress: false, svgType: 'hourglass', displayTime: 'total', timeValue: `${getRemainingTime("00:00", totalTime)}` };
    } else if (hasCurrent) {
      return { showProgress: false, svgType: 'watching', displayTime: 'current', timeValue: formatHMS(currentTime) };
    } else {
      return { showProgress: false, svgType: 'watching', displayTime: 'none', timeValue: '0:00' };
    }
  }

  function setupTimeDisplay(card, statusPrefix, currentTime, totalTime) {
    const currentTimeEl = card.querySelector(".current-time");
    const totalTimeEl = card.querySelector(".total-time");
    const progressFill = card.querySelector(".progress-fill");
    const progressBar = card.querySelector(".progress-bar");
    const totalContainer = card.querySelector(".static-total-container");
    const totalLabel = card.querySelector(".static-total-label");
    const currentContainer = card.querySelector(".static-current-container");
    const currentLabel = card.querySelector(".static-current-label");

    const config = getTimeDisplayConfig(statusPrefix, currentTime, totalTime);
    
    const hide = (el) => el && (el.style.display = "none");
    const show = (el) => el && (el.style.display = "inline-flex");

    // Hide all time displays first
    hide(progressBar);
    hide(totalContainer);
    hide(currentContainer);
    hide(currentTimeEl);
    hide(totalTimeEl);

    if (config.showProgress) {
      // Show progress bar mode
      show(progressBar);
      show(currentTimeEl);
      show(totalTimeEl);
      
      if (progressFill) {
        const c = parseTime(currentTime);
        const t = parseTime(totalTime);
        if (!Number.isNaN(c) && !Number.isNaN(t) && t > 0) {
          progressFill.style.width = `${Math.min(100, Math.max(0, (c / t) * 100))}%`;
        } else {
          progressFill.style.width = "0%";
        }
      }
    } else {
      // Show static time mode
      if (config.displayTime === 'both') {
        show(currentContainer);
        setStaticTimeSVG(currentContainer, config.svgType);
        if (currentLabel) currentLabel.textContent = config.timeValue;
      } else if (config.displayTime === 'current') {
        show(currentContainer);
        setStaticTimeSVG(currentContainer, config.svgType);
        if (currentLabel) currentLabel.textContent = config.timeValue;
      } else if (config.displayTime === 'total') {
        show(totalContainer);
        setStaticTimeSVG(totalContainer, config.svgType);
        if (totalLabel) totalLabel.textContent = config.timeValue;
      } else {
        // none
        show(currentContainer);
        setStaticTimeSVG(currentContainer, config.svgType);
        if (currentLabel) currentLabel.textContent = config.timeValue;
      }
    }
  }

  function applyThirdLineLogic(card, statusPrefix, config) {
    const thirdLineLink = card.querySelector(".third-line-link");
    const thirdLineTextEl = card.querySelector(".third-line");
    
    if (statusPrefix === "Watching") {
      // Hide third line completely
      setRowVisibility(thirdLineLink, thirdLineTextEl, "");
      return;
    }
    
    if (statusPrefix === "Competing in" || statusPrefix === "Listening to") {
      const bigImageSrc = config.bigImageSrc || "";
      const bigImageTooltip = config.bigImageTooltip || "";
      const bigImageHref = config.bigImageHref || "";
      
      setAttr(thirdLineLink, "href", bigImageHref);
      setText(thirdLineTextEl, bigImageTooltip);
      setRowVisibility(thirdLineLink, thirdLineTextEl, bigImageTooltip);
      return;
    }
  }

  function setupButtons(card) {
    const btnGroup = card.querySelector(".button-group-container");
    const cardDetails = card.querySelector(".card-details");
    const buttons = Array.from(card.querySelectorAll(".card-action-btn"));

    if (!btnGroup || !cardDetails) return;

    const activeButtons = buttons.filter((btn) => (btn.textContent || "").trim().length > 0);
    const hasButtons = activeButtons.length > 0;

    cardDetails.classList.toggle("has-buttons", hasButtons);
    btnGroup.hidden = !hasButtons;
    btnGroup.classList.toggle("single-button-mode", activeButtons.length === 1);

    buttons.forEach((btn) => {
      const text = (btn.textContent || "").trim();
      if (text.length > 32) btn.textContent = text.slice(0, 32);
    });

    const tooLong = activeButtons.some((btn) => (btn.textContent || "").trim().length >= 19);
    btnGroup.classList.toggle("stacked-layout", tooLong);
  }

  function setupButtonLinks(card) {
    card.querySelectorAll(".card-action-btn").forEach((btn) => {
      const url = (btn.dataset.buttonUrl || "").trim();
      if (!url) return;

      btn.addEventListener("click", () => {
        window.open(url, "_blank", "noreferrer,noopener");
      });
    });
  }

  function initActivityCard(card) {
    if (!card || card.dataset.activityCardInitialized === "true") return;
    card.dataset.activityCardInitialized = "true";

    cleanLinks(card);
    setPlatformIcon(card);
    setupButtons(card);
    setupButtonLinks(card);
  }

  function initAllActivityCards(root = document) {
    root.querySelectorAll(".activity-card").forEach(initActivityCard);
  }

  function applyActivityCardConfig(card, config = {}) {
    if (!card) return;

    const statusPrefix = config.statusPrefix || "";

    // Fuck Playing state. It's so unnecesarily stupid. HOLY SHIT THIS TAKES SO MUCH SPECIAL THINGS
    // WHY IS PLAYING STATE SUCH A SPECIAL CHILD?! sorry.
    if (statusPrefix === "Playing") {
      setText(card.querySelector(".status-prefix"), statusPrefix);
      setText(card.querySelector(".custom-activity-name"), "special");

      const detailsLink = card.querySelector(".details-link");
      setAttr(detailsLink, "href", "");
      setText(card.querySelector(".details"), config.activityName);

      const stateLink = card.querySelector(".state-link");
      setAttr(stateLink, "href", config.detailsHref);
      setText(card.querySelector(".state"), config.detailsText);
      setRowVisibility(stateLink, card.querySelector(".state"), config.detailsText);

      const thirdLineLink = card.querySelector(".third-line-link");
      setAttr(thirdLineLink, "href", config.stateHref);
      setText(card.querySelector(".third-line"), config.stateText);


      const bigLink = card.querySelector(".big-image-link");
      setAttr(bigLink, "href", config.bigImageHref);
      setAttr(bigLink, "data-tooltip", config.bigImageTooltip);
      setImg(card.querySelector(".big-image"), config.bigImageSrc, "");

      // Small image
      const smallLink = card.querySelector(".small-image-link");
      setAttr(smallLink, "href", config.smallImageHref);
      setAttr(smallLink, "data-tooltip", config.smallImageTooltip);
      setImg(card.querySelector(".small-image"), config.smallImageSrc, "");

    } else {
      setText(card.querySelector(".status-prefix"), statusPrefix);
      setText(card.querySelector(".custom-activity-name"), config.activityName);


      // Big image
      const bigLink = card.querySelector(".big-image-link");
      setAttr(bigLink, "href", config.bigImageHref);
      setAttr(bigLink, "data-tooltip", config.bigImageTooltip);
      setImg(card.querySelector(".big-image"), config.bigImageSrc, "");

      // Small image
      const smallLink = card.querySelector(".small-image-link");
      setAttr(smallLink, "href", config.smallImageHref);
      setAttr(smallLink, "data-tooltip", config.smallImageTooltip);
      setImg(card.querySelector(".small-image"), config.smallImageSrc, "");

      // Text links
      const detailsLink = card.querySelector(".details-link");
      setAttr(detailsLink, "href", config.detailsHref);
      setText(card.querySelector(".details"), config.detailsText);

      const stateLink = card.querySelector(".state-link");
      setAttr(stateLink, "href", config.stateHref);
      setText(card.querySelector(".state"), config.stateText);
      setRowVisibility(stateLink, card.querySelector(".state"), config.stateText);

      // Third line
      const thirdLineLink = card.querySelector(".third-line-link");
      setAttr(thirdLineLink, "href", config.thirdLineHref);
      setText(card.querySelector(".third-line"), config.thirdLineText);
    }
      
    // Progress times
    const currentTime = config.currentTime;
    const totalTime = config.totalTime;
    setText(card.querySelector(".current-time"), currentTime);
    setText(card.querySelector(".total-time"), totalTime);
    
    applyThirdLineLogic(card, statusPrefix, config);
    setupTimeDisplay(card, statusPrefix, currentTime, totalTime);

    // Buttons
    const buttons = Array.from(card.querySelectorAll(".card-action-btn"));
    const btnConfigs = Array.isArray(config.buttons) ? config.buttons : [];

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const btnCfg = btnConfigs[i] || {};
      setText(btn, btnCfg.text);
      btn.dataset.buttonUrl = toStr(btnCfg.url).trim();
    }

    setPlatformIcon(card);
  }

  function renderActivityCard(config, { list, templateId = "activity-card-template" } = {}) {
    const targetList = list || document.querySelector("ul");
    if (!targetList) throw new Error("renderActivityCard: missing target list");

    const template = document.getElementById(templateId);
    if (!template || !(template instanceof HTMLTemplateElement)) {
      throw new Error(`renderActivityCard: missing <template id="${templateId}">`);
    }

    const fragment = template.content.cloneNode(true);
    const li = fragment.querySelector("li") || fragment.firstElementChild;
    const card = fragment.querySelector(".activity-card");
    if (!card) throw new Error("renderActivityCard: template missing .activity-card");

    applyActivityCardConfig(card, config);

    targetList.appendChild(fragment);
    initActivityCard(card);

    return { card, li };
  }

  function renderActivityCards(configs, options = {}) {
    const list = options.list;
    if (!list) throw new Error("renderActivityCards: options.list is required");
    list.textContent = "";
    (configs || []).forEach((cfg) => renderActivityCard(cfg, options));
  }

  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || data.type !== "render-activity-cards") return;
    
    const cards = Array.isArray(data.cards) ? data.cards : [];
    
    renderActivityCards(cards, {
      list: document.getElementById("cards"),
      templateId: "activity-card-template",
    });
    
    console.log("🎴 Rendered", cards.length, "activity cards");
  });

console.log("✅ activity-card.js loaded, listener registered");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAllActivityCards());
  } else {
    initAllActivityCards();
  }

  window.initActivityCard = initActivityCard;
  window.initAllActivityCards = initAllActivityCards;
  window.applyActivityCardConfig = applyActivityCardConfig;
  window.renderActivityCard = renderActivityCard;
  window.renderActivityCards = renderActivityCards;
})();
