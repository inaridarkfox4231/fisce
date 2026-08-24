
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
    // イベントを追加しました。
    // --createTreeのイベント挿入--
    // finishEvent: curのみで、最後（＝最初）の頂点
    // confirmEvent: 辺確定時。新しい辺の根元と先っちょがcurとnext,つなぐ辺がedge.
    // removeEvent: 辺消去時。消去する辺の根元がcurで先っちょがnextで消す辺がedge.
    // backEvent: 出戻り時。元の頂点がcurで行き先がnext.edgeは無し。
    // --createHierarchyのイベント挿入--
    // finishEvent: createTreeと同じ
    // setDepthEvent: curでその頂点。depthを記録する。
    // forwardEvent: createTreeの辺確定と同じ感じ
    // backEvent: createTreeのバックと同じ感じ
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
      static createTree(nodeVertice, params = {}){
        // removeEventに改名
        const {finishEvent = ()=>{}, removeEvent = ()=>{}, confirmEvent = ()=>{}, backEvent = ()=>{}} = params;
        let curVertice = nodeVertice;
        curVertice.check();

        const stuck = [];
        while(true){
          const connectedEdge = curVertice.connected.pick();
          if(connectedEdge === null){
            // ここのタイミングでリセット可能
            curVertice.connected.reset();
            if(stuck.length === 0){
              // ここで終了時イベント
              finishEvent({cur:curVertice, next:null, edge:null});
              break;
            }else{
              const backVertice = stuck.pop();
              backEvent({cur:curVertice, next:backVertice, edge:null});
              curVertice = backVertice;
            }
          }else{
            const edgeIsAlreadyChecked = connectedEdge.checked();
            connectedEdge.check();
            const nextVertice = connectedEdge.getOppositeVertice(curVertice);
            if(nextVertice.checked()){
              // 辺消去時イベントは辺が消去されるタイミングでのみ実行する
              if(!edgeIsAlreadyChecked){
                removeEvent({cur:curVertice, next:nextVertice, edge:connectedEdge});
              }
              continue;
            }
            curVertice.branches.push(connectedEdge);
            nextVertice.branches.push(connectedEdge);
            nextVertice.check();
            stuck.push(curVertice);
            // connectedEdgeがnullでないなら辺確定時イベントを実行する
            confirmEvent({cur:curVertice, next:nextVertice, edge:connectedEdge});
            curVertice = nextVertice;
          }
        }
      }
      static createHierarchy(nodeVertice, params = {}){
        const {finishEvent = ()=>{}, setDepthEvent = ()=>{}, backEvent = ()=>{}, forwardEvent = ()=>{}} = params;

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
            setDepthEvent({cur:curVertice, depth:curDepth});
          }
          const branch = curVertice.branches.pick();
          if(branch === null){
            // ここでリセットできる
            curVertice.branches.reset();
            if(stuck.length === 0){
              finishEvent({cur:curVertice, next:null, edge:null});
              break;
            }else{
              const backVertice = stuck.pop();
              backEvent({cur:curVertice, next:backVertice, edge:null});
              curVertice = backVertice;
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
            forwardEvent({cur:curVertice, next:nextVertice, edge:branch});
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

    /*
      union findの基本的な使い方
      queryは整数の列ですね
      nは総数です
      queryは長さ2の整数組の配列です
      その長さ2の両者がつながり、結果的にすべてまとまる仕組みです
      それだけの処理です
      まとまりはuf.uf（ユニオンファインド配列）を見ると分かります
      lvに代表の通し番号が入ってます。グループの通し番号ですね。
      グループの総数はuf.countに入ってますね
      uf.repで代表indexの配列を取得できます
      uf.mem[lv]でlv番のグループのすべてのindexを取得できますね
      以上です
    */
    function unionFind(n, query){
      let parent = [];
      let rank = [];
      for(let i = 0; i < n; i++){
        parent.push(i);
        rank.push(0);
      }
      function Find(a){
        if(parent[a] == a){
          return a;
        }else{
          parent[a] = Find(parent[a]);
          return parent[a];
        }
      }
      function Union(a, b){
        let aRoot = Find(a);
        let bRoot = Find(b);
        if(rank[aRoot] > rank[bRoot]){
          parent[bRoot] = aRoot;
        }else if(rank[bRoot] > rank[aRoot]){
          parent[aRoot] = bRoot;
        }else if(aRoot != bRoot){
          parent[bRoot] = aRoot;
          rank[aRoot] = rank[aRoot] + 1;
        }
      }
      for(let i = 0; i < 2; i++){
        for(let q of query){
          Union(q[0], q[1]);
        }
      }
      let uf = [];
      for(let i = 0; i < n; i++){
        uf.push({id:i, pt:parent[i]});
      }
      uf.sort((x, y) => {
        if(x.pt < y.pt){ return -1; }
        if(x.pt > y.pt){ return 1; }
        return 0;
      });
      uf[0].lv = 0;
      let count = 1;
      for(let i = 1; i < n; i++){
        if(uf[i].pt == uf[i-1].pt){
          uf[i].lv = uf[i-1].lv;
        }else{
          uf[i].lv = uf[i-1].lv + 1;
          count++;
        }
      }
      uf.sort((x, y) => {
        if(x.id < y.id){ return -1; }
        if(x.id > y.id){ return 1; }
        return 0;
      });
      // 代表系の集合もあると便利だと思う。
      const represents = new Array(count);
      const members = new Array(count);
      for(let i=0; i<members.length;i++) members[i] = [];
      for(let x of uf){
        represents[x.lv] = x.pt;
        members[x.lv].push(x.id);
      }
      // uf:ユニオンファインド配列。
      // 各indexにはptとlvへの参照が入ってる
      // countは島の数
      // repはレベルからptへの参照。これあるだけでだいぶ違うと思う。
      // memは各々の島のメンバーの配列。これもあると便利そう。下処理でやるのは
      // 大変だし。つけるかどうかオプションにするかは応相談。
      return {uf:uf, count:count, rep:represents, mem:members};
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
        const result = this.getElapsed()/scale;
        if(isNaN(result)){
          console.error('getElapsedScaled: NaN error.');
          return null;
        }
        return result;
      }
      getElapsedDiscrete(scale = 1000, modulo = 0){
        const n = Math.floor(this.getElapsed()/scale);
        modulo = Math.max(0, Math.floor(modulo));
        if(modulo === 0){
          const result0 = n;
          if(isNaN(result0)){
            console.error('getElapsedDiscrete: NaN error.');
            return null;
          }
          return result0;
        }
        const result = n % modulo;
        if(isNaN(result)){
          console.error('getElapsedDiscrete: NaN error.');
          return null;
        }
        return result;
      }
      getElapsedSeparate(scale = 1000, modulo = 0){
        const x = this.getElapsedScaled(scale);
        const n = Math.floor(x);
        const f = x - n;
        modulo = Math.max(0, Math.floor(modulo));
        if(modulo === 0){
          if(isNaN(n) || isNaN(f)){
            console.error('getElapsedSeparate: NaN error.');
            return null;
          }
          return {floor:n, fract:f};
        }
        if(isNaN(n % modulo) || isNaN(f)){
          console.error('getElapsedSeparate: NaN error');
          return null;
        }
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
      // セミコロンを改行にする。コメントアウトのあとで変換しないとコメント内の;が引っかかる罠（怖い）
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
    async function saveCanvas(cvs, name = 'canvasFile'){
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
    async function saveText(data, name = 'textFile'){
      // 一時的にaタグを作る
      const link = document.createElement("a");
      // encodeする
      link.href = "data:text/plain," + encodeURIComponent(data);
      link.download = `${name}.txt`;
      link.click();
      link.remove();
    }

    // JSONデータの保存
    async function saveJSON(obj, name = 'jsonFile'){
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

    // 関数の概要
    // amountsは0から始まる単調増加列
    // prgが0か1か
    // prgが0ならindex=0のratio=0
    // prgが1ならindexは末尾でratio=0
    // それ以外の場合はa[i]<=prg*total<a[i+1]であるようなiをindexとしてratioの計算をする
    // iは条件を満たすもののうち最大のものとする
    // a[i]とa[i+1]の間のどこに位置するかのratioを返す形
    // 汎用関数
    function mapAmount(amounts, prg){
      // ああこれでいいか。amountsとprg. 末尾にtotalが入ってるんだよね。
      if(prg <= 0){
        return {index:0, ratio:0};
      }
      if(prg >= 1){
        return {index:amounts.length-1, ratio:0};
      }
      const total = amounts[amounts.length-1];
      const s = total*prg;
      let index = 0;
      // 二分法で高速化できる...
      for(let k=amounts.length-1; k>=0; k--){
        if(amounts[k] <= s){ index = k; break; }
      }
      if(index >= amounts.length-1){
        return {index:amounts.length-1, ratio:0};
      }
      const leftAmount = amounts[index];
      const rightAmount = amounts[index+1];
      if(leftAmount < rightAmount){
        return {index:index, ratio:(s - leftAmount)/(rightAmount - leftAmount)};
      }
      return {index:index, ratio:0};
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

    // segmenterの一般的な作り方
    // const segmenter = new Intl.Segmenter('ja', {granularity:'grapheme'});
    // 参考：https://qiita.com/axoloto210/items/a1e81e989f1f2f8e1795
    // 'grapheme'を'word'や'sentence'にすると面白いらしいです。

    // こっちは残そうか。
    function getPartialText(segmenter, txt, prg=1){
      if(prg<=0) return "";
      if(prg>=1) return txt;
      const letters = [...segmenter.segment(txt)].map(s => s.segment);

      let result = "";
      // ここでroundを使うのはいい考えだと思う。
      for(let i=0; i < Math.round(prg*letters.length); i++){ result += letters[i]; }
      return result;
    }

    // まあこうなるわな。
    // ctx, segmenterで始まってるのは...クラス化します？ん～。
    // まあこれも別に排除しなくてもいいか。
    // segmenterはごめんなさいって感じだけどね。だからあんま使わないとは思うよ。
    function drawPartialText(ctx, segmenter, txt, x, y, prg=1, options = {}){
      if(prg <= 0) return;
      if(prg >= 1){ drawText(ctx, txt, x, y, options); return; }

      const partialText = getPartialText(segmenter, txt, prg);

      drawText(ctx, partialText, x, y, options);
    }

    // 改行
    function drawText(ctx, txt, x, y, options = {}){
      if(txt === "") return;

      const {xAlign = "center", yAlign = "center", leading = 1.5, commands = ["fill"]} = options;
      const texts = txt.split('\n');

      // 空行の場合はどうするか？空行が無いなら、空行ではないのは事前にもう確かめてあるんで
      // ...改行記号だけの場合？知らん。やめろ。
      // 空行ではない行のheightの平均で決めればいい。
      // だからalignsとheightsの計算は思考停止mapは使わない方がいいかもね。

      const aligns = [];
      const heights = [];
      for(let i=0; i<texts.length; i++){
        if(texts[i] === ""){
          aligns.push(null); heights.push(null); continue;
        }
        // どうせだからhが0の場合も排除するか
        const bd = getTextBoundingRect(ctx, texts[i], x, y);
        if(bd.h === 0){
          aligns.push(null); heights.push(null); continue;
        }
        // bd.h > 0の場合だけ入れましょう
        aligns.push(getTextAlign(ctx, texts[i], x, y, xAlign, "top"));
        heights.push(bd.h);
      }

      // まあ改行だけとか空行だけとかそういう意味不明なケースは排除しましょう
      if(aligns.every((align) => align === null)) return;

      // meanHeightの方がいいかもしれないんでmeanHeight使うかな。知らんけども。
      let nonNullTextCount = 0;
      let heightSum = 0;
      for(let i=0; i<heights.length; i++){
        if(heights[i] !== null){
          nonNullTextCount++;
          heightSum += heights[i];
        }
      }
      const meanHeight = heightSum/nonNullTextCount;

      let textHeight = 0;
      for(let i=0; i<heights.length; i++){
        const h = (heights[i] !== null ? heights[i] : meanHeight);
        textHeight += h;
        if(i < heights.length-1){
          textHeight += h * (leading - 1);
        }
      }

      let yOffset = 0;
      switch(yAlign){
        case "top":
          yOffset = 0; break;
        case "center":
          yOffset = -textHeight*0.5; break;
        case "bottom":
          yOffset = -textHeight; break;
      }
      // 描画関数ここで。
      const execute = (t, x, y) => {
        for(let m=0; m<commands.length; m++){
          switch(commands[m]){
            case "fill":
              ctx.fillText(t, x, y); break;
            case "stroke":
              ctx.strokeText(t, x, y); break;
          }
        }
      }
      for(let i=0; i<texts.length; i++){
        let leftSpaceOffset = 0;
        let rightSpaceOffset = 0;
        let isSpaceOnly = true;
        for(let k=0; k<texts[i].length; k++){
          const sp = texts[i][k];
          if(sp === " "){ leftSpaceOffset += meanHeight*0.5; }
          else if(sp === "　"){ leftSpaceOffset += meanHeight; }
          else{
            isSpaceOnly = false; break;
          }
        }
        for(let k=texts[i].length-1; k>=0; k--){
          const sp = texts[i][k];
          if(sp === " "){ rightSpaceOffset += meanHeight*0.5; }
          else if(sp === "　"){ rightSpaceOffset += meanHeight; }
          else{
            isSpaceOnly = false; break;
          }
        }
        // この時点でisSpaceOnlyがtrueの場合、空行ということになるが...
        // なおスペースが無くて""であっても空行になる。
        if(isSpaceOnly){
          yOffset += meanHeight * leading;
          continue;
        }
        execute(
          texts[i],
          aligns[i].x + (xAlign !== 'right' ? leftSpaceOffset : 0) - (xAlign !== 'left' ? rightSpaceOffset : 0),
          aligns[i].y + yOffset
    	);
        yOffset += meanHeight * leading;
      }
      // おわり？
    }

    // Measurable Texts
    // アラインメントをオリジナルテキストを元に取得したうえで
    // パーシャルテキストを用意する形ですかね...
    // length？
    // Segmenterに基づいて長さを決めてamount列をってしないとまずいかもしれないですね
    // というのも、
    // Segmenterを使わないとamountの列を作れないんですが
    // 描画時にもこれを使うと二度手間になってしまうんで
    // graphemeに分ける処理をinitの1回だけにしたいがために
    // ...っていうね。だからセンテンスに分けるよりその方がいいですよね。
    // まあテキストを分割する機会がそもそもあんまないけど。
    // じゃあさっさと終わらせよう。
    class MTS{
      constructor(txt = ""){
        this.txt = txt;
        this.heights = [];
        this.graphemesArray = []; // graphemesのArray.
        this.texts = []; // そういえばこれも要るんだった。なぜ？yAlignがおかしくなるから。
        this.lengthAmountArray = []; // 2,3,4,5から...とかそういう。
        this.meanHeight = 0;
        this.segmenter = new Intl.Segmenter('ja', {granularity:'grapheme'});
        this.init();
      }
      add(txt){
        this.txt += `\n${txt}`;
        return this;
      }
      set(txt){
        this.txt = txt;
        return this;
      }
      initHeights(ctx){
        // heights関連だけ描画時にやるか。コンテキストが必要な部分だけ描画時にやろう。
        this.heights = [];
        this.meanHeight = 0;

        // 各成分を見て空っぽならnullを入れる...
        for(let i=0; i<this.texts.length; i++){
          if(this.texts[i] === ""){
            this.heights.push(null); continue;
          }
          // どうせだからhが0の場合も排除するか
          // ここには と　だけの場合も含まれる（space only）
          const bd = getTextBoundingRect(ctx, this.texts[i], 0, 0);
          if(bd.h === 0){
            this.heights.push(null);
            // この場合は空行にしてしまおう
            this.texts[i] = "";
            continue;
          }
          // bd.h > 0の場合
          this.heights.push(bd.h);
        }

        // nullしかない場合はここで切る
        if(this.heights.every((h) => h === null)){
          this.heights = [];
          this.txt = "";
          return;
        }

        // meanHeightの方がいいかもしれないんでmeanHeight使うかな。知らんけども。
        // nullのみの場合は弾いてあるのでnonNullTextCount>=1は保証されている
        let nonNullTextCount = 0;
        let heightSum = 0;
        for(let i=0; i<this.heights.length; i++){
          if(this.heights[i] !== null){
            nonNullTextCount++;
            heightSum += this.heights[i];
          }
        }

        this.meanHeight = heightSum/nonNullTextCount;
      }
      init(options = {}){
        // this.txtは既に用意されているとする

        this.graphemesArray = [];
        this.texts = [];
        this.lengthAmountArray = [0];

        // 空文字の場合は何もしない
        if(this.txt === "") return this;
        // まず改行で区切る
        this.texts = this.txt.split('\n');

        // height関連は描画時にやる。

        // あとはamountを計算してprogressの際に使えるようにする...
        // そのためにまずgraphemeに分ける
        for(let i=0; i<this.texts.length; i++){
          const row = this.texts[i];
          this.graphemesArray[i] = [...this.segmenter.segment(row)].map(s => s.segment);
        }
        // grapheme単位での文字の個数に基づいたamountsを作る形
        for(let i=0; i<this.texts.length; i++){
          this.lengthAmountArray[i+1] = this.lengthAmountArray[i] + this.graphemesArray[i].length;
        }
        // これで一通り作業は終了
        return this;
      }
      execute(ctx, txt, x, y, commands = ["fill"]){
        for(let m=0; m<commands.length; m++){
          switch(commands[m]){
            case "fill":
              ctx.fillText(txt, x, y); break;
            case "stroke":
              ctx.strokeText(txt, x, y); break;
          }
        }
      }
      display(ctx, x, y, prg = 1, options = {}){
        // height関連の処理
        this.initHeights(ctx);

        if(this.txt === "") return;

        const {
          xAlign = 'center', yAlign = 'center', leading = 1.5, commands = ["fill"],
          fillStyle = "", strokeStyle = ""
        } = options;


        // prgを元に描画範囲を決める
        const m = mapAmount(this.lengthAmountArray, prg);

        // 描画するテキストを決める
        const targetRows = [];
        for(let i=0; i<m.index; i++){
          const graphemes = this.graphemesArray[i];
          let s = "";
          for(let k=0; k<graphemes.length; k++){ s += graphemes[k]; }
          targetRows.push(s);
        }

        // m.index < this.lengthAmountArray.length-1 である場合、残りを入れる...
        if(m.index < this.lengthAmountArray.length - 1){
          let s = "";
          const finalGraphemes = this.graphemesArray[m.index];
          for(let k=0; k<Math.round(m.ratio * finalGraphemes.length); k++){
            s += finalGraphemes[k];
          }
          targetRows.push(s);
        }

        // targetRowsの長さに応じてtotalHeightを決める。
        let totalHeight = 0;
        for(let i=0; i<targetRows.length; i++){
          const h = (this.heights[i] !== null ? this.heights[i] : this.meanHeight);
          totalHeight += h;
          if(i < targetRows.length-1){
            totalHeight += h * (leading - 1);
          }
        }

        // totalHeightとyAlignからyOffsetが決まる
        let yOffset = 0;
        switch(yAlign){
          case 'top':
            yOffset = 0; break;
          case 'center':
            yOffset = -totalHeight*0.5; break;
          case 'bottom':
            yOffset = -totalHeight; break;
        }
        // targetRowsを元にalignsを用意する
        // しかしyAlignはホールテキストを使う必要がある
        // そうしないといわゆる「がたつき」が起きてしまうので
        const aligns = [];
        for(let i=0; i<targetRows.length; i++){
          // このように、2種類のアラインメントを組み合わせる。
          const partialAlign = getTextAlign(ctx, targetRows[i], x, y, xAlign, 'top');
          const totalAlign = getTextAlign(ctx, this.texts[i], x, y, xAlign, 'top');
          aligns.push({x:partialAlign.x, y:totalAlign.y});
        }

        // 色とかconfigはここでやるか。全体適用だからな。
        if(fillStyle !== ""){
          ctx.fillStyle = fillStyle;
        }
        if(strokeStyle !== ""){
          ctx.strokeStyle = strokeStyle;
        }
        // configは関数。位置とか臨時で変えたい場合用。
        if(typeof options.config === 'function'){
          options.config(ctx);
        }
        // サンドイッチは必要ないでしょう。煩雑になる。
        // 結局それは、スケッチの方向性としてステートマシンで行くのかステートレスで行くのかっていうことになる。
        // 2DはWebGLと一緒でステートマシンなので、ステートレスは疑似的にしか実現できない。それでもその方が都合がいい場合は、こうするというわけ。
        // なおWebGPUはステートレスですが、p5のWebGPUはWebGLに寄せた「似非WebGPU」なので実質ステートマシンとなっています。
        // なんだかな...

        for(let i=0; i<targetRows.length; i++){
          const row = targetRows[i];
          let leftSpaceOffset = 0;
          let rightSpaceOffset = 0;
          let isSpaceOnly = true;
          for(let k=0; k<row.length; k++){
            const sp = row[k];
            if(sp === " "){ leftSpaceOffset += this.meanHeight*0.5; }
            else if(sp === "　"){ leftSpaceOffset += this.meanHeight; }
            else{
              isSpaceOnly = false; break;
            }
          }
          for(let k=row.length-1; k>=0; k--){
            const sp = row[k];
            if(sp === " "){ rightSpaceOffset += this.meanHeight*0.5; }
            else if(sp === "　"){ rightSpaceOffset += this.meanHeight; }
            else{
              isSpaceOnly = false; break;
            }
          }

          // この時点でisSpaceOnlyがtrueの場合、空行ということになるが...
          // なおスペースが無くて""であっても空行になる。
          if(isSpaceOnly){
            yOffset += this.meanHeight * leading;
            continue;
          }
          this.execute(
            ctx, row,
            aligns[i].x + (xAlign !== 'right' ? leftSpaceOffset : 0) - (xAlign !== 'left' ? rightSpaceOffset : 0),
            aligns[i].y + yOffset,
            commands
    	  );
          // meanHeightかheights[i]かで悩むんだけどどうしようね。
          // meanHeightの定義を考えるなら全体の長さは変わらないですから、これでいきましょう。
          yOffset += this.meanHeight * leading;
        }
      }
      displayAll(ctx, x, y, options = {}){
        // context忘れてた
        this.display(ctx, x, y, 1, options = {});
      }
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

    // Tree関連の補助関数
    utils.morton16 = morton16; // 16bit符号なし整数の対を単整数と紐付ける。
    utils.morton16Symmetry = morton16Symmetry;
    utils.unionFind = unionFind; // unionFindです

    // Clock関連. Clock以外は廃止
    utils.Clock = Clock;

    // Sequencer関連. Sequencerはtypeで分けるように変更.
    // さらにSpotEventSeed以外を廃止
    utils.Sequencer = Sequencer;
    utils.SpotEvent = SpotEvent;
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

    // 分類できない補助関数
    utils.mapAmount = mapAmount;

    // text関連のユーティリティ
    utils.getTextBoundingRect = getTextBoundingRect;
    utils.getTextAlign = getTextAlign;
    utils.getPartialText = getPartialText;
    utils.drawPartialText = drawPartialText;
    utils.drawText = drawText;
    utils.MTS = MTS; // Measurable Texts.

    return utils;
  })();
