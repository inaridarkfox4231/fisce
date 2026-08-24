// foxApplication.
// CameraControllerなどはここに属する。上記3つと違って切り売りができない。
// 多分テッセレーションとかもここ？
// foxParseでシェーダー解釈してみる

const foxApplications = (function(){
  const applications = {};

  //const {createShaderProgram, uniformX} = webglUtils;
  const {parseDesignDescription} = foxParse;
  const {glEnum, glTypedArray, ProgramWrapper, WBOWrapper, VBOWrapper, UBOWrapper, IBOWrapper, VAOWrapper} = webglUtils;
  const {Damper, Tree, saveCanvas, ResourceLoader, getTextAlign, getTextBoundingRect, mapAmount} = foxUtils;
  const {Interaction, Inspector} = foxIA;
  const {Vecta, MT3, MT4, QCameraPerse, QCameraOrtho} = fox3Dtools;
  const {coulour3} = foxColor;

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
  // バグ対応！
  // 全部閉路なのでZは要らないですね...
  // というかまあこれでいいでしょう。なお、前後の半角はトリミングされるようです。
  function parseCmdToText(cmd){
    let result = "";
    //for(let i=0; i<cmd.length-1; i++){
    for(let i=0; i < cmd.length; i++){
      const command = cmd[i];
      const {x, y, x1, y1, x2, y2} = command;
      switch(command.type){
        case "M":
          result += `M ${x} ${y} `;
          break;
        case "Q":
          result += `Q ${x1} ${y1} ${x} ${y} `;
          break;
        case "L":
          result += `L ${x} ${y} `;
          break;
        case "C":
          result += `C ${x1} ${y1} ${x} ${y} `;
          break;
        case "Z":
          result += `Z `;
          break;
        }
      }
    //result += "Z";
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

  // Measurable Contours.
  // addで追加してinitで初期化してdisplayで描画
  // displayParallelで並行描画
  class MCS{
    constructor(data = [], dimension = 2){
      this.contours = [];
      this.set(data, dimension);
      this.lengthAmountsArray = [];
      this.totalLengthArray = []; // contourの長さそれぞれの配列
      this.totalLengthAmounts = [];
      this.entireLength = 0; // 全体の長さの総和。totalLengthArrayのreduceSum.
      this.path = null;
      this.init();
    }
    createPath(){
      // contoursをもとにpath2Dを作る
      const path = new Path2D();
      for(let i=0; i<this.contours.length; i++){
        const contour = this.contours[i];
        for(let k=0; k<contour.length; k++){
          const p = contour[k];
          if(k===0){ path.moveTo(p.x, p.y); }else{ path.lineTo(p.x, p.y); }
        }
      }
      this.path = path;
    }
    add(data = [], dimension = 2){
      // 配列だとして0番が数字->そこからベクトルを作る、ベクトル->そのまま使う
      if(data.length === 0) return;
      if(data[0] instanceof Vecta){
        this.contours.push(data);
        return this;
      }
      if(typeof data[0] === 'number'){
        const contour = [];
        for(let k=0; k<data.length; k+=dimension){
          contour.push(Vecta.create(data.slice(k, k+dimension)));
        }
        this.contours.push(contour);
      }
      return this;
    }
    set(data = [], dimension = 2){
      // contoursの初期化を実行する。既存のそれに足していくならaddを使う。
      this.contours = [];
      if(data.length === 0) return;
      // data[0]が配列の場合
      if(Array.isArray(data[0])){
        for(let i=0; i<data.length; i++){
          this.add(data[i], dimension);
        }
        return this;
      }
      // data[0]が配列でない、単独contourの場合。
      this.add(data, dimension);
      return this;
    }
    init(){
      this.lengthAmountsArray = [];
      this.totalLengthArray = []; // contourの長さそれぞれの配列
      this.entireLength = 0; // 全体の長さの総和。totalLengthArrayのreduceSum.
      // contoursの各成分に対し、lengthAmountsを作ってセットする。
      for(let k=0; k<this.contours.length; k++){
        const contour = this.contours[k];
        const lengthAmounts = [0];
        let totalLength = 0;
        for(let i=1; i<contour.length; i++){
          const d = contour[i].dist(contour[i-1]);
          totalLength += d;
          lengthAmounts[i] = lengthAmounts[i-1] + d;
        }
        this.lengthAmountsArray.push(lengthAmounts);
        this.totalLengthArray.push(totalLength);
        this.entireLength += totalLength;
      }
      // たとえばcontourが3本の場合、長さは4になる。0,1,2,3. 累積の記録。
      this.totalLengthAmounts = [0];
      for(let k=0; k<this.totalLengthArray.length; k++){
        this.totalLengthAmounts[k+1] = this.totalLengthAmounts[k] + this.totalLengthArray[k];
      }
      // pathを作る
      this.createPath();
      return this;
    }
    mapping(prg){
      // どのcontourのどの頂点までかって言うのを計算する
      // ratioが正の場合に追加すればいいですね
      // たとえば頂点が0,1,2,3,4とある場合に最後がratio=0なら0,1,2,3,4でおわりですが
      // indexが3でratioが0.5なら3と4の中間点を追加するわけです
      const contourCount = this.contours.length;
      const m0 = mapAmount(this.totalLengthAmounts, prg);
      if(m0.index >= contourCount){
        return {index:contourCount-1, contourIndex:this.contours[contourCount-1].length-1, ratio:0};
      }
      const targetContour = this.contours[m0.index];
      const m1 = mapAmount(this.lengthAmountsArray[m0.index], m0.ratio);
      if(m1.index >= targetContour.length-1){
        return {index:m0.index, contourIndex:targetContour.length-1, ratio:0};
      }
      return {index:m0.index, contourIndex:m1.index, ratio:m1.ratio};
    }
    mappingParallel(prg){
      // contourごとに進捗を計算する
      // それぞれについて同じことをする
      const progressData = [];
      for(let i=0; i<this.contours.length; i++){
        const contour = this.contours[i];
        const m = mapAmount(this.lengthAmountsArray[i], prg);
        if(m.index >= contour.length-1){
          progressData.push({index:contour.length-1, ratio:0});
          continue;
        }
        progressData.push({index:m.index, ratio:m.ratio});
      }
      return progressData;
    }
    drawContours(ctx, prg){
      // closedについてですが
      // 使わないことにします
      // 使わない方がすっきりする
      // 構成時にあれする方向で行きましょうね
      const m = this.mapping(prg);
      // contourのうち、m.indexより小さいもの：すべてかく
      // m.indexのところで、m.contourIndexまですべてかく
      // m.contourIndex < contour.length-1であるならば...次のものとratioでlerpして一つ追加する。
      for(let k=0; k<m.index; k++){
        const contour = this.contours[k];
        for(let i=0; i<contour.length; i++){
          const p = contour[i];
          if(i===0){ ctx.moveTo(p.x, p.y); }else{ ctx.lineTo(p.x, p.y); }
        }
      }
      const finalContour = this.contours[m.index];
      for(let i=0; i<=m.contourIndex; i++){
        const p = finalContour[i];
        if(i===0){ ctx.moveTo(p.x, p.y); }else{ ctx.lineTo(p.x, p.y); }
      }
      if(m.contourIndex < finalContour.length-1){
        const left = finalContour[m.contourIndex];
        const right = finalContour[m.contourIndex+1];
        const lerped = left.lerp(right, m.ratio, true);
        //const lerped = left.copy().mult(1-m.ratio).addScalar(right, m.ratio);
        ctx.lineTo(lerped.x, lerped.y);
      }
    }
    drawContoursParallel(ctx, prg){
      const mArray = this.mappingParallel(prg);
      for(let i=0; i<this.contours.length; i++){
        const contour = this.contours[i];
        const m = mArray[i];
        for(let k=0; k<=m.index; k++){
          const p = contour[k];
          if(k===0){ ctx.moveTo(p.x, p.y); }else{ ctx.lineTo(p.x, p.y); }
        }
        if(m.index < contour.length-1){
          const left = contour[m.index];
          const right = contour[m.index+1];
          const lerped = left.lerp(right, m.ratio, true);
          //const lerped = left.copy().mult(1-m.ratio).addScalar(right, m.ratio);
          ctx.lineTo(lerped.x, lerped.y);
        }
      }
    }
    execute(ctx, options = {}, usePath = false){
      // せいぜいruleくらいは作るか
      // defaultはevenoddにするか
      const {commands = ["stroke"], rule = 'evenodd', fillStyle = "", strokeStyle = ""} = options;
      if(fillStyle !== ""){
        ctx.fillStyle = fillStyle;
      }
      if(strokeStyle !== ""){
        ctx.strokeStyle = strokeStyle;
      }

      for(let k=0; k<commands.length; k++){
        switch(commands[k]){
          case "stroke":
            if(usePath){
              ctx.stroke(this.path);
            }else{
              ctx.stroke();
            }
            break;
          case "fill":
            if(usePath){
              ctx.fill(this.path, rule);
            }else{
              ctx.fill(rule);
            }
            break;
        }
      }
    }
    display(ctx, prg, options = {}){
      // configがあれば実行する
      if(typeof options.config === 'function'){ options.config(ctx); }

      // せいぜいruleくらいは作るか
      ctx.beginPath();
      this.drawContours(ctx, prg);

      this.execute(ctx, options);
      return this;
    }
    displayParallel(ctx, prg, options = {}){
      // configがあれば実行する
      if(typeof options.config === 'function'){ options.config(ctx); }

      ctx.beginPath();
      this.drawContoursParallel(ctx, prg);

      this.execute(ctx, options);
      return this;
    }
    displayAll(ctx, options = {}){
      // configがあれば実行する
      if(typeof options.config === 'function'){ options.config(ctx); }

      // 全部書くときは普通にpathを使う
      // usePath:true
      this.execute(ctx, options, true);
    }
    polygon(data = []){
      const polygonData = MCS.polygon(data);
      this.add(polygonData);
      return this;
    }
    rect(data = [], options = {}){
      const rectData = MCS.rect(data, options);
      this.add(rectData);
      return this;
    }
    roundRect(data = [], options = {}){
      const roundRectData = MCS.roundRect(data, options);
      this.add(roundRectData);
      return this;
    }
    square(data = [], options = {}){
      const squareData = MCS.square(data, options);
      this.add(squareData);
      return this;
    }
    roundSquare(data = [], options = {}){
      const roundSquareData = MCS.roundSquare(data, options);
      this.add(roundSquareData);
      return this;
    }
    arc(data = [], options = {}){
      const arcData = MCS.arc(data, options);
      this.add(arcData);
      return this;
    }
    ellipse(data = [], options = {}){
      const ellipseData = MCS.ellipse(data, options);
      this.add(ellipseData);
      return this;
    }
    circle(data = [], options = {}){
      const circleData = MCS.circle(data, options);
      this.add(circleData);
      return this;
    }
    quadratic(data = [], options = {}){
      const qData = MCS.quadratic(data, options);
      this.add(qData);
      return this;
    }
    bezier(data = [], options = {}){
      const bData = MCS.bezier(data, options);
      this.add(bData);
      return this;
    }
    svg(s = "M 0 0", options = {}){
      // svgの場合はcontoursなのでsetですね。
      const contours = MCS.svg(s, options);
      this.set(contours);
      return this;
    }
    static create(){
      return new this(...arguments);
    }
    static convertToVectors(coords = [], dimension = 2){
      // ベクトル列かcoordsかで紛糾していますが、
      // ベクトル列->加工やinspectに便利
      // coords->テッセレーション時にそのまま使える
      // どっちも役割あるんでわからんですね。
      const result = [];
      for(let k=0; k<coords.length; k+=dimension){
        result.push(Vecta.create(coords.slice(k, k+dimension)));
      }
      return result;
    }
    static convertToCoords(vectors = [], dimension = 2){
      // どっちも役割あるならどっちも作って戻り値はベクトルで統一すればいいでしょ。
      const result = [];
      for(let k=0; k<vectors.length; k++){
        const v = vectors[k];
        if(dimension === 2){ result.push(v.x, v.y); }
        if(dimension === 3){ result.push(v.x, v.y, v.z); }
      }
      return result;
    }
    static polygon(data = []){
      return this.points(data, {closed:true});
    }
    static points(data = [], options = {}){
      const {closed = true} = options;
      if(data.length === 0){ return []; }
      if(typeof data[0] !== 'number'){ return []; }
      const properCoords = data.slice();
      if(closed){
        properCoords.push(data[0], data[1]);
      }
      return this.convertToVectors(properCoords);
    }
    static calcRectCoords(data = [], options = {}){
      // 丸形で流用するため。
      const {mode = 'corner', clockwise = true} = options;
      switch(mode){
        case "corner":
          const x0 = data[0];
          const y0 = data[1];
          const w0 = data[2];
          const h0 = data[3];
          if(clockwise){
             return [x0, y0, x0+w0, y0, x0+w0, y0+h0, x0, y0+h0];
          }else{
              return [x0, y0, x0, y0+h0, x0+w0, y0+h0, x0+w0, y0];
          }
          break;
        case "corners":
          const a1 = Math.min(data[0], data[2]);
          const b1 = Math.min(data[1], data[3]);
          const c1 = Math.max(data[0], data[2]);
          const d1 = Math.max(data[1], data[3]);
          if(clockwise){
            return [a1, b1, c1, b1, c1, d1, a1, d1];
          }else{
            return [a1, b1, a1, d1, c1, d1, c1, b1];
          }
          break;
        case "center":
            const a2 = data[0] - data[2]*0.5;
            const b2 = data[1] - data[3]*0.5;
            const c2 = data[0] + data[2]*0.5;
            const d2 = data[1] + data[3]*0.5;
        if(clockwise){
               return [a2, b2, c2, b2, c2, d2, a2, d2];
            }else{
                return [a2, b2, a2, d2, c2, d2, c2, b2];
            }
           break;
        case "radius":
            const a3 = data[0] - data[2];
            const b3 = data[1] - data[3];
            const c3 = data[0] + data[2];
            const d3 = data[1] + data[3];
        if(clockwise){
               return [a3, b3, c3, b3, c3, d3, a3, d3];
            }else{
                return [a3, b3, a3, d3, c3, d3, c3, b3];
            }
           break;
      }
      return [];
    }
    static rect(data = [], options = {}){
      const {closed = true} = options;

      if(data.length === 0){ return []; }
      if(typeof data[0] !== 'number'){ return []; }
      const properCoords = [];
      properCoords.push(...MCS.calcRectCoords(data, options));

      if(closed){
        properCoords.push(properCoords[0], properCoords[1]);
      }
      return this.convertToVectors(properCoords);
    }
    static roundRect(data = [], options = {}){
      // closedはtrueでいいです。
      const {clockwise = true, detail = 50, radius = 5} = options;
      if(data.length === 0){ return []; }

      // 配列の場合は長さ0ならすべて0で長さ1以上で4未満の場合は最後を重複させる
      // 順番は頂点をめぐる順なのでcounterClockwiseだと逆指定になる
      const radiusArray = new Array(4);
      if(typeof radius === 'number'){
       for(let k=0; k<4; k++){ radiusArray[k] = radius; }
      }else if(Array.isArray(radius)){
        for(let k=0; k<4; k++){
          if(radius.length === 0){ radiusArray[k] = 0; }
          else if(k >= radius.length){
            radiusArray[k] = radius[radius.length-1];
          }else{
            radiusArray[k] = radius[k];
          }
        }
      }

      if(typeof data[0] !== 'number'){ return []; }
      const rectCoords = MCS.calcRectCoords(data, options);
      const v = [];
      for(let i=0; i<8; i+=2){
        v.push(Vecta.create(rectCoords[i], rectCoords[i+1]));
      }
      const la = v[0].dist(v[1]); // clockwiseなら横幅、counterClockwiseなら縦幅
      const lb = v[1].dist(v[2]); // clockwiseなら縦幅、counterClockwiseなら横幅
      const maxRadius = Math.min(la, lb) * 0.5;

      //const r = Math.max(0, Math.min(maxRadius, radius));
      for(let k=0; k<4; k++){
        // 0～maxRadiusでclampする
        radiusArray[k] = Math.max(0, Math.min(maxRadius, radiusArray[k]));
      }

      const w = [];
      // 点を取った後は回転で補間するんで半径は出てきません
      w.push(v[0].lerp(v[1], radiusArray[0]/la, true));
      w.push(v[0].lerp(v[1], 1-radiusArray[1]/la, true));
      w.push(v[1].lerp(v[2], radiusArray[1]/lb, true));
      w.push(v[1].lerp(v[2], 1-radiusArray[2]/lb, true));
      w.push(v[2].lerp(v[3], radiusArray[2]/la, true));
      w.push(v[2].lerp(v[3], 1-radiusArray[3]/la, true));
      w.push(v[3].lerp(v[0], radiusArray[3]/lb, true));
      w.push(v[3].lerp(v[0], 1-radiusArray[0]/lb, true));
      // 0-1, 2-3, 4-5, 6-7 は直線でいい
      // 1-2, 3-4, 5-6, 7-0が円弧となる
      const c = [];
      for(let i=0; i<4; i++){
        const w0 = w[2*i+1];
        const w1 = w[(2*i+2)%8];
        // 対称差は可読性が落ちるのであんま使いたくない。
        const cornerVector = (((i%2===0) && clockwise) || ((i%2===1) && !clockwise) ? Vecta.create(w0.x, w1.y) : Vecta.create(w1.x, w0.y));
        c.push(cornerVector);
      }
      const result = [];
      for(let k=0; k<4; k++){
        result.push(w[2*k], w[2*k+1]);

        const arrow = w[2*k+1].sub(c[k], true);
        for(let j=1; j<=detail; j++){
          const angle = (Math.PI*0.5*j/detail) * (clockwise ? 1 : -1);
          result.push(arrow.rotate(angle, true).add(c[k]));
        }
      }
      // アルゴリズムに問題が無ければ最初の点まできっちり入るはずです。つまりclosed前提。
      return result;
    }
    static square(data = [], options = {}){
      // 引数が1個減るだけ
      // なおcornersの場合は意図しない挙動になる。まあどうでもいい。使うなってだけの話。
      return this.rect([data[0], data[1], data[2], data[2]], options);
    }
    static roundSquare(data = [], options = {}){
      // 引数が1個減るだけ
      // なおcornersの場合は意図しない挙動になる。まあどうでもいい。使うなってだけの話。
      return this.roundRect([data[0], data[1], data[2], data[2]], options);
    }
    static arc(data = [], options = {}){
      // radius/diam
      const {detail = 200, start = 0, band = Math.PI*2, mode = "radius", clockwise = true, closed = true} = options;
      if(data.length === 0){ return []; }
      if(typeof data[0] !== 'number'){ return []; }
      const x = data[0];
      const y = data[1];
      const radiusX = (mode === 'radius' ? data[2] : data[2]/2);
      const radiusY = (mode === 'radius' ? data[3] : data[3]/2);
      const properCoords = [];
      for(let i=0; i<detail; i++){
        const angle = start + (clockwise ? 1 : -1) * band*i/detail;
        properCoords.push(x + radiusX * Math.cos(angle), y + radiusY * Math.sin(angle));
      }
      if(closed){
        properCoords.push(properCoords[0], properCoords[1]);
      }
      return this.convertToVectors(properCoords);
    }
    static ellipse(data = [], options = {}){
      const properOptions = {};
      for(const [key, value] of Object.entries(options)){ properOptions[key] = value; }
      properOptions.band = Math.PI*2;
      return this.arc(data, properOptions);
    }
    static circle(data = [], options = []){
      return this.ellipse([data[0], data[1], data[2], data[2]], options);
    }
    static quadratic(data = [], options = {}){
      // イメージ的には3つ...2次元で。どうしようね。まあ3次元でもいいか。
      const {dimension = 2, detail = 50} = options;
      const vectors = [];
      for(let i=0; i<data.length; i+=dimension){
        vectors.push(Vecta.create(data.slice(i, i+dimension)));
      }
      const result = [];
      for(let i=0; i<=detail; i++){
        const t = i/detail;
        result.push(vectors[0].copy().mult((1-t)*(1-t)).addScalar(vectors[1], 2*t*(1-t)).addScalar(vectors[2], t*t));
      }
      return result;
    }
    static bezier(data = [], options = {}){
      // イメージ的には3つ...2次元で。どうしようね。まあ3次元でもいいか。
      const {dimension = 2, detail = 50} = options;
      const vectors = [];
      for(let i=0; i<data.length; i+=dimension){
        vectors.push(Vecta.create(data.slice(i, i+dimension)));
      }
      const result = [];
      for(let i=0; i<=detail; i++){
        const t = i/detail;
        result.push(vectors[0].copy().mult((1-t)*(1-t)*(1-t)).addScalar(vectors[1], 3*t*(1-t)*(1-t)).addScalar(vectors[2], 3*t*t*(1-t)).addScalar(vectors[3], t*t*t));
      }
      return result;
    }
    static svg(s = "M 0 0", options = {}){
      // quadraticDetail: QとT用。
      // bezierDetail: CとS用。
      // arcDetail: A用。
      const {quadraticDetail = 20, bezierDetail = 20, arcDetail = 20, parseScale = 1} = options;
      // svgのみcontoursを作るんで、使うならaddではなくsetっすね
      const cmdData = s.split(" ");
      const result = [];
      // 内部的にiを増やすのが気に食わないのであれば...どうしましょうね。
      const commands = [];
      let currentCommand = "";
      const currentCoords = [];
      for(let i=0; i<cmdData.length; i++){
        const cmd = cmdData[i];
        if(cmd.match(/[A-Z]{1}/) !== null){
          if(currentCommand !== ""){
            commands.push({command:currentCommand, data:currentCoords.slice()});
            currentCoords.length = 0;
          }
          currentCommand = cmd;
        }else{
          currentCoords.push(Number(cmd));
        }
      }
      // あ、最後忘れてたわ。
      if(currentCommand !== ""){
        commands.push({command:currentCommand, data:currentCoords.slice()});
        currentCoords.length = 0;
      }

      // これでいいっすね。Zの場合は空っぽっす。
      const contour = [];
      const lastPoint = Vecta.create();
      const lastControlPoint = Vecta.create();
      let lastCommand = "";
      for(let k=0; k<commands.length; k++){
        const {command, data} = commands[k];
        switch(command){
          case "M":
            lastCommand = "M";
            if(contour.length > 0){
              // 完成なので、入れます。
              result.push(contour.slice());
              contour.length = 0;
            }
            contour.push(Vecta.create(...data).mult(parseScale));
            break;
          case "L":
            lastCommand = "L";
            contour.push(Vecta.create(...data).mult(parseScale));
            break;
          case "Q":
            lastCommand = "Q";
            const q0 = lastPoint;
            const q1 = Vecta.create(data.slice(0,2)).mult(parseScale);
            const q2 = Vecta.create(data.slice(2,4)).mult(parseScale);
            lastControlPoint.set(q1);
            for(let k=1; k<=quadraticDetail; k++){
              const t = k/quadraticDetail;
              const q = q0.copy().mult((1-t)*(1-t)).addScalar(q1, 2*t*(1-t)).addScalar(q2, t*t);
              contour.push(q);
            }
            break;
          case "C":
            lastCommand = "C";
            const c0 = lastPoint;
            const c1 = Vecta.create(data.slice(0,2)).mult(parseScale);
            const c2 = Vecta.create(data.slice(2,4)).mult(parseScale);
            const c3 = Vecta.create(data.slice(4,6)).mult(parseScale);
            lastControlPoint.set(c2);
            for(let k=1; k<=bezierDetail; k++){
              const t = k/bezierDetail;
              const c = c0.copy().mult((1-t)*(1-t)*(1-t)).addScalar(c1, 3*t*(1-t)*(1-t)).addScalar(c2, 3*t*t*(1-t)).addScalar(c3, t*t*t);
              contour.push(c);
            }
            break;
          case "H":
            lastCommand = "H";
            // horizontal:水平。x座標。
            contour.push(Vecta.create(data[0], lastPoint.y).mult(parseScale));
            break;
          case "V":
            lastCommand = "V";
            // vertical:垂直。y座標。
            contour.push(Vecta.create(lastPoint.x, data[0]).mult(parseScale));
            break;
          case "T":
            // 簡易版Q. さっきの制御点の対蹠点が制御点になる。前がQかTでなければLと同じ。
            // Qに色々つなげていくための物なので、Q-T-T-...のような使い方が想定される。
            if(lastCommand !== "Q" && lastCommand !== "T"){
              lastCommand = "L";
              contour.push(Vecta.create(...data).mult(parseScale));
            }else{
              lastCommand = "T";
              const q0 = lastPoint;
              const q1 = q0.copy().mult(2).sub(lastControlPoint);
              const q2 = Vecta.create(...data).mult(parseScale);
              lastControlPoint.set(q1);
              for(let k=1; k<=quadraticDetail; k++){
                const t = k/quadraticDetail;
                const q = q0.copy().mult((1-t)*(1-t)).addScalar(q1, 2*t*(1-t)).addScalar(q2, t*t);
                contour.push(q);
              }
            }
            break;
          case "S":
            // 簡易版C. さっきの2番目の制御点の対蹠点が1番目の制御点になる。前がCかSでなければQと同じ。
            // Cに色々つなげていくための物なので、C-S-S-...のような使い方が想定される。
            if(lastCommand !== "C" && lastCommand !== "S"){
              lastCommand = "Q";
              const q0 = lastPoint;
              const q1 = Vecta.create(data.slice(0,2)).mult(parseScale);
              const q2 = Vecta.create(data.slice(2,4)).mult(parseScale);
              lastControlPoint.set(q1);
              for(let k=1; k<=quadraticDetail; k++){
                const t = k/quadraticDetail;
                const q = q0.copy().mult((1-t)*(1-t)).addScalar(q1, 2*t*(1-t)).addScalar(q2, t*t);
                contour.push(q);
              }
            }else{
              lastCommand = "S";
              const c0 = lastPoint;
              const c1 = c0.copy().mult(2).sub(lastControlPoint);
              const c2 = Vecta.create(data.slice(0,2)).mult(parseScale);
              const c3 = Vecta.create(data.slice(2,4)).mult(parseScale);
              lastControlPoint.set(c2);
              for(let k=1; k<=bezierDetail; k++){
                const t = k/bezierDetail;
                const c = c0.copy().mult((1-t)*(1-t)*(1-t)).addScalar(c1, 3*t*(1-t)*(1-t)).addScalar(c2, 3*t*t*(1-t)).addScalar(c3, t*t*t);
                contour.push(c);
              }
            }
            break;
          case "A":
            // 本家はややこしいのでarcToと同じとする。
            // つまりx,y,x1,y1,r. 最後の点とx1,y1でx,yに近い方の距離とrでminを取ってproperとし、円弧でつなげる。
            lastCommand = "A";
            const a0 = lastPoint;
            const a1 = Vecta.create(data.slice(0,2)).mult(parseScale);
            const a2 = Vecta.create(data.slice(2,4)).mult(parseScale);
            const r0 = data[4]*parseScale;
            const r = Math.min(Math.min(a0.dist(a1), a1.dist(a2)), r0);
            const v01 = a1.sub(a0, true).normalize();
            const v12 = a2.sub(a1, true).normalize();
            const angle = v01.angleTo(v12);
            const b0 = a1.addScalar(v01, -r, true);
            const b1 = a1.addScalar(v12, r, true);
            // a0 -> b0 -> b1 -> a2 で作る。b0 -> b1 は円弧。
            // 中心を割り出す計算だと破綻するので、角度を元に計算した方がよい。
            // ごめんなさいangleは絶対値を取って評価します
            const u = v01.mult((Math.abs(angle) < Number.EPSILON ? 2*r/arcDetail : 2*r*Math.sin(angle*0.5/arcDetail)/Math.tan(angle*0.5)), true);
            u.rotate(angle*0.5/arcDetail);
            contour.push(b0);
            const bCur = b0.copy();
            for(let k=1; k<arcDetail; k++){
              bCur.add(u);
              contour.push(bCur.copy());
              u.rotate(angle/arcDetail);
            }
            contour.push(b1);
            contour.push(a2);
            break;
          case "Z":
            // 始点を入れるだけ。
            lastCommand = "Z";
            contour.push(contour[0].copy());
            break;
        }
        lastPoint.set(contour[contour.length-1]);
      }
      // 最後です。
      result.push(contour.slice());
      return result;
    }
    static create(){
      return new this();
    }
  }

  // 普通に考えたらパラレルのパラレルとかも考えられるんだろうが
  // まあどうでもいいな...
  // まあつくるかな...（馬鹿）
  // パラレルのパラレルというのはそれぞれがパラレルの流儀で描画されるということです
  // おわかり？？？めんどうだな...
  class MCSArray{
    constructor(data = []){
      this.mcss = [];
      this.entireLengthAmountsArray = [];
      for(let i=0; i<data.length; i++){
        if(data[i] instanceof MCS){
          this.mcss.push(data[i]);
        }
      }
      this.init();
    }
    add(mcs){
      this.mcss.push(mcs);
      return this;
    }
    set(mcs){
      this.mcss.length = 0;
      this.mcss.push(mcs);
      return this;
    }
    init(){
      if(this.mcss.length === 0) return this;
      this.entireLengthAmountsArray = [0];
      for(let k=0; k<this.mcss.length; k++){
        this.entireLengthAmountsArray[k+1] = this.entireLengthAmountsArray[k] + this.mcss[k].entireLength;
      }
      return this;
    }
    display(ctx, prg, optionsArray = [], options = {}){
      const {parallel = false} = options;

      const properOptionsArray = [];
      for(let k=0; k<this.mcss.length; k++){
        if(optionsArray[k] === undefined){
          properOptionsArray.push({});
        }else{
          properOptionsArray.push(optionsArray[k]);
        }
      }

      if(this.mcss.length === 0) return;
      const m = mapAmount(this.entireLengthAmountsArray, prg);

      for(let k=0; k<m.index; k++){
        this.mcss[k].displayAll(ctx, properOptionsArray[k]);
      }
      if(m.index < this.mcss.length){
        if(parallel){
          this.mcss[m.index].displayParallel(ctx, m.ratio, properOptionsArray[m.index]);
        }else{
          this.mcss[m.index].display(ctx, m.ratio, properOptionsArray[m.index]);
        }
      }
    }
    displayParallel(ctx, prg, optionsArray = [], options = {}){
      const {parallel = false} = options;

      const properOptionsArray = [];
      for(let k=0; k<this.mcss.length; k++){
        if(optionsArray[k] === undefined){
          properOptionsArray.push({});
        }else{
          properOptionsArray.push(optionsArray[k]);
        }
      }

      // parallelなので当然こうなる
      for(let k=0; k<this.mcss.length; k++){
        if(parallel){
          this.mcss[k].displayParallel(ctx, prg, properOptionsArray[k]);
        }else{
          this.mcss[k].display(ctx, prg, properOptionsArray[k]);
        }
      }
    }
    displayAll(ctx, optionsArray = [], options = {}){
      // まあこうなる
      this.display(ctx, 1, optionsArray, options);
    }
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
    show(code = ''){
      if(code === ''){
        this.show('bufferView, node, material, mesh, skin, animation');
        return;
      }
      const keywords = code.split(',').map(t => t.trim());
      for(const keyword of keywords){
        switch(keyword){
          case 'bufferView':
            console.log('--- bufferView ---');
            console.dir(this.bufferViews);
            break;
          case 'node':
            console.log('--- node ---');
            console.dir(this.nodes);
            break;
          case 'material':
            console.log('--- material ---');
            console.dir(this.materials);
            break;
          case 'mesh':
            console.log('--- mesh ---');
            console.dir(this.meshes);
            break;
          case 'skin':
            console.log('--- skin ---');
            console.dir(this.skins);
            break;
          case 'animation':
            console.log('--- animation ---');
            console.dir(this.animations);
            break;
        }
      }
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
          //console.log("-----weight-----");
          const animation_weight = this.parseWeightAnimation(animation);
          animation_weight.mesh = mesh0;
          this.animations.weight.push(animation_weight);
        }else if(mesh0 >= 0){
          //console.log("-----transform-----");
          const animation_transform = this.parseTransformAnimation(animation);
          animation_transform.mesh = mesh0;
          this.animations.transform.push(animation_transform);
        }else{
          //console.log("-----skinMesh-----");
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
      // VAOWrapperを作ろう
      // meshesの翻訳データに基づいて新しく作る
      // locationですが、指定したものだけ用意する形にする。指定してなければ何にも起きない
      // こっちで新たにlocationのセマンティクスに基づいたオブジェクトを用意してそれに従って作る
      // これであれ、何気にCOLOR_1とかTEXCOORD_1とかも使えるようになるわね。
      // faceは使う場合は文字列で名前を指定する。nullにすると使われない。そういう場合もある。
      const {meshId = 0, primitiveId = 0, location = {}, face = 'f'} = options;

      // POSITIONとかいろいろ入ってる。indexBuffer関連はINDICESを使おう。
      const attributeNames = Object.keys(location);

      const primitive = this.meshes[meshId].primitives[primitiveId];
      const {attributes, indices} = primitive;
      let count = 0;
      const vbo = {};
      const ibo = {};
      const layout = [];
      //const validAttributes = {};

      for(const name of attributeNames){
        if(attributes[name] === undefined) continue;
        const attr = attributes[name];
        vbo[name] = {data:attr.data};
        layout[location[name]] = {
          buffer:name, size:attr.size, type:attr.type, normalized:attr.normalized,
          isInteger:(!attr.normalized && (attr.type === 5125 || attr.type === 5213 || attr.type === 5121))
        };
        // あんま綺麗ではないが、おそらく全部一緒なので、これでいいっすね。まあ違ってたら大問題だわ。普通に考えて。
        count = attr.count;
        /*
        validAttributes[name] = {
          location:location[name], size:attr.size, type:attr.type, normalized:attr.normalized,
          data:attr.data, count:attr.count,
          isInteger:(!attr.normalized && (attr.type === 5125 || attr.type === 5213 || attr.type === 5121)),
          buffer:Gltf.createBuffer(gl, attr.data)
        };
        */
      }
      if(face !== null && typeof(face) === 'string'){
        if(face === ''){
          // 空文字の場合は'f'扱い
          ibo.f = {data:indices.data};
        }else{
          ibo[face] = {data:indices.data};
        }
      }

      // あとは作るだけ
      const vao = VAOWrapper.create(gl, {count, vbo, ibo, layout});
      return vao;
    }
    /*
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
    */
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
      // VBOWrapperで書き直そう
      // locationにターゲットattrの情報を入れる
      // POSITIONとかNORMALです
      // doubleってやると補間が可能になる
      // loopの時とそうでないときの場合分けはCPUでやる

      const {meshId = 0, primitiveId = 0, location = {}, includeData = false, double = false} = options;
      const primitive = this.meshes[meshId].primitives[primitiveId];
      const {targets} = primitive;
      const weightNum = targets.length;

      // 基本的にPOSITIONとNORMALだが、POSITIONのみの場合もある。他のAttrでも大丈夫かどうかは未検証
      // しかし4とかFloat32とか使ってるんでまあ、位置と法線だけかな...
      const attributeNames = Object.keys(location);
      // attributeが1つなら1つずらすだけでいいでしょう。2とは限らないのでこれをおく。
      // これの分だけスロットをずらせばよい。
      const attributeNum = attributeNames.length;
      const validAttributes = {};

      // POSITIONだけか、又はNORMALも。dataだけ配列で置き換える。バッファはこれを元に作る。
      for(const name of attributeNames){
        if(targets[0][name] === undefined) continue;
        // ターゲットとするアトリビュートの情報を取得しているっぽい
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
        // 以降に登場する「attr」というのはここで構成した「valid attribute」である。
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
        const morphAttributes = {};
        for(const name of attributeNames){
          const attr = validAttributes[name];

          const morphAttr = {};
          const morphData = [];
          const data = attr.data;
          const WEIGHT_NUM = data.length;
          const VERTEX_NUM = data[0].length;
          // フレーム数分のデータを順繰りに登録していく
          // 内容は重み付き計算の済んだ型付配列がフレーム数だけある形
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
          // そしてvalid attributeとしてのattrがmorphAttrに登録される仕組み。
          morphAttr.attr = attr;
          morphAttr.name = attr.name;
          morphAttr.data = morphData;

          // この時点ではバイト長だけ記録しといて、あとでバッファを作る形にする。
          // モーフattrの名前はユーザーサイドで決めて更新などに使う。
          const BYTE_LENGTH = morphData[0].length*4;
          morphAttr.dataByteLength = BYTE_LENGTH;

          morphAttributes[attr.name] = morphAttr;
        }

        // init時にここにモーフ用の登録名を登録して、bindやupdateの際にユーザーがいちいち
        // 名前を指定しなくてもいいようにする
        const morphVBONames = {};

        // バッファの初期化
        // ターゲット名に対してユーザーがモーフアトリビュートの名前を決める
        // doubleの場合は自動的に__shifted__が付与されて使われるのでメインだけ決める形
        // ロケーションは[attributeNum]とびになる
        // 例：{POSITION:'POSITION_MORPH', NORMAL:'NORMAL_MORPH'}
        // 複数のアニメーションで同じ名前を使っても問題ない
        // その場合は切り替えごとにユーザーが初期化する
        // 最初に全てのアニメで異なる名前でVBOを用意して初期化するのであればいちいち呼び出す必要は無い
        // つまり同じVBOで中身だけとっかえひっかえするか、予め全部作っておいて切り替えるか、ユーザーが決めるわけ。
        // もっともcreateBufferに比べればbufferDataはそこまでの負荷ではないけど...まあ違う名前を指定した方が無難っすね。
        const init = (vao, vboNames) => {
          for(const [name, morphAttr] of Object.entries(morphAttributes)){
            // 名前を記録
            const vboName = vboNames[name];
            morphVBONames[name] = vboName;
            // vaoのinitVBO関数で初期化する。doubleの場合は2つ分用意する。名前は自動的に「`${name}__shifted__`」で決まる
            vao.initVBO(vboName, morphAttr.dataByteLength, {usage:'dynamic_draw'});
            if(double){
              vao.initVBO(`${vboName}__shifted__`, morphAttr.dataByteLength, {usage:'dynamic_draw'});
            }
          }
        }

        // バッファのバインド。vaoに別のアニメをセットしたいときにこれを使う。
        const bind = (vao) => {
          vao.bind();
          for(const [name, morphAttr] of Object.entries(morphAttributes)){
            const vboName = morphVBONames[name];
            //gl.vertexAttribPointer(attr.location, attr.size, attr.type, attr.normalized, 0, 0);
            //gl.enableVertexAttribArray(attr.location);
            const attr = morphAttr.attr;

            vao.pointer(attr.location, {
              buffer:vboName, size:attr.size, type:attr.type, normalized:attr.normalized
            });
            vao.enable(attr.location);
            if(double){
              vao.pointer(attr.location + attributeNum, {
                buffer:`${vboName}__shifted__`, size:attr.size, type:attr.type, normalized:attr.normalized
              });
              vao.enable(attr.location + attributeNum);
            }
          }
          vao.unbind();
        }

        // バッファの更新。アニメを動かす。
        const update = (vao, frame) => {
          for(const [name, morphAttr] of Object.entries(morphAttributes)){
            const vboName = morphVBONames[name];
            vao.updateVBO(vboName, morphAttr.data[frame % frames]);
            if(double){
              vao.updateVBO(`${vboName}__shifted__`, morphAttr.data[(frame + 1) % frames]);
            }
          }
        }

        const result = {init, bind, update, frames};
        // includeData:trueとするとanimationごとにdataが入る。
        // 型付配列がフレーム数分入ってる。
        if(includeData){
          result.data = {};
          for(const morphAttr of Object.values(morphAttributes)){
            result.data[morphAttr.name] = morphAttr.data;
          }
        }
        weightAnimations.push(result);
      }
      // なぜanimationsという形にするかというと、拡張の余地を用意しておかないとのちのち困る可能性があるから。
      return {animations:weightAnimations};
    }
    /*
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
    */
    createSkinMeshAnimations(gl, options = {}){
      // さてやろうか
      const animations = this.animations.skinMesh;
      // skinごとにanimationを作り格納する
      // meshedを付与するのは属するそれらをすべて動かすので
      // boneの個数を付与するのはshaderで使うから（UBOの行列の個数）
      // bind/unbindはこっちで作ったUBOをスロットに入れたり出したりする関数
      // レイアウトはユーザーサイドでやる(UBO関係ないので)
      // updateはこっちで作ったUBOにこっちで管理してる行列データを動的更新でぶち込む関数
      // あとはTFFとかはユーザーがやる

      const {skinId = 0, double = false, includeData = false} = options;
      const skin = this.skins[skinId];
      const {bones, root, meshes} = skin;
      const boneNum = bones.length-1;

      const skinMeshAnimations = [];

      for(let i=0; i<animations.length; i++){
        const animation = animations[i];
        if(animation.skin !== skinId) continue;

        // data: nodeごとにフレーム数分の行列が入っている
        // frames: フレーム数
        const {data, frames} = animation;

        // 行列群を作る。フレーム数分だけ作る。
        // JOINTSとフレームで参照し、WEIGHTSを掛けて重み付き平均でskinMatrixを出す。
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

        // なので、次の仕事はそれが格納されているUBOを作ることである。
        // ユーザーはUBOを介して間接的に行列データにアクセスする。
        // なお includeData:true とするとmatrixDataにアクセスできるようになる
        if(!double){
          // UBOはフレームごとに1個だけ使う。ぶつ切り。
          const curUBO = UBOWrapper.create(gl, boneNum*64, {usage:'dynamic_draw', arrayType:'Float32Array'});

          // curUBOを指定したindexに入れたり出したり、あと内容をframeに応じてupdateする関数群
          const bind = (index) => {
            // double間違いチェック
            if(Array.isArray(index)){
              console.error("is double animation?");
              return;
            }
            curUBO.bindBufferBase(index);
          }
          const unbind = (index) => {
            curUBO.unbindBufferBase(index);
          }
          const update = (frame) => {
            curUBO.update(matrixArrays[frame % frames]);
          }

          const result = {frames, bind, unbind, update};
          if(includeData){ result.data = matrixArrays; } // データが必要な場合
          skinMeshAnimations.push(result);
        }else{
          // UBOは次のフレームと補間するために2個使う。ループしない場合、最後のフレームの次が無いので工夫が要る。
          const prevUBO = UBOWrapper.create(gl, boneNum*64, {usage:'dynamic_draw', arrayType:'Float32Array'});
          const nextUBO = UBOWrapper.create(gl, boneNum*64, {usage:'dynamic_draw', arrayType:'Float32Array'});

          // 2つ分やる。updateは(frame+1)%framesとなっているが、ノンループの場合これを最終フレームに対して実行するのはタブー。
          // ユーザーが避けてください。
          const bind = (indices) => {
            // double間違いチェック
            if(typeof(indices) === 'number'){
              console.error("is single animation?");
              return;
            }
            prevUBO.bindBufferBase(indices[0]);
            nextUBO.bindBufferBase(indices[1]);
          }
          const unbind = (indices) => {
            prevUBO.unbindBufferBase(indices[0]);
            nextUBO.unbindBufferBase(indices[1]);
          }
          const update = (frame) => {
            prevUBO.update(matrixArrays[frame % frames]);
            nextUBO.update(matrixArrays[(frame+1) % frames]);
          }

          const result = {frames, bind, unbind, update};
          if(includeData){ result.data = matrixArrays; } // データが必要な場合
          skinMeshAnimations.push(result);
        }

      }
      // animationsだけ分けて、共通のboneNumとmeshesとは別にする。
      // meshesに属するすべてのメッシュを動かす。boneNumはシェーダーで使う。
      return {animations:skinMeshAnimations, boneNum, root, meshes};

      // skinMeshAnimationsの流れ
      // 動かすメッシュにVAOのcount分のskinMatrixAttributeを用意し
      // それをTFFで更新する。UBO関連はユーザーがレイアウトを作り、0や1にハメる。
      // そのindexをこれを使って呼び出すとこっちで動かしてるUBOが反応するのでユーザーが直接UBOに触れる必要は無い
      // doubleの場合も同様
      // TFFで更新されたskinMatrixによりメッシュを動かす流れ
    }
    /*
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
    */
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
    /*
    static createBuffer(gl, data, options = {}){
      // おそらく廃止...
      // VBOもIBOもUBOも作る関数あるし。

      // バッファ作成用関数
      // dataは数でもいいし、型付配列とかでもいい。
      // いずれoptionにすべきだなぁこれ...あとWebGPU版も欲しいかも？
      const {target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW} = options;

      const buf = gl.createBuffer();
      gl.bindBuffer(target, buf);
      gl.bufferData(target, data, usage);
      gl.bindBuffer(target, null);
      return buf;
    }*/
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

  // shader snipets. 順次追加予定。
  const codeSnipets = {
    // rotationMatrix. axisの周りにtだけ回転する。使い方はシェーダー内で右から掛けるだけ。
    'rotationMatrix':`
mat3 rotationMatrix(in vec3 axis, in float t){
return mat3(
  cos(t) + (1.0-cos(t))*axis.x*axis.x, (1.0-cos(t))*axis.x*axis.y - sin(t)*axis.z, (1.0-cos(t))*axis.z*axis.x +sin(t)*axis.y,
  (1.0-cos(t))*axis.x*axis.y + sin(t)*axis.z, cos(t) + (1.0-cos(t))*axis.y*axis.y, (1.0-cos(t))*axis.y*axis.z - sin(t)*axis.x,
  (1.0-cos(t))*axis.z*axis.x - sin(t)*axis.y, (1.0-cos(t))*axis.y*axis.z + sin(t)*axis.x, cos(t) + (1.0-cos(t))*axis.z*axis.z
);
}
`,
    'hsv2rgb':`
vec3 hsv2rgb(in vec3 color){
vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
rgb = rgb * rgb * (3.0 - 2.0 * rgb);
return color.z * mix(vec3(1.0), rgb, color.y);
}
`,
    'overlay':`
vec3 overlay(in vec3 src, in vec3 dst){
vec3 result;
  if(dst.r < 0.5){ result.r = 2.0*src.r*dst.r; }else{ result.r = 2.0*(src.r+dst.r-src.r*dst.r)-1.0; }
  if(dst.g < 0.5){ result.g = 2.0*src.g*dst.g; }else{ result.g = 2.0*(src.g+dst.g-src.g*dst.g)-1.0; }
  if(dst.b < 0.5){ result.b = 2.0*src.b*dst.b; }else{ result.b = 2.0*(src.b+dst.b-src.b*dst.b)-1.0; }
return result;
}
`,
    'softLight':`
vec3 softLight(in vec3 src, in vec3 dst){
vec3 result;
if(src.r < 0.5){ result.r = 2.0*src.r*dst.r + dst.r*dst.r*(1.0-2.0*src.r); }
else{ result.r = 2.0*dst.r*(1.0-src.r) + sqrt(dst.r)*(2.0*src.r-1.0); }
if(src.g < 0.5){ result.g = 2.0*src.g*dst.g + dst.g*dst.g*(1.0-2.0*src.g); }
else{ result.g = 2.0*dst.g*(1.0-src.g) + sqrt(dst.g)*(2.0*src.g-1.0); }
if(src.b < 0.5){ result.b = 2.0*src.b*dst.b + dst.b*dst.b*(1.0-2.0*src.b); }
else{ result.b = 2.0*dst.b*(1.0-src.b) + sqrt(dst.b)*(2.0*src.b-1.0); }
return result;
}
`
  };

  // ここにあったパース関数は一時的に破棄されています。
  // なんか普通に動いてるっぽいのでこのままでよしとします。ええ...

  // ShaderPrototype, RenderSystem.
  // ShaderとProgramで名前を分けよう。
  // declaration: 定数などの宣言、UBOとかも。
  // global: 関数定義など。snipetなど。
  // main: 用意された変数の改変
  // outlet: fsのみ。出力出口
  // post: vsはミラー処理など。fsはポストエフェクト
  // output: vsは知らん。fsは出力の仕方を変える
  class ShaderPrototype{
    constructor(options = {}){
      const {name = 'default'} = options;
      this.vs = "";
      this.fs = "";
      this.name = name;
      this.programCount = 0;

      // descriptor.
      // 個々のShaderPrototypeにおいて上書きされる可能性がある。
      // 具体的にはvsのoutputなど。
      this.initialDescriptors = {
        vs:{
          declaration:"",
          global:"",
          main:"",
          post:"",
          output:""
        },
        fs:{
          declaration:"",
          global:"",
          outlet:"out vec4 fragColor;",
          main:"",
          post:"",
          output:"fragColor = color;"
        }
      }
      this.descriptors = {vs:{}, fs:{}};

      for(const key of Object.keys(this.initialDescriptors.vs)){
        this.descriptors.vs[key] = "";
      }
      for(const key of Object.keys(this.initialDescriptors.fs)){
        this.descriptors.fs[key] = "";
      }
      // ここで初期化する。RenderFreeの場合は上のやつがそのまま使われる。
      // それ以外については状況に応じていろいろ。再設定するのが基本。
      this.initDescriptors();

      // variales.
      this.variables = {
        precisions:{vs:{}, fs:{float:'high'}},
        varyings:{},
        attributes:{},
        uniforms:{vs:{}, fs:{}}
      }
      // constやUBOなどは現時点ではdeclarationに書いてねっていう段階です。
    }
    initDescriptors(target = "", name = ""){
      // 引数無しの場合はすべて初期化
      if(target === ""){
        this.initDescriptors("vs");
        this.initDescriptors("fs");
        return this;
      }
      // targetがvsでもなく、fsでもない場合は、実行されない
      if(target !== "vs" && target !== "fs"){
        console.error("invalid target");
        return this;
      }

      // 引数1個の場合はそれぞれすべて初期化
      if(name === ""){
        for(const key of Object.keys(this.descriptors[target])){
          this.descriptors[target][key] = this.initialDescriptors[target][key];
        }
        return this;
      }
      if(this.descriptors[target][name] === undefined) return this;
      // そうでなければ初期化リストで初期化
      this.descriptors[target][name] = this.initialDescriptors[target][name];
      return this;
    }
    setInitialDescriptors(code = ""){
      // 同じように書いて、デスクリプタの初期状態をいじる。なおwriteModeやdeclaration系はあっても無視される。
      //const result = parseSourceCode(code);
      const result = ShaderPrototype.parse(code);
      // 記述があったもののみ上書きされる仕組み。
      for(const key of Object.keys(result.vs)){
        if(this.initialDescriptors.vs[key] === undefined){ continue; }
        this.initialDescriptors.vs[key] = result.vs[key].content;
      }
      for(const key of Object.keys(result.fs)){
        if(this.initialDescriptors.fs[key] === undefined){ continue; }
        this.initialDescriptors.fs[key] = result.fs[key].content;
      }
      return this;
    }
    write(code = "", options = {}){
      const {showResult = false} = options;
      // 初期化は定義されているもののみに対して行う
      // <>定義のみで中身が空っぽならば初期化だけされる感じ。今後追加バージョンも用意するかも（attribute_aとか_wとか）
      //const result = parseSourceCode(code);
      // 汎用パーサーで書き換えてみる
      const result = ShaderPrototype.parse(code);
      //const result = parseDesignDescription(code, SHADER_DESIGN);
      if(showResult){ console.log(result); }

      // initフラグならば初期化する。あとはwriteModeに従って上書きか追記。
      // たとえば初期化してから追記してもいいしそのまま追記でもいい。
      const modifyText = (currentText, subText, mode) => {
        switch(mode){
          case "write": return subText; // writeならばsubTextで上書き
          case "add": return currentText + subText; // addならば元の文章に追記
          case "none": return currentText; // noneならばそのまま
        }
        // デフォルト
        return subText;
      }

      // descriptors
      for(const key of Object.keys(this.descriptors.vs)){
        const descriptor = result.vs[key];
        if(descriptor !== undefined){
          const flag = descriptor.flag;
          // いずれここは追加記述も出来るようになるかも？
          if(flag.init){ this.initDescriptors('vs', key); }
          this.descriptors.vs[key] = modifyText(this.descriptors.vs[key], descriptor.content, flag.writeMode);
        }
      }
      for(const key of Object.keys(this.descriptors.fs)){
        const descriptor = result.fs[key];
        if(descriptor !== undefined){
          const flag = descriptor.flag;
          // いずれここは追加記述も出来るようになるかも？
          if(flag.init){ this.initDescriptors('fs', key); }
          this.descriptors.fs[key] = modifyText(this.descriptors.fs[key], descriptor.content, flag.writeMode);
        }
      }

      // こっちはinitフラグのみ意味を持つ。なぜなら同じ名前、もしくは型の場合は自動上書きなので。
      const {varying:commonVarying} = result.common;
      const {precision:vsPrecision, attribute:vsAttribute, uniform:vsUniform} = result.vs;
      const {precision:fsPrecision, uniform:fsUniform} = result.fs;

      // varyings
      if(commonVarying !== undefined){
        if(commonVarying.flag.init){ this.variables.varyings = {}; }
        for(const varying of commonVarying.content){
          this.variables.varyings[varying.name] = varying.type;
        }
      }
      // precisions (vs)
      if(vsPrecision !== undefined){
        if(vsPrecision.flag.init){ this.variables.precisions.vs = {}; }
        for(const precision of vsPrecision.content){
          this.variables.precisions.vs[precision.type] = precision.precision;
        }
      }
      // attributes
      if(vsAttribute !== undefined){
        if(vsAttribute.flag.init){ this.variables.attributes = {}; }
        for(const attribute of vsAttribute.content){
          this.variables.attributes[attribute.name] = {location:attribute.location, type:attribute.type};
        }
      }
      // uniforms (vs)
      if(vsUniform !== undefined){
        if(vsUniform.flag.init){ this.variables.uniforms.vs = {}; }
        for(const uniform of vsUniform.content){
          this.variables.uniforms.vs[uniform.name] = uniform.type;
        }
      }
      // precisions (fs)
      if(fsPrecision !== undefined){
        if(fsPrecision.flag.init){ this.variables.precisions.fs = {float:'high'}; }
        for(const precision of fsPrecision.content){
          this.variables.precisions.fs[precision.type] = precision.precision;
        }
      }
      // uniforms (fs)
      if(fsUniform !== undefined){
        if(fsUniform.flag.init){ this.variables.uniforms.fs = {}; }
        for(const uniform of fsUniform.content){
          this.variables.uniforms.fs[uniform.name] = uniform.type;
        }
      }
      return this;
    }
    createPreDeclaration(){
      const result = {
        vs:{precision:``, varying:``, attribute:``, uniform:``},
        fs:{precision:``, varying:``, uniform:``}
      };
      for(const [type, precision] of Object.entries(this.variables.precisions.vs)){
        result.vs.precision += `precision ${precision}p ${type};\n`;
      }
      for(const [type, precision] of Object.entries(this.variables.precisions.fs)){
        result.fs.precision += `precision ${precision}p ${type};\n`;
      }
      for(const [name, type] of Object.entries(this.variables.varyings)){
        result.vs.varying += `out ${type} ${name};\n`;
        result.fs.varying += `in ${type} ${name};\n`;
      }
      for(const [name, value] of Object.entries(this.variables.attributes)){
        result.vs.attribute += `layout (location = ${value.location}) in ${value.type} ${name};\n`;
      }
      for(const [name, type] of Object.entries(this.variables.uniforms.vs)){
        result.vs.uniform += `uniform ${type} ${name};\n`;
      }
      for(const [name, type] of Object.entries(this.variables.uniforms.fs)){
        result.fs.uniform += `uniform ${type} ${name};\n`;
      }
      return result;
    }
    createShader(){
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;

      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

${decl.vs.attribute}
${decl.vs.uniform}
${decl.vs.varying}

${v.global}

void main(){
${v.main.replaceAll(/\n/g, "\n  ")}
${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
}
`;

      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

${decl.fs.uniform}
${decl.fs.varying}

${f.global}

${f.outlet}

void main(){
vec4 color = vec4(1.0);

${f.main.replaceAll(/\n/g, "\n  ")}

${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`;
    }
    createProgram(gl, params = {}){
      const defaultName = `${this.name}_${this.programCount++}`;
      const {
        name = defaultName, layout = {}, outVaryings = [], separate = true, uboLayout = {},
        showVertexShader = false, showFragmentShader = false,
        showUniforms = false, showAttributes = false
      } = params;

      // ここで「#snipet hoge;」を変換する。vsもfsも両方。convertですね。
      // まあmodifyか。snipet以外にもなんかやりたかったら追加しましょう。
      const modifiedVertexShaderSource = ShaderPrototype.modifyShaderSource(this.vs);
      const modifiedFragmentShaderSource = ShaderPrototype.modifyShaderSource(this.fs);

      // modifyしたあとで出力する
      if(showVertexShader){ console.log(modifiedVertexShaderSource); }
      if(showFragmentShader){ console.log(modifiedFragmentShaderSource); }

      const program = ProgramWrapper.create(gl, {
        vs:modifiedVertexShaderSource, fs:modifiedFragmentShaderSource,
        name, layout, outVaryings, separate, uboLayout
      });
      program.createProgram({showUniforms, showAttributes});
      return program;
    }
    static parse(code = ""){
      return parseDesignDescription(code, this.SHADER_DESIGN);
    }
    static modifyShaderSource(source = ""){
      // 他にもあるかもしれないのでその辺
      // 「#snipet ~~~;」を探す
      // 「~~~」をsnipetsで置き換える。おわり。
      let src = source.replaceAll(/#snipet .+;/g, (target) => {
        const splitted = target.split(" "); // 「 」の後ろを取る
        if(splitted.length < 2){ console.error("文字数不足"); return ""; }
        const name = splitted[1].replace(";", ""); // ;を切る
        const snipet = codeSnipets[name];
        if(snipet === undefined){ console.error("snipet未定義"); return ""; }
        return snipet;
      });
      // ここのタイミングでどうでもいい空行を消す
      let blancFlag = true;
      const blancs = src.split(/\r?\n/);
      // 後ろから空行を見て行ってすべて消す
      for(let i=blancs.length-1; i>=0; i--){
        const line = blancs[i];
        if(line.trim().length === 0){ blancs.pop(); }else{ break; }
      }
      // ルール：1. 冒頭の空行はカット。2. 空行が2行以上続くなら1行にする。
      // インデントは当面は考えなくていいです
      let result = "";
      for(let i=0; i<blancs.length; i++){
        const line = blancs[i];
        if(line.trim().length === 0){
          if(blancFlag){ continue; }
          result += line.trim().concat('\n');
          blancFlag = true;
        }else{
          result += line.concat('\n');
          blancFlag = false;
        }
      }
      return result;
      //return modifiedShaderSource;
    }
  }

  // シェーダー解釈の場合のデザイン
  ShaderPrototype.SHADER_DESIGN = {
    layout:{
      common:{
        varying:{
          type:'enum', keys:['type', 'name'], values:['float', 'vHoge']
        }
      },
      vs:{
        precision:{
          type:'enum', keys:['precision', 'type'], values:['high', 'float']
        },
        attribute:{
          type:'enum', keys:['location', 'type', 'name'], values:[0, 'float', 'aHoge']
        },
        uniform:{
          type:'enum', keys:['type', 'name'], values:['float', 'uHoge']
        },
        declaration:{ type:'text' },
        global:{ type:'text' },
        main:{ type:'text' },
        post:{ type:'text' },
        output:{ type:'text' }
      },
      fs:{
        precision:{
          type:'enum', keys:['precision', 'type'], values:['high', 'float']
        },
        uniform:{
          type:'enum', keys:['type', 'name'], values:['float', 'uHoge']
        },
        declaration:{ type:'text' },
        global:{ type:'text' },
        outlet:{ type:'text' },
        main:{ type:'text' },
        post:{ type:'text' },
        output:{ type:'text' }
      }
    },
    flagDefinition:(flag = "") => {
      // たとえばIWの場合は常に初期化する、常に上書きする。これがデフォルト。
      // 「I」の場合は初期化するだけで、記述の変更は実行されない。
      // attributeやuniformの場合はIだけ意味を持つ。元々あるのをどうするかという話。
      // fsのfloatのprecisionはほぼ必須級なのでそこはそれ。最終的に使うかどうかは派生形次第。
      const result = {init:true, writeMode:"write"};
      // default.
      if(flag === ""){ return result; }
      // それ以外。
      result.init = (flag.match(/I/) !== null || flag.match(/i/) !== null);
      const hasW = (flag.match(/W/) !== null || flag.match(/w/) !== null);
      const hasA = (flag.match(/A/) !== null || flag.match(/a/) !== null);
      if(hasW){
        result.writeMode = "write";
      }else if(hasA){
        result.writeMode = "add";
      }else{
        result.writeMode = "none";
      }
      return result;
    }
  };

  // 板ポリ芸。
  // 一番楽なのは順番とか適当で...宣言？
  // 宣言と外部コードとメインコードで全部、でいいっすね。
  // って思ったけど面倒だな。もうglobalとmainだけでいいや！！
  // vs/fsとGlobal/MainProcessは分けなくてもいいんですが、可読性のために分けています。
  // まああのあれ、fsしかいじらない場合もあるだろうし。
  // alignか...
  // center_yUp, center_yDown, leftUp, leftDownくらいかなぁ。
  // (0,0)を中心に置いてyが上か下か、コーナーは±1.
  // それと左上(0,0)もしくは左下(0,0)ですね。そしてデフォルトは 'leftUp' にする、と。
  // textureから取るときとかそうしますし。
  class PlaneShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      const {align = 'leftUp'} = options;
      this.align = align;

      this.initialDescriptors.vs.output = `gl_Position = vec4(original_uv, depth, 1.0);`;
      this.initDescriptors();
    }
    createShader(){
      // 純粋な板ポリ芸を書く。vUvをvaryingとして渡す。以下略。いじってもいい。基本は左上(0,0)で右下(1,1)です。uvですし。
      // 変更点と留意点
      // Precisionを導入。vsは要らんのだけど、fsの方でテクスチャとかで必要になるかも。
      // vsMainProcessでいじれるプリセット変数はvec2のuvとfloatのdepthです。
      // uvはvUvとしてfsに送られます。
      // fsMainProcessでいじれるプリセットはvec4のcolorのみです。
      // いずれもプリセットだけなので、Globalであれこれして導入したものについては自由にあれこれできます。
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;
      this.vs =`
#version 300 es
${decl.vs.precision}

const vec2[4] pos = vec2[](
vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0)
);
out vec2 vUv;

${v.declaration}

${decl.vs.attribute}
${decl.vs.uniform}
${decl.vs.varying}

${v.global}

void main(){
vec2 uv = pos[gl_VertexID];
vec2 original_uv = uv; // 板ポリ用
float depth = 0.0; // depthもいじれるように

${PlaneShader.aligns[this.align].replaceAll(/\n/g, "\n  ")}

${v.main.replaceAll(/\n/g, "\n  ")}

vUv = uv; // uvをいじれるようにする
${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
}
`;
      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

in vec2 vUv;

${decl.fs.uniform}
${decl.fs.varying}

${f.global}

${f.outlet}

void main(){
vec2 uv = vUv;
vec4 color = vec4(1.0);

${f.main.replaceAll(/\n/g, "\n  ")}

${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`;
    }
  }

  PlaneShader.aligns = {
    center_yUp:``,
    center_yDown:
`uv.y = -uv.y;
`,
    leftUp:
`uv.y = -uv.y;
uv = 0.5 + 0.5 * uv;
    `,
    leftDown:
`uv = 0.5 + 0.5 * uv;
`
  };

  class PointShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      // outputのデフォルトをクリアしておこう。
      this.initialDescriptors.vs.output = "";
      this.initDescriptors();
    }
    createShader(){
      // ほぼプレーンに近いですが、点関連の変数を扱いやすくしておきます。
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;

      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

${decl.vs.attribute}
${decl.vs.uniform}
${decl.vs.varying}

${v.global}

void main(){
float pointSize = 1.0; // mainでいじってください
${v.main.replaceAll(/\n/g, "\n  ")}
${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
gl_PointSize = pointSize;
}
`;

      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

${decl.fs.uniform}
${decl.fs.varying}

${f.global}

${f.outlet}

void main(){
vec2 pointCoord = gl_PointCoord; // 好きに使って。
vec4 color = vec4(1.0);

${f.main.replaceAll(/\n/g, "\n  ")}

${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`;
    }
  }

  class TFFShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      // ラスタライザを無効化「しない」場合はfalseにしてください。まあ二重否定わかりづらいっすね
      // あとuseOutVaryingsはフラグメントシェーダでそれを使うかどうかです。これも基本使わないっすね
      const {rasterizerDiscard = true, useOutVaryings = false} = options;
      this.rasterizerDiscard = rasterizerDiscard;
      this.useOutVaryings = useOutVaryings;
      // outputのデフォルトだけでなく全部クリアしよう。fsのoutletとoutputも基本不要なので。使うなら作ってくれ。
      this.initialDescriptors.vs.output = "";
      this.initialDescriptors.fs.outlet = "";
      this.initialDescriptors.fs.output = "";
      this.initDescriptors();
    }
    createShader(){
      // ほぼプレーンに近いですね。しかしpositionやcolorは仕事しない場合もあるんで、まあシンプルです。究極にプレーン。
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;

      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

${decl.vs.attribute}
${decl.vs.uniform}
${decl.vs.varying}

${v.global}

void main(){
${v.main.replaceAll(/\n/g, "\n  ")}
${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
}
`;

      // ラスタライザが死んでるならoutletとoutputは不要っすね
      // outVaryingsもラスタライザが死んでるなら仕事ないっすね
      this.fs =`
#version 300 es
${(this.rasterizerDiscard ? "" : decl.fs.precision)}

${f.declaration}

${decl.fs.uniform}
${(!this.rasterizerDiscard && this.useOutVaryings ? decl.fs.varying : "")}

${f.global}

${(this.rasterizerDiscard ? "" : f.outlet)}

void main(){
${f.main.replaceAll(/\n/g, "\n  ")}

${f.post.replaceAll(/\n/g, "\n  ")}
${(this.rasterizerDiscard ? "" : f.output.replaceAll(/\n/g, "\n  "))}
}
`;
    }
  }

  // 一応共通部分作るか
  // currentShaderの役割：programを作るまで
  // currentProgramの役割：setUniformなどの都合
  class RenderSystem{
    constructor(gl){
      this.gl = gl;
      this.shaders = {};
      this.programs = {}; // こういうことですね。programsを別途用意し、マルチ出力を可能にする。
      this.shaderFactory = (options) => {};
      this.currentShader = null; // やっぱ使うか。addShaderで登録される。getShaderの際にも登録される。createShader,createProgramで参照。
      this.currentProgram = null; // currentProgramだけ残そう。useProgramで起動、clearProgramで破棄。ステートマシンの委譲。
    }
    addShader(options = {}){
      // nameはoptionsに含めよう。shaderにも同じ名前を付けたいので。
      // なお同じ名前の場合、新しいshaderで初期化される。
      const {name = 'default'} = options;
      const shader = this.shaderFactory(options);
      this.shaders[name] = shader;
      // shader作ったらcurrentにset.
      this.currentShader = shader;
      return this;
    }
    setShader(name = 'default'){
      // currentにsetするだけの関数
      if(this.shaders[name] === undefined){ console.log('shader not found'); return this; }
      this.currentShader = this.shaders[name];
      return this;
    }
    getShader(name = ''){
      // 取得するだけの関数。指定が無ければcurrentが返る
      if(name === ''){ return this.currentShader; }
      if(this.shaders[name] === undefined){ console.log('shader not found'); return null; }
      return this.shaders[name];
    }
    getShaderSource(name = '', type = 'both'){
      // source取得。プログラム名とvs/fsを指定。
      // bothがデフォルトで、{vs,fs}の形でオブジェクトが返る
      if(name === ''){ return this.currentProgram.getShaderSource(type); }
      if(this.programs[name] === undefined){ console.log('program not found'); return null; }
      return this.programs[name].getShaderSource(type);
    }
    getProgram(name = ''){
      // 取得するだけの関数。指定が無ければcurrentが返る
      if(name === ''){ return this.currentProgram; }
      if(this.programs[name] === undefined){ console.log('program not found'); return null; }
      return this.programs[name];
    }
    deleteShader(name = 'default'){
      if(this.shaders[name] === undefined){ console.log('shader not found'); return this; }
      // nameのやつを消す。
      delete this.shaders[name];
      return this;
    }
    deleteProgram(name = 'default_0'){
      if(this.programs[name] === undefined){ console.log('program not found'); return this; }
      // nameのやつを消す。
      delete this.programs[name];
      return this;
    }
    createShader(name = ''){
      // 指定が無ければcurrentでshaderを作る。中身を確定させる。
      if(name === ''){
        this.currentShader.createShader();
        return this;
      }
      this.shaders[name].createShader();
      return this;
    }
    createProgram(params = {}){
      // currentに対してprogramを作る。nameはparamsに含める
      const program = this.currentShader.createProgram(this.gl, params);
      this.programs[program.name] = program;
      return this;
    }
    useProgram(name = 'default_0'){
      // 以前はcurrentShaderに付随するprogramを起動させるものだったが、それだとshader:programで1:1になってしまう。
      // それを避けるためにこのような仕組みになった。
      // 1つしかprogramが存在しないならば、名前はdefault_0で確定なので、指定は必要ない。そうでないなら指定する。
      if(this.programs[name] === undefined){ console.log('program not found'); return null; }
      const program = this.programs[name];
      // currentを切り替える
      this.currentProgram = program;
      program.use();
      //this.gl.useProgram(program);
      return this;
    }
    clearProgram(){
      this.gl.useProgram(null);
      this.currentProgram = null;
      return this;
    }
    flush(){
      this.gl.flush();
      return this;
    }
    setUniform(){
      // uniformXの簡易処理を実行する。引数はglとprogram以外のすべてで、uniformXの順番通り。
      //uniformX(this.gl, this.currentProgram, ...arguments);
      this.currentProgram.setUniform(...arguments);
      return this;
    }
  }

  // 何にもしないFree. vsのoutputは自前で用意する。どうにでもできる。
  // たとえば2Dで簡単なattribute描画したい場合などに使う
  class RenderFree extends RenderSystem{
    constructor(gl){
      super(gl);
      this.shaderFactory = (options) => { return new ShaderPrototype(options); }
      this.addShader();
    }
  }

  class Render2D extends RenderSystem{
    constructor(gl){
      super(gl);
      this.shaderFactory = (options) => { return new PlaneShader(options); };
      this.addShader();
    }
    render(options = {}){
      // triangle_stripで板ポリ芸。optionsは未定。
      const gl = this.gl;
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  class RenderPoints extends RenderSystem{
    constructor(gl){
      super(gl);
      this.shaderFactory = (options) => { return new PointShader(options); };
      this.addShader();
    }
    render(options = {}){
      // pointsで点描画。optionはoffsetとcount.
      const {offset = 0, count = 1} = options;
      const gl = this.gl;
      gl.drawArrays(gl.POINTS, offset, count);
    }
  }

  class RenderTFF extends RenderSystem{
    constructor(gl){
      super(gl);
      this.shaderFactory = (options) => { return new TFFShader(options); };
      this.addShader();
    }
    render(options = {}){
      // ラスタライザをこっちでも指定しようか
      // というのも結局デフォルトでtrueなのはこっちも一緒なんでね
      // なおArrays描画しかできないのでoffsetとcountだけでいいっす
      // わざわざプログラムから取得してあれこれするのも面倒だろう。まあプログラムに付与できるのが一番だが...
      // 付与してもいいんだけど無効化する機会がそもそもほぼ皆無なんで、そしてTFFでは基本無効化するんで、特に不便ではないだろ。

      // tffLayoutは最大長さ4の配列で、使わない場合はnullを指定します。てか欠番できたっけ？まあいいか。
      // drawCallは文字列でもいいし、gl定数でもいいです。
      const {
        tffLayout = [],
        rasterizerDiscard = true, drawCall = 'points',
        offset = 0, count = 1} = options;
      const gl = this.gl;
      // glEnum使いましょう。デフォルトはPOINTSで。
      const drawCallEnum = glEnum(drawCall, 'points');

      for(let i=0; i<4; i++){
        if(i >= tffLayout.length){ break; }
        if(tffLayout[i] === null) continue;
        tffLayout[i].bindBufferBaseTFF(i);
      }
      gl.beginTransformFeedback(drawCallEnum);
      if(rasterizerDiscard){ gl.enable(gl.RASTERIZER_DISCARD); }
      gl.drawArrays(drawCallEnum, offset, count);
      if(rasterizerDiscard){ gl.disable(gl.RASTERIZER_DISCARD); }
      gl.endTransformFeedback();
      for(let i=0; i<4; i++){
        if(i >= tffLayout.length){ break; }
        if(tffLayout[i] === null) continue;
        tffLayout[i].unbindBufferBaseTFF(i);
      }
    }
  }

  // NoLightShader
  // noLightなのでライティング機構が無いです。
  // lightingの方でライトオフすることもできるんですが、
  // そもそも使わないのとオンオフするのは別なので
  // 具体的にはあれ、キューブマップとかああいうの。射影テクスチャでもいい。
  // normalはデフォルトでは不使用。
  class NoLightShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      const {useNormal = false} = options;
      this.useNormal = useNormal;

      this.initialDescriptors.vs.output = `gl_Position = normalDeviceCoordinate;`;
      this.initDescriptors();
    }
    createShader(){
      // noLightなのでpositionとnormalだけであとは...あってもいいけどライティングはしない
      // normalがあるかどうかで微妙な違いはあるけど。
      // positionは0番,normalは1番で固定。
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;
      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

layout (location = 0) in vec3 aPosition;
${(this.useNormal ? 'layout (location = 1) in vec3 aNormal;' : '')}
${decl.vs.attribute}

// positionの生データ,model変換後のposition,modelView変換後のposition
out vec3 vLocalPosition; out vec3 vGlobalPosition; out vec3 vViewPosition; out vec4 vNormalDeviceCoordinate;
// normalの生データ,model変換後のnormal,modelView変換後のnormal
${(this.useNormal ? 'out vec3 vLocalNormal; out vec3 vGlobalNormal; out vec3 vViewNormal;' : '')}
${decl.vs.varying}

uniform mat4 uModelMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;
${(this.useNormal ? 'uniform mat3 uNormalMatrix; uniform mat3 uModelNormalMatrix;' : '')}
${decl.vs.uniform}

${v.global}

void main(){
vec3 position = aPosition;
${(this.useNormal ? 'vec3 normal = aNormal;' : '')}

// position,normalを改変するためのプリプロセス
${v.main.replaceAll(/\n/g, "\n  ")}

// local -> model変換 -> global -> view変換 -> view
vLocalPosition = position;
vGlobalPosition = (vec4(position, 1.0) * uModelMatrix).xyz;
vec4 viewModelPosition = vec4(position, 1.0) * uModelViewMatrix;
vViewPosition = viewModelPosition.xyz;
// NDCはいずれ...射影テクスチャか。あれでなんかする...なんかすると思う。
vec4 normalDeviceCoordinate = viewModelPosition * uProjMatrix;
// 送っちゃえ
vNormalDeviceCoordinate = normalDeviceCoordinate;

// これ以外の、たとえば影描画などの場合の特殊なNDCとかはmainで出来るんで、これはこれでいいですね。

// local -> model変換 -> global -> view変換 -> view
${(this.useNormal ? 'vLocalNormal = normal;' : '')}
${(this.useNormal ? 'vGlobalNormal = normalize(normal * uModelNormalMatrix);' : '')}
${(this.useNormal ? 'vViewNormal = normalize(normal * uNormalMatrix);' : '')}

${v.post.replaceAll(/\n/g, "\n  ")}

${v.output.replaceAll(/\n/g, "\n  ")}
}
`;

      // 色は自由に決めてね
      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

in vec3 vLocalPosition; in vec3 vGlobalPosition; in vec3 vViewPosition; in vec4 vNormalDeviceCoordinate;
${(this.useNormal ? 'in vec3 vLocalNormal; in vec3 vGlobalNormal; in vec3 vViewNormal;' : '')}
${decl.fs.varying}

${decl.fs.uniform}

${f.global}

${f.outlet}

void main(){
vec4 color = vec4(1.0);

// materialColorは無く、直接colorをいじる。
${f.main.replaceAll(/\n/g, "\n  ")}

// 本来はここでライティング処理

// そのあとポストプロセス（透明度とか？）
${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`;
    }
  }

  // Position & Normalでライティング（フォン）
  // 彩色はON/OFF可能(uniform経由でシステムから)
  // あー、3種類全部要るんだ。まあ用意してからでいいか。面倒だけど仕方ないね。
  class StandardLightingShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      const {lightCounts = {}} = options;
      const {directional = 4, point = 4, spot = 4} = lightCounts;
      this.directionalLightCount = directional;
      this.pointLightCount = point;
      this.spotLightCount = spot;

      this.initialDescriptors.vs.output = `gl_Position = normalDeviceCoordinate;`;
      this.initDescriptors();
    }
    createShader(){
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;

      // 冒頭の空行はカットされるので、こういう書き方でOKです。バージョン宣言は冒頭に来ないとエラーを吐くので。
      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormal;
${decl.vs.attribute}

// positionの生データ,model変換後のposition,modelView変換後のposition
out vec3 vLocalPosition;
out vec3 vGlobalPosition;
out vec3 vViewPosition;
out vec4 vNormalDeviceCoordinate;

// normalの生データ,model変換後のnormal,modelView変換後のnormal
out vec3 vLocalNormal;
out vec3 vGlobalNormal;
out vec3 vViewNormal;

${decl.vs.varying}

uniform mat4 uModelMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;
uniform mat3 uNormalMatrix; uniform mat3 uModelNormalMatrix;
${decl.vs.uniform}

${v.global}

void main(){
vec3 position = aPosition;
vec3 normal = aNormal;

// position,normalを改変するためのプリプロセス
${v.main.replaceAll(/\n/g, "\n  ")}

// local -> model変換 -> global -> view変換 -> view
vLocalPosition = position;
vGlobalPosition = (vec4(position, 1.0) * uModelMatrix).xyz;
vec4 viewModelPosition = vec4(position, 1.0) * uModelViewMatrix;
vViewPosition = viewModelPosition.xyz;
// NDCはいずれ...射影テクスチャか。あれでなんかする...なんかすると思う。
vec4 normalDeviceCoordinate = viewModelPosition * uProjMatrix;
// 送っちゃえ
vNormalDeviceCoordinate = normalDeviceCoordinate;

// local -> model変換 -> global -> view変換 -> view
vLocalNormal = normal;
vGlobalNormal = normalize(normal * uModelNormalMatrix);
vViewNormal = normalize(normal * uNormalMatrix);

${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
}
`;

      // ライティング関連のuniformを用意します。
      // 3種類。ついでにnoLight,これはデフォルトでfalseですから、問題ないんですが、
      // 仕様上はきちんとfalseを入れます。システムサイドでいじる。
      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

in vec3 vLocalPosition;
in vec3 vGlobalPosition;
in vec3 vViewPosition;
in vec4 vNormalDeviceCoordinate;

in vec3 vLocalNormal;
in vec3 vGlobalNormal;
in vec3 vViewNormal;

${decl.fs.varying}

// ----------------------- StandardLight -----------------------//
#define DIRECTIONAL_LIGHT_COUNT_MAX ${this.directionalLightCount}
#define POINT_LIGHT_COUNT_MAX ${this.pointLightCount}
#define SPOT_LIGHT_COUNT_MAX ${this.spotLightCount}

struct punctualLight{
vec3 diffuse;
vec3 specular;
};

// 方向
struct directionalLight{
vec3 direction;
vec3 diffuseColor;
vec3 specularColor;
float specularPower;
};

// 位置と距離
struct pointLight{
vec3 position;
float distance;
float decay;
vec3 diffuseColor;
vec3 specularColor;
float specularPower;
};

// 位置と方向と距離
struct spotLight{
vec3 direction;
vec3 position;
float distance;
float decay;
float coneCos;
vec3 diffuseColor;
vec3 specularColor;
float specularPower;
};

// punctual light
uniform directionalLight uDirectionalLights[DIRECTIONAL_LIGHT_COUNT_MAX];
uniform pointLight uPointLights[POINT_LIGHT_COUNT_MAX];
uniform spotLight uSpotLights[SPOT_LIGHT_COUNT_MAX];

// light count
uniform int uDirectionalLightCount;
uniform int uPointLightCount;
uniform int uSpotLightCount;

uniform bool uNoLight;
uniform vec3 uAmbientColor;

${decl.fs.uniform}

punctualLight directional(in directionalLight light, in vec3 fromPointToEye, in vec3 viewNormal){
// diffuse.
vec3 l = normalize(light.direction);
float diffuseFactor = max(0.1, dot(l, viewNormal));

// specular.
vec3 reflectedLight = reflect(-l, viewNormal); // 入射光に使う関数なので逆にする
float specularFactor = pow(max(0.0, dot(reflectedLight, fromPointToEye)), light.specularPower);

// 個別に用意
punctualLight c;
c.diffuse = light.diffuseColor * diffuseFactor;
c.specular = light.specularColor * specularFactor;
return c;
}

punctualLight point(in pointLight light, in vec3 fromPointToEye, in vec3 viewPosition, in vec3 viewNormal){
// distance factor.
float d = length(light.position - viewPosition);
// 逆二乗則にしよう。それでdecayは係数にしよう。デフォルトは1で。
float distanceFactor = light.decay * min(1.0, pow(light.distance/(1e-6 + d), 2.0));

//  diffuse.
vec3 l = normalize(light.position - viewPosition);
float diffuseFactor = max(0.1, dot(l, viewNormal));

// specular.
vec3 reflectedLight = reflect(-l, viewNormal); // 入射光に使う関数なので逆にする
float specularFactor = pow(max(0.0, dot(reflectedLight, fromPointToEye)), light.specularPower);

// 個別に用意
punctualLight c;
float factor = distanceFactor;
c.diffuse = factor * light.diffuseColor * diffuseFactor;
c.specular = factor * light.specularColor * specularFactor;
return c;
}

punctualLight spot(in spotLight light, in vec3 fromPointToEye, in vec3 viewPosition, in vec3 viewNormal){
// distance factor.
float d = length(light.position - viewPosition);
// 逆二乗則にしよう。それでdecayは係数にしよう。デフォルトは1で。
float distanceFactor = light.decay * min(1.0, pow(light.distance/(1e-6 + d), 2.0));

// diffuse.
vec3 l = normalize(light.position - viewPosition);
float diffuseFactor = max(0.1, dot(l, viewNormal));

// angle factor
vec3 ld = normalize(light.direction);
float angleFactor = smoothstep(light.coneCos, 1.0, dot(l, ld));

// specular.
vec3 reflectedLight = reflect(-l, viewNormal); // 入射光に使う関数なので逆にする
float specularFactor = pow(max(0.0, dot(reflectedLight, fromPointToEye)), light.specularPower);

// 個別に用意
punctualLight c;
float factor = distanceFactor * angleFactor;
c.diffuse = factor * light.diffuseColor * diffuseFactor;
c.specular = factor * light.specularColor * specularFactor;
return c;
}
// ----------------------- StandardLightここまで -----------------------//

${f.global}

${f.outlet}

void main(){
vec3 viewPosition = vViewPosition;
vec3 fromPointToEye = normalize(-vViewPosition);
vec3 viewNormal = normalize(vViewNormal);

vec4 color = vec4(1.0);

// materialColorの可能性は主に3つ。
// 1. 単色(uniform) 2. 頂点色(varying) 3.テクスチャ彩色(varying & uniform, 様々な可能性)
vec3 materialColor = vec3(1.0);

// viewNormal(bump mapping)やmaterialColor(vertex color)をいじるパート
${f.main.replaceAll(/\n/g, "\n  ")}

vec3 diffuse = vec3(0.0);
vec3 specular = vec3(0.0);
vec3 ambient = uAmbientColor;

if(!uNoLight){
  for(int i=0; i<DIRECTIONAL_LIGHT_COUNT_MAX; i++){
    if(i == uDirectionalLightCount) break;
    punctualLight dl = directional(uDirectionalLights[i], fromPointToEye, viewNormal);
    diffuse += dl.diffuse;
    specular += dl.specular;
  }
  for(int i=0; i<POINT_LIGHT_COUNT_MAX; i++){
    if(i == uPointLightCount) break;
    punctualLight pl = point(uPointLights[i], fromPointToEye, viewPosition, viewNormal);
    diffuse += pl.diffuse;
    specular += pl.specular;
  }
  for(int i=0; i<SPOT_LIGHT_COUNT_MAX; i++){
    if(i == uSpotLightCount) break;
    punctualLight sl = spot(uSpotLights[i], fromPointToEye, viewPosition, viewNormal);
    diffuse += sl.diffuse;
    specular += sl.specular;
  }
  color.rgb = materialColor * diffuse + specular + ambient;
}else{
  // noLightの場合はmaterialColorをそのまま使う
  color.rgb = materialColor + ambient;
}

// そのあとポストプロセス（透明度とか？）
${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`;
    }
  }

  // Position & Normalでライティング（PBR）
  // 彩色はON/OFF可能(uniform経由でシステムから)
  // Standardと仕組みが違うんですが、ここだけ...
  class PBRLightingShader extends ShaderPrototype{
    constructor(options = {}){
      super(options);
      const {lightCounts = {}} = options;
      const {directional = 4, point = 4, spot = 4} = lightCounts;
      this.directionalLightCount = directional;
      this.pointLightCount = point;
      this.spotLightCount = spot;

      this.initialDescriptors.vs.output = `gl_Position = normalDeviceCoordinate;`;
      this.initDescriptors();
    }
    createShader(){
      const decl = this.createPreDeclaration();
      const {vs:v, fs:f} = this.descriptors;

      this.vs =`
#version 300 es
${decl.vs.precision}

${v.declaration}

layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormal;
${decl.vs.attribute}

// positionの生データ,model変換後のposition,modelView変換後のposition
out vec3 vLocalPosition; out vec3 vGlobalPosition; out vec3 vViewPosition; out vec4 vNormalDeviceCoordinate;
// normalの生データ,model変換後のnormal,modelView変換後のnormal
out vec3 vLocalNormal; out vec3 vGlobalNormal; out vec3 vViewNormal;
${decl.vs.varying}

uniform mat4 uModelMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;
uniform mat3 uNormalMatrix; uniform mat3 uModelNormalMatrix;
${decl.vs.uniform}

${v.global}

void main(){
vec3 position = aPosition;
vec3 normal = aNormal;

// position,normalを改変するためのプリプロセス
${v.main.replaceAll(/\n/g, "\n  ")}

// local -> model変換 -> global -> view変換 -> view
vLocalPosition = position;
vGlobalPosition = (vec4(position, 1.0) * uModelMatrix).xyz;
vec4 viewModelPosition = vec4(position, 1.0) * uModelViewMatrix;
vViewPosition = viewModelPosition.xyz;
// NDCはいずれ...射影テクスチャか。あれでなんかする...なんかすると思う。
vec4 normalDeviceCoordinate = viewModelPosition * uProjMatrix;
// 送っちゃえ
vNormalDeviceCoordinate = normalDeviceCoordinate;

// local -> model変換 -> global -> view変換 -> view
vLocalNormal = normal;
vGlobalNormal = normalize(normal * uModelNormalMatrix);
vViewNormal = normalize(normal * uNormalMatrix);

${v.post.replaceAll(/\n/g, "\n  ")}
${v.output.replaceAll(/\n/g, "\n  ")}
}
`;

      this.fs =`
#version 300 es
${decl.fs.precision}

${f.declaration}

in vec3 vLocalPosition; in vec3 vGlobalPosition; in vec3 vViewPosition; in vec4 vNormalDeviceCoordinate;
in vec3 vLocalNormal; in vec3 vGlobalNormal; in vec3 vViewNormal;
${decl.fs.varying}

// ----------------------- PBRLight -----------------------//
// 使うものだけ
#define PI 3.14159265359
#define PI2 6.28318530718
#define EPSILON 1e-6
#define saturate(a) clamp( a, 0.0, 1.0 ) // 計算で使う

#define DIRECTIONAL_LIGHT_COUNT_MAX ${this.directionalLightCount}
#define POINT_LIGHT_COUNT_MAX ${this.pointLightCount}
#define SPOT_LIGHT_COUNT_MAX ${this.spotLightCount}

// 入射光
struct IncidentLight {
vec3 color;
vec3 direction;
bool visible;  // 光が届くときtrue
};

// 反射光（必要な分だけ）
struct ReflectedLight {
vec3 directDiffuse;
vec3 directSpecular;
};

// positionはvViewPositionそのままで
// normalはvViewNormalを正規化する
// viewDirは-positionの正規化
struct GeometricContext {
vec3 position;
vec3 normal;
vec3 viewDir;
};

// specularRoughnessはroughnessそのまま
// diffuseColorとspecularColorをmetalnessから計算する
struct Material {
vec3 diffuseColor;
vec3 specularColor;
float specularRoughness;
};

// ライトの構造体とライティングルーチン

// ライトについては送るときに
// 方向はview行列でview空間に落としておく
// 点光源とスポットライトもモデルビューで位置をビューに落としておくこと

// 平行光
struct directionalLight {
vec3 direction;
vec3 color;
};

// 点光源
struct pointLight {
vec3 position;
vec3 color;
float distance;
float decay;  // 減衰率
};

// スポットライト
// ざっくりいうと
// penumbraCosまでいくとあそこが1になるんですよ
// coneCosぎりぎりで0ですね
// smoothstepってのはそういうこと
// なお送る前にcosに変換していますね...
struct spotLight {
vec3 position;
vec3 direction;
vec3 color;
float distance;
float decay;
float coneCos;
float penumbraCos;
};

// punctual light
uniform directionalLight uDirectionalLights[DIRECTIONAL_LIGHT_COUNT_MAX];
uniform pointLight uPointLights[POINT_LIGHT_COUNT_MAX];
uniform spotLight uSpotLights[SPOT_LIGHT_COUNT_MAX];

// light count
uniform int uDirectionalLightCount;
uniform int uPointLightCount;
uniform int uSpotLightCount;

// albedoはmaterialColor扱いにする形で。あとambientにしよう。
uniform float uMetallic;
uniform float uRoughness;

uniform vec3 uAmbientColor;
uniform bool uNoLight;

${decl.fs.uniform}

// 光が届くときにtrueを返す。pointLightとspotLightで使う
bool testLightInRange(const in float lightDistance, const in float cutoffDistance) {
return any(bvec2(cutoffDistance == 0.0, lightDistance < cutoffDistance));
}

// 減衰を調べるコード
// 当然だが平行光に減衰の概念は適用されない
float punctualLightIntensityToIrradianceFactor(const in float lightDistance, const in float cutoffDistance, const in float decayExponent) {
if (decayExponent > 0.0) {
  return pow(saturate(-lightDistance / cutoffDistance + 1.0), decayExponent);
}

return 1.0;
}

// 平行光の放射照度ファクター
// 平行なので必ず届くし、色と方向があるだけ。
void getDirectionalDirectLightIrradiance(const in directionalLight light, const in GeometricContext geometry, out IncidentLight directLight) {
directLight.color = light.color;

directLight.direction = light.direction;

directLight.visible = true;
}

// 点光源の放射照度ファクター
// 位置により届くかどうかや減衰の度合いが決まる
// より点光源らしいふるまいとなっている
void getPointDirectLightIrradiance(const in pointLight light, const in GeometricContext geometry, out IncidentLight directLight) {
vec3 L = light.position - geometry.position;
directLight.direction = normalize(L);

float lightDistance = length(L);
if (testLightInRange(lightDistance, light.distance)) {
  directLight.color = light.color;
  directLight.color *= punctualLightIntensityToIrradianceFactor(lightDistance, light.distance, light.decay);
  directLight.visible = true;
} else {
  directLight.color = vec3(0.0);
  directLight.visible = false;
}
}

// coneCosで0, penumbraCosで1ですね。間で0～1ですね。つまり充分傘の内側に
// 居れば1だということ。

void getSpotDirectLightIrradiance(const in spotLight light, const in GeometricContext geometry, out IncidentLight directLight) {
vec3 L = light.position - geometry.position;
directLight.direction = normalize(L);

float lightDistance = length(L);
float angleCos = dot(directLight.direction, light.direction);

if (all(bvec2(angleCos > light.coneCos, testLightInRange(lightDistance, light.distance)))) {
  float spotEffect = smoothstep(light.coneCos, light.penumbraCos, angleCos);
  directLight.color = light.color;
  directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor(lightDistance, light.distance, light.decay);
  directLight.visible = true;
} else {
  directLight.color = vec3(0.0);
  directLight.visible = false;
}
}

// BRDF関連のルーチン群

// Normalized Lambert
vec3 DiffuseBRDF(vec3 diffuseColor) {
return diffuseColor / PI;
}

vec3 F_Schlick(vec3 specularColor, vec3 H, vec3 V) {
return (specularColor + (1.0 - specularColor) * pow(1.0 - saturate(dot(V,H)), 5.0));
}

float D_GGX(float a, float dotNH) {
float a2 = a*a;
float dotNH2 = dotNH*dotNH;
float d = dotNH2 * (a2 - 1.0) + 1.0;
return a2 / (PI * d * d);
}

float G_Smith_Schlick_GGX(float a, float dotNV, float dotNL) {
float k = a*a*0.5 + EPSILON;
float gl = dotNL / (dotNL * (1.0 - k) + k);
float gv = dotNV / (dotNV * (1.0 - k) + k);
return gl*gv;
}

// Cook-Torrance
vec3 SpecularBRDF(const in IncidentLight directLight, const in GeometricContext geometry, vec3 specularColor, float roughnessFactor) {

vec3 N = geometry.normal;
vec3 V = geometry.viewDir;
vec3 L = directLight.direction;

float dotNL = saturate(dot(N,L));
float dotNV = saturate(dot(N,V));
vec3 H = normalize(L+V);
float dotNH = saturate(dot(N,H));
float dotVH = saturate(dot(V,H));
float dotLV = saturate(dot(L,V));
float a = roughnessFactor * roughnessFactor;

float D = D_GGX(a, dotNH);
float G = G_Smith_Schlick_GGX(a, dotNV, dotNL);
vec3 F = F_Schlick(specularColor, V, H);
return (F*(G*D))/(4.0*dotNL*dotNV+EPSILON);
}

// RenderEquations(RE)
void RE_Direct(const in IncidentLight directLight, const in GeometricContext geometry, const in Material material, inout ReflectedLight reflectedLight) {

float dotNL = saturate(dot(geometry.normal, directLight.direction));
vec3 irradiance = dotNL * directLight.color;

// punctual light
irradiance *= PI;

reflectedLight.directDiffuse += irradiance * DiffuseBRDF(material.diffuseColor);
reflectedLight.directSpecular += irradiance * SpecularBRDF(directLight, geometry, material.specularColor, material.specularRoughness);
}
// ----------------------- PBRLightここまで -----------------------//

${f.global}

${f.outlet}
void main(){
// この辺はStandardLightと一緒ですが、実は逆で、こっちからあっちに逆輸入したんですよね。
// ややこしいのでこの辺に関してはStandardLightに表記を統一します。albedoは残します。厳密には違う概念なので。
// たとえばbump mappnigでviewNormalをいじる場合、どちらの場合も「viewNormal」をいじります。
vec3 viewPosition = vViewPosition;
vec3 fromPointToEye = normalize(-vViewPosition);
vec3 viewNormal = normalize(vViewNormal);

vec4 color = vec4(1.0);

// albedoの可能性は主に3つ。
// 1. 単色(uniform) 2. 頂点色(varying) 3.テクスチャ彩色(varying & uniform, 様々な可能性)
vec3 albedo = vec3(1.0);

// viewNormal(bump mapping)やalbedo(vertex color)をいじるパート
${f.main.replaceAll(/\n/g, "\n  ")}

// ここでコンテクストを用意する
GeometricContext geometry;
geometry.position = viewPosition; // こういうこと？
geometry.viewDir = fromPointToEye;
geometry.normal = viewNormal;

vec3 diffuse = vec3(0.0);
vec3 specular = vec3(0.0);
vec3 ambient = uAmbientColor;

// metallicが大きいとスペキュラ優先
// 小さいとalbedo優先
Material material;
material.diffuseColor = mix(albedo, vec3(0.0), uMetallic);
material.specularColor = mix(vec3(0.04), albedo, uMetallic);
material.specularRoughness = uRoughness;

// 以下、ライティング
if(!uNoLight){
  // 入射光の構造体だけ作っておいて今からいじる
  IncidentLight directLight;
  // とはいえ間接的に使うだけで、resultは上記のreflectedLightだけども。
  // 要はメソッド内で内容をいじるために存在する媒体
  // 反射光を計算するために入射光が要るということ

  // コンストラクタで初期化
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0));

  // directional light
  for (int i=0; i<DIRECTIONAL_LIGHT_COUNT_MAX; ++i) {
    if (i >= uDirectionalLightCount) break;
    getDirectionalDirectLightIrradiance(uDirectionalLights[i], geometry, directLight);
    RE_Direct(directLight, geometry, material, reflectedLight);
  }

  // point light
  for (int i=0; i<POINT_LIGHT_COUNT_MAX; ++i) {
    if (i >= uPointLightCount) break;
    getPointDirectLightIrradiance(uPointLights[i], geometry, directLight);
    if (directLight.visible) {
      RE_Direct(directLight, geometry, material, reflectedLight);
    }
  }

  // spot light
  for (int i=0; i<SPOT_LIGHT_COUNT_MAX; ++i) {
    if (i >= uSpotLightCount) break;
    getSpotDirectLightIrradiance(uSpotLights[i], geometry, directLight);
    if (directLight.visible) {
      RE_Direct(directLight, geometry, material, reflectedLight);
    }
  }

  color.rgb = reflectedLight.directDiffuse + reflectedLight.directSpecular + ambient;
}else{
  color.rgb = albedo + ambient;
}

// そのあとポストプロセス（透明度とか？）
${f.post.replaceAll(/\n/g, "\n  ")}
${f.output.replaceAll(/\n/g, "\n  ")}
}
`
    }
  }

  // カメラ部分を分離して、組み込む形にする。
  // キャンバスもカメラでしか使わないのでこっちでやる
  // Render3Dのupdateは廃止し、viewMatrixの準備はsetMatricesでやる。そうしないと複数のRender3Dを使い分ける際に不便。
  // こっちでupdateする。autoResetもこっちで一元管理する。
  // さらにactiveを用意してactiveでない場合はautoReset内のリセットイベントが発生しないようにする
  // カメラの切り替え用。

  // canvasは必須ではないがccを楽に用意するなら必須
  // リサイズやリセットはccを外部的に用意すればいかようにもできる
  // easySetting:デフォルトはnoneで、perse, ortho, axis, freeを指定する。
  // /で区切る。
  // autoReset. 20フレームでダブルクリックで戻る。イージングはeaseInOutQuadでいいです。

  // 未指定の場合のcamとccの仕様。
  // ccが不要な場合もあるでしょう。そこでデフォルト（両方未指定）ではcamのみ用意する。
  // cc:'axis'などとある場合のみ用意する。つまり使う場合はccのみ指定するということ。
  // camのみ指定する場合、そのままではccは用意されない。文字列指定かダイレクト指定で用意できる。

  // 分かりやすくまとめる
  // 1. camとccが未指定：
  // easySettingが無ければデフォのperseだけ用意して終わり。あるならそれに従う。
  // 2. camだけ指定：
  // 文字列で指定する場合はperseかorthoなら用意されるがそれ以外の場合はnullとなり、以降は上と同じ。
  // 通常指定の場合、easySettingは機能せず、ccのないシステムとなる。
  // 3. ccだけ指定：
  // 文字列で指定する場合はaxisかfreeならデフォルトのperseカメラにそれがセットされる。
  // cc「だけ」ということはカメラが無いので、ccも用意できず、文字列でしか指定できない。
  // 4. camもccも指定
  // 共に通常の指定方法ならそれが使われるだけ。文字列で指定すると然るべくデフォルトが使われる。
  // たとえばcamだけきちんと用意してccは軸とか適当でいいよ...いつものy上でいいよ...の場合、'free'とか'axis'で済む。
  // z上とかがいい場合はきちんと用意しましょう！！
  // 文字列の指定の仕方によってはnullになるんで、その場合は上記のどれかになる。
  class CameraSystem{
    constructor(params = {}){
      // cvsは必須ではない。ただアスペクト比が考慮されないところだけが問題。
      // それが困る場合はきちんとカメラを整備する。
      const {
        cvs = null,
        cam = null, cc = null, easySetting = 'default',
        autoReset = false
      } = params;
      this.cvs = cvs;

      // camに文字列を許す。ただしデフォルトの場合だけね。
      if(typeof(cam) === 'string'){
        // 変な文字列の場合はnull.
        this.cam = (cam === 'perse' ? new QCameraPerse() : (cam === 'ortho' ? new QCameraOrtho : null));
      }else{
        this.cam = cam;
      }
      // camだけきちんと用意されていてccが文字列の場合でもうまく機能するようにしよう。
      if(this.cam !== null && typeof(cc) === 'string'){
        // 変な文字列の場合はnull.
        if(cc === 'none' || cc === 'axis' || cc === 'free'){
          this.cc = new CameraController(this.cvs, {}, {
            cam:this.cam, topAxis:new Vecta(0,1,0), rotationMode:cc
          });
        }else{
          this.cc = null;
        }
      }else{
        this.cc = cc;
      }
      const easySettingKey = CameraSystem.createEasySettingKey(easySetting);

      if(this.cam === null){
        if(this.cc === null){
          // 両方nullの場合にのみ、easySettingを使う。noneの場合は用意されない。指定しない場合も同様。
          // たとえばperseとだけ書くとperseのカメラだけ用意してccは無し。perse/freeでccがfreeで用意される。
          // eye:[0, 1, 3], center:[0, 0, 0], top:[0, 1, 0],
          // fov:Math.PI/3, aspect:WIW/WIH, near:0.01, far:400
          this.cam = (easySettingKey.cam === 'perse' ? new QCameraPerse() : new QCameraOrtho());
          if(easySettingKey.cc !== 'none'){
            this.cc = new CameraController(this.cvs, {}, {
              cam:this.cam, topAxis:new Vecta(0,1,0), rotationMode:easySettingKey.cc
            });
          }
        }else{
          // cam「だけ」nullの場合はeasySettingKeyは無視されて、ccの文字列で判定される。axis/freeの場合に然るべく。
          // この場合実質的にccは文字列でしか用意できない。なのでそれ以外の場合はnullとなり、機能しない。
          this.cam = new QCameraPerse();
          if(this.cc === 'axis' || this.cc === 'free'){
            const rotationMode = this.cc;
            this.cc = new CameraController(this.cvs, {}, {
              cam:this.cam, topAxis:new Vecta(0,1,0), rotationMode:rotationMode
            });
          }else{
            this.cc = null;
          }
        }
      }

      this.active = true;
      this.autoReset = (this.cc !== null && autoReset);
      if(this.autoReset){
        this.resetter = {duration:20, current:20};
        const IR = new Inspector(this.cvs, {dblclick:true});
        this.cameraReset = ()=>{
          // activeでない場合、cameraResetは機能しないとする。
          if(!this.active) return;
          if(this.resetter.current === this.resetter.duration){
            this.cam.saveState("tmp");
            this.cc.pause();
            this.resetter.current = 0;
          }
        };
        IR.add("dblclick", this.cameraReset);
        IR.add("dbltap", this.cameraReset);
      }
    }
    activate(){
      this.active = true;
      return this;
    }
    inActivate(){
      this.active = false;
      return this;
    }
    getCam(){
      return this.cam;
    }
    getCC(){
      return this.cc;
    }
    update(){
      if(!this.active) return;
      // CameraControllerのupdate
      // ビュー行列の更新はRender3Dに委譲
      // autoResetの場合はダブルクリックでリセットする
      if(this.autoReset){
        if(this.resetter.current < this.resetter.duration){
          this.resetter.current++;
          const prg = this.resetter.current/this.resetter.duration;
          this.cam.lerpState("tmp", "default", prg*prg*(3-2*prg));
          if(this.resetter.current === this.resetter.duration){
            this.cc.start();
            this.cc.reset();
          }
        }
      }
      // ccを使わない場合は何もしない。
      if(this.cc !== null){ this.cc.update(); }
      return;
    }
    static createEasySettingKey(key = 'default'){
      if(key === 'default'){ return {cam:'perse', cc:'none'}; }
      const keys = key.split('/');
      const result = {cam:'perse', cc:'none'};
      for(const eachKey of keys){
        if(eachKey === 'perse' || eachKey === 'ortho'){
          result.cam = eachKey;
        }
        if(eachKey === 'none' || eachKey === 'axis' || eachKey === 'free'){
          result.cc = eachKey;
        }
      }
      return result;
    }
  }

  // カメラとオビコンはCameraSystemという形で別途用意して組み込む
  // そうしないと複数のRender3Dを使い分ける際に不便なので
  class Render3D extends RenderSystem{
    constructor(gl, params = {}){
      super(gl);
      const {
        cameraSystem = null
      } = params;
      this.cameraSystem = (cameraSystem === null ? new CameraSystem() : cameraSystem);
      this.cam = this.cameraSystem.getCam();

      this.modelMatrix = new MT4();
      this.viewMatrix = this.cam.getView();
      this.modelViewMatrix = this.viewMatrix.multM(this.modelMatrix, true);
    }
    model(){
      // 好きに。
      return this.modelMatrix;
    }
    setMatrices(options = {}){
      // reset:trueとすることでセットした後で自動リセット
      const {reset = false} = options;

      const gl = this.gl;
      const pg = this.currentProgram;
      //const pg = this.currentShader.program;
      // viewMatrixはsetMatricesでやろう
      this.viewMatrix.set(this.cam.getView());
      this.modelViewMatrix.set(this.viewMatrix).multM(this.modelMatrix);

      pg.setUniform("uProjMatrix", this.cam.getProj());
      pg.setUniform("uModelMatrix", this.modelMatrix);
      pg.setUniform("uModelViewMatrix", this.modelViewMatrix);
      pg.setUniform("uNormalMatrix", this.modelViewMatrix.getInverseTranspose3x3());
      pg.setUniform("uModelNormalMatrix", this.modelMatrix.getInverseTranspose3x3());

      if(reset){ this.modelMatrix.init(); }

      return this;
    }
  }

  class NoLightRender3D extends Render3D{
    constructor(gl, params = {}){
      super(gl, params);
      this.shaderFactory = (options) => { return new NoLightShader(options); }
      this.addShader();
    }
  }

  // ------------------------light----------------------- //
  class PunctualLight{
    constructor(){
      this.active = true;
      this.viewMode = false; // trueにするとビュー補正をやめる。やめるので、ビュー視点での設定になる。directionとposition両方。
    }
    activate(){
      this.active = true;
    }
    inActivate(){
      this.active = false;
    }
    switchActiveState(){
      this.active = !this.active;
    }
    isActive(){
      return this.active;
    }
    setViewMode(isViewMode = false){
      // true/falseで切り替え
      this.viewMode = isViewMode;
    }
    setParam(params = {}){
      // constructorで自クラスにアクセスできる。もちろんパラメータも抽出できる。
      for(const key of this.constructor.Parameters){
        if(params[key] === undefined) continue;
        this[`set_${key}`] = params[key];
      }
      return this;
    }
    setLight(pg, params = {}){
      const {cam = null, name = 'uLight'} = params;
      const prevDirection = (this.direction instanceof Vecta ? this.direction.copy() : null);
      const prevPosition = (this.position instanceof Vecta ? this.position.copy() : null);

      if(cam !== null && !this.viewMode){
        const view = cam.getView();
        if(prevDirection !== null){ view.multN(this.direction); }
        if(prevPosition !== null){ view.multV(this.position); }
      }
      pg.setUniform(name, this);
      if(prevDirection !== null){ this.direction.set(prevDirection); }
      if(prevPosition !== null){ this.position.set(prevPosition); }
    }
    set set_direction(value){ this.direction = Vecta.create(value); }
    set set_position(value){ this.position = Vecta.create(value); }
    set set_distance(value){ this.distance = value; }
    set set_decay(value){ this.decay = value; }
    set set_coneCos(value){ this.coneCos = value; }
    set set_penumbraCos(value){ this.penumbraCos = value; }
    set set_color(value){ this.color = coulour3(value); }
    set set_diffuseColor(value){ this.diffuseColor = coulour3(value); }
    set set_specularColor(value){ this.specularColor = coulour3(value); }
    set set_specularPower(value){ this.specularPower = value; }
  }

  class StandardDirectionalLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.direction = Vecta.create(0,0,1);
      this.diffuseColor = [0.5,0.5,0.5];
      this.specularColor = [1,1,1];
      this.specularPower = 20;
      this.setParam(params);
    }
  }
  StandardDirectionalLight.Parameters = ['direction', 'diffuseColor', 'specularColor', 'specularPower'];

  class StandardPointLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.position = Vecta.create(0,0,3);
      this.distance = 3;
      this.decay = 1;
      this.diffuseColor = [0.5, 0.5, 0.5];
      this.specularColor = [1,1,1];
      this.specularPower = 20;
      this.setParam(params);
    }
  }
  StandardPointLight.Parameters = ['position', 'distance', 'decay', 'diffuseColor', 'specularColor', 'specularPower'];

  class StandardSpotLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.direction = Vecta.create(0,0,1);
      this.position = Vecta.create(0,0,6);
      this.distance = 6;
      this.decay = 1;
      this.coneCos = 0.95;
      this.diffuseColor = [0.5, 0.5, 0.5];
      this.specularColor = [1,1,1];
      this.specularPower = 20;
      this.setParam(params);
    }
  }
  StandardSpotLight.Parameters = ['direction', 'position', 'distance', 'decay', 'coneCos', 'diffuseColor', 'specularColor', 'specularPower'];

  class PBRDirectionalLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.direction = Vecta.create(0,0,1);
      this.color = [0.5, 0.5, 0.5];
      this.setParam(params);
    }
  }
  PBRDirectionalLight.Parameters = ['direction', 'color'];

  class PBRPointLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.position = Vecta.create(0,0,3);
      this.distance = 20;
      this.decay = 1;
      this.color = [0.5,0.5,0.5];
      this.setParam(params);
    }
  }
  PBRPointLight.Parameters = ['position', 'distance', 'decay', 'color'];

  class PBRSpotLight extends PunctualLight{
    constructor(params = {}){
      super();
      this.direction = Vecta.create(0,0,1);
      this.position = Vecta.create(0,0,3);
      this.distance = 10;
      this.decay = 1;
      this.coneCos = 0.5;
      this.penumbraCos = 1;
      this.color = [0.5, 0.5, 0.5];
      this.setParam(params);
    }
  }
  PBRSpotLight.Parameters = ['direction', 'position', 'distance', 'decay', 'coneCos', 'penumbraCos', 'color']

  // lighting Renderers.

  class LightRender3D extends Render3D{
    constructor(gl, params = {}){
      super(gl, params);
      this.lights = {
        directional: Array(16).fill(null),
        point: Array(16).fill(null),
        spot: Array(16).fill(null)
      };
      this.ambientLight = [0.1, 0.1, 0.1];
      this.useLight = true;
    }
    setAmbient(...args){
      this.ambientLight = coulour3(...args);
      return this;
    }
    setDirectional(l, slotIndex = 0){
      // 同じスロットの場合は上書き
      this.lights.directional[slotIndex] = l;
      return this;
    }
    setPoint(l, slotIndex = 0){
      this.lights.point[slotIndex] = l;
      return this;
    }
    setSpot(l, slotIndex = 0){
      this.lights.spot[slotIndex] = l;
      return this;
    }
    lightOn(){
      this.useLight = true;
      return this;
    }
    lightOff(){
      this.useLight = false;
      return this;
    }
    switchLight(){
      this.useLight = !this.useLight;
      return this;
    }
    setPunctualLights(){
      const {cam} = this;
      const pg = this.currentProgram;

      let directionalLightCount = 0;
      for(let i=0; i<this.lights.directional.length; i++){
        const l = this.lights.directional[i];
        if(l === null) continue;
        if(!l.isActive()) continue;
        l.setLight(pg, {cam, name:`uDirectionalLights[${directionalLightCount}]`});

        directionalLightCount++;
      }
      pg.setUniform("uDirectionalLightCount", directionalLightCount);

      let pointLightCount = 0;
      for(let i=0; i<this.lights.point.length; i++){
        const l = this.lights.point[i];
        if(l === null) continue;
        if(!l.isActive()) continue;
        l.setLight(pg, {cam, name:`uPointLights[${pointLightCount}]`});

        pointLightCount++;
      }
      pg.setUniform("uPointLightCount", pointLightCount);

      let spotLightCount = 0;
      for(let i=0; i<this.lights.spot.length; i++){
        const l = this.lights.spot[i];
        if(l === null) continue;
        if(!l.isActive()) continue;
        l.setLight(pg, {cam, name:`uSpotLights[${spotLightCount}]`});

        spotLightCount++;
      }
      pg.setUniform("uSpotLightCount", spotLightCount);
    }
    setLights(){
      // uniform関連
      return this;
    }
  }

  /*
    違いは3種類のライトごとのプロパティと、
    PBRの場合はalbedoがあるので...なおalbedoがmaterialColorに相当する。
    なのでnoLightの場合はalbedoをそのままambientに足して出力する。
    そうです
    それでいいですね
  */

  // StandardLight
  class StandardLightRender3D extends LightRender3D{
    constructor(gl, params = {}){
      super(gl, params);
      this.shaderFactory = (options) => { return new StandardLightingShader(options); };
      this.addShader();
    }
    easyLight(viewMode = true){
      // viewModeのライトを勝手に作る。白色のdirectional. 面倒な場合のため。
      const l = new StandardDirectionalLight();
      l.setViewMode(viewMode);
      this.setDirectional(l, 0);
      return this;
    }
    setLights(){
      if(this.useLight){ this.setPunctualLights(); }

      const pg = this.currentProgram;

      pg.setUniform("uNoLight", !this.useLight);
      pg.setUniform("uAmbientColor", this.ambientLight);

      return this;
    }
  }

  // PBRLight
  class PBRLightRender3D extends LightRender3D{
    constructor(gl, params = {}){
      super(gl, params);
      this.shaderFactory = (options) => { return new PBRLightingShader(options); };
      this.addShader();
      this.pbrParams = {metallic:0.5, roughness:0.5};
    }
    metallic(v = 0.5){
      this.pbrParams.metallic = v;
      return this;
    }
    roughness(v = 0.5){
      this.pbrParams.roughness = v;
      return this;
    }
    easyLight(viewMode = true){
      // viewModeのライトを勝手に作る。白色のdirectional. 面倒な場合のため。
      const l = new PBRDirectionalLight();
      l.setViewMode(viewMode);
      this.setDirectional(l, 0);
      return this;
    }
    setLights(){
      if(this.useLight){ this.setPunctualLights(); }

      const pg = this.currentProgram;

      pg.setUniform("uNoLight", !this.useLight);
      pg.setUniform("uAmbientColor", this.ambientLight);

      pg.setUniform("uMetallic", this.pbrParams.metallic);
      pg.setUniform("uRoughness", this.pbrParams.roughness);

      return this;
    }
  }

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
  applications.MCS = MCS;
  applications.MCSArray = MCSArray;

  // Text関連
  applications.parseData = parseData;
  applications.parseCmdToText = parseCmdToText;
  applications.getSVGContours = getSVGContours;
  applications.getTextContours = getTextContours;

  // Shader.
  applications.codeSnipets = codeSnipets;
  applications.ShaderPrototype = ShaderPrototype;
  applications.PlaneShader = PlaneShader;
  applications.PointShader = PointShader;
  applications.TFFShader = TFFShader;
  applications.StandardLightingShader = StandardLightingShader;
  applications.PBRLightingShader = PBRLightingShader;

  // Renderer.
  applications.RenderSystem = RenderSystem;
  applications.RenderFree = RenderFree;
  applications.Render2D = Render2D;
  applications.RenderPoints = RenderPoints;
  applications.RenderTFF = RenderTFF;
  applications.NoLightShader = NoLightShader;
  applications.CameraSystem = CameraSystem;
  applications.Render3D = Render3D;
  applications.NoLightRender3D = NoLightRender3D;
  applications.LightRender3D = LightRender3D;
  applications.StandardLightRender3D = StandardLightRender3D;
  applications.PBRLightRender3D = PBRLightRender3D;

  // lights. 略記法も追加(SDL, SPL, SSL, PDL, PPL, PSL)
  applications.StandardDirectionalLight = StandardDirectionalLight;
  applications.StandardPointLight = StandardPointLight;
  applications.StandardSpotLight = StandardSpotLight;
  applications.PBRDirectionalLight = PBRDirectionalLight;
  applications.PBRPointLight = PBRPointLight;
  applications.PBRSpotLight = PBRSpotLight;
  applications.SDL = StandardDirectionalLight;
  applications.SPL = StandardPointLight;
  applications.SSL = StandardSpotLight;
  applications.PDL = PBRDirectionalLight;
  applications.PPL = PBRPointLight;
  applications.PSL = PBRSpotLight;

  // context2D関連

  // 簡易ツール
  applications.EasyCanvasSaver = EasyCanvasSaver;

  return applications;
})();
