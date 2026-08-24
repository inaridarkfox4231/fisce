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
    randomInt(...args){
      // 引数無し：0を返す。
      // 引数1つ：それをMath.floorしてnとし0,1,...,n-1のどれかを返す
      // nが負の時はたとえば-4なら0,-1,-2,-3のどれかを返すことにする
      // 引数2つ：小さい方と大きい方をmin,maxとしmin,min+1,...,max-1のどれかを返す
      // min===maxであればそれを返す
      switch(args.length){
        case 0: return 0;
        case 1:
          const n = Math.floor(args[0]);
          if(n === 0) return 0;
          if(n < 0){ -(Math.floor(-n*this.rdm()) % (-n)); }
          return Math.floor(n * this.rdm()) % n;
        case 2:
          const nMin = Math.min(args[0], args[1]);
          const nMax = Math.max(args[0], args[1]);
          if(nMin === nMax){ return nMin; }
          const nDiff = nMax - nMin;
          const diff = Math.floor(nDiff*this.rdm()) % nDiff;
          return nMin + diff;
      }
    }
    randomP(array = [], n = 1){
      if(array.length === 0){ return null; }
      // n<1の場合はnullを返す。nはfloorを取る。
      // arrayから重複を許してn個取って配列を返す。
      if(n < 1){ return null; }
      const count = Math.floor(n);
      const result = [];
      for(let i=0; i<count; i++){
        result.push(this.random(array));
      }
      return result;
    }
    randomC(array = [], n = 1){
      if(array.length === 0){ return null; }
      // n<1の場合はnullを返す。nはfloorを取る。
      // arrayから「重複を許さず」n個取って配列を返す。
      // nはarray.lengthで頭を抑える。
      if(n < 1){ return null; }
      let count = Math.min(Math.floor(n), array.length);
      const result = [];
      const candidate = array.slice();
      while(count > 0){
        const index = (Math.floor(this.rdm() * candidate.length)) % candidate.length;
        const c = candidate.splice(index, 1)[0];
        result.push(c);
        count--;
      }
      return result;
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
