'use strict';
// Enmascara solo espacios publicitarios de nombres conocidos. No pulsa banners de cookies.
const AD_CSS=Object.freeze(`
  ins.adsbygoogle,iframe[id^="google_ads_iframe"],
  [id^="div-gpt-ad"], [data-ad-slot][class*="ad"],
  .ad-container[data-ad-unit], .taboola-container, .OUTBRAIN,
  [data-widget-type="feed"].trc_rbox_outer,
  ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer,
  ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, ytd-promoted-video-renderer,
  ytd-companion-slot-renderer, ytd-action-companion-ad-renderer,
  ytd-ad-inline-playback-renderer, ytd-promoted-sparkles-text-search-renderer,
  #player-ads, #masthead-ad, #panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
  .ytp-ad-overlay-container, .ytp-ad-overlay-slot, .ytp-ad-action-interstitial,
  .ytp-ad-survey, .ytp-ad-message-container, .ytp-ad-text-overlay,
  .ytp-ad-image-overlay, .ytp-ad-player-overlay,
  .adsbygoogle, .adthrive-ad, .ad-unit, .advertisement[data-ad-slot],
  [data-testid="placement-advertisement"] {display:none !important;}
`);
function canInject(tab,settings){return Boolean(tab&&settings?.blockTrackers&&
  typeof tab.url==='string'&&/^https?:\/\//i.test(tab.url)&&
  !settings.trackerExceptions?.some(site=>tab.url.startsWith(site+'/')||tab.url===site));}
module.exports={AD_CSS,canInject};
