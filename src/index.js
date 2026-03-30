/**
 * fisce.js<br>
 * npm github test.<br>
 * GitHub repository: {@link https://github.com/inaridarkfox4231/fisce}
 * @module fisce
 * @copyright 2026
 * @author fisce
 * @license ISC
 * @version 1.2.1
 */

(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? factory(exports)
    : typeof define === "function" && define.amd
    ? define(["exports"], factory)
    : ((global = global || self), factory((global.fisce = {})));
})(this, function (exports) {
  "use strict";

  /*
    今後の移植予定
    Timer
    FisceToyBoxのいろいろ
    Geometry関連(v,n,f,あとはoptionでc,uv,l)

    板ポリ芸やライティング、shaderの改変機構、テクスチャ関連、VAO関連
    1.1.0～1.1.15
    Tessellation関連を追加。0と1はバグってるので使うなら2以降で。最新は15.
    1.2.0～
    Sequencer関連が落ち着いたのでマイナー更新。
    時計関連はClockだけ残して後は削除。
  */

  // ------------------------------------------------------------------------------------------------------------------------------------------ //
  const foxErrors = (function(){
    const errors = {};

    // E_Type.
    // タイプ関連のエラーを扱う。jsは関数の仕様によっては型チェックしないので。それが便利な場合もあるけどね。
    class E_Type extends Error{
      constructor(data, ...params){
        super(...params);
        // nameとvalueの既定値は不要でしょう。混乱の原因になる。
        const {name, value, info = ""} = data;
        this.type = 'E_Type';
        this.variable_name = name;
        this.variable_value = value;
        this.info = info;
      }
      show(){
        console.error(`種類：${this.type}, 変数名：${this.variable_name}, 変数の値：${this.variable_value}, 詳細：${this.info}`);
      }
    }

    // WebGLのgetErrorのラッパ関数。単にErrorだと分かりにくいのでgetWebGLErrorとする。
    // 結局これしか取得できないので、このまま供用してしまおう。メッセージ出ないんですよ...
    // codeとinfoに分かれているのはcodeを見て0ならスルー、0でないならそこで切る、といったことができると嬉しいので。
    function getWebGLError(gl){
      const errCode = gl.getError();
      switch(errCode){
        case gl.NO_ERROR:
          return {code:gl.NO_ERROR, info: "NO_ERROR: エラーはありません"};
        case gl.INVALID_ENUM:
          return {code:gl.INVALID_ENUM, info: "INVALID_ENUM: 不正な値が設定されました"};
        case gl.INVALID_VALUE:
          return {code:gl.INVALID_VALUE, info: "INVALID_VALUE: 値の範囲が不正です"};
        case gl.INVALID_OPERATION:
          return {code:gl.INVALID_OPERATION, info:"INVALID_OPERATION: その処理は許可されていません"};
        case gl.INVALID_FRAMEBUFFER_OPERATION:
          return {code:gl.INVALID_FRAMEBUFFER_OPERATION, info: "INVALID_FRAMEBUFFER_OPERATION: framebufferの設定に問題がある可能性があります"};
        case gl.OUT_OF_MEMORY:
          return {code:gl.OUT_OF_MEMORY, info: "OUT_OF_MEMORY: メモリ不足です"};
        case gl.CONTEXT_LOST_WEBGL:
          return {code:gl.CONTEXT_LOST_WEBGL, info: "CONTEXT_LOST_WEBGL: コンテキストが破棄されました"};
      }
      return ""; // empty string
    }

    errors.E_Type = E_Type;
    errors.getWebGLError = getWebGLError;

    return errors;
  })();

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

  const foxMathTools = (function(){
    const tools = {};

    // fract
    // 対象となる数からそれ以下の最大の整数を減じたものを返す
    // fract(2.31): 0.31
    // fract(-0.44): 0.56
    function fract(t){
      return t - Math.floor(t);
    }

    // clamp
    // 第一引数に最小値、第二引数に設定値、第三引数に最大値を取る。数直線のイメージ。
    // cssを参考にしました。
    // clamp(-2, -3.14, 1): -2
    // clamp(-2, 4.9, 1): 1
    // clamp(-2, -0.5, 1): -0.5
    // clamp(2.5, [0, 1, 2, 3, 4, 5], 3.5): [2.5, 2.5, 2.5, 3, 3.5, 3.5]
    function clamp(minValue, targetValue, maxValue){
      // minValue > maxValueの場合は逆にして適用する
      if(minValue > maxValue){
        return clamp(maxValue, targetValue, minValue);
      }
      // 配列の場合は各成分に適用する
      if(Array.isArray(targetValue)){
        const result = [];
        for(let i=0; i<targetValue.length; i++){
          result.push(clamp(minValue, targetValue[i], maxValue));
        }
        return result;
      }
      // 数字の場合
      return Math.max(minValue, Math.min(maxValue, targetValue));
    }

    class RandomSystem{
      constructor(){
        this.seed = -1;
        this.val = 0;
        // m is basically chosen to be large (as it is the max period)
        // and for its relationships to a and c
        this.m = 4294967296;
        // a - 1 should be divisible by m's prime factors
        this.a = 1664525;
        // c and m should be co-prime
        this.c = 1013904223;
      }
      setSeed(seed){
        // seed値を決める。
        if(seed === undefined){
          this.seed = ((Math.random() * this.m) >>> 0);
        }else{
          this.seed = (seed >>> 0);
        }
        this.val = this.seed;
      }
      breakSeed(){
        // seedを解除する
        this.seed = -1;
        this.val = 0;
      }
      rdm(){
        // 「次の値」を返す。
        if(this.seed >= 0){
          this.val = (this.a * this.val + this.c) % this.m;
          return this.val / this.m;
        }
        return Math.random();
      }
      random(...args){
        // とりあえず引数無し、引数1つ、引数2つ、引数が配列、でいいですね。
        // 引数無し：通常random, 引数1つ：0～その数、
        // 引数2つ：それらの間、引数配列：その中のどれか。
        switch(args.length){
          case 0:
            return this.rdm();
          case 1:
            if(typeof args[0] === 'number'){
              return this.rdm() * args[0];
            }else if(Array.isArray(args[0])){
              const l = args[0].length;
              return args[0][Math.floor(this.rdm()*l) % l];
            }
            return null;
          case 2:
            if(typeof args[0] === 'number' && typeof args[1] === 'number'){
              return args[0] + this.rdm() * (args[1] - args[0]);
            }
            return null;
        }
        return null;
      }
      shuffle(a, immutable = false){
        // デフォルトは「変える」。
        // 変えない場合は新しいそれを返す。
        const b = Array.from(a, (x, i) => { return {value:x, seed:this.rdm()}; });
        b.sort((u, v) => u.seed - v.seed);
        const c = b.map(u => u.value);
        if(immutable){ return c; }
        for(let i=0; i<a.length; i++){ a[i] = c[i]; }
        return a;
      }
    }

    // いずれutilに加えるつもり
    class Noise3D{
      constructor(){
        this.perlin = null;
        this.size = 4095; // 2^12-1
        this.yWrapByte = 4;
        this.yWrap = (1 << this.yWrapByte);
        this.zWrapByte = 8;
        this.zWrap = (1 << this.zWrapByte);
        this.octaves = 4;
        this.ampFallOff = 0.5;
        this.seed = undefined;
      }
      setSeed(seed){
        /* seed値を決めてperlinを設定する */
        /* これにより得られる値はseedの値で完全に決まる */
        // m is basically chosen to be large (as it is the max period)
        // and for its relationships to a and c
        const m = 4294967296;
        // a - 1 should be divisible by m's prime factors
        const a = 1664525;
        // c and m should be co-prime
        const c = 1013904223;
        let val;
        if(seed === undefined){
          val = ((Math.random() * m) >>> 0);
        }else{
          val = (seed >>> 0);
        }
        this.seed = val;
        this.perlin = new Array(this.size + 1);
        for(let i = 0; i < this.perlin.length; i++){
          val = (a * val + c) % m;
          this.perlin[i] = val / m;
        }
      }
      getSeed(){
        return this.seed;
      }
      setDetail(lod, fallOff){
        if(lod > 0){
          this.octaves = Math.min(Math.max(2, Math.floor(lod)), 8);
        }
        if(fallOff > 0){
          this.ampFallOff = Math.min(Math.max(fallOff, 0.01), 0.99);
        }
      }
      scaledCosine(x){ return 0.5 * (1.0 - Math.cos(Math.PI * x)); }
      get1(x){
        return this.get3(x, 0, 0);
      }
      get2(x, y){
        return this.get3(x, y, 0);
      }
      get3(x, y, z){
        if(this.perlin == null){
          this.perlin = new Array(this.size + 1);
          for(let i = 0; i < this.perlin.length; i++){
            this.perlin[i] = Math.random();
          }
        }
        if(x < 0){ x = -x; }
        if(y < 0){ y = -y; }
        if(z < 0){ z = -z; }
        let xi = Math.floor(x);
        let yi = Math.floor(y);
        let zi = Math.floor(z);
        let xf = x - xi;
        let yf = y - yi;
        let zf = z - zi;
        let rxf, ryf;
        let r = 0;
        let ampl = 0.5;
        let n1, n2, n3;
        for(let o = 0; o < this.octaves; o++){
          let of = xi + (yi << this.yWrapByte) + (zi << this.zWrapByte);
          rxf = this.scaledCosine(xf);
          ryf = this.scaledCosine(yf);

          n1 = this.perlin[of & this.size];
          n1 += rxf * (this.perlin[(of + 1) & this.size] - n1);
          // of0とof1を割合rxfで足し合わせる（rxfが0のときof0みたいな）
          n2 = this.perlin[(of + this.yWrap) & this.size];
          n2 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n2);
          // of16とof17を割合rxfで足し合わせる
          n1 += ryf * (n2 - n1);
          // 得られたn1とn2を割合ryfで足し合わせる

          of += this.zWrap;
          // ofに256を足して・・・

          n2 = this.perlin[of & this.size];
          n2 += rxf * (this.perlin[(of + 1) & this.size] - n2);
          // of256とof257を割合rxfで足し合わせる
          n3 = this.perlin[(of + this.yWrap) & this.size];
          n3 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n3);
          // of272とof273を割合rxfで足し合わせる
          n2 += ryf * (n3 - n2);
          // 得られた結果を割合ryfで足し合わせる

          n1 += this.scaledCosine(zf) * (n2 - n1);
          // これらを、割合rzfで足し合わせる

          r += n1 * ampl;
          ampl *= this.ampFallOff;

          xi <<= 1;
          xf *= 2;
          yi <<= 1;
          yf *= 2;
          zi <<= 1;
          zf *= 2;
          if(xf >= 1.0){ xi++; xf--; }
          if(yf >= 1.0){ yi++; yf--; }
          if(zf >= 1.0){ zi++; zf--; }
        }
        return r;
      }
    }


    // いずれutilに加えるつもり
    class Noise4D{
      constructor(){
        this.perlin = null;
        this.size = 65535; // 2^16-1
        this.yWrapByte = 4;
        this.yWrap = (1 << this.yWrapByte);
        this.zWrapByte = 8;
        this.zWrap = (1 << this.zWrapByte);
        this.wWrapByte = 12;
        this.wWrap = (1 << this.wWrapByte);
        this.octaves = 4;
        this.ampFallOff = 0.5;
        this.seed = undefined;
      }
      setSeed(seed){
        /* seed値を決めてperlinを設定する */
        /* これにより得られる値はseedの値で完全に決まる */
        // m is basically chosen to be large (as it is the max period)
        // and for its relationships to a and c
        const m = 4294967296;
        // a - 1 should be divisible by m's prime factors
        const a = 1664525;
        // c and m should be co-prime
        const c = 1013904223;
        let val;
        if(seed === undefined){
          val = ((Math.random() * m) >>> 0);
        }else{
          val = (seed >>> 0);
        }
        this.seed = val;
        this.perlin = new Array(this.size + 1);
        for(let i = 0; i < this.perlin.length; i++){
          val = (a * val + c) % m;
          this.perlin[i] = val / m;
        }
      }
      getSeed(){
        return this.seed;
      }
      setDetail(lod, fallOff){
        if(lod > 0){
          this.octaves = Math.min(Math.max(2, Math.floor(lod)), 8);
        }
        if(fallOff > 0){
          this.ampFallOff = Math.min(Math.max(fallOff, 0.01), 0.99);
        }
      }
      scaledCosine(x){ return 0.5 * (1.0 - Math.cos(Math.PI * x)); }
      get1(x){
        return this.get4(x, 0, 0, 0);
      }
      get2(x, y){
        return this.get4(x, y, 0, 0);
      }
      get3(x, y, z){
        return this.get4(x, y, z, 0);
      }
      get4(x, y, z, w){
        if(this.perlin == null){
          this.perlin = new Array(this.size + 1);
          for(let i = 0; i < this.perlin.length; i++){
            this.perlin[i] = Math.random();
          }
        }
        if(x < 0){ x = -x; }
        if(y < 0){ y = -y; }
        if(z < 0){ z = -z; }
        if(w < 0){ w = -w; }
        let xi = Math.floor(x);
        let yi = Math.floor(y);
        let zi = Math.floor(z);
        let wi = Math.floor(w);
        let xf = x - xi;
        let yf = y - yi;
        let zf = z - zi;
        let wf = w - wi;
        let rxf, ryf;
        let r = 0;
        let ampl = 0.5;
        let n1, n2, n3, n4;
        for(let o = 0; o < this.octaves; o++){
          let of = xi + (yi << this.yWrapByte) + (zi << this.zWrapByte) + (wi << this.wWrapByte);
          rxf = this.scaledCosine(xf);
          ryf = this.scaledCosine(yf);

          n1 = this.perlin[of & this.size];
          n1 += rxf * (this.perlin[(of + 1) & this.size] - n1);
          // of0とof1を割合rxfで足し合わせる（rxfが0のときof0みたいな）
          n2 = this.perlin[(of + this.yWrap) & this.size];
          n2 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n2);
          // of16とof17を割合rxfで足し合わせる
          n1 += ryf * (n2 - n1);
          // 得られたn1とn2を割合ryfで足し合わせる

          of += this.zWrap;
          // ofに256を足して・・・

          n2 = this.perlin[of & this.size];
          n2 += rxf * (this.perlin[(of + 1) & this.size] - n2);
          // of256とof257を割合rxfで足し合わせる
          n3 = this.perlin[(of + this.yWrap) & this.size];
          n3 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n3);
          // of272とof273を割合rxfで足し合わせる
          n2 += ryf * (n3 - n2);
          // 得られた結果を割合ryfで足し合わせる

          n1 += this.scaledCosine(zf) * (n2 - n1);
          // これらを、割合rzfで足し合わせる

          of -= this.zWrap; // ここで一旦zWrapを引かないと網羅できない
          of += this.wWrap;

          n2 = this.perlin[of & this.size];
          n2 += rxf * (this.perlin[(of + 1) & this.size] - n2);
          // of0とof1を割合rxfで足し合わせる（rxfが0のときof0みたいな）
          n3 = this.perlin[(of + this.yWrap) & this.size];
          n3 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n3);
          // of16とof17を割合rxfで足し合わせる
          n2 += ryf * (n3 - n2);

          of += this.zWrap; // 改めて足す

          n3 = this.perlin[of & this.size];
          n3 += rxf * (this.perlin[(of + 1) & this.size] - n3);
          // of256とof257を割合rxfで足し合わせる
          n4 = this.perlin[(of + this.yWrap) & this.size];
          n4 += rxf * (this.perlin[(of + this.yWrap + 1) & this.size] - n4);
          // of272とof273を割合rxfで足し合わせる
          n3 += ryf * (n4 - n3);
          // 得られた結果を割合ryfで足し合わせる

          n2 += this.scaledCosine(zf) * (n3 - n2);

          n1 += this.scaledCosine(wf) * (n2 - n1);

          // おそらく4次元の場合、この一連の処理をof+=4096したうえで実行する。

          // そして、2つの結果を割合rwfで足し合わせることになるので、
          // 単純に考えて計算負荷は2倍ですかね・・そもそも2次元ノイズであれば
          // これ半分になるので（最初に得られるn1でおしまい）

          // n1を得ることができたらあとは水増しですかね。
          // なおn1が得られた後でn2とn3が空くので、n4と合わせて一連の処理を
          // 実行することができて、最終的にできるn2をn1と・・って流れに
          // なると思う。知らないけどね。んー。それもやらないとなのかな・・
          // 大変すぎてつら。
          r += n1 * ampl;
          ampl *= this.ampFallOff;

          xi <<= 1;
          xf *= 2;
          yi <<= 1;
          yf *= 2;
          zi <<= 1;
          zf *= 2;
          wi <<= 1;
          wf *= 2;
          if(xf >= 1.0){ xi++; xf--; }
          if(yf >= 1.0){ yi++; yf--; }
          if(zf >= 1.0){ zi++; zf--; }
          if(wf >= 1.0){ wi++; wf--; }
        }
        return r;
      }
    }

    tools.fract = fract;
    tools.clamp = clamp;
    tools.RandomSystem = RandomSystem;
    tools.Noise3D = Noise3D;
    tools.Noise4D = Noise4D;

    return tools;
  })();

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

  const domUtils = (function(){
    const {E_Type} = foxErrors;
    const utils = {};

    // コンフィグもこの方が楽だろう
    function configElement(elem, options = {}){
      const {style = {}, attr = {}} = options;
      for(const key of Object.keys(style)){
        elem.style.setProperty(key, style[key]);
      }
      for(const key of Object.keys(attr)){
        elem.setAttribute(key, attr[key]);
      }
    }

    function createElement(name, options = {}){
      const elem = document.createElement(name);
      configElement(elem, options);
      return elem;
    }

    function createCanvas(w, h, options = {}){
      // 例えばこうする。
      try{
        for(const key of Object.keys(options)){
          if(key === 'id' && (typeof options[key] !== 'string')){
            throw new E_Type({name:key, value:options[key], info:'idはstring型を指定してください'});
          }
          if(key === 'dpr' && (typeof options[key] !== 'number')){
            throw new E_Type({name:key, value:options[key], info:'dprはnumber型を指定してください'});
          }
        }
      }catch(e){
        if (typeof e.show === 'function'){
          e.show();
        }else{
          console.error(`${e.name}|${e.message}`);
        }
        //console.error(`${e.type}, ${e.name}, ${e.value}, ${e.info}`);
        // 明示的に指定した値に不具合がある場合はキャンバスを作らない。
        // idがstring onlyは厳しいかもしれないが...まあ型変換してください。ふつうあそこ文字列しか入れないし。
        return null;
      }

      const {id = "", dpr = 1} = options;
      const cvs = (function(){
        if(id === ""){
          const c = createElement("canvas", options);
          return c;
        }else{
          const c = document.getElementById(id);
          configElement(c, options);
          return c;
        }
      })();
      cvs.setAttribute("width", w * dpr);
      cvs.setAttribute("height", h * dpr);
      cvs.style.setProperty("width", `${w}px`);
      cvs.style.setProperty("height", `${h}px`);
      return cvs;
    }

    // 必要かわかんないけどOffscreenCanvasを作る関数
    // DOMとして使わないならこっちの方がいいかも？
    function createOffscreen(w, h){
      try{
        if(w === undefined || h === undefined){
          throw new Error('w, hのいずれかが未定義です');
        }
        if(typeof(w) !== 'number'){
          throw new E_Type({name:'w', value:w, info:'wはnumber型を指定してください'});
        }else if(typeof(h) !== 'number'){
          throw new E_Type({name:'h', value:h, info:'hはnumber型を指定してください'});
        }
      }catch(e){
        if (typeof e.show === 'function'){
          e.show();
        }else{
          console.error(`${e.name}|${e.message}`);
        }
        return null;
      }
      return new OffscreenCanvas(w, h);
    }

    // SketchLooper
    // loopだけ（今のところ）
    // 関数は後からでも設定できる
    class SketchLooper{
      constructor(params = {}){
        const {loop = () => {}, safe = false, errorCountLimit = 120, interval = 0} = params;
        this.loopFunction = loop;
        this.safe = safe; // 関数内でErrorが発生したら処理を止める
        this.errorCount = 0;
        this.errorCountLimit = errorCountLimit; // 120回まで。
        this.isLooping = false;
        this.properFrameCount = 0; // 0ベースのカウンタ。ループが実行された場合にそのループ内で処理を実行後に増加させる
        this.animationID = -1; // キャンセル用
        this.lastTimeStump = null;
        this.elapsedMilliSeconds = 0;
        this.properElapsedMilliSeconds = 0;
        this.interval = Math.max(0, Math.floor(interval)); // 実行間隔。0の場合は本来の仕様。たとえば200とすると1秒に5回くらい。
        this.mainFunction = (function(timeStump){
          // elapsedの計算
          if(this.lastTimeStump === null){
            this.lastTimeStump = timeStump;
          }else{
            this.elapsedMilliSeconds = timeStump - this.lastTimeStump;
            this.lastTimeStump = timeStump;
          }

          let executeFlag = false;
          this.properElapsedMilliSeconds += this.elapsedMilliSeconds;
          if(this.interval === 0){
            executeFlag = true;
          }else if(this.properElapsedMilliSeconds > this.interval){
            this.properElapsedMilliSeconds -= this.interval;
            if(this.properElapsedMilliSeconds > this.interval){
              this.properElapsedMilliSeconds = 0;
            }
            executeFlag = true;
          }

          // Errorが出力された場合にループを止める実験
          try{
            // 第一引数はカウンタ、第二引数にstumpを渡す。第三引数にthis？
            if(executeFlag){ this.loopFunction(this.properFrameCount, timeStump, this); }
          }catch(e){
            this.errorCount++;
            // safe:trueの場合、エラーを出してから処理を止める。
            if(typeof e.show === 'function'){
              e.show();
            }else{
              console.error(`${e.name}|${e.message}`);
            }
            if(this.safe || this.errorCount === this.errorCountLimit){
              this.pause();
              this.errorCount = 0;
            }
          }
          if(executeFlag){ this.properFrameCount++; }

          // ループ実行中の場合は継続。loopFunction内部でpauseしてもここで実行されてしまうと無意味。
          // なのでループの実行中かどうかはきちんと確かめる必要がある。
          if(this.isLooping){
            this.animationID = window.requestAnimationFrame(this.mainFunction);
          }
        }).bind(this);
      }
      setLoop(loop){
        this.loopFunction = loop;
        return this;
      }
      execute(){
        if(this.isLooping) return; // 重ね掛け回避
        // エクスキュート
        window.requestAnimationFrame(this.mainFunction);
        this.isLooping = true;
        this.elaspedMilliSeconds = 0;
        this.properElapsedMilliSeconds = 0;
        this.lastTimeStump = null;
      }
      pause(){
        if(!this.isLooping) return; // 重ね掛け回避
        // ポーズ
        window.cancelAnimationFrame(this.animationID);
        this.isLooping = false;
      }
      getElapsed(){
        // 0かもしくは経過ミリ秒数
        return this.elapsedMilliSeconds;
      }
      loopSwitch(){
        // 使う場合はthisを特定するためにbindを使うのを忘れずに。
        if(this.isLooping){
          this.pause();
        }else{
          this.execute();
        }
      }
    }

    utils.configElement = configElement;
    utils.createElement = createElement;
    utils.createCanvas = createCanvas;
    utils.createOffscreen = createOffscreen;
    utils.SketchLooper = SketchLooper;

    return utils;
  })();

  const webglUtils = (function(){
    const utils = {};

    // 生成に失敗したら文字列が返って原因が分かるようにする
    function createShaderProgram(gl, params = {}){
      // glがレンダリングコンテキストかどうか調べる。
      if(!(gl instanceof WebGL2RenderingContext)){
        const errorMessage = `コンテキストの指定が不正です\nWebGL2RenderingContextを指定してください`;
        console.error(errorMessage);
        return errorMessage;
      }

      // nameを付けることでどのshaderがやばいか識別するとかできると良いかと
      const {vs, fs, name = "", layout = {}, outVaryings = [], separate = true} = params;

      // vsとfsが文字列かどうか調べる
      if(typeof vs !== 'string' || typeof fs !== 'string'){
        const errorMessage = `${name}:シェーダーソースの指定が不正です\n文字列を指定してください`;
        console.error(errorMessage);
        return errorMessage;
      }

      const vsShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vsShader, vs);
      gl.compileShader(vsShader);

      if(!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:vertex shaderの作成に失敗しました`);
        const infoLog = gl.getShaderInfoLog(vsShader);
        console.error(infoLog);
        return infoLog;
      }

      const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fsShader, fs);
      gl.compileShader(fsShader);

      if(!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:fragment shaderの作成に失敗しました。`);
        const infoLog = gl.getShaderInfoLog(fsShader);
        console.error(infoLog);
        return infoLog;
      }

      const program = gl.createProgram();

      gl.attachShader(program, vsShader);
      gl.attachShader(program, fsShader);

      // レイアウト指定はアタッチしてからリンクするまでにやらないと機能しない。
      // なおこの機能はwebgl1でも使うことができる。webgl2で実装されたというのは誤解。
      setAttributeLayout(gl, program, layout);

      setOutVaryings(gl, program, outVaryings, separate);

      gl.linkProgram(program);

      if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        console.log(`${name}:programのlinkに失敗しました。`);
        const infoLog = gl.getProgramInfoLog(program);
        console.error(infoLog);
        return infoLog;
      }

      // uniform情報を作成時に登録してしまおう
      program.uniforms = getActiveUniforms(gl, program);
      // attribute情報も登録してしまおう。
      program.attributes = getActiveAttributes(gl, program);

      console.log(`${name} program created successfully.`);

      return program;
    }

    // レイアウトの指定。各attributeを配列のどれで使うか決める。
    // 指定しない場合はデフォルト値が使われる。基本的には通しで0,1,2,...と付く。
    function setAttributeLayout(gl, pg, layout = {}){
      const names = Object.keys(layout);
      if(names.length === 0) return;

      for(const name of names){
        const index = layout[name];
        gl.bindAttribLocation(pg, index, name);
      }
    }

    // TFF用の設定箇所
    function setOutVaryings(gl, pg, outVaryings = [], separate = true){
      if(outVaryings.length === 0) return;
      gl.transformFeedbackVaryings(pg, outVaryings, (separate ? gl.SEPARATE_ATTRIBS : gl.INTERLEAVED_ATTRIBS));
    }

    function getActiveUniforms(gl, pg){
      const uniforms = {};

      // active uniformの個数を取得。
      const numActiveUniforms = gl.getProgramParameter(pg, gl.ACTIVE_UNIFORMS);
      console.log(`active uniformの個数は${numActiveUniforms}個です`);

      for(let i=0; i<numActiveUniforms; i++){
        const uniform = gl.getActiveUniform(pg, i);
        const location = gl.getUniformLocation(pg, uniform.name);

        uniform.location = location;
        uniforms[uniform.name] = uniform;
      }
      return uniforms;
    }

    function getActiveAttributes(gl, pg){
      const attributes = {};

      // active attributeの個数を取得。
      const numActiveAttributes = gl.getProgramParameter(pg, gl.ACTIVE_ATTRIBUTES);
      console.log(`active attributeの個数は${numActiveAttributes}個です`);

      for(let i=0; i<numActiveAttributes; i++){
        // 取得は難しくない。uniformと似てる。
        const attribute = gl.getActiveAttrib(pg, i);
        const location = gl.getAttribLocation(pg, attribute.name);
        console.log(`${attribute.name}のlocationは${location}です`);

        attribute.location = location;
        attributes[attribute.name] = attribute;
      }

      return attributes;
    }

    function uniformX(gl, pg, type, name){
      const {uniforms} = pg;

      // 存在しない場合はスルー
      if(uniforms[name] === undefined) return;

      // 存在するならlocationを取得
      const location = uniforms[name].location;

      // nameのあとに引数を並べる。そのまま放り込む。
      const args = [...arguments].slice(4);
      switch(type){
        case "1f": gl.uniform1f(location, ...args); break;
        case "2f": gl.uniform2f(location, ...args); break;
        case "3f": gl.uniform3f(location, ...args); break;
        case "4f": gl.uniform4f(location, ...args); break;
        case "1fv": gl.uniform1fv(location, ...args); break;
        case "2fv": gl.uniform2fv(location, ...args); break;
        case "3fv": gl.uniform3fv(location, ...args); break;
        case "4fv": gl.uniform4fv(location, ...args); break;
        case "1i": gl.uniform1i(location, ...args); break;
        case "2i": gl.uniform2i(location, ...args); break;
        case "3i": gl.uniform3i(location, ...args); break;
        case "4i": gl.uniform4i(location, ...args); break;
        case "1iv": gl.uniform1iv(location, ...args); break;
        case "2iv": gl.uniform2iv(location, ...args); break;
        case "3iv": gl.uniform3iv(location, ...args); break;
        case "4iv": gl.uniform4iv(location, ...args); break;
      }
      if(type === "matrix2fv"||type==="matrix3fv"||type==="matrix4fv"){
        const v = args[0]; // 通常配列でいいならそうするかなぁ
        // つまりわざわざFloat32にする処理をCPUでやるのかそれともGPUにお任せするのかということ
        // どうでもいいか。やめちゃおう。おそらくバイト列だと駄目、その程度の意味だと思う。
        //const v = (args[0] instanceof Float32Array ? args[0] : new Float32Array(args[0]));
        switch(type){
          case "matrix2fv": gl.uniformMatrix2fv(location, false, v); break;
          case "matrix3fv": gl.uniformMatrix3fv(location, false, v); break;
          case "matrix4fv": gl.uniformMatrix4fv(location, false, v); break;
        }
      }
    }

    utils.createShaderProgram = createShaderProgram;
    utils.uniformX = uniformX; // projectXみたいでなんかいいね（馬鹿）

    return utils;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //

  // utility. ユーティリティ。DamperやTimerなどはここ。色関連も。文字列とかはこっちかもしれない。
  // ローディング関連もここに集めよう。他のあれこれが必要なく独立しているものは全部ここ。
  const foxUtils = (function(){
    const utils = {};

    // Damper.
    // 減衰を表現するためのツール
    // 生成時に個別に名前の列挙で用意して各々のagentに名前でアクセスして使う。actionで値を加算する。基本的にインタラクションで実行する。
    // 加算する際のfactorを決めることができるし上限値と下限値も決められる。これらは速度に当たる。要はactionとはapplyForceである。
    // setMainでそれらの値で何をするのかを登録し(this引数)、executeで毎フレーム実行する。updateは個別の処理だが
    // applyAllでまとめて指定することもできる。pause/startで一時的に値の更新や減衰が起きないようにできる。
    // isActive()でいずれかのdamperがvalue0かどうか調べられる。falseなら全部0ということ。
    class Damper{
      constructor(){
        this.dampers = {};
        const args = [...arguments];
        if(args.length > 0){
          for(const name of args){
            this.regist(name);
          }
        }
        this.main = (t) => {}; // 引数は自分
      }
      regist(name = "default"){
        // name:管理用ネーム
        // upper/lowerRange:作用値の限界
        // actionCoeff:作用させる際の係数. デフォルトは1. なので場合によっては不要。
        // dampCoeff:毎フレームの減衰値
        // threshold:ゼロとみなす閾値
        // value:取得すべき値
        // pause:一時的にactionとupdateをしないようにできる
        this.dampers[name] = {
          name, upperRange:Infinity, lowerRange:-Infinity,
          actionCoeff:1, dampCoeff:0.85, threshold:1e-6,
          value:0, pause:false
        }
        return this;
      }
      getValue(name){
        // 値の取得。これをexecute内で実行することでmainFunctionを実行する形。
        const damp = this.dampers[name];
        if(damp === undefined) return;
        return damp.value;
      }
      config(name, params = {}){
        const damp = this.dampers[name];
        if(damp === undefined) return;
        const keywords = [
          "upperRange", "lowerRange", "actionCoeff", "dampCoeff", "threshold"
        ];
        // 未定義でないものだけ更新
        for(const keyword of keywords){
          if(params[keyword] !== undefined){
            damp[keyword] = params[keyword];
          }
        }
        return this;
      }
      setMain(mainFunction){
        this.main = mainFunction;
        return this;
      }
      execute(){
        // 引数は自分
        this.main(this);
        return this;
      }
      action(name, inputValue = 0){
        // 値で更新する（不定期）
        const damp = this.dampers[name];
        if(damp === undefined) return;
        if(damp.pause) return;
        damp.value += inputValue * damp.actionCoeff;
        return this;
      }
      update(name){
        // 減衰、閾値によるリセット判定（毎フレーム）
        const damp = this.dampers[name];
        if(damp === undefined) return;
        if(damp.pause) return;
        damp.value *= damp.dampCoeff;
        damp.value = Math.max(Math.min(damp.value, damp.upperRange), damp.lowerRange);
        if(Math.abs(damp.value) < damp.threshold){
          damp.value = 0;
        }
        return this;
      }
      reset(name){
        // 強制的に0にする
        const damp = this.dampers[name];
        if(damp === undefined) return;
        damp.value = 0;
        return this;
      }
      pause(name){
        // 動作停止
        const damp = this.dampers[name];
        if(damp === undefined) return;
        if(damp.pause) return;
        damp.pause = true;
        return this;
      }
      start(name){
        // 動作再開
        const damp = this.dampers[name];
        if(damp === undefined) return;
        if(!damp.pause) return;
        damp.pause = false;
        return this;
      }
      applyAll(actionName, targets = []){
        // targetsで適用範囲を配列形式で決められる。未指定の場合はすべて。
        if(targets.length === 0){
          for(const name of Object.keys(this.dampers)){
            this[actionName](name);
          }
        }else{
          for(const name of targets){
            this[actionName](name);
          }
        }
        return this;
      }
      isActive(){
        for(const name of Object.keys(this.dampers)){
          const damp = this.dampers[name];
          if(Math.abs(damp.value) > 0) return true;
        }
        return false;
      }
    }

    // ArrayWrapper
    // 普通に作れる。fromとofは以降のメソッドに継承される。
    // 作った後で中身をそのまま出力しないと面倒なことになるので一工夫してる。
    class ArrayWrapper extends Array{
      constructor(){
        super(...arguments);
      }
      static from(){
        // fromで配列を作った後、それを持つLoopArrayを構成すればいい。
        const b = Array.from(...arguments);
        const c = new this();
        c.push(...b);
        return c;
      }
      static of(){
        // fromで配列を作った後、それを持つLoopArrayを構成すればいい。
        // もしこれを元に作ってしまうと例の問題が発生してしまう。
        const b = Array.of(...arguments);
        const c = new this();
        c.push(...b);
        return c;
      }
    }

    // indexに自由に整数を指定でき、いわゆる「mod」でindexを割り出して出力する。
    // シンプルだが状況によっては非常に強力
    class LoopArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
      }
      get(index){
        if(this.length === 0){ return null; }
        const L = this.length;
        if(index > 0){
          return this[index % L];
        }else if(index < 0){
          return this[(L - (-index % L)) % L];
        }
        return this[0];
      }
      static from(){
        return super.from(...arguments);
      }
      static of(){
        return super.of(...arguments);
      }
    }

    // resetの際にtrueを指定すると延々と値を出力し続ける
    // loopがfalseの場合はresetしない限りnull出すだけの代物になる
    // 区切りが分かることが重要
    // 旧SweepArrayの役割はこれが果たせるので、廃止する。
    class RoundRobinArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
        this.loop = false;
        this.index = 0;
        this.returnable = false; // 終了フラグ
      }
      reset(loop = false){
        this.loop = loop;
        this.index = 0;
        if(this.length > 0){
          this.returnable = true;
        }
      }
      pick(){
        if(this.length === 0){ return null; }
        const L = this.length;
        if(this.index >= L){
          return null;
        }
        const v = this[this.index];
        this.index++;
        if(this.index >= L){
          if(this.loop){
            // ここはloop前提のため、引数にtrueを指定しなければならない。
            // 止まってしまう。事前に気づけて良かった。
            this.reset(true);
          }else{
            // loopでないなら終了した場合にフラグを折る
            this.returnable = false;
          }
        }
        return v;
      }
      isReturnable(){
        return this.returnable;
      }
      static from(){
        return super.from(...arguments);
      }
      static of(){
        return super.of(...arguments);
      }
    }

    // RandomChoiceArray.
    // 通常の配列と同じように作れる。fromやtoでも作れる。
    // resetでランダムindex配列が生成されそれに従って順繰りに取られていく
    // resetの際にtrueを指定すると際限なくランダム値を出し続ける
    class RandomChoiceArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
        this.loop = false;
        this.indices = [];
        this.returnable = false; // 終了フラグ
      }
      reset(loop = false){
        this.loop = loop;
        this.indices.length = 0;
        const L = this.length;
        if(L === 0) return;
        // 長さが1以上の場合にフラグを立てる
        this.returnable = true;
        // 雑にシャッフル。普通にやるわ。
        const src = Array.from(".".repeat(L), (x, i) => { return {value:i, seed:Math.random()}; });
        src.sort((a, b) => a.seed - b.seed);
        this.indices = src.map(u => u.value);
      }
      pick(){
        if(this.length === 0){ return null; }
        if(this.indices.length === 0){
          return null;
        }
        const v = this[this.indices.pop()];
        if(this.indices.length === 0){
          if(this.loop){
            // ここはloop前提のため、引数にtrueを指定しなければならない。
            // 止まってしまう。事前に気づけて良かった。
            this.reset(true);
          }else{
            // loopでないなら終了した場合にフラグを折る
            this.returnable = false;
          }
        }
        return v;
      }
      isReturnable(){
        return this.returnable;
      }
      static from(){
        return super.from(...arguments);
      }
      static of(){
        return super.of(...arguments);
      }
    }

    // 備考
    // SweepArrayはRoundRobinArrayに含まれるので廃止
    // BooleanArrayはeveryとsomeで同じことができるので廃止
    // CrossReferenceArrayのコンストラクタについては、あれは空っぽ前提で運用する（Gunも同様）ので、
    // 当面はArrayWrapperの枠組みで取り扱う必要は無い。
    // addに相当するメソッドも廃止。pushでいい。restのような余計な変数も不要。

    // CrossReferenceArray.
    class CrossReferenceArray extends Array{
      constructor(){
        super();
      }
      add(){
        const elements = (Array.isArray(arguments[0]) ? arguments[0] : [...arguments]);
        for(const e of elements){
          this.push(e);
          e.belongingArray = this; // 所属配列への参照
        }
      }
      remove(element){
        let index = this.indexOf(element, 0);
        // indexOfはelementが未定義の場合-1を返す。みつからなくても-1を返す。
        // そしてsplice(-1,1)でも要素は排除されるのでまずい。-1の場合は何もせず抜ける。
        if(index < 0){ return; }
        this.splice(index, 1); // elementを配列から排除する
      }
      loop(methodName, args = []){
        if(this.length === 0){ return; }
        // methodNameには"update"とか"display"が入る。まとめて行う処理。
        for(let i = 0; i < this.length; i++){
          this[i][methodName](...args);
        }
      }
      loopReverse(methodName, args = []){
        if(this.length === 0){ return; }
        // 逆から行う。排除とかこうしないとエラーになる。もうこりごり。
        for(let i = this.length - 1; i >= 0; i--){
          this[i][methodName](...args);
        }
      }
      clear(){
        this.length = 0;
      }
    }

    // life:寿命。mode:autoの場合に消えるまでの時間として使う。
    // progress:寿命の進行。0->1と増える。
    // elapsed:経過時間。discreteの場合はカウント、continuousの場合は経過ミリ秒
    // type:カウント制か時間制か
    // mode:manualの場合、こっちで明示的にkillする必要がある。もちろんkillしないでずーっと飛び回らせる選択肢もある。
    // それ以外のパラメータを自由に設定し、メソッド内で使える。
    // 役に立つかわかんないけどpause/start/switchActiveStateを追加。何らかの使い道はあるでしょう。
    // delayとvanishを追加。delayは正規のprogress前の処理。progressは-1～0と推移。
    // vanishは正規のprogress後の処理。progressは1～2と推移。remove判定はlife+vanishまでとする。
    class Bullet{
      constructor(params = {}){
        this.life = 1; // 寿命
        this.delay = 0; // ディレイを追加。
        this.vanish = 0; // 余り。たとえば30の場合life+30で消える。
        this.type = 'discrete'; // discrete/continuous
        this.mode = 'auto'; // auto/manual
        this.group = 'default'; // groupによって処理を分けたい場合。
        // 要はこのタイミングでしか上書きできないということ。上記6種類のみ可能。
        // あと独自パラメータについても予約されてるこれらに関しては不可とする。特にバリデーションはしない。好きに。
        for(const [key, value] of Object.entries(params.construct)){
          this[key] = value; // 黒魔術
          // delayは負の数禁止
          if(key === 'delay'){ this[key] = Math.max(0, value); }
          // vanishも負の数禁止
          if(key === 'vanish'){ this[key] = Math.max(0, value); }
        }
        // progressとelapsedは上書きされると困るのでこっちで定義する。
        this.elapsed = -this.delay;
        this.timeStump = window.performance.now() + this.delay;
        this.pauseTimeStump = 0; // pause用
        // progressですが...elapsedが負の場合は逆progressとする。つまり-1～0ということ。
        this.progress = (this.delay > 0 ? this.elapsed / this.delay : this.elapsed / this.life);

        const {init = () => {}, update = () => {}, display = () => {}, remove = () => {}} = params;
        init(this);
        this.updateFunction = update;
        this.displayFunction = display;
        this.removeFunction = remove;

        this.active = true; // pause用
        // methodsの中を見る
        const {methods = {}} = params;
        // この中身は関数...のものだけフェッチして、keyが名前で、valueはthisをbindする形で登録される。
        for(const [name, func] of Object.entries(methods)){
          if(typeof func !== 'function') continue;
          //this[name] = () => { func(this); };
          // Bulletのカスタム関数を個別で呼び出す場合「に限り」、オブジェクト形式で引数を渡せるようにする
          this[name] = (customParameters = {}) => { func(this, customParameters); };
        }
        //if(this.type === 'continuous'){ this.timeStump = window.performance.now(); }
      }
      calcProgress(){
        // 処理は異なる
        if(this.type === 'continuous'){
         this.elapsed = window.performance.now() - this.timeStump;
        }
        if(this.type === 'discrete'){
          this.elapsed++;
        }
        // delayやvanishが正の場合は特別な処理でprogressを扱いやすくする
        if(this.delay > 0 && (this.elapsed < 0)){
          this.progress = this.elapsed / this.delay;
        }else if(this.vanish > 0 && (this.life < this.elapsed)){
          this.progress = 1 + (this.elapsed - this.life) / this.vanish;
        }else{
          this.progress = this.elapsed / this.life;
        }
      }
      update(){
        // activeでない場合は実行しない
        if(!this.active) return;
        this.updateFunction(this);
        this.calcProgress();
      }
      display(){
        // activeでなくても実行されることが想定されているので、実行内容に注意してください
        this.displayFunction(this);
      }
      remove(){
        // activeでない場合は実行しない
        if(!this.active) return;
        if(this.mode === 'manual') return;
        //if(this.progress < 1) return;
        // vanishの分の猶予を用意して表現に使う
        if(this.elapsed < this.life + this.vanish) return;
        this.removeFunction(this);
        this.kill();
      }
      kill(){
        // activeでなくともkillは実行できる
        // gunのremoveを使わないように仕様変更
        const gun = this.belongingArray;
        const index = gun.indexOf(this, 0);
        if(index < 0){ return; }
        gun.splice(index, 1);
        //this.belongingArray.remove(this);
      }
      pause(){
        // 重ね掛け回避
        if(!this.active) return;
        this.active = false;
        // discreteの場合、特にすることは無い
        if(this.type === 'continuous'){
          this.pauseTimeStump = window.performance.now();
        }
      }
      start(){
        // 重ね掛け回避
        if(this.active) return;
        this.active = true;
        // discreteの場合、特にすることは無い。
        if(this.type === 'continuous'){
          this.timeStump += window.performance.now() - this.pauseTimeStump;
        }
      }
      switchActiveState(){
        // switch active state.
        if(this.active){
          this.pause();
        }else{
          this.start();
        }
      }
      gun(){
        // 親にアクセスして自分の情報からなんか作らせたい場合があるかもしれないですね。
        // 他のgunかもしれないけれど。分裂とか表現したい場合に使う。
        return this.belongingArray;
      }
    }

    // registWeaponは文字通り、いわゆるfactory（オブジェクトを生成する関数の俗称）のみ登録可とする
    // fireは文字列と引数族からなるが引数はBulletでも設計図でもごちゃまぜの配列でもいい
    // 文字列の場合は関数(weapon)を呼び出してそれで作る
    // それとは別にfireSingle,fireMulti,fireBulletsはオブジェクト、オブジェクト配列、配列限定のエラー処理無しの簡易版
    // fireWeaponSingle, fireWeaponMulti, fireWeaponBulletsはそのweapon版。
    // 使うのは用途を明示したい場合、もしくは場合分けがネックになる場合。
    // ...
    // たとえばBulletが親のGunにアクセスして自身の位置情報を元にさらなるBulletを生成したりできる。
    // 余談だが、なぜBulletを渡すこともできるかというと、コードサイドでBulletを保持してmanual modeにして
    // 勝手な都合でkillしたり出来るからである。柔軟に何でもできるように作られている。
    // ...
    // 仕様変更でfire系がBulletを返すようにした。理由はBulletクラスを使わなくてもBulletを扱いたい場合があるため。
    // Bulletに直接命令を下したい場合に不便なのだ。
    class Gun extends CrossReferenceArray{
      constructor(params = {}){
        super();
        this.weapons = {};
      }
      registWeapon(key = 'fire', weapon = ()=>{}){
        if(typeof weapon !== 'function'){
          console.error("登録できるのは関数のみです");
          return;
        }
        this.weapons[key] = weapon;
      }
      fire(){
        // 戻り値をBulletにするように仕様変更
        const args = [...arguments];
        if(args[0] === null) return;
        const target = args[0];

        if(typeof target === 'string'){
          // 文字列の場合はそこからweapon(関数)を引き出す
          const weapon = this.weapons[target];
          if(weapon === undefined) return;
          args.shift();
          return this.fire(weapon, ...args);
        }else if(typeof target === 'function'){
          // 関数が戻すのはオブジェクトか、Bulletか、その配列。
          // 引数だけ出して再帰
          // なお第二引数で生成したりできる
          if(args[1] === undefined){
            const b = target();
            return this.fire(b);
          }else{
    		    args.shift();
            const b = target(...args);
            return this.fire(b);
          }
        }else{
          // 結局すべてここに帰着される
          // 要するに第一引数にオブジェクト配列を置いたりできる
          // いろんな書き方ができるかと思います
          if(Array.isArray(target)){
            const bullets = [];
            for(const b of target){
              if(b === null) continue;
              if(b instanceof Bullet){
                //this.add(b);
                bullets.push(b);
              }else{
                //this.add(new Bullet(b));
                bullets.push(new Bullet(b));
              }
              this.add(bullets);
              return bullets;
            }
          }else{
            if(target instanceof Bullet){
              this.add(target);
              return target;
            }else{
              const newBullet = new Bullet(target);
              this.add(newBullet);
              return newBullet;
            }
          }
        }
      }
      fireSingle(obj){
        // Bulletの設計図1つのみ。
        const newBullet = new Bullet(obj);
        //this.add(new Bullet(obj));
        this.add(newBullet);
        return newBullet;
      }
      fireMulti(data){
        // Bulletの設計図の配列。
        const bullets = [];
        for(const obj of data){
          bullets.push(new Bullet(obj));
          //this.add(new Bullet(obj));
        }
        this.add(bullets);
        return bullets;
      }
      fireBullets(bullets){
        // Bulletの配列。事前に作っておきたい場合向け。
        this.add(bullets);
        return bullets;
      }
      fireWeaponSingle(name){
        // 武器を使う。戻り値は設計図が1つ。
        const args = [...arguments];
        args.shift();
        const obj = this.weapons[name](...args);
        const newBullet = new Bullet(obj);
        this.add(newBullet);
        return newBullet;
      }
      fireWeaponMulti(name){
        // 武器を使う。戻り値は設計図の配列。Bulletは1つも無し。
        const args = [...arguments];
        args.shift();
        const objs = this.weapons[name](...args);
        const bullets = [];
        for(const obj of objs){
          //this.add(new Bullet(obj));
          bullets.push(new Bullet(obj));
        }
        this.add(bullets);
        return bullets;
      }
      fireWeaponBullets(name){
        // 武器を使う。戻り値はすべてBullet. 事前に作っておきたい場合向け。
        const args = [...arguments];
        args.shift();
        const bullets = this.weapons[name](...args);
        this.add(bullets);
        return bullets;
      }
      remove(groupName){
        if(arguments.length === 0){
          // ここもおそらくloopReverseでないと意図した挙動にならない可能性がある
          this.loopReverse("remove");
          return;
        }
        if(typeof(groupName) === 'string'){
          // 複数まとめて削除するときはloopReverse, これ鉄則。
          for(let k=this.length-1; k>=0; k--){
            if(this[k].group !== groupName) continue;
            this.splice(k, 1);
          }
        }else{
          // groupNameのところに要素がある場合はCrossReferenceArrayのそれと同じ処理とする
          const index = this.indexOf(groupName, 0);
          if(index >= 0){
            this.splice(index, 1);
          }
        }
      }
      execute(method, groupName){
        // bulletに設定したメソッドを適用する形。なんでもあり。
        if(arguments.length === 0) return;
        if(arguments.length === 1){
          this.loopReverse(method);
          return;
        }
        // 逆順で適用する
        for(let i=this.length-1; i>=0; i--){
          const b = this[i];
          if(b.group !== groupName) continue;
          if(b[method] === undefined) continue;
          b[method]();
        }
      }
      getBullets(groupName = ""){
        // 指定したグループのBulletをまとめて取得
        if(arguments.length === 0){
          return this;
        }
        return this.filter((b) => (b.group === groupName));
      }
      count(groupName = ""){
        // 指定したグループのBulletの個数を取得
        return this.getBullets(...arguments).length;
      }
    }

    // killも追加で。
    const derivedMethodsFromBullet = ["display", "update", "pause", "start", "switchActiveState", "kill"];
    for(const method of derivedMethodsFromBullet){
      Gun.prototype[method] = (function(groupName){
        // この場合thisはGunのインスタンスになる。
        // 引数が無い場合は全てに適用する
        if(arguments.length === 0){
          // killだけはloopReverseでないと意図した挙動にならない。
          // 他のメソッドはリバーシブルなので全部loopReverseにしてしまえばいい。
          this.loopReverse(method);
          return;
        }
        // 引数がある場合はグループに対して適用する
        if(typeof(groupName) === 'string'){
          // こっちもリバースにしろや！！！これでkillも含めて全てに適用できる。
          for(let i=this.length-1; i>=0; i--){
            const b = this[i];
            if(b.group !== groupName) continue;
            b[method]();
          }
        }
      });
    }

    // Tree.
    // 親はparentで子はSweepArrayで管理。要するに走査前提。ヒエラルキー前提。一応、depthも備えてある。
    // scanningのstatic関数があり、これを使って色々できる仕組み。
    class Tree{
      constructor(){
        this.childs = new RoundRobinArray();
        //this.childs = new SweepArray();
        this.parent = null;
        this.depth = 0;
      }
      initialize(){
        this.childs.length = 0;
        this.parent = null;
        this.depth = 0;
        return this;
      }
      setDepth(d){
        this.depth = d;
        return this;
      }
      getDepth(){
        return this.depth;
      }
      setParent(p){
        this.parent = p;
        return this;
      }
      getParent(){
        return this.parent;
      }
      addChild(c){
        this.childs.push(c);
        c.setParent(this);
        return this;
      }
      pick(){
        return this.childs.pick();
      }
      reset(){
        this.childs.reset();
        return this;
      }
      getIndex(){
        return this.childs.index;
      }
      static scan(nodeTree, action = {}){
        const {firstArrived = () => {}, lastArrived = () => {}} = action;

        let curTree = nodeTree;

        const stuck = [];
        while(true){
          // 最初に到達したときになんかやりたい
          if(curTree.getIndex() === 0){
            firstArrived(curTree);
          }
          const nextTree = curTree.pick();
          if(nextTree === null){
            // nextTreeがnullというのは要するにどんづまりなので、
            // 結果に依らずこのときのcurTreeはresetしていいと思う
            curTree.reset();
            lastArrived(curTree); // こっちのような気がするし、多分そう。
            // lastArrivedの方はskin-meshにも出てこないし問題ないはず
            if(stuck.length === 0){
              break;
            }else{
              // 最後に到達したときになんかやりたい
              //lastArrived(curTree);
              curTree = stuck.pop();
            }
          }else{
            stuck.push(curTree);
            curTree = nextTree;
          }
        }
      }
    }

    // Vertice.
    // グラフという概念の「頂点」の抽象化。自分の観点から見た場合の。それは自分の中ではプレツリー（木の前段階）なので、
    // treeを持たせてある。というかtreeにヒエラルキーを与える関数を付随させている。通常ヒエラルキーはaddChildで動的に構成するが、
    // グラフ構造を援用して構築できるようにもした方がいい。connectedはEdgeの集合。
    class Vertice{
      constructor(tree = new Tree()){
        this.dirtyFlag = false;
        //this.connected = new RandomChoiceArray();
        //this.branches = new SweepArray();
        this.connected = new RandomChoiceArray();
        this.branches = new RoundRobinArray();
        this.tree = tree;
        // ヒエラルキー用プロパティ。
        // ヒエラルキーを作るたびにまとめて更新されるので特にリセットする必要は
        // 無いと思う
        this.parent = null;
        this.parentBranch = null;
      }
      setTree(tree){
        this.tree = tree;
        return this;
      }
      initialize(){
        this.connected.length = 0;
        this.connected.reset();
        return this;
      }
      branchInitialize(){
        this.branches.length = 0;
        this.branches.reset();
        return this;
      }
      treeInitialize(){
        this.tree.initialize();
        this.tree.reset();
        return this;
      }
      regist(e){
        // addを使うことで追加のたびにrestが更新される。
        //this.connected.add(e);
        // pushでええんや。
        this.connected.push(e);
        return this;
      }
      reset(){
        // dirtyFlagをリセットする
        this.dirtyFlag = false;
        // connectedとbranchesもリセットする
        this.connected.reset();
        this.branches.reset();
        return this;
      }
      checked(){
        // チェックしたかどうかを調べる
        return this.dirtyFlag;
      }
      check(){
        // dirtyFlagをオンにする
        this.dirtyFlag = true;
        return this;
      }
      static createTree(nodeVertice){
        let curVertice = nodeVertice;
        curVertice.check();

        const stuck = [];
        while(true){
          const connectedEdge = curVertice.connected.pick();
          if(connectedEdge === null){
            // ここのタイミングでリセット可能
            curVertice.connected.reset();
            if(stuck.length === 0){
              break;
            }else{
              curVertice = stuck.pop();
            }
          }else{
            connectedEdge.check();
            const nextVertice = connectedEdge.getOppositeVertice(curVertice);
            if(nextVertice.checked()){
              continue;
            }
            curVertice.branches.push(connectedEdge);
            nextVertice.branches.push(connectedEdge);
            nextVertice.check();
            stuck.push(curVertice);
            curVertice = nextVertice;
          }
        }
      }
      static createHierarchy(nodeVertice){
        let curVertice = nodeVertice;
        curVertice.check();
        curVertice.parent = null;
        curVertice.parentBranch = null;

        let curDepth = 0;

        const stuck = [];
        while(true){
          if(curVertice.branches.index === 0){
            // 初回訪問時にdepthを記録する
            curVertice.tree.setDepth(curDepth);
          }
          const branch = curVertice.branches.pick();
          if(branch === null){
            // ここでリセットできる
            curVertice.branches.reset();
            if(stuck.length === 0){
              break;
            }else{
              curVertice = stuck.pop();
              curDepth--;
            }
          }else{
            //e.check(); // checkするのはVerticeだけでOKです。
            const nextVertice = branch.getOppositeVertice(curVertice);
            if(nextVertice.checked()){
              continue;
            }
            nextVertice.check();

            curVertice.tree.addChild(nextVertice.tree);
            nextVertice.parent = curVertice;
            nextVertice.parentBranch = branch;

            stuck.push(curVertice);
            curVertice = nextVertice;
            curDepth++;
          }
        }
      }
    }

    // Edgeはグラフ理論における「辺」でVertice同士をつなぐもの。これがないと木を構築できない。
    class Edge{
      constructor(v0, v1){
        this.dirtyFlag = false;
        this.vertices = [v0, v1];
        v0.regist(this);
        v1.regist(this);
      }
      getVertices(){
        return this.vertices;
      }
      getOppositeVertice(v){
        if(v === this.vertices[0]){
          return this.vertices[1];
        }else if(v === this.vertices[1]){
          return this.vertices[0];
        }
        return null;
      }
      reset(){
        this.dirtyFlag = false;
        return this;
      }
      checked(){
        return this.dirtyFlag;
      }
      check(){
        this.dirtyFlag = true;
        return this;
      }
    }

    function _bitSeparate16(n){
      n = ((n<<8)|n) & 0x00ff00ff;
      n = ((n<<4)|n) & 0x0f0f0f0f;
      n = ((n<<2)|n) & 0x33333333;
      n = ((n<<1)|n) & 0x55555555;
      return n;
    }

    function morton16(a,b){
      const m = _bitSeparate16(a);
      const n = _bitSeparate16(b);
      return m|(n<<1);
    }

    function morton16Symmetry(a, b){
      return morton16(Math.min(a, b), Math.max(a, b));
    }

    // loopのデフォルトは...ですね。falseがいいですねタブンネ。
    // 200 -> non-loop200count, 200l -> loop200count,
    // 200ms -> non-loop200milliseconds, 200msl -> loop200milliseconds.
    class Clock{
      constructor(params = {}){
        const {
          duration = Infinity, type = 'discrete', loop = false
        } = params;
        this.duration = duration;
        this.type = type;
        this.elapsed = 0;
        this.timeStump = window.performance.now();
        this.pauseTimeStump = 0;
        this.active = true;
        this.loop = loop;
      }
      reset(){
        this.elapsed = 0;
        this.active = true;
        this.pauseTimeStump = 0;
        if(this.type === 'continuous'){
          this.timeStump = window.performance.now();
        }
      }
      update(){
        if(!this.active) return;
        switch(this.type){
          case 'discrete':
            this.elapsed++;
            break;
          case 'continuous':
            this.elapsed = window.performance.now() - this.timeStump;
            break;
        }
        if(this.elapsed >= this.duration){
          this.reset();
          if(!this.loop){ this.pause(); }
          return true;
        }
        return false;
      }
      pause(){
        if(!this.active) return;
        if(this.type === 'continuous'){
          this.pauseTimeStump = window.performance.now();
        }
        this.active = false;
      }
      start(){
        if(this.active) return;
        if(this.type === 'continuous'){
          this.timeStump += window.performance.now() - this.pauseTimeStump;
        }
        this.active = true;
      }
      switchActiveState(){
        if(this.active){
          this.pause();
        }else{
          this.start();
        }
      }
      getElapsed(){
        return this.elapsed;
      }
      getProgress(){
        return this.elapsed/this.duration;
      }
      getElapsedScaled(scale = 1000){
        return this.getElapsed()/scale;
      }
      getElapsedDiscrete(scale = 1000, modulo = 0){
        const n = Math.floor(this.getElapsed()/scale);
        modulo = Math.max(0, Math.floor(modulo));
        if(modulo === 0){ return n; }
        return n % modulo;
      }
      getElapsedSeparate(scale = 1000, modulo = 0){
        const x = this.getElapsedScaled(scale);
        const n = Math.floor(x);
        const f = x - n;
        modulo = Math.max(0, Math.floor(modulo));
        if(modulo === 0){ return {floor:n, fract:f}; }
        return {floor:n % modulo, fract:f};
      }
      static create(s){
        // たとえば60とすれば60フレームのdiscreteのClockが生成される。
        if(typeof s === 'number'){
          return Clock.create(s.toString());
        }
        // たとえば'-1ms'でcontinuousのInfinityになる。'-1'だとdiscreteのInfinityになる。
        // '200ms'とか'80'と指定する。
        if(s.match(/^[\+\-]{0,1}[0-9]+(|ms|msl|l)$/) === null){
    		return new Clock();
    	}
        const t = Number(s.match(/^[\+\-]{0,1}[0-9]+/)[0]);
        const duration = (t < 0 ? Infinity : t);
        const type = (s.match(/ms/) === null ? 'discrete' : 'continuous');
        const loop = (s.match(/l/) === null ? false : true);
        return new Clock({ duration, type, loop });
      }
    }

    // それ以外は廃止。

    // Sequencer.
    class SpotEvent{
      constructor(params = {}){
        const {
          key = 0, name = "", action = () => {}, priority = 0
        } = params;
        this.key = key;
        this.name = name;
        this.action = action;
        this.priority = priority;
      }
      execute(){
        // actionの戻り値を返す
        // thisを渡す。keyも含めてすべて使えるように。
        return this.action(this);
      }
    }
    // BandEventは廃止。

    // Sequencer.
    // stepはギリギリ残す...んー...んー...
    class Sequencer{
      constructor(params = {}){
        const {
          type = 'discrete',
          loop = false, duration = 1000, step = 1,
          hidden = "none", hiddenFunction = () => {}, usePriority = false
        } = params;
        this.type = type; // discrete/continuous
        this.waitingSpotEvents = []; // 待ち状態
        this.finishedSpotEvents = []; // 実行済み
        this.elapsed = 0;
        this.duration = duration; // 可変とする。1000でも200でも48000でも何でも。何なら途中で変更も可能。
        this.active = false; // pauseの挙動がDiscreteとContinuousで違うのです。
        this.loop = loop; // オートリセット
        this.step = step; // 刻み幅. 評価の際にkeyに掛ける。

        this.usePriority = usePriority;

        this.timeStump = 0;
        this.pauseTimeStump = 0;

        // 画面遷移の際にpauseを実行する場合にhiddenを"pause"にする。
        // resetしてからpauseしたい場合は"reset"にする。（pauseは必須）
        if(hidden !== "none"){
          document.addEventListener("visibilitychange", () => {
            // hiddenがcustomの場合は勝手に決める。document.hiddenは隠れるときtrueを返す。
            if(hidden === "custom"){
              hiddenFunction(document.hidden);
              return;
            }
            if(!this.active) return;
            if(document.hidden){
              if(hidden === "reset"){ this.reset(); }
              if(hidden === "reset" || hidden === "pause"){
                this.pause();
              }
            }
          });
        }
      }
      reset(){
        // Discrete: elapsedを0にする...delayを考慮していじるかもしれないが。
        // Continuous: timeStumpをwindow.performance.now()にしてelapsedを0にする
        // finishedのspotEventをすべてwaitingに移してkeyでsortする。
        // bandEventsを空にする
        // activeをtrueにする
        this.waitingSpotEvents.push(...this.finishedSpotEvents);
        this.sortSpotEvents();
        this.finishedSpotEvents = [];
        this.active = true;
        switch(this.type){
          case 'discrete': this.elapsed = 0; break;
          case 'continuous':
            this.timeStump = window.performance.now(); // delay廃止
            this.elapsed = 0;
            break;
        }
      }
      pause(){
        // 重ね掛け回避。
        if(!this.active) return;
        // activeをfalseにする
        // Discrete: 何もしない
        // Continuous: pauseTimeStumpを記録する
        this.active = false;
        if(this.type === 'continuous'){
          this.pauseTimeStump = window.performance.now();
        }
      }
      start(){
        // 重ね掛け回避
        if(this.active) return;
        // activeをtrueにする
        // Discrete: 何もしない
        // Continuous: 現在時刻とpauseTimeStumpとの差をtimeStumpに加える
        this.active = true;
        if(this.type === 'continuous'){
          this.timeStump += window.performance.now() - this.pauseTimeStump;
        }
      }
      switchActiveState(){
        // switch active state.
        if(this.active){
          this.pause();
        }else{
          this.start();
        }
      }
      clockUpdate(){
        // Discrete: 増やすだけ
        // Continuous: 時刻を取得してtimeStumpと比較する
        switch(this.type){
          case 'discrete': this.elapsed++; break;
          case 'continuous': this.elapsed = window.performance.now() - this.timeStump; break;
        }
      }
      update(){
        if(!this.active) return;
        // waitingSpotEventsを順に見て行ってelapsed以下のものを実行し
        // finishedの方に移すだけ。sort済みなので頭から見て行く
        // elapsed < keyでbreakする。もしくは配列の長さが0ならbreakする。while(length>0){ elapsed < key -> break; etc... }
        // etcといっても実行したのち配列から外してfinishedにぶち込むだけ

        while(this.waitingSpotEvents.length > 0){
          if(this.elapsed < this.waitingSpotEvents[0].key * this.step) break;
          const event = this.waitingSpotEvents.shift();
          event.execute();

          this.finishedSpotEvents.push(event);
        }

        // これは最後
        this.clockUpdate();

        // もしバックやスキップをするならタイミングはここしかない

        // オートループ
        if(this.elapsed >= this.duration){
          this.active = false;
          if(this.loop) this.reset();
        }
      }
      getElapsed(){
        // 単純にelapsedを取得するだけの関数
        return this.elapsed;
      }
      getProgress(){
        return this.elapsed / this.duration;
      }
      sortSpotEvents(){
        this.waitingSpotEvents.sort((e0, e1) => {
          if(e0.key < e1.key){ return -1; }
          else if(e0.key > e1.key){ return 1; }
          // 同じ優先順位でusePriorityがtrueの場合はそれも考慮する
          if(this.usePriority){
            if(e0.priority < e1.priority){ return -1; }
            else if(e0.priority > e1.priority){ return 1; }
          }
          return 0;
        });
      }
      addEvents(){
        const eventObjects = (Array.isArray(arguments[0]) ? arguments[0] : [...arguments]);
        // Eventをここに入れるケースなんてあるか？オブジェクトオンリーでよくない？
        // どうせ使わない...イベント単体で扱う機会がない気がする。
        // Bulletは単体でも仕事できるけどEventはSequencerの中でないと生きられないんで
        // そうしましょ。個別に扱う機会が無いと思う
        // ついでにelapsedに従ってwaitingに入れたりfinishedに入れたりしよう。
        // 動的更新の実験やりたい
        for(const data of eventObjects){
          const {shape = 'spot', key = 0} = data;
          const e = new SpotEvent(data);
          if(shape === 'spot'){
            // 動的更新を考慮してelapsedに従ってどっちに入れるか決める
            if(key < this.elapsed){
              this.finishedSpotEvents.push(e)
            }else{
              this.waitingSpotEvents.push(e);
            }
          }
        }
        this.sortSpotEvents();
      }
      deleteEvent(name){
        Sequencer.deleteEventFromArray(name, this.waitingSpotEvents);
        Sequencer.deleteEventFromArray(name, this.finishedSpotEvents);
      }
      isActive(){
        // 無いと不整合だろう。
        return this.active;
      }
      static deleteEventFromArray(name = "", array = []){
        // nameで検索し、同じ名前のそれをすべて排除。
        for(let k=array.length-1; k>=0; k--){
          if(name === array[k].name){
            array.splice(k, 1);
          }
        }
      }
    }

    // Score parsing.

    function firstParse(s, autoParse = false){
      // 全角スペースがあったら半角スペースにする
      const t_2 = s.replaceAll("　", " ");
      // タブがあったら半角スペース2つ分にする
      const t_1 = t_2.replaceAll(/\t/g, "  ");
      // まず改行記号をエスケープ変換して一行にする
      const t0 = t_1.replaceAll("\n", "\\n");
      // スターコメントの中身を排除する
      const t1 = t0.replaceAll(/(?<=\/\*).*?(?=\*\/)/g, "");
      // 無意味な改行を追加し、行コメント記号から改行エスケープまでの部分を排除する。
      const t2 = t1.concat("\\n").replaceAll(/(?<=\/\/).*?(?=\\n)/g, "");
      // セミコロンを改行にする。あとで変換しないとコメント内の;が引っかかる罠（怖い）
      const t3 = t2.replaceAll(";", "\\n");
      // コメント記号の残骸と半角スペースを削除
      const t4 = t3.replaceAll(/\/\*\*\//g,"").replaceAll(/\/\//g,"").replaceAll(" ", "");
      // 改行の後に「|」が連続している場合は同じパートとみなす。空白から始めたい場合は「.」を置けばいいのでそれで。
      // たとえば各パートが長くて一列に書きたくない場合にこれを使える。
      const t5 = t4.replaceAll("\\n|", "|");
      // おわり。
      // \\nでsplitして配列を返す。その際、空文字列の行を排除する。
      const array = t5.split("\\n").filter(s=>s.length > 0);
      return secondParse(array, autoParse);
    }

    // 繰り返しを導入。
    // ()内部の定義に関してはisValidScoreを使いました
    function applyRepeatSymbol(s){
      // ちょっとズルをします。というか()内部で指定された記号以外の記号を使うことは認められていません。
      const result = s.replaceAll(/\([A-Za-z0-9\[\]\{\}\^_\+\-\.]*?\)\*?[0-9]{1,}/g, (part) => {
      	const repeatString = part.match(/(?<=\().*?(?=\))/)[0];
      	const repeatCount = Number(part.match(/(?<=\*).*(?=$)/)[0]);
      	return repeatString.repeat(repeatCount);
      });
      // sample: "A44(CD)*7Ghtl(8K5)*4__)*98__(E33)*(8UI)*3^8UJL()*4W";
      //console.log(result); // A44CDCDCDCDCDCDCDGhtl8K58K58K58K5__)*98__(E33)*8UI8UI8UI^8UJLW
      return result;
    }

    // パース関数。文字列であることを明示したい場合は括弧を使ってください。以上。
    function parseValue(s){
      // 文字列の場合
      const isSingleQuote = s.match(/(?<=^\').*(?=\'$)/);
      if(isSingleQuote !== null){ return isSingleQuote[0]; }
      const isDoubleQuote = s.match(/(?<=^\").*(?=\"$)/);
      if(isDoubleQuote !== null){ return isDoubleQuote[0]; }
      const isBackQuote = s.match(/(?<=^\`).*(?=\`$)/);
      if(isBackQuote !== null){ return isBackQuote[0]; }

      // 特殊ケース
      if(s === "true"){ return true; }
      if(s === "false"){ return false; }
      if(s === "NaN"){ return NaN; }
      if(s === "null"){ return null; }
      if(s === "undefined"){ return undefined; }
      if(s === "Infinity"){ return Infinity; }
      if(s === "-Infinity"){ return -Infinity; }

      // 数の場合
      const isNumber = s.match(/^[0-9xeob\+\-\.].*$/);
      if((isNumber !== null) && !isNaN(Number(s))){ return Number(s); }

      // 配列の場合
      const isParenthesis = s.match(/(?<=^\[).*(?=\]$)/);
      // 配列でないなら処理は終わり
      if(isParenthesis === null){
        return s;
      }else{
        const t = isParenthesis[0];

        let parenthesisCount = 0;
        let parenthesisIsValid = true;

        let ss="";
        for(let i=0; i<t.length; i++){
          const letter = t[i];
          if(letter==='['){
            parenthesisCount++;
            ss += '[';
            continue;
          }
        	if(letter===']'){
            parenthesisCount--;
            // 負になる可能性があるのはここだけ
            if(parenthesisCount < 0){
              parenthesisIsValid = false;
              break;
            }
            ss += ']';
            continue;
          }
        	if(letter===','){
        		if(parenthesisCount === 0){
              ss += ',';
            }else{
              ss += '@';
            }
            continue;
        	}
          ss += letter;
        }

        // parenthesisCountが0でない -> そのまま文字列出力
        // parenthesisIsValidがfalse -> そのまま文字列出力
        if(parenthesisCount !== 0){ return s; }
        if(!parenthesisIsValid){ return s; }

        // ,で区切った後で@を,で復元する
        const properSplitted = ss.split(',');
        const modified = properSplitted.map(u => u.replaceAll('@', ','));
        return modified.map((x) => parseValue(x));
      }

      // それ以外。
      return s;
    }

    // ユーザー定義で変数を用意し、そのあとに@で内容を続けることで、
    // 局所的に一時変数を使う小技をやりたいので、そのための関数。
    // あ！！しまった、@が無い場合は...そのまま返してください...ごめんなさい。
    // @が無い場合は従来通りなのでそのまま返します。@がある場合に、ユーザー定義部分をパースします。
    // ごめんなさいです。
    // autoParseがtrueの場合は引数を自動でパースしてくれる（はず）
    function parseUserDefines(s, autoParse = false){
      // @が存在しない場合はsをvalueとして出力する
      if(s.match(/@/) === null){
        return {value:s, userDefines:{}};
      }
      // sの想定形状：a=0,b=1,c=2@helloWorld
      const afterAtMark = s.match(/(?<=@).*?(?=$)/);
      const value = (afterAtMark === null ? "" : afterAtMark[0]);
      const beforeAtMark = s.match(/(?<=^).*?(?=@)/);
      if(beforeAtMark === null){
        return {value, userDefines:{}};
      }
      // &の方がいい気がするけれど...
      // 例：a=1&b=2&c=3@helloworld
      // というわけで「&」に仕様変更。
      const allDefines = beforeAtMark[0].split('&');
      const userDefines = {};
      //if(allDefines !== null){
      for(const defineBlock of allDefines){
        const left = defineBlock.match(/(?<=^).+(?=\=)/);
        const right = defineBlock.match(/(?<=\=).+(?=$)/);
        if(left===null||right===null)continue;
        // autoParseの時はこうする
        if(autoParse){
          userDefines[left[0]] = parseValue(right[0]);
        }else{
          userDefines[left[0]] = right[0];
        }
      }
      //}
      return { value, userDefines };
    }

    function secondParse(a, autoParse = false){
      const result = [];
      const varDict = {};
      const macroDict = {};

      for(let i=0; i<a.length; i++){
        const target = a[i];
        if(target === "") continue; // 念のため
        // step定義の場合（step:「1以上の整数」）
        if(target.match(/^step\=[1-9]{1}[0-9]*$/) !== null){
          result.push({type:"step", value:Number(target.split("=")[1])});
          continue;
        }
        // beat定義の場合（beat:「1以上の整数」）
        if(target.match(/^beat\=[1-9]{1}[0-9]*$/) !== null){
          result.push({type:"beat", value:Number(target.split("=")[1])});
          continue;
        }
        // mode定義の場合（mode: 'even'ないしは'step'のみ可能で、それ以外なら無効）
        // 判定に「.+」を使うと定義がmode=で始まっている場合にバグる。注意。なので厳格に決めてしまう。
        // evenとstepを定義する以外のことは、一切しない。@とかも無し。
        if(target.match(/^mode\=step$/) !== null || target.match(/^mode\=even$/) !== null){
          const modeDefine = target.split("=")[1];
          result.push({type:"mode", value:modeDefine});
          continue;
        }
        // #lib, #endlib, #mod, #endmodの場合
        // #libは空っぽを許さない。
        if(target.match(/(?<=^#lib).+(?=$)/) !== null){
          result.push({type:"lib", value:target.split("#lib")[1]});
          continue;
        }
        // endlibは空っぽを許す。一応余地を残す。空っぽを許すだけ。
        if(target.match(/(?<=^#endlib).*(?=$)/) !== null){
          result.push({type:"endlib", value:target.split("#endlib")[1]});
          continue;
        }
        // #modは空っぽを許さない。
        if(target.match(/(?<=^#mod).+(?=$)/) !== null){
          result.push({type:"mod", value:target.split("#mod")[1]});
          continue;
        }
        // endmodは空っぽを許す。一応余地を残す。許すだけ。
        if(target.match(/(?<=^#endmod).*(?=$)/) !== null){
          result.push({type:"endmod", value:target.split("#endmod")[1]});
          continue;
        }
        // macroの場合
        if(target.match(/macro.+\=.+$/) !== null){
          const macroDef = target.match(/(?<=macro).*(?=$)/)[0];
          const macroDefines = macroDef.split("=");
          macroDict[macroDefines[0]] = macroDefines[1];
          continue;
        }
        // varの場合
        if(target.match(/var.+\=.+$/) !== null){
          const varDef = target.match(/(?<=var).*(?=$)/)[0];
          const varDefines = varDef.split("=");
          varDict[varDefines[0]] = varDefines[1];
          continue;
        }
        // ようやく「楽譜」の場合
        const scoreArrays = []; // 結果的に長さ0ならresultに入れない
        const scores = target.split("|");
        for(const score of scores){
          // まずmacroでreplaceAllする。全てはそれから。
          let s = score;
          for (const [key, value] of Object.entries(macroDict)) {
            s = s.replaceAll(key, value);
          }
          // 繰り返しを適用する
          // (AH)*3 -> AHAHAHのような、繰り返し記号のパーシングを実行する
          s = applyRepeatSymbol(s);

          // もしパートからユーザー定義部分を取り出す処理をしたいならここでやる。
          // fifthParseの内容を改変し、末尾に{type:'info', symbolCount:シンボル数...冒頭のbeginSplitのcountからわかる}を付与。
          // そこにユーザー定義のuserDefinesを追加する
          // valueは文字列sとしてthird以降のパースに使う
          const parsedUserDefines = parseUserDefines(s, autoParse);
          const content = parsedUserDefines.value;
          const userDefines = parsedUserDefines.userDefines;

          // ここから先は別メソッドに依存する。nullもしくは配列を返してもらう。
          // 若干内容変更。offsetに割合が入ってる。valueに文字列が入ってる。
          const parsed0 = thirdParse(content);
          if(parsed0 === null){ console.error("第一パースに失敗"); continue; }
          const parsed1 = fourthParse(parsed0);
          if(parsed1 === null){ console.error("第二パースに失敗"); continue; }
          const parsedScore = fifthParse(parsed1, varDict);
          if(parsedScore === null){ console.error("最終パースに失敗"); continue; }
          if(parsedScore.length === 0) continue;

          // infoBlockにuserDefinesを付与する
          const infoBlock = parsedScore.pop();
          infoBlock.userDefines = userDefines;
          parsedScore.push(infoBlock);

          scoreArrays.push(parsedScore);
        }
        if(scoreArrays.length === 0) continue;
        result.push({type:"score", value:scoreArrays});
      }
      if(result.length === 0){ return null; }
      return result;
    }

    function thirdParse(s){
      if(s === ""){
        console.error("からっぽ！");
        return null;
      }

    	//if(s.match(/^[A-Za-z0-9\[\]\{\}\^_\+\-\.]*$/d) === null){
      if(!ScoreParser.isValidScore(s)){
        // 調べる場所を統一することで、あちこち変更することになるのを防ぐ
        console.error(`${s}: 使用文字が不正`);
        return null;
      }

    	let unionCheckCount = 0;
    	let splitCheckCount = 0;

      const result = [];
    	let temp = "";

    	for(let i=0; i<s.length; i++){
    		const letter = s[i];
    		// A~Zの場合
    		if(letter.match(/[A-Z]{1}/) !== null){
    			if(temp.length > 0){
    				result.push({type:"note", value:temp, offset:0});
    			}
    			temp = letter;
    			continue;
    		}
    		// .の場合
    		if(letter === "."){
    			if(temp.length > 0){
    				result.push({type:"note", value:temp, offset:0});
    			}
    			result.push({type:"note", value:".", offset:0});
    			temp = "";
    			continue;
    		}
        // 括弧記号の場合は入れてしまう。ただしtemp.length > 0とする。
        if(letter.match(/[\[\]\{\}]{1}/) !== null && temp.length > 0){
          result.push({type:"note", value:temp, offset:0});
          temp = "";
        }
    		// {の場合
    		if(letter === "{"){
          // もし[]の最中であれば不正
          if(unionCheckCount > 0){
            console.error("[]の中に{}を入れないこと");
            return null;
          }
    			splitCheckCount++;
    			result.push({type:"beginSplit", count:0, interval:0, offset:0});
    			continue;
    		}
        // }の場合
    		if(letter === "}"){
          // もし[]の最中であれば不正
          if(unionCheckCount > 0){
            console.error("[]の中に{}を入れないこと");
            return null;
          }
    			splitCheckCount--;
    			if(splitCheckCount < 0){ console.error("{}の並びが不正"); return null; }
    			result.push({type:"closeSplit"});
    			continue;
    		}
        // [の場合
    		if(letter === "["){
    			unionCheckCount++;
    			if(unionCheckCount > 1){ console.error("[]の並びが不正"); return null; }
    			result.push({type:"beginUnion", count:0, offset:0});
    			continue;
    		}
        // ]の場合
    		if(letter === "]"){
    			unionCheckCount--;
    			if(unionCheckCount < 0){ console.error("[]の並びが不正"); return null; }
          result.push({type:"closeUnion"});
          continue;
    		}
        // それ以外。ここでは確定しない。
        if(temp.length > 0){
          temp += letter;
        }
    	}
      // checkCountはいずれも0でなければならない
      if(unionCheckCount !== 0){ console.error("[]の個数が不正"); return null; }
      if(splitCheckCount !== 0){ console.error("{}の個数が不正"); return null; }
      // この時点でtemp.length > 0なら入れる
      if(temp.length > 0){
        result.push({type:"note", value:temp, offset:0})
      }
      // 最後に頭とおしりを{}で囲む
      result.unshift({type:"beginSplit", count:0, interval:0, offset:0});
      result.push({type:"closeSplit"});
      return result;
    }

    // 先にcountを定めてしまう。その内部に存在するユニットの個数。
    function fourthParse(s){
      // []や()のbeginを入れる
      const pStuck = [];
      // atでよいようです：https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/at#配列の末尾の値を返す
      //const tail = (a) => a[a.length-1];

      for(let i=0; i<s.length; i++){
        const target = s[i];
        if(target.type === "note"){
          //tail(pStuck).count++;
          pStuck.at(-1).count++;
          continue;
        }
        if(target.type === "beginSplit" || target.type === "beginUnion"){
          pStuck.push(target);
          continue;
        }
        if(target.type === "closeSplit" || target.type === "closeUnion"){
          const pLast = pStuck.pop();
          if(pLast.count > 0 && pStuck.length > 0){
            //tail(pStuck).count++;
            pStuck.at(-1).count++;
          }
          continue;
        }
      }
      // countが0の括弧がある場合は認めない
      const beginElements = s.filter((t) => (t.type === "beginSplit" || t.type === "endSplit"));
      if(beginElements.some((t) => t.count === 0)){
        console.error("{}や[]の連続があります");
        return null;
      }
      return s;
    }

    // 最後に各noteのoffsetを計算する
    // 1を分割していく。いくつで分割するかという、その割合でoffsetを定めていく。
    // ついでにdictで必要なら置き換える(varDict)
    function fifthParse(s, dict = {}){
      let currentOffset = 0;
      let currentInterval = 1;
      let unionIsOpen = false;
      const pStuck = [];
      //const tail = (a) => a[a.length-1]; // 不要でした

      for(let i=0; i<s.length; i++){
        const target = s[i];
        if(target.type === "note"){
          target.offset = currentOffset;
          if(!unionIsOpen){
            currentOffset += currentInterval;
          }
          continue;
        }
        if(target.type === "beginSplit"){
          target.offset = currentOffset;
          target.interval = currentInterval;
          currentInterval = currentInterval / target.count;
          pStuck.push(target);
          continue;
        }
        if(target.type === "closeSplit"){
          const pLast = pStuck.pop();
          currentOffset = pLast.offset + pLast.interval;
          currentInterval = pLast.interval;
          continue;
        }
        if(target.type === "beginUnion"){
          target.offset = currentOffset;
          unionIsOpen = true;
          pStuck.push(target);
          continue;
        }
        if(target.type === "closeUnion"){
          const pLast = pStuck.pop();
          currentOffset = pLast.offset + currentInterval;
          unionIsOpen = false;
          continue;
        }
      }

      // s[0]はこっちで用意したbeginSplitで、countにシンボルカウントが入っている。
      // すなわちシンボルの個数である。6つなら6, 8つなら8.
      //console.log(s[0].type, s[0].count);
      const symbolCount = s[0].count;

      // "note"以外は不要...
      const result = s.filter((t) => (t.type === "note"));
      // 必要ならvarDictで翻訳する
      for(const target of result){
        if(dict[target.value] !== undefined){
          target.value = dict[target.value];
        }
      }
      // 末尾にinfoという形でシンボルカウントの情報を付与する
      result.push({type:'info', symbolCount:symbolCount});
      return result;
    }

    // EventSeed系のクラスを廃止

    // 楽譜翻訳機
    class ScoreParser{
      constructor(options = {}){
        this.libs = {};
        this.mods = {};
        this.eventSeeds = {};
        this.sequencers = {};
        const {autoParse = false} = options;
        this.autoParse = autoParse;
      }
      addEventSeed(name = "", data){
        // dataは関数/object.
        // objectの場合はそれによりEventSeedを作る。まあparamsですね。
        // 関数の場合はpresetsを引数に取りそれがparamsを作る。shapeはspotがデフォルトなので、
        // SpotEventSeedを作るのであれば指定する必要は無い。
        this.eventSeeds[name] = data;
      }
      addLib(name, libFunction = (code, step, beat) => {}){
        this.libs[name] = libFunction;
      }
      addMod(name, modFunction = (code, step, beat) => {}){
        this.mods[name] = modFunction;
      }
      applyFunction(code, presets = {}, funcs = {}, value = ""){
        // modないしはlibを適用するパート。funcsにthis.modsやthis.libsが入る
        // なぜなら関数を引き出すためのproperなmodNameやlibNameが後から計算されるので。
        // それはvalueが「a=0,b=1,c=2@name」という形をしていて、この「name」です。

        // parseUserDefinesを使う。これを使うと@以降をvalue,@以前を引数定義として取得できる。
        // 引数定義は,区切りで=で指定する。いずれも文字列である。
        const parsedValue = parseUserDefines(value, this.autoParse);
        const functionName = parsedValue.value;
        const userArguments = parsedValue.userDefines;

        // 関数名でライブラリを検索
        const func = funcs[functionName];
        // 無ければスルー
        if(func === undefined){ return null; }
        //if(funcs[value] === undefined){ return null; }
        const {step, beat, codeOffset, partIndex, blockIndex} = presets;
        // とりあえずpresetsからデータを取り出して、以降追加していく。
        const data = {
          step:step, beat:beat, codeOffset:codeOffset, partIndex:partIndex, blockIndex:blockIndex
        };
        // Object.entriesを使ってユーザー定義の引数を登録
        for(const [name, arg] of Object.entries(userArguments)){
          data[name] = arg;
        }
        // データからいろいろ取得
        return func(code, data);
      }
      createEventSeed(code, presets = {}, mods = [], libs = []){
        // あ...そうか...
        // modでcodeをいじってそれを解釈するから、presetそのままではダメなんだ。
        // codeだけこっちで改変しないといけないんだ。ああ～～～～～...
        // だからこっちでcodeだけいじる必要があるわけね。
        // すべてオブジェクトにするのはやめよう。codeだけ分離して、それ以外を使おう。

        // "."の場合はnullを返す
        if(code === "."){
          return null;
        }
        // まずcodeでeventSeedsを引き出せるか調べる。引き出せるならそこで終わり。
        // eventSeedsの中身はobject, もしくはpresetsからobjectを生成する関数に制限する。
        if(this.eventSeeds[code] !== undefined){
          const seed = this.eventSeeds[code];
          const recipe = (typeof seed === 'function' ? seed(presets) : seed);
          return recipe;
          // 変なものが指定されている場合
          return null;
        }
        // それが無い場合、まずmods一覧を見て行き、適用できるのがあったら適用する
        // modは適用できるだけ適用する。nullが返る場合は据え置きとし、次に行く。
        // なお運用順は逆順。
        let properCode = code;
        // 適用順を逆にする。これにより、最後に入れたものが優先される。
        for(let i=mods.length-1; i>=0; i--){

          const modName = mods[i];
          // ここで渡すのはproperCodeですね...
          // modが1回までっていう前提で書いてたからcodeって書いちゃってたわ。最悪だ。
          const modifiedCode = this.applyFunction(properCode, presets, this.mods, modName);
          // modifiedCodeがnullの場合は、properCodeを更新せず、次のmodに向かう。
          if (modifiedCode === null) continue;
          // nullでない場合に更新する。こうして最後まで適用し続ける。
          properCode = modifiedCode;
          //break;
        }
        // それが終わったらlibを適用していく。適用できるのは最初にヒットした1つだけ。
        let resultSeed = null;
        // 適用順を逆にする。これにより、最後に入れたものが優先される。
        for(let i=libs.length-1; i>=0; i--){

          const libName = libs[i];
          const seed = this.applyFunction(properCode, presets, this.libs, libName);

          if (seed === null) continue;
          // このseedについてはrecipe一択とする。つまりshapeがあり、EventSeedのデータがある。
          // 今のところSpotEventSeedのみで、actionと、あればpriority. 以上。他にできない限り、shapeは不要。
          resultSeed = seed; // ここでは保留。
          if(resultSeed !== null) break;
        }
        // nullでない時に抜けてしまうのでlibが適用できるのであればnullではないその値が返る。
        // 適用できず終わった場合、nullが返る。
        return resultSeed;
      }
      createEventSeedArray(parsedScore){
        // parsedScoreを元にeventSeed配列を作る。
        // stepだけ保持する。libの適用に使うので。それ以外は使わないでそのまま。
        // この時点でlib,endlib,mod,endmodは破棄される。今後追加するが、if,endif,let,calc,goto,anchorは破棄されない。
        // まあ今は不要だわね。
        const result = [];
        const currentMods = [];
        const currentLibs = [];
        let currentStep = 0;
        let currentBeat = 0; // beatも使えるようにしよう。
        let blockIndex = 0; // 小節番号（0ベース）
        for(let i=0; i<parsedScore.length; i++){
          const {type, value} = parsedScore[i];
          if(type === "lib"){
            if(currentLibs.indexOf(value) < 0){
              currentLibs.push(value);
            }
            continue;
          }
          if(type === "endlib"){
            // 仕様変更により、最後に入れたものを排除する。引数(value)は無意味。
            /*
            const libIndex = currentLibs.indexOf(value);
            if(libIndex >= 0){
              currentLibs.splice(libIndex, 1);
            }
            */
            currentLibs.pop();
            continue;
          }
          if(type === "mod"){
            if(currentMods.indexOf(value) < 0){
              currentMods.push(value);
            }
            continue;
          }
          if(type === "endmod"){
            // 仕様変更により、最後に入れたものを排除する。引数(value)は無意味。
            /*
            const modIndex = currentMods.indexOf(value);
            if(modIndex >= 0){
              currentMods.splice(modIndex, 1);
            }
            */
            currentMods.pop();
            continue;
          }
          if(type === "beat"){
            result.push({type:"beat", value:value});
            currentBeat = value;
            continue;
          }
          if(type === "step"){
            result.push({type:"step", value:value});
            currentStep = value;
            continue;
          }
          if(type === "mode"){
            // ここではmode情報を使わないのでcurrentを保つ必要は無い
            result.push({type:"mode", value:value});
            continue;
          }
          if(type === "score"){
            // まずvalueはこの時配列で、各成分は同じ小節の別パート。基本的に1つ。2つか3つの場合もある。
            // それにアタッチする。その中身は...
            // 実はoffsetが計算済みなので、あとでそれを使ってkeyを計算するんだが、要するにもう配列要素は無いです。
            // なのでseedを新しく用意してeventSeedを付与して終わりです。つまりvalueをそのまま使えばよろしい。
            //for(const eachScore of value){
            for(let l=0; l<value.length; l++){
              const eachScore = value[l];
              // infoは使いますね...stepとbeatは上書きされる可能性がある。
              const infoBlock = eachScore.pop();
              // なのでそれを保持しておく。
              const {step, beat} = infoBlock.userDefines;
              // そしてこのパース限定での値を決定してそっちを使う。
              // 一時的なので、小節が終わったら破棄される。
              const temporaryStep = ((step !== undefined) && !(isNaN(Number(step))) ? Number(step) : currentStep);
              const temporaryBeat = ((beat !== undefined) && !(isNaN(Number(beat))) ? Number(beat) : currentBeat);

              //console.log(infoBlock);
              // infoBlock以外の部分についてseedにeventSeedを設定する
              for(let k=0; k<eachScore.length; k++){
                const target = eachScore[k];
                // code: 対象文字列（modで改変する可能性があるので分離）
                // step: 定義したstep, たとえば音の長さの基準
                // beat: 定義したbeat, step*beatで小節の長さになる(evenの場合...)（discrete:フレーム数、continuous:ミリ秒数）
                // codeOffset: パート内での割合、事前に計算したもの
                // partIndex: パート番号
                // blockIndex: 小節の通し番号
                const code = target.value;
                const presets = {
                  step:temporaryStep, beat:temporaryBeat,
                  codeOffset:target.offset, partIndex:l, blockIndex:blockIndex
                };
                // これだけ！！
                target.seed = this.createEventSeed(code, presets, currentMods, currentLibs);
                //target.seed = this.createEventSeed(target.value, currentStep, currentBeat, currentMods, currentLibs)
              }
              // 終わったらinfoBlockを戻す
              eachScore.push(infoBlock);
            }
            blockIndex++; // 小節番号を増やす
            result.push({type:"score", value:value});
          }
        }
        // 現段階ではstep, beat, scoreだけっすね。
        return result;
      }
      createEventArray(eventSeedArray){
        // seedArrayから作る。
        let eventId = 0;
        let currentStep = 250; // デフォルト。ScoreParserのデフォはcontinuousなので'250ms'.
        let currentBeat = 4; // デフォルト。4beat. つまり1秒。
        let currentMode = 'even'; // デフォルト。発火タイミングはstep*beatをシンボル数で均等割りする。
        let currentOffset = 0;
        const events = [];
        for(let i=0; i<eventSeedArray.length; i++){
          const {type, value} = eventSeedArray[i];
          if(type === "step"){
            currentStep = value;
            continue;
          }
          if(type === "beat"){
            currentBeat = value;
            continue;
          }
          if(type === "mode"){
            currentMode = value;
            continue;
          }
          if(type === "score"){
            // valueの全ての成分は同じオフセットから計算される。小節の長さはすべてbeat*stepで計算される。
            // しかし局所offsetは既に計算されているので、key = currentOffset + beat*step*offsetで終わりです。

            let MAX_PART_LENGTH = 0;
            //const PART_LENGTH = currentBeat * currentStep;

            for(let l=0; l<value.length; l++){
              const eachScore = value[l];
              // infoBlockを先にはじいておく
              // この中にuserDefines（ユーザー定義変数,stepとかbeatとか）と、
              // symbolCount（用意したシンボルの個数）が入ってる
              const infoBlock = eachScore.pop();
              //console.log(infoBlock);
              const {userDefines = {}, symbolCount} = infoBlock;
              const {step, beat, mode} = userDefines;

              const temporaryStep = ((step !== undefined) && !(isNaN(Number(step))) ? Number(step) : currentStep);
              const temporaryBeat = ((beat !== undefined) && !(isNaN(Number(beat))) ? Number(beat) : currentBeat);
              const temporaryMode = (mode !== undefined ? mode : currentMode); // 'even'/'step'

              // temporaryModeが'even'の場合はstep*beatで計算する。'step'の場合はstep*symbolCountで計算する
              const PART_LENGTH = (temporaryMode === 'step' ? temporaryStep * symbolCount : temporaryStep * temporaryBeat);
              // 一番長いのに合わせる
              MAX_PART_LENGTH = Math.max(MAX_PART_LENGTH, PART_LENGTH);

              // どのスコアも計算方法は同じ
              for(let k=0; k<eachScore.length; k++){
                const target = eachScore[k];
                // nullの場合はスルー
                if(target.seed === null) continue;
                // offsetからキーを計算する
                const key = currentOffset + PART_LENGTH * target.offset;
                // shapeで分ける。とりあえずspotしかない。
                const {shape = 'spot'} = target.seed;
                if(shape === 'spot'){
                  events.push(new SpotEvent({
                    key:key, name:`event_${eventId++}`, action:target.seed.action, priority:target.seed.priority
                  }));
                }
                //events.push(target.seed.create(key, `event_${eventId++}`));
              }
            }
            // おわりです。
            currentOffset += MAX_PART_LENGTH;
            //currentOffset += PART_LENGTH;
          }
        }
        return {events:events, duration:currentOffset};
      }
      createSequencer(score, params = {}){
        // 音楽の再生などで画面遷移の際にポーズしたい場合は
        // hiddenを"pause"にする。リセットもしたい場合は"reset".
        const {
          name = "sequencer", type = "continuous",
          loop = false, showInfo = {},
          hidden = "none", hiddenFunction = () => {}, usePriority = false
        } = params;
        const {
          parsed : showParsed = false, eventSeeds : showEventSeeds = false, events : showEvents = false
        } = showInfo;
        // 各scoreに対してeventArrayを作る。
        const scores = (Array.isArray(score) ? score : [score]);
        const events = [];
        let duration = 0;
        // durationはそれぞれのスコアのMAXを取る
        for(const eachScore of scores){
          const a0 = ScoreParser.Parse(eachScore, this.autoParse);
          if(showParsed){ console.log(a0); }
          const a1 = this.createEventSeedArray(a0);
          if(showEventSeeds){ console.log(a1); }
          const eventArray = this.createEventArray(a1);
          if(showEvents){ console.log(eventArray); }
          events.push(...eventArray.events);
          duration = Math.max(duration, eventArray.duration);
        }
        // typeで分ける。
        const seq = new Sequencer({
          type, loop, duration, hidden, hiddenFunction, usePriority
        });

        seq.addEvents(events);
        this.sequencers[name] = seq;
        // そのまま使いたい場合のためにseqを返す感じで。はい。OKですね。はい。...
        return seq;
      }
      isActive(name){
        // activeかどうかをnameで取得する関数
        const sequencer = this.sequencers[name];
        if(sequencer === undefined){ return; }
        return sequencer.active;
      }
      static Parse(score, autoParse = false){
        // firstParse.
        return firstParse(score, autoParse);
      }
      static isValidScore(scoreString){
        // スコア表示に適する文字の並びかどうか調べるだけ。
        // アルファベットの大文字かもしくは.を含まない場合もアウト
        // （いずれかが含まれていれば一応形にはなる）
        if(scoreString.match(/[A-Z\.]/) === null){ return false; }
        // 今のところ使える文字はここまで
        return (scoreString.match(/^[A-Za-z0-9\[\]\{\}\^_\+\-\.]*$/d) !== null);
      }
    }

    // できるの？？
    // SequencerのメソッドをScoreParserに移植する
    // 何でもかんでもってわけではなく、作った後でresetとかそういうのをする時のあれだけでいいかなと。
    // 別に作るシーケンサーが1つならそれそのまま使えばいいんだけど、複数必要な場合が、無いとは言い切れないので。
    // それに他の場面でこういうことが実質的に必要になるかもしれないので。
    const derivedMethodsFromSequencer = ["reset", "pause", "start", "switchActiveState", "update"];
    for(const method of derivedMethodsFromSequencer){
      ScoreParser.prototype[method] = (function(name){
        // この場合thisはScoreParserのインスタンスになる。
        // 引数が無い場合は全てに適用されることにしよう
        if(arguments.length === 0){
          for(const sequencer of Object.values(this.sequencers)){
            sequencer[method]();
          }
          return;
        }
        // 存在しなかったら抜ける
        if(this.sequencers[name] === undefined){ return; }
        // 存在したら適用。
        this.sequencers[name][method]();
      });
    }

    // Easing.
    // 基本10種のeaseIn,easeOut,easeInOutがデフォルト、それに加えてlinear,zero,one合計33
    // に加えて、カスタム機能も整備
    // 好きに関数をカスタマイズして名前を付けて再利用できる
    // loop,reverse,reverseLoop,clampの4種類
    // 関数を直接ほしい場合はget,適用したいだけならapplyと、使い分けられる。
    class Easing{
      constructor(){
        this.funcs = {};
        this.initialize();
      }
      initialize(){
        this.regist("linear", x => x); // これは特別。

        // まずSineとかQuadのInバージョンを作り...
        // funcs.easeIn~~~はそのまま
        // funcs.easeOut~~~はそれを加工
        // funcs.easeInOut~~~も別の手法で加工
        // 一通りできたらそれをさらに加工してRevを作る流れ。
        const baseFuncs = {};
        baseFuncs.Sine = x => 1-Math.cos(0.5*Math.PI*x);
        baseFuncs.Quad = x => x*x;
        baseFuncs.Cubic = x => x*x*x;
        baseFuncs.Quart = x => x*x*x*x;
        baseFuncs.Quint = x => x*x*x*x*x;
        baseFuncs.Expo = x => (x > 0 ? Math.pow(2, 10*(x-1)) : 0);
        baseFuncs.Circ = x => 1-Math.sqrt(1-x*x);
        baseFuncs.Back = x => 2.7*x*x*x - 1.7*x*x;
        baseFuncs.Elastic = x => {
          if(x>0 && x<1){
            const c4 = (2 * Math.PI) / 3;
            return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
          }
          if(x>0){ return 1; }
          return 0;
        }
        const easeOutBounce = x => {
          const n1 = 7.5625;
          const d1 = 2.75;
          if(x < 1 / d1){
            return n1 * x * x;
          }else if (x < 2 / d1){
            return n1 * (x -= 1.5 / d1) * x + 0.75;
          }else if (x < 2.5 / d1){
            return n1 * (x -= 2.25 / d1) * x + 0.9375;
          }
          return n1 * (x -= 2.625 / d1) * x + 0.984375;
        }
        baseFuncs.Bounce = x => 1-easeOutBounce(1-x);
        for(let funcName of Object.keys(baseFuncs)){
          const f = baseFuncs[funcName];
          this.regist("easeIn"+funcName, f);
          this.regist("easeOut"+funcName, (x => 1-f(1-x)));
          this.regist("easeInOut"+funcName, (x => (x < 0.5 ? 0.5*f(2*x) : 1-0.5*f(2*(1-x)))));
        }
        this.regist("zero", (x => 0));
        this.regist("one", (x => 1));
      }
      regist(name, func){
        if (typeof func === "function") {
          // 関数の場合は直接。
          this.funcs[name] = func;
          return;
        }
        // パラメータ指定
        this.funcs[name] = this.compositeMulti(func);
      }
      get(name){
        // 関数が欲しい場合
        return this.funcs[name];
      }
      apply(name, value){
        // 直接値が欲しい場合
        return this.funcs[name](value);
      }
      parseFunc(f){
        if (typeof f === "string") {
          if (typeof this.funcs[f] === "function") {
            return this.funcs[f];
          }
        }
        if (typeof f === "function") return f;
        // 未定義の場合はlinearが返る
        return x => x;
      }
      toClamp(f){
        return Easing.toClamp(this.parseFunc(f));
      }
      toLoop(f){
        return Easing.toLoop(this.parseFunc(f));
      }
      toReverseLoop(f){
        return Easing.toReverseLoop(this.parseFunc(f));
      }
      toReverse(f){
        return Easing.toReverse(this.parseFunc(f));
      }
      compositeMulti(params = {}){
        const {f = [x=>x]} = params;
        for(let k=0; k<f.length; k++){
          f[k] = this.parseFunc(f[k]);
        }
        return Easing.compositeMulti(params);
      }
      static toClamp(f){
        // 0～1でclampする
        return (x) => f(Math.max(0, Math.min(1, x)));
      }
      static toLoop(f){
        // 元の0～1の関数を延々と
        return (x) => f(((x % 1) + 1) % 1);
      }
      static toReverseLoop(f){
        // 元の0～1から0～1～0～1～...
        // 元の関数をForwardBackしたものをLoopしたもの
        return (x) => {
          const t = (((x/2) % 1) + 1) % 1;
          if (t < 0.5) return f(2*t);
          return f(2-2*t);
        }
      }
      static toReverse(f){
        // 1～0にするだけ
        return (x) => f(1-x);
      }
      static composite(f, g, t, v){
        // 0～tでf, t～1でgという関数を作る。
        // 取る値はf,gともに0～1を想定しており
        // 途中でvになって最後が1ですね
        return (x) => {
          if (x < t) return f(x/t) * v;
          return v + (1-v)*g((x-t)/(1-t));
        }
      }
      static compositeMulti(params = {}){
        // 関数列fの長さをNとすると
        // 時間間隔列tは長さN+1で値の列vも長さN+1を想定
        // tは0から1までの間を単調増加で指定
        // vはそれに対応するように値を用意する
        // f,t,vから0～1に対し値を返す関数を作る
        // 各々のfは0～1ベースの関数であることが想定されている
        // 取る値の範囲も0～1になっているかどうかは問わない（ずっと0とかでもいい）
        // 整合性が取れるかどうかはvの指定次第
        const {f = [x=>x], t = [0,1], v = [0,1]} = params;
        const {loopType = "clamp"} = params;
        const resultFunction = (x) => {
          //x = clamp(x, 0, 1); // optionで選べるようにするかも？
          for(let k=1; k<t.length; k++){
            if (x < t[k]){
              const factor = f[k-1]((x - t[k-1]) / (t[k] - t[k-1]));
              return v[k-1] + (v[k] - v[k-1]) * factor;
            }
          }
          return v[v.length - 1]; // xが1の場合
        }
        switch(loopType){
          case "clamp":
            return Easing.toClamp(resultFunction);
          case "loop":
            return Easing.toLoop(resultFunction);
          case "reverseLoop":
            return Easing.toReverseLoop(resultFunction);
          case "reverse":
            return Easing.toReverse(resultFunction);
        }
        return resultFunction;
      }
    }

    // 使い方をいじって進捗を取得できるようにする

    // ResourceLoader. 使い方
    // 生成するときに{name:{url:~~,callback:~~,arrayBuffer:~~}, ...} のように作るんだけどregistでも作れる
    // loadでロードすると同時にpromiseを返すのでそのまま非同期処理に持っていける
    // loadAllでまとめてロードできた場合の処理を記述できる
    // isLoadedとisLoadedAllだがisLoadedAllは引数指定がない場合「すべて」となる
    // 望むならすべてロードされた状態でdrawを開始できる
    // arrayBuffer形式での取得も可能とする
    // getResourceで取得
    // fontについてはfontFileを返す。document.fonts.add(res)で登録時の名前で使えるようになる
    // opentypeでやりたいならarrayBufferで取得してよろしくやる
    // videoやmusicも可能、videoの場合出力形式はHTMLVideoElementなのでそのままtexImage2Dで使える
    class ResourceLoader{
      constructor(data = {}){
        this.loaders = {};
        for(const name of Object.keys(data)){
          this.regist(name, data[name]);
        }
      }
      regist(name, params = {}){
        // 文字列の場合はそのままurlとしcallbackは存在しないとする
        if(typeof params === 'string'){
          this.regist(name, {url:params});
          return this;
        }
        // resはresourceの省略形
        // callbackは省略化、arrayBufferをいじるとあれできる
        const {url, callback = (res) => {}, arrayBuffer = false, execute} = params;
        this.loaders[name] = {url, callback, arrayBuffer, execute, loaded:false, res:null};
        return this;
      }
      load(name){
        const loader = this.loaders[name];
        const {url, callback, arrayBuffer, execute} = loader;
        // urlのpostFixで場合分けする。
        // jpg,jpeg,png,JPG,JPEG,PNG --> HTMLImageElement
        // json,JSON,gltf --> JSON Object
        // txt --> text Object
        // wav,ogg,mp3,WAV,OGG,MP3 --> HTMLAudioElement
        // mp4,MP4 --> HTMLVideoElement
        // 以上となります...が、ArrayBufferが入ってない
        // ArrayBuffer:trueとすることでArrayBuffer形式で取得できる
        // その場合promise以降の処理を自前で用意することになるし、できる。
        const promise = (arrayBuffer ? ResourceLoader.getArrayBuffer(url) : ResourceLoader.getResource(url, name, execute));
        promise.then(
          (res) => {
            // ロードに成功した場合
            console.log(`${name} is loaded.`);
            loader.res = res;
            loader.loaded = true;
            callback(res);
          },(error) => {
            // ロードに失敗した場合
            console.error(`${name} can't be loaded. error: ${error.message}`);
          }
        );
        return promise;
      }
      loadAll(names, callback = (resources) => {}){
        const promises = names.map((name) => this.load(name));
        return Promise.all(promises).then((resources) => {
          // すべてのロードに成功した場合
          callback(resources);
          return true;
        },(error) => {
          // いずれかのロードに失敗した場合
          console.error(`loadAll failure. error: ${error.message}`);
          return false;
        });
        // 一つの例としてはこのようにtrue/falseと分けることで、
        // きちんと実行されたかどうかを踏まえたうえでthen以降の処理をするとか。
      }
      isLoaded(name){
        return this.loaders[name].loaded;
      }
      isLoadedAll(names = []){
        if(names.length === 0){
          // 未指定の場合は「すべて」
          names = Object.keys(this.loaders);
        }
        for(const name of names){
          if(!this.loaders[name].loaded) return false;
        }
        return true;
      }
      getResource(name){
        return this.loaders[name].res;
      }
      getResourceAll(names = []){
        if(names.length === 0){
          // 未指定の場合は「すべて」
          names = Object.keys(this.loaders);
        }
        const result = {};
        for(const name of names){ result[name] = this.getResource(name); }
        return result;
      }
      static getResource(url, name, execute){
        const fileType = url.split(".").pop(); // これの末尾がpostFixになる。
        switch(fileType){
          case "jpg":
          case "jpeg":
          case "png":
          case "JPG":
          case "JPEG":
          case "PNG":
            return ResourceLoader.getImage(url, execute);
          case "txt":
            return ResourceLoader.getText(url);
          case "json":
          case "JSON":
          case "gltf":
            return ResourceLoader.getJSON(url);
          case "wav":
          case "mp3":
          case "ogg":
          case "WAV":
          case "MP3":
          case "OGG":
            return ResourceLoader.getAudio(url, execute);
          case "mp4":
          case "MP4":
            return ResourceLoader.getVideo(url, execute);
          case "ttf":
          case "otf":
            return ResourceLoader.getFontFile(url, name);
        }
        return null;
      }
      static async getImage(url, execute){
        // HTMLImageElement
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }

        const blob = await ResourceLoader.getBlob(response, execute);

        const dlurl = URL.createObjectURL(blob)
        const img = new Image(); // HTMLImageElementのコンストラクタ
        img.src = dlurl;
        await img.decode(); // HTMLImageElementなのでdecode()
        return img;
      }
      static async getText(url){
        // text string
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }
        const txt = response.text(); // テキストデータが欲しい時はこれ
        return txt;
      }
      static async getJSON(url){
        // json object
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }
        const json = response.json(); // jsonデータが欲しい時はこれ
        return json;
      }
      static async getAudio(url, execute){
        // HTMLAudioElement
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }

        const blob = await ResourceLoader.getBlob(response, execute);

        const dlurl = URL.createObjectURL(blob)
        const audio = document.createElement('audio');
        audio.src = dlurl; // decodeはHTMLImageElementのためのもの。
        return audio;
      }
      static async getVideo(url, execute){
        // HTMLVideoElement
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }

        const blob = await ResourceLoader.getBlob(response, execute);

        const dlurl = URL.createObjectURL(blob)
        const video = document.createElement('video');
        video.src = dlurl;
        return video;
      }
      static async getArrayBuffer(url){
        // ArrayBufferの形でほしい場合。たとえばAudioの場合など。
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }
        const ab = response.arrayBuffer(); // ArrayBufferデータが欲しいとき
        return ab;
      }
      static async getFontFile(url, name){
        const fontFile = new FontFace(name, `url(${url})`);
        await fontFile.load();
        return fontFile;
      }
      static async getBlob(response, execute){
        // blobの取得。executeが未定義の場合は従来通りblob()で取得する。
        if(typeof execute === 'undefined'){
          return response.blob();
        }

        const contentLength = response.headers.get('Content-Length');

        // このresponse.bodyってのがReadableStreamなんだって
        const reader = response.body.getReader();

        let receivedLength = 0;
        let chunks = [];

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          // 進捗状況の計算
          const progress = (receivedLength / contentLength);
          if(typeof execute === 'function'){
            execute({
              progress:progress, chunk:value.length, total:contentLength
            });
          }
        }

        // チャンクを結合
        let chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks) {
          chunksAll.set(chunk, position);
          position += chunk.length;
        }

    		const blob = new Blob([chunksAll]);

        return blob;
      }
    }

    // loadImageData
    // 基本的にlilにぶち込んで使う
    // なのでnullでなくなったら画像を使うなど、適宜工夫してください。これが実行された後、しばらくしてから出来る感じです。
    function loadImageData(callback = (img) => {}){
      const fileTag = document.createElement("input");
      fileTag.setAttribute("type", "file");

      fileTag.addEventListener("change", function (e) {
        const file = e.target.files;
        const reader = new FileReader();
        // ファイルが無かった場合は何もしない。
        if(file.length===0) return;

        const fileType = file[0].name.split(".").pop();
        if(fileType !== "png" && fileType !== "jpg" && fileType !== "jpeg" && fileType !== "PNG" && fileType !== "JPG" && fileType !== "JPEG"){
          console.log("failure. please select png, jpg, or jpeg file.");
          return;
        }

        //ファイルが複数読み込まれた際に、1つめを選択
        reader.readAsDataURL(file[0]);

        //ファイルが読み込めたら
        reader.onload = function () {
          console.log("load image success");
          const src = reader.result;
          const img = new Image();
          img.src = src;
          img.onload = function(){
            callback(img);
          }
          fileTag.remove();
        };
      }, false);
      fileTag.click();
    }

    function loadJsonData(callback = (jsn) => {}){
      const fileTag = document.createElement("input");
      fileTag.setAttribute("type", "file");
        //const clickEvent = new Event("change");
      fileTag.addEventListener("change", function (e) {
        const file = e.target.files;
        const reader = new FileReader();
        // ファイルが無かった場合は何もしない。
        if(file.length===0) return;

        const fileType = file[0].name.split(".").pop();
        if(fileType !== "json" && fileType !== "JSON"){
          console.log("failure. please select json file.");
          return;
        }

        //ファイルが複数読み込まれた際に、1つめを選択
        reader.readAsText(file[0]);

        //ファイルが読み込めたら
        reader.onload = function () {
          const jsn = reader.result;
          const parsedData = JSON.parse(jsn);
          console.log(`load json success`);
          callback(parsedData);
          fileTag.remove();
        };
      }, false);

      // clickイベントを発火させるには単純にclick()でいいんですね
      fileTag.click();
    }

    function loadTextData(callback = (txt) => {}){
      const fileTag = document.createElement("input");
      fileTag.setAttribute("type", "file");
        //const clickEvent = new Event("change");
      fileTag.addEventListener("change", function (e) {
        const file = e.target.files;
        const reader = new FileReader();
        // ファイルが無かった場合は何もしない。
        if(file.length===0) return;

        const fileType = file[0].name.split(".").pop();
        if(fileType !== "txt"){
          console.log("failure. please select txt file.");
          return;
        }

        //ファイルが複数読み込まれた際に、1つめを選択
        reader.readAsText(file[0]);

        //ファイルが読み込めたら
        reader.onload = function () {
          const txt = reader.result;
          console.log(`load text success`);
          callback(txt);
          fileTag.remove();
        };
      }, false);

      // clickイベントを発火させるには単純にclick()でいいんですね
      fileTag.click();
    }

    // '.'でsplitして1番を取る。長さ0ならpngとする。
    function _getFilenameData(name){
      if(typeof name !== 'string'){
        // TODO: エラーの理由
        console.error("ファイル名が文字列でないため処理できません");
        return null;
      }

      const splitted = name.split(".");
      if(splitted.length === 0){
        // TODO: エラーの理由
        console.error("空文字である可能性があります");
        return null;
      }

      const properName = splitted[0];
      if(splitted.length === 1){
        return {mime:'image/png', filename:`${properName}.png`};
      }

      switch(splitted[1]){
        case "png":
        case "PNG":
          return {mime:'image/png', filename:`${properName}.png`};
        case "jpg":
        case "JPG":
          return {mime:'image/jpeg', filename:`${properName}.jpg`};
        case "jpeg":
        case "JPEG":
          return {mime:'image/jpeg', filename:`${properName}.jpeg`};
        case "avif":
        case "AVIF":
          return {mime:'image/avif', filename:`${properName}.avif`};
      }
      // TODO: エラーの理由
      console.error("拡張子が対応していません");
      return null;
    }

    // 一時的にaタグを作りdownload属性を設定する。イベントを発火させることでダウンロードが実行される。
    function _downloadURI(filename, uri){
      const link = document.createElement('a');
      link.download = filename;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // シンプルなキャンバス保存用の関数。
    // デフォルトはpngとする
    // 非同期関数にしました。理由はOffscreenCanvasに対応させるためです。
    async function saveCanvas(cvs, name){
      const data = await _getFilenameData(name);
      if(data === null){
        console.log("save failure...");
        return false;
      }

      // offscreenCanvasの場合
      // https://developer.mozilla.org/ja/docs/Web/API/OffscreenCanvas/convertToBlob
      let datauri;
      if(cvs instanceof HTMLCanvasElement){
        datauri = await cvs.toDataURL(data.mime);
      }else if(cvs instanceof OffscreenCanvas){
        // OffscreenCanvasのconvertToBlobはPromiseを返すので直接的なやり方ではURLを取得できません。
        // awaitを使って非同期関数内でPromiseの結果をダイレクトに取得します。
        const blob = await cvs.convertToBlob({type:data.mime});
        datauri = await URL.createObjectURL(blob);
      }else{
        console.error("サポートされていない形式です");
        return false;
      }

      _downloadURI(data.filename, datauri);
      // saveが終わったら破棄する
      URL.revokeObjectURL(datauri);
      return true;
    }

    // textデータの保存
    async function saveText(data, name){
      // 一時的にaタグを作る
      const link = document.createElement("a");
      // encodeする
      link.href = "data:text/plain," + encodeURIComponent(data);
      link.download = `${name}.txt`;
      link.click();
      link.remove();
    }

    // JSONデータの保存
    async function saveJSON(obj, name){
      // JSON形式にする
      const data = await JSON.stringify(obj);
      // 一時的にaタグを作る
      const link = document.createElement("a");
      // encodeする
      link.href = "data:text/plain," + encodeURIComponent(data);
      link.download = `${name}.json`;
      link.click();
      link.remove();
    }

    // bdは欲しいがalignmentは不要という場合に使う
    function getTextBoundingRect(ctx, txt, x, y){
      const m = ctx.measureText(txt);
      const AL = m.actualBoundingBoxLeft;
      const AR = m.actualBoundingBoxRight;
      const AT = m.actualBoundingBoxAscent;
      const AB = m.actualBoundingBoxDescent;
      return {x:x-AL, y:y-AT, w:AL+AR, h:AT+AB};
    }

    // alignmentにbdが活用される必要は無い。両者は独立していていい。互いに連携する必要は無いだろう。

    // (x,y)をleft,center,rightまたはtop,center,bottomのどこに揃えたいかを取得するもの
    // たとえば(x,y)を入力値としleft,topを指定するとx,yがleft,topになるようなx,yが出力される。
    function getTextAlign(ctx, txt, x, y, xAlign='center', yAlign='center'){
      const m = ctx.measureText(txt);
      const AL = m.actualBoundingBoxLeft;
      const AR = m.actualBoundingBoxRight;
      const AT = m.actualBoundingBoxAscent;
      const AB = m.actualBoundingBoxDescent;
      const result = {};
      switch(xAlign){
        case 'left':
          result.x = x+AL; break;
        case 'center':
          result.x = x+(AL-AR)/2; break;
        case 'right':
          result.x = x-AR; break;
      }
      switch(yAlign){
        case 'top':
          result.y = y+AT; break;
        case 'center':
          result.y = y+(AT-AB)/2; break;
        case 'bottom':
          result.y = y-AB; break;
      }
      return result;
    }

    utils.Damper = Damper;

    // Array関連
    utils.ArrayWrapper = ArrayWrapper;
    utils.LoopArray = LoopArray;
    utils.RoundRobinArray = RoundRobinArray;
    utils.RandomChoiceArray = RandomChoiceArray;
    //utils.SweepArray = SweepArray; // 廃止
    //utils.BooleanArray = BooleanArray; // 廃止

    // CrossReferenceArray関連
    utils.CrossReferenceArray = CrossReferenceArray;
    utils.Bullet = Bullet;
    utils.Gun = Gun;

    // Tree関連
    utils.Tree = Tree;
    utils.Vertice = Vertice;
    utils.Edge = Edge;

    utils.morton16 = morton16; // 16bit符号なし整数の対を単整数と紐付ける。
    utils.morton16Symmetry = morton16Symmetry;

    // Clock関連. Clock以外は廃止
    utils.Clock = Clock;
    //utils.TimeArrow = TimeArrow;
    //utils.Counter = Counter;
    //utils.ClockSet = ClockSet;
  //  utils.TimeArrowSet = TimeArrowSet;
    //utils.CounterSet = CounterSet;
    //utils.Schedule = Schedule;
  //  utils.ScheduledTimeArrow = ScheduledTimeArrow;
  //  utils.ScheduledCounter = ScheduledCounter;

    // Sequencer関連. Sequencerはtypeで分けるように変更.
    // さらにSpotEventSeed以外を廃止
    utils.Sequencer = Sequencer;
    //utils.ContinuousSequencer = ContinuousSequencer;
    //utils.DiscreteSequencer = DiscreteSequencer;
    utils.SpotEvent = SpotEvent;
    //utils.BandEvent = BandEvent;
    //utils.EventSeed = EventSeed;
    //utils.SpotEventSeed = SpotEventSeed;
    //utils.BandEventSeed = BandEventSeed;
    utils.ScoreParser = ScoreParser;

    utils.parseValue = parseValue; // 一応。使うかどうか知らないけど。

    // Easing.
    utils.Easing = Easing;

    // loading関連
    utils.ResourceLoader = ResourceLoader;
    utils.loadImageData = loadImageData;
    utils.loadTextData = loadTextData;
    utils.loadJsonData = loadJsonData;

    // save関連
    utils.saveCanvas = saveCanvas;
    utils.saveText = saveText;
    utils.saveJSON = saveJSON;

    // text関連のユーティリティ
    utils.getTextBoundingRect = getTextBoundingRect;
    utils.getTextAlign = getTextAlign;

    return utils;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //

  // foxIA. インタラクション関連。
  const foxIA = (function(){
    const ia = {};

    class PointerPrototype{
      constructor(){
        this.id = -1;
        this.parent = null; // 親のInteractionクラス。KAとかいろいろ応用できそう
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.rect = {width:0, height:0, left:0, top:0};
        this.button = -1; // マウス用ボタン記録。-1:タッチですよ！の意味
      }
      mouseInitialize(e, rect, parent = null){
        this.x = e.clientX - rect.left;
        this.y = e.clientY - rect.top;
        this.parent = parent;
        const {width, height, left, top} = rect;
        this.rect = {width, height, left, top};
        this.prevX = this.x;
        this.prevY = this.y;
        this.button = e.button; // 0:left, 1:center, 2:right
      }
      mouseDownAction(e){
      }
      mouseUpdate(e){
        this.prevX = this.x;
        this.prevY = this.y;
        this.dx = (e.clientX - this.rect.left - this.x);
        this.dy = (e.clientY - this.rect.top - this.y);
        this.x = e.clientX - this.rect.left;
        this.y = e.clientY - this.rect.top;
      }
      mouseMoveAction(e){
      }
      mouseUpAction(e){
      }
      touchInitialize(t, rect, parent = null){
        this.id = t.identifier;
        this.x = t.clientX - rect.left; // 要するにmouseX的なやつ
        this.y = t.clientY - rect.top; // 要するにmouseY的なやつ
        this.parent = parent;
        const {width, height, left, top} = rect;
        this.rect = {width, height, left, top};
        this.prevX = this.x;
        this.prevY = this.y;
      }
      updateCanvasData(rect){
        // マウスでもタッチでも実行する
        const prevLeft = this.rect.left;
        const prevTop = this.rect.top;
        const {width, height, left, top} = rect;
        this.rect = {width, height, left, top};
        this.x += prevLeft - left;
        this.y += prevTop - top;
        this.prevX += prevLeft - left;
        this.prevY += prevTop - top;
      }
      touchStartAction(t){
      }
      touchUpdate(t){
        this.prevX = this.x;
        this.prevY = this.y;
        this.dx = (t.clientX - this.rect.left - this.x);
        this.dy = (t.clientY - this.rect.top - this.y);
        this.x = t.clientX - this.rect.left;
        this.y = t.clientY - this.rect.top;
      }
      touchMoveAction(t){
      }
      touchEndAction(t){
      }
    }

    // pointerの生成関数で初期化する。なければPointerPrototypeが使われる。
    // 一部のメソッドはオプションで用意するかしないか決めることにしましょう
    // mouseLeaveとかdoubleClickとか場合によっては使わないでしょう
    // そこらへん
    // canvasで初期化できるようにするか～。で、factoryはoptionsに含めてしまおう。
    // 特に指定が無ければ空っぽのoptionsでやればいい。factoryが欲しい、clickやdblclickを有効化したい場合に
    // optionsを書けばいいわね。
    // setFactoryは必要になったら用意しましょ
    // 仕様変更(20240923): factoryがnullを返す場合はpointerを生成しない。かつ、タッチエンド/マウスアップの際に
    // pointersが空の場合は処理を実行しない。これにより、factoryで分岐処理を用意することで、ポインターの生成が実行されないようにできる。
    class Interaction{
      constructor(canvas, options = {}){
        this.canvas = canvas; // なんか知らないけど持たせてもいいんじゃないの？
        this.pointers = [];
        this.factory = ((t) => new PointerPrototype());
        // leftとtopがwindowのサイズ変更に対応するために必要
        // コンストラクタでは出来ませんね。初期化時の処理。
        this.rect = {width:0, height:0, left:0, top:0};
        this.tapCount = 0; // ダブルタップ判定用
        this.firstTapped = {x:0, y:0};
        // コンストラクタで初期化しましょ
        this.initialize(canvas, options);
      }
      initialize(canvas, options = {}){
        // 念のためpointersを空にする
        this.pointers = [];
        // factoryを定義
        const {factory = ((t) => new PointerPrototype())} = options;
        this.factory = factory;
        // 横幅縦幅を定義
        // touchの場合はこうしないときちんとキャンバス上の座標が取得できない
        // どうもrectからwidthとheightが出る？じゃあそれでいいですね。pixelDensityによらない、css上の値。
        const {width, height, left, top} = canvas.getBoundingClientRect();
        this.rect = {width, height, left, top};
        // 右クリック時のメニュー表示を殺す
        // 一応デフォルトtrueのオプションにするか...（あんま意味ないが）
        const {preventOnContextMenu = true} = options;
        if(preventOnContextMenu){
          // スケッチと文章が混在する場合に外側のメニューまで禁止するのはまずいので。
          //document.oncontextmenu = (e) => { e.preventDefault(); }
          canvas.oncontextmenu = (e) => { e.preventDefault(); }
        }
        // touchのデフォルトアクションを殺す
        //canvas.style["touch-action"] = "none";
        // イベントリスナー
        // optionsになったのね。じゃあそうか。passiveの規定値はfalseのようです。指定する必要、ないのか。
        // そして1回のみの場合はonceをtrueにするようです。
        // たとえば警告なんかに使えるかもしれないですね。ていうか明示した方がいいのか。
        // 以降はdefaultIAと名付ける、これがtrueデフォルトで、falseにするとこれらを用意しないようにできる。
        // たとえば考えにくいけどホイールしか要らないよって場合とか。
        const {defaultIA = true, wheel = true} = options;
        if (defaultIA) {
          // マウス
          canvas.addEventListener('mousedown', this.mouseDownAction.bind(this), {passive:false});
          window.addEventListener('mousemove', this.mouseMoveAction.bind(this), {passive:false});
          window.addEventListener('mouseup', this.mouseUpAction.bind(this), {passive:false});
          // タッチ（ダブルタップは無いので自前で実装）
          canvas.addEventListener('touchstart', this.touchStartAction.bind(this), {passive:false});
          window.addEventListener('touchmove', this.touchMoveAction.bind(this), {passive:false});
          window.addEventListener('touchend', this.touchEndAction.bind(this), {passive:false});
        }
        // ホイールはキャンバス外で実行することはまずないですね...canvasでいいかと。
        if (wheel) { canvas.addEventListener('wheel', this.wheelAction.bind(this), {passive:false}); }

        // リサイズの際にleftとtopが変更されるのでそれに伴ってleftとtopを更新する
        window.addEventListener('resize', (function(){
          this.updateCanvasData();
        }).bind(this));
        window.addEventListener('scroll', (function(){
          this.updateCanvasData();
        }).bind(this));

        // options. これらは基本パソコン環境前提なので（スマホが関係ないので）、オプションとします。
        const {
          mouseenter = false, mouseleave = false, click = false, dblclick = false,
          keydown = false, keyup = false
        } = options;
        // マウスの出入り
        if (mouseenter) { canvas.addEventListener('mouseenter', this.mouseEnterAction.bind(this), {passive:false}); }
        if (mouseleave) { canvas.addEventListener('mouseleave', this.mouseLeaveAction.bind(this), {passive:false}); }
        // クリック
        if (click) { canvas.addEventListener('click', this.clickAction.bind(this), {passive:false}); }
        if (dblclick) { canvas.addEventListener('dblclick', this.doubleClickAction.bind(this), {passive:false}); }
        // キー(keypressは非推奨とのこと）
        // いわゆる押しっぱなしの時の処理についてはフラグの切り替えのために両方必要になるわね
        if (keydown) { window.addEventListener('keydown', this.keyDownAction.bind(this), {passive:false}); }
        if (keyup) { window.addEventListener('keyup', this.keyUpAction.bind(this), {passive:false}); }
      }
      getRect(){
        return this.rect;
      }
      updateCanvasData(){
        // これでいいはず。おかしいと思ったわ。いいんかな...いいんかな？
        // 多分今までおとがめなしだけだっただけだと思う。
        const newRect = this.canvas.getBoundingClientRect();
        // 対象のキャンバスを更新
        const {width, height, left, top} = newRect;
        this.rect = {width, height, left, top};
        for(const p of this.pointers){ p.updateCanvasData(newRect); }
      }
      mouseDownAction(e){
        this.mouseDownPointerAction(e);
        this.mouseDownDefaultAction(e);
      }
      mouseDownPointerAction(e){
        const p = this.factory(this);
        if (p === null) return; // factoryがnullを返す場合はpointerを生成しない
        p.mouseInitialize(e, this.rect, this);
        p.mouseDownAction(e);
        this.pointers.push(p);
      }
      mouseDownDefaultAction(e){
        // Interactionサイドの実行内容を書く
      }
      mouseMoveAction(e){
        this.mouseMovePointerAction(e);
        // なぜmovementを使っているかというと、
        // このアクションはポインターが無関係だから（ポインターが無くても実行される）
        // まずいのはわかってるけどね...
        // マウスダウン時のPointerの位置の計算についてはmovementが出てこないので
        // マウスダウン時しか要らない場合は使わないのもあり。
        this.mouseMoveDefaultAction(e.movementX, e.movementY, e.clientX - this.rect.left, e.clientY - this.rect.top);
      }
      mouseMovePointerAction(e){
        // pointerが生成されなかった場合は処理を実行しない
        if(this.pointers.length === 0){ return; }
        const p = this.pointers[0];
        p.mouseUpdate(e);
        p.mouseMoveAction(e);
      }
      mouseMoveDefaultAction(dx, dy, x, y){
        // Interactionサイドの実行内容を書く
      }
      mouseUpAction(e){
        this.mouseUpPointerAction(e);
        this.mouseUpDefaultAction(e);
      }
      mouseUpPointerAction(e){
        // pointerが生成されなかった場合は処理を実行しない
        if(this.pointers.length === 0){ return; }
        // ここで排除するpointerに何かさせる...
        const p = this.pointers[0];
        p.mouseUpAction(e);
        this.pointers.pop();
      }
      mouseUpDefaultAction(e){
        // Interactionサイドの実行内容を書く
      }
      mouse(e){
        // ホイールのイベントなどで正確なマウス座標が欲しい場合に有用
        // マウス限定なのでイベント内部などマウスが関係する処理でしか使わない方がいいです
        return {x:e.clientX - this.rect.left, y:e.clientY - this.rect.top};
      }
      wheelAction(e){
        // Interactionサイドの実行内容を書く
        // e.deltaXとかe.deltaYが使われる。下にホイールするとき正の数、上にホイールするとき負の数。
        // 速くホイールすると大きな数字が出る。おそらく仕様によるもので-1000～1000の100の倍数になった。0.01倍して使うといいかもしれない。
        // 当然だが、拡大縮小に使う場合は対数を使った方が挙動が滑らかになるしスケールにもよらないのでおすすめ。
      }
      clickAction(){
        // Interactionサイドの実行内容を書く。クリック時。左クリック。
      }
      mouseEnterAction(){
        // Interactionサイドの実行内容を書く。enter時。
      }
      mouseLeaveAction(){
        // Interactionサイドの実行内容を書く。leave時。
      }
      doubleClickAction(){
        // Interactionサイドの実行内容を書く。ダブルクリック時。
      }
      doubleTapAction(){
        // Interactionサイドの実行内容を書く。ダブルタップ時。自前で実装するしかないようです。初めて知った。
      }
      touchStartAction(e){
        this.touchStartPointerAction(e);
        this.touchStartDefaultAction(e);

        // 以下、ダブルタップ用
        // マルチタップ時にはイベントキャンセル（それはダブルタップではない）
        if(this.pointers.length > 1){ this.tapCount = 0; return; }
        // シングルタップの場合、0ならカウントを増やしつつ350ms後に0にするカウントダウンを開始
        // ただし、factoryがnullを返すなど、pointerが生成されないならば、実行しない。
        // pointerが無い以上、ダブルタップの判定が出来ないので。
        if(this.pointers.length === 0){ return; }
        if(this.tapCount === 0){
          // thisをbindしないとおかしなことになると思う
          setTimeout((function(){ this.tapCount = 0; }).bind(this), 350);
          this.tapCount++;
          this.firstTapped.x = this.pointers[0].x;
          this.firstTapped.y = this.pointers[0].y;
        } else {
          this.tapCount++;
          // 最初のタップした場所とあまりに離れている場合はダブルとみなさない
          // 25くらいあってもいい気がしてきた
          const {x, y} = this.pointers[0];
          if(Math.hypot(this.firstTapped.x - x, this.firstTapped.y - y) > 25){ this.tapCount = 0; return; }
          if(this.tapCount === 2){
            this.doubleTapAction();
            this.tapCount = 0;
          }
        }
      }
      touchStartPointerAction(e){
        e.preventDefault();
        // targetTouchesを使わないとcanvas外のタッチオブジェクトを格納してしまう
        const currentTouches = e.targetTouches; // touchオブジェクトの配列
        const newPointers = [];
        // 新入りがいないかどうか調べていたら増やす感じですね
        // targetTouchesのうちでpointersに入ってないものを追加する処理です
        // 入ってないかどうかはidで調べます
        for (let i = 0; i < currentTouches.length; i++){
          let equalFlag = false;
          for (let j = 0; j < this.pointers.length; j++){
            if (currentTouches[i].identifier === this.pointers[j].id){
              equalFlag = true;
              break;
            }
          }
          if(!equalFlag){
            const p = this.factory(this);
            if (p === null) return; // factoryがnullを返す場合はpointerを生成しない
            p.touchInitialize(currentTouches[i], this.rect, this);
            p.touchStartAction(currentTouches[i]);
            newPointers.push(p);
          }
        }
        this.pointers.push(...newPointers);
      }
      touchStartDefaultAction(e){
        // Interactionサイドの実行内容を書く。touchがスタートした時
      }
      touchMoveAction(e){
        // pointerごとにupdateする
        this.touchMovePointerAction(e);
        if (this.pointers.length === 1) {
          // swipe.
          const p0 = this.pointers[0];
          this.touchSwipeAction(
            p0.x - p0.prevX, p0.y - p0.prevY, p0.x, p0.y, p0.prevX, p0.prevY
          );
        } else if (this.pointers.length > 1) {
          // pinch in/out.
          const p = this.pointers[0];
          const q = this.pointers[1];
          // pとqから重心の位置と変化、距離の変化を
          // 計算して各種アクションを実行する
          const gx = (p.x + q.x) * 0.5;
          const gPrevX = (p.prevX + q.prevX) * 0.5;
          const gy = (p.y + q.y) * 0.5;
          const gPrevY = (p.prevY + q.prevY) * 0.5;
          const gDX = gx - gPrevX;
          const gDY = gy - gPrevY;
          const curDistance = Math.hypot(p.x - q.x, p.y - q.y);
          const prevDistance = Math.hypot(p.prevX - q.prevX, p.prevY - q.prevY)
          // 今の距離 - 前の距離
          const diff = curDistance - prevDistance;
          // 今の距離 / 前の距離
          const ratio = curDistance / prevDistance;
          // 差も比も使えると思ったので仕様変更
          this.touchPinchInOutAction(diff, ratio, gx, gy, gPrevX, gPrevY);
          this.touchMultiSwipeAction(gDX, gDY, gx, gy, gPrevX, gPrevY);
          // rotateは一応用意するが、使うかどうかはその都度決めましょう
          const angle = Interaction.calculateRotationAngle(q.prevX-p.prevX, q.prevY-p.prevY, q.x-p.x, q.y-p.y);
          this.touchRotateAction(angle);
        }
      }
      touchMovePointerAction(e){
        // pointerが生成されなかった場合は処理を実行しない
        if(this.pointers.length === 0){ return; }
        //e.preventDefault();
        const currentTouches = e.targetTouches;
        for (let i = 0; i < currentTouches.length; i++){
          const t = currentTouches[i];
          for (let j = 0; j < this.pointers.length; j++){
            if (t.identifier === this.pointers[j].id){
              const p = this.pointers[j];
              p.touchUpdate(t);
              p.touchMoveAction(t);
            }
          }
        }
      }
      touchSwipeAction(dx, dy, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // dx,dyが変位。
      }
      touchPinchInOutAction(diff, ratio, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // diffは距離の変化。正の場合大きくなる。ratioは距離の比。
      }
      touchMultiSwipeAction(dx, dy, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // dx,dyは重心の変位。
      }
      touchRotateAction(angle){
        // prevP-->prevQをp-->qにする回転角度で何かしら実行する
      }
      touchEndAction(e){
        // End時のアクション。
        this.touchEndPointerAction(e);
        this.touchEndDefaultAction(e);
      }
      touchEndPointerAction(e){
        // pointerが生成されなかった場合は処理を実行しない
        if(this.pointers.length === 0){ return; }
        const changedTouches = e.changedTouches;
        for (let i = 0; i < changedTouches.length; i++){
          for (let j = this.pointers.length-1; j >= 0; j--){
            if (changedTouches[i].identifier === this.pointers[j].id){
              // ここで排除するpointerに何かさせる...
              const p = this.pointers[j];
              p.touchEndAction(changedTouches[i]);
              this.pointers.splice(j, 1);
            }
          }
        }
      }
      touchEndDefaultAction(e){
        // Interactionサイドの実行内容を書く。touchEndが発生した場合。
        // とはいえ難しいだろうので、おそらくpointersが空っぽの時とかそういう感じになるかと。
      }
      keyDownAction(e){
        // Interactionサイドの実行内容を書く。
        // キーが押されたとき
      }
      keyUpAction(e){
        // Interactionサイドの実行内容を書く。
        // キーが離れた時
        //console.log(e.code);
      }
      resizeAction(){
        // リサイズ時の処理。
      }
      getPointers(){
        return this.pointers;
      }
      static calculateRotationAngle(a, b, c, d){
        // ベクトル(a,b)をベクトル(c,d)にする回転の向きを正の向きとする。
        return Math.atan2(a*d-b*c, a*c+b*d);
      }
    }

    // addEventの方がよさそう
    // add
    // clear
    // addとclearでよいです
    // addでイベントを追加しclearですべて破棄します
    // addで登録するイベント名をリスナーに合わせました（有効化オプションもこれになってるので倣った形です）
    // 一応touchStartとdbltapと複数登録用意しました、が、一応デスクトップでの運用が主なので、
    // 本格的にやるならCCみたいに継承してね。
    class Inspector extends Interaction{
      constructor(canvas, options = {}){
        super(canvas, options);
        this.functions = {
          mousedown:[],
          mousemove:[],
          mouseup:[],
          wheel:[],
          click:[],
          mouseenter:[],
          mouseleave:[],
          dblclick:[],
          keydown:[],
          keyup:[],
          touchstart:[], // スマホだとclickが発動しないので代わりに。
          touchend:[], // タッチエンドあった方がいい？
          dbltap:[] // doubleTapですね。これも用意しておきましょ。
        };
      }
      execute(name, args){
        for (const func of this.functions[name]){
          func(...args);
        }
      }
      add(name, func){
        // 複数のインタラクションを同時に設定できるようにする
        if (typeof name === 'string') {
          this.functions[name].push(func);
        } else if (Array.isArray(name)) {
          for (const functionName of name) {
            this.functions[functionName].push(func);
          }
        }
      }
      clear(name){
        this.functions[name] = [];
      }
      mouseDownDefaultAction(e){
        this.execute("mousedown", arguments);
      }
      mouseMoveDefaultAction(dx, dy, x, y){
        this.execute("mousemove", arguments);
      }
      mouseUpDefaultAction(e){
        this.execute("mouseup", arguments);
      }
      wheelAction(e){
        this.execute("wheel", arguments);
      }
      clickAction(){
        this.execute("click", arguments);
      }
      mouseEnterAction(){
        this.execute("mouseenter", arguments);
      }
      mouseLeaveAction(){
        this.execute("mouseleave", arguments);
      }
      doubleClickAction(){
        this.execute("dblclick", arguments);
      }
      doubleTapAction(){
        this.execute("dbltap", arguments);
      }
      keyDownAction(e){
        this.execute("keydown", arguments);
      }
      keyUpAction(e){
        this.execute("keyup", arguments);
      }
      touchStartDefaultAction(e){
        this.execute("touchstart", arguments);
      }
      touchEndDefaultAction(e){
        this.execute("touchend", arguments);
      }
    }

    // これクラス化しよ？？Locaterがいい。
    // 簡易版。毎フレームupdateする。pointersを調べて末尾を取る。末尾なので、常に新規が採用される。
    // 位置情報を更新する。x,y,dx,dyを使う。また関数を導入できる。
    // 発動時、移動時、activeを前提として常時、終了時のアクションが存在する。終了時はタッチの場合、
    // pointersが空になるとき。なぜなら常に新規で更新されるので。
    // 取得するときclampとnormalizeのoptionを設けるようにしました。
    // factorを設けてすぐに値が変わらないようにできる仕組みを導入しました。
    // 自由に変えられるようにするかどうかは応相談...できるだけ軽量で行きたいので。
    // mouseFreeUpdateにより、マウスの場合にマウス移動で位置更新がされるようにするオプションを追加
    class Locater extends Interaction{
      constructor(canvas, options = {}){
        super(canvas, options);
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        // 位置情報を滑らかに変化させたいときはoptionsでfactorを定義する。
        const {factor = 1} = options;
        this.factor = factor;
        // マウス操作の場合、位置情報をマウス移動に伴って変化させたい場合もあるでしょう。
        // mouseFreeUpdateのoptionを設けてそれが実現されるようにします
        const {mouseFreeUpdate = false} = options;
        this.mouseFreeUpdate = mouseFreeUpdate;
        // 関数族
        this.actions = {}; // activate, inActivate, move.
        // 関数のデフォルト。
        this.actions.activate = (e) => {};
        this.actions.move = (x, y, dx, dy) => {};
        this.actions.update = (x, y, dx, dy) => {};
        this.actions.inActivate = (e) => {};
        // ボタン.
        this.button = -1;
      }
      positionUpdate(x, y, dx, dy){
        // 位置情報の更新を関数化する
        // 急に変化させたくない場合に徐々に変化させる選択肢を設ける
        const factor = this.factor;
        this.x += (x - this.x) * factor;
        this.y += (y - this.y) * factor;
        this.dx += (dx - this.dx) * factor;
        this.dy += (dy - this.dy) * factor;
      }
      update(){
        if (this.pointers.length > 0) {
          // 末尾（新規）を採用する。
          // マウス操作でmouseFreeUpdateの場合これが実行されないようにするには、結局pointer.length>0ということは
          // もうactivateされててbutton>=0であるから、タッチならここが-1だから、そこで判定できる。そこで、
          // (this.button >= 0 && this.mouseFreeUpdate)の場合にキャンセルさせる。この場合!を使った方が分かりやすい。
          // 「マウスアクションにおいてmouseFreeUpdateの場合はactive時にはpositionをupdateしない」という日本語の翻訳になる。
          // buttonを使うことでタッチとマウスの処理を分けられるわけ。
          if (!(this.button >= 0 && this.mouseFreeUpdate)) {
            const p = this.pointers[this.pointers.length - 1];
            this.positionUpdate(p.x, p.y, p.dx, p.dy);
          }
        }
        if (this.active) {
          this.actions.update(this.x, this.y, this.dx, this.dy);
        }
      }
      setAction(name, func){
        // オブジェクト記法に対応
        if (typeof name === 'string') {
          this.actions[name] = func;
        } else if (typeof name === 'object') {
          for(const _name of Object.keys(name)){
            const _func = name[_name];
            this.actions[_name] = _func;
          }
        }
      }
      isActive(){
        return this.active;
      }
      getPos(options = {}){
        const {clamp = false, normalize = false} = options;
        const {width:w, height:h} = this.rect;
        // clampのoptionsがある場合は先にclampしてから正規化する。
        // dxとdyはclampの必要がない。
        const result = {x:this.x, y:this.y, dx:this.dx, dy:this.dy};
        if (clamp) {
          result.x = Math.max(0, Math.min(w, result.x));
          result.y = Math.max(0, Math.min(h, result.y));
        }
        // 正規化して0～1の値を返せるようにする。
        if (normalize) {
          result.x /= w;
          result.y /= h;
          result.dx /= w;
          result.dy /= h;
        }
        return result;
      }
      mouseDownDefaultAction(e){
        // ボタン. 0:left, 1:center, 2:right
        this.button = e.button;
        this.active = true;
        this.actions.activate(e); // e.buttonで処理分けた方が楽だわ。タッチの場合は常に-1だけどね。
      }
      mouseMoveDefaultAction(dx, dy, x, y){
        // mouseFreeUpdateがtrueであれば常に位置更新がされるようにする
        // タッチの場合ここは実行されないため、mouseFreeUpdateがtrueでも問題ない。
        if (this.mouseFreeUpdate) {
          // ああここか
          // xとyをそのまま使っちゃってる
          // ...
          this.positionUpdate(x, y, dx, dy);
        }
        if(this.active){
          this.actions.move(x, y, dx, dy);
        }
      }
      mouseUpDefaultAction(e){
        // activateされていないなら各種の処理は不要
        if (!this.active) return;
        this.active = false;
        this.actions.inActivate(e);
        // ボタンリセット
        this.button = -1;
      }
      touchStartDefaultAction(e){
        this.active = true;
        this.actions.activate(e);
      }
      touchSwipeAction(dx, dy, x, y, px, py){
        if (this.active) {
          this.actions.move(x, y, dx, dy);
        }
      }
      touchEndDefaultAction(e){
        // ここ、タッチポインタが一つでも外れるとオフになる仕様なんだけど、
        // タッチポインタ、末尾採用にしたから、全部空の時だけ発動でいいよ。
        // 空っぽになる場合、この時点でちゃんと空っぽだから。
        // ここもactiveでないのに実行されてしまうようですね...防いでおくか。
        if (this.active && this.pointers.length === 0) {
          this.active = false;
          this.actions.inActivate(e);
        }
      }
    }

    // キーを押したとき(activate), キーを押しているとき(update), キーを離したとき(inActivate),
    // それぞれに対してイベントを設定する。
    // 改変でキーコードが分かるようにするわ（どう使うか？showKeyCode:trueしたうえで使いたいキーをたたくだけ。）

    // キーごとにただひとつ生成されるagent
    // プロパティを持たせることで処理に柔軟性を持たせることができる。
    // もちろんすべてのagentが共通のプロパティを持つ必要はないが、
    // そこはメソッドで無視すればいいだけ。
    class KeyAgent{
      constructor(code){
        this.code = code;
        // tは親のKeyActionで、すなわちそれを受け取る。
        // 他のキーのactive状態などを分岐処理に利用できる。
        this.activateFunction = (t,a)=>{};
        this.updateFunction = (t,a)=>{};
        this.inActivateFunction = (t,a)=>{};
        this.active = false;
      }
      isActive(){
        return this.active;
      }
      activate(t){
        this.activateFunction(t, this);
        this.active = true;
      }
      update(t){
        this.updateFunction(t, this);
      }
      inActivate(t){
        this.inActivateFunction(t, this);
        this.active = false;
      }
      registAction(actionType, func){
        if(typeof actionType)
        this[actionType.concat("Function")] = func;
      }
    }

    // 改善案（同時押し対応）
    // isActiveが未定義の場合nullを返しているところをfalseを返すようにする
    // さらにactivate,update,inActivateの関数登録で引数を持たせられるようにする。その内容は第一引数で、
    // thisである。どう使うかというとたとえば(e)=>{if(e.isActive){~~~}}といった感じで「これこれのキーが押されている場合～～」
    // っていう、いわゆる同時押し対応をできるようにする。その際、たとえばBを押しながらAのときに、Bを押すだけの処理が存在しないと
    // isActiveがnullを返してしまうので、先のように変更したいわけです。
    // 改良版KeyAction.
    // agentをクラス化することでさらに複雑な処理を可能にする.
    // うん
    // PointerPrototypeで遊びたいので
    // オフにするのはやめましょ
    class KeyAction extends Interaction{
      constructor(canvas, options = {}){
        // keydown,keyupは何も指定せずともlistenerが登録されるようにする
        // こういう使い方もあるのだ（superの宣言箇所は任意！）
        options.keydown = true;
        options.keyup = true;
        super(canvas, options);
        this.keys = {};
        this.options = {
          showKeyCode:false, autoRegist:true
        }
        // keyAgentFactoryはcodeを引数に取る
        // codeごとに異なる毛色のagentが欲しい場合に有用
        const {keyAgentFactory = (code) => new KeyAgent(code)} = options;
        this.keyAgentFactory = keyAgentFactory;
        // showKeyCode: デフォルトはfalse. trueの場合、キーをたたくとコンソールにe.codeが表示される
        // autoRegist: デフォルトはtrue. trueの場合、キーをたたくと自動的にkeyActionObjectがそれに対して生成される。
      }
      enable(...args){
        // 各種オプションを有効化します。
        const arg = [...arguments];
        for (const name of arg) {
          this.options[name] = true;
        }
        return this;
      }
      disable(...args){
        // 各種オプションを無効化します。
        const arg = [...arguments];
        for (const name of arg) {
          this.options[name] = false;
        }
        return this;
      }
      registAction(code, actions = {}){
        if (typeof code === 'string') {
          const agent = this.keys[code];
          if (agent === undefined) {
            // 存在しない場合は、空っぽのアクションが生成される。指定がある場合はそれが設定される。
            //const result = {};
            const newAgent = this.keyAgentFactory(code);
            const {
              activate = (t,a) => {},
              update = (t,a) => {},
              inActivate = (t,a) => {}
            } = actions;
            newAgent.registAction("activate", activate);
            newAgent.registAction("update", update);
            newAgent.registAction("inActivate", inActivate);
            this.keys[code] = newAgent;
          } else {
            // 存在する場合、actionsで指定されたものだけ上書きされる。
            for (const actionType of Object.keys(actions)) {
              //agent[actionType] = actions[actionType];
              agent.registAction(actionType, actions[actionType]);
            }
          }
        } else if (typeof code === 'object') {
          // まとめて登録する場合。registActionsなんか要らんですよ。
          for(const name of Object.keys(code)) {
            this.registAction(name, code[name]);
          }
        }
        return this;
      }
      isActive(code){
        const agent = this.keys[code];
        if (agent === undefined) return false; // 未定義の場合はfalse.
        return agent.isActive();
      }
      keyDownAction(e){
        if (this.options.showKeyCode) {
          // showKeyCodeがonの場合、e.codeを教えてくれる。
          console.log(e.code);
        }
        // 何らかのキーが押されると、その瞬間に空っぽのアクションからなる
        // オブジェクトが生成される。それによりactive判定が可能になる。
        if (this.options.autoRegist) {
          this.registAction(e.code);
        }
        const agent = this.keys[e.code];
        if(agent === undefined || agent.isActive())return;
        agent.activate(this);
      }
      update(){
        for(const name of Object.keys(this.keys)){
          const agent = this.keys[name];
          if(agent.isActive()){
            agent.update(this); // this.isActiveなどの処理を可能にする。
          }
        }
      }
      keyUpAction(e){
        const agent = this.keys[e.code];
        if(agent===undefined || !agent.isActive()) return;
        agent.inActivate(this);
      }
    }

    // Commander.
    // PointerPrototypeの継承でなんかやりたいけどいちいち書くのめんどくさい、
    // 別にプロパティ持たせる気はなくて、this.xやthis.yでぐりぐりしたいだけなんだ...
    // って時に便利です。きちんと設計したい場合は自由度の高い通常のやり方を用いましょう。
    // pointerdown, pointermove, pointerupを使うと個別に処理を書くのをサボれます。
    class Commander extends Interaction{
      constructor(cvs, options = {}, commands = {}){
        options.factory = () => {
          return new Soldier(commands);
        }
        super(cvs, options);
      }
    }

    // Soldier.
    // これを継承すればpointerdownやpointerupをパラメータありで使うことができる。
    // Brushにはこっちの方が適任かもしれない。
    // e(event)で統一して問題ないです。混乱するんでやめよう。
    class Soldier extends PointerPrototype{
      constructor(commands = {}){
        super();
        const {
          mousedown = (e,p) => {},
          mousemove = (e,p) => {},
          mouseup = (e,p) => {},
          touchstart = (e,p) => {},
          touchmove = (e,p) => {},
          touchend = (e,p) => {},
          pointerdown,
          pointermove,
          pointerup
        } = commands;
        this.mousedown = (pointerdown === undefined ? mousedown : pointerdown);
        this.mousemove = (pointermove === undefined ? mousemove : pointermove);
        this.mouseup = (pointerup === undefined ? mouseup : pointerup);
        this.touchstart = (pointerdown === undefined ? touchstart : pointerdown);
        this.touchmove = (pointermove === undefined ? touchmove : pointermove);
        this.touchend = (pointerup === undefined ? touchend : pointerup);
      }
      mouseDownAction(e){
        this.mousedown(e, this);
      }
      mouseMoveAction(e){
        this.mousemove(e, this);
      }
      mouseUpAction(e){
        this.mouseup(e, this);
      }
      touchStartAction(e){
        this.touchstart(e, this);
      }
      touchMoveAction(e){
        this.touchmove(e, this);
      }
      touchEndAction(e){
        this.touchend(e, this);
      }
    }

    ia.Interaction = Interaction;
    ia.PointerPrototype = PointerPrototype;
    ia.Inspector = Inspector;
    ia.Locater = Locater;
    ia.KeyAgent = KeyAgent; // 追加(20240923)
    ia.KeyAction = KeyAction;
    ia.Commander = Commander; // 追加(20241020)
    ia.Soldier = Soldier; // 追加(20241020)

    return ia;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //

  // foxAudio.
  const foxAudio = (function(){
    const audio = {};

    class AudioPlayer{
      constructor(){
        this.initializeFinished = false;
        this.actx = undefined;
        this.noiseBuffers = {};
        this.periodicWaves = {};
        this.audioBuffers = {};
        this.frequencyFunctions = {};
        this.gainFunctions = {};
        this.analyser = null;
        this.dataArray = null;
        this.arrayType = "uint"; // "uint"/"float"
        this.scale = "Cmajor"; // scale.
      }
      setScale(scaleName){
        // なんらかのテスト（候補になければ設定しない）
        // Cmajorとか色々入ってる。それ以外を許さない。
        if(!AudioPlayer.scales.includes(scaleName)){ return; }
        this.scale = scaleName;
      }
      async initialize(callback = (async function(){}), options = {}){
        if(this.actx !== undefined){ return; }
        this.actx = new AudioContext();
        // 長さ1秒のデフォルトを用意しておく
        this.createWhiteNoiseBuffer(1, "white_1");
        this.createPinkNoiseBuffer(1, "pink_1");
        this.createBrownNoiseBuffer(1, "brown_1");

        this.registFrequencyFunction("default", AudioPlayer.defaultFrequencyFunction);
        this.registGainFunction("default", AudioPlayer.defaultADSR);
        this.registGainFunction("reverb_curve0", AudioPlayer.reverb_curve0);
        await callback();
        // 最初のインタラクションで初期化だけしたい場合のためにフラグを設ける
        this.initializeFinished = true;
      }
      async presetInitialize(options = {}){
        // 別立てにするわ。使いたい場合は別に用意してね。awaitで。
        const {
          createPresetNoises = false, createPresetWaveTables = false,
          showAvailable = false
        } = options;
        // preset noiseを作る場合はtrueにする。
        // 1,0.5,0.25,0.125すべて用意しよう。1,2,3,4でいいですね。
        if(createPresetNoises){
          this.createWhiteNoiseBuffer(0.5, "white_2");
          this.createWhiteNoiseBuffer(0.25, "white_3");
          this.createWhiteNoiseBuffer(0.125, "white_4");
          this.createPinkNoiseBuffer(0.5, "pink_2");
          this.createPinkNoiseBuffer(0.25, "pink_3");
          this.createPinkNoiseBuffer(0.125, "pink_4");
          this.createBrownNoiseBuffer(0.5, "brown_2");
          this.createBrownNoiseBuffer(0.25, "brown_3");
          this.createBrownNoiseBuffer(0.125, "brown_4");
        }
        // preset waveTableを作る場合はtrueにする。
        // 以下のあれこれが使用可能。throatyとか面白いですよ。
        if(createPresetWaveTables){
          for(const [key, value] of Object.entries(AudioPlayer.presetWaveTables)){
            this.registPeriodicWave(key, value.real, value.imag);
          }
        }
        if(showAvailable){
          console.log(`
available noises: length: 0.5, 0.25, 0.125
  white_2, white_3, white_4, pink_2, pink_3, pink_4, brown_2, brown_3, brown_4
          `);
          console.log(`
available waveTables:
'warm_Triangle', 'dropped_Square', 'bass_Amp360', 'bass_Sub_Dub', 'brass',
'celeste', 'chorus_Strings', 'ethnic_33', 'organ_3', 'phoneme_bah', 'throaty'
          `);
        }
      }
      initAnalyser(options = {}){
        // fftSizeは2^5～2^15の2ベキ
        const {
          fftSize = 2048, arrayType = "uint"
        } = options;
        this.analyser = this.actx.createAnalyser();
        const bufferSize = fftSize/2;
        // "uint"または"float"を指定できる。
        this.arrayType = arrayType;
        // 型付配列を用意する
        switch(arrayType){
          case "uint":
            this.dataArray = new Uint8Array(bufferSize); break;
          case "float":
            this.dataArray = new Float32Array(bufferSize); break;
          default:
            this.dataArray = null;
        }
      }
      getAnalyseData(analyseType = "time"){
        // 準備出来ていないならばnullを返す
        if(this.analyser === null || this.dataArray === null){
          return null;
        }
        // analyseTypeは"time"/"freq"を指定できる。
        // 基本的にはこれを毎フレーム実行してデータを取得する。
        switch(`${this.arrayType}_${analyseType}`){
          case "uint_time":
            this.analyser.getByteTimeDomainData(this.dataArray); break;
          case "float_time":
            this.analyser.getFloatTimeDomainData(this.dataArray); break;
          case "uint_freq":
            this.analyser.getByteFrequencyData(this.dataArray); break;
          case "float_freq":
            this.analyser.getFloatFrequencyData(this.dataArray); break;
          default:
            return null;
        }
        return this.dataArray;
      }
      createWhiteNoiseBuffer(duration = 1, name = "white_1"){
        const {actx} = this;

        const bufferSize = Math.round(actx.sampleRate * duration);
        const noiseBuffer = new AudioBuffer({
          length: bufferSize,
          sampleRate: actx.sampleRate,
        });
        // ホワイトノイズ
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffers[name] = {buffer:noiseBuffer, duration:duration};
        this.audioBuffers[`noise_${name}`] = noiseBuffer; // audioBufferにも登録
      }
      createPinkNoiseBuffer(duration = 1, name = "pink_1"){
        // p5から移植してみる
        // https://github.com/processing/p5.js/blob/v1.11.11/lib/addons/p5.sound.js#L5579
        const {actx} = this;

        const bufferSize = Math.round(actx.sampleRate * duration);
        const noiseBuffer = new AudioBuffer({
          length: bufferSize,
          sampleRate: actx.sampleRate,
        });
        const data = noiseBuffer.getChannelData(0);
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11;

          b6 = white * 0.115926;
        }

        this.noiseBuffers[name] = {buffer:noiseBuffer, duration:duration};
        this.audioBuffers[`noise_${name}`] = noiseBuffer; // audioBufferにも登録
      }
      createBrownNoiseBuffer(duration = 1, name = "brown_1"){
        // p5から移植してみる
        // https://github.com/processing/p5.js/blob/v1.11.11/lib/addons/p5.sound.js#L5604
        const {actx} = this;

        const bufferSize = Math.round(actx.sampleRate * duration);
        const noiseBuffer = new AudioBuffer({
          length: bufferSize,
          sampleRate: actx.sampleRate,
        });
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }

        this.noiseBuffers[name] = {buffer:noiseBuffer, duration:duration};
        this.audioBuffers[`noise_${name}`] = noiseBuffer; // audioBufferにも登録
      }
      createNoises(params = {}){
        // まとめて色んな長さのバッファを用意します
        const {white = {}, pink = {}, brown = {}} = params;
        for(const [name, duration] of Object.entries(white)){
          this.createWhiteNoiseBuffer(duration, name);
        }
        for(const [name, duration] of Object.entries(pink)){
          this.createPinkNoiseBuffer(duration, name);
        }
        for(const [name, duration] of Object.entries(brown)){
          this.createBrownNoiseBuffer(duration, name);
        }
      }
      playSimpleNoise(name = "white_1", volume = 1, useFilter = false, filters = [{type:"bandpass", frequency:2000, gain:0, q:1}]){
        // 簡易版
        this.playNoise({
          name:name, volume:volume, useFilter:useFilter, filters:filters
        });
      }
      playNoise(params = {}){
        const {actx} = this;
        const {name = "white_1"} = params;

        const noiseBuffer = this.noiseBuffers[name];
        const {buffer, duration} = noiseBuffer;

        // filtersで複数定義できるようにする
        const {
          volume = 1, useFilter = false,
          filters = [{type:"bandpass", frequency:2000, gain:0, q:1}],
          gainFunction = AudioPlayer.reverb_curve0,
          useAnalyser = false
        } = params;

        const source = new AudioBufferSourceNode(actx, {buffer: buffer });
        const gainNode = actx.createGain();

        // ここでfilter
        let filterFlags;
        if(typeof useFilter === 'boolean'){
          // bool値の場合はフィルターの個数だけ同じ値を用意する
          filterFlags = new Array(filters.length);
          filterFlags.fill(useFilter);
        }else if(Array.isArray(useFilter)){
          // 配列の場合は指定する明確な意思があるので足りない部分はfalseで埋めてしまう
          filterFlags = useFilter;
          for(let i=filterFlags.length; i<filters.length; i++){
            filterFlags.push(false);
          }
        }else{
          // 解釈できないなら全部falseでいい
          filterFlags = new Array(filters.length);
          filterFlags.fill(false);
        }
        const properFilters = [];
        for(let i=0; i<filters.length; i++){
          if(filterFlags[i]){
            // trueの物だけ入れる
            properFilters.push(filters[i]);
          }
        }
        // つないでいく
        if(properFilters.length === 0){
          source.connect(gainNode);
        }else{
          let lastTargetNode = source;
          for(let i=0; i<properFilters.length; i++){
            const filterParameters = properFilters[i];
            const biquadFilterNode = new BiquadFilterNode(this.actx);
            const {type = 'bandpass', frequency = 2000, gain = 0, q = 1} = filterParameters;
            // frequencyは文字列OKとする
            biquadFilterNode.type = type;
            biquadFilterNode.frequency.value = (typeof(frequency) === 'string' ? this.getFreq(frequency) : frequency);
            biquadFilterNode.gain.value = gain;
            biquadFilterNode.Q.value = q;
            lastTargetNode.connect(biquadFilterNode);
            lastTargetNode = biquadFilterNode;
          }
          lastTargetNode.connect(gainNode);
        }
        // あとは同じ

        // gainFunctionをいじるのは簡易版はやめましょ
        //gainFunction(actx, gainNode.gain, volume, duration);
        if(typeof gainFunction === 'string'){
          if(this.gainFunctions[gainFunction] !== undefined){
            this.gainFunctions[gainFunction](actx, gainNode.gain, volume, duration);
          }
        }else if(typeof gainFunction === 'function'){
          gainFunction(actx, gainNode.gain, volume, duration);
        }

        // 最終接続
        if(this.analyser !== null && useAnalyser){
          gainNode.connect(this.analyser);
          this.analyser.connect(actx.destination);
        }else{
          gainNode.connect(actx.destination);
        }
        //connectFunction(actx, gainNode);

        source.start();
      }
      registPeriodicWave(name = "wave", realPart = [0,1], imagPart = [0,1]){
        const wave = new PeriodicWave(this.actx, {
          real: realPart,
          imag: imagPart,
        });
        this.periodicWaves[name] = wave;
      }
      async registPeriodicWaveFromJSON(name, url){
        // getJSONの移植
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }
        // jsonへの変換
        const json = await response.json();
        this.registPeriodicWave(name, json.real, json.imag);
      }
      registGainFunction(name = "default", func = (actx, gain, volume, duration) => {}){
        this.gainFunctions[name] = func;
      }
      registFrequencyFunction(name = "default", func = (actx, freq) => {}){
        // まあ何でもありっていう。
        this.frequencyFunctions[name] = func;
      }
      registDoppler(name = "doppler", intervals = [], stops = []){
        // シンプルなdoppler関数の登録
        this.frequencyFunctions[name] = AudioPlayer.createDoppler(intervals, stops);
      }
      registVibrato(name = "vibrato", params = {}){
        // シンプルなvibrato関数の登録
        this.frequencyFunctions[name] = AudioPlayer.createVibrato(params);
      }
      playSimpleOscillator(frequency = 440, type = "square", volume = 1, duration = 1, name = "", frequencyFunction = AudioPlayer.defaultFrequencyFunction){
        this.playOscillator({
          frequency, type, volume, duration, name, frequencyFunction
        });
      }
      playOscillator(params = {}){
        // frequency, type, volume, duration, customの場合はname. いずれ登録関数を作る。ファイル名から登録できるようにする。
        // 一応frequencyFunctionとか用意するのもいいかと思います。ん～...actxを入れる？
        const {actx} = this;
        // ""の場合はまあ、customではないということ。
        const {name = ""} = params;

        // frequencyに配列を許す形で仕様変更。並べるだけ。フィルタ...？
        const {
          frequency = 440, type = "square", volume = 1, duration = 1,
          frequencyFunction = AudioPlayer.defaultFrequencyFunction,
          gainFunction = AudioPlayer.reverb_curve0,
          useAnalyser = false, convolverBuffer = "",
          useFilter = false, filterParameters = {}
        } = params;

        const frequencies = [];
        if(Array.isArray(frequency)){
          for(const f of frequency){
            if(typeof f === 'string'){ frequencies.push(this.getFreq(f)); }else{ frequencies.push(f); }
          }
        }else if(typeof frequency === 'string'){
          frequencies.push(this.getFreq(frequency));
        }else{
          frequencies.push(frequency);
        }
        //const properFrequency = (typeof(frequency) === 'string' ? this.getFreq(frequency) : frequency);
        const oscillators = [];
        for(const f of frequencies){
          // typeなどは後で決める
          const oscillatorOptions = { frequency:f };
          if(type === "sine" || type === "triangle" || type === "square" || type === "sawtooth"){
            // 基本四種の場合
            oscillatorOptions.type = type;
          }else if(type === "custom"){
            // customの場合はnameで判断（後方互換性のために残す）
            if(name !== "" && this.periodicWaves[name] !== undefined){
              oscillatorOptions.type = 'custom';
              oscillatorOptions.periodicWave = this.periodicWaves[name];
            }
          }else{
            // いずれでもない場合は、それをcustom periodicの名称とみなす。
            // たとえばcelesteがあったとして、type:'celeste'とするだけでそれが選ばれる。
            if(type !== "" && this.periodicWaves[type] !== undefined){
              oscillatorOptions.type = 'custom';
              oscillatorOptions.periodicWave = this.periodicWaves[type];
            }
          }
          oscillators.push(new OscillatorNode(actx, oscillatorOptions));
        }

        const gainNode = actx.createGain();

        const biquadFilterNode = new BiquadFilterNode(this.actx);
        // frequencyは文字列OKとする
        const filterType = (filterParameters.type !== undefined ? filterParameters.type : "bandpass");
        const filterFrequency = (filterParameters.frequency !== undefined ? filterParameters.frequency : 2000);
        const {gain = 0, q = 1} = filterParameters;
        biquadFilterNode.type = filterType;
        biquadFilterNode.frequency.value = (typeof filterFrequency === 'string' ? this.getFreq(filterFrequency) : filterFrequency);
        biquadFilterNode.gain.value = gain;
        biquadFilterNode.Q.value = q;

        if(convolverBuffer !== ""){
          const convolverNode = actx.createConvolver();
          convolverNode.buffer = this.audioBuffers[convolverBuffer];
          for(const osc of oscillators){ osc.connect(convolverNode); }
          if(!useFilter){
            convolverNode.connect(gainNode);
          }else{
            convolverNode.connect(biquadFilterNode);
            biquadFilterNode.connect(gainNode);
          }
        }else{
          for(const osc of oscillators){
            if(!useFilter){
              osc.connect(gainNode);
            }else{
              osc.connect(biquadFilterNode);
              biquadFilterNode.connect(gainNode);
            }
          }
        }

        // 振動数をいじる場合。関数群から出せるようにする
        // 配列を許す。中身は文字列でも関数でもOK.
        const frequencyFunctions = (Array.isArray(frequencyFunction) ? frequencyFunction : [frequencyFunction]);
        for(const ff of frequencyFunctions){
          if(typeof ff === 'string'){
            if(this.frequencyFunctions[ff] !== undefined){
              for(const osc of oscillators){ this.frequencyFunctions[ff](actx, osc.frequency); }
            }
          }else if(typeof ff === 'function'){
            for(const osc of oscillators){ ff(actx, osc.frequency); }
          }
        }

        // gainFunctionをいじるのは簡易版はやめましょ
        if(typeof gainFunction === 'string'){
          if(this.gainFunctions[gainFunction] !== undefined){
            this.gainFunctions[gainFunction](actx, gainNode.gain, volume, duration);
          }
        }else if(typeof gainFunction === 'function'){
          gainFunction(actx, gainNode.gain, volume, duration);
        }

        // 最終接続
        const compressor = actx.createDynamicsCompressor();
        gainNode.connect(compressor);

        if(this.analyser !== null && useAnalyser){
          compressor.connect(this.analyser);
          this.analyser.connect(actx.destination);
        }else{
          compressor.connect(actx.destination);
        }

        // まとめて...
        for(const osc of oscillators){
          osc.start();
          osc.stop(actx.currentTime + duration);
        }
      }
      async registAudioBuffer(name, url){
        // getArrayBufferの移植
        const response = await fetch(url);
        if(!response.ok){
          throw new Error(`response.status: ${response.status}`);
        }
        // ArrayBufferの取得。awaitが無いとエラーになる場合がある
        const soundArrayBuffer = await response.arrayBuffer();
        // AudioBufferにdecodeする
        const buffer = await this.actx.decodeAudioData(soundArrayBuffer);
        this.audioBuffers[name] = buffer;
      }
      playAudioBuffer(params = {}){
        const {actx} = this;
        const {
          name = "", volume = 1,
          gainFunction = AudioPlayer.defaultGainFunction,
          useAnalyser = false, convolverBuffer = ""
        } = params;

        if (name === "" || this.audioBuffers[name] === undefined) return;

        const src = new AudioBufferSourceNode(actx, {buffer: this.audioBuffers[name] });
        // 最終接続

        const gainNode = actx.createGain();

        if(convolverBuffer !== ""){
          const convolverNode = actx.createConvolver();
          convolverNode.buffer = this.audioBuffers[convolverBuffer];
          src.connect(convolverNode);
          convolverNode.connect(gainNode);
        }else{
          src.connect(gainNode);
        }

        // 音量設定
        gainFunction(actx, gainNode.gain, volume);

        if(this.analyser !== null && useAnalyser){
          gainNode.connect(this.analyser);
          this.analyser.connect(actx.destination);
        }else{
          gainNode.connect(actx.destination);
        }

        src.start();
      }
      getFreq(code){
        // なんかする。たとえばC,F,Gに+を付けたりする。nだと付かないし+-があればそれは優先される。
        // いずれ導入するかも。
        // 先にA0～G7に+-nを付けたものかどうか調べる
        if(code.match(/^[A-G]{1}[0-7]{1}[\+\-n]{0,1}$/) === null){
          return 440; // 440エラー
        }
        let properCode = code;
        // +-nが無い場合にスケールを適用する
        if(code.match(/^[A-G]{1}[0-7]{1}$/) !== null){
          properCode = AudioPlayer[`apply${this.scale}`](code);
        }
        return AudioPlayer.frequencyDict[properCode];
      }
      static standardParseCode(code, step){
        // はじめに....
        // fpを追加する。fで*1.5倍, pで0.66倍。強さ。
        // 調べる場所を統一して変更しやすくする
        if(!AudioPlayer.isValidCode(code)){ return null; }
        // A+とかA-とかAnとかAの部分を抜き出す
        const codeTop = code.match(/^[A-G]{1}[\+\-n]{0,1}/)[0];
        const cap = codeTop.match(/^[A-G]{1}/)[0];
        const symbol = codeTop.split(/[A-G]{1}/)[1];
        // 意外とこういう関数が無いので...
        const cnt = (u) => (u === null ? 0 : u.length);
        // ^の数だけ上げて_の数だけ下げる。たとえばA5ならA^^と表現する。F5ならF^^ですね。逆にG2だったらG_となる。
        const level = Math.max(0, Math.min(7, 3 + cnt(code.match(/\^/g)) - cnt(code.match(/_/g))));

        const finalCode = cap + level.toString() + symbol;

        // sの数だけ長さを0.5倍、lの数だけ長さを2倍。基準はstep. さらにdの数だけ1.5倍する
        const duration = step * Math.pow(2, -cnt(code.match(/s/g)) + cnt(code.match(/l/g))) * Math.pow(1.5, cnt(code.match(/d/g)));
        // pの数だけ0.666倍、fの数だけ1.5倍の強さにする
        const volume = Math.pow(1.5, -cnt(code.match(/p/g)) + cnt(code.match(/f/g)));
        // まあいいや。
        return {code:finalCode, duration:duration, volume:volume};
      }
      static parseChord(code, step, type = "square"){
        // stepはミリ秒指定である。typeを指定する。
        if(!AudioPlayer.isValidChord(code)){ return null; }
        const properCode = code.replace(/(major|minor|dim|aug)[7]{0,1}/, "");
        const codeResult = AudioPlayer.standardParseCode(properCode, step);
        const baseFreq = AudioPlayer.frequencyDict[codeResult.code];
        const c = code.match(/(major|minor|dim|aug)[7]{0,1}/);
        if(c === null){
          return {frequency:[baseFreq], duration:codeResult.duration/1000, volume:codeResult.volume, type};
        }
        const chordDict = {
          "major":[4,7], "minor":[3,7], "dim":[3,6], "aug":[4,8],
          "major7":[4,7,11], "minor7":[3,7,10], "dim7":[3,6,9], "aug7":[4,8,10]
        };
        const chords = chordDict[c[0]];
        const freqArray = [baseFreq];
        for(let i=0; i<chords.length; i++){
          freqArray.push(baseFreq * Math.pow(2, chords[i]/12));
        }
        return {frequency:freqArray, duration:codeResult.duration/1000, volume:codeResult.volume, type};
      }
      static isValidCode(code){
        // standardParseCodeに適合するかどうかを調べるだけ。
        // 適合するならtrueを返す。
        // dの数を無制限にし、さらに^_以降は順序不問とする。
        return code.match(/^[A-G]{1}[\+\-n]{0,1}[\^_sldfp]*$/) !== null;
        //return code.match(/^[A-G]{1}[\+\-n]{0,1}[\^_]*[sl]*d?[fp]*$/) !== null;
      }
      static isValidChord(code){
        // 似てるけどChordです。
        return code.match(/^[A-G]{1}[\+\-]{0,1}(|major|minor|dim|aug)[7]{0,1}[\^_sldfp]*$/) !== null;
      }
    }

    const gainArray_reverb_curve0 = [0.009739309394669462, 0.4553566201670681, 0.7004461410918874, 0.8352453776005381, 0.9093849576802959, 0.9501617267241628, 0.9725889496982896, 0.9849239223340592, 0.9356777262173562, 0.8888938399064884, 0.844449147911164, 0.8022266905156058, 0.7621153559898255, 0.7240095881903342, 0.6878091087808175, 0.6534186533417765, 0.6207477206746876, 0.5897103346409532, 0.5602248179089055, 0.5322135770134603, 0.5056028981627873, 0.48032275325464785, 0.45630661559191543, 0.43349128481231963, 0.41181672057170365, 0.39122588454311846, 0.3716645903159625, 0.35308136080016433, 0.3354272927601561, 0.31865592812214827, 0.3027231317160408, 0.2875869751302388, 0.2732076263737268, 0.25954724505504045, 0.24656988280228842, 0.23424138866217398, 0.22252931922906527, 0.211402853267612, 0.20083271060423138, 0.1907910750740198, 0.1812515213203188, 0.17218894525430284, 0.1635794979915877, 0.1554005230920083, 0.14763049693740787, 0.14024897209053747, 0.1332365234860106, 0.12657469731171006, 0.12024596244612455, 0.11423366432381832, 0.1085219811076274, 0.10309588205224603, 0.09794108794963372, 0.09304403355215203, 0.08839183187454443, 0.0839722402808172, 0.07977362826677634, 0.07578494685343752, 0.07199569951076565, 0.06839591453522736, 0.06497611880846599, 0.061727312868042686, 0.05864094722464055, 0.05570889986340852, 0.05292345487023809, 0.050277282126726185, 0.04776341802038987, 0.045375247119370375, 0.043106484763401856, 0.04095116052523176, 0.03890360249897017, 0.036958422374021666, 0.03511050125532058, 0.03335497619255455, 0.03168722738292682, 0.03010286601378048, 0.028597722713091453, 0.02716783657743688, 0.025809444748565034, 0.024518972511136782, 0.023293023885579942, 0.022128372691300944, 0.021021954056735896, 0.0199708563538991, 0.018972313536204145, 0.018023697859393936, 0.01712251296642424, 0.016266387318103027, 0.015453067952197875, 0.01468041455458798, 0.013946393826858581, 0.013249074135515652, 0.01258662042873987, 0.011957289407302875, 0.01135942493693773, 0.010791453690090843, 0.010251881005586301, 0];

    AudioPlayer.reverb_curve0 = (actx, gain, attackLevel = 1.0, duration = 1.0) => {
      const a = gainArray_reverb_curve0.map(x => x*attackLevel);
      gain.setValueCurveAtTime(a, actx.currentTime, duration);
    }

    // 基本的なADSR
    // sustainLevelRatio:0.2, attackRatio:0.04, sustainRatio:0.15, decayRatio:0.45.
    // attackRatioの間にvolumeまで上げて、sustainLevelまで下げて、sustainRatioだけ保って、decayRatioで落とす。
    // って思ったけどちょっといじって0.2->0.1としました。いいでしょ。
    AudioPlayer.defaultADSR = (actx, gain, attackLevel = 1.0, duration = 1.0) => {
      gain.setValueAtTime(0, actx.currentTime);
      /*
      gain.linearRampToValueAtTime(attackLevel, actx.currentTime + duration*0.04);
      gain.linearRampToValueAtTime(attackLevel*0.2, actx.currentTime + duration*0.4);
      gain.linearRampToValueAtTime(attackLevel*0.08, actx.currentTime + duration*0.55);
      gain.linearRampToValueAtTime(0, actx.currentTime + duration);
      */
      // こうすることでほぼdurationの長さの間に音が消える...だって0.08だからね。
      // こうした方が音の長さの感覚としてはしっくりくると思うんだよね。
      // これノイズとかでも使ってるからあっちも変えないとだわね。
      const multiplier = 2;
      gain.linearRampToValueAtTime(attackLevel, actx.currentTime + duration*0.04 * multiplier);
      gain.linearRampToValueAtTime(attackLevel*0.2, actx.currentTime + duration*0.4 * multiplier);
      gain.linearRampToValueAtTime(attackLevel*0.08, actx.currentTime + duration*0.55 * multiplier);
      gain.linearRampToValueAtTime(0, actx.currentTime + duration * multiplier);
    }
    AudioPlayer.defaultFilterFunction = (actx, filterNode, type, frequency, gain, q) => {
      filterNode.type = type;
      filterNode.frequency.value = frequency;
      filterNode.gain.value = gain;
      filterNode.Q.value = q;
    }
    // なんかcubaseがA3=440らしいのでそれに合わせる。midiはまた違うらしい。
    const notes = [
      "A0", "B0", "C0", "D0", "E0", "F0", "G0",
      "A1", "B1", "C1", "D1", "E1", "F1", "G1",
      "A2", "B2", "C2", "D2", "E2", "F2", "G2",
      "A3", "B3", "C3", "D3", "E3", "F3", "G3",
      "A4", "B4", "C4", "D4", "E4", "F4", "G4",
      "A5", "B5", "C5", "D5", "E5", "F5", "G5",
      "A6", "B6", "C6", "D6", "E6", "F6", "G6",
      "A7", "B7", "C7", "D7", "E7", "F7", "G7"
    ];
    const noteKeys = [
       0,  2,  3,  5,  7,  8, 10,
      12, 14, 15, 17, 19, 20, 22,
      24, 26, 27, 29, 31, 32, 34,
      36, 38, 39, 41, 43, 44, 46,
      48, 50, 51, 53, 55, 56, 58,
      60, 62, 63, 65, 67, 68, 70,
      72, 74, 75, 77, 79, 80, 82,
      84, 86, 87, 89, 91, 92, 94
    ];
    const frequencyDict = {};
    const noteKeyDict = {};
    // ナチュラルを追加する。ナチュラルは臨時記号の一種で、無印と違って調号の影響を受けないので重要である。
    // A, An, A+, A-. AとAnは同じ音の高さだが、Aは調号により+-が付く可能性がある。
    for(let i=0; i<56; i++){
      frequencyDict[notes[i]] = 55*Math.pow(2, noteKeys[i]/12);
      frequencyDict[`${notes[i]}n`] = 55*Math.pow(2, noteKeys[i]/12);
      frequencyDict[`${notes[i]}+`] = 55*Math.pow(2, (noteKeys[i]+1)/12);
      frequencyDict[`${notes[i]}-`] = 55*Math.pow(2, (noteKeys[i]-1)/12);
      noteKeyDict[notes[i]] = noteKeys[i];
      noteKeyDict[`${notes[i]}n`] = noteKeys[i];
      noteKeyDict[`${notes[i]}+`] = noteKeys[i]+1;
      noteKeyDict[`${notes[i]}-`] = noteKeys[i]-1;
    }
    const intervalDict = {};
    for(let i=-48; i<=48; i++){
      intervalDict[i] = Math.pow(2, i/12);
    }
    AudioPlayer.frequencyDict = frequencyDict;
    AudioPlayer.noteKeyDict = noteKeyDict;
    AudioPlayer.defaultFrequencyFunction = (actx, freq) => {};
    AudioPlayer.defaultGainFunction = (actx, gain, volume) => {
      gain.setValueAtTime(volume, actx.currentTime);
    };
    // -36～36（3オクターブ）の範囲で上げたり下げたりする。12で丁度1オクターブですね。
    AudioPlayer.createDoppler = (intervals = [], stops = []) => { return (function(actx, freq){
      const defaultFrequency = freq.value;
      for(let i=0; i<intervals.length; i++){
        if(intervals[i] === undefined || stops[i] === undefined) break;
        if(typeof intervals[i] !== 'number' || typeof stops[i] !== 'number') break;

        const intervalFactor = Math.max(-48, Math.min(48, Math.floor(intervals[i])));
        freq.linearRampToValueAtTime(defaultFrequency * intervalDict[intervals[i]], actx.currentTime + stops[i]);
      }
    }); };
    AudioPlayer.createVibrato = (params = {}) => {
      const {frequency = 10, type = "square", amplitude = 40, duration = 1} = params;
      return (function(actx, freq){
      const lfo = new OscillatorNode(actx, { frequency:frequency, type:type });
      const lfoGain = actx.createGain();
      lfoGain.gain.value = amplitude;
      lfo.connect(lfoGain); lfoGain.connect(freq);
      lfo.start();
      lfo.stop(actx.currentTime + duration);
    }); }
    AudioPlayer.scales = [
      "Cmajor", "Gmajor", "Dmajor", "Amajor", "Emajor", "Bmajor", "Fsharpmajor", "Csharpmajor",
      "Fmajor", "Bflatmajor", "Eflatmajor", "Aflatmajor", "Dflatmajor", "Gflatmajor", "Cflatmajor",
      "Aminor", "Eminor", "Bminor", "Fsharpminor", "Csharpminor", "Gsharpminor", "Dsharpminor", "Asharpminor",
      "Dminor", "Gminor", "Cminor", "Fminor", "Bflatminor", "Eflatminor", "Aflatminor"
    ];
    AudioPlayer.applyCmajor = (s) => { return s; };
    AudioPlayer.applyGmajor = (s) => { return (s.match(/[F]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyDmajor = (s) => { return (s.match(/[FC]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyAmajor = (s) => { return (s.match(/[FCG]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyEmajor = (s) => { return (s.match(/[FCGD]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyBmajor = (s) => { return (s.match(/[FCGDA]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyFsharpmajor = (s) => { return (s.match(/[FCGDAE]/) !== null ? s.concat("+") : s); };
    AudioPlayer.applyCsharpmajor = (s) => { return (s.match(/[FCGDAEB]/) !== null ? s.concat("+") : s); };

    AudioPlayer.applyFmajor = (s) => { return (s.match(/[B]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyBflatmajor = (s) => { return (s.match(/[BE]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyEflatmajor = (s) => { return (s.match(/[BEA]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyAflatmajor = (s) => { return (s.match(/[BEAD]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyDflatmajor = (s) => { return (s.match(/[BEADG]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyGflatmajor = (s) => { return (s.match(/[BEADGC]/) !== null ? s.concat("-") : s); };
    AudioPlayer.applyCflatmajor = (s) => { return (s.match(/[BEADGCF]/) !== null ? s.concat("-") : s); };

    AudioPlayer.applyAminor = AudioPlayer.applyCmajor;
    AudioPlayer.applyEminor = AudioPlayer.applyGmajor;
    AudioPlayer.applyBminor = AudioPlayer.applyDmajor;
    AudioPlayer.applyFsharpminor = AudioPlayer.applyAmajor;
    AudioPlayer.applyCsharpminor = AudioPlayer.applyEmajor;
    AudioPlayer.applyGsharpminor = AudioPlayer.applyBmajor;
    AudioPlayer.applyDsharpminor = AudioPlayer.applyFsharpmajor;
    AudioPlayer.applyAsharpminor = AudioPlayer.applyCsharpmajor;

    AudioPlayer.applyDminor = AudioPlayer.applyFmajor;
    AudioPlayer.applyGminor = AudioPlayer.applyBflatmajor;
    AudioPlayer.applyCminor = AudioPlayer.applyEflatmajor;
    AudioPlayer.applyFminor = AudioPlayer.applyAflatmajor;
    AudioPlayer.applyBflatminor = AudioPlayer.applyDflatmajor;
    AudioPlayer.applyEflatminor = AudioPlayer.applyGflatmajor;
    AudioPlayer.applyAflatminor = AudioPlayer.applyCflatmajor;

    /*
      waveTable.
      source: https://github.com/GoogleChromeLabs/web-audio-samples/tree/main/src/demos/wavetable-synth/wave-tables
    */
    AudioPlayer.presetWaveTables = {
      warm_Triangle:{"real":[0,0.63662,0,0.212207,0,0.127324,0,0.090946,0,0.070736,0,0.057875,0,0.048971,0,0.042441,0,0.037448,0,0.033506,0,0.030315,0,0.027679,0,0.025465,0,0.023579,0,0.021952,0,0.020536,0,0.019292,0,0.018189,0,0.017206,0,0.016324,0,0.015527,0,0.014805,0,0.014147,0,0.013545,0,0.012992,0,0.012483,0,0.012012,0,0.011575,0,0.011169,0,0.01079,0,0.010436,0,0.010105,0,0.009794,0,0.009502,0,0.009226,0,0.008966,0,0.008721,0,0.008488,0,0.008268,0,0.008058,0,0.00786,0,0.00767,0,0.00749,0,0.007317,0,0.007153,0,0.006996,0,0.006845,0,0.006701,0,0.006563,0,0.006431,0,0.006303,0,0.006181,0,0.006063,0,0.00595,0,0.005841,0,0.005735,0,0.005634,0,0.005536,0,0.005441,0,0.00535,0,0.005261,0,0.005176,0,0.005093,0,0.005013,0,0.004935,0,0.00486,0,0.004787,0,0.004716,0,0.004647,0,0.00458,0,0.004515,0,0.004452,0,0.00439,0,0.004331,0,0.004273,0,0.004216,0,0.004161,0,0.004107,0,0.004055,0,0.004004,0,0.003954,0,0.003906,0,0.003858,0,0.003812,0,0.003767,0,0.003723,0,0.00368,0,0.003638,0,0.003597,0,0.003557,0,0.003517,0,0.003479,0,0.003441,0,0.003404,0,0.003368,0,0.003333,0,0.003299,0,0.003265,0,0.003232,0,0.003199,0,0.003167,0,0.003136,0,0.003105,0,0.003075,0,0.003046,0,0.003017,0,0.002989,0,0.002961,0,0.002934,0,0.002907,0,0.002881,0,0.002855,0,0.002829,0,0.002804,0,0.00278,0,0.002756,0,0.002732,0,0.002709,0,0.002686,0,0.002664,0,0.002642,0,0.00262,0,0.002598,0,0.002577,0,0.002557,0,0.002536,0,0.002516,0,0.002497,0,0.002477,0,0.002458,0,0.002439,0,0.002421,0,0.002402,0,0.002384,0,0.002367,0,0.002349,0,0.002332,0,0.002315,0,0.002298,0,0.002282,0,0.002266,0,0.00225,0,0.002234,0,0.002218,0,0.002203,0,0.002188,0,0.002173,0,0.002158,0,0.002144,0,0.002129,0,0.002115,0,0.002101,0,0.002087,0,0.002074,0,0.00206,0,0.002047,0,0.002034,0,0.002021,0,0.002008,0,0.001996,0,0.001983,0,0.001971,0,0.001959,0,0.001947,0,0.001935,0,0.001923,0,0.001912,0,0.0019,0,0.001889,0,0.001878,0,0.001867,0,0.001856,0,0.001845,0,0.001835,0,0.001824,0,0.001814,0,0.001803,0,0.001793,0,0.001783,0,0.001773,0,0.001763,0,0.001754,0,0.001744,0,0.001735,0,0.001725,0,0.001716,0,0.001707,0,0.001698,0,0.001689,0,0.00168,0,0.001671,0,0.001662,0,0.001654,0,0.001645,0,0.001637,0,0.001628,0,0.00162,0,0.001612,0,0.001604,0,0.001596,0,0.001588,0,0.00158,0,0.001572,0,0.001564,0,0.001557,0,0.001549,0,0.001541,0,0.001534,0,0.001527,0,0.001519,0,0.001512,0,0.001505,0,0.001498,0,0.001491,0,0.001484,0,0.001477,0,0.00147,0,0.001463,0,0.001457,0,0.00145,0,0.001444,0,0.001437,0,0.001431,0,0.001424,0,0.001418,0,0.001412,0,0.001405,0,0.001399,0,0.001393,0,0.001387,0,0.001381,0,0.001375,0,0.001369,0,0.001363,0,0.001357,0,0.001352,0,0.001346,0,0.00134,0,0.001335,0,0.001329,0,0.001324,0,0.001318,0,0.001313,0,0.001307,0,0.001302,0,0.001297,0,0.001291,0,0.001286,0,0.001281,0,0.001276,0,0.001271,0,0.001266,0,0.001261,0,0.001256,0,0.001251,0,0.001246,0,0.001241,0,0.001236,0,0.001231,0,0.001227,0,0.001222,0,0.001217,0,0.001213,0,0.001208,0,0.001203,0,0.001199,0,0.001194,0,0.00119,0,0.001186,0,0.001181,0,0.001177,0,0.001172,0,0.001168,0,0.001164,0,0.00116,0,0.001155,0,0.001151,0,0.001147,0,0.001143,0,0.001139,0,0.001135,0,0.001131,0,0.001127,0,0.001123,0,0.001119,0,0.001115,0,0.001111,0,0.001107,0,0.001103,0,0.0011,0,0.001096,0,0.001092,0,0.001088,0,0.001085,0,0.001081,0,0.001077,0,0.001074,0,0.00107,0,0.001066,0,0.001063,0,0.001059,0,0.001056,0,0.001052,0,0.001049,0,0.001045,0,0.001042,0,0.001039,0,0.001035,0,0.001032,0,0.001028,0,0.001025,0,0.001022,0,0.001019,0,0.001015,0,0.001012,0,0.001009,0,0.001006,0,0.001003,0,0.000999,0,0.000996,0,0.000993,0,0.00099,0,0.000987,0,0.000984,0,0.000981,0,0.000978,0,0.000975,0,0.000972,0,0.000969,0,0.000966,0,0.000963,0,0.00096,0,0.000957,0,0.000954,0,0.000952,0,0.000949,0,0.000946,0,0.000943,0,0.00094,0,0.000938,0,0.000935,0,0.000932,0,0.000929,0,0.000927,0,0.000924,0,0.000921,0,0.000919,0,0.000916,0,0.000913,0,0.000911,0,0.000908,0,0.000906,0,0.000903,0,0.0009,0,0.000898,0,0.000895,0,0.000893,0,0.00089,0,0.000888,0,0.000885,0,0.000883,0,0.000881,0,0.000878,0,0.000876,0,0.000873,0,0.000871,0,0.000869,0,0.000866,0,0.000864,0,0.000861,0,0.000859,0,0.000857,0,0.000855,0,0.000852,0,0.00085,0,0.000848,0,0.000845,0,0.000843,0,0.000841,0,0.000839,0,0.000837,0,0.000834,0,0.000832,0,0.00083,0,0.000828,0,0.000826,0,0.000824,0,0.000821,0,0.000819,0,0.000817,0,0.000815,0,0.000813,0,0.000811,0,0.000809,0,0.000807,0,0.000805,0,0.000803,0,0.000801,0,0.000799,0,0.000797,0,0.000795,0,0.000793,0,0.000791,0,0.000789,0,0.000787,0,0.000785,0,0.000783,0,0.000781,0,0.000779,0,0.000777,0,0.000775,0,0.000774,0,0.000772,0,0.00077,0,0.000768,0,0.000766,0,0.000764,0,0.000762,0,0.000761,0,0.000759,0,0.000757,0,0.000755,0,0.000753,0,0.000752,0,0.00075,0,0.000748,0,0.000746,0,0.000745,0,0.000743,0,0.000741,0,0.000739,0,0.000738,0,0.000736,0,0.000734,0,0.000733,0,0.000731,0,0.000729,0,0.000728,0,0.000726,0,0.000724,0,0.000723,0,0.000721,0,0.000719,0,0.000718,0,0.000716,0,0.000715,0,0.000713,0,0.000711,0,0.00071,0,0.000708,0,0.000707,0,0.000705,0,0.000703,0,0.000702,0,0.0007,0,0.000699,0,0.000697,0,0.000696,0,0.000694,0,0.000693,0,0.000691,0,0.00069,0,0.000688,0,0.000687,0,0.000685,0,0.000684,0,0.000682,0,0.000681,0,0.000679,0,0.000678,0,0.000677,0,0.000675,0,0.000674,0,0.000672,0,0.000671,0,0.000669,0,0.000668,0,0.000667,0,0.000665,0,0.000664,0,0.000662,0,0.000661,0,0.00066,0,0.000658,0,0.000657,0,0.000656,0,0.000654,0,0.000653,0,0.000652,0,0.00065,0,0.000649,0,0.000648,0,0.000646,0,0.000645,0,0.000644,0,0.000642,0,0.000641,0,0.00064,0,0.000639,0,0.000637,0,0.000636,0,0.000635,0,0.000633,0,0.000632,0,0.000631,0,0.00063,0,0.000628,0,0.000627,0,0.000626,0,0.000625,0,0.000624,0,0.000622,0,0.000621,0,0.00062,0,0.000619,0,0.000617,0,0.000616,0,0.000615,0,0.000614,0,0.000613,0,0.000612,0,0.00061,0,0.000609,0,0.000608,0,0.000607,0,0.000606,0,0.000605,0,0.000603,0,0.000602,0,0.000601,0,0.0006,0,0.000599,0,0.000598,0,0.000597,0,0.000596,0,0.000594,0,0.000593,0,0.000592,0,0.000591,0,0.00059,0,0.000589,0,0.000588,0,0.000587,0,0.000586,0,0.000585,0,0.000584,0,0.000582,0,0.000581,0,0.00058,0,0.000579,0,0.000578,0,0.000577,0,0.000576,0,0.000575,0,0.000574,0,0.000573,0,0.000572,0,0.000571,0,0.00057,0,0.000569,0,0.000568,0,0.000567,0,0.000566,0,0.000565,0,0.000564,0,0.000563,0,0.000562,0,0.000561,0,0.00056,0,0.000559,0,0.000558,0,0.000557,0,0.000556,0,0.000555,0,0.000554,0,0.000553,0,0.000552,0,0.000551,0,0.00055,0,0.000549,0,0.000548,0,0.000547,0,0.000546,0,0.000546,0,0.000545,0,0.000544,0,0.000543,0,0.000542,0,0.000541,0,0.00054,0,0.000539,0,0.000538,0,0.000537,0,0.000536,0,0.000535,0,0.000535,0,0.000534,0,0.000533,0,0.000532,0,0.000531,0,0.00053,0,0.000529,0,0.000528,0,0.000527,0,0.000527,0,0.000526,0,0.000525,0,0.000524,0,0.000523,0,0.000522,0,0.000521,0,0.000521,0,0.00052,0,0.000519,0,0.000518,0,0.000517,0,0.000516,0,0.000515,0,0.000515,0,0.000514,0,0.000513,0,0.000512,0,0.000511,0,0.000511,0,0.00051,0,0.000509,0,0.000508,0,0.000507,0,0.000506,0,0.000506,0,0.000505,0,0.000504,0,0.000503,0,0.000502,0,0.000502,0,0.000501,0,0.0005,0,0.000499,0,0.000499,0,0.000498,0,0.000497,0,0.000496,0,0.000495,0,0.000495,0,0.000494,0,0.000493,0,0.000492,0,0.000492,0,0.000491,0,0.00049,0,0.000489,0,0.000489,0,0.000488,0,0.000487,0,0.000486,0,0.000486,0,0.000485,0,0.000484,0,0.000483,0,0.000483,0,0.000482,0,0.000481,0,0.00048,0,0.00048,0,0.000479,0,0.000478,0,0.000478,0,0.000477,0,0.000476,0,0.000475,0,0.000475,0,0.000474,0,0.000473,0,0.000473,0,0.000472,0,0.000471,0,0.000471,0,0.00047,0,0.000469,0,0.000468,0,0.000468,0,0.000467,0,0.000466,0,0.000466,0,0.000465,0,0.000464,0,0.000464,0,0.000463,0,0.000462,0,0.000462,0,0.000461,0,0.00046,0,0.00046,0,0.000459,0,0.000458,0,0.000458,0,0.000457,0,0.000456,0,0.000456,0,0.000455,0,0.000454,0,0.000454,0,0.000453,0,0.000452,0,0.000452,0,0.000451,0,0.000451,0,0.00045,0,0.000449,0,0.000449,0,0.000448,0,0.000447,0,0.000447,0,0.000446,0,0.000446,0,0.000445,0,0.000444,0,0.000444,0,0.000443,0,0.000442,0,0.000442,0,0.000441,0,0.000441,0,0.00044,0,0.000439,0,0.000439,0,0.000438,0,0.000438,0,0.000437,0,0.000436,0,0.000436,0,0.000435,0,0.000435,0,0.000434,0,0.000433,0,0.000433,0,0.000432,0,0.000432,0,0.000431,0,0.00043,0,0.00043,0,0.000429,0,0.000429,0,0.000428,0,0.000428,0,0.000427,0,0.000426,0,0.000426,0,0.000425,0,0.000425,0,0.000424,0,0.000424,0,0.000423,0,0.000422,0,0.000422,0,0.000421,0,0.000421,0,0.00042,0,0.00042,0,0.000419,0,0.000419,0,0.000418,0,0.000417,0,0.000417,0,0.000416,0,0.000416,0,0.000415,0,0.000415,0,0.000414,0,0.000414,0,0.000413,0,0.000413,0,0.000412,0,0.000412,0,0.000411,0,0.00041,0,0.00041,0,0.000409,0,0.000409,0,0.000408,0,0.000408,0,0.000407,0,0.000407,0,0.000406,0,0.000406,0,0.000405,0,0.000405,0,0.000404,0,0.000404,0,0.000403,0,0.000403,0,0.000402,0,0.000402,0,0.000401,0,0.000401,0,0.0004,0,0.0004,0,0.000399,0,0.000399,0,0.000398,0,0.000398,0,0.000397,0,0.000397,0,0.000396,0,0.000396,0,0.000395,0,0.000395,0,0.000394,0,0.000394,0,0.000393,0,0.000393,0,0.000392,0,0.000392,0,0.000391,0,0.000391,0,0.00039,0,0.00039,0,0.000389,0,0.000389,0,0.000388,0,0.000388,0,0.000387,0,0.000387,0,0.000387,0,0.000386,0,0.000386,0,0.000385,0,0.000385,0,0.000384,0,0.000384,0,0.000383,0,0.000383,0,0.000382,0,0.000382,0,0.000381,0,0.000381,0,0.000381,0,0.00038,0,0.00038,0,0.000379,0,0.000379,0,0.000378,0,0.000378,0,0.000377,0,0.000377,0,0.000376,0,0.000376,0,0.000376,0,0.000375,0,0.000375,0,0.000374,0,0.000374,0,0.000373,0,0.000373,0,0.000373,0,0.000372,0,0.000372,0,0.000371,0,0.000371,0,0.00037,0,0.00037,0,0.000369,0,0.000369,0,0.000369,0,0.000368,0,0.000368,0,0.000367,0,0.000367,0,0.000367,0,0.000366,0,0.000366,0,0.000365,0,0.000365,0,0.000364,0,0.000364,0,0.000364,0,0.000363,0,0.000363,0,0.000362,0,0.000362,0,0.000362,0,0.000361,0,0.000361,0,0.00036,0,0.00036,0,0.000359,0,0.000359,0,0.000359,0,0.000358,0,0.000358,0,0.000357,0,0.000357,0,0.000357,0,0.000356,0,0.000356,0,0.000355,0,0.000355,0,0.000355,0,0.000354,0,0.000354,0,0.000353,0,0.000353,0,0.000353,0,0.000352,0,0.000352,0,0.000352,0,0.000351,0,0.000351,0,0.00035,0,0.00035,0,0.00035,0,0.000349,0,0.000349,0,0.000348,0,0.000348,0,0.000348,0,0.000347,0,0.000347,0,0.000347,0,0.000346,0,0.000346,0,0.000345,0,0.000345,0,0.000345,0,0.000344,0,0.000344,0,0.000344,0,0.000343,0,0.000343,0,0.000342,0,0.000342,0,0.000342,0,0.000341,0,0.000341,0,0.000341,0,0.00034,0,0.00034,0,0.00034,0,0.000339,0,0.000339,0,0.000338,0,0.000338,0,0.000338,0,0.000337,0,0.000337,0,0.000337,0,0.000336,0,0.000336,0,0.000336,0,0.000335,0,0.000335,0,0.000335,0,0.000334,0,0.000334,0,0.000333,0,0.000333,0,0.000333,0,0.000332,0,0.000332,0,0.000332,0,0.000331,0,0.000331,0,0.000331,0,0.00033,0,0.00033,0,0.00033,0,0.000329,0,0.000329,0,0.000329,0,0.000328,0,0.000328,0,0.000328,0,0.000327,0,0.000327,0,0.000327,0,0.000326,0,0.000326,0,0.000326,0,0.000325,0,0.000325,0,0.000325,0,0.000324,0,0.000324,0,0.000324,0,0.000323,0,0.000323,0,0.000323,0,0.000322,0,0.000322,0,0.000322,0,0.000321,0,0.000321,0,0.000321,0,0.00032,0,0.00032,0,0.00032,0,0.000319,0,0.000319,0,0.000319,0,0.000318,0,0.000318,0,0.000318,0,0.000318,0,0.000317,0,0.000317,0,0.000317,0,0.000316,0,0.000316,0,0.000316,0,0.000315,0,0.000315,0,0.000315,0,0.000314,0,0.000314,0,0.000314,0,0.000313,0,0.000313,0,0.000313,0,0.000313,0,0.000312,0,0.000312,0,0.000312,0,0.000311,0,0.000311],"imag":[0,-0.63662,0,-0.212207,0,-0.127324,0,-0.090946,0,-0.070736,0,-0.057875,0,-0.048971,0,-0.042441,0,-0.037448,0,-0.033506,0,-0.030315,0,-0.027679,0,-0.025465,0,-0.023579,0,-0.021952,0,-0.020536,0,-0.019292,0,-0.018189,0,-0.017206,0,-0.016324,0,-0.015527,0,-0.014805,0,-0.014147,0,-0.013545,0,-0.012992,0,-0.012483,0,-0.012012,0,-0.011575,0,-0.011169,0,-0.01079,0,-0.010436,0,-0.010105,0,-0.009794,0,-0.009502,0,-0.009226,0,-0.008966,0,-0.008721,0,-0.008488,0,-0.008268,0,-0.008058,0,-0.00786,0,-0.00767,0,-0.00749,0,-0.007317,0,-0.007153,0,-0.006996,0,-0.006845,0,-0.006701,0,-0.006563,0,-0.006431,0,-0.006303,0,-0.006181,0,-0.006063,0,-0.00595,0,-0.005841,0,-0.005735,0,-0.005634,0,-0.005536,0,-0.005441,0,-0.00535,0,-0.005261,0,-0.005176,0,-0.005093,0,-0.005013,0,-0.004935,0,-0.00486,0,-0.004787,0,-0.004716,0,-0.004647,0,-0.00458,0,-0.004515,0,-0.004452,0,-0.00439,0,-0.004331,0,-0.004273,0,-0.004216,0,-0.004161,0,-0.004107,0,-0.004055,0,-0.004004,0,-0.003954,0,-0.003906,0,-0.003858,0,-0.003812,0,-0.003767,0,-0.003723,0,-0.00368,0,-0.003638,0,-0.003597,0,-0.003557,0,-0.003517,0,-0.003479,0,-0.003441,0,-0.003404,0,-0.003368,0,-0.003333,0,-0.003299,0,-0.003265,0,-0.003232,0,-0.003199,0,-0.003167,0,-0.003136,0,-0.003105,0,-0.003075,0,-0.003046,0,-0.003017,0,-0.002989,0,-0.002961,0,-0.002934,0,-0.002907,0,-0.002881,0,-0.002855,0,-0.002829,0,-0.002804,0,-0.00278,0,-0.002756,0,-0.002732,0,-0.002709,0,-0.002686,0,-0.002664,0,-0.002642,0,-0.00262,0,-0.002598,0,-0.002577,0,-0.002557,0,-0.002536,0,-0.002516,0,-0.002497,0,-0.002477,0,-0.002458,0,-0.002439,0,-0.002421,0,-0.002402,0,-0.002384,0,-0.002367,0,-0.002349,0,-0.002332,0,-0.002315,0,-0.002298,0,-0.002282,0,-0.002266,0,-0.00225,0,-0.002234,0,-0.002218,0,-0.002203,0,-0.002188,0,-0.002173,0,-0.002158,0,-0.002144,0,-0.002129,0,-0.002115,0,-0.002101,0,-0.002087,0,-0.002074,0,-0.00206,0,-0.002047,0,-0.002034,0,-0.002021,0,-0.002008,0,-0.001996,0,-0.001983,0,-0.001971,0,-0.001959,0,-0.001947,0,-0.001935,0,-0.001923,0,-0.001912,0,-0.0019,0,-0.001889,0,-0.001878,0,-0.001867,0,-0.001856,0,-0.001845,0,-0.001835,0,-0.001824,0,-0.001814,0,-0.001803,0,-0.001793,0,-0.001783,0,-0.001773,0,-0.001763,0,-0.001754,0,-0.001744,0,-0.001735,0,-0.001725,0,-0.001716,0,-0.001707,0,-0.001698,0,-0.001689,0,-0.00168,0,-0.001671,0,-0.001662,0,-0.001654,0,-0.001645,0,-0.001637,0,-0.001628,0,-0.00162,0,-0.001612,0,-0.001604,0,-0.001596,0,-0.001588,0,-0.00158,0,-0.001572,0,-0.001564,0,-0.001557,0,-0.001549,0,-0.001541,0,-0.001534,0,-0.001527,0,-0.001519,0,-0.001512,0,-0.001505,0,-0.001498,0,-0.001491,0,-0.001484,0,-0.001477,0,-0.00147,0,-0.001463,0,-0.001457,0,-0.00145,0,-0.001444,0,-0.001437,0,-0.001431,0,-0.001424,0,-0.001418,0,-0.001412,0,-0.001405,0,-0.001399,0,-0.001393,0,-0.001387,0,-0.001381,0,-0.001375,0,-0.001369,0,-0.001363,0,-0.001357,0,-0.001352,0,-0.001346,0,-0.00134,0,-0.001335,0,-0.001329,0,-0.001324,0,-0.001318,0,-0.001313,0,-0.001307,0,-0.001302,0,-0.001297,0,-0.001291,0,-0.001286,0,-0.001281,0,-0.001276,0,-0.001271,0,-0.001266,0,-0.001261,0,-0.001256,0,-0.001251,0,-0.001246,0,-0.001241,0,-0.001236,0,-0.001231,0,-0.001227,0,-0.001222,0,-0.001217,0,-0.001213,0,-0.001208,0,-0.001203,0,-0.001199,0,-0.001194,0,-0.00119,0,-0.001186,0,-0.001181,0,-0.001177,0,-0.001172,0,-0.001168,0,-0.001164,0,-0.00116,0,-0.001155,0,-0.001151,0,-0.001147,0,-0.001143,0,-0.001139,0,-0.001135,0,-0.001131,0,-0.001127,0,-0.001123,0,-0.001119,0,-0.001115,0,-0.001111,0,-0.001107,0,-0.001103,0,-0.0011,0,-0.001096,0,-0.001092,0,-0.001088,0,-0.001085,0,-0.001081,0,-0.001077,0,-0.001074,0,-0.00107,0,-0.001066,0,-0.001063,0,-0.001059,0,-0.001056,0,-0.001052,0,-0.001049,0,-0.001045,0,-0.001042,0,-0.001039,0,-0.001035,0,-0.001032,0,-0.001028,0,-0.001025,0,-0.001022,0,-0.001019,0,-0.001015,0,-0.001012,0,-0.001009,0,-0.001006,0,-0.001003,0,-0.000999,0,-0.000996,0,-0.000993,0,-0.00099,0,-0.000987,0,-0.000984,0,-0.000981,0,-0.000978,0,-0.000975,0,-0.000972,0,-0.000969,0,-0.000966,0,-0.000963,0,-0.00096,0,-0.000957,0,-0.000954,0,-0.000952,0,-0.000949,0,-0.000946,0,-0.000943,0,-0.00094,0,-0.000938,0,-0.000935,0,-0.000932,0,-0.000929,0,-0.000927,0,-0.000924,0,-0.000921,0,-0.000919,0,-0.000916,0,-0.000913,0,-0.000911,0,-0.000908,0,-0.000906,0,-0.000903,0,-0.0009,0,-0.000898,0,-0.000895,0,-0.000893,0,-0.00089,0,-0.000888,0,-0.000885,0,-0.000883,0,-0.000881,0,-0.000878,0,-0.000876,0,-0.000873,0,-0.000871,0,-0.000869,0,-0.000866,0,-0.000864,0,-0.000861,0,-0.000859,0,-0.000857,0,-0.000855,0,-0.000852,0,-0.00085,0,-0.000848,0,-0.000845,0,-0.000843,0,-0.000841,0,-0.000839,0,-0.000837,0,-0.000834,0,-0.000832,0,-0.00083,0,-0.000828,0,-0.000826,0,-0.000824,0,-0.000821,0,-0.000819,0,-0.000817,0,-0.000815,0,-0.000813,0,-0.000811,0,-0.000809,0,-0.000807,0,-0.000805,0,-0.000803,0,-0.000801,0,-0.000799,0,-0.000797,0,-0.000795,0,-0.000793,0,-0.000791,0,-0.000789,0,-0.000787,0,-0.000785,0,-0.000783,0,-0.000781,0,-0.000779,0,-0.000777,0,-0.000775,0,-0.000774,0,-0.000772,0,-0.00077,0,-0.000768,0,-0.000766,0,-0.000764,0,-0.000762,0,-0.000761,0,-0.000759,0,-0.000757,0,-0.000755,0,-0.000753,0,-0.000752,0,-0.00075,0,-0.000748,0,-0.000746,0,-0.000745,0,-0.000743,0,-0.000741,0,-0.000739,0,-0.000738,0,-0.000736,0,-0.000734,0,-0.000733,0,-0.000731,0,-0.000729,0,-0.000728,0,-0.000726,0,-0.000724,0,-0.000723,0,-0.000721,0,-0.000719,0,-0.000718,0,-0.000716,0,-0.000715,0,-0.000713,0,-0.000711,0,-0.00071,0,-0.000708,0,-0.000707,0,-0.000705,0,-0.000703,0,-0.000702,0,-0.0007,0,-0.000699,0,-0.000697,0,-0.000696,0,-0.000694,0,-0.000693,0,-0.000691,0,-0.00069,0,-0.000688,0,-0.000687,0,-0.000685,0,-0.000684,0,-0.000682,0,-0.000681,0,-0.000679,0,-0.000678,0,-0.000677,0,-0.000675,0,-0.000674,0,-0.000672,0,-0.000671,0,-0.000669,0,-0.000668,0,-0.000667,0,-0.000665,0,-0.000664,0,-0.000662,0,-0.000661,0,-0.00066,0,-0.000658,0,-0.000657,0,-0.000656,0,-0.000654,0,-0.000653,0,-0.000652,0,-0.00065,0,-0.000649,0,-0.000648,0,-0.000646,0,-0.000645,0,-0.000644,0,-0.000642,0,-0.000641,0,-0.00064,0,-0.000639,0,-0.000637,0,-0.000636,0,-0.000635,0,-0.000633,0,-0.000632,0,-0.000631,0,-0.00063,0,-0.000628,0,-0.000627,0,-0.000626,0,-0.000625,0,-0.000624,0,-0.000622,0,-0.000621,0,-0.00062,0,-0.000619,0,-0.000617,0,-0.000616,0,-0.000615,0,-0.000614,0,-0.000613,0,-0.000612,0,-0.00061,0,-0.000609,0,-0.000608,0,-0.000607,0,-0.000606,0,-0.000605,0,-0.000603,0,-0.000602,0,-0.000601,0,-0.0006,0,-0.000599,0,-0.000598,0,-0.000597,0,-0.000596,0,-0.000594,0,-0.000593,0,-0.000592,0,-0.000591,0,-0.00059,0,-0.000589,0,-0.000588,0,-0.000587,0,-0.000586,0,-0.000585,0,-0.000584,0,-0.000582,0,-0.000581,0,-0.00058,0,-0.000579,0,-0.000578,0,-0.000577,0,-0.000576,0,-0.000575,0,-0.000574,0,-0.000573,0,-0.000572,0,-0.000571,0,-0.00057,0,-0.000569,0,-0.000568,0,-0.000567,0,-0.000566,0,-0.000565,0,-0.000564,0,-0.000563,0,-0.000562,0,-0.000561,0,-0.00056,0,-0.000559,0,-0.000558,0,-0.000557,0,-0.000556,0,-0.000555,0,-0.000554,0,-0.000553,0,-0.000552,0,-0.000551,0,-0.00055,0,-0.000549,0,-0.000548,0,-0.000547,0,-0.000546,0,-0.000546,0,-0.000545,0,-0.000544,0,-0.000543,0,-0.000542,0,-0.000541,0,-0.00054,0,-0.000539,0,-0.000538,0,-0.000537,0,-0.000536,0,-0.000535,0,-0.000535,0,-0.000534,0,-0.000533,0,-0.000532,0,-0.000531,0,-0.00053,0,-0.000529,0,-0.000528,0,-0.000527,0,-0.000527,0,-0.000526,0,-0.000525,0,-0.000524,0,-0.000523,0,-0.000522,0,-0.000521,0,-0.000521,0,-0.00052,0,-0.000519,0,-0.000518,0,-0.000517,0,-0.000516,0,-0.000515,0,-0.000515,0,-0.000514,0,-0.000513,0,-0.000512,0,-0.000511,0,-0.000511,0,-0.00051,0,-0.000509,0,-0.000508,0,-0.000507,0,-0.000506,0,-0.000506,0,-0.000505,0,-0.000504,0,-0.000503,0,-0.000502,0,-0.000502,0,-0.000501,0,-0.0005,0,-0.000499,0,-0.000499,0,-0.000498,0,-0.000497,0,-0.000496,0,-0.000495,0,-0.000495,0,-0.000494,0,-0.000493,0,-0.000492,0,-0.000492,0,-0.000491,0,-0.00049,0,-0.000489,0,-0.000489,0,-0.000488,0,-0.000487,0,-0.000486,0,-0.000486,0,-0.000485,0,-0.000484,0,-0.000483,0,-0.000483,0,-0.000482,0,-0.000481,0,-0.00048,0,-0.00048,0,-0.000479,0,-0.000478,0,-0.000478,0,-0.000477,0,-0.000476,0,-0.000475,0,-0.000475,0,-0.000474,0,-0.000473,0,-0.000473,0,-0.000472,0,-0.000471,0,-0.000471,0,-0.00047,0,-0.000469,0,-0.000468,0,-0.000468,0,-0.000467,0,-0.000466,0,-0.000466,0,-0.000465,0,-0.000464,0,-0.000464,0,-0.000463,0,-0.000462,0,-0.000462,0,-0.000461,0,-0.00046,0,-0.00046,0,-0.000459,0,-0.000458,0,-0.000458,0,-0.000457,0,-0.000456,0,-0.000456,0,-0.000455,0,-0.000454,0,-0.000454,0,-0.000453,0,-0.000452,0,-0.000452,0,-0.000451,0,-0.000451,0,-0.00045,0,-0.000449,0,-0.000449,0,-0.000448,0,-0.000447,0,-0.000447,0,-0.000446,0,-0.000446,0,-0.000445,0,-0.000444,0,-0.000444,0,-0.000443,0,-0.000442,0,-0.000442,0,-0.000441,0,-0.000441,0,-0.00044,0,-0.000439,0,-0.000439,0,-0.000438,0,-0.000438,0,-0.000437,0,-0.000436,0,-0.000436,0,-0.000435,0,-0.000435,0,-0.000434,0,-0.000433,0,-0.000433,0,-0.000432,0,-0.000432,0,-0.000431,0,-0.00043,0,-0.00043,0,-0.000429,0,-0.000429,0,-0.000428,0,-0.000428,0,-0.000427,0,-0.000426,0,-0.000426,0,-0.000425,0,-0.000425,0,-0.000424,0,-0.000424,0,-0.000423,0,-0.000422,0,-0.000422,0,-0.000421,0,-0.000421,0,-0.00042,0,-0.00042,0,-0.000419,0,-0.000419,0,-0.000418,0,-0.000417,0,-0.000417,0,-0.000416,0,-0.000416,0,-0.000415,0,-0.000415,0,-0.000414,0,-0.000414,0,-0.000413,0,-0.000413,0,-0.000412,0,-0.000412,0,-0.000411,0,-0.00041,0,-0.00041,0,-0.000409,0,-0.000409,0,-0.000408,0,-0.000408,0,-0.000407,0,-0.000407,0,-0.000406,0,-0.000406,0,-0.000405,0,-0.000405,0,-0.000404,0,-0.000404,0,-0.000403,0,-0.000403,0,-0.000402,0,-0.000402,0,-0.000401,0,-0.000401,0,-0.0004,0,-0.0004,0,-0.000399,0,-0.000399,0,-0.000398,0,-0.000398,0,-0.000397,0,-0.000397,0,-0.000396,0,-0.000396,0,-0.000395,0,-0.000395,0,-0.000394,0,-0.000394,0,-0.000393,0,-0.000393,0,-0.000392,0,-0.000392,0,-0.000391,0,-0.000391,0,-0.00039,0,-0.00039,0,-0.000389,0,-0.000389,0,-0.000388,0,-0.000388,0,-0.000387,0,-0.000387,0,-0.000387,0,-0.000386,0,-0.000386,0,-0.000385,0,-0.000385,0,-0.000384,0,-0.000384,0,-0.000383,0,-0.000383,0,-0.000382,0,-0.000382,0,-0.000381,0,-0.000381,0,-0.000381,0,-0.00038,0,-0.00038,0,-0.000379,0,-0.000379,0,-0.000378,0,-0.000378,0,-0.000377,0,-0.000377,0,-0.000376,0,-0.000376,0,-0.000376,0,-0.000375,0,-0.000375,0,-0.000374,0,-0.000374,0,-0.000373,0,-0.000373,0,-0.000373,0,-0.000372,0,-0.000372,0,-0.000371,0,-0.000371,0,-0.00037,0,-0.00037,0,-0.000369,0,-0.000369,0,-0.000369,0,-0.000368,0,-0.000368,0,-0.000367,0,-0.000367,0,-0.000367,0,-0.000366,0,-0.000366,0,-0.000365,0,-0.000365,0,-0.000364,0,-0.000364,0,-0.000364,0,-0.000363,0,-0.000363,0,-0.000362,0,-0.000362,0,-0.000362,0,-0.000361,0,-0.000361,0,-0.00036,0,-0.00036,0,-0.000359,0,-0.000359,0,-0.000359,0,-0.000358,0,-0.000358,0,-0.000357,0,-0.000357,0,-0.000357,0,-0.000356,0,-0.000356,0,-0.000355,0,-0.000355,0,-0.000355,0,-0.000354,0,-0.000354,0,-0.000353,0,-0.000353,0,-0.000353,0,-0.000352,0,-0.000352,0,-0.000352,0,-0.000351,0,-0.000351,0,-0.00035,0,-0.00035,0,-0.00035,0,-0.000349,0,-0.000349,0,-0.000348,0,-0.000348,0,-0.000348,0,-0.000347,0,-0.000347,0,-0.000347,0,-0.000346,0,-0.000346,0,-0.000345,0,-0.000345,0,-0.000345,0,-0.000344,0,-0.000344,0,-0.000344,0,-0.000343,0,-0.000343,0,-0.000342,0,-0.000342,0,-0.000342,0,-0.000341,0,-0.000341,0,-0.000341,0,-0.00034,0,-0.00034,0,-0.00034,0,-0.000339,0,-0.000339,0,-0.000338,0,-0.000338,0,-0.000338,0,-0.000337,0,-0.000337,0,-0.000337,0,-0.000336,0,-0.000336,0,-0.000336,0,-0.000335,0,-0.000335,0,-0.000335,0,-0.000334,0,-0.000334,0,-0.000333,0,-0.000333,0,-0.000333,0,-0.000332,0,-0.000332,0,-0.000332,0,-0.000331,0,-0.000331,0,-0.000331,0,-0.00033,0,-0.00033,0,-0.00033,0,-0.000329,0,-0.000329,0,-0.000329,0,-0.000328,0,-0.000328,0,-0.000328,0,-0.000327,0,-0.000327,0,-0.000327,0,-0.000326,0,-0.000326,0,-0.000326,0,-0.000325,0,-0.000325,0,-0.000325,0,-0.000324,0,-0.000324,0,-0.000324,0,-0.000323,0,-0.000323,0,-0.000323,0,-0.000322,0,-0.000322,0,-0.000322,0,-0.000321,0,-0.000321,0,-0.000321,0,-0.00032,0,-0.00032,0,-0.00032,0,-0.000319,0,-0.000319,0,-0.000319,0,-0.000318,0,-0.000318,0,-0.000318,0,-0.000318,0,-0.000317,0,-0.000317,0,-0.000317,0,-0.000316,0,-0.000316,0,-0.000316,0,-0.000315,0,-0.000315,0,-0.000315,0,-0.000314,0,-0.000314,0,-0.000314,0,-0.000313,0,-0.000313,0,-0.000313,0,-0.000313,0,-0.000312,0,-0.000312,0,-0.000312,0,-0.000311,0,-0.000311]},
      dropped_Square:{"real":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,0.079577,0,0.106103,0,0.063662,0,0.045473,0,0.035368,0,0.028937,0,0.024485,0,0.021221,0,0.018724,0,0.016753,0,0.015158,0,0.01384,0,0.012732,0,0.011789,0,0.010976,0,0.010268,0,0.009646,0,0.009095,0,0.008603,0,0.008162,0,0.007764,0,0.007403,0,0.007074,0,0.006773,0,0.006496,0,0.006241,0,0.006006,0,0.005787,0,0.005584,0,0.005395,0,0.005218,0,0.005053,0,0.004897,0,0.004751,0,0.004613,0,0.004483,0,0.00436,0,0.004244,0,0.004134,0,0.004029,0,0.00393,0,0.003835,0,0.003745,0,0.003659,0,0.003577,0,0.003498,0,0.003423,0,0.003351,0,0.003282,0,0.003215,0,0.003152,0,0.00309,0,0.003032,0,0.002975,0,0.00292,0,0.002868,0,0.002817,0,0.002768,0,0.002721,0,0.002675,0,0.002631,0,0.002588,0,0.002546,0,0.002506,0,0.002468,0,0.00243,0,0.002393,0,0.002358,0,0.002323,0,0.00229,0,0.002258,0,0.002226,0,0.002195,0,0.002165,0,0.002136,0,0.002108,0,0.00208,0,0.002054,0,0.002027,0,0.002002,0,0.001977,0,0.001953,0,0.001929,0,0.001906,0,0.001883,0,0.001861,0,0.00184,0,0.001819,0,0.001798,0,0.001778,0,0.001759,0,0.001739,0,0.001721,0,0.001702,0,0.001684,0,0.001667,0,0.001649,0,0.001632,0,0.001616,0,0.0016,0,0.001584,0,0.001568,0,0.001553,0,0.001538,0,0.001523,0,0.001509,0,0.001494,0,0.001481,0,0.001467,0,0.001453,0,0.00144,0,0.001427,0,0.001415,0,0.001402,0,0.00139,0,0.001378,0,0.001366,0,0.001355,0,0.001343,0,0.001332,0,0.001321,0,0.00131,0,0.001299,0,0.001289,0,0.001278,0,0.001268,0,0.001258,0,0.001248,0,0.001239,0,0.001229,0,0.00122,0,0.00121,0,0.001201,0,0.001192,0,0.001183,0,0.001175,0,0.001166,0,0.001157,0,0.001149,0,0.001141,0,0.001133,0,0.001125,0,0.001117,0,0.001109,0,0.001101,0,0.001094,0,0.001086,0,0.001079,0,0.001072,0,0.001065,0,0.001058,0,0.001051,0,0.001044,0,0.001037,0,0.00103,0,0.001024,0,0.001017,0,0.001011,0,0.001004,0,0.000998,0,0.000992,0,0.000985,0,0.000979,0,0.000973,0,0.000968,0,0.000962,0,0.000956,0,0.00095,0,0.000945,0,0.000939,0,0.000933,0,0.000928,0,0.000923,0,0.000917,0,0.000912,0,0.000907,0,0.000902,0,0.000897,0,0.000892,0,0.000887,0,0.000882,0,0.000877,0,0.000872,0,0.000867,0,0.000863,0,0.000858,0,0.000853,0,0.000849,0,0.000844,0,0.00084,0,0.000835,0,0.000831,0,0.000827,0,0.000823,0,0.000818,0,0.000814,0,0.00081,0,0.000806,0,0.000802,0,0.000798,0,0.000794,0,0.00079,0,0.000786,0,0.000782,0,0.000778,0,0.000774,0,0.000771,0,0.000767,0,0.000763,0,0.00076,0,0.000756,0,0.000753,0,0.000749,0,0.000745,0,0.000742,0,0.000739,0,0.000735,0,0.000732,0,0.000728,0,0.000725,0,0.000722,0,0.000719,0,0.000715,0,0.000712,0,0.000709,0,0.000706,0,0.000703,0,0.0007,0,0.000697,0,0.000693,0,0.00069,0,0.000687,0,0.000685,0,0.000682,0,0.000679,0,0.000676,0,0.000673,0,0.00067,0,0.000667,0,0.000665,0,0.000662,0,0.000659,0,0.000656,0,0.000654,0,0.000651,0,0.000648,0,0.000646,0,0.000643,0,0.00064,0,0.000638,0,0.000635,0,0.000633,0,0.00063,0,0.000628,0,0.000625,0,0.000623,0,0.00062,0,0.000618,0,0.000616,0,0.000613,0,0.000611,0,0.000609,0,0.000606,0,0.000604,0,0.000602,0,0.000599,0,0.000597,0,0.000595,0,0.000593,0,0.000591,0,0.000588,0,0.000586,0,0.000584,0,0.000582,0,0.00058,0,0.000578,0,0.000576,0,0.000574,0,0.000571,0,0.000569,0,0.000567,0,0.000565,0,0.000563,0,0.000561,0,0.000559,0,0.000557,0,0.000556,0,0.000554,0,0.000552,0,0.00055,0,0.000548,0,0.000546,0,0.000544,0,0.000542,0,0.00054,0,0.000539,0,0.000537,0,0.000535,0,0.000533,0,0.000531,0,0.00053,0,0.000528,0,0.000526,0,0.000524,0,0.000523,0,0.000521,0,0.000519,0,0.000518,0,0.000516,0,0.000514,0,0.000513,0,0.000511,0,0.000509,0,0.000508,0,0.000506,0,0.000504,0,0.000503,0,0.000501,0,0.0005,0,0.000498,0,0.000497,0,0.000495,0,0.000494,0,0.000492,0,0.00049,0,0.000489,0,0.000487,0,0.000486,0,0.000484,0,0.000483,0,0.000482,0,0.00048,0,0.000479,0,0.000477,0,0.000476,0,0.000474,0,0.000473,0,0.000472,0,0.00047,0,0.000469,0,0.000467,0,0.000466,0,0.000465,0,0.000463,0,0.000462,0,0.000461,0,0.000459,0,0.000458,0,0.000457,0,0.000455,0,0.000454,0,0.000453,0,0.000452,0,0.00045,0,0.000449,0,0.000448,0,0.000446,0,0.000445,0,0.000444,0,0.000443,0,0.000441,0,0.00044,0,0.000439,0,0.000438,0,0.000437,0,0.000435,0,0.000434,0,0.000433,0,0.000432,0,0.000431,0,0.00043,0,0.000428,0,0.000427,0,0.000426,0,0.000425,0,0.000424,0,0.000423,0,0.000422,0,0.00042,0,0.000419,0,0.000418,0,0.000417,0,0.000416,0,0.000415,0,0.000414,0,0.000413,0,0.000412,0,0.000411,0,0.00041,0,0.000409,0,0.000408,0,0.000407,0,0.000405,0,0.000404,0,0.000403,0,0.000402,0,0.000401,0,0.0004,0,0.000399,0,0.000398,0,0.000397,0,0.000396,0,0.000395,0,0.000394,0,0.000393,0,0.000392,0,0.000392,0,0.000391,0,0.00039,0,0.000389,0,0.000388,0,0.000387,0,0.000386,0,0.000385,0,0.000384,0,0.000383,0,0.000382,0,0.000381,0,0.00038,0,0.000379,0,0.000378,0,0.000378,0,0.000377,0,0.000376,0,0.000375,0,0.000374,0,0.000373,0,0.000372,0,0.000371,0,0.000371,0,0.00037,0,0.000369,0,0.000368,0,0.000367,0,0.000366,0,0.000365,0,0.000365,0,0.000364,0,0.000363,0,0.000362,0,0.000361,0,0.00036,0,0.00036,0,0.000359,0,0.000358,0,0.000357,0,0.000356,0,0.000356,0,0.000355,0,0.000354,0,0.000353,0,0.000353,0,0.000352,0,0.000351,0,0.00035,0,0.000349,0,0.000349,0,0.000348,0,0.000347,0,0.000346,0,0.000346,0,0.000345,0,0.000344,0,0.000343,0,0.000343,0,0.000342,0,0.000341,0,0.00034,0,0.00034,0,0.000339,0,0.000338,0,0.000338,0,0.000337,0,0.000336,0,0.000335,0,0.000335,0,0.000334,0,0.000333,0,0.000333,0,0.000332,0,0.000331,0,0.000331,0,0.00033,0,0.000329,0,0.000328,0,0.000328,0,0.000327,0,0.000326,0,0.000326,0,0.000325,0,0.000324,0,0.000324,0,0.000323,0,0.000323,0,0.000322,0,0.000321,0,0.000321,0,0.00032,0,0.000319,0,0.000319,0,0.000318,0,0.000317,0,0.000317,0,0.000316,0,0.000315,0,0.000315,0,0.000314,0,0.000314,0,0.000313,0,0.000312,0,0.000312,0,0.000311,0,0.000311,0,0.00031,0,0.000309,0,0.000309,0,0.000308,0,0.000308,0,0.000307,0,0.000306,0,0.000306,0,0.000305,0,0.000305,0,0.000304,0,0.000303,0,0.000303,0,0.000302,0,0.000302,0,0.000301,0,0.000301,0,0.0003,0,0.000299,0,0.000299,0,0.000298,0,0.000298,0,0.000297,0,0.000297,0,0.000296,0,0.000296,0,0.000295,0,0.000294,0,0.000294,0,0.000293,0,0.000293,0,0.000292,0,0.000292,0,0.000291,0,0.000291,0,0.00029,0,0.00029,0,0.000289,0,0.000289,0,0.000288,0,0.000288,0,0.000287,0,0.000287,0,0.000286,0,0.000285,0,0.000285,0,0.000284,0,0.000284,0,0.000283,0,0.000283,0,0.000282,0,0.000282,0,0.000281,0,0.000281,0,0.00028,0,0.00028,0,0.000279,0,0.000279,0,0.000278,0,0.000278,0,0.000278,0,0.000277,0,0.000277,0,0.000276,0,0.000276,0,0.000275,0,0.000275,0,0.000274,0,0.000274,0,0.000273,0,0.000273,0,0.000272,0,0.000272,0,0.000271,0,0.000271,0,0.00027,0,0.00027,0,0.00027,0,0.000269,0,0.000269,0,0.000268,0,0.000268,0,0.000267,0,0.000267,0,0.000266,0,0.000266,0,0.000265,0,0.000265,0,0.000265,0,0.000264,0,0.000264,0,0.000263,0,0.000263,0,0.000262,0,0.000262,0,0.000262,0,0.000261,0,0.000261,0,0.00026,0,0.00026,0,0.000259,0,0.000259,0,0.000259,0,0.000258,0,0.000258,0,0.000257,0,0.000257,0,0.000256,0,0.000256,0,0.000256,0,0.000255,0,0.000255,0,0.000254,0,0.000254,0,0.000254,0,0.000253,0,0.000253,0,0.000252,0,0.000252,0,0.000252,0,0.000251,0,0.000251,0,0.00025,0,0.00025,0,0.00025,0,0.000249,0,0.000249,0,0.000248,0,0.000248,0,0.000248,0,0.000247,0,0.000247,0,0.000247,0,0.000246,0,0.000246,0,0.000245,0,0.000245,0,0.000245,0,0.000244,0,0.000244,0,0.000244,0,0.000243,0,0.000243,0,0.000242,0,0.000242,0,0.000242,0,0.000241,0,0.000241,0,0.000241,0,0.00024,0,0.00024,0,0.00024,0,0.000239,0,0.000239,0,0.000238,0,0.000238,0,0.000238,0,0.000237,0,0.000237,0,0.000237,0,0.000236,0,0.000236,0,0.000236,0,0.000235,0,0.000235,0,0.000235,0,0.000234,0,0.000234,0,0.000234,0,0.000233,0,0.000233,0,0.000233,0,0.000232,0,0.000232,0,0.000231,0,0.000231,0,0.000231,0,0.00023,0,0.00023,0,0.00023,0,0.000229,0,0.000229,0,0.000229,0,0.000229,0,0.000228,0,0.000228,0,0.000228,0,0.000227,0,0.000227,0,0.000227,0,0.000226,0,0.000226,0,0.000226,0,0.000225,0,0.000225,0,0.000225,0,0.000224,0,0.000224,0,0.000224,0,0.000223,0,0.000223,0,0.000223,0,0.000222,0,0.000222,0,0.000222,0,0.000222,0,0.000221,0,0.000221,0,0.000221,0,0.00022,0,0.00022,0,0.00022,0,0.000219,0,0.000219,0,0.000219,0,0.000218,0,0.000218,0,0.000218,0,0.000218,0,0.000217,0,0.000217,0,0.000217,0,0.000216,0,0.000216,0,0.000216,0,0.000216,0,0.000215,0,0.000215,0,0.000215,0,0.000214,0,0.000214,0,0.000214,0,0.000213,0,0.000213,0,0.000213,0,0.000213,0,0.000212,0,0.000212,0,0.000212,0,0.000212,0,0.000211,0,0.000211,0,0.000211,0,0.00021,0,0.00021,0,0.00021,0,0.00021,0,0.000209,0,0.000209,0,0.000209,0,0.000208,0,0.000208,0,0.000208,0,0.000208,0,0.000207,0,0.000207,0,0.000207,0,0.000207,0,0.000206,0,0.000206,0,0.000206,0,0.000205,0,0.000205,0,0.000205,0,0.000205,0,0.000204,0,0.000204,0,0.000204,0,0.000204,0,0.000203,0,0.000203,0,0.000203,0,0.000203,0,0.000202,0,0.000202,0,0.000202,0,0.000202,0,0.000201,0,0.000201,0,0.000201,0,0.000201,0,0.0002,0,0.0002,0,0.0002,0,0.0002,0,0.000199,0,0.000199,0,0.000199,0,0.000199,0,0.000198,0,0.000198,0,0.000198,0,0.000198,0,0.000197,0,0.000197,0,0.000197,0,0.000197,0,0.000196,0,0.000196,0,0.000196,0,0.000196,0,0.000195,0,0.000195,0,0.000195,0,0.000195,0,0.000194,0,0.000194,0,0.000194,0,0.000194,0,0.000194,0,0.000193,0,0.000193,0,0.000193,0,0.000193,0,0.000192,0,0.000192,0,0.000192,0,0.000192,0,0.000191,0,0.000191,0,0.000191,0,0.000191,0,0.00019,0,0.00019,0,0.00019,0,0.00019,0,0.00019,0,0.000189,0,0.000189,0,0.000189,0,0.000189,0,0.000188,0,0.000188,0,0.000188,0,0.000188,0,0.000188,0,0.000187,0,0.000187,0,0.000187,0,0.000187,0,0.000186,0,0.000186,0,0.000186,0,0.000186,0,0.000186,0,0.000185,0,0.000185,0,0.000185,0,0.000185,0,0.000185,0,0.000184,0,0.000184,0,0.000184,0,0.000184,0,0.000183,0,0.000183,0,0.000183,0,0.000183,0,0.000183,0,0.000182,0,0.000182,0,0.000182,0,0.000182,0,0.000182,0,0.000181,0,0.000181,0,0.000181,0,0.000181,0,0.000181,0,0.00018,0,0.00018,0,0.00018,0,0.00018,0,0.00018,0,0.000179,0,0.000179,0,0.000179,0,0.000179,0,0.000179,0,0.000178,0,0.000178,0,0.000178,0,0.000178,0,0.000178,0,0.000177,0,0.000177,0,0.000177,0,0.000177,0,0.000177,0,0.000176,0,0.000176,0,0.000176,0,0.000176,0,0.000176,0,0.000175,0,0.000175,0,0.000175,0,0.000175,0,0.000175,0,0.000174,0,0.000174,0,0.000174,0,0.000174,0,0.000174,0,0.000173,0,0.000173,0,0.000173,0,0.000173,0,0.000173,0,0.000173,0,0.000172,0,0.000172,0,0.000172,0,0.000172,0,0.000172,0,0.000171,0,0.000171,0,0.000171,0,0.000171,0,0.000171,0,0.00017,0,0.00017,0,0.00017,0,0.00017,0,0.00017,0,0.00017,0,0.000169,0,0.000169,0,0.000169,0,0.000169,0,0.000169,0,0.000169,0,0.000168,0,0.000168,0,0.000168,0,0.000168,0,0.000168,0,0.000167,0,0.000167,0,0.000167,0,0.000167,0,0.000167,0,0.000167,0,0.000166,0,0.000166,0,0.000166,0,0.000166,0,0.000166,0,0.000166,0,0.000165,0,0.000165,0,0.000165,0,0.000165,0,0.000165,0,0.000165,0,0.000164,0,0.000164,0,0.000164,0,0.000164,0,0.000164,0,0.000163,0,0.000163,0,0.000163,0,0.000163,0,0.000163,0,0.000163,0,0.000162,0,0.000162,0,0.000162,0,0.000162,0,0.000162,0,0.000162,0,0.000161,0,0.000161,0,0.000161,0,0.000161,0,0.000161,0,0.000161,0,0.000161,0,0.00016,0,0.00016,0,0.00016,0,0.00016,0,0.00016,0,0.00016,0,0.000159,0,0.000159,0,0.000159,0,0.000159,0,0.000159,0,0.000159,0,0.000158,0,0.000158,0,0.000158,0,0.000158,0,0.000158,0,0.000158,0,0.000158,0,0.000157,0,0.000157,0,0.000157,0,0.000157,0,0.000157,0,0.000157,0,0.000156,0,0.000156,0,0.000156,0,0.000156,0,0.000156,0,0.000156,0,0.000156]},
      bass_Amp360:{"real":[0,0.498544,-0.052193,-0.019862,-0.002256,0.001649,-0.000894,0.000596,0.00024,-0.000181,0.000325,-0.000088,0.000022,0.000033,-0.000049,0.000039,-0.000038,0.000036,0.000001,0.000004,-0.000007,0.000006,-0.000014,0.000022,-0.000013,-0.000012,0.000006,0.000004,-0.000005,0.000002,-0.000002,-0.000006,0.000001,0.000016,-0.000019,0.000003,0.000004,0.000007,-0.000007,-0.000004,0,0.000001,0.00001,-0.000007,0.000002,0.000001,-0.000001,-0.000006,0.000013,-0.000003,0.000009,-0.000013,0.000001,0.000002,0.000011,-0.000006,0.000001,0.000003,-0.000009,-0.000009,-0.000006,-0.000006,-0.000004,-0.000001,-0.000007,0.000004,0.000009,-0.000001,0.000006,0.000012,0.000003,0.000004,0.000006,-0.000004,-0.000001,0.000001,-0.000008,0.000002,-0.000007,-0.000011,0.000003,0.000003,-0.000009,-0.000004,-0.000004,-0.000006,0.000002,-0.000004,0.000009,0.000005,0.000002,0.000003,-0.000001,0,0.000001,0,-0.000009,0.000006,-0.000006,0,-0.000008,0.000001,-0.000001,-0.000004,0.000003,0,-0.000002,0.000002,0,0.000001,0.000006,-0.000004,-0.000005,0.000005,-0.000002,-0.000004,-0.000015,-0.000009,-0.000005,-0.000003,-0.000007,0.000002,0.000001,0.000002,0.000001,-0.000004,-0.000003,-0.000004,0.000003,0.000004,-0.000007,-0.000002,0.000002,-0.000002,-0.000001,-0.000005,-0.000005,-0.000006,0.000004,-0.000006,-0.000008,-0.000003,0.000002,-0.000002,0.000001,-0.000004,-0.000011,-0.000001,-0.000011,0.000003,-0.000007,0,-0.000011,-0.000007,0.000005,-0.000005,-0.000007,0.000004,-0.000004,-0.000003,-0.000001,-0.000002,-0.000002,-0.000005,0.000001,-0.000001,-0.000004,-0.000003,-0.000005,-0.000009,-0.000008,0.000005,0.000001,0.000004,-0.000007,-0.000001,0.000003,-0.000008,-0.000005,-0.000002,-0.000005,0.000002,-0.000011,-0.000001,-0.000007,-0.000011,-0.00001,-0.000012,-0.000005,-0.000006,-0.000007,0.000001,-0.000001,0,0.000004,-0.000006,-0.000001,-0.000001,-0.000009,-0.000006,-0.000008,0.000002,-0.000015,-0.000002,-0.00001,-0.000002,-0.000006,0.000002,-0.000006,-0.000006,0.000005,-0.000004,-0.000001,-0.000006,-0.000008,-0.000003,-0.000012,-0.000004,-0.000003,0,-0.000006,-0.000006,-0.000012,-0.000007,-0.000013,-0.000012,-0.000011,-0.000012,-0.000013,-0.000007,-0.000014,-0.000006,-0.000004,-0.000009,-0.000009,-0.000003,-0.000001,-0.000001,0.000003,0.000002,0.000009,0.000007,0.000012,0.000011,0.000012,0.000012,0.000012,0.000011,0.000011,0.00001,0.000009,0.000009,0.000008,0.000007,0.000007,0.000006,0.000006,0.000005,0.000005,0.000005,0.000004,0.000004,0.000004,0.000004,0.000004,0.000004,0.000004,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000003,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000002,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0,0.000001,0.000001,0.000001,0,0,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,-0.038133,0.172877,-0.018249,0.007476,-0.00245,0.001892,-0.001804,0.00105,-0.000623,0.000246,-0.000137,-0.000017,0.000031,0.000002,-0.000037,0.000031,-0.00001,0.000033,-0.00002,0.000003,0.000005,0,-0.000014,0.000015,-0.000002,0.000011,-0.000006,-0.000014,-0.000008,0.000002,0.000001,-0.000001,0.000009,0.000002,-0.000006,0.000008,-0.000006,-0.000004,-0.000006,-0.000006,-0.000006,-0.000007,-0.000005,-0.000002,0.000008,-0.000005,-0.000003,0.00001,0.000007,0.000002,0.000003,-0.000004,0.00001,0,0.000003,-0.000002,0.000005,-0.000003,0.000001,0.000004,-0.000009,-0.000001,-0.000007,-0.000002,-0.000009,-0.000001,0.000001,0,0.00001,-0.000012,-0.000005,0.00001,-0.000005,0.000001,0.000005,0.000003,0.000005,0.000006,-0.000001,-0.000009,0.000002,0.000002,-0.000006,0.00001,-0.00001,-0.000004,-0.000001,0,0.000007,-0.000007,-0.000001,0,-0.000005,-0.000001,0,0.000006,-0.000008,0.000005,-0.000006,0.000001,-0.000005,-0.000002,-0.000001,0.000002,-0.000002,0.000001,-0.000002,-0.000001,0.000001,0.000004,0.000006,0.000007,0,0.000004,0.000001,-0.000001,-0.000003,0.000001,-0.000001,-0.000002,0.000006,0,-0.000001,0,0.000008,0.000001,-0.000003,-0.000004,0.000006,-0.000007,-0.000005,0,0,-0.000003,0.000007,0.000003,0.000002,0.000007,-0.000008,0.000001,0.000003,-0.000004,0.000002,0,0.00001,-0.000001,0.000001,0.000005,-0.000006,0.000001,0.000009,0,0.000007,0.000009,0.000003,0.000005,0.000001,0,0,0.000002,0.000005,0.000004,-0.000001,0.000002,0.000013,0.000006,0.000004,0.000007,0.000001,0.000004,-0.000005,0.000005,-0.000001,-0.000001,-0.000007,0.000007,-0.000002,-0.000006,0.000002,0,0.000007,-0.000002,0.00001,-0.000004,0.000004,0.000004,-0.000008,-0.000002,-0.000006,0.000005,0.000007,0.000001,0.000007,0.000007,0.000005,0.000007,0.000005,0.000003,0.000002,0.000005,0.000004,0.000001,0,0.000003,0.000008,0.000007,0.000004,-0.000004,0.000007,-0.000002,0.000001,0,0.000006,-0.000005,0.000008,-0.000007,-0.000001,-0.000003,-0.000004,0.000006,-0.000004,0.000006,0.000005,0.000005,0.000006,0.000001,0.000005,0.000007,0.000008,0.000011,0.000009,0.00002,0.000021,0.000013,0.000026,0.000018,0.00002,0.000015,0.000021,0.000018,0.000016,0.000015,0.000014,0.00001,0.000009,0.000007,0.000006,0.000004,0.000003,0.000002,0.000002,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0.000001,0,0.000001,0.000001,0.000001,0,0,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      bass_Sub_Dub:{"real":[0,-0.087481,-0.008727,0.015668,-0.000741,-0.002277,-0.0016,-0.00405,-0.001203,-0.003604,-0.001386,-0.00309,-0.001163,-0.002088,-0.001024,-0.001233,-0.000737,-0.000601,-0.000461,-0.00017,-0.000188,-0.000004,-0.000007,0.000086,0.000105,0.00005,0.000133,0.000031,0.000092,-0.000011,0.00004,-0.000004,-0.000029,-0.000005,-0.000058,0.000015,-0.000067,0.000019,-0.000047,0.000027,-0.000011,0.000016,0.000018,0.000004,0.000032,0.000002,0.000031,-0.000006,0.000013,-0.000011,-0.000003,-0.000012,-0.000019,-0.000015,-0.000031,-0.00001,-0.00002,-0.000009,-0.000014,-0.00001,0.000004,0.000001,0.000013,0.000001,0.000017,0.000008,0.000019,0.000009,0.000012,0.000008,0.000005,0.000005,0.000001,0.000008,-0.000007,-0.000004,0,-0.000006,-0.000001,-0.000002,0.000002,-0.000002,0.000005,0.000004,0.000004,0.000009,0.000002,0.000008,0.000003,0.000009,0.000004,0.000006,-0.000001,0.000001,0.000002,-0.000002,0,-0.000005,0.000001,-0.000002,0,-0.000004,0.000002,0,0.000002,0.000004,0.000003,0.000006,0.000005,0.000007,0.000003,0.000005,0.000002,-0.000002,0.000001,-0.000002,0,-0.000001,-0.000004,-0.000003,0.000004,0,0.000001,-0.000001,0,0.000005,0,0.000003,0.000001,0.000002,0.000005,0.000001,-0.000002,0.000001,0.000003,0,-0.000002,0,-0.000002,0,0,0.000003,0.000001,0.000003,0.000001,0.000003,0.000005,0.000001,0.000003,0.000003,0.000002,0.000001,0.000003,0.000001,0,0.000002,0.000001,0.000002,0,0.000004,-0.000001,-0.000002,0.000002,-0.000001,0,0.000003,0.000002,0.000002,0.000001,0.000001,0.000002,-0.000001,0.000002,0.000002,0.000003,0.000002,0.000002,0.000002,-0.000003,0.000002,-0.000001,-0.000001,0.000001,0.000002,0.000001,0.000001,-0.000001,0.000002,0.000003,0.000002,0,0.000003,0.000001,0,0,0.000002,0.000001,0.000003,0.000001,-0.000001,0.000004,0,0.000001,-0.000001,0.000001,-0.000002,-0.000001,0.000002,-0.000001,0.000002,0.000001,0,0,0.000001,0,0.000001,-0.000001,0.000001,0,-0.000001,0,-0.000001,0.000003,-0.000001,0.000002,0.000001,0,0,-0.000002,-0.000001,0.000001,0,-0.000001,0,0.000002,0.000002,0.000002,0.000001,-0.000001,-0.000002,0.000002,-0.000001,0.000005,0.000003,0.000002,0.000002,0,-0.000001,-0.000001,0,0.000003,-0.000002,0.000003,0.000001,0.000002,0,0,0.000005,0,0.000001,0,0.000001,0.000001,0,-0.000002,0.000003,0,0.000001,0.000001,-0.000001,0.000001,0.000004,0,0,0.000002,0.000002,0.000002,0,0,-0.000002,0.000001,0,0.000002,0.000002,0.000002,0.000002,0.000005,0.000002,-0.000002,0.000003,0,0.000001,0.000002,0.000002,-0.000002,-0.000002,0.000002,0.000003,0,-0.000001,0.000004,-0.000001,0.000002,-0.000003,0,0.000003,-0.000001,0.000002,0.000003,0.000001,0,0.000005,0.000002,0,0,0.000001,0.000001,0.000001,0,0,0.000003,0.000001,0.000001,0.000003,0,0.000004,0.000004,0.000001,0.000001,-0.000001,0.000002,0.000002,0.000001,0.000001,0.000003,0,0.000003,0.000001,0.000001,0.000002,0.000005,0.000001,0.000004,0.000004,0.000002,0.000003,0.000004,0.000002,0.000003,-0.000001,0.000002,0,0.000001,0,0.000002,0,0,0,0.000001,0,-0.000001,-0.000001,0,-0.000001,-0.000002,-0.000001,-0.000002,-0.000001,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,0.492288,0.009944,0.032169,0.001931,0.019775,0.001332,0.00657,0.001131,0.004102,0.00065,0.000918,0.000445,0.000083,0.000082,-0.000726,-0.000113,-0.00063,-0.000292,-0.000559,-0.000277,-0.000299,-0.000256,-0.000153,-0.000139,-0.000007,-0.000037,0.000032,0.000048,0.000041,0.00009,0.000033,0.00009,0.000007,0.000059,0.000009,0.000029,0.000004,-0.000003,0.000013,-0.000016,0.000022,-0.000006,0.00003,0.000007,0.000024,0.00003,0.000031,0.000037,0.000023,0.000037,0.000021,0.000029,0.000019,0.000009,0.000007,-0.000006,0.000005,-0.000013,-0.000003,-0.000015,-0.000009,-0.000008,-0.000008,0,-0.000008,0.000008,-0.000003,0.000017,0.000005,0.00001,0.00001,0.000008,0.000012,0.000004,0.00001,-0.000004,0.000004,-0.000002,0.000006,-0.000003,-0.000001,-0.000002,-0.000003,0.000004,-0.000003,0.000004,0.000002,0.000006,0.000006,0.000008,0.000007,0.000004,0.000005,0.000004,0.000005,0,0.000002,-0.000001,-0.000001,-0.000001,-0.000002,0,-0.000002,0.000002,-0.000002,0,0,-0.000001,0.000001,0.000001,0.000004,0.000002,0,0.000005,0.000002,0.000002,0.000001,-0.000001,-0.000002,-0.000003,-0.000002,0,-0.000002,-0.000003,0,-0.000004,0.000002,-0.000003,-0.000001,0.000002,0.000001,-0.000002,0,0.000001,-0.000002,0.000003,-0.000002,0,0,-0.000001,-0.000005,-0.000002,-0.000003,-0.000002,-0.000002,-0.000001,0.000001,-0.000002,0.000001,-0.000001,-0.000002,0.000002,0.000001,0.000004,-0.000001,0.000002,-0.000003,-0.000001,-0.000001,0.000001,0.000001,-0.000003,0,-0.000002,0.000002,-0.000001,-0.000002,0,0,0.000001,-0.000002,-0.000002,0.000001,0.000002,0.000001,0,-0.000001,-0.000001,0,-0.000001,0.000001,-0.000002,0.000001,-0.000001,-0.000001,0.000001,-0.000003,0,-0.000001,0.000001,-0.000001,0.000001,0,0,-0.000001,0.000003,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0,0.000001,-0.000001,0,-0.000001,0.000001,0.000003,-0.000003,0,0.000001,0,0,0.000001,0,-0.000001,-0.000001,0,0.000001,-0.000002,-0.000001,-0.000002,-0.000002,0,-0.000001,0,-0.000001,0.000001,-0.000001,-0.000001,-0.000002,-0.000002,-0.000001,0.000001,0.000003,-0.000001,0.000003,0,-0.000003,-0.000002,-0.000002,0.000001,-0.000001,0.000002,0,-0.000003,-0.000001,-0.000001,0.000001,-0.000002,-0.000002,0,-0.000001,0,-0.000002,0.000001,-0.000002,0,-0.000002,0,-0.000001,-0.000001,0.000001,0.000002,-0.000004,0,-0.000001,0.000001,0.000002,-0.000002,0.000002,-0.000001,-0.000002,0.000001,0,0.000001,0,-0.000002,-0.000002,0,0.000001,0,0,-0.000001,0.000001,0,-0.000002,0.000001,0,-0.000003,0.000002,-0.000001,-0.000001,0.000001,0,-0.000001,0.000001,0.000001,-0.000001,0,0,-0.000002,-0.000003,-0.000002,-0.000001,0,0,-0.000001,0.000002,0.000001,0.000002,0.000002,0.000001,-0.000001,0,0.000002,0.000002,-0.000002,-0.000002,0.000001,-0.000001,0,0.000001,-0.000001,0.000002,0,-0.000001,0.000001,-0.000001,-0.000004,0.000002,0,0,-0.000002,0,-0.000001,0,-0.000002,-0.000002,-0.000002,-0.000001,-0.000002,-0.000001,0,0,-0.000002,-0.000001,-0.000002,-0.000003,-0.000003,-0.000003,-0.000003,-0.000004,-0.000004,-0.000002,-0.000003,-0.000003,-0.000002,-0.000002,-0.000001,-0.000002,-0.000002,-0.000002,-0.000001,-0.000002,-0.000002,-0.000002,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      brass:{"real":[0,-0.051411,-0.085181,-0.45332,-0.042603,0.04083,-0.204758,0.02603,-0.147721,-0.007584,-0.07638,-0.003137,-0.064948,0.003745,0.120424,-0.002757,0.016572,0.001757,0.005585,0.001412,-0.011589,-0.001676,-0.010206,-0.005745,0.002632,-0.001359,-0.001483,-0.003481,-0.005393,0.003601,0.004419,-0.002671,0.001664,0.001878,-0.003127,-0.003645,-0.002282,0.00249,0.000949,0.002633,0.000153,-0.000786,-0.000054,0.00141,0.001927,-0.001851,0.000077,0.001024,-0.000413,-0.001542,0.001697,0.00068,-0.001677,-0.000879,0.001588,-0.001163,-0.001416,0.001599,0.001367,-0.001552,-0.001309,0.001185,0.001161,0.001016,-0.001293,-0.000196,0.000959,-0.000821,0.001153,0.001188,0.001041,0.000318,-0.001352,0.001337,0.001352,-0.001001,-0.000867,-0.000503,0.00075,-0.00049,0.001242,-0.000144,0.000558,0.001006,0.000314,-0.001167,0.001112,0.000935,0.000987,0.000888,-0.001061,-0.000059,0.001039,0.001154,0.000665,0.001027,-0.001083,0.001052,0.000776,0.000295,-0.000945,0.000866,0.000894,0.000694,-0.000524,0.000199,0.001024,-0.000996,-0.000056,0.001027,0.000764,0.000793,-0.000985,0.000179,0.000968,0.000549,-0.000967,0.000655,-0.000677,-0.000977,0.000936,-0.000254,-0.000167,0.000703,0.000134,-0.000266,-0.000774,-0.000891,0.000514,0.000874,0.00071,0.000771,0.000837,-0.00025,0.00048,0.000178,-0.000902,0.00075,0.000911,0.000907,-0.000625,0.000592,0.000491,0.000866,0.000511,-0.000084,0.000799,0.000597,0.000879,0.000869,0.000822,0.000618,-0.00007,-0.000006,0.000857,0.000695,-0.000365,0.00055,0.000638,0.000077,-0.000568,0.00071,0.000839,0.000761,0.000202,0.000632,-0.00065,-0.000464,0.000665,0.000825,-0.000102,0.000763,0.0004,0.000587,-0.000623,0.00078,-0.000363,0.000494,0.000198,0.000797,0.000797,0.000726,0.00044,0.000572,0.00073,0.000789,0.000294,0.000721,0.000679,-0.000756,-0.000439,0.000544,0.000088,0.00082,0.000736,0.000641,0.000673,0.000458,0.000783,-0.000781,-0.000762,0.000649,0.000075,0.000591,-0.00016,0.000431,-0.000469,-0.00047,-0.000557,-0.00057,-0.000559,-0.000653,-0.000726,-0.00076,-0.00076,-0.000758,-0.000773,-0.000775,-0.00077,-0.000758,-0.000768,-0.000767,-0.00076,-0.000741,-0.00076,-0.00076,-0.00075,-0.000726,-0.000752,-0.000753,-0.000739,-0.000711,-0.000744,-0.000747,-0.00073,-0.000697,-0.000737,-0.00074,-0.00072,-0.000685,-0.00073,-0.000734,-0.000712,-0.000717,-0.00077,-0.000773,-0.000748,-0.000705,-0.000763,-0.000767,-0.00074,-0.000695,-0.000757,-0.00076,-0.000732,-0.000685,-0.000751,-0.000754,-0.000725,-0.000676,-0.000745,-0.000747,-0.000717,-0.000668,-0.000739,-0.000741,-0.000711,-0.00066,-0.000733,-0.000735,-0.000704,-0.000652,-0.000728,-0.000729,-0.000698,-0.000645,-0.000723,-0.000723,-0.000692,-0.000638,-0.000718,-0.000717,-0.000686,-0.000632,-0.000713,-0.000711,-0.000681,-0.000626,-0.000708,-0.000706,-0.000676,-0.00062,-0.000703,-0.0007,-0.00067,-0.000614,-0.000698,-0.000695,-0.000665,-0.000608,-0.000694,-0.000689,-0.000661,-0.000603,-0.000689,-0.000684,-0.000658,-0.000598,-0.000685,-0.000679,-0.00065,-0.000593,-0.00068,-0.000674,-0.000648,-0.00059,-0.000677,-0.000669,-0.000644,-0.000585,-0.000672,-0.000664,-0.00064,-0.000581,-0.000668,-0.000659,-0.000635,-0.000576,-0.000664,-0.000655,-0.000633,-0.000572,-0.00066,-0.00065,-0.00063,-0.000568,-0.000657,-0.000645,-0.000626,-0.000564,-0.000653,-0.000641,-0.000621,-0.00056,-0.000649,-0.000637,-0.000619,-0.000557,-0.000646,-0.000632,-0.000614,-0.000553,-0.000642,-0.000628,-0.000611,-0.00055,-0.000639,-0.000624,-0.000608,-0.000547,-0.000635,-0.00062,-0.000606,-0.000543,-0.000632,-0.000597,-0.000584,-0.000524,-0.000609,-0.000594,-0.000581,-0.000521,-0.000606,-0.00059,-0.000578,-0.000518,-0.000603,-0.000586,-0.000576,-0.000515,-0.0006,-0.000582,-0.000573,-0.000512,-0.000597,-0.000579,-0.000569,-0.000509,-0.000594,-0.000575,-0.000567,-0.000507,-0.000591,-0.000572,-0.000565,-0.000504,-0.000588,-0.000568,-0.000562,-0.000501,-0.000585,-0.000566,-0.00056,-0.000499,-0.000582,-0.000562,-0.000557,-0.000497,-0.00058,-0.000559,-0.000555,-0.000495,-0.000577,-0.000556,-0.000553,-0.000492,-0.000574,-0.000552,-0.000549,-0.000489,-0.000572,-0.000549,-0.000547,-0.000487,-0.000569,-0.000546,-0.000546,-0.000484,-0.000566,-0.000544,-0.000543,-0.000483,-0.000564,-0.000541,-0.00054,-0.000479,-0.000561,-0.000537,-0.000541,-0.000477,-0.000559,-0.000535,-0.000537,-0.000476,-0.000556,-0.000531,-0.000537,-0.000468,-0.000553,-0.000529,-0.000542,-0.000471,-0.000551,-0.000528,-0.000528,-0.000463,-0.000467,-0.00045,-0.000454,-0.00041,-0.000469,-0.000445,-0.000453,-0.000397,-0.000467,-0.000445,-0.000451,-0.000398,-0.000465,-0.000443,-0.000448,-0.000395,-0.000463,-0.00044,-0.000447,-0.000396,-0.000461,-0.000438,-0.000445,-0.000393,-0.000459,-0.000436,-0.000444,-0.000391,-0.000457,-0.000434,-0.000442,-0.000389,-0.000456,-0.000432,-0.00044,-0.000388,-0.000454,-0.00043,-0.000439,-0.000387,-0.000452,-0.000428,-0.000438,-0.000386,-0.00045,-0.000426,-0.000435,-0.000383,-0.000449,-0.000424,-0.000434,-0.000383,-0.000447,-0.000422,-0.00043,-0.00038,-0.000445,-0.000419,-0.000431,-0.00038,-0.000443,-0.000417,-0.000435,-0.000376,-0.000442,-0.000416,-0.000427,-0.000376,-0.00044,-0.000415,-0.000424,-0.000374,-0.000438,-0.000414,-0.000425,-0.000374,-0.000437,-0.000412,-0.000423,-0.000372,-0.000435,-0.00041,-0.000422,-0.000371,-0.000434,-0.000408,-0.000421,-0.000369,-0.000432,-0.000406,-0.00042,-0.000368,-0.00043,-0.000404,-0.000418,-0.000367,-0.000429,-0.000402,-0.000417,-0.000365,-0.000427,-0.000402,-0.000415,-0.000365,-0.000426,-0.000399,-0.000415,-0.000364,-0.000424,-0.000398,-0.000412,-0.000362,-0.000423,-0.000396,-0.000411,-0.000361,-0.000421,-0.000395,-0.00041,-0.000359,-0.00042,-0.000393,-0.000409,-0.000358,-0.000419,-0.000391,-0.000408,-0.000357,-0.000417,-0.00039,-0.000407,-0.000356,-0.000416,-0.000389,-0.000405,-0.000355,-0.000414,-0.000387,-0.000404,-0.000353,-0.000413,-0.000385,-0.000402,-0.000352,-0.000412,-0.000384,-0.000401,-0.000352,-0.00041,-0.000383,-0.000401,-0.00035,-0.000409,-0.000327,-0.000342,-0.000299,-0.00035,-0.000326,-0.000342,-0.000299,-0.000349,-0.000325,-0.00034,-0.000298,-0.000347,-0.000324,-0.000339,-0.000297,-0.000346,-0.000322,-0.00034,-0.000295,-0.000345,-0.000321,-0.000336,-0.000294,-0.000344,-0.00032,-0.000335,-0.000295,-0.000343,-0.00032,-0.000335,-0.000293,-0.000342,-0.000317,-0.000336,-0.000293,-0.000341,-0.000316,-0.000333,-0.000292,-0.00034,-0.000315,-0.000333,-0.000291,-0.000339,-0.000315,-0.000333,-0.00029,-0.000338,-0.000313,-0.000331,-0.000289,-0.000337,-0.000313,-0.00033,-0.000288,-0.000336,-0.000312,-0.000329,-0.000287,-0.000335,-0.000309,-0.000328,-0.000286,-0.000334,-0.000309,-0.000327,-0.000286,-0.000333,-0.000308,-0.000326,-0.000285,-0.000332,-0.000308,-0.000325,-0.000285,-0.000331,-0.000307,-0.000324,-0.000283,-0.00033,-0.000305,-0.000323,-0.000283,-0.000329,-0.000305,-0.000322,-0.000282,-0.000328,-0.000304,-0.000322,-0.000281,-0.000327,-0.000303,-0.000321,-0.00028,-0.000326,-0.000302,-0.00032,-0.00028,-0.000325,-0.000301,-0.00032,-0.000279,-0.000324,-0.000299,-0.000319,-0.000279,-0.000324,-0.000299,-0.000318,-0.000278,-0.000323,-0.000298,-0.000317,-0.000277,-0.000322,-0.000297,-0.000316,-0.000276,-0.000321,-0.000296,-0.000315,-0.000276,-0.00032,-0.000295,-0.000314,-0.000274,-0.000319,-0.000294,-0.000314,-0.000275,-0.000318,-0.000293,-0.000314,-0.000273,-0.000318,-0.000292,-0.000313,-0.000273,-0.000317,-0.000292,-0.000312,-0.000272,-0.000316,-0.000291,-0.000311,-0.000272,-0.000315,-0.00029,-0.000309,-0.000271,-0.000314,-0.000289,-0.000311,-0.00027,-0.000313,-0.000287,-0.00031,-0.00027,-0.000313,-0.000287,-0.000307,-0.000267,-0.000312,-0.000286,-0.000308,-0.000268,-0.000311,-0.000286,-0.000306,-0.000267,-0.00031,-0.000284,-0.000306,-0.000267,-0.000309,-0.000284,-0.000305,-0.000266,-0.000309,-0.000284,-0.000304,-0.000265,-0.000308,-0.000282,-0.000304,-0.000266,-0.000307,-0.000281,-0.000302,-0.000264,-0.000306,-0.000281,-0.000302,-0.000264,-0.000306,-0.00028,-0.000302,-0.000263,-0.000305,-0.000279,-0.0003,-0.000262,-0.000304,-0.000279,-0.0003,-0.000262,-0.000303,-0.000278,-0.000299,-0.000262,-0.000303,-0.000278,-0.000299,-0.000261,-0.000302,-0.000276,-0.000298,-0.000261,-0.000301,-0.000275,-0.000297,-0.00026,-0.0003,-0.000273,-0.000297,-0.000261,-0.0003,-0.000273,-0.000298,-0.000257,-0.000299,-0.000273,-0.000296,-0.000258,-0.000298,-0.000273,-0.000294,-0.000257,-0.000298,-0.000272,-0.000293,-0.000257,-0.000297,-0.000272,-0.000294,-0.000254,-0.000296,-0.00027,-0.000293,-0.000255,-0.000295,-0.000272,-0.000292,-0.000253,-0.000295,-0.000269,-0.000292,-0.000253,-0.000294,-0.000269,-0.000291,-0.000253,-0.000294,-0.000268,-0.00029,-0.000254,-0.000293,-0.000268,-0.00029,-0.000253,-0.000292,-0.000267,-0.000289,-0.00025,-0.000292,-0.000264,-0.000289,-0.000252,-0.000291,-0.000265,-0.000286,-0.000247,-0.00029,-0.000264,-0.000289,-0.000252,-0.00029,-0.000266,-0.000282,-0.000249,-0.000288,-0.000264,-0.000285,-0.000265,-0.000288,-0.000268,-0.000283,-0.00022,-0.000254,-0.000243,-0.000252,-0.000221,-0.000254,-0.000234,-0.000253,-0.000217,-0.000253,-0.00023,-0.000249,-0.000219,-0.000253,-0.000233,-0.000246,-0.000218,-0.000252,-0.00023,-0.000249,-0.000219,-0.000252,-0.000229,-0.00025,-0.000217,-0.000251,-0.00023,-0.000249,-0.000216,-0.000251,-0.000227,-0.000248,-0.000217,-0.00025,-0.000229,-0.000248,-0.000216,-0.00025,-0.000227,-0.000248,-0.000216,-0.000249,-0.000227,-0.000245,-0.000214,-0.000249,-0.000225,-0.000247,-0.000215,-0.000248,-0.000227,-0.000246,-0.000214,-0.000248,-0.000225,-0.000246,-0.000215,-0.000247,-0.000223,-0.000244,-0.000214,-0.000246,-0.000224,-0.000244,-0.000214,-0.000246,-0.000223,-0.000245,-0.000212,-0.000246,-0.000223,-0.000244,-0.000213,-0.000245,-0.000221,-0.000243,-0.000212,-0.000244,-0.000221,-0.000243,-0.000213,-0.000244,-0.000222,-0.000242,-0.000211,-0.000244,-0.000221,-0.000241,-0.000209,-0.000243,-0.000222,-0.000241,-0.00021,-0.000243,-0.00022,-0.00024,-0.000211,-0.000242,-0.00022,-0.00024,-0.000209,-0.000242,-0.000218,-0.000241,-0.00021,-0.000241,-0.000218,-0.000239,-0.000209,-0.000241,-0.000218,-0.000238,-0.000207,-0.00024,-0.000217,-0.000238,-0.000207,-0.00024,-0.000215,-0.000239,-0.000206,-0.000239,-0.000217,-0.000235,-0.000206,-0.000239,-0.000215,-0.000238,-0.000207,-0.000238,-0.000216,-0.000236,-0.000206,-0.000238,-0.000215,-0.000236,-0.000206,-0.000237,-0.000215,-0.000236,-0.000206,-0.000237,-0.000215,-0.000235,-0.000205,-0.000237,-0.000215,-0.000235,-0.000205,-0.000236,-0.000214,-0.000234,-0.000203,-0.000236,-0.000213,-0.000234,-0.000203,-0.000235,-0.000213,-0.000234,-0.000203,-0.000235,-0.000213,-0.000233,-0.000203,-0.000234,-0.000212,-0.000233,-0.000204,-0.000234,-0.000212,-0.000232,-0.000203,-0.000233,-0.000212,-0.000232,-0.000202,-0.000233,-0.00021,-0.000232,-0.000201,-0.000233,-0.000212,-0.000231,-0.000204,-0.000232,-0.00021,-0.00023,-0.000201,-0.000232,-0.000209,-0.000231,-0.000202,-0.000231,-0.000211,-0.00023,-0.000201,-0.000231,-0.000209,-0.00023,-0.000201,-0.000231,-0.000208,-0.000229,-0.0002,-0.00023,-0.000208,-0.000229,-0.0002,-0.00023,-0.000208,-0.000228,-0.0002,-0.000229,-0.000207,-0.000228,-0.0002,-0.000229,-0.000206,-0.000227,-0.0002,-0.000229,-0.000206,-0.000228,-0.000198,-0.000228,-0.000205,-0.000227,-0.000199,-0.000228,-0.000205,-0.000227,-0.000199,-0.000227,-0.000205,-0.000226,-0.000198,-0.000227,-0.000205,-0.000226,-0.000197,-0.000227,-0.000201,-0.000226,-0.000198,-0.000226,-0.000205,-0.000225,-0.000196,-0.000226,-0.000203,-0.000224,-0.000196,-0.000225,-0.000203,-0.000225,-0.000196,-0.000225,-0.000202,-0.000224,-0.000195,-0.000225,-0.000203,-0.000224,-0.000195,-0.000224,-0.000201,-0.000223,-0.000195,-0.000224,-0.000202,-0.000223,-0.000195,-0.000223,-0.00019,-0.000209,-0.000183,-0.00021,-0.000189,-0.000209,-0.000182,-0.000209,-0.000188,-0.000209,-0.000182,-0.000209,-0.000188,-0.000208,-0.000182,-0.000209,-0.000187,-0.000208,-0.000182,-0.000208,-0.000188,-0.000207,-0.000181,-0.000208,-0.000188,-0.000207,-0.000181,-0.000208,-0.000186,-0.000207,-0.00018,-0.000207,-0.000187,-0.000207,-0.000181,-0.000207,-0.000185,-0.000206,-0.000181,-0.000207,-0.000185,-0.000206,-0.000179,-0.000206,-0.000186,-0.000205,-0.00018,-0.000206,-0.000185,-0.000205,-0.000179,-0.000206,-0.000185,-0.000205,-0.000178,-0.000205,-0.000185,-0.000204,-0.000179,-0.000205,-0.000184,-0.000204,-0.000178,-0.000205,-0.000183,-0.000204,-0.000179,-0.000204,-0.000184,-0.000204,-0.000177,-0.000204,-0.000183,-0.000203,-0.000177,-0.000204,-0.000183,-0.000203,-0.000177,-0.000203,-0.000183,-0.000202,-0.000177,-0.000203,-0.000183,-0.000202,-0.000179,-0.000203,-0.000182,-0.000202,-0.000176,-0.000202,-0.000181,-0.000202,-0.000177,-0.000202,-0.000184,-0.000201,-0.000176,-0.000202,-0.00018,-0.000201,-0.000176,-0.000201,-0.000181,-0.0002,-0.000175,-0.000201,-0.000181,-0.000199,-0.000174,-0.000201,-0.000179,-0.0002,-0.000174,-0.000201,-0.000181,-0.0002,-0.000175,-0.0002,-0.000181,-0.000199,-0.000174,-0.0002,-0.000181,-0.000198,-0.000173,-0.0002,-0.000178,-0.000199,-0.000174,-0.000199,-0.000179,-0.000198,-0.000174,-0.000199,-0.000181,-0.000198,-0.000174,-0.000199,-0.000179,-0.000198,-0.000173,-0.000198,-0.000177,-0.000198,-0.000174,-0.000198,-0.000176,-0.000198,-0.000173,-0.000198,-0.000176,-0.000197,-0.000173,-0.000198,-0.000176,-0.000197,-0.000174,-0.000197,-0.000176,-0.000196,-0.000172,-0.000197,-0.000176,-0.000197,-0.000171,-0.000197,-0.000176,-0.000196,-0.000168,-0.000196,-0.000182,-0.000196,-0.000171,-0.000196,-0.000174,-0.000196,-0.000173,-0.000196,-0.000176,-0.000191,-0.000172,-0.000196,-0.000171,-0.000194,-0.000171,-0.000195,-0.000176,-0.000195,-0.000169,-0.000195,-0.000174,-0.000194,-0.000166,-0.000195,-0.000174,-0.000194,-0.000168,-0.000194,-0.00017,-0.000194,-0.000169,-0.000194,-0.000174,-0.000193,-0.000169,-0.000194,-0.000174,-0.000193,-0.000169,-0.000194,-0.000173,-0.000192,-0.000168,-0.000193,-0.000175,-0.000192,-0.000167,-0.000193,-0.000173,-0.000192,-0.000167,-0.000193,-0.000171,-0.000191,-0.000167,-0.000192,-0.000173,-0.000192,-0.000171,-0.000192,-0.000172,-0.000191,-0.000167,-0.000192,-0.000171,-0.000191,-0.000168,-0.000192,-0.000171,-0.000191,-0.000167,-0.000191,-0.000171,-0.000191,-0.000167,-0.000191,-0.000171,-0.000191,-0.000166,-0.000191,-0.00017,-0.00019,-0.000167,-0.000191,-0.000171,-0.00019,-0.000166,-0.00019,-0.00017,-0.00019,-0.000165,-0.00019,-0.00017,-0.00019,-0.000166,-0.00019,-0.00015,-0.000167,-0.000146,-0.000168,-0.000151,-0.000167,-0.000146,-0.000167,-0.00015,-0.000167,-0.000148,-0.000167,-0.00015,-0.000167,-0.000147,-0.000167,-0.000149,-0.000167,-0.000147,-0.000167,-0.000149,-0.000166,-0.000146,-0.000167,-0.000149,-0.000166,-0.000144,-0.000166,-0.000148,-0.000166,-0.000146,-0.000166,-0.000148,-0.000165,-0.000145,-0.000166,-0.000148,-0.000166,-0.000146,-0.000166,-0.000149,-0.000165,-0.000145,-0.000165,-0.000145,-0.000165,-0.000145,-0.000165,-0.000148,-0.000165,-0.000145,-0.000165,-0.000145,-0.000165,-0.000144,-0.000165,-0.000148,-0.000164,-0.000145,-0.000165,-0.000147,-0.000164,-0.000144,-0.000164,-0.000147,-0.000164,-0.000145,-0.000164,-0.000148,-0.000164,-0.000143,-0.000164,-0.000147,-0.000163,-0.000144,-0.000164,-0.000146,-0.000163,-0.000144,-0.000163,-0.000145,-0.000163,-0.000142,-0.000163,-0.000148,-0.000163,-0.000142,-0.000163,-0.000144,-0.000163,-0.00014,-0.000163,-0.000145,-0.000162,-0.000142,-0.000163,-0.000144,-0.000162,-0.000142,-0.000162,-0.000145,-0.000162,-0.000141,-0.000162,-0.000145,-0.000162,-0.000142,-0.000162,-0.000144,-0.000162,-0.000142,-0.000162,-0.000145,-0.000162,-0.000143,-0.000162,-0.000144,-0.000161,-0.000141,-0.000161,-0.000144,-0.000161,-0.000143,-0.000161,-0.000144,-0.000161,-0.000141,-0.000161,-0.000143,-0.000161,-0.000142,-0.000161,-0.000143,-0.000161,-0.00014,-0.000161,-0.000142,-0.00016,-0.000141,-0.00016,-0.000143,-0.00016,-0.000141,-0.00016,-0.000143,-0.00016,-0.00014,-0.00016,-0.000145,-0.000159,-0.000141,-0.00016,-0.000143,-0.000159,-0.000139,-0.00016,-0.000143,-0.000159,-0.000139,-0.000159,-0.000141,-0.000159,-0.000139,-0.000159,-0.000143,-0.000159,-0.000139,-0.000159,-0.000141,-0.000159,-0.00014,-0.000159,-0.00014,-0.000158,-0.000138,-0.000159,-0.000141,-0.000158,-0.000138,-0.000158,-0.000143,-0.000158,-0.000139,-0.000158,-0.000141,-0.000158,-0.000137,-0.000158,-0.000142,-0.000158,-0.000138,-0.000158,-0.000141,-0.000157,-0.000138,-0.000158,-0.00014,-0.000157,-0.000138,-0.000157,-0.000139,-0.000157,-0.000138,-0.000157,-0.000141,-0.000157,-0.000139,-0.000157,-0.000139,-0.000156,-0.000139,-0.000157,-0.000138,-0.000157,-0.000137,-0.000157,-0.000138,-0.000156,-0.000137,-0.000156,-0.000139,-0.000156,-0.000138,-0.000156,-0.000139,-0.000156,-0.000137,-0.000156,-0.000139,-0.000156,-0.000138,-0.000156,-0.000139,-0.000155,-0.000136,-0.000156,-0.000138,-0.000156,-0.000136,-0.000155,-0.000139,-0.000155,-0.000137,-0.000155,-0.000139,-0.000155,-0.000136,-0.000155,-0.000138,-0.000155,-0.000138,-0.000155,-0.000139,-0.000155,-0.000136,-0.000155,-0.000138,-0.000155,-0.000137,-0.000155,-0.000137,-0.000154,-0.000136,-0.000154,-0.000137,-0.000154,-0.000135,-0.000154,-0.000137,-0.000154,-0.000135,-0.000154,-0.000137,-0.000154,-0.000134,-0.000154,-0.000136,-0.000154,-0.000135,-0.000154,-0.000137,-0.000154,-0.000136,-0.000154,-0.000136,-0.000153,-0.000135,-0.000153,-0.000137,-0.000153,-0.000135,-0.000153,-0.000136,-0.000153,-0.000134,-0.000153,-0.000136,-0.000153,-0.000134,-0.000153,-0.000137,-0.000153,-0.000133,-0.000153,-0.000136,-0.000153,-0.000134,-0.000153,-0.000135,-0.000152,-0.000133,-0.000152,-0.000135,-0.000152,-0.000134,-0.000152,-0.000134,-0.000152,-0.000134,-0.000152,-0.000135,-0.000152,-0.000134,-0.000152,-0.000134,-0.000152,-0.000134,-0.000152,-0.000135,-0.000151,-0.000131,-0.000151,-0.000134,-0.000151,-0.000134,-0.000151,-0.000136,-0.000151,-0.000134,-0.000151,-0.000136,-0.000151,-0.000134,-0.000151,-0.000133,-0.000151,-0.000133,-0.000151,-0.000134,-0.000151,-0.000133,-0.000151,-0.000133,-0.00015,-0.000132,-0.00015,-0.000132,-0.00015,-0.000134,-0.00015,-0.000125,-0.000149,-0.000135,-0.00015,-0.000131,-0.00015,-0.000135,-0.00015,-0.000132,-0.00015,-0.000132,-0.00015,-0.000133,-0.00015,-0.000133,-0.00015,-0.000131,-0.000149,-0.000132,-0.000149,-0.000134,-0.000149,-0.000131,-0.000149,-0.000133,-0.000149,-0.000131,-0.000149,-0.000135,-0.000149,-0.000133,-0.000149,-0.000133,-0.000149,-0.00013,-0.000149,-0.000131,-0.000149,-0.000131,-0.000149,-0.000131,-0.000148,-0.00013,-0.000148,-0.000133,-0.000148,-0.00013,-0.000148,-0.000132,-0.000148,-0.000129,-0.000148,-0.000132,-0.000148,-0.00013,-0.000148,-0.000131,-0.000148,-0.00013,-0.000148,-0.000131,-0.000148,-0.000131,-0.000148,-0.000123,-0.000139,-0.000124,-0.000139,-0.000125,-0.000139,-0.000123,-0.000139,-0.000123,-0.000139,-0.000122,-0.000138,-0.00012,-0.000138,-0.000123,-0.000138,-0.000124,-0.000138,-0.000123,-0.000138,-0.000123,-0.000138,-0.000122,-0.000138,-0.000123,-0.000138,-0.000121,-0.000138,-0.000123,-0.000138,-0.000122,-0.000138,-0.000122,-0.000137,-0.000123,-0.000138,-0.000122,-0.000137,-0.000121,-0.000137,-0.000122,-0.000137,-0.000121,-0.000137,-0.000121,-0.000137,-0.000121,-0.000137,-0.000122,-0.000137,-0.000122,-0.000137,-0.000123,-0.000137,-0.000121,-0.000137,-0.000121,-0.000137,-0.000121,-0.000137,-0.000121,-0.000137,-0.00012,-0.000137,-0.000122,-0.000136,-0.000121,-0.000136,-0.000121,-0.000136,-0.00012,-0.000136,-0.00012,-0.000136,-0.00012,-0.000136,-0.000121,-0.000136,-0.000119,-0.000136,-0.00012,-0.000136,-0.00012,-0.000136,-0.000121,-0.000136,-0.00012,-0.000136,-0.000121,-0.000136,-0.00012,-0.000136,-0.000121,-0.000136,-0.000119,-0.000136,-0.00012,-0.000135,-0.00012,-0.000135,-0.00012,-0.000135,-0.00012,-0.000135,-0.000119,-0.000135,-0.000119,-0.000135,-0.000119,-0.000135,-0.00012,-0.000135,-0.00012,-0.000135,-0.00012,-0.000135,-0.000119,-0.000135,-0.00012,-0.000135,-0.000119,-0.000135,-0.000118,-0.000135,-0.00012,-0.000134,-0.000119,-0.000134,-0.00012,-0.000134,-0.000119,-0.000134,-0.000119,-0.000134,-0.000119,-0.000134,-0.000119,-0.000134,-0.000119,-0.000134,-0.000118,-0.000134,-0.000118,-0.000134,-0.000119,-0.000134,-0.000117,-0.000134,-0.000118,-0.000134,-0.000118,-0.000134,-0.000117,-0.000134,-0.000118,-0.000133,-0.000118,-0.000133,-0.000119,-0.000133,-0.000118,-0.000133,-0.000118,-0.000133,-0.000118,-0.000133,-0.000119,-0.000133,-0.000117,-0.000133,-0.000115,-0.000133,-0.000111,-0.000133,-0.000115],"imag":[0,0.123894,0.15737,0.210952,-0.07615,-0.145613,-0.004471,-0.011613,0.068694,0.033905,0.119128,-0.001508,-0.005879,0.004987,-0.012356,-0.002032,0.002838,0.00564,0.016947,0.003254,0.012119,0.001022,0.001041,-0.006764,0.006971,0.006519,0.00636,-0.005381,0.001966,0.003007,0.000692,-0.003329,-0.003718,0.003545,0.00201,-0.000368,-0.002096,0.001772,0.002863,0.000002,-0.002596,0.002207,0.002314,-0.001802,-0.0009,0.000999,0.002079,0.001643,-0.00187,0.001103,0.000801,0.00173,-0.000759,0.001411,-0.000436,0.001145,-0.000783,0.000123,-0.000812,0.000273,-0.000854,0.000925,-0.000936,-0.001076,0.000695,0.001443,0.001081,0.001177,-0.000836,-0.000766,-0.000941,0.001357,0.000295,0.000319,0.000193,-0.000853,-0.000977,0.001197,-0.00105,-0.001184,-0.000282,0.001258,0.001128,-0.000743,-0.001203,0.000408,-0.000523,-0.000786,-0.000708,-0.000819,-0.000563,-0.001193,0.000575,-0.000254,-0.000883,-0.000393,0.00015,0.000278,-0.000755,-0.001036,0.000505,0.000622,0.000572,-0.000796,-0.000911,0.001027,0.000188,0.000287,0.00103,-0.000007,-0.000679,-0.000637,-0.000238,0.000992,0.000265,-0.000835,0.000238,0.000743,0.000718,0.00011,-0.000285,0.000941,-0.000956,0.000664,-0.000953,0.000921,0.00056,-0.000334,0.000796,0.000358,-0.000616,-0.000532,0.000413,0.000896,0.000792,-0.000906,0.000177,-0.000526,0.000062,-0.000074,-0.000657,-0.000682,0.000754,0.000233,-0.000733,-0.000887,-0.000387,-0.000653,-0.000071,0.000132,-0.000301,-0.000616,-0.000867,-0.000867,-0.000111,-0.000509,-0.000777,-0.000656,0.000567,-0.000847,-0.00063,-0.000458,-0.000078,0.000355,0.000813,-0.000546,-0.00052,-0.000688,-0.000492,-0.000013,-0.000816,0.000302,0.000713,-0.000567,0.000523,0.000223,0.000722,-0.000637,-0.000779,-0.000085,0.000069,-0.000329,-0.000663,-0.00055,-0.000304,0.000003,-0.00073,0.00031,-0.000389,-0.000343,-0.000701,-0.000621,-0.000819,0.000044,-0.00036,0.000507,0.00046,0.000671,0.00021,-0.000212,-0.000265,-0.000476,-0.000799,-0.000541,-0.000783,-0.00067,-0.000642,-0.000639,-0.000562,-0.000546,-0.000555,-0.000437,-0.000294,-0.000183,-0.000175,-0.000178,-0.000076,0.00001,-0.000071,-0.000143,-0.000044,0.000041,-0.000093,-0.000185,-0.000064,0.000037,-0.00012,-0.000218,-0.000077,0.000038,-0.00014,-0.000242,-0.000086,0.00004,-0.000155,-0.00026,-0.000093,0.000043,-0.000168,-0.000275,-0.000097,0.000048,-0.000178,-0.000304,-0.000106,0.000056,-0.000197,-0.000314,-0.000108,0.000061,-0.000204,-0.000322,-0.000109,0.000067,-0.000211,-0.000329,-0.00011,0.000072,-0.000214,-0.000334,-0.00011,0.000077,-0.000218,-0.000338,-0.00011,0.000082,-0.000221,-0.000341,-0.000109,0.000087,-0.000224,-0.000344,-0.000108,0.000092,-0.000225,-0.000346,-0.000107,0.000096,-0.000226,-0.000348,-0.000106,0.000101,-0.000227,-0.000349,-0.000105,0.000105,-0.000228,-0.000349,-0.000103,0.000109,-0.000227,-0.00035,-0.000103,0.000113,-0.000228,-0.00035,-0.000101,0.000116,-0.000228,-0.000351,-0.000101,0.00012,-0.000227,-0.00035,-0.000098,0.000123,-0.00022,-0.00035,-0.000097,0.000126,-0.00023,-0.000349,-0.000097,0.00013,-0.000224,-0.000346,-0.000093,0.000131,-0.000222,-0.000347,-0.000092,0.000135,-0.00022,-0.000345,-0.000091,0.000137,-0.000221,-0.000345,-0.00009,0.00014,-0.000214,-0.000344,-0.00009,0.000143,-0.000211,-0.000343,-0.000086,0.000145,-0.000211,-0.000341,-0.000085,0.000146,-0.000213,-0.00034,-0.000084,0.000148,-0.000208,-0.000338,-0.000083,0.00015,-0.000209,-0.000337,-0.000081,0.000152,-0.000207,-0.000336,-0.00008,0.000154,-0.000206,-0.000334,-0.000079,0.000155,-0.000202,-0.000334,-0.000078,0.000153,-0.000194,-0.000322,-0.000074,0.000154,-0.000194,-0.00032,-0.000073,0.000155,-0.000191,-0.000319,-0.000072,0.000157,-0.000188,-0.000318,-0.00007,0.00016,-0.000185,-0.000316,-0.00007,0.000159,-0.000188,-0.000316,-0.000068,0.00016,-0.000184,-0.000313,-0.000068,0.00016,-0.000182,-0.000312,-0.000067,0.000163,-0.00018,-0.000311,-0.000065,0.000162,-0.000178,-0.00031,-0.000065,0.000164,-0.000176,-0.000307,-0.000063,0.000165,-0.000175,-0.000305,-0.000062,0.000166,-0.000173,-0.000304,-0.000061,0.000167,-0.000173,-0.000303,-0.000059,0.000168,-0.000171,-0.000302,-0.00006,0.000168,-0.000168,-0.000302,-0.00006,0.000168,-0.000167,-0.000297,-0.00006,0.000166,-0.000169,-0.000299,-0.000058,0.00017,-0.000157,-0.000297,-0.000057,0.000168,-0.00016,-0.000294,-0.000054,0.000172,-0.00015,-0.000303,-0.00006,0.000171,-0.00012,-0.000293,-0.00006,0.000166,-0.000164,-0.000301,-0.000074,0.000144,-0.000131,-0.000233,-0.000046,0.000154,-0.000127,-0.000251,-0.000044,0.000148,-0.000126,-0.000245,-0.000042,0.000148,-0.000128,-0.000246,-0.000043,0.00015,-0.000126,-0.000241,-0.000043,0.000149,-0.000125,-0.000242,-0.000043,0.000148,-0.000122,-0.000242,-0.000042,0.000149,-0.000123,-0.000241,-0.000041,0.00015,-0.000123,-0.000239,-0.000039,0.000149,-0.000119,-0.000238,-0.000039,0.000149,-0.000117,-0.000236,-0.00004,0.00015,-0.00012,-0.000237,-0.000038,0.000151,-0.000115,-0.000234,-0.000038,0.00015,-0.000123,-0.000235,-0.000039,0.000154,-0.000115,-0.000233,-0.000036,0.000153,-0.00009,-0.000235,-0.000039,0.000152,-0.000117,-0.000233,-0.000038,0.000151,-0.000119,-0.000232,-0.000039,0.000148,-0.000111,-0.00023,-0.000037,0.000149,-0.000111,-0.000229,-0.000037,0.00015,-0.00011,-0.000228,-0.000036,0.000149,-0.000107,-0.000227,-0.000034,0.00015,-0.000105,-0.000227,-0.000035,0.000152,-0.000105,-0.000225,-0.000033,0.000151,-0.000104,-0.000225,-0.000034,0.000148,-0.000104,-0.000223,-0.000033,0.000151,-0.000099,-0.000222,-0.000033,0.00015,-0.000104,-0.000222,-0.000032,0.000151,-0.0001,-0.000221,-0.000032,0.000149,-0.000101,-0.000221,-0.000032,0.000151,-0.000098,-0.00022,-0.000032,0.000151,-0.000098,-0.000219,-0.000032,0.000151,-0.000095,-0.000218,-0.000031,0.00015,-0.000096,-0.000216,-0.00003,0.000149,-0.000096,-0.000216,-0.00003,0.00015,-0.000096,-0.000216,-0.00003,0.00015,-0.000096,-0.000214,-0.00003,0.000149,-0.00009,-0.000214,-0.00003,0.000128,-0.00008,-0.000183,-0.000025,0.000128,-0.000076,-0.000182,-0.000025,0.000128,-0.000078,-0.000181,-0.000025,0.000128,-0.000075,-0.00018,-0.000024,0.000128,-0.000067,-0.000181,-0.000025,0.000127,-0.000079,-0.000181,-0.000025,0.000129,-0.000078,-0.000177,-0.000024,0.000125,-0.000076,-0.000178,-0.000023,0.000129,-0.000067,-0.000177,-0.000023,0.000129,-0.000074,-0.000176,-0.000023,0.000128,-0.000072,-0.000175,-0.000024,0.000126,-0.000066,-0.000176,-0.000021,0.000127,-0.00007,-0.000176,-0.000022,0.000126,-0.000069,-0.000175,-0.000021,0.000127,-0.00007,-0.000175,-0.000022,0.00013,-0.000068,-0.000174,-0.000022,0.000128,-0.000067,-0.000172,-0.00002,0.000126,-0.000068,-0.000172,-0.000021,0.000126,-0.000067,-0.000171,-0.000021,0.000125,-0.000068,-0.000171,-0.000021,0.000127,-0.000067,-0.00017,-0.00002,0.000125,-0.000069,-0.00017,-0.00002,0.000126,-0.000065,-0.00017,-0.000021,0.000126,-0.000066,-0.000169,-0.000019,0.000126,-0.000063,-0.000167,-0.000019,0.000124,-0.000061,-0.000168,-0.00002,0.000126,-0.000062,-0.000165,-0.000019,0.000125,-0.000062,-0.000166,-0.000019,0.000126,-0.000063,-0.000166,-0.000018,0.000125,-0.000059,-0.000166,-0.000019,0.000125,-0.00006,-0.000164,-0.000018,0.000125,-0.000061,-0.000165,-0.000019,0.000126,-0.00006,-0.000163,-0.000017,0.000126,-0.000056,-0.000164,-0.000017,0.000125,-0.000055,-0.000162,-0.000018,0.000124,-0.000055,-0.000161,-0.000017,0.000123,-0.000057,-0.00016,-0.000017,0.000124,-0.000059,-0.00016,-0.000017,0.000123,-0.000046,-0.000161,-0.000016,0.000127,-0.000049,-0.000159,-0.000016,0.000124,-0.000058,-0.000162,-0.000016,0.000124,-0.000051,-0.000159,-0.000016,0.000122,-0.000055,-0.000158,-0.000017,0.000125,-0.000053,-0.000157,-0.000016,0.000123,-0.000052,-0.000157,-0.000016,0.000122,-0.000055,-0.000157,-0.000017,0.000123,-0.00005,-0.000155,-0.000015,0.000125,-0.000053,-0.000157,-0.000016,0.000123,-0.000049,-0.000156,-0.000014,0.000123,-0.000049,-0.000155,-0.000016,0.000124,-0.000054,-0.000155,-0.000015,0.000121,-0.000049,-0.000155,-0.000015,0.000122,-0.00005,-0.000153,-0.000014,0.00012,-0.000048,-0.000154,-0.000014,0.000122,-0.000045,-0.000151,-0.000013,0.000123,-0.000048,-0.000152,-0.000015,0.000125,-0.000045,-0.000148,-0.000013,0.000124,-0.000035,-0.000154,-0.000015,0.000123,-0.000042,-0.00015,-0.000014,0.000121,-0.000049,-0.00015,-0.000013,0.000122,-0.000049,-0.00015,-0.000013,0.00012,-0.00004,-0.000153,-0.000014,0.000122,-0.000043,-0.000151,-0.000015,0.000116,-0.000048,-0.000152,-0.000014,0.00012,-0.000043,-0.00015,-0.000015,0.00012,-0.000045,-0.00015,-0.000012,0.00012,-0.000044,-0.000147,-0.000012,0.000119,-0.00004,-0.000148,-0.00001,0.00012,-0.000042,-0.000151,-0.000014,0.000124,-0.000038,-0.000146,-0.000011,0.000119,-0.000055,-0.000154,-0.000015,0.000121,-0.000025,-0.000144,-0.000014,0.000115,-0.000067,-0.000148,-0.000024,0.000118,-0.000045,-0.000116,-0.000014,0.000107,-0.000052,-0.000129,-0.000015,0.000076,-0.000038,-0.000126,-0.000005,0.0001,-0.000023,-0.000131,-0.000013,0.000106,-0.000046,-0.000126,-0.000013,0.000099,-0.000057,-0.000128,-0.000008,0.000105,-0.000042,-0.000125,-0.000007,0.000104,-0.000028,-0.000127,-0.00001,0.000102,-0.000033,-0.000129,-0.000008,0.000106,-0.000033,-0.000126,-0.000011,0.000102,-0.000031,-0.000125,-0.000012,0.000103,-0.000025,-0.000125,-0.000011,0.000103,-0.000042,-0.000128,-0.000011,0.000105,-0.000031,-0.000124,-0.000009,0.000101,-0.000031,-0.000125,-0.00001,0.000104,-0.000029,-0.000123,-0.000009,0.000107,-0.00004,-0.000123,-0.00001,0.000104,-0.000032,-0.000123,-0.00001,0.000103,-0.000026,-0.000124,-0.000008,0.000103,-0.000031,-0.000122,-0.00001,0.000105,-0.000034,-0.000122,-0.00001,0.000105,-0.00003,-0.00012,-0.00001,0.000102,-0.000033,-0.000122,-0.000009,0.000102,-0.000031,-0.000125,-0.000009,0.0001,-0.000034,-0.000122,-0.00001,0.000102,-0.000035,-0.00012,-0.000008,0.000102,-0.000027,-0.000122,-0.000009,0.000104,-0.000022,-0.000119,-0.00001,0.000102,-0.000031,-0.00012,-0.000007,0.000102,-0.000033,-0.000122,-0.00001,0.000104,-0.000032,-0.000122,-0.000009,0.000106,-0.000022,-0.000122,-0.000009,0.000101,-0.000047,-0.000121,-0.000011,0.000103,-0.000023,-0.000119,-0.000007,0.0001,-0.000034,-0.000119,-0.000009,0.000102,-0.000028,-0.000119,-0.000008,0.000101,-0.000029,-0.000118,-0.000008,0.000099,-0.000028,-0.000118,-0.000009,0.000099,-0.000028,-0.000117,-0.000008,0.000101,-0.000027,-0.000121,-0.000009,0.000101,-0.00003,-0.000119,-0.000007,0.000101,-0.000027,-0.000118,-0.000009,0.000099,-0.000025,-0.000118,-0.000008,0.0001,-0.000027,-0.000116,-0.000009,0.0001,-0.00003,-0.000116,-0.000009,0.000097,-0.000027,-0.000116,-0.000007,0.000101,-0.000024,-0.000117,-0.000008,0.000097,-0.000025,-0.000111,-0.000009,0.000098,-0.00003,-0.000115,-0.000009,0.0001,-0.000023,-0.000114,-0.000006,0.000096,-0.000024,-0.000114,-0.000007,0.000099,-0.000023,-0.000114,-0.000007,0.0001,-0.000028,-0.000114,-0.000007,0.000098,-0.000022,-0.000113,-0.000007,0.000098,-0.000023,-0.000112,-0.000008,0.000098,-0.000025,-0.000112,-0.000007,0.000099,-0.000025,-0.000112,-0.000006,0.000098,-0.000019,-0.000114,-0.000007,0.0001,-0.000019,-0.000112,-0.000007,0.000099,-0.00002,-0.00011,-0.000006,0.000098,-0.000024,-0.000111,-0.000007,0.000097,-0.000021,-0.000112,-0.000005,0.000104,-0.000019,-0.00011,-0.000007,0.000095,-0.000022,-0.000112,-0.000008,0.000099,-0.000023,-0.000112,-0.000008,0.000097,-0.000016,-0.00011,-0.000007,0.000099,-0.000022,-0.000111,-0.000005,0.000097,-0.00002,-0.000111,-0.000005,0.000098,-0.000023,-0.00011,-0.000006,0.000097,-0.000021,-0.00011,-0.000006,0.00009,-0.000019,-0.000103,-0.000005,0.000091,-0.000018,-0.000104,-0.000005,0.000093,-0.000014,-0.000102,-0.000006,0.000091,-0.00002,-0.000103,-0.000005,0.000092,-0.000019,-0.000102,-0.000007,0.000091,-0.000023,-0.000103,-0.000005,0.000089,-0.000019,-0.000102,-0.000006,0.000092,-0.000017,-0.000103,-0.000004,0.00009,-0.000016,-0.0001,-0.000005,0.000092,-0.000016,-0.0001,-0.000006,0.000092,-0.000013,-0.000103,-0.000005,0.00009,-0.000018,-0.000101,-0.000005,0.00009,-0.000021,-0.000102,-0.000007,0.000091,-0.000015,-0.000102,-0.000005,0.000088,-0.000019,-0.0001,-0.000004,0.000091,-0.000019,-0.000102,-0.000005,0.000091,-0.000016,-0.0001,-0.000005,0.000088,-0.000015,-0.000102,-0.000007,0.00009,-0.00002,-0.000101,-0.000007,0.000089,-0.00002,-0.0001,-0.000004,0.000088,-0.000022,-0.0001,-0.000005,0.000088,-0.00002,-0.000096,-0.000005,0.00009,-0.000012,-0.0001,-0.000006,0.00009,-0.000008,-0.000098,-0.000005,0.000083,-0.000024,-0.000099,-0.000006,0.000092,-0.000017,-0.000099,-0.000007,0.000089,-0.000021,-0.000099,-0.000005,0.000087,-0.000029,-0.0001,-0.000005,0.00009,-0.000014,-0.0001,-0.000006,0.000086,-0.000018,-0.000098,-0.000006,0.000086,-0.000019,-0.000099,-0.000005,0.000085,-0.000024,-0.0001,-0.000005,0.00009,-0.000014,-0.000098,-0.000006,0.000087,-0.000017,-0.000098,-0.000005,0.000084,-0.000015,-0.000097,-0.000004,0.000087,-0.000012,-0.000097,-0.000006,0.000089,-0.000015,-0.000096,-0.000003,0.00009,-0.000009,-0.000097,-0.000004,0.000089,-0.00002,-0.000095,-0.000003,0.00009,-0.000012,-0.000093,-0.000003,0.000089,-0.000016,-0.000097,-0.000005,0.000089,-0.000009,-0.000098,-0.000005,0.000088,-0.000014,-0.000102,-0.000002,0.000074,-0.000012,-0.000096,0.000012,0.000091,-0.000007,-0.000092,-0.000003,0.000086,-0.000043,-0.000094,0,0.000095,-0.00002,-0.000094,-0.000005,0.000084,-0.000005,-0.000098,0,0.000089,-0.000019,-0.000101,-0.000006,0.000087,-0.000012,-0.000098,-0.000005,0.000095,-0.000016,-0.000096,-0.000007,0.000085,-0.000019,-0.000096,-0.000005,0.000086,-0.000014,-0.000094,-0.000004,0.000086,-0.000024,-0.000096,-0.000003,0.000082,-0.000017,-0.000096,-0.000003,0.000086,-0.000023,-0.000096,-0.000004,0.000088,-0.000026,-0.000097,-0.000003,0.000084,0,-0.000087,-0.000007,0.000085,-0.000016,-0.000095,-0.000002,0.000088,-0.000018,-0.000093,-0.000004,0.000086,-0.00001,-0.000093,-0.000003,0.000087,-0.000012,-0.000094,-0.000004,0.000086,-0.000012,-0.000094,-0.000005,0.000087,-0.000013,-0.000093,-0.000005,0.000085,-0.000017,-0.000093,-0.000005,0.000085,-0.000013,-0.000094,-0.000002,0.000085,-0.000011,-0.000093,-0.000005,0.000076,-0.00001,-0.000082,-0.000003,0.000073,-0.000013,-0.000082,-0.000002,0.000075,-0.00001,-0.000078,-0.000005,0.000074,-0.000008,-0.000079,-0.000002,0.000075,-0.000007,-0.000079,-0.000003,0.000075,-0.000007,-0.000079,-0.000001,0.000074,-0.00001,-0.000084,-0.000003,0.000075,-0.00001,-0.00008,-0.000001,0.000075,-0.000016,-0.00008,-0.000001,0.000075,-0.000007,-0.000078,-0.000004,0.000073,-0.000007,-0.000079,-0.000002,0.000079,-0.000009,-0.000079,-0.000001,0.000072,-0.00001,-0.000079,-0.000002,0.000078,-0.00001,-0.00008,-0.000002,0.000073,-0.000011,-0.000078,-0.000001,0.000073,-0.000009,-0.000079,-0.000004,0.000074,-0.000011,-0.000078,-0.000004,0.000071,-0.000009,-0.00008,-0.000001,0.000073,-0.000013,-0.000078,-0.000002,0.000074,-0.000005,-0.000077,-0.000003,0.000075,0.000002,-0.00008,-0.000002,0.000069,-0.00001,-0.00008,-0.000002,0.000077,0.000001,-0.000084,-0.000002,0.000075,-0.000011,-0.00008,-0.000001,0.000075,-0.000003,-0.000079,-0.000004,0.000073,-0.000012,-0.00008,-0.000001,0.000073,-0.000006,-0.000077,-0.000002,0.000073,-0.000007,-0.000078,-0.000002,0.000072,-0.000006,-0.000075,-0.000002,0.000073,-0.00001,-0.000079,-0.000003,0.000073,-0.000008,-0.000075,-0.000002,0.000072,-0.000006,-0.000077,-0.000002,0.000073,-0.000006,-0.000075,-0.000003,0.000073,-0.000003,-0.000078,-0.000002,0.000074,-0.000008,-0.000076,-0.000002,0.000072,-0.00001,-0.000077,-0.000002,0.000073,-0.000004,-0.000078,-0.000003,0.000067,-0.000011,-0.000076,-0.000002,0.000072,-0.000007,-0.000078,-0.000002,0.000071,-0.000006,-0.000077,-0.000002,0.000074,0,-0.000078,-0.000002,0.00007,-0.000009,-0.000077,-0.000002,0.000073,-0.000004,-0.000076,-0.000002,0.000074,-0.000008,-0.000078,-0.000001,0.000073,-0.000004,-0.000078,-0.000002,0.000068,-0.000005,-0.000075,-0.000003,0.000072,-0.000013,-0.000078,-0.000002,0.00007,-0.00001,-0.000077,-0.000002,0.000072,-0.000009,-0.000076,-0.000002,0.000072,-0.000005,-0.000075,-0.000002,0.000073,-0.000006,-0.000075,-0.000002,0.00007,-0.000003,-0.000073,-0.000002,0.000073,-0.000013,-0.000073,-0.000003,0.000074,-0.000006,-0.000077,0.000001,0.000073,-0.000009,-0.000076,-0.000002,0.000072,-0.000008,-0.000074,-0.000003,0.000072,-0.000007,-0.000074,-0.000003,0.000072,-0.000003,-0.000073,-0.000003,0.000071,-0.000011,-0.000076,0.000001,0.000072,-0.000002,-0.000075,-0.000004,0.00007,-0.000003,-0.000074,-0.000002,0.00007,-0.000007,-0.000075,-0.000002,0.000072,-0.000004,-0.000071,-0.000001,0.000069,-0.000008,-0.000074,-0.000002,0.00007,-0.000004,-0.000073,0,0.000072,-0.000007,-0.000074,-0.000002,0.00007,-0.000002,-0.000074,0,0.000071,0,-0.000074,-0.000002,0.00007,-0.000003,-0.000076,-0.000001,0.000073,-0.000007,-0.000074,-0.000003,0.00007,-0.000002,-0.000071,-0.000002,0.000072,-0.00001,-0.000073,-0.000001,0.000069,-0.000009,-0.000072,-0.000002,0.00007,-0.000004,-0.000075,-0.000001,0.00007,-0.000008,-0.000074,-0.000002,0.000069,0.000002,-0.000076,-0.000002,0.00007,-0.000001,-0.000073,0,0.000071,-0.000002,-0.000074,-0.000001,0.000071,-0.000009,-0.000072,0,0.000072,0.000004,-0.000071,-0.000001,0.00007,-0.000009,-0.000072,0,0.000071,-0.000004,-0.000072,-0.000002,0.000068,-0.000015,-0.000076,-0.000003,0.000071,-0.000008,-0.000071,-0.000004,0.000065,-0.000001,-0.00007,-0.000001,0.000066,-0.000005,-0.000069,0,0.000072,-0.000002,-0.00007,-0.000003,0.000068,-0.000006,-0.000071,-0.000002,0.000071,0.000005,-0.000073,-0.000004,0.000072,-0.000013,-0.000069,0,0.000084,0.000015,-0.000066,0.000001,0.000074,0.000007,-0.000065,-0.000001,0.000071,0.000001,-0.00007,0,0.000069,-0.000001,-0.000069,-0.000002,0.000073,-0.000006,-0.000071,-0.000007,0.000065,-0.000008,-0.000071,-0.000005,0.000068,-0.000014,-0.000071,-0.000004,0.000064,-0.000005,-0.000068,0.000001,0.000066,-0.000002,-0.000072,0,0.000071,0,-0.00007,-0.000001,0.00007,-0.000009,-0.000072,-0.000003,0.000066,-0.000008,-0.000072,-0.000001,0.000068,0.000001,-0.000073,-0.000002,0.000068,0.000001,-0.00007,0.000001,0.000069,-0.000004,-0.00007,-0.000003,0.000068,-0.000005,-0.000069,0.000001,0.000065,-0.000008,-0.000062,0,0.000061,0.000002,-0.000065,-0.000001,0.000064,-0.000004,-0.000065,0,0.000068,-0.000003,-0.000064,-0.000001,0.000062,-0.000002,-0.000063,-0.000002,0.000063,0.000002,-0.000064,0,0.000062,-0.000005,-0.000067,0,0.000062,-0.000005,-0.000065,-0.000001,0.000064,-0.000007,-0.000061,0.000001,0.000063,0.000008,-0.000066,0,0.000064,0.000003,-0.000065,0,0.000064,-0.000001,-0.000065,-0.000002,0.000062,0.000002,-0.000062,0,0.000059,0,-0.000064,-0.000003,0.000064,0.000005,-0.000063,-0.000001,0.000064,0.000001,-0.000065,0.000001,0.000062,-0.000007,-0.000064,0,0.000063,-0.000005,-0.000065,-0.000002,0.000065,-0.000005,-0.000064,-0.000001,0.000062,-0.000002,-0.000065,-0.000001,0.000064,0.000004,-0.000064,0,0.000061,-0.000004,-0.000064,0,0.000062,0.000001,-0.000064,-0.000001,0.000062,-0.000002,-0.000065,0,0.000062,0.000001,-0.000062,-0.000002,0.000063,0.000005,-0.000063,-0.000001,0.000064,0.000002,-0.000063,0,0.000064,0.000001,-0.000063,0.000001,0.000062,-0.000003,-0.000061,-0.000001,0.000062,0.000001,-0.000062,-0.000001,0.000064,-0.000002,-0.000064,0,0.000061,0,-0.000063,-0.000002,0.00006,0.000002,-0.000063,0,0.000062,0,-0.000063,-0.000002,0.000063,-0.000001,-0.000063,0,0.000064,0,-0.000063,0,0.000062,0.000003,-0.000064,0.000001,0.000063,-0.000001,-0.000062,-0.000001,0.000064,-0.000003,-0.000063,0.000002,0.000062,-0.000002,-0.000061,0,0.000061,0.000007,-0.000063,-0.000001,0.000062,0.000013,-0.00006,0.000002,0.000063,-0.000005,-0.000067,-0.000002,0.000074,0,-0.000066]},
      celeste:{"real":[0,0,-0.5,0.000521,-0.001138,0.000116,-0.001202,0.000081,-0.000772,0.000116,-0.000752,0.000144,-0.000122,0.000027,-0.000623,0.000121,-0.000085,0.000055,-0.000175,0.000053,-0.000051,0.000052,-0.000117,0.000071,-0.00007,0.000033,-0.000042,0.00005,-0.000015,0.000025,-0.00004,0.000082,-0.000201,0.000049,-0.000025,0.000009,-0.000111,0.000081,-0.000042,0.000029,-0.000033,0.000024,-0.000033,0.000023,-0.000069,0.000082,-0.000083,0.000053,-0.000127,0.000045,-0.00008,0.000034,-0.000053,0.000029,-0.00006,0.000036,-0.000083,0.000098,-0.000102,0.000046,-0.000067,0.000071,-0.000089,0.000128,-0.000191,0.000195,-0.000266,0.000291,-0.000274,0.000245,-0.000198,0.000147,-0.000104,0.000079,-0.000065,0.000057,-0.00005,0.000045,-0.000041,0.000038,-0.000035,0.000033,-0.00003,0.000029,-0.000027,0.000026,-0.000024,0.000023,-0.000022,0.000021,-0.00002,0.000019,-0.000019,0.000018,-0.000017,0.000017,-0.000016,0.000016,-0.000015,0.000015,-0.000014,0.000014,-0.000013,0.000013,-0.000013,0.000012,-0.000012,0.000012,-0.000011,0.000011,-0.000011,0.00001,-0.00001,0.00001,-0.00001,0.000009,-0.000009,0.000009,-0.000009,0.000009,-0.000009,0.000008,-0.000008,0.000008,-0.000008,0.000008,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,0.002302,-0.000003,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.000001,0,0,0,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000002,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      chorus_Strings:{"real":[0,-0.056752,-0.485551,0.414947,0.037289,-0.089027,0.041126,0.025816,-0.000195,-0.002759,-0.019563,0.00088,-0.017563,-0.002858,0.001327,-0.000568,-0.000064,-0.000954,-0.000392,-0.000428,0.001213,-0.001126,-0.00021,0.000262,0.000032,-0.00007,-0.000023,0.000035,0.000059,0.000468,0.000205,-0.000136,-0.000039,-0.000018,-0.000028,-0.000004,0.000003,-0.000003,-0.000021,0.000005,-0.000025,0.000053,0.000015,-0.00005,0.000002,-0.000012,-0.000002,-0.000014,0.000017,-0.000003,0.000029,-0.000006,-0.000044,0.000007,-0.000008,0.000016,0.000002,-0.000013,0.000005,-0.000003,0.000003,0.00001,0.000027,-0.000035,-0.000101,-0.000019,0.000009,-0.00001,0.000003,0.000011,-0.000029,-0.000005,0.000114,-0.000078,0.000039,0.000011,0.000036,0.000031,0.000054,0.000061,-0.000064,0.000327,-0.00001,0.000235,0.000073,0.000036,-0.000122,-0.000153,0.000127,0.000054,-0.000419,0.000104,0.000044,0.000009,-0.000056,0.000209,-0.000268,-0.00017,0.000243,-0.000112,-0.000111,-0.000019,-0.000009,0.000143,0.000004,0.000175,0.000143,-0.00002,0.000004,-0.000012,0.000025,0.000021,0.000004,-0.000028,0.000018,0.000012,-0.000003,0,-0.000002,0.000007,-0.000005,-0.000007,-0.000021,-0.000014,0.000003,0.000002,-0.000005,0.000004,-0.000002,0,0.000002,-0.000002,0,0,-0.000002,-0.000004,0.000003,0.000001,-0.000001,0,0.000003,-0.000001,0.000001,-0.000001,0,0.000005,0,0.000001,-0.000003,0.000001,0.000002,-0.000002,0.000001,0.000001,0,-0.000001,0.000006,0.000013,0.000005,-0.000005,0.000001,0.000003,-0.000003,-0.000002,0.000005,-0.000015,0.000007,-0.000012,-0.000001,-0.000004,-0.000009,-0.000012,-0.000051,0.000005,-0.000039,-0.000005,-0.000021,-0.00001,0,0.000018,-0.000004,0.000016,-0.000013,0.000046,0.000007,-0.00001,-0.000006,0.000022,-0.000007,0.00002,0.000046,-0.000035,0.000024,0.00002,0,0.000001,-0.000019,-0.000011,-0.000016,-0.000049,0.000006,-0.000007,-0.000005,0.000003,-0.000009,0.000003,0.000001,0.000003,-0.000015,-0.000001,0.000002,-0.000002,-0.000006,0.000002,0.000007,0.000011,0.000002,0.000007,-0.000003,0.000003,-0.000002,0.000001,0.000003,-0.000002,0.000002,-0.000002,0.000004,-0.000001,0.000002,0.000002,-0.000001,0.000002,0.000001,-0.000001,-0.000001,-0.000001,0,0,-0.000001,0.000001,0,0.000002,-0.000001,0,0.000002,-0.000001,0,0,-0.000001,-0.000003,-0.000002,-0.000001,0.000003,0.000001,0,0,0.000005,0.000001,0.000001,0,0.000006,0.000003,0,0.000005,0.000001,0.000031,0.000017,0.000007,0.000013,0.000002,0,-0.000007,-0.000011,0.000024,-0.000017,-0.00001,0.00001,-0.000009,0.000006,0.000005,0,-0.000027,0.000004,-0.000006,0,-0.000012,-0.000014,0.000007,0.000003,0.000002,0.000015,0.000003,0.000022,-0.00001,0.000004,0.000021,-0.000008,0.000003,-0.000002,0.000003,-0.000008,0.000013,0.000003,-0.000006,0.000001,0.000001,-0.000002,-0.000004,-0.000005,-0.000002,-0.000005,-0.000003,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000002,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,-0.142044,0.119331,0.086961,0.000519,0.061124,-0.008195,0.003663,-0.001992,-0.005229,-0.003499,0.00294,0.003171,0.011203,0.000387,0.000902,-0.000191,0.00055,0.000462,-0.000264,0.000833,-0.000158,-0.000038,0.00001,-0.000177,-0.000061,0.000129,-0.000167,-0.000071,0.000171,0.000137,0.000078,-0.000051,-0.00005,0.00002,-0.000047,0.000034,-0.000004,-0.000042,0.000003,-0.000015,0.000026,-0.000001,-0.000013,-0.000018,-0.000034,0.000007,0.000008,-0.000019,-0.000026,0.000006,-0.000003,-0.000002,0.000005,0.000001,-0.000013,-0.000006,0.000008,-0.000017,0.000007,-0.000013,-0.000012,0.000045,0.00003,0,0.000001,-0.000025,0.000014,0.000002,-0.000019,-0.000026,0.000002,0.000055,0.000005,-0.000011,0.000013,0.000047,0.000005,0.00005,-0.000079,0.000168,0.000223,-0.000042,0.000065,-0.000034,0.000025,-0.00002,-0.000176,0.000346,0.00008,-0.000175,0.000179,0.000005,-0.000024,-0.000009,0.000154,-0.000257,-0.000065,0.000019,-0.00003,-0.00007,-0.000003,0.000012,0.0001,-0.00009,0.000048,-0.000144,-0.000059,-0.000035,-0.000013,0.000005,-0.00002,0.000007,-0.000052,0.000022,0,-0.000001,0.00001,-0.000002,-0.000005,0.000008,0.00001,-0.000013,-0.000016,0.000005,0.000004,0.000003,0.000002,0.000004,0.000001,-0.000002,0.000002,-0.000001,0.000005,-0.000005,-0.000002,0.000003,-0.000001,0.000004,0,0,0,0.000003,-0.000003,-0.000001,0.000001,-0.000001,-0.000001,0.000001,0,0,0.000003,-0.000001,0.000003,0.000002,-0.00001,-0.000008,0.000004,0,0.000002,-0.000002,0.000001,0,0.000008,0.000005,-0.000024,0.000004,0,0.000003,-0.000012,-0.000008,-0.000021,0.000012,0.000012,-0.000053,0.000033,-0.00002,-0.000005,-0.000025,-0.000005,0.000059,-0.00008,-0.000061,0.000082,-0.00004,-0.000005,0.000008,0.000024,-0.000082,0.000067,0.000053,-0.00004,0.000008,0.000019,0.000008,0.00001,-0.00003,0.000042,-0.000014,0.000015,0.000017,0.000012,0.000019,-0.000008,0.000004,-0.000003,0.000018,-0.000012,0.000005,0,-0.000013,0.000007,0.000002,-0.000002,-0.000004,0,0.000006,-0.00001,-0.000008,0.000001,-0.000003,-0.000001,-0.000002,-0.000001,0,0.000001,-0.000003,0,0.000002,-0.000002,0,-0.000002,0,-0.000001,0,-0.000002,0.000001,0.000001,0,0,0,0,-0.000001,0,-0.000002,0,-0.000002,-0.000001,0.000004,0.000004,-0.000002,-0.000001,0,0.000001,-0.000003,0,-0.000001,-0.000007,0.000011,-0.000002,0.000002,-0.000004,0.000005,0.000006,0.00001,0.000008,-0.000015,0.000015,-0.000022,0,0.000002,0.000014,0.000007,-0.000018,0.000021,0.000039,-0.000032,0.000008,0,-0.000002,-0.000021,0.000035,-0.000016,-0.000036,0.000022,-0.000007,-0.000005,-0.000003,-0.000007,0.000008,-0.000023,-0.000009,0,-0.000014,-0.000006,-0.000016,-0.000005,-0.000003,-0.000003,-0.000009,-0.000001,-0.000003,-0.000005,0.000002,-0.000006,-0.000004,-0.000003,-0.000003,-0.000002,-0.000002,-0.000001,0,-0.000001,-0.000001,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      ethnic_33:{"real":[0,-0.867611,0.328068,0.139449,0.063681,-0.180347,-0.107318,0.02568,-0.195668,-0.162557,-0.17598,0.121916,0.024771,-0.097123,0.062144,-0.005063,-0.151144,-0.358389,-0.016781,-0.028287,0.014708,0.066692,-0.005924,-0.024762,0.007058,-0.021288,-0.015686,-0.0104,0.002762,0.006183,-0.004794,0.00689,0.006268,-0.015178,-0.015342,-0.072055,0.035109,0.00109,0.010667,-0.001808,-0.002684,-0.006622,0.013941,0.011645,-0.005769,-0.003513,-0.015747,-0.004779,0.008298,0.000533,-0.002409,-0.002894,0.003932,0.04675,-0.016478,0.003333,-0.004184,-0.000497,0.003726,0.002107,-0.007549,0.003077,-0.006366,-0.00022,-0.002142,0.00021,-0.003421,-0.004822,-0.001397,-0.00046,0.002735,-0.002267,-0.00142,-0.001985,-0.011486,-0.002439,-0.001589,0.024558,0.001752,-0.001668,-0.000005,0.001741,0.00131,0.000778,-0.001206,0.002049,0.000503,-0.001847,0.003654,-0.000961,0.006906,0.000515,-0.00021,-0.000792,-0.000095,-0.0021,0.000327,-0.000608,0.003331,-0.000441,-0.000576,0.001806,0.000094,0.000112,-0.000114,0.000368,0.00035,-0.000563,-0.000773,0.002585,-0.000974,0.000508,0.000779,-0.000553,0.000914,-0.001332,0.000314,0.000624,-0.000659,-0.000096,0.00083,-0.000233,-0.000603,0.000491,0.000011,-0.000979,-0.000926,0.000202,0.000639,0.000108,-0.000108,-0.000706,0.000346,-0.000127,-0.000335,0.000294,-0.000149,0.000022,-0.000158,0.000208,-0.000403,0.000272,0.000302,0.000454,-0.000678,-0.000637,0.000087,-0.000065,0.000065,0.000015,-0.000081,0.000089,0.000132,0.000023,-0.000005,-0.000019,0.000102,-0.000059,0.00009,0.000098,0.000064,-0.000091,-0.000024,0.000182,0.000091,-0.000137,-0.000021,-0.000177,0.000501,0.000633,-0.00037,-0.000246,-0.000409,0.000465,0.000281,0.000314,-0.000022,0.000063,-0.000269,0.000096,0.000148,-0.000145,0.000412,0.000271,0.000037,-0.000383,-0.000325,0.00024,0.000458,0.000262,0.000062,0.000096,0.000072,-0.000157,0.000119,0.00042,-0.000315,-0.000194,0.000142,-0.0002,0.000103,-0.000173,-0.000146,0.000473,-0.000524,0.000095,-0.000011,-0.000211,-0.00018,-0.00011,-0.00001,0.000096,-0.000415,0.000133,0.000059,-0.000607,0.000038,-0.000013,0.000528,-0.000041,0.000077,-0.000129,-0.000129,-0.001255,-0.000036,-0.000448,0.000186,-0.00005,-0.000227,0.000304,0.000013,0.000031,-0.00015,-0.000039,0.000266,0.000264,-0.002439,-0.000403,0.000043,0.000553,0.00034,0.000281,0.000199,-0.000229,-0.000106,0.00034,0.000287,0.000334,-0.000132,-0.000013,-0.000034,0.000253,-0.000918,0.000816,-0.000477,-0.001332,-0.000369,0.000314,-0.000629,0.001364,-0.001412,-0.001414,-0.000947,0.001043,0.00069,-0.00145,0.001128,0.001508,0.000425,0.000497,-0.001362,-0.000767,0.000968,0.000892,0.000883,-0.001317,0.001587,-0.001788,0.00213,0.00108,0.002059,0.001364,-0.002122,-0.001687,0.001852,0.002171,0.002003,-0.000353,0.00201,0.00269,0.002175,0.002046,-0.00005,0.001711,0.001021,-0.001577,0.002725,0.002176,0.002361,-0.002857,0.002776,0.000838,-0.002115,0.002408,0.002769,0.000293,0.002835,-0.001176,0.001161,0.001226,-0.001721,-0.001767,-0.001729,-0.002033,-0.003013,-0.002362,-0.002609,-0.002523,-0.002859,-0.00271,-0.002879,-0.002929,-0.002871,-0.002907,-0.002991,-0.003175,-0.003095,-0.0031,-0.003163,-0.003156,-0.003057,-0.003047,-0.003127,-0.003127,-0.003016,-0.003001,-0.003095,-0.003104,-0.00298,-0.002959,-0.003066,-0.003083,-0.002946,-0.003105,-0.003231,-0.003257,-0.0031,-0.003064,-0.003207,-0.003238,-0.00307,-0.00303,-0.003182,-0.003222,-0.003037,-0.002994,-0.003259,-0.003304,-0.003108,-0.003054,-0.003237,-0.003288,-0.003079,-0.003023,-0.00322,-0.003272,-0.003055,-0.002989,-0.003197,-0.003257,-0.003029,-0.002966,-0.003178,-0.003242,-0.003198,-0.003122,-0.00336,-0.003434,-0.003175,-0.003094,-0.003343,-0.003419,-0.003151,-0.003072,-0.003324,-0.003406,-0.003133,-0.003044,-0.003311,-0.003396,-0.003114,-0.00302,-0.003292,-0.003381,-0.003088,-0.003,-0.003275,-0.003366,-0.003072,-0.00298,-0.003261,-0.003354,-0.003148,-0.003052,-0.003346,-0.003448,-0.003122,-0.003026,-0.003331,-0.003434,-0.003116,-0.003012,-0.003317,-0.00342,-0.003091,-0.002992,-0.003302,-0.003409,-0.003077,-0.002969,-0.003292,-0.003397,-0.003059,-0.002952,-0.003271,-0.003384,-0.003046,-0.002936,-0.003262,-0.003373,-0.003036,-0.002915,-0.003248,-0.003362,-0.003018,-0.002899,-0.003237,-0.003349,-0.003009,-0.002798,-0.003126,-0.003239,-0.002904,-0.002782,-0.003113,-0.003226,-0.002888,-0.002769,-0.003102,-0.003217,-0.002878,-0.002754,-0.002996,-0.003107,-0.002776,-0.002658,-0.002988,-0.003098,-0.002767,-0.002643,-0.002976,-0.003087,-0.002754,-0.002629,-0.002967,-0.003078,-0.002745,-0.002622,-0.002954,-0.003065,-0.002734,-0.002613,-0.002943,-0.003056,-0.002723,-0.0026,-0.002933,-0.003047,-0.002714,-0.002585,-0.002922,-0.003036,-0.002706,-0.002575,-0.002914,-0.003025,-0.002697,-0.002565,-0.002905,-0.003016,-0.002683,-0.002552,-0.002897,-0.003006,-0.002674,-0.002547,-0.002884,-0.002996,-0.002662,-0.002536,-0.002873,-0.002985,-0.002651,-0.002526,-0.002867,-0.002977,-0.002667,-0.002511,-0.002857,-0.002966,-0.002643,-0.002507,-0.002845,-0.002958,-0.002627,-0.002494,-0.002841,-0.002949,-0.002633,-0.002486,-0.002831,-0.002937,-0.002619,-0.002477,-0.00282,-0.002928,-0.002612,-0.002467,-0.002812,-0.00292,-0.002599,-0.00246,-0.002803,-0.002912,-0.002589,-0.002453,-0.002792,-0.002902,-0.002585,-0.002444,-0.002786,-0.002892,-0.002575,-0.002434,-0.002775,-0.002883,-0.002574,-0.002421,-0.002771,-0.002873,-0.002564,-0.002418,-0.002756,-0.002864,-0.002553,-0.002408,-0.00275,-0.002855,-0.002551,-0.002399,-0.002742,-0.002847,-0.002548,-0.002389,-0.002738,-0.002836,-0.002537,-0.002385,-0.002726,-0.002827,-0.002531,-0.002378,-0.00272,-0.002819,-0.002517,-0.002373,-0.002628,-0.002726,-0.002439,-0.002287,-0.002621,-0.002717,-0.002429,-0.002286,-0.002614,-0.002709,-0.002427,-0.002274,-0.002608,-0.002701,-0.002417,-0.002272,-0.002601,-0.002691,-0.002416,-0.002263,-0.002593,-0.002683,-0.002418,-0.00227,-0.002583,-0.002675,-0.002403,-0.002256,-0.002572,-0.002668,-0.002394,-0.002246,-0.002567,-0.002658,-0.002403,-0.002241,-0.002558,-0.002651,-0.002379,-0.002239,-0.002555,-0.002643,-0.002392,-0.002234,-0.002549,-0.002634,-0.002374,-0.002226,-0.002548,-0.002627,-0.002375,-0.002214,-0.00254,-0.002619,-0.002359,-0.002217,-0.002525,-0.002612,-0.002356,-0.002213,-0.002522,-0.002604,-0.002348,-0.002193,-0.002504,-0.002596,-0.002352,-0.002193,-0.002509,-0.002587,-0.002342,-0.002187,-0.002496,-0.002582,-0.002339,-0.002182,-0.00249,-0.002572,-0.002359,-0.002179,-0.002492,-0.002566,-0.002329,-0.002175,-0.00249,-0.002558,-0.002402,-0.002145,-0.002496,-0.00255,-0.002331,-0.002077,-0.002522,-0.002543,-0.002289,-0.002133,-0.002467,-0.002536,-0.002309,-0.002171,-0.002461,-0.002528,-0.002412,-0.002071,-0.002442,-0.002521,-0.002419,-0.0022,-0.002458,-0.002514,-0.002298,-0.002139,-0.002434,-0.002507,-0.002131,-0.002135,-0.002436,-0.002499,-0.002288,-0.002131,-0.002427,-0.002492,-0.002303,-0.002122,-0.002422,-0.002485,-0.002281,-0.002105,-0.002415,-0.002478,-0.002278,-0.002106,-0.002407,-0.002471,-0.002263,-0.002118,-0.002403,-0.002464,-0.002268,-0.002102,-0.002395,-0.002457,-0.002257,-0.002082,-0.002385,-0.00245,-0.00224,-0.002097,-0.002383,-0.002443,-0.002198,-0.002099,-0.002375,-0.002437,-0.00224,-0.002077,-0.002371,-0.00243,-0.002237,-0.00208,-0.002361,-0.002422,-0.002238,-0.002061,-0.00236,-0.002416,-0.002234,-0.002063,-0.002353,-0.00241,-0.002224,-0.002057,-0.002353,-0.002403,-0.002212,-0.002073,-0.002345,-0.002397,-0.002205,-0.00205,-0.002337,-0.002391,-0.00221,-0.002055,-0.002332,-0.002385,-0.002221,-0.002038,-0.002327,-0.002378,-0.002218,-0.002042,-0.002321,-0.002372,-0.00221,-0.002029,-0.002317,-0.002365,-0.002202,-0.002047,-0.002313,-0.002357,-0.002186,-0.002024,-0.002305,-0.002353,-0.002178,-0.002041,-0.002298,-0.002345,-0.002187,-0.002022,-0.002298,-0.002341,-0.002193,-0.002012,-0.00229,-0.002334,-0.002193,-0.002015,-0.002284,-0.002327,-0.002152,-0.002008,-0.002278,-0.002321,-0.002168,-0.002001,-0.002277,-0.002316,-0.002165,-0.002002,-0.002271,-0.00231,-0.002161,-0.002002,-0.002268,-0.002303,-0.002156,-0.001992,-0.002261,-0.002298,-0.002153,-0.002003,-0.002254,-0.002294,-0.002163,-0.001985,-0.00225,-0.002286,-0.002158,-0.001987,-0.002244,-0.002281,-0.002139,-0.001968,-0.00224,-0.002274,-0.00214,-0.001969,-0.002234,-0.002267,-0.002136,-0.001968,-0.002227,-0.002263,-0.002129,-0.001962,-0.002226,-0.002257,-0.002135,-0.001963,-0.002221,-0.002251,-0.002128,-0.001957,-0.002215,-0.002247,-0.002125,-0.001956,-0.002211,-0.002242,-0.002113,-0.00195,-0.002206,-0.002234,-0.002113,-0.00195,-0.002202,-0.00223,-0.002112,-0.001951,-0.002196,-0.002223,-0.002111,-0.001945,-0.002193,-0.002219,-0.002102,-0.001922,-0.00219,-0.002212,-0.002097,-0.001932,-0.002183,-0.002208,-0.002091,-0.001928,-0.002178,-0.002202,-0.002093,-0.001922,-0.002175,-0.002199,-0.002082,-0.001911,-0.002168,-0.002192,-0.002085,-0.001917,-0.002167,-0.002186,-0.002074,-0.00193,-0.00216,-0.002182,-0.002075,-0.001908,-0.002156,-0.002177,-0.002072,-0.001914,-0.002151,-0.002174,-0.002076,-0.001902,-0.002148,-0.002169,-0.002066,-0.001901,-0.002144,-0.002162,-0.002071,-0.001886,-0.002139,-0.002156,-0.002061,-0.00191,-0.002137,-0.002151,-0.002054,-0.001895,-0.00213,-0.002148,-0.002043,-0.00189,-0.002129,-0.00214,-0.002042,-0.00189,-0.002123,-0.002136,-0.002049,-0.001883,-0.002122,-0.002132,-0.002045,-0.001879,-0.002115,-0.002127,-0.002054,-0.001882,-0.002111,-0.00212,-0.002048,-0.001875,-0.002104,-0.002117,-0.002047,-0.001873,-0.002101,-0.002113,-0.002036,-0.001882,-0.002096,-0.002108,-0.002035,-0.001868,-0.002095,-0.002101,-0.002026,-0.001863,-0.002092,-0.002099,-0.002018,-0.001863,-0.00209,-0.002094,-0.002016,-0.001862,-0.002081,-0.002086,-0.002016,-0.001849,-0.00208,-0.002084,-0.002009,-0.001857,-0.002076,-0.002079,-0.002011,-0.001837,-0.00207,-0.002072,-0.002009,-0.001852,-0.002065,-0.00207,-0.002011,-0.001844,-0.002064,-0.002067,-0.002003,-0.00184,-0.00206,-0.002064,-0.002003,-0.001813,-0.002055,-0.002054,-0.00199,-0.001822,-0.002048,-0.002053,-0.00199,-0.001821,-0.002047,-0.002043,-0.002,-0.001838,-0.002045,-0.002046,-0.001966,-0.001802,-0.002038,-0.002036,-0.001961,-0.001819,-0.002037,-0.002038,-0.001994,-0.001818,-0.002032,-0.002031,-0.002024,-0.001815,-0.002026,-0.002022,-0.001968,-0.001814,-0.002024,-0.002029,-0.001975,-0.001811,-0.002023,-0.002021,-0.001963,-0.001807,-0.002019,-0.002012,-0.001954,-0.001798,-0.001952,-0.001947,-0.001901,-0.001742,-0.00195,-0.001949,-0.001901,-0.001744,-0.001947,-0.001939,-0.001896,-0.001727,-0.001942,-0.001934,-0.001897,-0.001743,-0.001936,-0.001934,-0.001896,-0.001723,-0.001936,-0.001929,-0.001875,-0.001741,-0.001934,-0.001921,-0.001892,-0.001724,-0.001929,-0.001919,-0.001892,-0.001737,-0.001927,-0.001919,-0.001876,-0.001727,-0.001921,-0.001909,-0.001872,-0.00172,-0.001918,-0.001907,-0.001869,-0.001715,-0.001915,-0.001905,-0.001865,-0.001713,-0.001913,-0.001901,-0.001865,-0.001718,-0.00191,-0.001896,-0.001863,-0.001715,-0.001906,-0.001894,-0.001854,-0.001719,-0.001903,-0.001894,-0.001857,-0.001706,-0.001901,-0.001889,-0.001865,-0.001694,-0.001895,-0.001883,-0.001858,-0.001693,-0.001891,-0.001875,-0.001852,-0.001696,-0.001891,-0.001872,-0.001842,-0.001697,-0.001887,-0.001871,-0.001849,-0.00169,-0.001885,-0.001868,-0.001836,-0.001698,-0.001879,-0.001864,-0.001845,-0.001699,-0.001878,-0.001859,-0.001839,-0.001696,-0.001874,-0.001858,-0.001839,-0.00168,-0.001873,-0.001854,-0.001833,-0.00169,-0.001867,-0.001846,-0.001835,-0.001684,-0.001866,-0.001845,-0.001831,-0.00168,-0.001861,-0.001841,-0.001819,-0.001675,-0.00186,-0.001841,-0.001824,-0.001664,-0.001857,-0.00183,-0.00182,-0.001676,-0.001855,-0.001833,-0.001822,-0.001677,-0.001849,-0.001826,-0.001809,-0.00168,-0.001845,-0.001824,-0.001811,-0.001663,-0.001843,-0.00182,-0.001811,-0.001646,-0.001842,-0.001818,-0.001816,-0.001654,-0.001838,-0.001811,-0.001802,-0.001649,-0.001835,-0.001806,-0.001802,-0.001664,-0.001834,-0.001805,-0.001796,-0.00146,-0.001618,-0.001595,-0.001579,-0.001457,-0.001614,-0.001596,-0.001586,-0.001461,-0.001614,-0.001589,-0.001592,-0.001464,-0.001609,-0.001586,-0.001588,-0.001448,-0.001608,-0.00159,-0.001584,-0.001467,-0.001608,-0.001576,-0.001582,-0.001463,-0.001602,-0.00158,-0.001581,-0.001451,-0.001599,-0.001577,-0.00158,-0.001448,-0.001594,-0.001571,-0.001576,-0.001458,-0.001596,-0.001567,-0.001571,-0.001438,-0.001593,-0.001563,-0.001561,-0.001441,-0.001591,-0.00156,-0.001571,-0.001441,-0.00159,-0.001562,-0.001557,-0.001443,-0.001588,-0.001558,-0.00155,-0.001435,-0.001585,-0.001557,-0.001545,-0.001444,-0.001582,-0.00156,-0.001553,-0.001445,-0.001579,-0.001545,-0.001561,-0.001435,-0.00158,-0.001551,-0.001528,-0.00142,-0.001573,-0.001546,-0.001551,-0.001429,-0.001571,-0.001538,-0.001527,-0.001434,-0.001568,-0.001529,-0.001553,-0.001422,-0.001568,-0.001525,-0.001543,-0.001409,-0.001567,-0.001536,-0.00152,-0.001417,-0.001563,-0.001533,-0.001549,-0.00142,-0.00156,-0.001537,-0.001551,-0.001416,-0.001554,-0.00153,-0.001531,-0.001413,-0.001556,-0.001531,-0.001527,-0.001422,-0.001552,-0.001518,-0.001533,-0.001399,-0.001552,-0.001516,-0.001526,-0.001407,-0.001546,-0.001507,-0.001523,-0.001409,-0.001547,-0.001509,-0.00153,-0.001414,-0.001545,-0.001528,-0.001534,-0.001401,-0.001544,-0.001507,-0.001531,-0.001445,-0.00154,-0.001463,-0.001524,-0.001392,-0.001519,-0.001441,-0.00151,-0.001389,-0.00153,-0.001503,-0.001535,-0.001403,-0.001535,-0.001497,-0.001523,-0.001445,-0.00152,-0.001505,-0.001525,-0.001448,-0.001532,-0.001455,-0.001508,-0.001422,-0.001523,-0.001496,-0.001501,-0.001305,-0.001526,-0.001484,-0.001505,-0.001405,-0.001524,-0.00149,-0.001517,-0.001388,-0.001522,-0.001487,-0.001499,-0.001397,-0.001517,-0.001478,-0.001499,-0.001367,-0.001516,-0.00148,-0.001491,-0.0014,-0.001513,-0.001476,-0.001491,-0.001383,-0.001513,-0.001476,-0.001487,-0.001388,-0.001511,-0.001479,-0.001489,-0.00135,-0.001508,-0.001463,-0.001504,-0.001298,-0.001502,-0.00146,-0.001504,-0.001369,-0.001502,-0.001472,-0.001488,-0.001367,-0.0015,-0.001481,-0.001499,-0.001357,-0.001501,-0.001467,-0.001466,-0.001358,-0.001498,-0.001439,-0.001486,-0.001355,-0.001495,-0.00146,-0.001477,-0.00137,-0.001492,-0.001455,-0.001477,-0.001367,-0.001492,-0.001461,-0.001485,-0.001355,-0.001486,-0.001446,-0.00148,-0.001354,-0.001487,-0.001444,-0.001475,-0.001357,-0.001484,-0.001439,-0.00147,-0.001327,-0.001485,-0.001432,-0.001477,-0.00136,-0.00148,-0.001434,-0.001453,-0.001354,-0.001478,-0.001439,-0.001469,-0.001335,-0.00148,-0.001436,-0.001468,-0.001341,-0.001476,-0.001438,-0.001447,-0.001353,-0.001473,-0.001436,-0.001456,-0.001337,-0.001472,-0.001428,-0.001462,-0.001339,-0.001469,-0.001431,-0.001457,-0.00134,-0.001468,-0.001424,-0.001457,-0.00134,-0.001465,-0.001427,-0.001462,-0.001336,-0.001464,-0.001421,-0.001442,-0.001345,-0.00146,-0.001423,-0.001455,-0.001343,-0.001461,-0.001405,-0.001449,-0.001341,-0.001458,-0.001405,-0.001453,-0.001335,-0.001455,-0.00141,-0.001444,-0.001331,-0.001454,-0.00141,-0.001448,-0.001335,-0.001453,-0.001406,-0.001433,-0.001333,-0.001448,-0.001396,-0.001435,-0.001331,-0.001447,-0.001413,-0.001439,-0.001343,-0.001448,-0.001405,-0.00144,-0.001327,-0.001446,-0.001396,-0.001438,-0.001339,-0.001445,-0.001398,-0.001437,-0.001335,-0.001442,-0.001385,-0.001436,-0.001324,-0.001439,-0.001398,-0.001432,-0.001318,-0.001436,-0.001384,-0.001429,-0.001338,-0.001436,-0.001394,-0.001431,-0.0013,-0.001433,-0.001393,-0.001424,-0.00132,-0.00143,-0.001402,-0.001426,-0.001322,-0.00143,-0.001389,-0.001425,-0.001314,-0.001427,-0.001371,-0.00142,-0.00131,-0.001428,-0.001382,-0.001421,-0.001315,-0.001425,-0.001361,-0.00141,-0.001314,-0.001423,-0.001363,-0.001417,-0.001319,-0.001421,-0.001368,-0.001406,-0.001322,-0.00142,-0.00137,-0.001415,-0.001308,-0.001417,-0.001362,-0.001413,-0.0013,-0.001417,-0.001375,-0.001408,-0.001313,-0.001415,-0.00136,-0.001401,-0.001301,-0.001414,-0.001368,-0.00141,-0.001299,-0.001411,-0.00136,-0.001409,-0.001301,-0.001409,-0.001365,-0.001399,-0.001305,-0.001407,-0.001354,-0.001396,-0.001285,-0.001405,-0.001347,-0.00139,-0.001295,-0.001405,-0.00136,-0.001399,-0.001301,-0.001404,-0.001352,-0.001392,-0.00129,-0.001402,-0.001352,-0.001388,-0.001308,-0.001399,-0.001343,-0.001393,-0.001305,-0.001397,-0.001337,-0.001393,-0.001294,-0.001395,-0.001344,-0.001389,-0.001292,-0.001394,-0.001338,-0.001389,-0.001284,-0.001393,-0.001336,-0.001387,-0.001286,-0.00139,-0.001332,-0.001384,-0.001131,-0.001229,-0.001175,-0.001224,-0.001146,-0.001227,-0.001179,-0.001226,-0.001128,-0.001226,-0.001171,-0.001224,-0.001122,-0.001224,-0.001174,-0.001222,-0.001133,-0.001222,-0.001201,-0.001223,-0.001125,-0.00122,-0.001183,-0.001217,-0.001099,-0.001219,-0.001201,-0.001217,-0.001123,-0.001216,-0.001181,-0.001218,-0.001108,-0.001217,-0.001161,-0.001203,-0.001096,-0.001205,-0.001185,-0.001194,-0.001149,-0.0012,-0.001187,-0.001204,-0.001124,-0.001213,-0.001122,-0.001192,-0.001125,-0.001208,-0.00119,-0.001208,-0.001146,-0.001211,-0.001196,-0.001182,-0.001171,-0.001209,-0.001119,-0.001196,-0.001091,-0.001207,-0.001104,-0.001157,-0.001068,-0.001203,-0.001169,-0.001194,-0.001119,-0.001205,-0.001149,-0.001172,-0.001117,-0.001204,-0.001161,-0.001203,-0.001085,-0.001201,-0.001125,-0.001188,-0.00111,-0.001201,-0.001152,-0.001195,-0.001082,-0.001199,-0.001165,-0.001193,-0.001134,-0.001194,-0.00114,-0.001191,-0.001139,-0.001197,-0.001195,-0.001189,-0.001071,-0.001106,-0.00113,-0.001189,-0.001103,-0.001194,-0.00113,-0.001193,-0.001133,-0.001193,-0.001144,-0.001174,-0.001141,-0.001191,-0.00104,-0.001187,-0.00109,-0.001189,-0.00116,-0.001189,-0.001124,-0.001187,-0.001079,-0.001179,-0.001127,-0.001187,-0.001131,-0.001185,-0.001083,-0.001186,-0.001123,-0.00117,-0.001102,-0.001183,-0.001141,-0.001183,-0.001111,-0.001183,-0.001098,-0.001126,-0.001118,-0.001182,-0.001137,-0.001182,-0.001105,-0.001179,-0.001147,-0.001177,-0.001113,-0.001176,-0.001136,-0.001165,-0.001086,-0.001177,-0.001121,-0.001176,-0.001056,-0.001176,-0.001165,-0.001176,-0.001105,-0.001173,-0.001138,-0.00117,-0.001104,-0.001174,-0.001095,-0.001164,-0.00109,-0.001171,-0.001146,-0.001158,-0.001097,-0.001151,-0.001119,-0.00117,-0.0011,-0.00117,-0.001065,-0.001165,-0.001104,-0.001168,-0.00115,-0.001162,-0.001116,-0.001167,-0.001149,-0.001167,-0.001107,-0.001167,-0.001091,-0.001161,-0.001106,-0.001165,-0.001088,-0.001116,-0.001048,-0.001164,-0.001084,-0.001161,-0.00107,-0.001161,-0.001083,-0.001132,-0.001073,-0.00109,-0.00107,-0.001149,-0.001057,-0.001158,-0.001109,-0.001149,-0.001086,-0.001158,-0.001097,-0.00115,-0.001035,-0.001158,-0.001099,-0.001155,-0.0011,-0.001155,-0.00112,-0.001155,-0.001108,-0.001154,-0.001155,-0.001154,-0.001082,-0.001123,-0.00109,-0.001144,-0.001068,-0.001151,-0.001078,-0.001141,-0.001094,-0.001149,-0.001114,-0.001147,-0.001081,-0.001151,-0.000999,-0.00113,-0.001032,-0.001144,-0.001129,-0.001145,-0.001076,-0.001147,-0.001053,-0.00114,-0.001107,-0.001147,-0.001076,-0.001146,-0.00106,-0.001144,-0.001097,-0.00114,-0.001084,-0.001144,-0.001093,-0.000957,-0.001133,-0.001142,-0.001059,-0.001117,-0.001049,-0.00114,-0.001051,-0.001139,-0.001089,-0.001138,-0.0011,-0.00111,-0.001087,-0.001139,-0.0011,-0.001139,-0.001057,-0.001136,-0.001061,-0.001034,-0.000961,-0.001137,-0.001124,-0.001131,-0.001084,-0.001134,-0.001062,-0.001047,-0.001055,-0.001132,-0.001105,-0.001134,-0.001085,-0.001134,-0.001076,-0.001133,-0.001064,-0.001131,-0.000883,-0.001132,-0.001114,-0.00113,-0.001066,-0.001131,-0.001059,-0.00113,-0.001078,-0.001128,-0.00103,-0.001095,-0.001017,-0.001094,-0.001082,-0.001094,-0.001053,-0.001093,-0.001033,-0.001093,-0.001053,-0.00109,-0.001044,-0.001091,-0.001002,-0.001082,-0.00105,-0.001091,-0.00103,-0.00109,-0.001,-0.001086,-0.001011,-0.001088,-0.001025,-0.001088,-0.001037,-0.001088,-0.001,-0.001084,-0.000995,-0.001072,-0.00101,-0.001086,-0.001025,-0.001086,-0.000986,-0.001085,-0.001046,-0.001085,-0.00102,-0.00108,-0.000948,-0.001083,-0.001068,-0.001083,-0.001083,-0.001082,-0.001016,-0.001081,-0.000994,-0.001061,-0.001026,-0.001081,-0.001063,-0.001073,-0.001007,-0.001079,-0.001035,-0.001076,-0.000861,-0.001072,-0.00104,-0.001077,-0.000987,-0.001062,-0.001063,-0.001067,-0.001059,-0.001069,-0.000976,-0.001074,-0.001031,-0.001075,-0.001036,-0.001073,-0.001066,-0.001057,-0.000995,-0.000724,-0.001048,-0.001051,-0.000994,-0.001073,-0.001045,-0.001069,-0.001013,-0.001072,-0.001025],"imag":[0,-0.497243,0.018673,-0.020198,-0.017604,-0.430734,0.488347,-0.157997,-0.023562,0.260166,0.076547,0.124548,0.01569,0.070011,0.057046,-0.01783,-0.032054,0.083384,-0.011498,-0.047527,-0.003573,0.110977,-0.006572,0.006369,0.00763,0.001274,0.004114,-0.009236,0.000347,0.00093,0.004793,-0.003242,0.015217,0.037997,-0.00386,0.015361,0.014582,0.001194,0.005652,0.000463,-0.007904,-0.000293,0.00921,-0.013974,-0.006174,-0.006603,0.014409,0.003326,-0.004958,0.004583,0.00883,-0.009965,-0.002324,-0.037972,0.013709,0.005383,-0.005886,-0.002452,-0.000305,-0.002838,0.000542,-0.000667,0.002558,-0.000528,-0.003103,0.000582,0.001331,0.001201,0.005073,-0.002067,-0.000744,-0.002453,0.004466,0.008069,-0.009327,-0.001561,-0.006064,-0.002048,0.000781,-0.000858,-0.001096,0.000545,0.000719,0.000675,0.001862,0.00112,-0.00112,-0.00195,0.000839,-0.000938,-0.002301,-0.00161,-0.001311,-0.000934,-0.002205,0.001769,0.001188,-0.000577,-0.00041,-0.001239,0.001265,-0.001105,0.000534,0.000084,-0.001053,-0.000357,-0.000989,-0.001426,-0.000273,0.000981,0.000951,-0.000112,-0.000047,-0.000612,0.000828,-0.001537,0.000381,-0.000968,0.00064,0.000567,0.000455,-0.000374,-0.000633,0.00105,0.001184,-0.000106,-0.000103,-0.000525,-0.000327,-0.000055,0.000708,0.000173,-0.000066,0.000259,-0.000115,-0.00009,0.000234,-0.000299,0.000142,0.000701,0.000784,-0.00052,0.000193,-0.00052,0.00029,0.000448,-0.000103,-0.000102,-0.000335,0.000021,0.000142,0.000055,-0.000044,0.000113,0.000146,0.000098,0.000058,-0.000026,0.00001,0.000109,0.000077,0.000051,0.000039,0.000156,0.000058,-0.000233,-0.00017,-0.000126,-0.000047,-0.000045,-0.000231,0.000226,-0.000321,0.000305,0.000487,0.00006,-0.00032,0,-0.000052,-0.000099,0.000117,0.000026,-0.000122,0.000228,-0.000024,-0.000004,-0.000123,-0.000248,-0.000399,0.000292,0.000486,-0.000293,-0.000254,0.000197,0.000148,0.000095,-0.000256,0.000184,-0.000635,0.00038,-0.00015,0.000129,0.000024,0.000075,0.000548,0.000029,-0.000315,-0.000201,0.000002,-0.000206,0.000047,0.00015,-0.000116,0.000309,-0.000154,0.000334,-0.000049,0.000184,0.00023,-0.000446,-0.000186,-0.000176,-0.000149,0.000213,0.000029,0.000493,-0.00022,-0.000142,0.000205,0.00022,0.000266,0.000121,0.000077,-0.000119,-0.000065,0.000332,0.00124,-0.000203,-0.000139,-0.001462,0.000301,0.000314,-0.000219,-0.000098,-0.000252,0.000218,-0.000047,-0.000133,-0.000012,-0.000323,-0.000052,-0.000091,-0.000042,-0.000419,-0.000781,0.000569,-0.001397,-0.001408,0.001295,0.000453,-0.00025,0.000224,-0.00107,0.000972,0.001245,0.00057,-0.00107,0.000366,-0.00149,-0.001621,-0.001005,0.001505,-0.001444,-0.001488,-0.00149,0.001283,0.000922,0.001287,-0.000545,-0.001911,0.000747,0.00171,-0.000511,-0.001379,-0.001142,-0.000048,-0.00083,0.002135,0.000791,-0.001165,-0.001958,-0.002085,0.002916,0.002356,-0.002721,-0.002436,-0.000982,-0.001905,-0.001661,0.000379,0.000759,-0.002748,0.001937,-0.00155,-0.000709,-0.002839,-0.000282,-0.00259,-0.002592,-0.002557,-0.002248,-0.002205,-0.00223,-0.002452,-0.001017,-0.002122,-0.001801,-0.001912,-0.001346,-0.001617,-0.001279,-0.001147,-0.001273,-0.001177,-0.000927,-0.000984,-0.001199,-0.001172,-0.000972,-0.000978,-0.001241,-0.001251,-0.001019,-0.001005,-0.001287,-0.00131,-0.001055,-0.001013,-0.001321,-0.001356,-0.001078,-0.001015,-0.001352,-0.001484,-0.001168,-0.001078,-0.00146,-0.001522,-0.001178,-0.001073,-0.001477,-0.001546,-0.001189,-0.001062,-0.0015,-0.001575,-0.00123,-0.001086,-0.001551,-0.001645,-0.001233,-0.001075,-0.001565,-0.001662,-0.001223,-0.001063,-0.001572,-0.001684,-0.001233,-0.001049,-0.001581,-0.001688,-0.00123,-0.001033,-0.001683,-0.00181,-0.001304,-0.001079,-0.001686,-0.00182,-0.001296,-0.001065,-0.00169,-0.001822,-0.001293,-0.001043,-0.001686,-0.001831,-0.001277,-0.001011,-0.001681,-0.001836,-0.001274,-0.001001,-0.001692,-0.001835,-0.00127,-0.000987,-0.001684,-0.001835,-0.001257,-0.000967,-0.001736,-0.001891,-0.001289,-0.000969,-0.001746,-0.001899,-0.001281,-0.000955,-0.00172,-0.001889,-0.001269,-0.000939,-0.00173,-0.001889,-0.001258,-0.000917,-0.001721,-0.001894,-0.001239,-0.000897,-0.001718,-0.001889,-0.001246,-0.000882,-0.001708,-0.001884,-0.001225,-0.000859,-0.001693,-0.001886,-0.001216,-0.000834,-0.001692,-0.001882,-0.0012,-0.000822,-0.001676,-0.001818,-0.001154,-0.000767,-0.00162,-0.001815,-0.001147,-0.00076,-0.001617,-0.001807,-0.001135,-0.000731,-0.001605,-0.001803,-0.001092,-0.000704,-0.001555,-0.001743,-0.001072,-0.00068,-0.001543,-0.001741,-0.001065,-0.000664,-0.001538,-0.001736,-0.001051,-0.00064,-0.001526,-0.001722,-0.001047,-0.00064,-0.001518,-0.001713,-0.001039,-0.000614,-0.001511,-0.001709,-0.001027,-0.000595,-0.0015,-0.001708,-0.00102,-0.000581,-0.001488,-0.001699,-0.001004,-0.000572,-0.001478,-0.001691,-0.00099,-0.000553,-0.001478,-0.001689,-0.000976,-0.000538,-0.001469,-0.001674,-0.000977,-0.000526,-0.001466,-0.001669,-0.000969,-0.000519,-0.00146,-0.001661,-0.00095,-0.00049,-0.001405,-0.001663,-0.000943,-0.000485,-0.001425,-0.001647,-0.000943,-0.000461,-0.001429,-0.001646,-0.000916,-0.000446,-0.001395,-0.001637,-0.000911,-0.000446,-0.001396,-0.00163,-0.000908,-0.000429,-0.001386,-0.001626,-0.000897,-0.000412,-0.001386,-0.001615,-0.000889,-0.000382,-0.001381,-0.001605,-0.000887,-0.000375,-0.001367,-0.001601,-0.000869,-0.00037,-0.001362,-0.001596,-0.000867,-0.000361,-0.001342,-0.001596,-0.000846,-0.000356,-0.001337,-0.001581,-0.00086,-0.000336,-0.001335,-0.001578,-0.000843,-0.000324,-0.001318,-0.001573,-0.000833,-0.000302,-0.001301,-0.001569,-0.000811,-0.000312,-0.001301,-0.001557,-0.000816,-0.000307,-0.001291,-0.00155,-0.000803,-0.00029,-0.001296,-0.00154,-0.000778,-0.000255,-0.001239,-0.001497,-0.000769,-0.000249,-0.001238,-0.001482,-0.000758,-0.000234,-0.001221,-0.001483,-0.000746,-0.000226,-0.001221,-0.001469,-0.000736,-0.000236,-0.001203,-0.001467,-0.000731,-0.000221,-0.001179,-0.001439,-0.000736,-0.000213,-0.001188,-0.001444,-0.000741,-0.000186,-0.001188,-0.001444,-0.000726,-0.000201,-0.001148,-0.001435,-0.000726,-0.000173,-0.001178,-0.001422,-0.000704,-0.000168,-0.001131,-0.001415,-0.000696,-0.000176,-0.00115,-0.001412,-0.000666,-0.000158,-0.001127,-0.001415,-0.000663,-0.000151,-0.001143,-0.001394,-0.000688,-0.000128,-0.00113,-0.001384,-0.000668,-0.000123,-0.001127,-0.001402,-0.000703,-0.000108,-0.0011,-0.001387,-0.000651,-0.000131,-0.001103,-0.001381,-0.00067,-0.00006,-0.00109,-0.001374,-0.000661,-0.000103,-0.001025,-0.001363,-0.000623,-0.000063,-0.001075,-0.001356,-0.000598,-0.000078,-0.000877,-0.001389,-0.000535,-0.000065,-0.001032,-0.001474,-0.000342,-0.000065,-0.001105,-0.001379,-0.000598,0.000035,-0.001045,-0.001303,-0.00059,-0.000055,-0.000754,-0.001445,-0.000633,-0.00005,-0.000703,-0.001223,-0.000535,-0.000005,-0.001015,-0.001313,-0.000605,0.000008,-0.001316,-0.001306,-0.000568,-0.000028,-0.001002,-0.001299,-0.000573,-0.000018,-0.000947,-0.001301,-0.000565,0.000018,-0.000982,-0.001314,-0.000565,-0.000018,-0.000972,-0.001299,-0.000568,0.000005,-0.000987,-0.001266,-0.000552,0.000015,-0.000959,-0.001279,-0.000557,0.000025,-0.000967,-0.001299,-0.00057,0.000013,-0.000989,-0.001261,-0.00055,0.000062,-0.001065,-0.001244,-0.000554,0.000034,-0.000956,-0.001269,-0.000542,0.000049,-0.000945,-0.001251,-0.000554,0.000083,-0.000927,-0.001269,-0.000529,0.00007,-0.000919,-0.001254,-0.000534,0.000057,-0.000927,-0.001251,-0.000503,0.000075,-0.000938,-0.001212,-0.000508,0.000083,-0.000938,-0.001239,-0.000518,0.000073,-0.00091,-0.001217,-0.00051,0.00006,-0.000866,-0.001233,-0.000502,0.000073,-0.000858,-0.001215,-0.0005,0.000073,-0.00086,-0.001225,-0.000489,0.000093,-0.000863,-0.001182,-0.000482,0.00014,-0.000888,-0.00121,-0.000489,0.000104,-0.000891,-0.001168,-0.000492,0.000142,-0.000852,-0.00119,-0.000464,0.000101,-0.000822,-0.001194,-0.000472,0.000117,-0.000803,-0.001178,-0.000471,0.000145,-0.000893,-0.001179,-0.000474,0.000145,-0.000837,-0.001178,-0.000451,0.000127,-0.000829,-0.001166,-0.000451,0.000137,-0.000824,-0.001155,-0.000438,0.000153,-0.000821,-0.00116,-0.000443,0.000137,-0.000811,-0.00113,-0.000448,0.000124,-0.000769,-0.00115,-0.00044,0.000155,-0.000767,-0.001135,-0.00044,0.000145,-0.000803,-0.001157,-0.000435,0.000166,-0.000785,-0.001145,-0.000435,0.000184,-0.000779,-0.001137,-0.000445,0.000176,-0.000782,-0.001135,-0.000422,0.000184,-0.000751,-0.001124,-0.00042,0.000187,-0.000753,-0.001123,-0.000422,0.000174,-0.000746,-0.001114,-0.000417,0.000174,-0.000764,-0.001114,-0.000414,0.000205,-0.000748,-0.001103,-0.000409,0.000184,-0.000736,-0.001091,-0.000409,0.00021,-0.000723,-0.001091,-0.000396,0.000199,-0.000733,-0.001122,-0.000389,0.000215,-0.000733,-0.001093,-0.000396,0.00021,-0.000736,-0.001091,-0.000396,0.000212,-0.000712,-0.001091,-0.000383,0.000197,-0.00073,-0.0011,-0.000399,0.000218,-0.000707,-0.001079,-0.000372,0.000228,-0.000722,-0.001047,-0.000388,0.000218,-0.000707,-0.001076,-0.000379,0.000218,-0.0007,-0.001056,-0.000379,0.000205,-0.000672,-0.001067,-0.000372,0.000199,-0.000688,-0.00106,-0.000366,0.000228,-0.000658,-0.001076,-0.000369,0.000234,-0.000671,-0.001024,-0.000353,0.000241,-0.000677,-0.001041,-0.000366,0.000228,-0.000697,-0.00104,-0.00034,0.000257,-0.000684,-0.001032,-0.00035,0.000247,-0.000649,-0.001033,-0.000331,0.000247,-0.000648,-0.001031,-0.00034,0.000251,-0.000603,-0.001018,-0.000341,0.00027,-0.000607,-0.001021,-0.000356,0.000257,-0.000594,-0.001015,-0.000347,0.000254,-0.000616,-0.000989,-0.000347,0.000257,-0.000603,-0.001005,-0.000328,0.000276,-0.000617,-0.001005,-0.000315,0.00026,-0.00063,-0.000996,-0.000302,0.000267,-0.00062,-0.000989,-0.000331,0.000289,-0.000607,-0.001005,-0.000311,0.000276,-0.000613,-0.00098,-0.000308,0.00028,-0.000594,-0.001008,-0.000321,0.000302,-0.000584,-0.000972,-0.000324,0.000279,-0.000562,-0.000977,-0.000305,0.000273,-0.000575,-0.000976,-0.000302,0.000266,-0.000562,-0.001017,-0.000305,0.000308,-0.000591,-0.000991,-0.000327,0.000286,-0.000575,-0.000986,-0.000302,0.000324,-0.000523,-0.000945,-0.000289,0.000273,-0.000626,-0.001002,-0.000308,0.000318,-0.000629,-0.000964,-0.000289,0.000273,-0.000498,-0.000957,-0.000295,0.000299,-0.000337,-0.000954,-0.000308,0.000331,-0.000565,-0.000947,-0.000299,0.000254,-0.000527,-0.000944,-0.000276,0.000279,-0.000553,-0.000944,-0.000273,0.000318,-0.000571,-0.000953,-0.000283,0.000308,-0.00052,-0.000919,-0.000271,0.000274,-0.000505,-0.000906,-0.000268,0.000314,-0.000508,-0.000932,-0.000274,0.000321,-0.000492,-0.000893,-0.000286,0.000296,-0.000479,-0.000922,-0.000265,0.000302,-0.000542,-0.000881,-0.000249,0.00033,-0.000467,-0.000906,-0.000258,0.000321,-0.000452,-0.000872,-0.000252,0.000299,-0.000499,-0.000884,-0.000265,0.000339,-0.000501,-0.000891,-0.000265,0.000327,-0.000498,-0.000893,-0.000258,0.000318,-0.000498,-0.000888,-0.000243,0.000324,-0.000486,-0.000871,-0.000243,0.00033,-0.00048,-0.000869,-0.000246,0.000321,-0.000498,-0.000853,-0.00024,0.000297,-0.000476,-0.000872,-0.000232,0.00031,-0.000428,-0.000887,-0.000249,0.000323,-0.000441,-0.000882,-0.000253,0.000349,-0.000454,-0.00087,-0.000231,0.000349,-0.00048,-0.000859,-0.000232,0.000336,-0.000436,-0.000865,-0.000223,0.000332,-0.000475,-0.000842,-0.000245,0.000336,-0.000423,-0.000834,-0.000227,0.000345,-0.000437,-0.000833,-0.000231,0.000331,-0.000419,-0.000855,-0.000214,0.000336,-0.000432,-0.00083,-0.000231,0.000358,-0.000411,-0.000833,-0.000218,0.000349,-0.00041,-0.000834,-0.000227,0.000353,-0.000449,-0.000837,-0.00021,0.000336,-0.000414,-0.000852,-0.000205,0.000376,-0.000415,-0.000821,-0.000201,0.000345,-0.000393,-0.000812,-0.000222,0.000363,-0.000437,-0.000798,-0.000227,0.000354,-0.000415,-0.000825,-0.000218,0.000362,-0.000401,-0.000852,-0.000205,0.000354,-0.000358,-0.000829,-0.000205,0.000375,-0.00041,-0.000833,-0.00021,0.00038,-0.000397,-0.000795,-0.000183,0.000371,-0.000411,-0.000722,-0.000181,0.000321,-0.00039,-0.000722,-0.000189,0.000301,-0.000347,-0.000707,-0.000166,0.000324,-0.000305,-0.000695,-0.000185,0.000328,-0.000313,-0.000722,-0.000174,0.000293,-0.000321,-0.000676,-0.000151,0.000348,-0.000316,-0.000679,-0.000178,0.000317,-0.000309,-0.000698,-0.000182,0.000317,-0.000301,-0.000699,-0.000201,0.000332,-0.000305,-0.000671,-0.000166,0.00034,-0.000317,-0.000707,-0.00017,0.000347,-0.000352,-0.000695,-0.000158,0.000348,-0.000293,-0.000688,-0.000139,0.000328,-0.000348,-0.000679,-0.000143,0.000332,-0.000367,-0.00069,-0.000143,0.000328,-0.000375,-0.000664,-0.00015,0.000297,-0.000332,-0.000657,-0.000158,0.000359,-0.000274,-0.000671,-0.000108,0.00032,-0.000413,-0.000698,-0.000162,0.000328,-0.000305,-0.000672,-0.000162,0.000355,-0.000398,-0.000657,-0.000162,0.000382,-0.000263,-0.000676,-0.000143,0.000386,-0.000305,-0.000699,-0.000116,0.000332,-0.000394,-0.000676,-0.000139,0.000332,-0.000243,-0.000664,-0.000151,0.000301,-0.000216,-0.000667,-0.000181,0.000325,-0.000316,-0.000668,-0.000143,0.000305,-0.000324,-0.000641,-0.000153,0.000353,-0.00028,-0.000686,-0.000126,0.000354,-0.000305,-0.000664,-0.00017,0.00038,-0.00031,-0.000654,-0.000131,0.000362,-0.000258,-0.000637,-0.000131,0.000258,-0.000214,-0.000659,-0.000113,0.00035,-0.000222,-0.00055,-0.000127,0.000498,-0.000249,-0.000668,-0.000275,0.00055,-0.000314,-0.000668,-0.000184,0.000336,-0.000126,-0.000634,-0.000113,0.000354,-0.00021,-0.000524,-0.000227,0.000305,-0.000175,-0.00051,-0.000087,0.000485,-0.000275,-0.000571,-0.000162,0.000327,-0.000301,-0.000799,-0.000105,0.000371,-0.000266,-0.000602,-0.000109,0.000332,-0.00017,-0.000633,-0.0001,0.000336,-0.000275,-0.000607,-0.00014,0.000366,-0.000262,-0.000668,-0.000127,0.000349,-0.000296,-0.000589,-0.000131,0.000354,-0.000283,-0.000624,-0.000109,0.000345,-0.000292,-0.000607,-0.000105,0.000323,-0.000271,-0.000682,-0.000109,0.00038,-0.000144,-0.000773,-0.000157,0.000385,-0.000122,-0.000632,-0.000135,0.000323,-0.00024,-0.000633,-0.000135,0.000267,-0.000127,-0.00065,-0.000092,0.000327,-0.000331,-0.000642,-0.000105,0.000427,-0.000205,-0.000643,-0.000109,0.00034,-0.000253,-0.000606,-0.000122,0.00035,-0.00024,-0.000607,-0.0001,0.000314,-0.000162,-0.000628,-0.000149,0.000371,-0.000188,-0.000625,-0.000113,0.000371,-0.000214,-0.000615,-0.000118,0.000379,-0.000231,-0.000672,-0.000083,0.000397,-0.000162,-0.000597,-0.000122,0.000385,-0.000301,-0.000607,-0.000118,0.000357,-0.000196,-0.000641,-0.000052,0.000358,-0.000188,-0.000625,-0.000096,0.000341,-0.000302,-0.000593,-0.000105,0.000341,-0.00024,-0.000625,-0.000096,0.000367,-0.000183,-0.000615,-0.000109,0.000345,-0.000209,-0.000607,-0.000092,0.000367,-0.000192,-0.000602,-0.0001,0.000345,-0.000135,-0.000607,-0.000092,0.000363,-0.000262,-0.000581,-0.000113,0.000345,-0.000157,-0.00058,-0.000083,0.000406,-0.000196,-0.000581,-0.000087,0.000397,-0.00014,-0.000589,-0.000105,0.000371,-0.000205,-0.000594,-0.000087,0.000367,-0.000157,-0.00058,-0.000083,0.000371,-0.000245,-0.000581,-0.000122,0.000401,-0.000222,-0.00058,-0.000109,0.000327,-0.000179,-0.000545,-0.000074,0.000353,-0.000153,-0.00058,-0.000074,0.00038,-0.000157,-0.000545,-0.000057,0.000367,-0.000144,-0.00055,-0.000079,0.000406,-0.000144,-0.000572,-0.000087,0.00035,-0.000157,-0.000581,-0.0001,0.000397,-0.000166,-0.000529,-0.00007,0.00035,-0.000135,-0.000611,-0.000092,0.000349,-0.000183,-0.000564,-0.000109,0.000301,-0.000148,-0.000554,-0.000083,0.000349,-0.000136,-0.000567,-0.000105,0.000406,-0.00017,-0.000572,-0.000057,0.000362,-0.00014,-0.000555,-0.000079,0.000428,-0.000214,-0.000554,-0.000083,0.000415,-0.000148,-0.000537,-0.000092,0.000393,-0.000218,-0.000524,-0.000066,0.000379,-0.000127,-0.000554,-0.000087,0.0004,-0.000125,-0.000567,-0.00006,0.000344,-0.000158,-0.000533,-0.00007,0.000394,-0.000204,-0.000557,-0.000046,0.000357,-0.000107,-0.000557,-0.00007,0.000381,-0.000098,-0.000548,-0.00007,0.000357,-0.000177,-0.000534,-0.000079,0.000389,-0.00019,-0.000575,-0.000093,0.000409,-0.000213,-0.000548,-0.000056,0.000353,-0.00013,-0.00053,-0.000005,0.000376,-0.000181,-0.000552,-0.000046,0.000372,-0.000195,-0.000501,-0.00006,0.000395,-0.000139,-0.000506,-0.000074,0.000409,-0.000116,-0.000529,-0.000079,0.00038,-0.000139,-0.00053,-0.000074,0.000395,-0.00013,-0.000543,-0.000042,0.000394,-0.00013,-0.000534,-0.00007,0.000404,-0.000139,-0.000484,-0.000049,0.000362,-0.000111,-0.000444,-0.000053,0.000345,-0.000066,-0.000484,-0.000041,0.000366,-0.00007,-0.000493,-0.000058,0.000349,-0.000074,-0.000464,-0.00007,0.000234,-0.000033,-0.00048,-0.000074,0.000308,-0.000107,-0.000533,-0.00007,0.000217,-0.000086,-0.000476,-0.000094,0.000303,-0.000035,-0.000506,-0.000044,0.000367,-0.000187,-0.000528,-0.00017,0.000275,-0.000232,-0.000397,0.000192,0.000258,-0.000157,-0.000459,-0.000031,0.000463,-0.000227,-0.000453,-0.000105,0.000231,-0.0001,-0.000394,-0.000031,0.000188,-0.000262,-0.000306,-0.000026,0.000459,-0.000175,-0.000519,-0.000057,0.000489,-0.000345,-0.000562,-0.000092,0.000297,-0.000171,-0.00045,0.000017,0.000363,-0.00028,-0.00045,-0.000031,0.000319,0.000026,-0.000519,-0.000057,0.000423,-0.000179,-0.000459,-0.000017,0.00034,-0.000118,-0.000519,-0.000044,0.000284,-0.000118,-0.000388,-0.0001,0.000367,-0.000131,-0.000371,0.000017,-0.00007,-0.000131,-0.000531,0.000455,0.000388,-0.000118,-0.000458,-0.000017,0.000384,0.000048,-0.000375,0.000017,0.000336,-0.000209,-0.000345,-0.000031,0.000581,-0.000096,-0.000479,-0.000057,0.000266,-0.000022,-0.000388,-0.000061,0.000498,-0.000148,-0.000376,-0.000028,0.000362,-0.000073,-0.000486,-0.000039,0.00038,-0.000189,-0.000436,0.000061,0.000317,-0.000061,-0.000408,-0.000045,0.00044,-0.000362,-0.000386,-0.000022,0.000323,0.000006,-0.000418,-0.000061,0.00028,0.000089,-0.000392,-0.000095,0.000317,-0.000184,-0.000457,-0.00005,0.000362,-0.000067,-0.00052,-0.000039,0.000167,-0.000039,-0.000402,-0.000073,0.000296,0.000106,-0.000401,-0.000022,0.000424,-0.00015,-0.000436,-0.000067,0.000251,-0.000185,-0.000412,0.000218,0.000345,-0.000061,-0.000402,0.000028,0.000485,-0.000111,-0.000385,-0.000045,0.000212,-0.000128,-0.000346,0.00005,0.000206,-0.000011,-0.000369,-0.000017,0.000414,-0.000106,-0.000369,0.000017,0.000418,-0.000335,-0.000507,-0.000022,0.000425,-0.000084,-0.000457,0.000061,0.000424,-0.000262,-0.000447,-0.000402,0.000451,0.000167,-0.000481,-0.000072,0.00034,-0.000162,-0.000407,0.000062,0.000373,-0.00014,-0.00052,0.000011,0.000363,0.000067,-0.000358,-0.000061,0.00029,-0.000061,-0.00033,0.00005,0.000022,0.000045,-0.000402,0.000268,0.00038,-0.000151,-0.000436,-0.000061,0.000408,0.000162,-0.000363,0.000084,0.00029,-0.0001,-0.000396,-0.000006,0.00057,-0.000212,-0.000507,-0.000112,0.000212,-0.000089,-0.000401,-0.000056,0.000457,-0.000134,-0.000302,0.000022,0.000396,0.000006,-0.000435,-0.000056,0.000329,-0.000112,-0.000369,-0.000039,0.00034,-0.000627,-0.000156,0.000056,0.000429,-0.00024,-0.000452,0.000078,0.000447,0.000078,-0.000341,-0.000084,0.000302,0.000262,-0.000345,-0.000039,0.000296,0,-0.000425,-0.000084,0.000413,0.000475,-0.000609,-0.000017,0.000173,0.000117,-0.000341,-0.000078,0.000403,0.00044,-0.000419,-0.000089,0.000257,0.000017,-0.00033,-0.000034,0.000357,-0.000045,-0.00039,0.000061,0.00071,0,-0.000201,0.000067,0.000379,-0.000006,-0.000396,0.000028,0.000341,-0.000073,-0.000374,0.000038,0.000406,-0.000022,-0.000162,-0.000005,0.000297,-0.000038,-0.000357,0,0.000292,0.000076,-0.000319,0.000054,0.000433,0.000141,-0.000298,0.000011,0.000358,0,-0.000433,-0.000086,0.000406,0.00006,-0.000369,-0.000027,0.00033,-0.000022,-0.000427,0.000087,0.000438,-0.000179,-0.0004,0.000043,0.000358,-0.000016,-0.000455,0.000016,0.000287,-0.000011,-0.000367,0.000092,0.000526,0.000032,-0.000184,-0.000022,0.000011,-0.000038,-0.000373,-0.000038,0.000427,0.000211,-0.000342,0.000016,0.000195,0.000125,-0.00039,-0.000038,0.000309,-0.000087,-0.00065,-0.000124,0.000287,-0.000049,-0.000434,0.000184,0.000179,-0.000152,-0.000195,0.00013,0.000455,-0.000076,-0.000309,0.000043,0.000288,-0.000076,-0.000141,-0.000195,0.000406,-0.000794,-0.000232,0.000217,0.000405,0,-0.000244,0.000092,0.000352,-0.000011,-0.000314]},
      organ_3:{"real":[0,0,-0.06072,0.030357,-0.015136,0.006684,-0.003512,0.002544,-0.002455,0.002315,-0.001264,0.004643,-0.000089,0.000353,-0.000165,0.000152,-0.000145,0.000184,-0.000123,0.000216,-0.000135,0.000222,-0.000219,0.000066,-0.000701,0.000387,-0.000125,0.000341,-0.000117,0.004817,-0.000568,0.003995,-0.000035,0.000438,-0.00028,0.000426,-0.000038,0.000078,-0.000108,0.000272,-0.000161,0.000111,-0.000165,0.000191,-0.000156,0.000209,-0.000072,0.000054,-0.000111,0.001741,-0.000161,0.001192,-0.000127,0.000053,-0.000044,0.000062,-0.000095,0.00002,-0.000102,0.000148,-0.000051,0.00015,-0.0001,0.000096,-0.000095,0.000115,-0.000081,0.000062,-0.000022,0.000134,-0.00008,0.000184,-0.000018,0.000023,-0.000044,0.000049,-0.000057,0.000024,-0.000033,0.000035,-0.000057,0.000031,-0.000044,0.000043,-0.00001,0.000004,-0.000062,0.000016,-0.00005,0.000062,-0.000051,0.00009,-0.000036,0.000029,-0.00005,0.000029,-0.000025,0.000035,-0.000036,0.000031,-0.000028,0.000038,-0.000064,0.000014,-0.000031,0.000025,-0.000042,0.000032,-0.000045,0.000076,-0.000025,0.000021,-0.000029,0.000057,-0.000019,0.000003,-0.000039,0.000062,-0.000035,0.000027,-0.000024,0.000003,-0.000051,0.000041,-0.000047,0.000043,-0.000039,0.000036,-0.000045,0.000025,-0.000067,0.000029,-0.000021,0.000022,-0.000038,0.000047,-0.000029,0.000021,-0.000037,0.000022,-0.000047,0.000017,-0.000051,0.000041,-0.000031,0.000025,-0.000013,0.000018,-0.000041,0.000015,-0.000018,0.000015,-0.000022,0.00003,-0.00003,0.000021,-0.000027,0.000044,-0.000023,0.000019,-0.000024,0.00001,-0.00002,0.000045,-0.000038,0.000014,-0.000017,0.000022,-0.000025,0.00002,-0.00001,0.000025,-0.000004,0.000008,-0.000013,0.000012,-0.000028,0.000023,-0.000022,0.000027,-0.000008,0.000021,-0.000016,0.000007,-0.000022,0.000025,-0.000008,0.000005,-0.000005,0.000024,-0.000025,0.000015,-0.000017,0.000015,-0.000012,0.000027,-0.000023,0.000033,-0.000004,0.000018,-0.000026,0.000013,-0.000012,0.000017,-0.000021,0.000004,-0.000015,0.000013,-0.000002,0.000018,-0.000011,0.000009,-0.000016,0.000007,-0.000009,0.000007,-0.000009,0.00001,-0.000018,0.000027,-0.000011,0.000009,-0.000012,0.000015,-0.000019,0.000006,-0.000008,0.00001,-0.000007,0.000013,-0.000005,0.000008,-0.000018,0.000016,-0.000015,0.000007,-0.000011,0.000018,-0.000012,0.00001,-0.000019,0.000008,-0.000008,0.000005,-0.000001,0.000016,-0.000008,0.000011,-0.000002,0.000008,-0.000013,0.000019,-0.000005,0.00001,-0.000012,0.000015,-0.000016,0.000017,-0.000013,0.000007,-0.000013,0.000022,-0.000012,0.000015,-0.000012,0.00001,-0.000009,0.000016,-0.000012,0.000007,-0.000008,0.000011,-0.000007,0.000015,-0.000005,0.000008,-0.000001,0.000009,-0.000015,0.000001,-0.000012,0.000013,-0.000012,0.000007,-0.000013,0.000011,-0.000013,0.000006,-0.000008,0.000012,-0.000005,0.000004,-0.000005,0.000006,-0.000013,0.000012,-0.00001,0.000006,-0.000007,0.000016,-0.00001,0.000006,-0.000006,0.000007,-0.000007,0.000009,-0.000009,0.000009,-0.000008,0.000009,-0.000008,0.000008,-0.000008,0.000007,-0.000008,0.000008,-0.000008,0.000008,-0.000008,0.000008,-0.000008,0.000008,-0.000008,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000007,0.000007,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000006,0.000006,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000005,-0.000005,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000004,0.000004,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002],"imag":[0,0.168526,0,0,0,0,0,0,0,0,0,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,-0.000001,0,0,0,0,0.000006,-0.000001,0.000006,0,0.000001,0,0.000001,0,0,0,0.000001,0,0,0,0.000001,0,0.000001,0,0,0,0.000006,-0.000001,0.000005,-0.000001,0,0,0,0,0,-0.000001,0.000001,0,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0,0,0.000001,-0.000001,0.000001,0,0,0,0,0,0,0,0,-0.000001,0,0,0,0,0,-0.000001,0,-0.000001,0.000001,-0.000001,0.000001,0,0,-0.000001,0,0,0,-0.000001,0,0,0.000001,-0.000001,0,-0.000001,0,-0.000001,0.000001,-0.000001,0.000001,0,0,-0.000001,0.000001,0,0,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000001,-0.000001,0.000001,0,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0,-0.000001,0.000002,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0.000001,0,0,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0.000001,-0.000001,0,-0.000001,0.000001,0,0,0,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000002,0,0.000001,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0.000001,0,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0.000001,-0.000001,0.000001,0,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000002,0.000001,-0.000001,0,0,0.000001,-0.000001,0.000001,0,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,0,0.000001,-0.000002,0,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000001,-0.000002,0.000001,-0.000001,0.000001,-0.000001,0,-0.000001,0.000001,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000003,0.000002,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000003,-0.000003,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000002,0.000002,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,-0.000001,0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      phoneme_bah:{"real":[0,0.1181,-0.122473,0.127844,-0.073143,0.043407,0.094315,-0.380653,-0.07653,0.247847,0.055678,-0.0735,0.027287,-0.007281,0.002293,0.002653,-0.003439,0.003164,-0.002488,-0.000529,0.000312,-0.004436,0.003399,-0.002844,-0.004209,0.008726,-0.009305,-0.00434,0.005352,-0.00308,-0.000313,0.000893,-0.000714,0.000653,-0.00133,-0.000277,-0.001315,-0.000592,0.001653,-0.001996,0.00073,0.000286,0.002766,-0.002375,-0.000298,0.002836,-0.001338,0.000144,-0.000428,0.000332,0.000254,0.000018,0.000424,0.000078,0.000044,-0.000245,0.000004,-0.000172,-0.000193,-0.00037,-0.000259,-0.000744,0.00204,-0.000487,0.000788,0.000204,-0.00032,0.000625,0.000203,0.000871,-0.000536,-0.000118,-0.001229,0.000178,0.000025,0.000068,0.00118,-0.001866,0.002409,0.001452,-0.000102,0.000393,0.000268,-0.000143,-0.000188,-0.000509,0.000254,0.000001,0.000078,0.000259,0.000141,-0.000158,0.000351,0.000264,0.000703,0.000726,-0.000166,0.000226,-0.000128,-0.001574,-0.000317,-0.000194,-0.000385,0.000664,-0.000329,0.000386,-0.000636,0.000185,0.000509,0.000183,0.000013,0.000019,-0.00027,0.000004,0.000003,-0.000179,0.000063,-0.000062,-0.000049,-0.000002,-0.000034,-0.000149,0.000003,-0.000106,-0.000008,-0.000125,-0.000044,-0.000051,0.000043,-0.000046,0.00014,-0.000033,0.000256,0.000992,0.000265,-0.00087,-0.000217,-0.000095,0.000243,0.000139,0.000044,-0.000117,0.000017,0.000183,-0.000117,-0.000066,0.000232,-0.000134,-0.0003,0.00013,0.000168,-0.00002,-0.000048,-0.000135,0.000066,-0.000106,-0.000262,0.000236,0.000028,-0.000052,0.0001,-0.000041,0.000013,0.000037,0.000007,0.000089,0.000034,-0.00003,0.000015,0.000003,0.000121,-0.000226,0.000063,0.000056,0.000005,0.000035,-0.000003,-0.000032,-0.000045,-0.000002,-0.000003,0.000007,-0.000033,0.000076,-0.000038,-0.000033,-0.000004,0.000013,0.000009,-0.000054,-0.000016,0.000023,-0.000051,0.000024,-0.000003,0.000029,0.000014,0.00001,0.000012,-0.000004,0.000035,-0.00002,0.000017,-0.000013,-0.000007,-0.000027,0.000009,-0.000011,-0.000017,0.000038,0.000002,-0.000017,0.000015,0.000029,-0.000006,-0.000013,0.000023,-0.000036,0.000006,0.000009,-0.000019,-0.000031,0.000022,0.000025,-0.00002,-0.000005,-0.00003,0.00008,-0.00001,0.000022,-0.000021,0.000023,-0.000016,-0.000026,-0.000012,0.000026,-0.000038,-0.000002,0.000016,0.00004,-0.000017,0.000004,0.000019,-0.00002,0.000008,-0.000009,0.000025,-0.000008,-0.000012,-0.000001,0.000023,-0.000084,-0.000049,0.000003,0.000017,-0.000064,-0.000058,0.00003,-0.000004,-0.000013,0.000019,-0.000037,0.000003,-0.000019,-0.000027,0.000095,-0.00004,-0.000068,0.000087,0.000029,-0.00005,-0.000013,0.000076,-0.000016,-0.000095,-0.000049,0.000092,0.000061,-0.000059,0.000025,0.000006,-0.000047,0.000003,-0.000017,-0.000007,-0.000019,0.000029,-0.000043,0.000028,0.00019,0.000079,0.000014,-0.000015,-0.000008,-0.000023,0.000011,0,-0.000022,0.000042,0.000022,-0.000044,0.000004,0.000007,0.000014,-0.000011,-0.000006,-0.000005,0.000003,-0.000008,0.000009,-0.00003,-0.000009,0.000001,-0.000001,0.000004,0.000002,-0.000004,0.000012,0.000003,0.000004,0.000005,-0.000002,0.000002,-0.000002,0,0,-0.000001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,0.01765,-0.135608,-0.085553,0.017943,-0.161677,0.246113,0.324196,-0.153988,0.01488,0.161826,-0.015453,-0.017178,0.001352,-0.012638,0.003186,-0.003899,-0.00125,0.00204,-0.004354,0.002918,-0.002945,-0.001665,0.005463,-0.007636,0.001501,0.003049,-0.006986,0.001681,0.004434,-0.001035,0.000091,-0.001278,-0.000864,-0.000414,-0.0037,0.003329,0.002739,-0.000697,0.000461,0.001086,0.002305,0.002276,-0.001753,-0.00027,0.000578,-0.000425,0.000048,0.000163,-0.000624,-0.000044,-0.000119,0.000171,-0.0003,0.000266,-0.000065,0.000092,-0.000014,-0.000022,-0.000158,0.000109,-0.000397,0.000295,-0.000157,-0.000147,-0.000546,-0.000585,-0.000457,-0.000471,0.000244,-0.000013,0.00044,-0.000118,0.000368,0.000637,-0.000241,0.001319,0.001021,-0.002161,-0.000773,-0.000839,-0.00036,-0.000103,0.000128,0.000382,-0.000294,-0.000278,0.000158,0.000006,0.000308,0.00024,0.000276,-0.00038,-0.000187,-0.000448,0.001617,-0.00052,-0.00094,0.000173,0.000375,-0.000532,0.000673,-0.000591,0.000949,0.000478,0.00041,0.000754,-0.000214,0.000159,0.000062,-0.000145,0.000005,0.000006,-0.000532,0.00013,-0.000128,0.000175,0.000005,0.00006,-0.000107,-0.00004,-0.000064,-0.000025,-0.000251,0.000062,0.00007,0.000033,-0.000008,0.000152,-0.00007,0.000002,-0.000121,-0.000208,0.000344,0.001123,-0.000015,-0.000218,0.000194,-0.000076,-0.000016,-0.000051,-0.000006,-0.000127,0.000024,0.000078,-0.000268,0.000214,0.000457,-0.000124,-0.000198,-0.000088,-0.000098,-0.000076,0.000027,-0.000157,0.000136,-0.000148,-0.000077,0.000306,-0.000037,-0.000045,-0.000013,-0.000127,0.000032,-0.000047,-0.000042,-0.000013,-0.000069,-0.000032,-0.000091,0.000058,0.000054,-0.000164,0.000029,0.000006,-0.000018,-0.000013,0.000041,-0.000015,0.000031,-0.00006,0.000035,-0.000011,-0.000043,0.000042,0.000034,0.000016,-0.000043,0.000028,-0.000007,-0.000003,-0.000018,0.000028,-0.00004,0.000015,-0.000028,0.000091,-0.000023,0.000011,-0.00003,0.000008,0.000033,-0.000014,-0.000003,0.000003,0,-0.000026,0.000017,-0.000017,-0.000007,0.000018,0.000013,-0.000016,-0.000001,0.000039,-0.000011,0,-0.000011,-0.00001,0.000006,-0.000028,0.000013,-0.00003,0.000041,-0.000028,0.000015,0,0.000011,0.000017,-0.000008,0.000016,-0.000029,0.000017,0.000005,-0.000047,0.000016,0.000007,-0.000008,-0.000002,-0.000018,0.000026,-0.000016,0.000006,-0.000014,0.000009,-0.000031,-0.00002,-0.000015,0.000001,0.000001,0.000023,0.000066,-0.000112,-0.000033,0.000037,0.000118,-0.000027,-0.000005,0.000041,-0.000002,0.000025,0.000004,-0.000016,0.000022,-0.000034,0.000009,0.000095,-0.00007,-0.000028,0.000108,0.000013,-0.000107,-0.000036,0.000105,0.000019,-0.000093,-0.000036,0.000069,-0.000016,-0.000041,0.000046,0.000007,-0.000021,0.000021,0.000028,0.000068,0.000032,-0.00008,-0.000208,0.000032,0.000155,0.000069,-0.000005,0.000022,-0.000009,0.000003,-0.000003,0.000004,-0.00002,0.000009,-0.000019,0.000024,-0.000024,-0.000013,-0.000026,0.000022,-0.000013,-0.000012,-0.000001,0.000006,0.000004,-0.000008,0.000001,0,0.000003,0.000011,0.000001,-0.000007,0.000001,-0.000004,0.000005,-0.000002,0,-0.000001,-0.000003,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
      throaty:{"real":[0,0,-0.194984,0.024486,-0.005329,0.001841,-0.001442,0.001335,-0.001597,0.002315,-0.003376,0.004513,-0.004321,0.005474,-0.00615,0.005942,-0.006918,0.006712,-0.00943,0.009179,-0.008948,0.008733,-0.010578,0.010347,-0.01013,0.010554,-0.01035,0.010157,-0.009975,0.009802,-0.009638,0.009481,-0.009333,0.006557,-0.00646,0.006367,-0.006278,0.004556,-0.004496,0.004438,-0.003224,0.003184,-0.003146,0.002667,-0.002637,0.002607,-0.002579,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"imag":[0,0,-0.000001,0,0,0,0,0,0,0,-0.000001,0.000001,-0.000001,0.000001,-0.000002,0.000002,-0.000003,0.000003,-0.000005,0.000005,-0.000005,0.000006,-0.000008,0.000008,-0.000009,0.00001,-0.00001,0.000011,-0.000012,0.000012,-0.000013,0.000014,-0.000014,0.000011,-0.000011,0.000012,-0.000012,0.000009,-0.00001,0.00001,-0.000008,0.000008,-0.000008,0.000007,-0.000008,0.000008,-0.000008,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
    };
    // 'warm_Triangle', 'dropped_Square', 'bass_Amp360', 'bass_Sub_Dub', 'brass',
    // 'celeste', 'chorus_Strings', 'ethnic_33', 'organ_3', 'phoneme_bah', 'throaty'
    AudioPlayer.presetWaveTableLists = Object.keys(AudioPlayer.presetWaveTables);

    audio.AudioPlayer = AudioPlayer;

    return audio;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //

  const foxTess = (function(){
    // special thanks: https://github.com/brendankenny/libtess.js
    /*
     Copyright 2000, Silicon Graphics, Inc. All Rights Reserved.
     Copyright 2015, Google Inc. All Rights Reserved.

     Permission is hereby granted, free of charge, to any person obtaining a copy
     of this software and associated documentation files (the "Software"), to
     deal in the Software without restriction, including without limitation the
     rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
     sell copies of the Software, and to permit persons to whom the Software is
     furnished to do so, subject to the following conditions:

     The above copyright notice including the dates of first publication and
     either this permission notice or a reference to http://oss.sgi.com/projects/FreeB/
     shall be included in all copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
     SILICON GRAPHICS, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
     IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

     Original Code. The Original Code is: OpenGL Sample Implementation,
     Version 1.2.1, released January 26, 2000, developed by Silicon Graphics,
     Inc. The Original Code is Copyright (c) 1991-2000 Silicon Graphics, Inc.
     Copyright in any portions created by third parties is as indicated
     elsewhere herein. All Rights Reserved.
    */
    const tess = {};

    let tessy, tessEnums, tessRules, tessTypes;

    const tessCallbacks = {
      vertex:(data, polyVertArray) => {},
      begin:(type) => {},
      error:(errno) => {},
      combine:(coords, data, weight) => {},
      edge:(flag) => {}
    };

    function initTessy(lib){

      tessy = new lib.GluTesselator();
      tessy.loops = [];
      tessy.size = 2; // 準備。
      tessEnums = lib.gluEnum;
      tessRules = lib.windingRule;
      tessTypes = lib.primitiveType;

      // function called for each vertex of tesselator output
      function cb_vertex(data, polyVertArray) {
        // こっちはしっかりsize長さで取得できるよ。
        tessCallbacks.vertex(data, polyVertArray);
        polyVertArray.push(...data.slice(0, tessy.size));
        if(tessy.loops.length > 0){
          tessy.loops[tessy.loops.length-1].push(...data.slice(0, tessy.size));
        }
      }
      function cb_begin(type) {
        // ここで区切りがつくので、ここで区切るたびにcontourを分離すればいいみたいです。
        tessCallbacks.begin(type);
        if(type === tessTypes.GL_LINE_LOOP){
          tessy.loops.push([]);
        }
      }
      function cb_error(errno) {
        tessCallbacks.error(errno);
        console.error(`error number: ${errno}`);
      }
      // callback for when segments intersect and must be split
      // coordsはサイズの個数でいいっぽい
      // 与えられる段階では長さ3みたいなので、適宜増やす必要がある。dataはちゃんとsize長さの配列が入ってる。
      function cb_combine(coords, data, weight) {
        tessCallbacks.combine(coords, data, weight);
        return coords.slice(0, tessy.size);
      }
      function cb_edge(flag) {
        tessCallbacks.edge(flag);
      }

      tessy.gluTessCallback(tessEnums.GLU_TESS_VERTEX_DATA, cb_vertex);
      tessy.gluTessCallback(tessEnums.GLU_TESS_BEGIN, cb_begin);
      tessy.gluTessCallback(tessEnums.GLU_TESS_ERROR, cb_error);
      tessy.gluTessCallback(tessEnums.GLU_TESS_COMBINE, cb_combine);
      tessy.gluTessCallback(tessEnums.GLU_TESS_EDGE_FLAG, cb_edge);
    }

    // combineのcallbackで使う補助関数。
    function tessLerp(coords, data, weight, n, name = ""){
      if(name === ""){
        coords[n] = data[0][n]*weight[0] + data[1][n]*weight[1] + data[2][n]*weight[2] + data[3][n]*weight[3];
        return;
      }
      coords[n][name] = data[0][n][name]*weight[0] + data[1][n][name]*weight[1] + data[2][n][name]*weight[2] + data[3][n][name]*weight[3];
    }

    /*
      step1: 点列を生成（id:通し番号、rep:代表）
      step2: x,yでsort
      step3: idからソート後の位置を取得する辞書を作る
      step4: マージ後の点列を作ると同時にその元を代表として元の点列に登録する
      step5: 辞書を使ってid -> ソート後の位置 -> そこにある点 -> の、代表 -> の、idという形でindex配列を生成
      step6: v:マージ後の点列、f:indicesという形で出力。マージ後の点列のidもなんかの役には立つだろう。おわり。
    */
    // size=2の場合がデフォルト。size>2の場合はそのデータは別に使わないが...
    // 0,1がいっしょであれば同じ値になることが保証されているので、一つ取ればOKだと思います。
    function _mergeVerts(data, size = 2){
      const points = [];
      for(let k=0; k < data.length; k+=size){
        // 追加分はまとめてzにぶち込む
        const newP = {x:data[k], y:data[k+1], z:data.slice(k+2, k+size), id:points.length, rep:null};
        points.push(newP);
      }

      points.sort((p, q) => {
        if(p.x < q.x){
          return -1;
        }
        if(p.x == q.x && p.y < q.y){
          return -1;
        }
        return 0;
      });

      const idDict = new Array(points.length);
      for(let k=0; k < points.length; k++){
        idDict[points[k].id] = k;
      }

      const mergedPoints = [];
      const registPoint = (p, flag) => {
        if(flag){
          // zも全部一緒なので一つ取ればOK
          const newP = {x:p.x, y:p.y, z:p.z, id:mergedPoints.length};
          p.rep = newP;
          mergedPoints.push(newP);
          return;
        }
        const rep = mergedPoints[mergedPoints.length-1];
        p.rep = rep;
      }
      for(let k=0; k < points.length; k++){
        if(k === 0){
          registPoint(points[0], true);
        }else{
          const cur = points[k];
          const prev = points[k-1];
          if(cur.x !== prev.x || cur.y !== prev.y){
            registPoint(points[k], true);
          }else{
            registPoint(points[k], false);
          }
        }
      }

      const faceIndices = [];
      for(let k=0; k < points.length; k++){
        faceIndices.push(points[idDict[k]].rep.id);
      }

      return {v:mergedPoints, f:faceIndices};
    }

    function triangulate(contours, options = {}) {
      const {boundaryOnly = false, rule = "odd", showPerformance = false, merge = false, size = 2} = options;
      // libtess will take 3d verts and flatten to a plane for tesselation
      // since only doing 2d tesselation here, provide z=1 normal to skip
      // iterating over verts only to get the same answer.
      // comment out to test normal-generation code
      tessy.gluTessNormal(0, 0, 1);
      tessy.size = size; // triangulateのたびにsizeを設定してTessyで使う

      const startTime0 = window.performance.now();
      const triangleVerts = [];
      tessy.gluTessBeginPolygon(triangleVerts);

      for (let i = 0; i < contours.length; i++) {
        tessy.gluTessBeginContour();
        const contour = contours[i];
        for (let j = 0; j < contour.length; j += size) {
          // coordsはサイズの個数でいいっぽい
          const coords = contour.slice(j, j+size);
          tessy.gluTessVertex(coords, coords);
        }
        tessy.gluTessEndContour();
      }

      if(showPerformance){
        console.log(`preparation elapsed:${window.performance.now()-startTime0} milli seconds.`);
      }
      const startTime1 = window.performance.now();

      tessy.loops.length = 0;

      switch(rule){
        case "odd": // evenodd. 奇数のみ。
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_ODD); break;
        case "nonzero": // 0でない場合（一部のフォントパスなどはこれを使う）
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_NONZERO); break;
        case "positive": // 正のみ
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_POSITIVE); break;
        case "negative": // 負のみ
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_NEGATIVE); break;
        case "abs_geq_two": // 絶対値が2以上
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_ABS_GEQ_TWO); break;
      }

      tessy.gluTessProperty(tessEnums.GLU_TESS_BOUNDARY_ONLY, boundaryOnly);
      tessy.gluTessEndPolygon();

      if(showPerformance){
        console.log(`tessellation elapsed:${window.performance.now()-startTime1} milli seconds.`);
      }

      if(boundaryOnly){
        const result = [];
        for(const eachLoop of tessy.loops){
          result.push(eachLoop.slice());
        }
        return result;
      }

      if(merge){
        // マージする。重複点排除。boundaryの場合は不要。{v,f}
        // vは{x,y,id}の形でマージ後の点列が入ってる。fはそれに準じる形で三角形のindexの配列、つまり面の数は不変。点が減るだけ。
        // sizeを渡す。
        return _mergeVerts(triangleVerts, size);
      }

      return triangleVerts;
    }

    tess.tessy = tessy;
    tess.tessEnums = tessEnums;
    tess.tessRules = tessRules;
    tess.tessTypes = tessTypes;
    tess.initTessy = initTessy; // 必須。libtessを渡して初期化する。
    tess.tessLerp = tessLerp; // combineのcallbackで使う。
    tess.tessCallbacks = tessCallbacks;
    tess.triangulate = triangulate;

    return tess;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //

  // fox3Dtools. VectaやMT4など。
  const fox3Dtools = (function(){
    const tools = {};

    // --------------------------------- Vecta --------------------------------- //

    // ベクトル。3次元でいいと思う。必要最低限の機能だけ用意する。
    class Vecta{
      constructor(a=0,b=0,c=0){
        if(Array.isArray(a)){
          // aが配列の場合だけ可能にするか。足りない部分は0埋めしましょう。
          this.x = (a[0] !== undefined ? a[0] : 0);
          this.y = (a[1] !== undefined ? a[1] : 0);
          this.z = (a[2] !== undefined ? a[2] : 0);
        }else{
          this.x = a;
          this.y = b;
          this.z = c;
        }
      }
      set(){
        // 列挙、単数、ベクトル、配列が可能。値をセットする。
        const res = Vecta.validate(...arguments);
        this.x = res.x; this.y = res.y; this.z = res.z;
        return this;
      }
      copy(){
        // 自分のコピーを返す
        return new Vecta(this.x, this.y, this.z);
      }
      show(directConsole = false, threshold = 0){
        // 閾値でチェックして絶対値がそれ未満であれば0とする
        const properX = (Math.abs(this.x) < threshold ? 0 : this.x);
        const properY = (Math.abs(this.y) < threshold ? 0 : this.y);
        const properZ = (Math.abs(this.z) < threshold ? 0 : this.z);
        // trueの場合は直接コンソールに出す
        const info = `${properX}, ${properY}, ${properZ}`;
        if(directConsole){
          console.log(info);
        }
        return info;
      }
      array(){
        // 成分を配列形式で返す。
        return [this.x, this.y, this.z];
      }
      add(){
        // 和を取る
        const res = Vecta.validate(...arguments);
        if(res.im){
          return new Vecta(this.x + res.x, this.y + res.y, this.z + res.z);
        }
        this.x += res.x;  this.y += res.y;  this.z += res.z;
        return this;
      }
      sub(){
        const res = Vecta.validate(...arguments);
        if(res.im){
          return new Vecta(this.x - res.x, this.y - res.y, this.z - res.z);
        }
        this.x -= res.x;  this.y -= res.y;  this.z -= res.z;
        return this;
      }
      mult(){
        const res = Vecta.validate(...arguments);
        if(res.im){
          return new Vecta(this.x * res.x, this.y * res.y, this.z * res.z);
        }
        this.x *= res.x;  this.y *= res.y;  this.z *= res.z;
        return this;
      }
      div(){
        const res = Vecta.validate(...arguments);
        // ゼロ割は雑に回避
        if(Math.abs(res.x) < Number.EPSILON){ res.x = Number.EPSILON; }
        if(Math.abs(res.y) < Number.EPSILON){ res.y = Number.EPSILON; }
        if(Math.abs(res.z) < Number.EPSILON){ res.z = Number.EPSILON; }

        if(res.im){
          return new Vecta(this.x / res.x, this.y / res.y, this.z / res.z);
        }
        this.x /= res.x;  this.y /= res.y;  this.z /= res.z;
        return this;
      }
      cross(){
        const res = Vecta.validate(...arguments);
        if(res.im){
          return this.copy().cross(res.x, res.y, res.z, false);
        }
        const {x,y,z} = this;
        this.x = y * res.z - z * res.y;
        this.y = z * res.x - x * res.z;
        this.z = x * res.y - y * res.x;
        return this;
      }
      angleBetween(v){
        // 絶対値
        // vはベクトル想定。余計な仕様を作りたくない。
        const crossMag = this.cross(v, true).mag();
        const dotValue = this.dot(v);
        const theta = Math.atan2(crossMag, dotValue);
        return theta;
      }
      angleTo(){
        // axisから見た場合の符号付き角度。axisは成分指定可能（列挙のみ）。
        // axisがゼロベクトルもしくは未定義の場合は(0,0,1)とする
        // vはベクトル想定。ベクトルを2つも取るのでvはベクトルでないとさすがに無理。
        const res = Vecta.validateForAngleTo(...arguments);
        const sign = Math.sign(this.cross(res.v, true).dot(res.axis));
        const theta = this.angleBetween(res.v);
        return (sign < 0 ? sign : 1) * theta;
      }
      rotate(){
        // axisの周りにangleだけ回転。axisは成分指定可能（列挙のみ）
        // axisがゼロベクトルの場合は(0,0,1)とする
        // 素直にロドリゲス掛けるだけです。GLSLとか意味不明なこと考えなくていいです。
        const args = [...arguments];
        if(args.length === 1 && typeof(args[0]) === 'number'){
          // 引数が1つの場合は軸を0,0,1としそれを角度として扱う。変化させる。
          this.rotate(0, 0, 1, args[0], false);
          return this;
        }else if(args.length === 2 && typeof(args[0]) === 'number'){
          // 引数が2つの場合は軸を0,0,1としそれらを角度、immutableとして扱う。
          return this.rotate(0, 0, 1, args[0], args[1]);
        }
        const res = Vecta.validateForScalar(...args);
        if(res.x*res.x + res.y*res.y + res.z*res.z < Number.EPSILON){
          res.x = 0; res.y = 0; res.z = 0;
        }
        if(res.im){
          return this.copy().rotate(res.x, res.y, res.z, res.s, false);
        }
        // res.imがfalseの場合は自分を変化させる
        const axis = new Vecta(res.x, res.y, res.z);
        axis.normalize();
        const C = Math.cos(res.s);
        const OC = 1-Math.cos(res.s);
        const S = Math.sin(res.s);
        const {x, y, z} = axis;
        const mat = [
          C + OC*x*x, OC*x*y - S*z, OC*x*z + S*y,
          OC*x*y + S*z, C + OC*y*y, OC*y*z - S*x,
          OC*x*z - S*y, OC*y*z + S*x, C + OC*z*z
        ];
        const x1 = mat[0]*this.x + mat[1]*this.y + mat[2]*this.z;
        const y1 = mat[3]*this.x + mat[4]*this.y + mat[5]*this.z;
        const z1 = mat[6]*this.x + mat[7]*this.y + mat[8]*this.z;
        this.set(x1, y1, z1);
        return this;
      }
      addScalar(){
        // 要するにvの定数倍を足すとかそういう処理
        // かゆいところに手を伸ばすための関数
        const res = Vecta.validateForScalar(...arguments);
        if(res.im){
          return new Vecta(
            this.x + res.x * res.s, this.y + res.y * res.s, this.z + res.z * res.s
          );
        }
        this.x += res.x * res.s;
        this.y += res.y * res.s;
        this.z += res.z * res.s;
        return this;
      }
      lerp(){
        // 対象と補間割合。割合が0なら自分、1なら相手。
        const res = Vecta.validateForScalar(...arguments);
        if(res.im){
          return this.copy().lerp(res.x, res.y, res.z, res.s, false);
        }
        const {x,y,z} = this;
        this.x = (1-res.s) * x + res.s * res.x;
        this.y = (1-res.s) * y + res.s * res.y;
        this.z = (1-res.s) * z + res.s * res.z;
        return this;
      }
      dot(){
        // 引数は割と自由で。1,2,3とかでもできるようにしましょ。
        const res = Vecta.validate(...arguments);
        return this.x * res.x + this.y * res.y + this.z * res.z;
      }
      dist(){
        const res = Vecta.validate(...arguments);
        return Math.hypot(this.x - res.x, this.y - res.y, this.z - res.z);
      }
      mag(){
        return Math.sqrt(this.magSq());
      }
      magSq(){
        return this.x * this.x + this.y * this.y + this.z * this.z;
      }
      normalize(){
        const m = this.mag();
        if(m < Number.EPSILON){
          // ゼロの場合はゼロベクトルにする
          return new Vecta(0,0,0);
        }
        return this.div(m);
      }
      static create(){
        const res = Vecta.validate(...arguments);
        return new Vecta(res.x, res.y, res.z);
      }
      static validate(){
        // 長さ1,3の場合はfalseを追加
        const args = [...arguments];
        if(args.length === 1){
          return Vecta.validate(args[0], false);
        } else if(args.length === 3){
          // 2次元対応するか。数、数、booleanの場合は3つ目を0にする
          if(typeof(args[0]) === 'number' && typeof(args[1]) === 'number' && typeof(args[2]) === 'boolean'){
            return Vecta.validate(args[0], args[1], 0, args[2]);
          }
          return Vecta.validate(args[0], args[1], args[2], false);
        }else if(args.length === 2){
          // 長さ2の場合はベクトルか数か配列。数の場合は全部一緒。
          // ただし数が2個の場合は3つ目を0としfalseで確定させる
          if(args[0] instanceof Vecta){
            return {x:args[0].x, y:args[0].y, z:args[0].z, im: args[1]};
          }else if(typeof(args[0]) === 'number'){
            if(typeof(args[1]) === 'number'){
              // いわゆる2次元対応。この手のミスが目立ってきたので。
              return {x:args[0], y:args[1], z:0, im:false};
            }else{
              return {x:args[0], y:args[0], z:args[0], im:args[1]};
            }
          }else if(Array.isArray(args[0])){
            return {x:args[0][0], y:args[0][1], z:args[0][2], im:args[1]};
          }
        }else if(args.length === 4){
          // 長さ4の場合は数限定。
          if(typeof(args[0]) === 'number'){
            return {x:args[0], y:args[1], z:args[2], im:args[3]};
          }
        }
        return {x:0, y:0, z:0, im:false}
      }
      static validateForAngleTo(){
        const args = [...arguments];
        if(args.length === 2){
          // 長さ2の場合は2つ目がベクトルならゼロの場合にそれを回避する
          if(args[1] instanceof Vecta){
            if(args[1].magSq() < Number.EPSILON){
              return {v:args[0], axis:new Vecta(0,0,1)};
            }
            return {v:args[0], axis:args[1]};
          }else if(Array.isArray(args[1])){
            return Vecta.validateForAngleTo(args[0], new Vecta(args[1][0], args[1][1], args[1][2]));
          }
        }else if(args.length === 4){
          // 長さ4の場合は後半の3つの数でベクトルを作る
          if(typeof(args[1]) === 'number'){
            return Vecta.validateForAngleTo(args[0], new Vecta(args[1], args[2], args[3]));
          }
        }
        return {v:args[0], axis:new Vecta(0,0,1)};
      }
      static validateForScalar(){
        // 想定してるのはaxis,angleもしくはvector,scalar
        const args = [...arguments];
        // 長さ2,4の場合はfalseを追加
        if(args.length === 2){
          return Vecta.validateForScalar(args[0], args[1], false);
        }else if(args.length === 4){
          return Vecta.validateForScalar(args[0], args[1], args[2], args[3], false);
        }else if(args.length === 3){
          // 長さ3の場合は...ベクトルか配列。
          if(typeof(args[1]) === 'number'){
            if(args[0] instanceof Vecta){
              return {x:args[0].x, y:args[0].y, z:args[0].z, s:args[1], im:args[2]};
            }else if(Array.isArray(args[0])){
              return {x:args[0][0], y:args[0][1], z:args[0][2], s:args[1], im:args[2]};
            }
          }
        }else if(args.length === 5){
          // 長さ5の場合は数でベクトルを作る。
          if(typeof(args[0]) === 'number' && typeof(args[3]) === 'number'){
            return {x:args[0], y:args[1], z:args[2], s:args[3], im:args[4]};
          }
        }
        return {x:0, y:0, z:0, s:0, im:false};
      }
      static getOrtho(v){
        // 雑に直交する単位ベクトルを取る。slerpはこれがあると楽。
        if(v.magSq() < Number.EPSILON){
          return Vecta.create(0,0,1);
        }
        if(Math.abs(v.x) > 0){
          return Vecta.create(v.y, -v.x, 0).normalize();
        }
        return Vecta.create(0, v.z, -v.y).normalize();
      }
      static random2D(){
        // ランダムで円周上の単位ベクトルを取る
        const t = Math.random()*Math.PI*2;
        return Vecta.create(Math.cos(t), Math.sin(t));
      }
      static random3D(){
        // ランダムで球面上の単位ベクトルを取る
        const s = Math.acos(1-Math.random()*2);
        const t = Math.random()*Math.PI*2;
        return Vecta.create(Math.sin(s)*Math.cos(t), Math.sin(s)*Math.sin(t), Math.cos(s));
      }
      static random3Dvariation(axis, angle, directionFunc){
        // 関数部分以外は一緒なので統一する
        if(axis.magSq()<Number.EPSILON){
          axis = new Vecta(0,0,1);
        }
        const zVec = axis.copy().normalize();
        const xVec = Vecta.getOrtho(zVec);
        const yVec = zVec.cross(xVec, true);
        const properAngle = Math.max(Math.min(angle, Math.PI), 0);

        const s = directionFunc(Math.random(), properAngle);

        const t = Math.random()*Math.PI*2;
        return new Vecta().addScalar(zVec, Math.cos(s)).addScalar(xVec, Math.sin(s)*Math.cos(t)).addScalar(yVec, Math.sin(s)*Math.sin(t));
      }
      static random3Dinside(axis, angle){
        // axis方向、angleより内側の球面上からランダムに取得する。
        return Vecta.random3Dvariation(axis, angle, (rdm, properAngle) => {
          return Math.acos(1-rdm*(1-Math.cos(properAngle)));
        });
      }
      static random3Doutside(axis, angle){
        // axis方向、angleより外側の球面上からランダムに取得する。
        return Vecta.random3Dvariation(axis, angle, (rdm, properAngle) => {
          return Math.acos(Math.cos(properAngle) - (1+Math.cos(properAngle))*rdm);
        });
      }
      static assert(v, w, threshold = 0, directConsole = false){
        // v,wはベクトルもしくは長さ3の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const vA = (v instanceof Vecta ? v.array() : v);
        const wA = (w instanceof Vecta ? w.array() : w);
        for(let i=0; i<3; i++){
          if(Math.abs(vA[i] - wA[i]) > threshold){
            console.log(`${i}: ${vA[i]}, ${wA[i]}`);
            if(directConsole){ console.log(false); }
            return false;
          }
        }
        if(directConsole){ console.log(true); }
        return true;
      }
    }

    // --------------------------------- Quarternion --------------------------------- //

    // https://qiita.com/inaba_darkfox/items/53230babef4e163ede3d
    class Quarternion{
      constructor(w = 1, x = 0, y = 0, z = 0){
        if(Array.isArray(w)){
          // wが配列の場合だけ、用意するか。1,0,0,0をデフォとして用意する。不要かもだけど。
          this.w = (w[0] !== undefined ? w[0] : 1);
          this.x = (w[1] !== undefined ? w[1] : 0);
          this.y = (w[2] !== undefined ? w[2] : 0);
          this.z = (w[3] !== undefined ? w[3] : 0);
        }else{
          this.w = w;
          this.x = x;
          this.y = y;
          this.z = z;
        }
      }
      set(w, x, y, z){
        // クォータニオンか配列の場合は列挙の場合に帰着させる
        const args = [...arguments];
        if(args[0] instanceof Quarternion){
          return this.set(args[0].w, args[0].x, args[0].y, args[0].z);
        }else if(Array.isArray(args[0])){
          return this.set(args[0][0], args[0][1], args[0][2], args[0][3]);
        }
        // 列挙の場合
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
      }
      setFromAA(axis, angle){
        // 軸の指定方法はベクトルが基本だが、配列か列挙でも可
        if(Array.isArray(axis)){
          axis = new Vecta(axis[0], axis[1], axis[2]);
        }else if(arguments.length === 4){
          axis = new Vecta(arguments[0], arguments[1], arguments[2]);
          angle = arguments[3];
        }
        // 元のベクトルが変化しないようにする
        axis = axis.copy().normalize();
        const s = Math.sin(angle/2);
        this.set(Math.cos(angle/2), s*axis.x, s*axis.y, s*axis.z);
        return this;
      }
      setFromV(v){
        // ベクトルか配列か列挙。基本はベクトル。
        if(Array.isArray(v)){
          v = new Vecta(v[0], v[1], v[2]);
        }else if(arguments.length === 3){
          v = new Vecta(arguments[0], arguments[1], arguments[2]);
        }
        this.set(0, v.x, v.y, v.z);
        return this;
      }
      setFromAxes(x, y, z){
        // 正規直交基底から出す。正規直交基底でないと失敗する。
        // 3つの引数はすべてベクトル限定とする。列ベクトル。
        // 参考：https://github.com/mrdoob/three.js/blob/r172/src/math/Quaternion.js#L294

        const {x:a, y:d, z:g} = x;
        const {x:b, y:e, z:h} = y;
        const {x:c, y:f, z:i} = z;
        // a  b  c
        // d  e  f
        // g  h  i
        const trace = a + e + i;
        // 角度がPIに近いと割り算ができないが、
        // traceが正ならそれは起きえない。
        if(trace > 0){
          // ここだけあっちと違う計算だが、意味的に分かりやすいので。
          const w = Math.sqrt((trace + 1) / 4);
          const factor = 0.25/w;
          this.set(w, (h - f)*factor, (c - g)*factor, (d - b)*factor)
        }else{
          if(a > e && a > i){
            // aが最大の場合
            const s = 2 * Math.sqrt(1 + a - e - i);
            this.set((h - f) / s, 0.25 * s, (b + d) / s, (c + g) / s);
          }else if(e > i){
            // eが最大の場合
            const s = 2 * Math.sqrt(1 + e - i - a);
            this.set((c - g) / s, (b + d) / s, 0.25 * s, (f + h) / s);
          }else{
            // iが最大の場合
            const s = 2 * Math.sqrt(1 + i - a - e);
            this.set((d - b) / s, (c + g) / s, (f + h) / s, 0.25 * s);
          }
        }
        return this;
      }
      copy(){
        return new Quarternion(this.w, this.x, this.y, this.z);
      }
      show(directConsole = false, threshold = 0){
        // 閾値でチェックして絶対値がそれ未満であれば0とする
        const properW = (Math.abs(this.w) < threshold ? 0 : this.w);
        const properX = (Math.abs(this.x) < threshold ? 0 : this.x);
        const properY = (Math.abs(this.y) < threshold ? 0 : this.y);
        const properZ = (Math.abs(this.z) < threshold ? 0 : this.z);
        // trueの場合は直接コンソールに出す
        const info = `${properW}, ${properX}, ${properY}, ${properZ}`;
        if(directConsole){
          console.log(info);
        }
        return info;
      }
      array(){
        // 成分を配列形式で返す
        return [this.w, this.x, this.y, this.z];
      }
      init(){
        // 性質的には行列なので、initがあってもいいと思う。
        return this.set(1,0,0,0);
      }
      mult(s = 1, immutable = false){
        // 定数倍
        if(immutable){
          return this.copy().mult(s, false);
        }
        this.w *= s;
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
      }
      multQ(q, immutable = false){
        // クォータニオンの右乗算
        if(immutable){
          return this.copy().multQ(q, false);
        }
        const {w:d, x:a, y:b, z:c} = this;
        this.w = d * q.w - a * q.x - b * q.y - c * q.z;
        this.x = d * q.x + a * q.w + b * q.z - c * q.y;
        this.y = d * q.y + b * q.w + c * q.x - a * q.z;
        this.z = d * q.z + c * q.w + a * q.y - b * q.x;
        return this;
      }
      localRotate(){
        // VectaのvalidateForScalar使う。
        // 切り売り出来なくなるけどそもそもVecta前提だから問題ない。右乗算。
        const res = Vecta.validateForScalar(...arguments); // x,y,z,s,im
        if(res.im){
          return this.copy().localRotate(res.x, res.y, res.z, res.s);
        }
        // 以下はデフォルト。
        const aa = Quarternion.getFromAA(res.x, res.y, res.z, res.s);
        return this.multQ(aa);
      }
      globalRotate(){
        // VectaのvalidateForScalar使う。
        // 切り売り出来なくなるけどそもそもVecta前提だから問題ない。左乗算。
        const res = Vecta.validateForScalar(...arguments); // x,y,z,s,im
        if(res.im){
          return this.copy().globalRotate(res.x, res.y, res.z, res.s);
        }
        // 以下はデフォルト。
        const aa = Quarternion.getFromAA(res.x, res.y, res.z, res.s);
        // aaに自分を右から掛けてそれを自分とする形
        aa.multQ(this);
        return this.set(aa);
      }
      conj(immutable = false){
        // 共役
        if(immutable){
          return this.copy().conj(false);
        }
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        return this;
      }
      applyV(){
        // 引数はベクトルとは限らないため、仕様上imは無視する。常に新しいベクトル。
        // vに適用する。軸と角度。回転演算になる。
        // 具体的にはq * v * \bar{q} を計算してx,y,zを取るだけ。
        const res = Vecta.validate(...arguments);
        const q = this.copy();
        const vq = new Quarternion(0, res.x, res.y, res.z);
        const qConj = q.conj(true); // ここのqは変えちゃまずいのでtrueです。
        // qは変えちゃってOK
        q.multQ(vq).multQ(qConj);
        return new Vecta(q.x, q.y, q.z);
      }
      mag(){
        // 大きさ
        return Math.sqrt(this.magSq());
      }
      magSq(){
        // 大きさの二乗
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
      }
      normalize(){
        // 正規化
        const m = this.mag();
        if(m < Number.EPSILON){
          // 0の正規化はゼロとする
          return new Quarternion(0,0,0,0);
        }
        return this.mult(1/m);
      }
      pow(a){
        // この関数自体は補助関数なのでimmutableは不要かと思う
        const m = this.magSq();
        if(m < Number.EPSILON){
          // 0のべき乗は0とする
          return Quarternion(0,0,0,0);
        }
        // ここで排除してしまう。
        if(this.w < 0){
          this.mult(-1);
        }
        const n = Math.sqrt(m);
        const c = this.w/n;
        const s = Math.sqrt(m - this.w*this.w)/n;
        const t = Math.atan2(s, c); // 0～PI/2
        const multiplier = Math.pow(n, a);
        if(Math.abs(t) < Number.EPSILON){
          this.w = (this.w/n)*multiplier;
          this.x = (this.x/n)*multiplier;
          this.y = (this.y/n)*multiplier;
          this.z = (this.z/n)*multiplier;
          return this;
        }
        const ax = (this.x/n)/s;
        const ay = (this.y/n)/s;
        const az = (this.z/n)/s;
        const phi = a*t;
        this.w = Math.cos(phi)*multiplier;
        this.x = Math.sin(phi)*ax*multiplier;
        this.y = Math.sin(phi)*ay*multiplier;
        this.z = Math.sin(phi)*az*multiplier; // zがyになってたよ。
        return this;
      }
      slerp(q1, ratio, immutable = false){
        if(immutable){
          // copy()の「()」を忘れました。unit testではこういうのもチェックするんですが....
          return this.copy().slerp(q1, ratio, false);
        }
        // qは要するにq1*(thisの逆元). これを0～1乗して補間するだけ。
        const m = this.magSq();
        if(m < Number.EPSILON){
          // 0との補間は考えられないのでオールゼロでいいと思う. 線形補間とは違うので。
          // 実数では0の0でない値でのベキはすべてゼロなので妥当な判断。
          return new Quarternion(0,0,0,0);
        }
        const q = q1.multQ(this.conj(true), true).mult(1/m);
        return q.pow(ratio).multQ(this);
        // 右乗算の場合。どっちがいいのかは知らない。
        //const q = this.conj(true).multQ(q1).mult(1/m);
        //return this.copy().multQ(q.pow(ratio));
        // これでいいかどうかは知らんです。
        // 参考：クォータニオンのべき乗、これは単位限定だけどね。なお右乗算。
        // https://zenn.dev/mebiusbox/books/132b654aa02124/viewer/2966c7
      }
      getAxes(){
        // 単位クォータニオンの場合は3本の軸ベクトルを順繰りに用意する関数になる。
        // 行列的にはこれらは列ベクトルで、配置的には転置となっている。
        // クォータニオンに3本の列ベクトルという別の姿があるイメージ。1to1ではないが。
        // ax,ay,azでまとめてもいいが、手間なので別メソッドにしましょう。
        const {w,x,y,z} = this;
        return {
          x:new Vecta(2*w*w-1 + 2*x*x, 2*(x*y + z*w), 2*(x*z - y*w)),
          y:new Vecta(2*(x*y - z*w), 2*w*w-1 + 2*y*y, 2*(y*z + x*w)),
          z:new Vecta(2*(x*z + y*w), 2*(y*z - x*w), 2*w*w-1 + 2*z*z)
        }
      }
      ax(){
        // 個別にx軸のベクトルが欲しい用
        const {w,x,y,z} = this;
        return new Vecta(2*w*w-1 + 2*x*x, 2*(x*y + z*w), 2*(x*z - y*w));
      }
      ay(){
        // 個別にy軸のベクトルが欲しい用
        const {w,x,y,z} = this;
        return new Vecta(2*(x*y - z*w), 2*w*w-1 + 2*y*y, 2*(y*z + x*w));
      }
      az(){
        // 個別にz軸のベクトルが欲しい用
        const {w,x,y,z} = this;
        return new Vecta(2*(x*z + y*w), 2*(y*z - x*w), 2*w*w-1 + 2*z*z);
      }
      static getFromAA(){
        // 軸の指定方法は3種類
        return (new Quarternion()).setFromAA(...arguments);
      }
      static getFromV(){
        return (new Quarternion()).setFromV(...arguments);
      }
      static getFromAxes(){
        // 正規直交基底から出す。正規直交基底でないと失敗する。
        // 3つの引数はすべてベクトル限定とする。列ベクトル。
        // 参考：https://github.com/mrdoob/three.js/blob/r172/src/math/Quaternion.js#L294
        return (new Quarternion()).setFromAxes(...arguments);
      }
      static assert(p, q, threshold = 0, directConsole = false){
        // p,qはクォータニオンもしくは長さ4の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const pA = (p instanceof Quarternion ? p.array() : p);
        const qA = (q instanceof Quarternion ? q.array() : q);
        for(let i=0; i<4; i++){
          if(Math.abs(pA[i] - qA[i]) > threshold){
            console.log(`${i}: ${pA[i]}, ${qA[i]}`);
            if(directConsole){ console.log(false); }
            return false;
          }
        }
        if(directConsole){ console.log(true); }
        return true;
      }
    }

    // --------------------------------- MT4 --------------------------------- //

    // 4次正方行列。必要最低限の内容。
    class MT4{
      constructor(){
        // 列挙のみ許す。ベクトルや四元数と揃える形。
        const args = [...arguments];
        this.m = new Float32Array(16);
        if(args.length === 0){
          // 空っぽの場合
          for(let i=0; i<16; i++){
            this.m[i] = (i%5===0 ? 1 : 0); // 単位行列
          }
        }else if(args.length === 9){
          // 3x3の場合（単位行列でベースを作って左上だけ上書きする）
          for(let i=0; i<16; i++){
            this.m[i] = (i%5===0 ? 1 : 0); // 単位行列
          }
          for(let y=0; y<3; y++){
            for(let x=0; x<3; x++){
              this.m[4*y+x] = args[3*y+x];
            }
          }
        }else{
          // 4x4の場合も含めて「その他」
          // args[0]が配列の場合はそれを採用する形。残りは0とする。
          const data = (Array.isArray(args[0]) ? args[0] : args);
          for(let i=0; i<16; i++){
            if(i<data.length){
              this.m[i] = data[i];
            }else{
              this.m[i] = 0;
            }
          }
        }
      }
      set(n){
        if(Array.isArray(n)){
          if(n.length === 9){
            // 9の場合は左上の3x3におく
            for(let i=0; i<16; i++){
              this.m[i] = (i%5===0 ? 1 : 0); // 単位行列
            }
            // 左上だけ上書き
            for(let y=0; y<3; y++){
              for(let x=0; x<3; x++){
                this.m[4*y+x] = n[3*y+x];
              }
            }
          }else{
            // 0埋めしてるけど基本16想定
            for(let i=0; i<16; i++){
              if(i < n.length){ this.m[i] = n[i]; }else{ this.m[i] = 0; }
            }
          }
          return this;
        }else if(typeof(arguments[0]) === 'number'){
          // 列挙の場合
          const args = [...arguments];
          return this.set(args);
        }
        // 最後に、普通に行列の場合
        for(let i=0; i<16; i++){ this.m[i] = n.m[i]; }
        return this;
      }
      copy(){
        const m = new MT4();
        return m.set(this);
      }
      show(directConsole = false, threshold = 0){
        // 閾値でチェックして絶対値がそれ未満であれば0とする
        const showValues = [];
        for(let i=0; i<16; i++){
          showValues.push(Math.abs(this.m[i]) < threshold ? 0 : this.m[i]);
        }
        // trueの場合は直接コンソールに出す
        const info = `${showValues[0]}, ${showValues[1]}, ${showValues[2]}, ${showValues[3]}, \n${showValues[4]}, ${showValues[5]}, ${showValues[6]}, ${showValues[7]}, \n${showValues[8]}, ${showValues[9]}, ${showValues[10]}, ${showValues[11]}, \n${showValues[12]}, ${showValues[13]}, ${showValues[14]}, ${showValues[15]}`;
        if(directConsole){
          console.log(info);
        }
        return info;
      }
      array(){
        // Float32Arrayではなく通常のArray形式で成分配列を返す。一列につなげたりするのに便利かと。Float32はpushとか使えないし。
        const a = new Array(16);
        for(let i=0; i<16; i++){ a[i] = this.m[i]; }
        return a;
      }
      init(defaultScalar = 1){
        // スカラー行列で初期化（デフォルトは1です）
        this.set([
          defaultScalar,0,0,0,
          0,defaultScalar,0,0,
          0,0,defaultScalar,0,
          0,0,0,defaultScalar
        ]);
        return this;
      }
      add(n, immutable = false){
        // 和
        if(immutable){
          return this.copy().add(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        for(let i=0; i<16; i++){
          this.m[i] += target[i];
        }
        return this;
      }
      addScalar(n, k, immutable = false){
        // スカラー倍を足す
        if(immutable){
          return this.copy().addScalar(n, k, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        for(let i=0; i<16; i++){
          this.m[i] += k * target[i];
        }
        return this;
      }
      sub(n, immutable = false){
        // 差
        if(immutable){
          return this.copy().sub(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        for(let i=0; i<16; i++){
          this.m[i] -= target[i];
        }
        return this;
      }
      mult(k, immutable = true){
        // 単純なスカラー倍。まあ使わないかもだが。
        if(immutable){
          return this.copy().mult(k, false);
        }
        for(let i=0; i<16; i++){
          this.m[i] *= k;
        }
        return this;
      }
      multV(v, immutable = false){
        // vは3次元ベクトルでx,y,z成分を持つ
        if(immutable){
          // 不変
          return this.multV(v.copy(), false);
        }
        const {x:a, y:b, z:c} = v;
        v.x = this.m[0]*a + this.m[1]*b + this.m[2]*c + this.m[3];
        v.y = this.m[4]*a + this.m[5]*b + this.m[6]*c + this.m[7];
        v.z = this.m[8]*a + this.m[9]*b + this.m[10]*c + this.m[11];
        return v;
      }
      multN(v, immutable = false){
        // Vの第四成分が0のバージョン。Nとあるのは法線を意識してる。
        // ライティングとかで使うと思う
        if(immutable){
          // 不変
          return this.multN(v.copy(), false);
        }
        const {x:a, y:b, z:c} = v;
        v.x = this.m[0]*a + this.m[1]*b + this.m[2]*c;
        v.y = this.m[4]*a + this.m[5]*b + this.m[6]*c;
        v.z = this.m[8]*a + this.m[9]*b + this.m[10]*c;
        return v;
      }
      multM(n, immutable = false){
        // nのところには配列も入れられるようにする。ただし長さは16限定とする。
        if(immutable){
          // 不変
          return this.copy().multM(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        const m2 = new Array(16);
        for(let i=0; i<16; i++){ m2[i] = this.m[i]; }
        for(let k=0; k<4; k++){
          for(let i=0; i<4; i++){
            this.m[4*k+i] = m2[4*k]*target[i] + m2[4*k+1]*target[i+4] + m2[4*k+2]*target[i+8] + m2[4*k+3]*target[i+12];
          }
        }
        return this;
      }
      inverseMultM(n, immutable = false){
        // 逆乗算。逆というか左乗算。
        if(immutable){
          // 不変
          return this.copy().inverseMultM(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        const m2 = new Array(16);
        for(let i=0; i<16; i++){ m2[i] = this.m[i]; }
        for(let k=0; k<4; k++){
          for(let i=0; i<4; i++){
            this.m[4*k+i] = target[4*k]*m2[i] + target[4*k+1]*m2[i+4] + target[4*k+2]*m2[i+8] + target[4*k+3]*m2[i+12];
          }
        }
        return this;
      }
      transpose(immutable = false){
        if(immutable){
          return this.copy().transpose(false);
        }
        let swapper;
        for(let k=0; k<4; k++){
          for(let i=k+1; i<4; i++){
            swapper = this.m[4*k+i];
            this.m[4*k+i] = this.m[4*i+k];
            this.m[4*i+k] = swapper;
          }
        }
        return this;
      }
      get3x3(){
        // 3x3部分の行列を取得する。
        const result = new Float32Array(9);
        const indices = [0,1,2,4,5,6,8,9,10];
        for(let i=0; i<9; i++){
          result[i] = this.m[indices[i]];
        }
        return result;
      }
      getInverseTranspose3x3(){
        // 3x3部分の転置行列の逆行列を型付の配列3x3, つまり長さ9で提供する。
        // modelやview * modelにこれをかますとそういう行列を得る。
        // なお、こっちではmodelのあとにviewをかますのを「view*model」と表現する
        // glsl内部と順番が逆だが特に意識することはないだろう。

        const n = new Array(9).fill(0);
        n[0] = this.m[0]; n[1] = this.m[4]; n[2] = this.m[8];
        n[3] = this.m[1]; n[4] = this.m[5]; n[5] = this.m[9];
        n[6] = this.m[2]; n[7] = this.m[6]; n[8] = this.m[10];
        // nを転置するのは終わってるので逆行列を取って終わり。
        // n[0] n[1] n[2]  48-57  27-18  15-24
        // n[3] n[4] n[5]  56-38  08-26  23-05
        // n[6] n[7] n[8]  37-46  16-07  04-13
        const result = new Float32Array(9);
        const det = n[0]*n[4]*n[8] + n[1]*n[5]*n[6] + n[2]*n[3]*n[7] - n[2]*n[4]*n[6] - n[1]*n[3]*n[8] - n[0]*n[5]*n[7];
        const indices = [4,8,5,7, 2,7,1,8, 1,5,2,4,
                         5,6,3,8, 0,8,2,6, 2,3,0,5,
                         3,7,4,6, 1,6,0,7, 0,4,1,3];
        for(let i=0; i<9; i++){
          const offset = i*4;
          const a0 = indices[offset];
          const a1 = indices[offset+1];
          const a2 = indices[offset+2];
          const a3 = indices[offset+3];
          result[i] = (n[a0] * n[a1] - n[a2] * n[a3]) / det;
        }
        return result;
      }
      invert(immutable = false){
        // 4x4の逆行列
        if(immutable){
          return this.copy().invert(false);
        }
        // ここで計算
        const cofactors = [];
        for(let i=0; i<16; i++){
          cofactors.push(MT4.getCofactor(this, i));
        }
        const determinantValue = cofactors[0]*this.m[0]+cofactors[1]*this.m[1]+cofactors[2]*this.m[2]+cofactors[3]*this.m[3];
        for(let i=0; i<16; i++){
          this.m[i] = cofactors[i]/determinantValue;
        }
        this.transpose(false);
        return this;
      }
      localScale(a=1,b=1,c=1){
        // 引数が1個なら全部一緒
        if(arguments.length === 1){
          b = a; c = a;
        }
        // a,0,0,0, 0,b,0,0, 0,0,c,0, 0,0,0,1を右から掛ける。各々の軸を定数倍。
        return this.multM([a,0,0,0, 0,b,0,0, 0,0,c,0, 0,0,0,1]);
      }
      globalScale(a=1,b=1,c=1){
        // 引数が1個なら全部一緒
        if(arguments.length === 1){
          b = a; c = a;
        }
        // a,0,0,0, 0,b,0,0, 0,0,c,0, 0,0,0,1を左から掛ける。大域原点中心に拡大。
        return this.inverseMultM([a,0,0,0, 0,b,0,0, 0,0,c,0, 0,0,0,1]);
      }
      localTranslation(a=0,b=0,c=0){
        // 引数は配列やベクトルも可能とする。
        if(Array.isArray(a)){
          this.localTranslation(a[0], a[1], a[2]);
          return this;
        }else if(a instanceof Vecta){
          this.localTranslation(a.x, a.y, a.z);
          return this;
        }
        // 1,0,0,a, 0,1,0,b, 0,0,1,c, 0,0,0,1を右から掛ける。軸のa,b,c倍で局所原点を...
        return this.multM([1,0,0,a, 0,1,0,b, 0,0,1,c, 0,0,0,1]);
      }
      globalTranslation(a=0,b=0,c=0){
        // 引数は配列やベクトルも可能とする。
        if(Array.isArray(a)){
          this.globalTranslation(a[0], a[1], a[2]);
          return this;
        }else if(a instanceof Vecta){
          this.globalTranslation(a.x, a.y, a.z);
          return this;
        }
        // 1,0,0,a, 0,1,0,b, 0,0,1,c, 0,0,0,1を左から掛ける。
        // 局所原点の平行移動。
        return this.inverseMultM([1,0,0,a, 0,1,0,b, 0,0,1,c, 0,0,0,1]);
      }
      localRotation(axis, angle){
        // 回転行列を右から掛ける。例えば0,1,0だったらローカルy軸周りの回転
        const rot = MT4.getRotationMatrix(...arguments);
        return this.multM(rot);
      }
      globalRotation(axis, angle){
        // 回転行列を左から掛ける。グローバル。大域原点周りの回転。
        const rot = MT4.getRotationMatrix(...arguments);
        return this.inverseMultM(rot);
      }
      localRotationQ(w=1, x=0, y=0, z=0){
        // 単位クォータニオン限定。wはQuarternion可
        const rot = MT4.getRotationMatrixQ(...arguments);
        return this.multM(rot);
      }
      globalRotationQ(w=1, x=0, y=0, z=0){
        // 単位クォータニオン限定。wはQuarternion可
        const rot = MT4.getRotationMatrixQ(...arguments);
        return this.inverseMultM(rot);
      }
      setScale(a=1,b=1,c=1){
        return this.init().localScale(...arguments);
      }
      setTranslation(a=0, b=0, c=0){
        return this.init().localTranslation(...arguments);
      }
      setRotation(axis, angle){
        return this.init().localRotation(...arguments);
      }
      setRotationQ(w=1, x=0, y=0, z=0){
        // 単位クォータニオン限定。wはQuarternion可
        return this.init().localRotationQ(...arguments);
      }
      setPerseProjection(fov, aspect, near, far){
        // パース射影行列。
        const factor = 1/Math.tan(fov/2);
        this.set([
          factor/aspect, 0, 0, 0,
          0, factor, 0, 0,
          0, 0, (near+far)/(near-far), 2*near*far/(near-far),
          0, 0, -1, 0
        ]);
        return this;
      }
      setOrthoProjection(_width, _height, near, far){
        // 平行投影射影行列
        this.set([
          2/_width, 0, 0, 0,
          0, 2/_height, 0, 0,
          0, 0, -2/(far-near), -(far+near)/(far-near),
          0, 0, 0, 1
        ]);
        return this;
      }
      setMatrixFromQuarternion(q){
        // qのノルムでスケール。
        // 正規化して回転行列
        // 順に掛ける
        // 単位クォータニオン前提でもいいんだけどなんかもったいないので
        const s = q.mag();
        if(s < Number.EPSILON){
          return new MT4();
        }
        const qRot = q.copy().mult(1/s);
        const axes = qRot.getAxes();
        this.set(
          axes.x.x, axes.y.x, axes.z.x, 0,
          axes.x.y, axes.y.y, axes.z.y, 0,
          axes.x.z, axes.y.z, axes.z.z, 0,
          0, 0, 0, 1
        );
        const scaleMat = MT4.getScale(s);
        this.multM(scaleMat);
        return this;
      }
      static getRotationMatrix(axis, angle){
        // 回転行列部分だけ取り出すか
        // 軸の指定方法は3種類
        if(Array.isArray(axis)){
          axis = new Vecta(axis[0], axis[1], axis[2]);
        }else if(arguments.length === 4){
          axis = new Vecta(arguments[0], arguments[1], arguments[2]);
          angle = arguments[3];
        }
        // 元のベクトルが変化しないようにする
        axis = axis.copy().normalize();
        // axisはベクトル。angleは角度。
        const C = Math.cos(angle);
        const OC = 1-Math.cos(angle);
        const S = Math.sin(angle);
        const {x, y, z} = axis;
        return new MT4(
          C + OC*x*x, OC*x*y - S*z, OC*x*z + S*y, 0,
          OC*x*y + S*z, C + OC*y*y, OC*y*z - S*x, 0,
          OC*x*z - S*y, OC*y*z + S*x, C + OC*z*z, 0,
          0, 0, 0, 1
        );
      }
      static getRotationMatrixQ(w=1, x=0, y=0, z=0){
        // wがQuarternionの場合はw.w,w.x,w.y,w.zで引数4つに落とす
        // このあと「~~Q」という関数をいくつか用意するんですが、
        // すべて「単位クォータニオン限定」です。
        // 要するにgltfのための関数群です。
        if (w instanceof Quarternion){
          return MT4.getRotationMatrixQ(w.w, w.x, w.y, w.z);
        }
        return new MT4(
          2*w*w-1 + 2*x*x, 2*(x*y - z*w), 2*(x*z + y*w), 0,
          2*(x*y + z*w), 2*w*w-1 + 2*y*y, 2*(y*z - x*w), 0,
          2*(x*z - y*w), 2*(y*z + x*w), 2*w*w-1 + 2*z*z, 0,
          0, 0, 0, 1
        );
      }
      // 引数のバリエーションが豊富でいちいちバリデーション掛けた方が負荷が大きい場合は
      // immutableをstaticで用意した方がいい。ベクトルとは事情が違う。こっちは関数も
      // 少ないし。臨機応変ということ。
      static getScale(){
        return (new MT4()).setScale(...arguments);
      }
      static getRotation(){
        return (new MT4()).setRotation(...arguments);
      }
      static getRotationQ(){
        return (new MT4()).setRotationQ(...arguments);
      }
      static getTranslation(){
        return (new MT4()).setTranslation(...arguments);
      }
      static getPerseProjection(){
        // パース射影行列。
        return (new MT4()).setPerseProjection(...arguments);
      }
      static getOrthoProjection(){
        // 平行投影射影行列。
        return (new MT4()).setOrthoProjection(...arguments);
      }
      static getMatrixFromQuarternion(){
        return (new MT4()).setMatrixFromQuarternion(...arguments);
      }
      static getCofactor(m, c = 0){
        // mの余因子を取得する関数
        // たとえばc=1の場合、左上から右に1,下に0のところでクロスで切断して
        // 符号は-1となりますね
        m = (m instanceof MT4 ? m.m : m);
        // mは16配列
        const a=c%4;
        const b=(c/4)|0;
        // 例：a=2,b=1の場合は2+4でpivotは6です
        // a=1,b=3の場合は4*3+1=13がpivotです～
        const detSign = 1-2*((a+b)&1);
        const u=[];
        for(let i=0;i<16;i++){
          if((i%4)===a || ((i/4)|0)===b)continue;
          u.push(m[i]);
        }
        return (u[0]*u[4]*u[8] + u[1]*u[5]*u[6] + u[2]*u[3]*u[7] - u[0]*u[5]*u[7] - u[1]*u[3]*u[8] - u[2]*u[4]*u[6])*detSign;
      }
      static assert(m, n, threshold = 0, directConsole = false){
        // mとnはMT4もしくは長さ16の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const mA = (m instanceof MT4 ? m.array() : m);
        const nA = (n instanceof MT4 ? n.array() : n);
        for(let i=0; i<4; i++){
          if(Math.abs(mA[i] - nA[i]) > threshold){
            console.log(`${i}: ${mA[i]}, ${nA[i]}`);
            if(directConsole){ console.log(false); }
            return false;
          }
        }
        if(directConsole){ console.log(true); }
        return true;
      }
    }

    // --------------------------------- QCamera --------------------------------- //

    // 射影は考慮しない。ビューのみ。なおデフォルトはyUpとする。上記のクラスを総動員する。
    // north → topに名称変更。これを使ってaxesを構成する。stateはeyeとcenterとノルム付きクォータニオン。理由は補間を楽にやるため。
    // カメラワークの汎用関数を導入。一般的に扱う。グローバル/ローカル乗算、視点と注視点どっちを固定するかのoption.
    // vRoidHubのような制限付きorbitControlは手動で構成することにした。またはそういうクラスを作ってもいいかもしれない。ただ自由が欲しい。

    // 射影行列は必要だということになった
    // ただしstateには含めず独立させる
    // 逆行列をセットで保持する
    // 取得するとき両方取得できるようにしておく
    // あとスクリーン座標関連のメソッドを充実させる感じで
    class QCamera{
      constructor(params = {}){
        // paramsではeye, center, topを配列やベクトルで定義する感じ。あとは要らない。
        this.eye = new Vecta();
        this.center = new Vecta();
        this.front = new Vecta();
        this.side = new Vecta();
        this.up = new Vecta();
        this.q = new Quarternion();
        this.view = new MT4();

        this.initialize(params);

        // projは別に設定する
        this.proj = new MT4();
        this.invProj = new MT4();

        this.states = {};
        this.saveState("default");
      }
      initialize(params = {}){
        // 据え置きは認めないものとする。
        // proj要らないや。やめよ。setProjに一任する。
        const {
          eye = [0,1,3], center = [0,0,0], top = [0,1,0]
        } = params;
        this.eye.set(eye);
        this.center.set(center);
        const topAxis = Vecta.create(top);
        this.setAxesFromParam(topAxis);
        this.setQuarternionFromAxes();
        this.setView();
        // fovとかパラメータで設定できるようにもする。継承で。
        return this;
      }
      setViewParam(params = {}){
        // 据え置きが無いとどう考えても不便なので用意します。
        // viewだけ。projは別にいい。setProjで遊ぶんで。topは保持できないんでご了承。
        const {
          eye = this.eye, center = this.center, top = [0,1,0]
        } = params;
        // 改変したうえでぶちこむ。
        this.initialize({eye, center, top});
        return this;
      }
      getParam(){
        return {eye:this.eye, center:this.center};
      }
      getAxes(){
        return {side:this.side, up:this.up, front:this.front};
      }
      getQuarternion(){
        return this.q;
      }
      setAxesFromParam(topAxis){
        // frontはeyeからcenterを引いたのち正規化する
        this.front.set(this.eye).sub(this.center).normalize();
        // 引数のベクトルは「上」を定めるもの。
        this.side.set(topAxis).cross(this.front).normalize(); // これでいいと思う。
        this.up.set(this.front).cross(this.side); // これでいいですね。
        // front,side,upがz,x,yに当たる。
        // crossのnon-immutableも使いどころあるじゃん。
        return this;
      }
      setAxesFromQuarternion(){
        // 当然だが単位クォータニオンでないと失敗する
        const axes = this.q.getAxes();
        this.side.set(axes.x);
        this.up.set(axes.y);
        this.front.set(axes.z);
        return this;
      }
      setQuarternionFromAxes(){
        // 直交行列からクォータニオンを出す例の方法
        // https://github.com/mrdoob/three.js/blob/r172/src/math/Quaternion.js#L294
        this.q = Quarternion.getFromAxes(this.side, this.up, this.front);
        return this;
      }
      setView(){
        // front, side, upから行列を作るだけ。
        // 意味は内積で軸成分を算出するところをイメージすれば分かりやすいかと
        this.view.set([
          this.side.x, this.side.y, this.side.z, 0,
          this.up.x, this.up.y, this.up.z, 0,
          this.front.x, this.front.y, this.front.z, 0,
          0, 0, 0, 1
        ]);
        this.view.multM([
          1, 0, 0, -this.eye.x,
          0, 1, 0, -this.eye.y,
          0, 0, 1, -this.eye.z,
          0, 0, 0, 1
        ]);
      }
      getView(){
        return this.view;
      }
      setProj(params = {}){
        // projという形で射影行列かそのソースが与えられているならそれをセットする。
        // そういう形式にする。継承では別の形を取る。
        const {proj} = params;
        if(proj !== undefined && (Array.isArray(proj) || proj instanceof MT4)){
          this.proj.set(proj);
          this.invProj.set(this.proj.invert(true));
        }
        return this;
      }
      getProj(invert = false){
        if(invert){ return this.invProj; }
        return this.proj;
      }
      cameraWork(params = {}){
        // qRotは作用子、globalは左乗算（falseで右乗算）、
        // centerFixedは注視点固定（falseで視点固定）
        // 網羅はしてないけどとりあえずこんなもんで。
        const {qRot, global = true, centerFixed = true} = params;
        const newQ = (global ? qRot.multQ(this.q, true) : this.q.multQ(qRot, true));
        this.q.set(newQ);
        this.setAxesFromQuarternion();
        const d = this.eye.dist(this.center);
        if(centerFixed){
          this.eye.set(this.center).addScalar(this.front, d);
        }else{
          this.center.set(this.eye).addScalar(this.front, -d);
        }
        this.setView();
        return this;
      }
      rotateCenterFixed(){
        // グローバル軸周り回転（注視点固定）
        const res = QCamera.validate(...arguments);
        const qRot = Quarternion.getFromAA(res.v, res.delta);
        return this.cameraWork({
          qRot:qRot, global:true, centerFixed:true
        });
      }
      rotateEyeFixed(){
        // グローバル軸周り回転（視点固定）
        const res = QCamera.validate(...arguments);
        const qRot = Quarternion.getFromAA(res.v, res.delta);
        return this.cameraWork({
          qRot:qRot, global:true, centerFixed:false
        });
      }
      spin(delta){
        // ローカルのup周りの回転（注視点固定）
        return this.cameraWork({
          qRot:Quarternion.getFromAA(0,1,0,delta), global:false, centerFixed:true
        });
      }
      pan(delta){
        // ローカルのup周りの回転（視点固定）
        return this.cameraWork({
          qRot:Quarternion.getFromAA(0,1,0,delta), global:false, centerFixed:false
        });
      }
      angle(delta){
        // ローカルのside周りの回転（注視点固定）
        return this.cameraWork({
          qRot:Quarternion.getFromAA(1,0,0,delta), global:false, centerFixed:true
        });
      }
      tilt(delta){
        // ローカルのside周りの回転（視点固定）
        return this.cameraWork({
          qRot:Quarternion.getFromAA(1,0,0,delta), global:false, centerFixed:false
        });
      }
      roll(delta){
        // ローカルのfront軸周りの回転
        return this.cameraWork({
          qRot:Quarternion.getFromAA(0,0,1,delta), global:false
        });
      }
      lookAt(){
        // centerがベクトルに一致するように、eyeとcenterを平行移動する。
        // 列挙と配列もOKである。
        const newCenter = QCamera.validate(...arguments).v;
        // newCenterはベクトル
        const difference = newCenter.sub(this.center);
        this.center.add(difference);
        this.eye.add(difference);
        this.setView();
        return this;
      }
      move(){
        // v.xだけside,v.yだけup,v.zだけfront方向にeyeとcenterを平行移動する。
        // ベクトルの他、列挙と配列がOKである。
        const v = QCamera.validate(...arguments).v;
        // vはベクトル
        const difference = new Vecta().addScalar(this.side, v.x).addScalar(this.up, v.y).addScalar(this.front, v.z);
        this.center.add(difference);
        this.eye.add(difference);
        this.setView();
        return this;
      }
      moveNDC(dx, dy){
        // dx, dyはNDCベースの変位. centerをその分だけ平行移動して、lookAtで一致させる。
        const centerNDC = this.getNDCFromGlobal(this.center);
        centerNDC.add(dx, dy, 0);
        const newCenter = this.getGlobalFromNDC(centerNDC.x, centerNDC.y, this.center);
        this.lookAt(newCenter);
        return this;
      }
      zoom(ratio, centerFixed = true){
        // ratioは正の数。これで割る。距離を。たとえば2倍拡大なら2で割る。
        // ビューの軸やクォータニオンの変化はありません。
        const d = this.eye.dist(this.center);
        if(centerFixed){
          this.eye.set(this.center).addScalar(this.front, d/ratio);
        }else{
          this.center.set(this.eye).addScalar(this.front, -d/ratio);
        }
        this.setView();
        return this;
      }
      saveState(stateName = "default"){
        const d = this.eye.dist(this.center);
        // eyeとノルム付きクォータニオンで復元できる。コピー取らないと更新されちゃうよ！
        this.states[stateName] = {
          eye:this.eye.copy(), center:this.center.copy(), q:this.q.mult(d, true)
        };
        return this;
      }
      loadState(stateName = "default"){
        const {eye, center, q} = this.states[stateName];
        this.q.set(q).normalize(); // 正規化する。
        this.setAxesFromQuarternion();
        this.eye.set(eye);
        this.center.set(center);
        this.setView();
        return this;
      }
      lerpState(fromStateName, toStateName, amt = 0){
        // 目と中心を結ぶ線分を動かしてその間の点で軌跡が短いものを取って、
        // それとqの補間から色々決める。
        // amtが0と1のときだけloadStateでやる。
        if(amt === 0){
          this.loadState(fromStateName);
          return this;
        }else if(amt === 1){
          this.loadState(toStateName);
          return this;
        }
        const {eye:fromEye, center:fromCenter, q:fromQ} = this.states[fromStateName];
        const {eye:toEye, center:toCenter, q:toQ} = this.states[toStateName];
        const eyeDiff = fromEye.copy().sub(toEye);
        const diffDiff = fromEye.copy().sub(toEye).sub(fromCenter).add(toCenter);
        const divider = diffDiff.magSq(); // magSqで書き直し
        let ratio = 1; // default.
        // dividerはfromのベクトルとtoのベクトルの差を表すもの
        // これが小さいならどこを中心にとっても大差ない。
        if (divider > Number.EPSILON){
          ratio = eyeDiff.dot(diffDiff) / divider;
          ratio = Math.max(0, Math.min(ratio, 1));
        }
        // これが補間された重心で、このあとでこれとratioと補間されたfrontを使って
        // eyeとcenterの位置を決める。
        const lerpedMedium = fromEye.copy().lerp(fromCenter, ratio).lerp(toEye.copy().lerp(toCenter, ratio), amt);
        // クォータニオンを補間する（fromQが変化しないようにtrueを指定）
        const lerpedQ = fromQ.slerp(toQ, amt, true);
        // ノルムと単位を分ける
        const lerpedDist = lerpedQ.mag();
        lerpedQ.mult(1/lerpedDist);
        this.q.set(lerpedQ);
        this.setAxesFromQuarternion();
        // eyeとcenterの更新
        this.eye.set(this.front).mult(ratio * lerpedDist).add(lerpedMedium);
        this.center.set(this.front).mult((ratio-1) * lerpedDist).add(lerpedMedium);
        // northは廃止されました
        this.setView();
        return this;
      }
      getNDCFromGlobal(v){
        // global点からNDCを計算するだけ。view, proj.
        // 引数はとりあえずベクトル限定でいいかと。
        const u = this.view.multV(v, true);
        const p = this.proj.m;
        const divider = p[12]*u.x + p[13]*u.y + p[14]*u.z + p[15];
        this.proj.multV(u);
        u.div(divider);
        // u.x, u.yがNDCで、u.zは-1～1の深度値。0.5倍して0.5を足すと正式な深度値
        // になる。0が最も近くで、1が最も遠い。
        return u;
      }
      getGlobalFromNDC(x1, y1, v){
        // x1,y1はNDCで、この点をNDCとするグローバル点のうち、vと同じview-zを持つ
        // ものを返す。まずvのview-zを取得する。次いで、目的のviewベクトルのうち
        // zと1は分かっているので、それを解とするinvProj係数の方程式を作ることで
        // 深度値と除数を算出。それらよりviewベクトルを作り、最終的にglobalまで
        // もっていく。
        // この式でいいかどうかは知らんです。式いじってたらこうなった。
        const ip = this.invProj.m;
        const z = this.view.multV(v, true).z;
        const a = ip[8]*x1 + ip[9]*y1 + ip[11];
        const b = ip[10];
        const c = ip[12]*x1 + ip[13]*y1 + ip[15];
        const d = ip[14];
        const z1 = (a-c*z)/(d*z-b);
        const w = (d*z-b)/(a*d-b*c);
        const x = w*(ip[0]*x1 + ip[1]*y1 + ip[2]*z1 + ip[3]);
        const y = w*(ip[4]*x1 + ip[5]*y1 + ip[6]*z1 + ip[7]);
        // 最終的にglobalまでもっていく
        const result = this.eye.copy().addScalar(this.side, x).addScalar(this.up, y).addScalar(this.front, z);
        // できたかも。
        return result;
      }
      static validate(){
        // ベクトルに関しては数の列挙と配列とベクトルを許す。それと回転角。
        const args = [...arguments];
        if(args.length === 1){
          // 引数の個数が1の場合は0を補う
          return QCamera.validate(args[0], 0);
        }else if(args.length === 3){
          // 引数の個数が3の場合は0を補う
          return QCamera.validate(args[0], args[1], args[2], 0);
        }else if(args.length === 4 && typeof(args[0]) === 'number'){
          // 引数の個数が4の場合は始めの3つでベクトル
          return {v:new Vecta(args[0], args[1], args[2]), delta:args[3]};
        }else if(arguments.length === 2){
          // 引数の個数が2の場合は配列かベクトルからベクトル
          if(args[0] instanceof Vecta){
            return {v:args[0], delta:args[1]};
          }else if(Array.isArray(args[0])){
            return {v:new Vecta(args[0][0], args[0][1], args[0][2]), delta:args[1]};
          }
        }
        return {v:new Vecta(0,1,0), delta:0};
      }
    }

    // perseの射影を生成時に用意できる便利版
    class QCameraPerse extends QCamera{
      constructor(params = {}){
        super(params);
        this.fov = 1;
        this.aspect = 1;
        this.near = 0.1;
        this.far = 10;
        this.setProj(params);
      }
      setProj(params = {}){
        const {
          fov = this.fov, aspect = this.aspect,
          near = this.near, far = this.far
        } = params;
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.proj.setPerseProjection(fov, aspect, near, far);
        this.invProj.set(this.proj.invert(true));
        return this;
      }
    }

    // orthoの射影を生成時に用意できる便利版
    class QCameraOrtho extends QCamera{
      constructor(params = {}){
        super(params);
        this.width = 4;
        this.height = 4;
        this.near = 0.1;
        this.far = 10;
        this.setProj(params);
      }
      setProj(params = {}){
        const {
          width:w = this.width, height:h = this.height,
          near = this.near, far = this.far
        } = params;
        this.width = w;
        this.height = h;
        this.near = near;
        this.far = far;
        this.proj.setOrthoProjection(w, h, near, far);
        this.invProj.set(this.proj.invert(true));
        return this;
      }
    }

    // --------------------------------- MT3 --------------------------------- //

    class MT3{
      constructor(){
        // 列挙のみ許す。
        const args = [...arguments];
        this.m = new Float32Array(9);
        if(args.length === 0){
          // 空っぽの場合
          for(let i=0; i<9; i++){
            this.m[i] = (i%4===0 ? 1 : 0); // 単位行列
          }
        }else if(args.length === 4){
          // 2x2の場合（単位行列でベースを作って左上だけ上書きする）
          for(let i=0; i<9; i++){
            this.m[i] = (i%4===0 ? 1 : 0); // 単位行列
          }
          for(let y=0; y<2; y++){
            for(let x=0; x<2; x++){
              this.m[3*y+x] = args[2*y+x];
            }
          }
        }else{
          // 3x3の場合も含めて「その他」
          for(let i=0; i<9; i++){
            if(i<args.length){
              this.m[i] = args[i];
            }else{
              this.m[i] = 0;
            }
          }
        }
      }
      set(n){
        if(Array.isArray(n)){
          if(n.length === 4){
            // 4の場合は左上の2x2におく
            for(let i=0; i<9; i++){
              this.m[i] = (i%4===0 ? 1 : 0); // 単位行列
            }
            // 左上だけ上書き
            for(let y=0; y<2; y++){
              for(let x=0; x<2; x++){
                this.m[3*y+x] = n[2*y+x];
              }
            }
          }else{
            // 0埋めしてるけど基本9想定
            for(let i=0; i<9; i++){
              if(i < n.length){ this.m[i] = n[i]; }else{ this.m[i] = 0; }
            }
          }
          return this;
        }else if(typeof(arguments[0]) === 'number'){
          // 列挙の場合
          const args = [...arguments];
          return this.set(args);
        }
        // 最後に、普通に行列の場合
        for(let i=0; i<9; i++){ this.m[i] = n.m[i]; }
        return this;
      }
      copy(){
        const m = new MT3();
        return m.set(this);
      }
      show(directConsole = false, threshold = 0){
        // 閾値でチェックして絶対値がそれ未満であれば0とする
        const showValues = [];
        for(let i=0; i<9; i++){
          showValues.push(Math.abs(this.m[i]) < threshold ? 0 : this.m[i]);
        }
        // trueの場合は直接コンソールに出す
        const info = `${showValues[0]}, ${showValues[1]}, ${showValues[2]}, \n${showValues[3]}, ${showValues[4]}, ${showValues[5]}, \n${showValues[6]}, ${showValues[7]}, ${showValues[8]}`;
        if(directConsole){
          console.log(info);
        }
        return info;
      }
      convert(){
        // まあ要らないんだけど0,3,1,4,2,5の配列を返すんです。要らないけど。
        return [this.m[0], this.m[3], this.m[1], this.m[4], this.m[2], this.m[5]];
      }
      array(){
        // Float32Arrayではなく通常のArray形式で成分配列を返す。一列につなげたりするのに便利かと。Float32はpushとか使えないし。
        const a = new Array(9);
        for(let i=0; i<9; i++){ a[i] = this.m[i]; }
        return a;
      }
      init(){
        // 単位行列で初期化
        this.set([1,0,0, 0,1,0, 0,0,1]);
        return this;
      }
      add(n, immutable = false){
        // 和
        if(immutable){
          return this.copy().add(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        for(let i=0; i<9; i++){
          this.m[i] += target[i];
        }
        return this;
      }
      sub(n, immutable = false){
        // 差
        if(immutable){
          return this.copy().sub(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        for(let i=0; i<9; i++){
          this.m[i] -= target[i];
        }
        return this;
      }
      multV(v, immutable = false){
        // vは3次元ベクトルでx,y,z成分を持つ
        // Vectaでもp5.Vectorでも{x,y,z}でも何でもあり。
        if(immutable){
          // 不変
          return this.multV(v.copy(), false);
        }
        const {x:a, y:b, z:c} = v;
        v.x = this.m[0]*a + this.m[1]*b + this.m[2]*c;
        v.y = this.m[3]*a + this.m[4]*b + this.m[5]*c;
        v.z = this.m[6]*a + this.m[7]*b + this.m[8]*c;
        return v;
      }
      multM(n, immutable = false){
        // nのところには配列も入れられるようにする。ただし長さは9限定とする。
        if(immutable){
          // 不変
          return this.copy().multM(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        const m2 = new Array(9);
        for(let i=0; i<9; i++){ m2[i] = this.m[i]; }
        for(let k=0; k<3; k++){
          for(let i=0; i<3; i++){
            this.m[3*k+i] = m2[3*k]*target[i] + m2[3*k+1]*target[i+3] + m2[3*k+2]*target[i+6];
          }
        }
        return this;
      }
      inverseMultM(n, immutable = false){
        // nのところには配列も入れられるようにする。ただし長さは9限定とする。
        if(immutable){
          // 不変
          return this.copy().inverseMultM(n, false);
        }
        const target = (Array.isArray(n) ? n : n.m);
        const m2 = new Array(9);
        for(let i=0; i<9; i++){ m2[i] = this.m[i]; }
        for(let k=0; k<3; k++){
          for(let i=0; i<3; i++){
            this.m[3*k+i] = target[3*k]*m2[i] + target[3*k+1]*m2[i+3] + target[3*k+2]*m2[i+6];
          }
        }
        return this;
      }
      transpose(immutable = false){
        if(immutable){
          return this.copy().transpose(false);
        }
        let swapper;
        for(let k=0; k<3; k++){
          for(let i=k+1; i<3; i++){
            swapper = this.m[3*k+i];
            this.m[3*k+i] = this.m[3*i+k];
            this.m[3*i+k] = swapper;
          }
        }
        return this;
      }
      invert(immutable = false){
        if(immutable){
          return this.copy().invert(false);
        }
        const n = this.array();
        const det = n[0]*n[4]*n[8] + n[1]*n[5]*n[6] + n[2]*n[3]*n[7] - n[2]*n[4]*n[6] - n[1]*n[3]*n[8] - n[0]*n[5]*n[7];
        const indices = [4,8,5,7, 2,7,1,8, 1,5,2,4,
                         5,6,3,8, 0,8,2,6, 2,3,0,5,
                         3,7,4,6, 1,6,0,7, 0,4,1,3];
        for(let i=0; i<9; i++){
          const offset = i*4;
          const a0 = indices[offset];
          const a1 = indices[offset+1];
          const a2 = indices[offset+2];
          const a3 = indices[offset+3];
          this.m[i] = (n[a0] * n[a1] - n[a2] * n[a3]) / det;
        }
        return this;
      }
      localScale(a=1,b=1){
        // 引数が1つなら全部一緒
        if(arguments.length === 1){
          b = a;
        }
        // a,0,0,0,b,0,0,0,1を右から掛ける。局所原点に対してa倍、b倍される
        return this.multM([a,0,0,0,b,0,0,0,1]);
      }
      globalScale(a=1,b=1){
        // 引数が1つなら全部一緒
        if(arguments.length === 1){
          b = a;
        }
        // a,0,0,0,b,0,0,0,1を左から掛ける。大域原点中心で成分ごとに拡大される。
        return this.inverseMultM([a,0,0,0,b,0,0,0,1]);
      }
      localTranslation(a=0,b=0){
        // 1,0,a,0,1,b,0,0,1を右から掛ける。局所原点にa*ex+b*eyが足される。
        return this.multM([1,0,a,0,1,b,0,0,1]);
      }
      globalTranslation(a=0,b=0){
        // 1,0,a,0,1,b,0,0,1を左から掛ける。局所原点が(a,b)だけ移動する。
        return this.inverseMultM([1,0,a,0,1,b,0,0,1]);
      }
      localRotation(t=0){
        // cos(t),-sin(t),0,sin(t),cos(t),0,0,0,1を右から掛ける。
        // 座標軸が局所原点中心にtだけ回転する。
        const c = Math.cos(t);
        const s = Math.sin(t);
        return this.multM([c,-s,0,s,c,0,0,0,1]);
      }
      globalRotation(t=0){
        // cos(t),-sin(t),0,sin(t),cos(t),0,0,0,1を左から掛ける。
        // 座標軸が大域原点中心にtだけ回転する。
        const c = Math.cos(t);
        const s = Math.sin(t);
        return this.inverseMultM([c,-s,0,s,c,0,0,0,1]);
      }
      setScale(a=1,b=1,c=1){
        return this.init().localScale(...arguments);
      }
      setTranslation(a=0,b=0,c=0){
        return this.init().localTranslation(...arguments);
      }
      setRotation(t=0){
        return this.init().localRotation(...arguments);
      }
      static getScale(){
        return (new MT3()).setScale(...arguments);
      }
      static getRotation(){
        return (new MT3()).setRotation(...arguments);
      }
      static getTranslation(){
        return (new MT3()).setTranslation(...arguments);
      }
    }

    tools.Vecta = Vecta;
    tools.Quarternion = Quarternion;
    tools.MT4 = MT4;
    tools.QCamera = QCamera;
    tools.QCameraPerse = QCameraPerse;
    tools.QCameraOrtho = QCameraOrtho;
    tools.MT3 = MT3;

    return tools;
  })();

  // ------------------------------------------------------------------------------------------------------------------------------------------ //
  // foxApplication.
  // CameraControllerなどはここに属する。上記3つと違って切り売りができない。
  // 多分テッセレーションとかもここ？

  const foxApplications = (function(){
    const applications = {};

    const {Damper, Tree, saveCanvas, ResourceLoader} = foxUtils;
    const {Interaction, Inspector} = foxIA;
    const {Vecta, MT3, MT4} = fox3Dtools;

    // isActiveを追加。カメラが動いてるときだけ更新するなどの用途がある。
    // configも追加。操作性をいじるための機能。actionCoeffを変更できる。デフォルトは1. thresholdも0.01とかでいいかもだしな。
    // moveはmoveNDCでないとまずいでしょう
    class CameraController extends Interaction{
      constructor(canvas, options = {}, params = {}){
        super(canvas, options);
        const {cam} = params;
        this.mouseScaleFactor = 0.0001;
        this.mouseRotationFactor = 0.001;
        this.mouseTranslationFactor = 0.0008;
        this.touchScaleFactor = 0.00025;
        this.touchRotationFactor = 0.001;
        this.touchTranslationFactor = 0.00085;
        this.topAxis = new Vecta(0,1,0);
        this.upperBound = 0.01;
        this.lowerBound = 0.01;
        this.rotationMode = "free"; // none, free, axis

        this.rotationMouseButton = 0; // マウスで操作する場合の回転に使うボタン（デフォルト左）
        this.translationMouseButton = 2; // マウスで操作する場合の平行移動に使うボタン（デフォルト右）

        this.setParam(params);

        this.cam = cam;
        this.dmp = new Damper(
          "rotationX", "rotationY", "scale", "translationX", "translationY"
        );
        this.dmp.setMain((t) => {
          this.cam.zoom(Math.pow(10, t.getValue("scale")));
          const rx = t.getValue("rotationX");
          const ry = t.getValue("rotationY");
          const angle = Math.hypot(rx, ry);
          if(angle > Number.EPSILON){
            switch(this.rotationMode){
              case "free":
                this.freeRotation(rx, ry, angle); break;
              case "axis":
                this.axisRotation(rx, ry); break;
            }
          }
          const tx = t.getValue("translationX");
          const ty = t.getValue("translationY");
          //this.cam.move(-tx, ty, 0);
          // aspect比が変わっても平行移動がおかしくならないようにする
          const aspectFactor = (this.cam.aspect !== undefined ? this.cam.aspect : this.cam.width/this.cam.height);
          if(aspectFactor > 1){
            this.cam.moveNDC(-tx/aspectFactor, ty);
          }else{
            this.cam.moveNDC(-tx, ty*aspectFactor);
          }
          //this.cam.moveNDC(-tx, ty);
        });
      }
      axisRotation(rx, ry){
        // topAxisの周りにrxだけglobal回転
        // sideの周りにryだけlocal回転
        // ただしtopAxisとfrontの角度を調べてboundで制限する
        this.cam.rotateCenterFixed(this.topAxis, -rx);
        const front = this.cam.getAxes().front;
        const between = front.angleBetween(this.topAxis);
        // between-ryをupperBoundとPI-lowerBoundの範囲に抑える
        // 抑えた値からbetweenを引く
        const nextBetween = Math.min(Math.max(between - ry, this.upperBound), Math.PI - this.lowerBound);
        const properDiff = nextBetween - between;
        this.cam.angle(properDiff);
      }
      freeRotation(rx, ry, angle){
        const center = this.cam.getParam().center;
        const front = this.cam.getAxes().front;
        const toPos = this.cam.getGlobalFromNDC(rx, -ry, center);
        const rotationAxis = toPos.sub(center).normalize();
        rotationAxis.rotate(front, -Math.PI*0.5);
        this.cam.rotateCenterFixed(rotationAxis, angle);
      }
      setParam(params = {}){
        // おかしなものをいじられないようにする. dmpとかいじられるとまずいので。
        const paramList = [
          "mouseScaleFactor", "mouseRotationFactor", "mouseTranslationFactor",
          "touchScaleFactor", "touchRotationFactor", "touchTranslationFactor",
          "topAxis", "upperBound", "lowerBound", "rotationMode",
          "rotationMouseButton", "translationMouseButton"
        ];
        for(const param of Object.keys(params)){
          if (paramList.indexOf(param) < 0) continue;
          this[param] = params[param];
        }
      }
      update(){
        this.dmp.execute();
        this.dmp.applyAll("update");
      }
      pause(){
        this.dmp.applyAll("pause");
      }
      start(){
        this.dmp.applyAll("start");
      }
      reset(){
        this.dmp.applyAll("reset");
      }
      mouseMoveDefaultAction(dx,dy,x,y){
        // 回転・平行移動
        if(this.pointers.length === 0) return;
        const btn = this.pointers[0].button;
        if(btn === this.rotationMouseButton){
          // 左の場合
          this.dmp.action("rotationX", dx * this.mouseRotationFactor);
          this.dmp.action("rotationY", dy * this.mouseRotationFactor);
        }else if(btn === this.translationMouseButton){
          // 右の場合
          this.dmp.action("translationX", dx * this.mouseTranslationFactor);
          this.dmp.action("translationY", dy * this.mouseTranslationFactor);
        }
      }
      wheelAction(e){
        // 画面が一緒に動くのを防ぐ
        e.preventDefault();
        // 拡大縮小
        this.dmp.action("scale", -e.deltaY * this.mouseScaleFactor);
      }
      touchSwipeAction(dx, dy, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // dx,dyが変位。
        // 回転
        this.dmp.action("rotationX", dx * this.touchRotationFactor);
        this.dmp.action("rotationY", dy * this.touchRotationFactor);
      }
      touchPinchInOutAction(diff, ratio, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // diffは距離の変化。正の場合大きくなる。ratioは距離の比。
        // 拡大縮小
        this.dmp.action("scale", diff * this.touchScaleFactor);
      }
      touchMultiSwipeAction(dx, dy, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // dx,dyは重心の変位。
        // 平行移動
        this.dmp.action("translationX", dx * this.touchTranslationFactor);
        this.dmp.action("translationY", dy * this.touchTranslationFactor);
      }
      config(name, params = {}){
        // nameの候補："rotationX", "rotationY", "scale", "translationX", "translationY"
        // たとえばscaleをいじるなら CC.config("scale",{threshold:0.1}); とかする
        this.dmp.config(name, params);
      }
      isActive(){
        return this.dmp.isActive();
      }
    }

    // コンストラクタ
    // 2D限定ですね
    // 3Dでもいいんだろうか？？？3Dでもいいか。
    // なおapplyBoneでベクトルを出しているがシェーダーでやる場合これは内部で計算する
    // のでここではやらないですね
    // setWeightまでですね。attrにぶちこむのは...あとで。
    class WeightedVertice{
      constructor(x, y, z=0){
        this.v = new Vecta(x, y, z);
        this.weight = [1,0,0,0];
        this.joint = [0,0,0,0];
        this.bone = null;
      }
      setBone(b){
        this.bone = b;
      }
      setWeights(){
        // jointとweightを...
        const data = [];
        for(let i=0; i<this.bone.tfs.length; i++){
          // positionは事前に計算しておく
          const p = this.bone.tfs[i].position;
          data.push({index:i, d:Math.hypot(p.x - this.v.x, p.y - this.v.y, p.z - this.v.z)});
        }
        data.sort((d0, d1) => {
          if(d0.d < d1.d) return -1;
          if(d0.d > d1.d) return 1;
          return 0;
        });
        let sum = 0;
        // 申し訳程度のゼロ割対策
        for(let i=0; i<4; i++){
          if(i < data.length){
            sum += 1/(data[i].d+1e-9);
            this.joint[i] = data[i].index;
          }else{
            this.joint[i] = 0;
          }
        }
        for(let i=0; i<4; i++){
          if(i < data.length){
            this.weight[i] = (1/data[i].d+1e-9)/sum;
          }else{
            this.weight[i] = 0;
          }
        }
      }
      getV(){
        return this.v;
      }
      getWeight(){
        return this.weight;
      }
      getJoint(){
        return this.joint;
      }
      applyBone(){
        // this.boneのbone行列を取り出して線形和を取る
        const mats = [];
        for(let i=0; i<4; i++){
          const b = this.bone.mat(this.joint[i], "bone");
          mats.push(b);
        }
        const result = new Vecta(0,0,0);
        for(let i=0; i<4; i++){
          result.addScalar(mats[i].multV(this.v, true), this.weight[i]);
        }
        return result;
      }
    }

    // Transform木
    // jointは構成用のトランスフォームで、ローカルで間をいじることで変形を可能にする
    // さらに木構造なので組み立てができる
    // 最終的にscanningでglobalを計算し描画する
    // mainに登録して描画も実行できる、ただskin-meshの場合は不要か（boneを描画したいなら別だけど）
    // model行列を追加
    class TransformTree extends Tree{
      constructor(){
        super();
        this.joint = new MT4();
        this.local = new MT4();
        this.model = new MT4();
        this.global = new MT4();
        this.position = new Vecta(); // weight計算に使う
        this.inverseBind = new MT4(); // skin-meshで使うbone行列の計算にこれを使う
        this.bone = new MT4(); // 通常のglobalに右からinverseBindを掛けて算出する
        this.main = () => {};
      }
      setMain(func){
        this.main = func;
        return this;
      }
      execute(){
        this.main(this);
        return this;
      }
      static computeInverseBind(nodeTree){
        // localを考慮しないでglobalを計算し、その結果のglobalからpositionを決定し、
        // さらに逆行列でinverseBindを決定する
        const matStuck = [];
        const curMat = new MT4();
        // 初回訪問時にスタックに行列をとっておいて
        // 現在の行列にjointを掛け算
        // jointの累積が個々のbindMatrixになるんで
        // そこからpositionを出すと同時に逆行列を取る感じ
        // 最終訪問時（引き返す時）にスタックから行列を出す
        Tree.scan(nodeTree, {
          firstArrived:(t) => {
            matStuck.push(curMat.copy());
            curMat.multM(t.joint);
            // ここでのcurMatが求めるglobalなので、
            // これを元にpositionとinverseBindを計算する
            curMat.multV(t.position.set(0,0,0));
            t.inverseBind.set(curMat).invert();
          },
          lastArrived:(t) => {
            curMat.set(matStuck.pop());
          }
        });
      }
      static computeGlobal(nodeTree){
        const matStuck = [];
        const curMat = new MT4();
        // 初回訪問時にスタックに行列をとっておいて
        // 現在の行列にjointとlocalを考慮させたうえで
        // modelを加味してglobalにセットする
        // さらにinverseBindも掛け算してskin-meshに使えるようにする
        // 最終訪問時（引き返す時）にスタックから行列を出す
        Tree.scan(nodeTree, {
          firstArrived:(t) => {
            matStuck.push(curMat.copy());
            curMat.multM(t.joint).multM(t.local);
            t.global.set(curMat).multM(t.model);
            t.bone.set(t.global).multM(t.inverseBind);
          },
          lastArrived:(t) => {
            curMat.set(matStuck.pop());
          }
        });
      }
    }

    // TransformTreeArray.
    // nで個数を決める。配列の形で空っぽのTransformTreeを用意したうえで、index指定でjointとlocalを指定する
    // tf木構築に対する答えの一つ。linkでつなげてsetMainで関数渡してexecuteで実行する。
    // 行列周りをmatで取得していじる形に変更、あとfactoryを引数に。
    class TransformTreeArray{
      constructor(n=0, factory = () => new TransformTree()){
        this.factory = factory;
        this.tfs = [];
        for(let i=0; i<n; i++){ this.addTF(); }
      }
      addTF(){
        this.tfs.push(this.factory());
        return this;
      }
      getTF(i){
        return this.tfs[i];
      }
      link(i, j){
        this.tfs[i].addChild(this.tfs[j]);
        return this;
      }
      setMain(i, func){
        this.tfs[i].setMain(func);
        return this;
      }
      setMainAll(func){
        for(const tf of this.tfs){ tf.setMain(func); }
        return this;
      }
      mat(i, type){
        return this.tfs[i][type];
      }
      reset(){
        for(const tf of this.tfs){ tf.reset(); }
        return this;
      }
      execute(i){
        this.tfs[i].execute();
        return this;
      }
      executeAll(){
        for(const tf of this.tfs){ tf.execute(); }
        return this;
      }
    }

    // TRSprototype.
    // いわゆるTransformのTRSモデル。local部分を個別にいじる感じですね。
    class TRSprototype{
      constructor(matrixFactory = () => {}){
        this.base = matrixFactory();
        this.localT = matrixFactory();
        this.localR = matrixFactory();
        this.localS = matrixFactory();
        this.global = matrixFactory();
      }
      setBase(){
        this.base.set(...arguments);
        this.global.set(this.base);
        return this;
      }
      init(){
        this.localT.init();
        this.localR.init();
        this.localS.init();
        this.global.set(this.base);
        return this;
      }
      applyLocal(){
        this.base.multM(this.localT).multM(this.localR).multM(this.localS);
        this.localT.init();
        this.lcoalR.init();
        this.localS.init();
        return this;
      }
      computeGlobal(){
        this.global.set(this.base)
                   .multM(this.localT).multM(this.localR).multM(this.localS);
        return this;
      }
      mat(matName = "base"){
        return this[matName];
      }
    }

    // 2次元Transformクラス
    class TRS3 extends TRSprototype{
      constructor(base = new MT3()){
        super(() => {return new MT3()});
        this.setBase(base)
      }
      convert(){
        return this.global.convert();
      }
      getLocalPosition(x, y){
        // globalを適用した結果(x,y)になる点の位置ベクトルを算出する（z成分は1）
        return this.global.invert(true).multV(new Vecta(x,y,1));
      }
    }

    // 3次元Transformクラス（整備中）。そのうち必要になったらでいいかと。
    class TRS4 extends TRSprototype{
      constructor(base = new MT4()){
        super(() => {return new MT4()});
        this.setBase(base);
      }
    }

    // TRS3のController
    // 具体的な使い方としては画面サイズの大きさのTRSを用意してそれを動かす形
    // Viewer用なので通常のTRS3の操作にはもしかすると向いてないかもしれないですね
    class TRS3Controller extends Interaction{
      constructor(canvas, options = {}, params = {}){
        options.keydown = true;
        options.keyup = true;
        options.dblclick = true;
        super(canvas, options);

        this.TRSset = {};
        this.currentTRS = null;
        this.currentTRSName = ""; // 無いと不便

        this.scaleFlag = false; // スタイラスペンでもスケールをいじれるようにする
        this.translationFlag = false; // spaceキー（
        this.rotationFlag = false; // Rキー

        this.mouseScaleFactor = 0.0001;
        this.mouseRotationFactor = 0.0005;
        this.mouseTranslationFactor = 0.0003;
        this.stylusScaleFactor = 0.0001;
        this.stylusTranslationFactor = 0.0006;
        this.stylusRotationFactor = 0.0007;
        this.touchScaleFactor = 0.00025;
        this.touchTranslationFactor = 0.0015;
        this.touchRotationFactor = 0.1;

        this.multiTouchStump = 0;
        this.multiTouchThreshold = 30; // ms

        this.setParam(params);

        this.dmp = new Damper("translationX", "translationY", "rotation", "scale");
        this.dmp.setMain((d) => {
          // dがactiveでないなら処理する必要は無い。
          if(!d.isActive()) return;
          // activeのときだけ行列の更新を実行する
          this.currentTRS.mat("localS").localScale(Math.pow(10, d.getValue("scale")));
          this.currentTRS.mat("localR").localRotation(d.getValue("rotation"));
          this.currentTRS.mat("localT").localTranslation(
            d.getValue("translationX"), d.getValue("translationY")
          );
          this.currentTRS.computeGlobal();
        });
      }
      setParam(params = {}){
        // おかしなものをいじられないようにする. dmpとかいじられるとまずいので。
        const paramList = [
          "mouseScaleFactor", "mouseRotationFactor", "mouseTranslationFactor",
          "stylusScaleFactor", "stylusRotationFactor", "stylusTranslationFactor",
          "touchScaleFactor", "touchRotationFactor", "touchTranslationFactor",
          "multiTouchThreshold"
        ];
        for(const param of Object.keys(params)){
          if (paramList.indexOf(param) < 0) continue;
          this[param] = params[param];
        }
      }
      setFlag(type, flag = true){
        //
        this[`${type}Flag`] = flag;
        return this;
      }
      registTRS(name, trs){
        this.TRSset[name] = trs;
        this.currentTRS = trs;
        this.currentTRSName = name;
        return this;
      }
      setTRS(name){
        this.currentTRS = this.TRSset[name];
        this.currentTRSName = name;
        this.dmp.applyAll("reset");
        return this;
      }
      getTRS(name){
        return this.TRSset[name];
      }
      getCurrentTRSName(){
        return this.currentTRSName;
      }
      convert(){
        // あったら便利かもしれない。
        return this.currentTRS.convert();
      }
      mouseMoveDefaultAction(dx,dy,x,y){
        // 平行移動と回転
        if(this.pointers.length === 0) return;
        const btn = this.pointers[0].button;
        if(btn === 0){
          // 左で両方やる
          if(this.translationFlag){
            this.dmp.action("translationX", dx * this.mouseTranslationFactor);
            this.dmp.action("translationY", dy * this.mouseTranslationFactor);
          }
          if(this.rotationFlag){
            this.dmp.action("rotation", dx * this.mouseRotationFactor);
          }
        }
      }
      touchSwipeAction(dx, dy, x, y, px, py){
        // Interactionサイドの実行内容を書く。
        // dx,dyが変位。
        if(this.translationFlag){
          this.dmp.action("translationX", dx * this.stylusTranslationFactor);
          this.dmp.action("translationY", dy * this.stylusTranslationFactor);
        }
        if(this.rotationFlag){
          this.dmp.action("rotation", dx * this.stylusRotationFactor);
        }
        if(this.scaleFlag){
          this.dmp.action("scale", dx * this.stylusScaleFactor);
        }
      }
      touchStartDefaultAction(){
        // マルチタッチ時に色々設定する
        if(this.pointers.length === 1){
          this.multiTouchStump = window.performance.now();
        }
        if(this.pointers.length === 2){
          this.setFlag("translation", true);
          const elapsedTime = window.performance.now() - this.multiTouchStump;
          // 同時タッチで回転、ディレイタッチで拡縮
          if(elapsedTime < this.multiTouchThreshold){
            this.setFlag("rotation", true);
          }else{
            this.setFlag("scale", true);
          }
        }
      }
      touchEndDefaultAction(){
        if(this.pointers.length === 0){
          this.multiTouchStump = 0;
          this.setFlag("translation", false);
          this.setFlag("rotation", false);
          this.setFlag("scale", false);
        }
      }
      touchPinchInOutAction(diff, ratio, x, y, px, py){
        // diffは距離の変化。正の場合大きくなる。ratioは距離の比。
        // タッチで拡縮やるならこれを使いましょう
        if(this.scaleFlag){
          this.dmp.action("scale", diff * this.touchScaleFactor);
        }
      }
      touchMultiSwipeAction(dx, dy, x, y, px, py){
        // dx,dyは重心の変位。
        // タッチで平行移動やるならこれを使いましょう
        if(this.translationFlag){
          this.dmp.action("translationX", dx * this.touchTranslationFactor);
          this.dmp.action("translationY", dy * this.touchTranslationFactor);
        }
      }
      touchRotateAction(angle){
        // 回転
        if(this.rotationFlag){
          this.dmp.action("rotation", angle * this.touchRotationFactor);
        }
      }
      wheelAction(e){
        // 画面が一緒に動くのを防ぐ
        e.preventDefault();
        this.dmp.action("scale", -e.deltaY * this.mouseScaleFactor);
      }
      update(){
        this.dmp.execute();
        this.dmp.applyAll("update");
      }
      keyDownAction(e){
        // キーが押されたとき
        switch(e.code){
          case "Space": this.setFlag("translation", true); break;
          case "KeyR": this.setFlag("rotation", true); break;
          case "KeyS": this.setFlag("scale", true); break;
        }
        this.setFlag(e.code, true);
      }
      keyUpAction(e){
        // キーが離れた時
        switch(e.code){
          case "Space": this.setFlag("translation", false); break;
          case "KeyR": this.setFlag("rotation", false); break;
          case "KeyS": this.setFlag("scale", false); break;
        }
      }
      doubleClickAction(){
        // ダブルクリック時。
        this.currentTRS.init();
      }
      doubleTapAction(){
        // ダブルタップ時。
        this.currentTRS.init();
      }
      config(name, params = {}){
        // nameの候補："rotation", "scale", "translationX", "translationY"
        // たとえばscaleをいじるなら CC.config("scale",{threshold:0.1}); とかする
        this.dmp.config(name, params);
      }
      isActive(){
        return this.dmp.isActive();
      }
    }

    // evenlySpacing. 均等割り。
    // pointsを改変する形であり、返すわけではない。
    // partitionが指定されている場合、minLengthが指定されていても無視して、その個数になるように塩梅する。
    // partitionが未定義の場合はfisceToyBoxと一緒でminLengthに従う。
    // つまり両方未定義の場合はminLength=1で今まで通り。
    // 逆に両方定義済みならpartitionが優先される。partitionは1以上になるように修正される場合がある。
    // showDetail:trueの場合、戻り値は{minL,maxL}が計算された値で返る。
    // falseの場合はどっちもlが返る。要するに雑ということ。
    function evenlySpacing(points, options = {}){
      const {partitionType = "custom", partition, minLength = 1, closed = false, showDetail = false} = options;

      // closedの場合はおしりに頭を付ける
      // そして最後におしりを外す
      const q = points.slice();
      if(closed){ q.push(q[0].copy()); }

      // まず全長を計算する
      let totalLength = 0;
      let N = 0;
      let l = 0;
      for(let i=0; i<q.length-1; i++){ totalLength += q[i].dist(q[i+1]); }

      if(partitionType !== 'custom'){
        // partitionTypeにcustom以外の値が指定されている場合、auto,even,oddに応じてNとlを決める。
        const pointCount = points.length;
        N = (closed ? pointCount : pointCount-1);
        switch(partitionType){
          case "auto": break;
          case "even":
            if(N % 2 === 1){ N++; } break;
          case "odd":
            if(N % 2 === 0){ N++; } break;
          default:
            console.error("use auto/even/odd/custom type.");
            return null;
        }
        l = totalLength/N;
      }else if(partition !== undefined){
        // 'custom'で、かつpartitionが定義されている場合は、それでNを決めてlはそれとtotalLengthで決める
        N = Math.max(1, Math.floor(partition));
        l = totalLength/N;
      }else{
        // partitionも未定義の場合、minLengthを使う。デフォルトは1. これでNを決めてそこからlを決める。
        N = Math.floor(totalLength/minLength) + 1;
        l = totalLength/N;
      }

      // lを基準の長さとして分けていく。まず頭を採用する。次の点と差を取る。これの累積を
      // 取っていってlを超えるようならそこで比率を計算しlerpして加えて差分を新しい
      // elapsedとする。
      let elapsed = 0;
      const prev = q[0].copy();
      const next = new Vecta();
      const result = [q[0]];
      for(let i=1; i<q.length; i++){
        next.set(q[i]);
        const d = prev.dist(next);
        if(elapsed + d < l){
          elapsed += d;
          prev.set(next);
          continue;
        }
        // prevとnextをratio:(l-elapsed)/dで分割。

        // この時点でelapsedはlより小さいことが想定されている。が...
        // 厳密にやるならelapsed+d>=lであるからして
        // (l*m-elapsed)/dによるlerpをelapsed+d>=m*lであるすべてのmに対して実行し
        // elapsedにd-m*lを足して終わりにする. m*l <= elapsed+d < (m+1)*lなので
        // 0<=elapsed+d-m*l<lである。
        // 数学のお時間です。
        // mの想定される上限値というのはおおよそ(elapsed+d)/lですが、
        // elapsedはl以下が想定されているし、dはtotalLength以下。
        // そしてd/lというのはtotalLength/lで抑えられる。これは何か。Nである。つまり？
        // mがN+1より大きくなることは「ありえない」。安全のためN+2をとっても、
        // せいぜいそのくらい。だからm>N+2になったらbreakしていい。
        // 無限ループにはならない。その場合はもうelapsedを0にしよう。
        let m=1;
        while(elapsed + d >= m*l){
          const newPoint = prev.lerp(next, (m*l - elapsed)/d, true);
          result.push(newPoint);
          m++;
          if(m > N+2) break;
        }
        elapsed += d-(m-1)*l;
        if(m > N+2) elapsed = 0;
        prev.set(next);
      }
      // 最後の点が入ったり入んなかったりするのがめんどくさい。
      // そこで
      // 最後の点についてはもう入れてしまって
      // 末尾とその一つ前がl/2より小さいときにカットする。
      result.push(q[q.length-1].copy());
      if(result[result.length-1].dist(result[result.length-2]) < l/2){
        result.pop();
      }
      // closedの場合は末尾をカットする
      if(closed){ result.pop(); }

      points.length = 0;
      points.push(...result);

      if(showDetail){
        let minL = Infinity;
        let maxL = -Infinity;
        for(let i=0; i<points.length; i++){
          if(!closed && i===points.length-1) break;
          const d = points[i].dist(points[(i+1)%points.length]);
          minL = Math.min(d, minL);
          maxL = Math.max(d, maxL);
        }
        console.log(`minL:${minL}, maxL:${maxL}`);
        // showDetailの場合はきちんと計算して返す
        return {minL, maxL};
      }
      // そうでない場合は単純にlを返す。まあそこまで外れてはいない。
      return {minL:l, maxL:l};
    }
    // これで決定版でいいと思います。

    function evenlySpacingAll(contours, options = {}){
      for(const contour of contours){
        evenlySpacing(contour, options);
      }
    }

    // クワドベジエライズ
    // 中点を取り、もともとの点を制御点とする
    // openの場合は0のみ残し、0-1点と直線でつなぐ
    // そしてL'-LとLを直線でつなぐ
    // closedの場合は0-1からスタートし、最後に0=Lを制御点とし、L'-Lと0-1をベジエでつなぐ
    // 感じですね。
    // これも改変なので、返す形ではない。
    function quadBezierize(points, options = {}){
      const {detail = 4, closed = false} = options;
      const subPoints = [];
      for(let i=0; i<points.length-1; i++){
        subPoints.push(points[i].lerp(points[i+1], 0.5, true));
      }
      if (closed) {
        subPoints.push(points[points.length-1].lerp(points[0], 0.5, true));
      }
      const result = [];
      if (!closed) {
        result.push(points[0]);
        result.push(subPoints[0]);
        for(let k=1; k<subPoints.length; k++){
          const p = subPoints[k-1];
          const q = points[k];
          const r = subPoints[k];
          for(let m=1; m<=detail; m++){
            const t = m/detail;
            result.push(new Vecta(
              (1-t)*(1-t)*p.x + 2*t*(1-t)*q.x + t*t*r.x,
              (1-t)*(1-t)*p.y + 2*t*(1-t)*q.y + t*t*r.y,
              (1-t)*(1-t)*p.z + 2*t*(1-t)*q.z + t*t*r.z
            ));
          }
        }
        result.push(points[points.length-1]);
      } else {
        result.push(subPoints[0]);
        for(let k=1; k<=subPoints.length; k++){
          const p = subPoints[k-1];
          const q = points[k%subPoints.length];
          const r = subPoints[k%subPoints.length];
          for(let m=1; m<=detail; m++){
            const t = m/detail;
            if(m===detail&&k===subPoints.length)continue;
            result.push(new Vecta(
              (1-t)*(1-t)*p.x + 2*t*(1-t)*q.x + t*t*r.x,
              (1-t)*(1-t)*p.y + 2*t*(1-t)*q.y + t*t*r.y,
              (1-t)*(1-t)*p.z + 2*t*(1-t)*q.z + t*t*r.z
            ));
          }
        }
      }
      points.length = 0;
      points.push(...result);
    }

    function quadBezierizeAll(contours, options = {}){
      for(const contour of contours){
        quadBezierize(contour, options);
      }
    }

    // smoothing.
    // customの場合はminLengthを使う。それ以外の場合は点の個数を使う。
    // auto,even,oddの場合は、間隔の個数が偶数や奇数になるように点の数に基づいて指定する。
    // factorはcustomの場合はminLengthをそれで割る。autoなどの場合は掛ける。closedは共通。以上。
    function smoothing(points, options = {}){
      const {partitionType = 'custom', minLength = 1, closed = false, detail = 4, factor = 0.5, showDetail = false} = options;

      if(partitionType !== 'custom'){
        const pointCount = points.length;
        let properPartition = (closed ? pointCount : pointCount-1);
        switch(partitionType){
          case 'auto': break;
          case 'even': if(properPartition % 2 === 1){ properPartition++; } break;
          case 'odd': if(properPartition % 2 === 0){ properPartition++; } break;
          default:
            console.error("use auto/even/odd/custom type.");
            return false;
        }
        evenlySpacing(points, {partition:properPartition*factor, closed, showDetail});
        quadBezierize(points, {detail, closed});
        evenlySpacing(points, {partition:properPartition, closed, showDetail});
      }else{
        evenlySpacing(points, {minLength:minLength/factor, closed, showDetail});
        quadBezierize(points, {detail, closed});
        evenlySpacing(points, {minLength:minLength, closed, showDetail});
      }
      return true;
    }

    // smoothingAll.
    function smoothingAll(contours, options = {}){
      for(const contour of contours){
        smoothing(contour, options);
      }
    }

    // 連続する点しか見ない簡易版です
    function mergePoints(points, options = {}){
      const {threshold = 0.000001, closed = false, showDetail = false} = options;

      let middlePointCount = 0;
      let tailPointCount = 0;

      for(let i = points.length-1; i >= 1; i--){
        const p = points[i];
        const q = points[i-1];
        const d = p.dist(q);
        if (d < threshold){
          middlePointCount++;
          if(showDetail){ console.log(`middle merged: ${d}`); }
          points.splice(i,1);
        }
      }
      if (closed) {
        // 頭に戻る場合はそれも排除する
        const d = points[0].dist(points[points.length-1]);
        if (d < threshold) {
          tailPointCount++;
          if(showDetail){ console.log(`tail merged: ${d}`); }
          points.pop();
        }
      }
      if(showDetail){
        console.log(`middle: ${middlePointCount} merged | tail: ${tailPointCount} merged`);
      }
    }

    // こっちも。なお、頂点のマージはこれとは別に用意したいところですね。mergeVertices？
    function mergePointsAll(contours, options = {}){
      for(let contour of contours) {
        mergePoints(contour, options);
      }
    }

    // SVG翻訳機構作っておくか
    function parseData(options = {}){
      const {data="M 0 0", bezierDetail2 = 8, bezierDetail3 = 5, parseScale = 1, lineSegmentLength = 1} = options;
      const cmdData = data.split(" ");
      const result = [];
      let subData = [];
      for(let i=0; i<cmdData.length; i++){
        switch(cmdData[i]){
          case "M":
            if (subData.length>0) result.push(subData.slice());
            subData.length = 0;
            subData.push(new Vecta(
              Number(cmdData[i+1]), Number(cmdData[i+2])
            ).mult(parseScale));
            i+=2; break;
          case "L":
            const p = subData[subData.length-1];
            const q = new Vecta(
              Number(cmdData[i+1]), Number(cmdData[i+2])
            ).mult(parseScale);
            const lineLength = q.dist(p);
            for(let lengthSum=0; lengthSum<lineLength; lengthSum += lineSegmentLength){
              subData.push(p.lerp(q, lengthSum/lineLength, true));
            }
            subData.push(q);
            i+=2; break;
          case "Q":
            const p0 = subData[subData.length-1];
            const a0 = Number(cmdData[i+1])*parseScale;
            const b0 = Number(cmdData[i+2])*parseScale;
            const c0 = Number(cmdData[i+3])*parseScale;
            const d0 = Number(cmdData[i+4])*parseScale;
            for(let k=1; k<=bezierDetail2; k++){
              const t = k/bezierDetail2;
              subData.push(new Vecta(
                (1-t)*(1-t)*p0.x + 2*t*(1-t)*a0 + t*t*c0,
                (1-t)*(1-t)*p0.y + 2*t*(1-t)*b0 + t*t*d0
              ));
            }
            i+=4; break;
          case "C":
            const p1 = subData[subData.length-1];
            const a1 = Number(cmdData[i+1])*parseScale;
            const b1 = Number(cmdData[i+2])*parseScale;
            const c1 = Number(cmdData[i+3])*parseScale;
            const d1 = Number(cmdData[i+4])*parseScale;
            const e1 = Number(cmdData[i+5])*parseScale;
            const f1 = Number(cmdData[i+6])*parseScale;
            for(let k=1; k<=bezierDetail3; k++){
              const t = k/bezierDetail3;
              subData.push(new Vecta(
                (1-t)*(1-t)*(1-t)*p1.x + 3*t*(1-t)*(1-t)*a1 + 3*t*t*(1-t)*c1 + t*t*t*e1,
                (1-t)*(1-t)*(1-t)*p1.y + 3*t*(1-t)*(1-t)*b1 + 3*t*t*(1-t)*d1 + t*t*t*f1
              ));
            }
            i+=6; break;
          case "Z":
            // 最初の点を追加するんだけど、subData[0]を直接ぶち込むと
            // 頭とおしりが同じベクトルになってしまうので、
            // copy()を取らないといけないんですね
            // Lでつなぎます。
            const p2 = subData[subData.length-1];
            const q2 = subData[0].copy();
            const lineLength2 = q2.dist(p2);
            for(let lengthSum=0; lengthSum<lineLength2; lengthSum += lineSegmentLength){
              subData.push(p2.lerp(q2, lengthSum/lineLength2, true));
            }
            subData.push(q2);
            //result.push(subData.slice());
            break;
        }
      }
      // Mが出てこない場合はパス終了
      result.push(subData.slice());
      return result;
    }

    // 閉曲線(closed)前提
    // 色々考えた結果evenlyは2回やるのがいいということになった。
    // 返すのはVectaの閉路の配列の配列
    function getSVGContours(params = {}){
      const {
        svgData = "M 0 0 L 1 0 L 1 1 L 0 1 Z", scaleFactor = 200,
        bezierDetail2 = 8, bezierDetail3 = 5, lineSegmentLengthRatio = 1/64,
        minLengthRatio = 1/50, mergeThresholdRatio = 1e-9, showDetail = false
      } = params;
      const svgContours = parseData({
        data:svgData, parseScale:scaleFactor,
        bezierDetail2:bezierDetail2, bezierDetail3:bezierDetail3,
        lineSegmentLength:scaleFactor*lineSegmentLengthRatio
      });

      mergePointsAll(svgContours, {threshold:scaleFactor*mergeThresholdRatio, closed:true, showDetail});
      evenlySpacingAll(svgContours, {minLength:scaleFactor*minLengthRatio, closed:true, showDetail});
      mergePointsAll(svgContours, {threshold:scaleFactor*mergeThresholdRatio, closed:true, showDetail});
      evenlySpacingAll(svgContours, {minLength:scaleFactor*minLengthRatio, closed:true, showDetail});

      return svgContours;
    }

    // font.getPath()で得られるパスデータのcommandプロパティをテキストに
    // 翻訳する。本来は不要かもしれないがこれによりこれとは別の汎用関数が
    // 利用可能になるのでこういった手順を踏んでいる。最初にやったのはsayoさん
    // です。もっというとp5もこれ確かやってるはず
    function parseCmdToText(cmd){
      let result = "";
      for(let i=0; i<cmd.length-1; i++){
        const command = cmd[i];
        const {x, y, x1, y1, x2, y2} = command;
        switch(command.type){
          case "M":
            result += "M " + x.toFixed(3) + " " + y.toFixed(3) + " ";
            break;
          case "Q":
            result += "Q " + x1.toFixed(3) + " " + y1.toFixed(3) + " " + x.toFixed(3) + " " + y.toFixed(3) + " ";
            break;
          case "L":
            result += "L " + x.toFixed(3) + " " + y.toFixed(3) + " ";
            break;
          case "C":
            result += "C " + x1.toFixed(3) + " " + y1.toFixed(3) + " " + x2.toFixed(3) + " " + y2.toFixed(3) + " " + x.toFixed(3) + " " + y.toFixed(3) + " ";
            break;
          case "Z":
            result += "Z ";
            break;
        }
      }
      result += "Z";
      return result;
    }

    // これVectaの配列であるcontourの配列であるcontoursが対象
    // 何が言いたいかというと2次元想定なのです
    // 汎用性を考えると厳しいがtextContoursならこれで充分
    function getBoundingBoxOfContours(contours){

      let _minX = Infinity;
      let _minY = Infinity;
      let _maxX = -Infinity;
      let _maxY = -Infinity;

      for(let contour of contours){
        for(let p of contour){
          _minX = Math.min(p.x, _minX);
          _minY = Math.min(p.y, _minY);
          _maxX = Math.max(p.x, _maxX);
          _maxY = Math.max(p.y, _maxY);
        }
      }
      return {x:_minX, y:_minY, w:_maxX-_minX, h:_maxY-_minY};
    }

    // こっちも2次元想定の内容ですね
    // 要はzがすべて0なら汎用性はあるということ
    function alignmentContours(contours, options = {}){
      const {
        position = {x:0,y:0}, alignV = "center", alignH = "center"
      } = options;

      const tb = getBoundingBoxOfContours(contours);

      const factorW = (alignV === "left" ? 0 : (alignV === "right" ? 1 : 0.5));
      const factorH = (alignH === "top" ? 0 : (alignH === "bottom" ? 1 : 0.5));
      const deltaX = tb.x+ tb.w*factorW - position.x;
      const deltaY = tb.y + tb.h*factorH - position.y;

      for(const contour of contours){
        for(const p of contour){
          p.x -= deltaX;
          p.y -= deltaY;
        }
      }
    }

    // fontはopentypeのparseでarrayBufferをparseした結果としてのfont objectであります。
    // なおp5の場合はfontにfont.fontを入れればOKでやんす。
    // ちなみにITALICとかはfont-familyの話です。こっちは関係ない！
    function getTextContours(params = {}){
      const {
        font, targetText = "A", textScale = 320, position = {x:0,y:0},
        alignV = "center", alignH = "center",
        bezierDetail2 = 8, bezierDetail3 = 5, lineSegmentLengthRatio = 1/64,
        minLengthRatio = 1/50, mergeThresholdRatio = 1e-9, showDetail = false,
        separateLetter = false, separateLine = false, textLeadingRatio = 1.25
      } = params;

      // ここをgetPathにするかgetPathsにするかという話。
      // さらに行ごとに場合も考える必要がある。
      // アイデアとしてはalignmentContoursは最初"left","top"で実行し
      // textLeadingに従って左上詰めで用意したうえで全体のcontoursまでもっていき
      // 以降は指定されたalignV,alignHでいじればいいんじゃないかと思う。

      const texts = targetText.split("\n");
      // 一応、中身がない場合。
      if(texts.length === 0){ return [[]]; }
      const indents = new Array(texts.length);
      indents.fill(0);
      for(let i=0; i<texts.length; i++){
        const eachText = texts[i];
        for(let k=0; k<eachText.length; k++){
          if(eachText[k] === ' '){ indents[i] += textScale*0.5; }
          else if(eachText[k] === '　'){ indents[i] += textScale; }
          else{ break; }
        }
      }

      // 全部Pathsでやればすべてに対応できる。それでいいだろ。
      const textContoursLines = [];
      for(let i=0; i<texts.length; i++){
        const paths = font.getPaths(texts[i], 0, 0, textScale);
        const textContoursLetters = [];
        for(let k=0; k<paths.length; k++){
          const cmd = paths[k].commands;
          const cmdText = parseCmdToText(cmd);
          // スペースの場合...parseDataをいじってもいいだろうが、
          // 多分無視するのが一番いい
          // getPathsはスペースも含めて位置を調整してくれるのでそこは問題ない
          if(cmdText==="Z") continue;
          const letterContours = parseData({
            data:cmdText,
            bezierDetail2:bezierDetail2, bezierDetail3:bezierDetail3,
            lineSegmentLength:lineSegmentLengthRatio*textScale
          });
          textContoursLetters.push(letterContours);
        }
        textContoursLines.push(textContoursLetters);
      }
      // lineごとにcontourの集合にまとめる
      const contoursLines = new Array(texts.length);
      for(let i=0; i<texts.length; i++){
        contoursLines[i] = textContoursLines[i].flat();
        alignmentContours(contoursLines[i], {position:{x:0,y:0}, alignV:"left", alignH:"top"});
      }
      // textReadingRatioを計算してアラインメントする
      let currentYOffset = 0;
      for(let i=0; i<texts.length; i++){
        const ctrs = contoursLines[i];
        // からっぽのときは...
        if(ctrs.length === 0){
          // textScaleを暫定的なbd.hとみなし、それを使うことにする。
          currentYOffset += textScale * textLeadingRatio;
          continue;
        }
        // indentを反映させる
        alignmentContours(ctrs, {position:{x:indents[i], y:currentYOffset}, alignV:"left", alignH:"top"});
        const bd = getBoundingBoxOfContours(ctrs);

        currentYOffset += bd.h * textLeadingRatio;
      }
      // 全体のflatをする。以降は従来の処理。
      const allContours = contoursLines.flat();

      alignmentContours(allContours, {position, alignV, alignH});

      mergePointsAll(allContours, {
        threshold:mergeThresholdRatio*textScale, closed:true, showDetail
      });
      evenlySpacingAll(allContours, {
        minLength:minLengthRatio*textScale, closed:true, showDetail
      });

      if(separateLetter && separateLine){
        // 行ごとに、文字ごとに分かれたcontoursが入っている。一番ネストが深い。
        return textContoursLines;
      }
      if(separateLetter && !separateLine){
        // 文字ごとバラバラで返る。行については分かれてない。
        return textContoursLines.flat();
      }
      if(!separateLetter && separateLine){
        // 行ごとに分かれているが行ごとにcontour配列になっており文字ごとにはなってない
        return contoursLines;
      }

      // で、両方falseのケース
      return allContours;
    }

    // saveめんどくさい。fireを用意しよう。lilの時に役に立つ。fireとexecuteで完結する。フラグ要らない。
    // さらに保存の際の名前をconfigなどから決められる。もちろん不要ならexecuteで決める形。柔軟性が大事。
    // easySave:trueがデフォルトでdblclickでsaveできるがそうでない場合も必要だろうと思うので無しにできるようにする。
    // これfalseにしちゃったらEasyの意味が無いので。そもそもサムネ生成のための簡易機能だしな。
    class EasyCanvasSaver{
      constructor(cvs, options = {}){
        const {easySave = true} = options;
        this.target = cvs;
        this.active = false;
        this.interaction = new Inspector(cvs, {dblclick:true});
        if(easySave){
          this.interaction.add("dblclick", (function(){ this.fire(); }).bind(this));
          this.interaction.add("dbltap", (function(){ this.fire(); }).bind(this));
        }
        this.saveName = "sketch";
      }
      fire(){
        this.active = true;
      }
      setName(name){
        // 保存の際の名前を手動で決めることができる。利用の際はexecuteの引数を空にする。
        this.saveName = name;
      }
      execute(name = ""){
        // 保存の際の名前はここで決めたnameが優先される。
        // 引数が""の場合は、this.saveNameが使用される（引数が空の場合含む）
        if(!this.active){ return; }
        if(name === ""){
          saveCanvas(this.target, this.saveName);
        }else{
          saveCanvas(this.target, name);
        }
        this.active = false;
      }
    }

    // SkinMesh解釈のための簡易版
    class BoneTree extends Tree{
      constructor(ibm = new MT4()){
        super();
        this.ibm = ibm;
        this.local = new MT4();
        this.global = new MT4();
      }
      static computeGlobal(nodeTree){
        const matStuck = [];
        const curMat = new MT4();
        // シンプルにnodeTreeから始まって次々とlocalを掛けていく形
        // 自分のlocalまで掛けて最後にibmを掛けるとglobalが完成する
        Tree.scan(nodeTree, {
          firstArrived:(t) => {
            matStuck.push(curMat.copy());
            curMat.multM(t.local);
            t.global.set(curMat).multM(t.ibm);
          },
          lastArrived:(t) => {
            curMat.set(matStuck.pop());
          }
        });
      }
    }

    // createGltf.
    // gl, url, optionsから作る。
    async function createGltf(url, options = {}){
      const gltfjson = await ResourceLoader.getJSON(url);
      return new Gltf(gltfjson, options);
    }

    // createGlb.
    // glbから作る。
    // 「BIN 」のあとが単独のバイナリデータになっているのでそれを取得し、
    // 前半のJSONパートと合わせて解釈する
    async function createGlb(url, options = {}){
      const bin = await ResourceLoader.getArrayBuffer(url);
      const ua = new Uint8Array(bin);
      // バイナリ文字列に変換する
      const hexString = ua.toHex();
      // BINの開始位置を取得する
      //const jsonStartIndex = hexString.indexOf("4a534f4e")/2+4; // 「JSON」
      const binaryStartIndex = hexString.indexOf("42494e00")/2+4; // 「BIN 」

      // バイトデータを取得する
      const BYTE_LENGTH = ua.length-binaryStartIndex;
      // これが出力先
      const ab = new ArrayBuffer(BYTE_LENGTH);
      // Uint8Arrayを使ってデータを入力する
      const inputter = new Uint8Array(ab);
      for(let k=0; k<BYTE_LENGTH; k++){ inputter[k] = ua[k+binaryStartIndex]; }

      const jsonPart = hexString.split("42494e00")[0]; // BINの前まで
      const jsonStart = jsonPart.indexOf('7b')/2; // 「{」
      const jsonEnd = jsonPart.lastIndexOf('7d')/2+1; // 「}」

      // jsonのデータを取得する
      let jsonString = "";
      for(let i=jsonStart; i<jsonEnd; i++){ jsonString += String.fromCharCode(ua[i]); }
      // jsonに変換
      const jsonData = JSON.parse(jsonString);

      //console.log(`jsonStartIndex:${jsonStartIndex}, binaryStartIndex:${binaryStartIndex}`);
      const {fps} = options;
      return new Gltf(jsonData, {fps:fps, arrayBuffer:ab});
    }

    // class Gltf.
    // optionsは今のところ、fpsだけ。24とか60とか。
    // 非同期のloadTexturesでimagesがあればtexturesに色々入ってgetTextureで取得
    // createVAOはoptionsを持ちここでidやlocationを指定。
    // arrayBufferオプションがnullでない場合（glbから作る場合）は、それを採用する。そうでなければgltfから。
    class Gltf{
      constructor(gltfjson, options = {}){
        // fpsは事前に設定する
        const {fps = 24, arrayBuffer = null} = options;
        this.fps = fps;
        this.gltf = gltfjson;
        this.buffers = [];
        if(arrayBuffer === null){
          this.encodeBuffers();
        }else{
          this.buffers.push(arrayBuffer);
        }
        this.bufferViews = [];
        this.encodeBufferViews();
        this.nodes = [];
        this.encodeNodes();
        this.materials = [];
        this.encodeMaterials();
        this.meshes = [];
        this.rootTrees = []; // rootMeshのtree集合
        this.encodeMeshes();
        this.skins = [];
        this.encodeSkins();
        this.animations = {
          weight:[], transform:[], skinMesh:[]
        };
        this.encodeAnimations();
        // textureは外的にloadTexturesを呼び出して設定する
        this.textures = [];
        // 例：const gltf = new Gltf(...); await gltf.loadTextures();
      }
      encodeBuffers(){
        // ここは何をしているかというと、結局ArrayBuffer自体に読み書き機能が無いので、
        // ArrayBufferに読み書きするためのインタフェースとしてUint8Arrayを用意し、
        // そっちにbase64をバイナリ文字列に変換したものを1バイトずつ入れることで
        // 結果的にArrayBufferにデータが格納されるというわけである、ということみたいです。
        const {buffers} = this.gltf;
        for(let i=0; i<buffers.length; i++){
          const buffer = buffers[i];
          const {byteLength, uri} = buffer;
          const ab = new ArrayBuffer(byteLength);
          const ua = new Uint8Array(ab);
          const bin = uri.split(',')[1];
          const byteString = atob(bin);
          for (let i = 0; i < byteString.length; i++) {
            ua[i] = byteString.charCodeAt(i);
          }
          this.buffers.push(ab);
        }
      }
      encodeBufferViews(){
        // bufferViewsとaccessorsは1:1ではないが...そうね
        // 対応していないものについてはUint8Arrayになるようにしましょうかね
        const {bufferViews, accessors} = this.gltf;
        const types = new Array(bufferViews.length);
        types.fill(5121);

        // accessorにある場合はその型で作る。
        for(const accessor of accessors){
          types[accessor.bufferView] = accessor.componentType;
        }
        // typeに基づいて型付配列に落とす
        for(let i=0; i<bufferViews.length; i++){
          const bufferView = bufferViews[i];
          const {buffer, byteOffset, byteLength} = bufferView;
          // 型付配列の場合、長さは配列としての長さのため、4や2で割る必要がある。
          switch (types[i]){
            case 5126: // FLOAT (4byte)
              this.bufferViews.push(new Float32Array(this.buffers[buffer], byteOffset, byteLength/4));
              break;
            case 5125: // UNSIGNED_INT (4byte)
              this.bufferViews.push(new Uint32Array(this.buffers[buffer], byteOffset, byteLength/4));
              break;
            case 5123: // UNSIGNED_SHORT (2byte)
              this.bufferViews.push(new Uint16Array(this.buffers[buffer], byteOffset, byteLength/2));
              break;
            case 5121: // UNSIGNED_BYTE (1byte)
              this.bufferViews.push(new Uint8Array(this.buffers[buffer], byteOffset, byteLength));
              break;
            default: // UNSIGNED_BYTE (1byte, default)
              console.log(`${types[i]}には対応していません。暫定的にUint8Arrayで作成します。`);
              this.bufferViews.push(new Uint8Array(this.buffers[buffer], byteOffset, byteLength));
              break;
          }
        }
      }
      encodeNodes(){
        // nodeの翻訳。nodeにはmesh,bone,armature, それ以外だとlightなども場合によっては含まれるらしいがとりあえずどうでもいい
        // index, name, children, parent, mesh(if exist), skin(if exist), tf(t, r, s)
        const nodes = this.gltf.nodes;
        for(let i=0, len=nodes.length; i<len; i++){
          const node = nodes[i];
          const nodeObject = {
            index:i, name:node.name, parent:-1
          }
          nodeObject.children = (node.children !== undefined ? node.children : []);
          nodeObject.mesh = (node.mesh !== undefined ? node.mesh : -1);
          nodeObject.skin = (node.skin !== undefined ? node.skin : -1);
          const tf = {t:[], r:[], s:[]};
          // meshのアニメーションでもskinのアニメーションでも使う。length===0でundefinedのフラグとする。
          if(node.translation !== undefined){ tf.t.push(...node.translation); }
          if(node.rotation !== undefined){ tf.r.push(...node.rotation); }
          if(node.scale !== undefined){ tf.s.push(...node.scale); }
          nodeObject.tf = tf;
          this.nodes.push(nodeObject);
        }
        // parent登録
        for(let i=0,len=this.nodes.length; i<len; i++){
          const children = this.nodes[i].children;
          for(let k=0; k<children.length; k++){
            const child = this.nodes[children[k]];
            child.parent = i;
          }
        }
        // 確認用
        //console.log(this.nodes);
      }
      encodeMaterials(){
        // materialの翻訳
        const materials = this.gltf.materials;
        if(materials === undefined) return;
        for(let i=0; i<materials.length; i++){
          const material = materials[i];
          const {normalTexture = {}, pbrMetallicRoughness = {}, emissiveFactor = [0,0,0], emissiveTexture = {}} = material;
          const {
            baseColorFactor = [1,1,1], baseColorTexture = {},
            metallicFactor = 0, roughnessFactor = 0, metallicRoughnessTexture = {}
          } = pbrMetallicRoughness;
          const {index:nIndex = -1, texCoord:nTexCoord = 0} = normalTexture;
          const {index:eIndex = -1, texCoord:eTexCoord = 0} = emissiveTexture;
          const {index:cIndex = -1, texCoord:cTexCoord = 0} = baseColorTexture;
          const {index:mrIndex = -1, texCoord:mrTexCoord = 0} = metallicRoughnessTexture;
          this.materials.push({
            normalTexture:{index:nIndex, texCoord:nTexCoord},
            emissiveFactor, emissiveTexture:{index:eIndex, texCoord:eTexCoord},
            pbr:{
              baseColorFactor, baseColorTexture:{index:cIndex, texCoord:cTexCoord},
              metallicFactor, roughnessFactor,
              metallicRoughnessTexture:{index:mrIndex, texCoord:mrTexCoord}
            }
          });
        }
        // 確認用
        //console.log(this.materials);
      }
      encodeMeshes(){
        // meshesの翻訳。各mesh: {primitives:[], index, nodeIndex, node, tree:BoneTree何か}
        // node, nodeIndex, treeはあとで設定する。
        const meshes = this.gltf.meshes;
        const acc = this.gltf.accessors;
        const sizeDict = {
          "SCALAR":1, "VEC2":2, "VEC3":3, "VEC4":4, "MAT2":4, "MAT3":9, "MAT4":16
        }
        const createAttr = (accData) => {
          return {
            data:this.bufferViews[accData.bufferView],
            type:accData.componentType,
            count:accData.count,
            size:sizeDict[accData.type],
            normalized:(accData.normalized !== undefined ? accData.normalized : false)
          }
        }

        for(let i=0; i<meshes.length; i++){
          const mesh = meshes[i];
          const {name, primitives, weights} = mesh;
          // BoneTreeはIBMを今回使わないのでデフォルトで生成
          const eachMesh = {name:name, primitives:[], index:i, tree:new BoneTree(), children:[], parent:-1};
          // weightsはある場合、ただの配列。primitive関係なく一様に適用される。
          eachMesh.weights = (weights !== undefined ? weights : []);
          // 先にprimitiveを翻訳する。
          for(let k=0; k<primitives.length; k++){
            const primitive = primitives[k];
            const {attributes, indices, material, targets} = primitive;
            const eachPrimitive = {attributes:{}, targets:[]};
            eachPrimitive.material = (material !== undefined ? this.materials[material] : null);
            for(const name of Object.keys(attributes)){
              const attr = attributes[name];
              eachPrimitive.attributes[name] = createAttr(acc[attr]);
            }
            eachPrimitive.indices = {
              data:this.bufferViews[acc[indices].bufferView],
              type:acc[indices].componentType,
              count:acc[indices].count
            }
            if(targets !== undefined){
              for(let l=0; l<targets.length; l++){
                const target = targets[l];
                const eachTarget = {};
                for(const name of Object.keys(target)){
                  const attr = target[name];
                  eachTarget[name] = createAttr(acc[attr]);
                }
                eachPrimitive.targets.push(eachTarget);
              }
            }
            eachMesh.primitives.push(eachPrimitive);
          }
          this.meshes.push(eachMesh);
        }
        // nodeを設定する。
        for(const node of this.nodes){
          if(node.mesh < 0) continue;
          const mesh = this.meshes[node.mesh];
          mesh.nodeIndex = node.index;
          mesh.node = node;
          mesh.skin = node.skin; // -1か0以上かで翻訳済み
          const defaultLocal = Gltf.createNodeMatrix(node);
          mesh.tree.local = defaultLocal;
        }
        // 親子関係を構築する（mesh間の）
        for(const mesh of this.meshes){
          const node = mesh.node;
          const children = node.children;
          for(const child of children){
            const childNode = this.nodes[child];
            if(childNode.mesh < 0) continue;
            const childMesh = this.meshes[childNode.mesh];
            // treeの間に親子関係を構築する
            mesh.tree.addChild(childMesh.tree);
            // meshの間の親子関係を構築しておく（rootを探るのに使う）
            mesh.children.push(childMesh.index);
            childMesh.parent = mesh.index;
          }
        }
        // 親のmeshを探してtreeを取得しrootTreesに放り込んでいく
        // parentが-1のやつすべてなので簡単です
        // ...
        for(const mesh of this.meshes){
          if(mesh.parent < 0){ this.rootTrees.push(mesh.tree); }
        }

        // 確認用
        //console.log(this.meshes);
      }
      encodeSkins(){
        // 関連するskinに番号を付与する。animationサイドにskin属性を付けたいので。
        // skinsにアーマチュアが含まれないことを仮定していますが、
        // どうもそういう例は不自然なようで、対応させることもできるらしいんですが、興味無いのでどうでもいいです。
        // くだらない遊びに付き合ってる暇はない。

        // 各々のskinはどうあるべきか？
        const skins = this.gltf.skins;
        // 無ければスルー！
        if(skins === undefined) return;
        // dictはboneのindexの逆引き用
        const dict = new Array(this.nodes.length);
        // -1で初期化
        dict.fill(-1);
        // 最初の準備。boneの基本形を作る。
        for(let i=0,len=skins.length; i<len; i++){
          const skin = skins[i];
          const ibmData = this.bufferViews[this.gltf.accessors[skin.inverseBindMatrices].bufferView];
          const joints = skins[i].joints;
          const bones = []; // jointsを入れていく。
          for(let k=0; k<joints.length; k++){
            // ibmでBoneTree作っちゃおう。rootのBoneTreeも後で作る（空っぽ）
            const m = ibmData.slice(k*16, (k+1)*16);
            const ibm = new MT4(
              m[0], m[4], m[8], m[12],
              m[1], m[5], m[9], m[13],
              m[2], m[6], m[10], m[14],
              m[3], m[7], m[11], m[15]
            );
            const node = this.nodes[joints[k]];
            node.skin = i; // skin付与
            const nodeIndex = node.index;
            const bone = {
              index:k, nodeIndex:nodeIndex, node:node, children:[], parent:-1, tree:new BoneTree(ibm)
            };
            bones.push(bone);
            dict[nodeIndex] = k;
          }
          this.skins.push({bones:bones, root:null, meshes:[]});
        }

        // rootの算出。
        for(let i=0,len=this.skins.length; i<len; i++){
          const bones = this.skins[i].bones;
          let curNode = this.nodes[bones[0].nodeIndex];
          let debug=0;
          while(true){
            // 多分不要だけどデバッグ用
            if(debug++>999999){ console.error("something wrong."); break; }
            const parentNode = this.nodes[curNode.parent];
            const parentIndex = dict[curNode.parent];
            curNode = parentNode;
            if(parentIndex < 0) break;
          }
          // 末尾に入れる
          const root = {index:bones.length, nodeIndex:curNode.index, node:curNode, children:[], parent:-1, tree:new BoneTree(new MT4())}
          bones.push(root);
          curNode.skin = i; // skin付与
          dict[curNode.index] = bones.length-1;
          // rootを末尾...アーマチュアとして定義する
          this.skins[i].root = root;
        }
        // BoneTreeの間の親子関係を作る。
        for(let i=0,len=this.skins.length; i<len; i++){
          const bones = this.skins[i].bones;
          for(let k=0; k<bones.length; k++){
            const bone = bones[k];
            const node = bone.node;
            for(const child of node.children){
              if(dict[child] < 0) continue;
              // ペアリング(tree)
              const childBone = bones[dict[child]];
              bone.tree.addChild(childBone.tree);
              // ペアリング(bone)
              bone.children.push(dict[child]);
              childBone.parent = k;
            }
          }
        }
        // meshesを用意する。
        // nodeを一通りさらってmeshとskinが両方>=0である場合に放り込む。
        for(const node of this.nodes){
          if(node.mesh >= 0 && node.skin >= 0){
            this.skins[node.skin].meshes.push(node.mesh);
          }
        }

        // 確認用
        //console.log(this.skins);
      }
      encodeAnimations(){
        const animations = this.gltf.animations;
        // 無ければ何にもしない
        if(animations === undefined) return;

        // pathの1つが"weights"であるならweightAnimation
        // pathが"weights"ではなく、対象ノードの1つがmesh属性を持つならtransformAnimation
        // そうでなければskinMeshAnimationであり、その場合あらゆるnodeが対象で、すべてboneである。
        // "weight"じゃなくて"weights"でした。

        for(let i=0, len=animations.length; i<len; i++){
          const animation = animations[i];
          const channel0 = animation.channels[0];
          const node0 = this.nodes[channel0.target.node];
          const path0 = channel0.target.path;
          const mesh0 = node0.mesh;
          if(path0 === "weights"){
            console.log("-----weight-----");
            const animation_weight = this.parseWeightAnimation(animation);
            animation_weight.mesh = mesh0;
            this.animations.weight.push(animation_weight);
          }else if(mesh0 >= 0){
            console.log("-----transform-----");
            const animation_transform = this.parseTransformAnimation(animation);
            animation_transform.mesh = mesh0;
            this.animations.transform.push(animation_transform);
          }else{
            console.log("-----skinMesh-----");
            const animation_skinMesh = this.parseSkinMeshAnimation(animation);
            // encodeSkinsが終わっていればnode0にはskinが設定されているはず。
            animation_skinMesh.skin = node0.skin; // 0とか1になるはず
            this.animations.skinMesh.push(animation_skinMesh);
          }
        }
        // 確認用
        //console.log(this.animations);
      }
      parseWeightAnimation(animation){
        // 1つだけ。
        const channel = animation.channels[0];
        // この中にinputとoutputがあって...
        const sampler = animation.samplers[channel.sampler];
        // framesを計算する
        const frames = Gltf.calcFrames(this.bufferViews, this.gltf.accessors, animation, this.fps);

        // dataとframesで構成される。
        const outputData = Gltf.calcOutputData(this.bufferViews, this.gltf.accessors, sampler, frames);
        // dataにはフレームごとの配列の配列が入っている
        // framesにはフレーム数が入っている
        return outputData;
      }
      parseTransformAnimation(animation){
        // framesを計算する
        const frames = Gltf.calcFrames(this.bufferViews, this.gltf.accessors, animation, this.fps);

        // 最大で3つある。targetのnodeはいくつあっても全部同じ。
        const channels = animation.channels;
        const node = this.nodes[channels[0].target.node];
        const nodeTF = node.tf;
        // nodeのtransformをanimationのtransformで（あれば）上書きする。そしてtfのt,r,sに当てはめる。
        const animationTF = {};

        for(let i=0; i<channels.length; i++){
          const channel = channels[i];
          const sampler = animation.samplers[channel.sampler];

          const outputData = Gltf.calcOutputData(this.bufferViews, this.gltf.accessors, sampler, frames);
          animationTF[channel.target.path] = outputData.data;
        }

        // animationがあればそっちが優先。無ければすべてnodeで埋める。それも無ければデフォルト。
        const t = Gltf.createTransform(animationTF.translation, nodeTF.t, [0,0,0], frames);
        const r = Gltf.createTransform(animationTF.rotation, nodeTF.r, [0,0,0,1], frames);
        const s = Gltf.createTransform(animationTF.scale, nodeTF.s, [1,1,1], frames);

        // rはx,y,z,wの順なので、w,x,y,zに直す。
        for(let i=0; i<r.length; i++){
          const eachData = r[i].slice();
          r[i] = [eachData[3], eachData[0], eachData[1], eachData[2]];
        }
        // t,r,sの順に並べて構築する
        const data = Gltf.createTransformArray(t, r, s, frames);
        return {data, frames};
      }
      parseSkinMeshAnimation(animation){
        // 先にinputのデータを計算する
        const frames = Gltf.calcFrames(this.bufferViews, this.gltf.accessors, animation, this.fps);
        //console.log(inputData);
        //const frames = inputData.frames;
        // channelはboneごと、transformごとに色々ある。
        const channels = animation.channels;
        // なのでboneとなるnodeごとにまとめる。最終的にこのデータはboneのnodeIndexから参照される。そしてtreeのlocalにその都度当てはめられる。
        const channelGroups = new Array(this.nodes.length);
        for(let i=0; i<this.nodes.length; i++){ channelGroups[i] = []; }
        for(const channel of channels){
          const node = channel.target.node;
          channelGroups[node].push(channel);
        }
        // framesは全部同じ...はず。
        //let frames;
        // nodeごとにさっきと同じような処理をする。結果を格納する。
        const result = new Array(this.nodes.length);
        for(let i=0; i<this.nodes.length; i++){
          const node = this.nodes[i];
          const subChannels = channelGroups[i];
          const nodeTF = node.tf;
          const animationTF = {};
          for(let i=0; i<subChannels.length; i++){
            const subChannel = subChannels[i];
            const sampler = animation.samplers[subChannel.sampler];

            const outputData = Gltf.calcOutputData(this.bufferViews, this.gltf.accessors, sampler, frames);
            animationTF[subChannel.target.path] = outputData.data;
            //frames = outputData.frames; // 全部一緒
          }
          // animationがあればそっちが優先。無ければすべてnodeで埋める。それも無ければデフォルト。
          const t = Gltf.createTransform(animationTF.translation, nodeTF.t, [0,0,0], frames);
          const r = Gltf.createTransform(animationTF.rotation, nodeTF.r, [0,0,0,1], frames);
          const s = Gltf.createTransform(animationTF.scale, nodeTF.s, [1,1,1], frames);

          // rはx,y,z,wの順なので、w,x,y,zに直す。
          for(let i=0; i<r.length; i++){
            const eachData = r[i].slice();
            r[i] = [eachData[3], eachData[0], eachData[1], eachData[2]];
          }
          // t,r,sの順に並べて構築する
          const data = Gltf.createTransformArray(t, r, s, frames);
          result[i] = data;
        }
        // animationはnodeの情報が無ければ完成しない。あとから参照するのは無駄なので、
        // もうこの時点で行列にしてしまった方が合理的。
        return {data:result, frames};
      }
      createVAO(gl, options = {}){
        // meshesの翻訳データに基づいて新しく作る
        // いずれweightAnimationsの方も書き換える
        // locationですが、指定したものだけ用意する形にする。指定してなければ何にも起きない
        // こっちで新たにlocationのセマンティクスに基づいたオブジェクトを用意してそれに従って作る
        // webgpuでは全部こっちで用意するんで、まあいいですよね。
        // これであれ、何気にCOLOR_1とかTEXCOORD_1とかも使えるようになるわね。
        // createVAOとの違いはlocationを明示するところだけ。あと全部一緒...のはず。
        const {meshId = 0, primitiveId = 0, location = {}} = options;

        // POSITIONとかいろいろ入ってる。indexBuffer関連はINDICESを使おう。
        const attributeNames = Object.keys(location);

        const primitive = this.meshes[meshId].primitives[primitiveId];
        const {attributes, indices} = primitive;
        const validAttributes = {};

        for(const name of attributeNames){
          if(attributes[name] === undefined) continue;
          const attr = attributes[name];
          validAttributes[name] = {
            location:location[name], size:attr.size, type:attr.type, normalized:attr.normalized,
            data:attr.data, count:attr.count,
            isInteger:(!attr.normalized && (attr.type === 5125 || attr.type === 5213 || attr.type === 5121)),
            buffer:Gltf.createBuffer(gl, attr.data)
          };
        }

        const indexBuffer = Gltf.createBuffer(gl, indices.data, {target:gl.ELEMENT_ARRAY_BUFFER});

        // prepare vao.
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // attributes.
        for(const name of Object.keys(validAttributes)){
          const attr = validAttributes[name];
          gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
          if(attr.isInteger){
            gl.vertexAttribIPointer(attr.location, attr.size, attr.type, 0, 0);
          }else{
            gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalized, 0, 0)
          }
          gl.enableVertexAttribArray(attr.location);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // indexBuffer.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.bindVertexArray(null);

        vao.count = indices.count;
        vao.type = indices.type;
        return vao;
      }
      createTransformAnimations(gl, options = {}){
        // meshのtreeのglobalを取得できるようにするか。アクセスできるようにしよう。
        // modelでいいっすね
        // 流れとしては「update(frame)で更新」→「更新しつくしたうえでcomputeMeshGlobal()」
        // →「該当するmeshのmodel行列を取り出してセットする」
        const animations = this.animations.transform;
        const {meshId = 0, includeData = false} = options;
        const mesh = this.meshes[meshId];
        const transformAnimations = [];

        for(const animation of animations){
          if(animation.mesh !== meshId) continue;
          const {data, frames} = animation;
          // dataとframes. dataはMT4の配列でnodeのそれを上書きして構築するのがもう終わってる。
          // だからlocalに設定するだけ。
          // なお、個別にlocalを更新した後でmeshのglobalを一括して更新するんで、
          // それはGltfの関数として個別に用意するといいと思う。computeMeshGlobal()とかする。
          // 整数版
          const update = (frame) => {
            mesh.tree.local.set(data[frame % frames]);
          }
          // 1.1.10～frameに非整数を許して、補間出来るようにする。
          // 小数版
          const updateFloat = (frame) => {
            const currentFrame = Math.floor(frame);
            const fraction = frame - currentFrame;
            const nextFrame = currentFrame + 1;
            // ゼロ行列で初期化する。そのあとaddScalarで補間する。
            mesh.tree.local.init(0).addScalar(data[currentFrame % frames], 1-fraction).addScalar(data[nextFrame % frames], fraction);
          }
          const result = {update, updateFloat, frames};
          if(includeData){
            result.data = data;
          }
          transformAnimations.push(result);
        }

        return {animations:transformAnimations, model:mesh.tree.global};
      }
      computeMeshGlobal(){
        // rootTreesのtreeそれぞれに対してcomputeGlobalを実行する
        for(const root of this.rootTrees){
          BoneTree.computeGlobal(root);
        }
        // これで動くのかしら。まあ別にこれはできなくてもいいか。できたほうがいい？？
      }
      createWeightAnimations(gl, options = {}){
        // encodeMeshesを受けて作り直し。locationが指定されていない場合は機能しない。
        // targetのセマンティクスをそのまま使う形で運用する。
        // doubleってやるとattributeの枠を2つ分使って補間が可能になる
        // loopのときとそうでないときの場合分けはCPUでやってください
        const {meshId = 0, primitiveId = 0, location = {}, includeData = false, double = false} = options;
        const primitive = this.meshes[meshId].primitives[primitiveId];
        const {targets} = primitive;
        const weightNum = targets.length;

        // POSITIONとNORMALだが、POSITIONのみの場合もある。
        const attributeNames = Object.keys(location);
        const validAttributes = {};

        // POSITIONだけか、又はNORMALも。dataだけ配列で置き換える。バッファは今は作らない。
        for(const name of attributeNames){
          if(targets[0][name] === undefined) continue;
          const attr0 = targets[0][name];
          const eachTargets = {
            name:name,
            location:location[name], size:attr0.size, type:attr0.type,
            normalized:attr0.normalized, count:attr0.count
          };
          const data = [];
          for(let i=0; i<targets.length; i++){
            data.push(targets[i][name].data);
          }
          eachTargets.data = data;
          validAttributes[name] = eachTargets;
        }

        const animations = this.animations.weight;
        const weightAnimations = [];

        for(let i=0, len=animations.length; i<len; i++){
          const animation = animations[i];
          if(animation.mesh !== meshId) continue;

          const outputData = animation.data;
          const frames = animation.frames;

          // ここにvとnか、もしくはvだけを入れる。更新処理もこれに従って構築する。
          // フレームごとのvやnのデータの配列を最終的に出力する形。
          const morphAttributes = [];
          for(const name of attributeNames){
            const attr = validAttributes[name];

            const morphAttr = {};
            const morphData = [];
            const data = attr.data;
            const WEIGHT_NUM = data.length;
            const VERTEX_NUM = data[0].length;
            for(let k=0; k<frames; k++){
              const lerpedData = new Array(VERTEX_NUM);
              lerpedData.fill(0);
              for(let l=0; l<WEIGHT_NUM; l++){
                const w = outputData[k][l];
                if(w===0){continue;}
                for(let m=0; m<VERTEX_NUM; m++){
                  lerpedData[m] += w * data[l][m];
                }
              }
              morphData.push(new Float32Array(lerpedData));
            }
            morphAttr.attr = attr;
            morphAttr.name = attr.name;
            morphAttr.data = morphData;
            const BYTE_LENGTH = morphData[0].length*4;
            morphAttr.buffer = Gltf.createBuffer(gl, BYTE_LENGTH, {usage:gl.DYNAMIC_DRAW});
            if(double){
              // double
              // bufferを追加で用意する。
              morphAttr.shiftedBuffer = Gltf.createBuffer(gl, BYTE_LENGTH, {usage:gl.DYNAMIC_DRAW});
            }
            morphAttributes.push(morphAttr);
          }

          // あとはbindとupdateを作るだけ。bindはvaoにbufferを割り当てる。updateはbufferにデータを供給する。

          // バッファの紐付け（アニメーション変更時）
          const bind = (vao) => {
            gl.bindVertexArray(vao);
            for(const morphAttr of morphAttributes){
              const {attr, buffer} = morphAttr;
              gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
              gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalized, 0, 0);
              gl.enableVertexAttribArray(attr.location);
              if(double){
                // double
                // locationは2つずつずらす。
                const {shiftedBuffer} = morphAttr;
                gl.bindBuffer(gl.ARRAY_BUFFER, shiftedBuffer);
                gl.vertexAttribPointer(attr.location + 2, attr.size, attr.type, attr.normalized, 0, 0);
                gl.enableVertexAttribArray(attr.location + 2);
              }
            }
            gl.bindVertexArray(null);
          }
          // データの供給（随時）
          const update = (frame) => {
            for(const morphAttr of morphAttributes){
              const {data, buffer} = morphAttr;
              gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
              gl.bufferSubData(gl.ARRAY_BUFFER, 0, data[frame % frames]);
              if(double){
                // double
                // 1つずらしたデータを入れる。
                const {shiftedBuffer} = morphAttr;
                gl.bindBuffer(gl.ARRAY_BUFFER, shiftedBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, data[(frame + 1) % frames]);
              }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
          }
          const result = {frames, bind, update};
          // includeData:trueとするとanimationごとにdataが入る。
          // 型付配列がフレーム数分入ってる。
          if(includeData){
            result.data = {};
            for(const morphAttr of morphAttributes){
              result.data[morphAttr.name] = morphAttr.data;
            }
          }
          weightAnimations.push(result);
        }
        // なぜanimationsという形にするかというと、拡張の余地を用意しておかないとのちのち困る可能性があるから。
        return {animations:weightAnimations};
      }
      createSkinMeshAnimations(gl, options = {}){
        const animations = this.animations.skinMesh;
        // skinIdごとにanimationを作って格納する感じ
        // 最後にmeshesを付与する（アニメーション作成時は使わない）
        // boneの個数も付与する（シェーダーで使う）
        // bindとupdateも関数の形で用意する感じで
        // framesも付与する。
        // ...
        // boneNumはbonesのlength-1でいいです。gltf出力すればちゃんとアーマチュアはskinの配列から弾かれます。
        // skinがmeshesの情報を持ってるので流用します。対応するmeshをこのアニメーションで動かすことができます。
        // バカな例に合わせる必要はありません。

        const {skinId = 0, double = false, includeData = false} = options;
        const skin = this.skins[skinId];
        const {bones, root, meshes} = skin;
        const boneNum = bones.length-1;

        const skinMeshAnimations = [];

        for(let i=0; i<animations.length; i++){
          const animation = animations[i];
          if(animation.skin !== skinId) continue;

          const {data, frames} = animation;

          const matrixArrays = [];
          for(let f=0; f<frames; f++){
            const mArray = [];
            for(let i=0; i<bones.length-1; i++){
              const t = bones[i].tree;
              const n = bones[i].nodeIndex;
              if(data[n] === undefined) continue;
              const localMatrix = data[n][f];
              t.local.set(localMatrix);
            }
            BoneTree.computeGlobal(root.tree);
            for(let i=0; i<bones.length-1; i++){
              mArray.push(...bones[i].tree.global.m);
            }
            const matrixArray = new Float32Array(mArray);
            matrixArrays.push(matrixArray);
          }
          if(!double){
            // 通常の場合は1つだけスロットを用意する形。
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.UNIFORM_BUFFER, buf);
            gl.bufferData(gl.UNIFORM_BUFFER, 64*boneNum, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);

            // nameはUBOで使う
            const bind = (pg, index, name) => {
              gl.bindBufferBase(gl.UNIFORM_BUFFER, index, buf);
              //const dataBufIndex = ;
              gl.uniformBlockBinding(pg, gl.getUniformBlockIndex(pg, name), index);
            }

            // frameだけ指定すると更新される形
            const update = (frame) => {
              gl.bindBuffer(gl.UNIFORM_BUFFER, buf);
              gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matrixArrays[frame % frames]);
              gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            }

            const result = {frames, bind, update};
            if(includeData){ result.data = matrixArrays; }
            skinMeshAnimations.push(result);
          }else{
            // doubleの場合はbindで配列を指定してprevとnextを指定できるようにする。
            // たとえば4と5で4.3の場合に0.3で補間できるようにするわけ。
            const buf0 = gl.createBuffer();
            const buf1 = gl.createBuffer();
            gl.bindBuffer(gl.UNIFORM_BUFFER, buf0);
            gl.bufferData(gl.UNIFORM_BUFFER, 64*boneNum, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.UNIFORM_BUFFER, buf1);
            gl.bufferData(gl.UNIFORM_BUFFER, 64*boneNum, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            const bind = (pg, indices, names) => {
              gl.bindBufferBase(gl.UNIFORM_BUFFER, indices[0], buf0);
              //const dataBufIndex0 =
              gl.uniformBlockBinding(pg, gl.getUniformBlockIndex(pg, names[0]), indices[0]);
              gl.bindBufferBase(gl.UNIFORM_BUFFER, indices[1], buf1);
              //const dataBufIndex1 = ;
              gl.uniformBlockBinding(pg, gl.getUniformBlockIndex(pg, names[1]), indices[1]);
            }
            // framesが1の場合は両方0ですね。f,f+1に入れるわけ。あとはシェーダーサイドでよしなに。
            const update = (frame) => {
              gl.bindBuffer(gl.UNIFORM_BUFFER, buf0);
              gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matrixArrays[frame%frames]);
              gl.bindBuffer(gl.UNIFORM_BUFFER, buf1);
              gl.bufferSubData(gl.UNIFORM_BUFFER, 0, matrixArrays[(frame+1)%frames]);
              gl.bindBuffer(gl.UNIFORM_BUFFER, null);
            }
            // ここから先はshaderの仕事。まあ、頑張って。
            const result = {frames, bind, update};
            if(includeData){ result.data = matrixArrays; }
            skinMeshAnimations.push(result);
          }
        }
        // animationsだけ分けて、共通のboneNumとmeshesとは別にする。
        // meshesに属するすべてのメッシュを動かす。boneNumはシェーダーで使う。
        return {animations:skinMeshAnimations, boneNum, root, meshes};
      }
      async loadTextures(){
        const {images} = this.gltf;
        if(images === undefined) return;

        for(let i=0; i<images.length; i++){
          const img = images[i];
          // Uint8Arrayをバイト文字列に変換する
          const ua = this.bufferViews[img.bufferView];

          let byteString = "";
          for (let k = 0, len = ua.byteLength; k < len; k++) {
            byteString += String.fromCharCode(ua[k]);
          }
          // base64Stringを生成
          const base64String = window.btoa(byteString);
          // URLを生成

          const mime = img.mimeType;
          const url = `data:${mime};base64,${base64String}`;
          const texture = await ResourceLoader.getImage(url);
          this.textures.push(texture);
        }
      }
      getTexture(id = 0){
        return this.textures[id];
      }
      static createBuffer(gl, data, options = {}){
        // バッファ作成用関数
        // dataは数でもいいし、型付配列とかでもいい。
        // いずれoptionにすべきだなぁこれ...あとWebGPU版も欲しいかも？
        const {target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW} = options;

        const buf = gl.createBuffer();
        gl.bindBuffer(target, buf);
        gl.bufferData(target, data, usage);
        gl.bindBuffer(target, null);
        return buf;
      }
      static calcFrames(data, acc, animation, fps){
        // channelのinputをすべて出してminのminとmaxのmaxで以下略
        let inputMin = Infinity;
        let inputMax = -Infinity;
        for(const channel of animation.channels){
          const sampler = animation.samplers[channel.sampler];
          const input = acc[sampler.input];
          inputMin = Math.min(inputMin, input.min[0]);
          inputMax = Math.max(inputMax, input.max[0]);
        }
        const frames = Math.round((inputMax-inputMin)*fps) + 1;
        return frames;
      }
      static calcOutputData(data, acc, sampler, frames){
        const {input, output} = sampler;
        const size = data[acc[output].bufferView].length / data[acc[input].bufferView].length;

        const outputData = data[acc[output].bufferView];
        const outputArray = [];
        for(let m=0; m<outputData.length; m+=size){
          outputArray.push(new Array(...outputData.slice(m, m+size)));
        }

        if(outputArray.length < frames){
          const result = [];
          for(let f=0; f<frames; f++){
            result.push(outputArray[0]);
          }
          return {data:result, frames};
        }
        return {data:outputArray, frames};
      }
      static createEmptyArray(data, frames = 1){
        // dataは配列。通常の配列にする。長さframesで用意する。
        const result = [];
        for(let i=0; i<frames; i++){
          result.push(new Array(...data));
        }
        return result;
      }
      static createTransform(aData, nData, defaultData, frames = 1){
        // animationサイドのデータがあるならそれを採用。
        // 無い場合はnodeのtransformで埋める
        // それも無ければdefaultDataで埋める。
        if(aData !== undefined){
          return aData;
        }
        if(nData.length > 0){
          return Gltf.createEmptyArray(nData, frames);
        }
        return Gltf.createEmptyArray(defaultData, frames);
      }
      static createNodeMatrix(node){
        // node単位で行列を計算する処理
        // skinMeshはアーマチュアにトランスフォームが設定されている場合があり、それを反映させるためのもの。
        // rotationはダイレクトに変えてしまおう
        const tf = node.tf;
        const t = (tf.t.length > 0 ?  tf.t : [0,0,0]);
        const r = (tf.r.length > 0 ? [tf.r[3], tf.r[0], tf.r[1], tf.r[2]] : [1,0,0,0]);
        const s = (tf.s.length > 0 ? tf.s : [1,1,1]);
        const m = new MT4();
        m.localTranslation(...t).localRotationQ(...r).localScale(...s);
        return m;
      }
      static createTransformArray(t, r, s, frames = 1){
        // t,r,sの配列は全部同じ長さ(frames)
        // localを順繰りに適用してMT4の配列を作ります。
        const result = new Array(frames);
        for(let k=0; k<frames; k++){
          const m = new MT4();
          m.localTranslation(...t[k]);
          m.localRotationQ(...r[k]);
          m.localScale(...s[k]);
          result[k] = m;
        }
        return result;
      }
    }

    // 単位行列
    Gltf.IDENTITY = new MT4();

    // 3D関連
    applications.CameraController = CameraController;
    applications.WeightedVertice = WeightedVertice;
    applications.TransformTree = TransformTree;
    applications.TransformTreeArray = TransformTreeArray;
    applications.BoneTree = BoneTree;
    applications.createGltf = createGltf;
    applications.createGlb = createGlb;
    applications.Gltf = Gltf;

    // Transform関連
    applications.TRS3 = TRS3;
    applications.TRS4 = TRS4;
    applications.TRS3Controller = TRS3Controller;

    // contours関連
    applications.evenlySpacing = evenlySpacing;
    applications.evenlySpacingAll = evenlySpacingAll;
    applications.quadBezierize = quadBezierize;
    applications.quadBezierizeAll = quadBezierizeAll;
    applications.smoothing = smoothing;
    applications.smoothingAll = smoothingAll;
    applications.mergePoints = mergePoints;
    applications.mergePointsAll = mergePointsAll;
    applications.getBoundingBoxOfContours = getBoundingBoxOfContours;
    applications.alignmentContours = alignmentContours;

    // Text関連
    applications.parseData = parseData;
    applications.parseCmdToText = parseCmdToText;
    applications.getSVGContours = getSVGContours;
    applications.getTextContours = getTextContours;

    // context2D関連

    // 簡易ツール
    applications.EasyCanvasSaver = EasyCanvasSaver;

    return applications;
  })();

  exports.foxErrors = foxErrors;
  exports.foxConstants = foxConstants;
  exports.foxMathTools = foxMathTools;
  exports.foxColor = foxColor;
  exports.domUtils = domUtils;
  exports.webglUtils = webglUtils;
  exports.foxUtils = foxUtils;
  exports.foxIA = foxIA;
  exports.foxAudio = foxAudio;
  exports.foxTess = foxTess;
  exports.fox3Dtools = fox3Dtools;
  exports.foxApplications = foxApplications;

  Object.defineProperty(exports, "__esModule", { value: true });
});
