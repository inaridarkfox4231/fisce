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
    slerp(){
      // lerpと引数仕様は同じ。円補間。大きさは乗算補間。
      const res = Vecta.validateForScalar(...arguments);
      if(res.im){
        return this.copy().slerp(res.x, res.y, res.z, res.s, false);
      }
      const ratio = res.s;
      const vMag = this.magSq();
      const w = Vecta.create(res.x, res.y, res.z);
      const wMag = w.magSq();
      // 片方がゼロの場合は線型補間
      if(vMag < Number.EPSILON || wMag < Number.EPSILON){
        this.lerp(w, ratio);
        return this;
      }
      const axis = this.cross(w, true);
      if(axis.magSq() < Number.EPSILON){
        // 2次元ならば(0,0,1)が採用されるようにしよう。
        if(this.z === 0 && w.z === 0){
          axis.set(0,0,1);
        }else{
          axis.set(Vecta.getOrtho(this));
        }
      }
      axis.normalize();
      // 角度は線形補間、大きさは乗算補間
      const angle = this.angleTo(w, axis) * ratio;
      const magnitude = Math.pow(this.mag(), 1-ratio) * Math.pow(w.mag(), ratio);
      this.normalize();
      const v3 = axis.cross(this, true);
      const result = this.mult(Math.cos(angle)).addScalar(v3, Math.sin(angle)).mult(magnitude);
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
      // 列挙または配列。
      const args = [...arguments];
      this.m = new Float32Array(16);
      // DataViewの場合は事故なので先に弾いておく
      if(args.length === 0 || args[0] instanceof DataView){
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
        // これだと型付配列に対応できないのでArrayBuffer.isViewで判定する
        const data = (Array.isArray(args[0]) || ArrayBuffer.isView(args[0]) ? args[0] : args);
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
      // 列挙または配列。
      const args = [...arguments];
      this.m = new Float32Array(9);
      // DataViewの場合は事故なので、ここで弾いておく。
      if(args.length === 0 || args[0] instanceof DataView){
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
        // args[0]が配列の場合はそれを採用する形。残りは0とする。
        // ああ型付配列はArray.isArrayだとだめか？
        // isViewでいいや。DataViewの場合はそもそも作れないからな。
        const data = (Array.isArray(args[0]) || ArrayBuffer.isView(args[0]) ? args[0] : args);
        for(let i=0; i<9; i++){
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
