// 色関連。主にWebGL用。hslで2種類あるのは、補間の仕方に流儀があるため（softLightとoverlay）
// 黒と白の間をどう補間するかっていうめんどくさい話があるのよ。
const foxColor = (function(){
  const color = {};

  const {clamp} = foxMathTools;

  const presetColors = {
    aliceblue:[0.9411764705882353, 0.9725490196078431, 1],
    antiquewhite:[0.9803921568627451, 0.9215686274509803, 0.8431372549019608],
    aqua:[0, 1, 1],
    aquamarine:[0.4980392156862745, 1, 0.8313725490196079],
    azure:[0.9411764705882353, 1, 1],
    beige:[0.9607843137254902, 0.9607843137254902, 0.8627450980392157],
    bisque:[1, 0.8941176470588236, 0.7686274509803922],
    black:[0, 0, 0],
    blanchedalmond:[1, 0.9215686274509803, 0.803921568627451],
    blue:[0, 0, 1],
    blueviolet:[0.5411764705882353, 0.16862745098039217, 0.8862745098039215],
    brown:[0.6470588235294118, 0.16470588235294117, 0.16470588235294117],
    burlywood:[0.8705882352941177, 0.7215686274509804, 0.5294117647058824],
    cadetblue:[0.37254901960784315, 0.6196078431372549, 0.6274509803921569],
    chartreuse:[0.4980392156862745, 1, 0],
    chocolate:[0.8235294117647058, 0.4117647058823529, 0.11764705882352941],
    coral:[1, 0.4980392156862745, 0.3137254901960784],
    cornflowerblue:[0.39215686274509803, 0.5843137254901961, 0.9294117647058824],
    cornsilk:[1, 0.9725490196078431, 0.8627450980392157],
    crimson:[0.8627450980392157, 0.0784313725490196, 0.23529411764705882],
    cyan:[0, 1, 1],
    darkblue:[0, 0, 0.5450980392156862],
    darkcyan:[0, 0.5450980392156862, 0.5450980392156862],
    darkgoldenrod:[0.7215686274509804, 0.5254901960784314, 0.043137254901960784],
    darkgray:[0.6627450980392157, 0.6627450980392157, 0.6627450980392157],
    darkgreen:[0, 0.39215686274509803, 0],
    darkgrey:[0.6627450980392157, 0.6627450980392157, 0.6627450980392157],
    darkkhaki:[0.7411764705882353, 0.7176470588235294, 0.4196078431372549],
    darkmagenta:[0.5450980392156862, 0, 0.5450980392156862],
    darkolivegreen:[0.3333333333333333, 0.4196078431372549, 0.1843137254901961],
    darkorange:[1, 0.5490196078431373, 0],
    darkorchid:[0.6, 0.19607843137254902, 0.8],
    darkred:[0.5450980392156862, 0, 0],
    darksalmon:[0.9137254901960784, 0.5882352941176471, 0.47843137254901963],
    darkseagreen:[0.5607843137254902, 0.7372549019607844, 0.5607843137254902],
    darkslateblue:[0.2823529411764706, 0.23921568627450981, 0.5450980392156862],
    darkslategray:[0.1843137254901961, 0.30980392156862746, 0.30980392156862746],
    darkslategrey:[0.1843137254901961, 0.30980392156862746, 0.30980392156862746],
    darkturquoise:[0, 0.807843137254902, 0.8196078431372549],
    darkviolet:[0.5803921568627451, 0, 0.8274509803921568],
    deeppink:[1, 0.0784313725490196, 0.5764705882352941],
    deepskyblue:[0, 0.7490196078431373, 1],
    dimgray:[0.4117647058823529, 0.4117647058823529, 0.4117647058823529],
    dimgrey:[0.4117647058823529, 0.4117647058823529, 0.4117647058823529],
    dodgerblue:[0.11764705882352941, 0.5647058823529412, 1],
    firebrick:[0.6980392156862745, 0.13333333333333333, 0.13333333333333333],
    floralwhite:[1, 0.9803921568627451, 0.9411764705882353],
    forestgreen:[0.13333333333333333, 0.5450980392156862, 0.13333333333333333],
    fuchsia:[1, 0, 1],
    gainsboro:[0.8627450980392157, 0.8627450980392157, 0.8627450980392157],
    ghostwhite:[0.9725490196078431, 0.9725490196078431, 1],
    gold:[1, 0.8431372549019608, 0],
    goldenrod:[0.8549019607843137, 0.6470588235294118, 0.12549019607843137],
    gray:[0.5019607843137255, 0.5019607843137255, 0.5019607843137255],
    green:[0, 0.5019607843137255, 0],
    greenyellow:[0.6784313725490196, 1, 0.1843137254901961],
    grey:[0.5019607843137255, 0.5019607843137255, 0.5019607843137255],
    honeydew:[0.9411764705882353, 1, 0.9411764705882353],
    hotpink:[1, 0.4117647058823529, 0.7058823529411765],
    indianred:[0.803921568627451, 0.3607843137254902, 0.3607843137254902],
    indigo:[0.29411764705882354, 0, 0.5098039215686274],
    ivory:[1, 1, 0.9411764705882353],
    khaki:[0.9411764705882353, 0.9019607843137255, 0.5490196078431373],
    lavender:[0.9019607843137255, 0.9019607843137255, 0.9803921568627451],
    lavenderblush:[1, 0.9411764705882353, 0.9607843137254902],
    lawngreen:[0.48627450980392156, 0.9882352941176471, 0],
    lemonchiffon:[1, 0.9803921568627451, 0.803921568627451],
    lightblue:[0.6784313725490196, 0.8470588235294118, 0.9019607843137255],
    lightcoral:[0.9411764705882353, 0.5019607843137255, 0.5019607843137255],
    lightcyan:[0.8784313725490196, 1, 1],
    lightgoldenrodyellow:[0.9803921568627451, 0.9803921568627451, 0.8235294117647058],
    lightgray:[0.8274509803921568, 0.8274509803921568, 0.8274509803921568],
    lightgreen:[0.5647058823529412, 0.9333333333333333, 0.5647058823529412],
    lightgrey:[0.8274509803921568, 0.8274509803921568, 0.8274509803921568],
    lightpink:[1, 0.7137254901960784, 0.7568627450980392],
    lightsalmon:[1, 0.6274509803921569, 0.47843137254901963],
    lightseagreen:[0.12549019607843137, 0.6980392156862745, 0.6666666666666666],
    lightskyblue:[0.5294117647058824, 0.807843137254902, 0.9803921568627451],
    lightslategray:[0.4666666666666667, 0.5333333333333333, 0.6],
    lightslategrey:[0.4666666666666667, 0.5333333333333333, 0.6],
    lightsteelblue:[0.6901960784313725, 0.7686274509803922, 0.8705882352941177],
    lightyellow:[1, 1, 0.8784313725490196],
    lime:[0, 1, 0],
    limegreen:[0.19607843137254902, 0.803921568627451, 0.19607843137254902],
    linen:[0.9803921568627451, 0.9411764705882353, 0.9019607843137255],
    magenta:[1, 0, 1],
    maroon:[0.5019607843137255, 0, 0],
    mediumaquamarine:[0.4, 0.803921568627451, 0.6666666666666666],
    mediumblue:[0, 0, 0.803921568627451],
    mediumorchid:[0.7294117647058823, 0.3333333333333333, 0.8274509803921568],
    mediumpurple:[0.5764705882352941, 0.4392156862745098, 0.8588235294117647],
    mediumseagreen:[0.23529411764705882, 0.7019607843137254, 0.44313725490196076],
    mediumslateblue:[0.4823529411764706, 0.40784313725490196, 0.9333333333333333],
    mediumspringgreen:[0, 0.9803921568627451, 0.6039215686274509],
    mediumturquoise:[0.2823529411764706, 0.8196078431372549, 0.8],
    mediumvioletred:[0.7803921568627451, 0.08235294117647059, 0.5215686274509804],
    midnightblue:[0.09803921568627451, 0.09803921568627451, 0.4392156862745098],
    mintcream:[0.9607843137254902, 1, 0.9803921568627451],
    mistyrose:[1, 0.8941176470588236, 0.8823529411764706],
    moccasin:[1, 0.8941176470588236, 0.7098039215686275],
    navajowhite:[1, 0.8705882352941177, 0.6784313725490196],
    navy:[0, 0, 0.5019607843137255],
    oldlace:[0.9921568627450981, 0.9607843137254902, 0.9019607843137255],
    olive:[0.5019607843137255, 0.5019607843137255, 0],
    olivedrab:[0.4196078431372549, 0.5568627450980392, 0.13725490196078433],
    orange:[1, 0.6470588235294118, 0],
    orangered:[1, 0.27058823529411763, 0],
    orchid:[0.8549019607843137, 0.4392156862745098, 0.8392156862745098],
    palegoldenrod:[0.9333333333333333, 0.9098039215686274, 0.6666666666666666],
    palegreen:[0.596078431372549, 0.984313725490196, 0.596078431372549],
    paleturquoise:[0.6862745098039216, 0.9333333333333333, 0.9333333333333333],
    palevioletred:[0.8588235294117647, 0.4392156862745098, 0.5764705882352941],
    papayawhip:[1, 0.9372549019607843, 0.8352941176470589],
    peachpuff:[1, 0.8549019607843137, 0.7254901960784313],
    peru:[0.803921568627451, 0.5215686274509804, 0.24705882352941178],
    pink:[1, 0.7529411764705882, 0.796078431372549],
    plum:[0.8666666666666667, 0.6274509803921569, 0.8666666666666667],
    powderblue:[0.6901960784313725, 0.8784313725490196, 0.9019607843137255],
    purple:[0.5019607843137255, 0, 0.5019607843137255],
    rebeccapurple:[0.4, 0.2, 0.6],
    red:[1, 0, 0],
    rosybrown:[0.7372549019607844, 0.5607843137254902, 0.5607843137254902],
    royalblue:[0.2549019607843137, 0.4117647058823529, 0.8823529411764706],
    saddlebrown:[0.5450980392156862, 0.27058823529411763, 0.07450980392156863],
    salmon:[0.9803921568627451, 0.5019607843137255, 0.4470588235294118],
    sandybrown:[0.9568627450980393, 0.6431372549019608, 0.3764705882352941],
    seagreen:[0.1803921568627451, 0.5450980392156862, 0.3411764705882353],
    seashell:[1, 0.9607843137254902, 0.9333333333333333],
    sienna:[0.6274509803921569, 0.3215686274509804, 0.17647058823529413],
    silver:[0.7529411764705882, 0.7529411764705882, 0.7529411764705882],
    skyblue:[0.5294117647058824, 0.807843137254902, 0.9215686274509803],
    slateblue:[0.41568627450980394, 0.35294117647058826, 0.803921568627451],
    slategray:[0.4392156862745098, 0.5019607843137255, 0.5647058823529412],
    slategrey:[0.4392156862745098, 0.5019607843137255, 0.5647058823529412],
    snow:[1, 0.9803921568627451, 0.9803921568627451],
    springgreen:[0, 1, 0.4980392156862745],
    steelblue:[0.27450980392156865, 0.5098039215686274, 0.7058823529411765],
    tan:[0.8235294117647058, 0.7058823529411765, 0.5490196078431373],
    teal:[0, 0.5019607843137255, 0.5019607843137255],
    thistle:[0.8470588235294118, 0.7490196078431373, 0.8470588235294118],
    tomato:[1, 0.38823529411764707, 0.2784313725490196],
    turquoise:[0.25098039215686274, 0.8784313725490196, 0.8156862745098039],
    violet:[0.9333333333333333, 0.5098039215686274, 0.9333333333333333],
    wheat:[0.9607843137254902, 0.8705882352941177, 0.7019607843137254],
    white:[1, 1, 1],
    whitesmoke:[0.9607843137254902, 0.9607843137254902, 0.9607843137254902],
    yellow:[1, 1, 0],
    yellowgreen:[0.6039215686274509, 0.803921568627451, 0.19607843137254902],
  }

  // HSVをRGBにしてくれる関数. ただし0～1で指定してね
  function hsv2rgb(h, s, v){
    h = clamp(h, 0, 1);
    s = clamp(s, 0, 1);
    v = clamp(v, 0, 1);
    let _r = clamp(0, Math.abs(((6 * h) % 6) - 3) - 1, 1);
    let _g = clamp(0, Math.abs(((6 * h + 4) % 6) - 3) - 1, 1);
    let _b = clamp(0, Math.abs(((6 * h + 2) % 6) - 3) - 1, 1);
    _r = _r * _r * (3 - 2 * _r);
    _g = _g * _g * (3 - 2 * _g);
    _b = _b * _b * (3 - 2 * _b);
    const result = {};
    result.r = v * (1 - s + s * _r);
    result.g = v * (1 - s + s * _g);
    result.b = v * (1 - s + s * _b);
    return result;
  }

  // 直接配列の形で返したい場合はこちら
  function hsvArray(h, s, v){
    const obj = hsv2rgb(h, s, v);
    return [obj.r, obj.g, obj.b];
  }

  // softLight関数
  function _softLight(sr, sg, sb, dr, dg, db){
    const func = (s, d) => {
      if(s < 0.5){
        return 2*s*d + d*d*(1-2*s);
      }
      return 2*d*(1-s) + Math.sqrt(d)*(2*s-1);
    }
    return {r:func(sr,dr), g:func(sg,dg), b:func(sb,db)};
  }

  // overlay関数
  function _overlay(sr, sg, sb, dr, dg, db){
    const func = (s, d) => {
      if(d < 0.5){
        return 2*s*d;
      }
      return 2*(s+d-s*d) - 1;
    }
    return {r:func(sr,dr), g:func(sg,dg), b:func(sb,db)};
  }

  // softLightを使ったhsl2rgb関数
  function hsl2rgb_soft(h, s, l){
    const hsv = hsv2rgb(h, s, 1);
    l = clamp(0, l, 1);
    return _softLight(hsv.r, hsv.g, hsv.b, l, l, l);
  }

  function hslArray_soft(h, s, l){
    const obj = hsl2rgb_soft(h, s, l);
    return [obj.r, obj.g, obj.b];
  }

  // overlayを使ったhsl2rgb関数
  function hsl2rgb_overlay(h, s, l){
    const hsv = hsv2rgb(h, s, 1);
    l = clamp(0, l, 1);
    return _overlay(hsv.r, hsv.g, hsv.b, l, l, l);
  }

  function hslArray_overlay(h, s, l){
    const obj = hsl2rgb_overlay(h, s, l);
    return [obj.r, obj.g, obj.b];
  }

  // 長さ4未満の指定を4に揃える
  // たとえばrgbだけしか指定しなくてもalphaを1にしてくれる
  function _validateColorInput(col, defaultValue = 1){
    switch(col.length){
      case 0:
        return [defaultValue, defaultValue, defaultValue, defaultValue];
      case 1:
        return [col[0], col[0], col[0], defaultValue];
      case 2:
        return [col[0], col[0], col[0], col[1]];
      case 3:
        return [col[0], col[1], col[2], defaultValue];
    }
    // 4以上の場合は初めの4つでいい
    return col.slice(0, 4);
  }

  // "AA445512"とかそういうのを変換する
  // parseInt("AA",16)とかするみたい。
  function _parseHexToColor(hexString){
    const result = [];
    for(let i=0; i<8; i+=2){
      const h = hexString.slice(i, i+2);
      result.push(parseInt(hexString.slice(i, i+2), 16)/255);
    }
    return result;
  }

  // 色生成関数
  // 結果は常に長さ4の配列になる
  function coulour(...args){
    // argumentsは配列では無いので、配列にする処理が必要。
    const arg = [...arguments];
    if (typeof arg[0] === 'number') {
      // 第一引数が数の場合はそれ以降も数であるとみなす。エラー処理は特に無し。
      return clamp(0, _validateColorInput(arg), 1);
    } else if (Array.isArray(arg[0])) {
      // 配列の場合は配列をそのまま使う。この場合2つ目以降があっても無視される。
      return coulour(...arg[0]);
    } else if (typeof arg[0] === 'string') {
      const identifier = arg[0];

      // 16進数指定を使う場合は文字列以外の情報は使用しない。
      if (identifier[0] === '#') {
        const h = arg[0].slice(1);
        switch(h.length){
          case 0: // default is white.
            return [1,1,1,1];
          case 1: // 16段階グレースケール, 不透明
            return _parseHexToColor(h[0]+h[0]+h[0]+h[0]+h[0]+h[0]+"FF");
          case 2: // 16段階グレースケール, アルファ
            return _parseHexToColor(h[0]+h[0]+h[0]+h[0]+h[0]+h[0]+h[1]+h[1]);
          case 3: // 16段階RGB, 不透明
            return _parseHexToColor(h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+"FF");
          case 4: // 16段階RGB, アルファ
            return _parseHexToColor(h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]);
          case 5: // 16段階RGB, 256段階アルファ
            return _parseHexToColor(h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[4]);
          case 6: // 256段階RGB, 不透明
            return _parseHexToColor(h+"FF");
          case 7: // 256段階RGB, 16段階アルファ
            return _parseHexToColor(h+h[6]);
          default: // 256段階RGB, アルファ
            return _parseHexToColor(h);
        }
      }

      // 以降、頭以外の引数からなる配列を取ったものを使う
      // ただしarg[1]が配列の場合はそれを使う。たとえば("rgb255", [36, 49, 163])のような使い方。
      // それもできた方がいいでしょう。でないといちいち("rgb255", ...someArrayObject) のように書かなければならないので。
      const col = (Array.isArray(arg[1]) ? arg[1] : arg.slice(1));

      // preset指定を使う場合
      const presetColor = presetColors[identifier];
      if (presetColor !== undefined) {
        // alphaが未指定、または第2引数がinvalidの場合は不透明とする
        if (col.length === 0 || (typeof col[0] !== 'number')) {
          // この場合alphaは1とする
          return [...presetColor, 1];
        } else {
          return [...presetColor, clamp(0, col[0], 1)];
        }
      }

      // hsvなどの色指定を使う場合
      const data = _validateColorInput(col, (identifier === "rgb255" ? 255 : 1));
      // この時点で長さ4なので問題ないね。
      switch(identifier){
        case "rgb":
          // そのまま返す
          return clamp(0, data, 1);
        case "rgb255":
          // 255で割る
          return data.map((x) => clamp(0, x/255, 1));
        case "hsv":
          const hsvColor = hsvArray(...data.slice(0, 3));
          hsvColor.push(data[3]);
          return hsvColor;
        case "hsl":
        case "hsl_soft":
          const hslColor_soft = hslArray_soft(...data.slice(0, 3));
          hslColor_soft.push(data[3]);
          return hslColor_soft;
        case "hsl_overlay":
          const hslColor_overlay = hslArray_overlay(...data.slice(0, 3));
          hslColor_overlay.push(data[3]);
          return hslColor_overlay;
      }
    }
    return [1,1,1,1]; // default is white.
  }

  // 長さ3のrgb形式もあった方がいいよねって話。PBR実装するにあたり用意しました。
  function coulour3(...args){
    return coulour(...args).slice(0, 3);
  }

  color.presetColors = presetColors; // 色パレット
  color.hsv2rgb = hsv2rgb;
  color.hsvArray = hsvArray;
  color.hsl2rgb_soft = hsl2rgb_soft;
  color.hslArray_soft = hslArray_soft;
  color.hsl2rgb_overlay = hsl2rgb_overlay;
  color.hslArray_overlay = hslArray_overlay;
  color.coulour = coulour; // 汎用色指定関数
  color.coulour3 = coulour3; // ...の、RGB版

  return color;
})();
