/**
 * fisce.js<br>
 * npm github test.<br>
 * GitHub repository: {@link https://github.com/inaridarkfox4231/fisce}
 * @module fisce
 * @copyright 2025
 * @author fisce
 * @license ISC
 * @version 1.1.5
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

    errors.E_Type = E_Type;

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
    function clamp(minValue, targetValue, maxValue){
      if(minValue > maxValue){
        // minValue > maxValueの場合は逆にして適用する
        return clamp(maxValue, targetValue, minValue);
      }
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

    function createShaderProgram(gl, params = {}){

      // nameを付けることでどのshaderがやばいか識別するとかできると良いかと
      const {vs, fs, name = "", layout = {}, outVaryings = [], separate = true} = params;

      const vsShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vsShader, vs);
      gl.compileShader(vsShader);

      if(!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:vertex shaderの作成に失敗しました。`);
        console.error(gl.getShaderInfoLog(vsShader));
        return null;
      }

      const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fsShader, fs);
      gl.compileShader(fsShader);

      if(!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:fragment shaderの作成に失敗しました。`);
        console.error(gl.getShaderInfoLog(fsShader));
        return null;
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
        console.error(gl.getProgramInfoLog(program));
        return null;
      }

      // uniform情報を作成時に登録してしまおう
      program.uniforms = getActiveUniforms(gl, program);
      // attribute情報も登録してしまおう。
      program.attributes = getActiveAttributes(gl, program);

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
        const v = (args[0] instanceof Float32Array ? args[0] : new Float32Array(args[0]));
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

    // ArrayWrapper.
    // 配列のラッパ。引数は配列でも列挙でも可能。
    class ArrayWrapper extends Array{
      constructor(){
        super();
        const args = [...arguments];
        if(Array.isArray(args[0])){
          this.push(...args[0]);
        }else{
          for(let i=0; i<args.length; i++){
            this.push(args[i]);
          }
        }
      }
    }

    // RoundRobinArray.
    // 一通り順番にさらって元に戻る。null固定はなし。なのでこういう書き方にしてはいるがresetの必要はない。
    // とはいえ最初に戻ることには意味があるのでおいてある。
    class RoundRobinArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
        this.index = 0;
      }
      pick(){
        if(this.index < this.length){
          const returnValue = this[this.index];
          this.index = (this.index + 1) % this.length;
          return returnValue;
        }
        return null;
      }
      reset(){
        this.index = 0;
      }
    }

    // RandomChoiceArray.
    // ランダムに内容が重複なく取得されていき、取り尽くされるとnull固定になる。resetで戻せる。
    class RandomChoiceArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
        this.rest = this.length;
      }
      add(v){
        // 性質上、restは長さなので、追加するたびにこれを変更すべき。
        // pickとは別の処理でこれを実行する。
        this.push(v);
        this.rest = this.length;
        return this;
      }
      pick(){
        // 0,1,2,3,4のうち3が選ばれたら3と4を変えて0,1,2,4,3にして3を返す
        if(this.rest > 0){
          const i = Math.floor(Math.random()*this.rest*0.999);
          let swapper = this[i];
          this[i] = this[this.rest-1];
          this[this.rest-1] = swapper;
          this.rest--;
          return swapper;
        }
        return null;
      }
      reset(){
        this.rest = this.length;
      }
    }

    // SweepArray.
    // 中身を頭から順繰りに出していく。終わったらnull固定になる。resetで戻せる。
    class SweepArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
        this.index = 0;
      }
      pick(){
        if(this.index < this.length){
          return this[this.index++];
        }
        return null;
      }
      reset(){
        this.index = 0;
      }
    }

    // BooleanArray.
    // 配列内のすべての要素に対するandやorを取れる
    // staticを使うと他の配列に適用できる（iterableなら何でもOK）
    class BooleanArray extends ArrayWrapper{
      constructor(){
        super(...arguments);
      }
      all(func = () => true){
        const args = [...arguments];
        args.shift(0);
        for(const a of this){
          if(!func(a, ...args)) return false;
        }
        return true;
      }
      any(func = () => true){
        const args = [...arguments];
        args.shift(0);
        for(const a of this){
          if(func(a, ...args)) return true;
        }
        return false;
      }
      static all(array, func = () => true){
        const args = [...arguments];
        args.shift(0).shift(0);
        for(const a of array){
          if(!func(a, ...args)) return false;
        }
        return true;
      }
      static any(array, func = () => true){
        const args = [...arguments];
        args.shift(0).shift(0);
        for(const a of array){
          if(func(a, ...args)) return true;
        }
        return false;
      }
    }

    // Tree.
    // 親はparentで子はSweepArrayで管理。要するに走査前提。ヒエラルキー前提。一応、depthも備えてある。
    // scanningのstatic関数があり、これを使って色々できる仕組み。
    class Tree{
      constructor(){
        this.childs = new SweepArray();
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
        this.connected = new RandomChoiceArray();
        this.branches = new SweepArray();
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
        this.connected.add(e);
        return this;
      }
      reset(){
        // dirtyFlagをリセットする
        this.dirtyFlag = false;
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

    // TimerとCounterを同じクラスの継承で書いて、
    // Scheduleを両方で使えるようにし、
    // TimerでもCounterでもScheduleが作れるようにする
    class Clock{
      constructor(params = {}){
        const {
          delay = 0, zeroClump = true,
          duration = Infinity, callback = () => {}
        } = params;

        this.delay = delay;
        this.zeroClump = zeroClump;
        this.duration = duration;
        this.callback = callback;

        this.isPause = false;
      }
      setParams(params = {}){
        const {
          delay = this.delay, zeroClump = this.zeroClump,
          duration = this.duration, callback = this.callback
        } = params;

        this.delay = delay;
        this.zeroClump = zeroClump;
        this.duration = duration;
        this.callback = callback;
        return this;
      }
      getElapsed(){
        return 0;
      }
      getProgress(){
        return 0;
      }
      update(forceUpdate = false){
        return false;
      }
      pause(){
        return this;
      }
      start(){
        return this;
      }
    }

    class TimeArrow extends Clock{
      constructor(params = {}){
        super(params);
        this.elapsedStump = window.performance.now() + this.delay;
        const {timeScale = 1000} = params;
        this.timeScale = timeScale;
        this.deltaStump = window.performance.now();
        this.pauseStump = 0;
      }
      setElapsed(){
        this.elapsedStump = window.performance.now() + this.delay;
        return this;
      }
      setParams(params = {}){
        super.setParams(params);
        const {timeScale = this.timeScale} = params;
        this.timeScale = timeScale;
        return this;
      }
      getElapsedMillis(){
        if(this.isPause){
          if(this.zeroClump){
            return Math.max(0, this.pauseStump - this.elapsedStump);
          }
          return this.pauseStump - this.elapsedStump;
        }
        if(this.zeroClump){
          return Math.max(0, window.performance.now() - this.elapsedStump);
        }
        return window.performance.now() - this.elapsedStump;
      }
      getElapsed(){
        // delayがある場合に0にしたければtrueを指定する。指定しない場合は負の数。
        return this.getElapsedMillis() / this.timeScale;
      }
      getElapsedDiscrete(interval = 1000, modulo = 1){
        const elapsed = this.getElapsedMillis();
        const n = Math.floor(elapsed / interval);
        if (modulo > 1) {
          return n % modulo;
        }
        return n;
      }
      getProgress(){
        // 進捗。durationはms指定。
        const prg = this.getElapsedMillis() / this.duration;
        return Math.min(1, prg);
      }
      update(forceUpdate = false){
        if (this.isPause) return;
        // thisを取る
        const elapsedTime = this.getElapsedMillis();

        if ((elapsedTime > this.duration) || forceUpdate) {
          if(!forceUpdate){
            // durationを超えたら更新
            this.elapsedStump += this.duration;
            // duration2個分とかだった場合、もう面倒なので「その時点」にしてしまおう
            // たとえばBPMがクッソ速い場合
            if (elapsedTime > 2*this.duration) {
              this.elapsedStump = window.performance.now();
            }
          }else{
            // forceUpdateの場合は
            this.elapsedStump = window.performance.now();
            // でいいですね。
          }
          // なんかやらせたい場合。引数はthisのみ可。
          this.callback(this);
          return true;
        }
        return false;
      }
      getDeltaMillis(){
        // 当然だが毎フレーム実行するなどしないと実質機能しない（当たり前か）
        // p5だってこれ毎フレームやってるからね
        if(this.isPause){
          return 0;
        }
        // 最後にスタンプした瞬間との差分を記録
        const delta = window.performance.now() - this.deltaStump;
        // 直後にスタンプを押す（差分用の）
        this.deltaStump = window.performance.now();
        return delta;
      }
      getDelta(){
        return this.getDeltaMillis() / this.timeScale;
      }
      pause(){
        if (this.isPause) return; // 重ね掛け回避
        this.isPause = true;
        this.pauseStump = window.performance.now();
        return this;
      }
      start(){
        if (!this.isPause) return; // 重ね掛け回避
        this.isPause = false;
        this.elapsedStump += window.performance.now() - this.pauseStump;
        this.deltaStump = window.performance.now();
        return this;
      }
    }

    class Counter extends Clock{
      constructor(params = {}){
        super(params);
        this.elapsedStump = -this.delay; // マイナス！
      }
      setElapsed(){
        this.elapsedStump = -this.delay;
        return this;
      }
      getElapsed(){
        if(this.zeroClump){
          return Math.max(0, this.elapsedStump);
        }
        return this.elapsedStump;
      }
      getElapsedDiscrete(divisor = 1, modulo = 1){
        const elapsedCount = this.getElapsed();
        const n = Math.floor(elapsedCount/divisor);
        // moduloが1の場合は単純にdivisorで割った商を返す。moduloが2以上の場合は余りを取る。
        if(modulo > 1){
          return n % modulo;
        }
        return n;
      }
      getProgress(){
        return this.getElapsed()/this.duration;
      }
      update(forceUpdate = false){
        if (this.isPause) return;

        this.elapsedStump++;
        // forceUpdateがあると強制的に次に行く。elapsedStumpも0になる。はい。
        if((this.elapsedStump === this.duration) || forceUpdate){
          this.callback(this);
          this.elapsedStump = 0;
          return true;
        }
        return false;
      }
      pause(){
        if (this.isPause) return; // 重ね掛け回避
        this.isPause = true;
        return this;
      }
      start(){
        if (!this.isPause) return; // 重ね掛け回避
        this.isPause = false;
        return this;
      }
    }

    // 複数のClockをまとめて扱う仕組み
    class ClockSet{
      constructor(data = {}){
        this.clocks = {};
        for(const name of Object.keys(data)){
          this.createClock(name, data[name]);
        }
      }
      createClock(name = "default", params = {}){
        this.clocks[name] = this.clockFactory(params);
        return this;
      }
      clockFactory(params = {}){
        return new Clock(params);
      }
      clock(name){
        return this.clocks[name];
      }
      executeAll(methodName){
        for(const name of Object.keys(this.clocks)){
          this.clocks[name][methodName]();
        }
        return this;
      }
    }

    class TimeArrowSet extends ClockSet{
      constructor(data = {}){
        super(data);
      }
      clockFactory(params = {}){
        return new TimeArrow(params);
      }
    }
    class CounterSet extends ClockSet{
      constructor(data = {}){
        super(data);
      }
      clockFactory(params = {}){
        return new Counter(params);
      }
    }

    // Clockを対象とする形で一般化したい
    class Schedule{
      constructor(params = {}){
        this.buildStatus(params);
      }
      buildStatus(params = {}){
        const {
          durations = [], actions = [], callbacks = [], loopers = [],
          clockParams = {}
        } = params;

        this.clock = this.clockFactory(clockParams);

        this.durations = durations.slice(); // 複製する。これの長さが基準となる。
        const L = this.durations.length; // 全体の長さ

        this.currentIndex = L; // initialize前のデフォルトはLの方がいいだろう

        // loopCountは別で管理する
        this.loopCounts = new Array(L);
        this.loopCounts.fill(0);

        // setup.
        this.isFinished = true;
        this.isPause = true;

        this.status = new Array(L);

        if(durations.length === 0) return; // あとから決める場合はここで切る

        // fillをobjectで使うと全部一緒になってしまうので注意
        for(let i=0; i<L; i++){
          this.status[i] = {action:null, callback:null, looper:null};
        }

        const setStatus = (statusName, src, statusLength, defaultValue) => {
          if(Array.isArray(src)){
            for(let i=0; i<Math.min(statusLength, src.length); i++){
              this.status[i][statusName] = src[i];
            }
          }else{
            // {'3':~~, '7':~~} のような書き方を許す。その場合配列ではない。
            for(const eachIndex of Object.keys(src)){
              this.status[eachIndex][statusName] = src[eachIndex];
            }
          }
          for(let i=0; i<statusLength; i++){
            if(this.status[i][statusName] === null){
              this.status[i][statusName] = defaultValue;
            }
          }
        }
        setStatus("action", actions, L, Schedule.nullFunction);
        setStatus("callback", callbacks, L, Schedule.nullFunction);
        setStatus("looper", loopers, L, {back:0, forward:0, count:1});
      }
      clockFactory(params = {}){
        return new Clock(params);
      }
      initialize(){
        this.currentIndex = 0;

        this.clock.setElapsed();
        this.clock.setParams({
          duration:this.durations[this.currentIndex],
          callback: () => { this.updateSchedule(); }
        });

        this.isFinished = false; // カウントだけ実行したら終わる
        this.isPause = false;

        this.loopCounts.fill(0); // すべて0で初期化
      }
      updateSchedule(){
        // callbackとactionは自動的に最初に戻る
        // callbackがtrueを返す場合はループを切る（forwardを採用する）

        const {callback, looper} = this.status[this.currentIndex];

        // ここで既定値を決めておけばundefinedの場合はこれらが使われる。
        // 何が言いたいかというとforwardに0以外を指定するケースはほぼ無い。
        // あったら困るので用意するけど。
        const {back = 0, forward = 0, count = 1} = looper;
        const loopBreak = callback(this.clock);

        this.loopCounts[this.currentIndex]++;
        // loopBreakの場合は強制的に抜ける
        if((this.loopCounts[this.currentIndex] === count) || loopBreak){
          this.loopCounts[this.currentIndex] = 0;

          if(typeof forward === 'number'){
            this.currentIndex += (1+forward);
          }else if(typeof forward === 'function'){
            this.currentIndex += (1+forward());
          }else{
            this.currentIndex++;
          }

          // もしdurationsの長さに到達したなら終了する
          if(this.currentIndex === this.durations.length){
            this.isFinished = true;
            return;
          }
        }else{
          // 戻る場合。たとえばback:-1なら同じ内容を繰り返す。
          if(typeof back === 'number'){
            this.currentIndex += (1+back);
          }else if(typeof back === 'function'){
            this.currentIndex += (1+back());
          }else{
            this.currentIndex++;
          }
        }

        // あとはdurationを更新するだけ
        this.clock.setParams({duration:this.durations[this.currentIndex]});
      }
      update(){
        if(this.isPause) return;
        if(this.isFinished) return; // finishしたらやらない。

        const prg = this.clock.getProgress();
        // actionの戻り値がtrueの場合はforceUpdateを実行する
        const action = this.status[this.currentIndex].action;
        const forceUpdate = action(prg);
        this.clock.update(forceUpdate);
      }
      pause(){
        if(this.isPause)return;
        this.clock.pause();
        this.isPause = true;
      }
      start(){
        if(!this.isPause)return;
        this.clock.start();
        this.isPause = false;
      }
      getIndex(){
        // 詳細なシーケンス制御のためにはインデックス単位での管理が必須
        // たとえば長さが4の場合これが4であることでシーケンスが終わっていることを表現できる
        return this.currentIndex;
      }
    }

    Schedule.nullFunction = () => {};

    class ScheduledTimeArrow extends Schedule{
      constructor(params = {}){
        super(params);
      }
      clockFactory(params = {}){
        return new TimeArrow(params);
      }
    }

    class ScheduledCounter extends Schedule{
      constructor(params = {}){
        super(params);
      }
      clockFactory(params = {}){
        return new Counter(params);
      }
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

    utils.Damper = Damper;

    utils.ArrayWrapper = ArrayWrapper;
    utils.RandomChoiceArray = RandomChoiceArray;
    utils.RoundRobinArray = RoundRobinArray;
    utils.SweepArray = SweepArray;
    utils.BooleanArray = BooleanArray;
    utils.Tree = Tree;

    utils.Vertice = Vertice;
    utils.Edge = Edge;

    utils.morton16 = morton16; // 16bit符号なし整数の対を単整数と紐付ける。
    utils.morton16Symmetry = morton16Symmetry;

    // Clock関連
    utils.Clock = Clock;
    utils.TimeArrow = TimeArrow;
    utils.Counter = Counter;
    utils.ClockSet = ClockSet;
    utils.TimeArrowSet = TimeArrowSet;
    utils.CounterSet = CounterSet;
    utils.Schedule = Schedule;
    utils.ScheduledTimeArrow = ScheduledTimeArrow;
    utils.ScheduledCounter = ScheduledCounter;

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
          document.oncontextmenu = (e) => { e.preventDefault(); }
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
      tessEnums = lib.gluEnum;
      tessRules = lib.windingRule;
      tessTypes = lib.primitiveType;

      // function called for each vertex of tesselator output
      function cb_vertex(data, polyVertArray) {
        tessCallbacks.vertex(data, polyVertArray);
        polyVertArray[polyVertArray.length] = data[0];
        polyVertArray[polyVertArray.length] = data[1];
        if(tessy.loops.length > 0){
          tessy.loops[tessy.loops.length-1].push(data[0], data[1]);
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
      function cb_combine(coords, data, weight) {
        tessCallbacks.combine(coords, data, weight);
        return [coords[0], coords[1], coords[2]];
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

    /*
      step1: 点列を生成（id:通し番号、rep:代表）
      step2: x,yでsort
      step3: idからソート後の位置を取得する辞書を作る
      step4: マージ後の点列を作ると同時にその元を代表として元の点列に登録する
      step5: 辞書を使ってid -> ソート後の位置 -> そこにある点 -> の、代表 -> の、idという形でindex配列を生成
      step6: v:マージ後の点列、f:indicesという形で出力。マージ後の点列のidもなんかの役には立つだろう。おわり。
    */
    function _mergeVerts(data){
      const points = [];
      for(let k=0; k < data.length; k+=2){
        const newP = {x:data[k], y:data[k+1], id:points.length, rep:null};
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
          const newP = {x:p.x, y:p.y, id:mergedPoints.length};
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
      const {boundaryOnly = false, rule = "odd", showPerformance = false, merge = false} = options;
      // libtess will take 3d verts and flatten to a plane for tesselation
      // since only doing 2d tesselation here, provide z=1 normal to skip
      // iterating over verts only to get the same answer.
      // comment out to test normal-generation code
      tessy.gluTessNormal(0, 0, 1);

      const startTime0 = window.performance.now();
      const triangleVerts = [];
      tessy.gluTessBeginPolygon(triangleVerts);

      for (let i = 0; i < contours.length; i++) {
        tessy.gluTessBeginContour();
        const contour = contours[i];
        for (let j = 0; j < contour.length; j += 2) {
          const coords = [contour[j], contour[j + 1], 0];
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
        return _mergeVerts(triangleVerts);
      }

      return triangleVerts;
    }

    tess.initTessy = initTessy;
    tess.tessy = tessy;
    tess.tessEnums = tessEnums;
    tess.tessRules = tessRules;
    tess.tessTypes = tessTypes;
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
        this.x = a;
        this.y = b;
        this.z = c;
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
        const res = Vecta.validateForScalar(...arguments);
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
      static assert(v, w, threshold = 0){
        // v,wはベクトルもしくは長さ3の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const vA = (v instanceof Vecta ? v.array() : v);
        const wA = (w instanceof Vecta ? w.array() : w);
        for(let i=0; i<3; i++){
          if(Math.abs(vA[i] - wA[i]) > threshold){
            console.log(`${i}: ${vA[i]}, ${wA[i]}`);
            return false;
          }
        }
        return true;
      }
    }

    // --------------------------------- Quarternion --------------------------------- //

    // https://qiita.com/inaba_darkfox/items/53230babef4e163ede3d
    class Quarternion{
      constructor(w = 1, x = 0, y = 0, z = 0){
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
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
        axis.normalize();
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
      static assert(p, q, threshold = 0){
        // p,qはクォータニオンもしくは長さ4の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const pA = (p instanceof Quarternion ? p.array() : p);
        const qA = (q instanceof Quarternion ? q.array() : q);
        for(let i=0; i<4; i++){
          if(Math.abs(pA[i] - qA[i]) > threshold){
            console.log(`${i}: ${pA[i]}, ${qA[i]}`);
            return false;
          }
        }
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
          for(let i=0; i<16; i++){
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
      init(){
        // 単位行列で初期化
        this.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
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
      setScale(a=1,b=1,c=1){
        return this.init().localScale(...arguments);
      }
      setTranslation(a=0, b=0, c=0){
        return this.init().localTranslation(...arguments);
      }
      setRotation(axis, angle){
        return this.init().localRotation(...arguments);
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
        axis.normalize();
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
      // 引数のバリエーションが豊富でいちいちバリデーション掛けた方が負荷が大きい場合は
      // immutableをstaticで用意した方がいい。ベクトルとは事情が違う。こっちは関数も
      // 少ないし。臨機応変ということ。
      static getScale(){
        return (new MT4()).setScale(...arguments);
      }
      static getRotation(){
        return (new MT4()).setRotation(...arguments);
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
      static assert(m, n, threshold = 0){
        // mとnはMT4もしくは長さ16の配列とする。比較してtrue/falseを返す。
        // 閾値で緩和する。
        const mA = (m instanceof MT4 ? m.array() : m);
        const nA = (n instanceof MT4 ? n.array() : n);
        for(let i=0; i<4; i++){
          if(Math.abs(mA[i] - nA[i]) > threshold){
            console.log(`${i}: ${mA[i]}, ${nA[i]}`);
            return false;
          }
        }
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

    const {Damper, Tree, saveCanvas} = foxUtils;
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
          this.cam.moveNDC(-tx, ty);
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

    // saveめんどくさい。
    class EasyCanvasSaver{
      constructor(cvs){
        this.target = cvs;
        this.active = false;
        this.interaction = new Inspector(cvs, {dblclick:true});
        this.interaction.add("dblclick", (function(){ this.active = true; }).bind(this));
        this.interaction.add("dbltap", (function(){ this.active = true; }).bind(this));
      }
      execute(name){
        if(!this.active){ return; }
        saveCanvas(this.target, name);
        this.active = false;
      }
    }

    applications.CameraController = CameraController;
    applications.WeightedVertice = WeightedVertice;
    applications.TransformTree = TransformTree;
    applications.TransformTreeArray = TransformTreeArray;

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
  exports.domUtils = domUtils;
  exports.webglUtils = webglUtils;
  exports.foxUtils = foxUtils;
  exports.foxIA = foxIA;
  exports.foxTess = foxTess;
  exports.fox3Dtools = fox3Dtools;
  exports.foxApplications = foxApplications;

  Object.defineProperty(exports, "__esModule", { value: true });
});
