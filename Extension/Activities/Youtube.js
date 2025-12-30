let videoElement = null;

function getCleanTitle() {
  const raw = document.title || "";
  const cleaned = raw
    .replace(/^\(\d+\)\s/, "")
    .replace(/\s-\sYouTube$/i, "")
    .trim();

  if (!cleaned || cleaned.toLowerCase() === "youtube") {
    return null;
  }

  return cleaned;
}
function hasOwnerAndImgInDocument() {
    // returns true if it doesnt have it (is multichannel)
    return !document.querySelector('#owner #avatar img')?.src
}
function getAuthorData() {
    /*
    ❝BECAUSE THIS DUMBASS OF AQ COULDNT MAKE IT (WITHOUT A TRY CATCH (LIKE WTF))
    I NEEDED TO THAT FOR HIM 😭😭😭😭😭😭
    (love ya)
    -# (property of tamino1230 (i get 1%))❞ -Tamino1230

    full credit goes to https://github.com/Tamino1230 for this section
    */
    var multiChannelVideo = false

    if (hasOwnerAndImgInDocument()) {
        multiChannelVideo = true
    }

    if (!multiChannelVideo) {
        const authorLink = document.querySelector('#owner #channel-name a');
        return {
            name: authorLink ? authorLink.innerText.trim() : "Unknown Author",
            url: authorLink ? authorLink.href : "",
            avatar: document.querySelector('#owner #avatar img')?.src
        }
    }

    // Multi Channel Video
    const owner = document.querySelector('#owner');
    const avatarElements = owner.querySelectorAll('#avatar-stack img, #avatar img');
    const allAvatars = Array.from(avatarElements).map(img => img.src);
    const uploadInfo = owner.querySelector('#upload-info');
    const fullName = uploadInfo ? uploadInfo.innerText.replace(/\n/g, '').replace(/\s+/g, ' ').trim() : "Unknown Author";
    const avatarLink = owner.querySelector('a.ytd-video-owner-renderer');
    let url = (avatarLink && avatarLink.href && !avatarLink.href.includes('javascript')) ? avatarLink.href : "";

    // const individualNames = fullName.split(/\s+and\s+|\s*,\s*/); // Doesn't work because if it's more than 2 people it says "Youtube and 2 more"...
    return {
        name: fullName,
        url: url,
        avatar: allAvatars[allAvatars.length - 1] || "" // for some fucking reason the last image is the real author and not the first
    };
}

function sendToBackground(action, data = {}) {
  const title = getCleanTitle();
  if (!title) return;

  const video = document.querySelector('video');
  const authorData = getAuthorData();

  const payload = {
    url: window.location.href,
    title: title,
    author: authorData.name,
    author_url: authorData.url,
    author_avatar: authorData.avatar,
    time: video ? video.currentTime : 0,
    duration: video ? video.duration : 0,
    timestamp: new Date().toISOString()
  };

  console.log(payload);

  browser.runtime.sendMessage({
    action: action,
    payload: payload
  });
}

function attachListeners() {
  const video = document.querySelector('video');
  if (!video) return;

  if (video !== videoElement) {
    videoElement = video;

    const triggerSync = () =>
      sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");

    video.addEventListener('play', triggerSync);
    video.addEventListener('pause', () => {
      if (!video.seeking) triggerSync();
    });
    video.addEventListener('seeked', triggerSync);
    video.addEventListener('loadedmetadata', triggerSync);

    if (video.readyState >= 1) triggerSync();
  }
}


async function showToast() {
    message = "HELLO TAMINO"
    const settings = await browser.storage.local.get({
        rpcEnabled: true,
        informationPopups: true
    });
    if (!settings.rpcEnabled || !settings.informationPopups) return

    const toast = document.createElement('div');
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontFamily: 'Roboto, Arial, sans-serif',
        zIndex: '9999',
        pointerEvents: 'none',
        opacity: '100',
        transition: 'opacity 0.5s ease-in-out'
    });

    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}


document.addEventListener('yt-navigate-finish', () => {
  showToast();
  setTimeout(attachListeners, 500)
});

setInterval(attachListeners, 2000);
