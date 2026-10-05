(function(){
  "use strict";
  var config=window.PMX_CONFIG||{};
  var capsule=config.capsule||{};
  if(capsule.enabled){
    document.body.classList.add(capsule.className||"theme-rivalries");
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta&&capsule.themeColor) meta.setAttribute("content",capsule.themeColor);
  }
  var logo=document.querySelector(".brand-logo");
  if(logo) logo.src="../../assets/PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg";

  var track=document.getElementById("panel-track");
  var buttons=Array.from(document.querySelectorAll(".panel-nav button"));
  var position=document.getElementById("panel-position");
  var back=document.getElementById("back-hub-link");
  if(back&&window.PMX_ANALYTICS){
    var a=window.PMX_ANALYTICS.getAttribution();
    var u=new URL(back.getAttribute("href"),location.href);
    Object.keys(a).forEach(function(k){if(a[k])u.searchParams.set(k,a[k]);});
    back.href=u.href;
  }
  function active(){
    var width=track.clientWidth||1;
    return Math.max(0,Math.min(2,Math.round(track.scrollLeft/width)));
  }
  function update(){
    var i=active();
    buttons.forEach(function(b,n){b.setAttribute("aria-pressed",n===i?"true":"false");});
    position.textContent=(i+1)+" / 3";
  }
  buttons.forEach(function(b){
    b.addEventListener("click",function(){
      var i=Number(b.dataset.index)||0;
      track.scrollTo({left:i*track.clientWidth,behavior:"smooth"});
    });
  });
  track.addEventListener("scroll",function(){requestAnimationFrame(update);},{passive:true});
  update();
})();