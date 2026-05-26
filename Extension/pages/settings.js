const ORIGIN = browser.runtime.getURL("").replace(/\/$/, "");

const CONFIGS = {
  YouTube: [
    {
      statusPrefix: "Watching",
      activityName: "YouTube",

      detailsText: "FEUER IN DER LUNGE [live]",
      detailsHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      stateText: "By TJ_bb",
      stateHref: "https://www.youtube.com/@TJ_bb",

      bigImageSrc: "https://img.youtube.com/vi/t4FgfXIB1Zc/maxresdefault.jpg",
      bigImageTooltip: "BIG TEXT OF DOOM",
      bigImageHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      smallImageSrc:
        "https://i.scdn.co/image/ab67616d00001e0212084d9289486e6b5c3f0404",
      smallImageHref: "https://www.youtube.com/@TJ_bb",
      smallImageTooltip: "TJ_bb",

      currentTime: "2:34",
      totalTime: "15:45",

      buttons: [
        // { text: "", url: "" },
        {
          text: "Watch on Youtube",
          url: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",
        },
        { text: "", url: "" },
        // { text: "Visit Channel", url: "https://www.youtube.com/@TJ_bb" },
      ],
    },
  ],
  YouTube_Music: [
    {
      statusPrefix: "Listening to",
      activityName: "YouTube Music",

      detailsText: "FEUER IN DER LUNGE [live]",
      detailsHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      stateText: "By TJ_bb",
      stateHref: "https://www.youtube.com/@TJ_bb",

      bigImageSrc: "https://img.youtube.com/vi/t4FgfXIB1Zc/maxresdefault.jpg",
      bigImageTooltip: "BIG TEXT OF DOOM",
      bigImageHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      smallImageSrc:
        "https://i.scdn.co/image/ab67616d00001e0212084d9289486e6b5c3f0404",
      smallImageHref: "https://www.youtube.com/@TJ_bb",
      smallImageTooltip: "TJ_bb",

      currentTime: "2:34",
      totalTime: "15:45",

      buttons: [
        // { text: "", url: "" },
        {
          text: "Watch on Youtube",
          url: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",
        },
        { text: "", url: "" },
        // { text: "Visit Channel", url: "https://www.youtube.com/@TJ_bb" },
      ],
    },
  ],
  CustomRPC: [
    {
      statusPrefix: "Listening to",
      activityName: "CustomRPC",

      detailsText: "FEUER IN DER LUNGE [live]",
      detailsHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      stateText: "By TJ_bb",
      stateHref: "https://www.youtube.com/@TJ_bb",

      bigImageSrc: "https://img.youtube.com/vi/t4FgfXIB1Zc/maxresdefault.jpg",
      bigImageTooltip: "BIG TEXT OF DOOM",
      bigImageHref: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",

      smallImageSrc:
        "https://i.scdn.co/image/ab67616d00001e0212084d9289486e6b5c3f0404",
      smallImageHref: "https://www.youtube.com/@TJ_bb",
      smallImageTooltip: "TJ_bb",

      currentTime: "2:34",
      totalTime: "15:45",

      buttons: [
        // { text: "", url: "" },
        {
          text: "Watch on Youtube",
          url: "https://www.youtube.com/watch?v=t4FgfXIB1Zc",
        },
        { text: "", url: "" },
        // { text: "Visit Channel", url: "https://www.youtube.com/@TJ_bb" },
      ],
    },
  ],
};

function send(id) {
  const iframe = document.getElementById(id);
  const onReady = () =>
    iframe.contentWindow?.postMessage(
      { type: "render-activity-cards", cards: CONFIGS[id] },
      ORIGIN,
    );
  iframe?.contentDocument?.readyState === "complete"
    ? onReady()
    : iframe?.addEventListener("load", onReady, { once: true });
}

Object.keys(CONFIGS).forEach(send);