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
