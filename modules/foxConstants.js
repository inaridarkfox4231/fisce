const foxConstants = (function(){
  const constants = {};
  constants.DPR = window.devicePixelRatio;
  constants.WIW = window.innerWidth;
  constants.WIH = window.innerHeight;
  constants.PI = Math.PI;
  constants.TAU = Math.PI*2;
  constants.HALF_PI = Math.PI*0.5;

  return constants;
})();
