# Sequencerのマニュアル
　最近追加した機能。Sequencer. DiscreteとContinuousに分かれている。Seqeuncerクラスそのものに使い道は無い。

## コンストラクタ
　引数はパラメータオブジェクトです。後で説明する。
```js
  const params = {};
  const dSeq = new DiscreteSequencer(params);
  const cSeq = new ContinuousSequencer(params);
```
離散の方はフレーム制御、連続の方は時間制御。

## パラメータ
　パラメータについて
- loop: オートループ。デフォルトはfalseでdurationが尽きると終了する
- duration: Discreteなら実行フレーム数、Continuousなら実行時間（ミリ秒指定）
- delay: 実行する前のアイドリング時間。たとえばDiscreteで60とすると60フレーム遅れて実行が開始する。この間隙の時間にイベントを登録することはできない
- step: フレームやミリ秒数を指定する単位。たとえばContinuousで250とすると1にすると250,2にすると500を設定したことになる。後述するBandEventのdurationもこれに従うこととなる
- hidden: 'none'がデフォルト。画面がhiddenになった時の挙動を設定する。たとえばタブ切り替え時など。'reset'にするとリセットしたうえでポーズがかかる。'pause'にすると単にポーズがかかる。音楽系のロジックはこれをきちんと設定しないと音が壊れてしまう（FALさんのコードなど）。あと'custom'もあり後述するhiddenFunctionで自由に挙動を決められる
- hiddenFunction: hiddenが'custom'の場合に何をするか具体的に決めることができる。デフォルトの状態（'none','reset','pause'すべて）ではアクティブでない場合に何もしないことになっているがそれすら省かれており、完全に、自由に挙動を決められる。引数はhiddenひとつだけで、これがtrueの場合にhiddenしたときの挙動、falseの場合に戻った時の挙動を記述する
- bandEventAlways: デフォルトはfalse. アクティブではない（ポーズ中の）ときに、BandEventだけは実行したい場合にこれをtrueにする。ただしプログレスは更新されないので同じプログレスで延々と（描画などを）実行し続けるだけである

## イベントの登録
　イベントを登録して使う。イベントにはSpotEvent（指定されたタイミングで関数を実行するだけ）とBandEvent（指定されたタイミングから一定フレームないしは一定時間の間プログレスに応じて関数を実行するもの）がある。  
　登録にはaddEventsを使う。やり方は基本的に2つあって、イベントを直接入れる方法と、イベントの設計図だけを入れる方法がある。  
　イベントの構築：
```js
  const se = new SpotEvent(key, params = {});
  const be = new BandEvent(key, params = {});
```
　パラメータについて。
- key: 実行タイミング。たとえばDiscreteならフレーム数。0なら0で、120なら120で実行されるが、durationと同じフレームのイベントは実行されない（120なら119まで）ので注意する。同じキーのイベントは確実に同時に実行される
- params: それ以外のパラメータ
  - name: イベント名。これを設定しておくと、名前で消去するイベントを指定できる
  - action: keyのタイミングで実行したい関数。SpotEventの場合は単にそのタイミングで実行するだけ。引数にkeyを1つだけ取れる。BandEventの場合は、第一引数はプログレスで、0～1の小数値である。第二引数にkeyが入っている
  - duration: BandEventを実行するスパン。フレーム数やミリ秒
  - fire: 実行開始時に実行させたい関数
  - finish: 実行終了時に実行させたい関数。なおシステムの都合上、終了フレームがdurationと被る場合実行されないので、もしそのような時にきっかり最後まで実行させたい場合は別の手段を用いることが推奨される。後で述べるBulletやGunがその仕組みを提供できる可能性がある

　addEventsでイベントを導入するのがオーソドックスなやり方。
```js
  const someEvent0 = new SpotEvent(0, {action:()=>{console.log("へい！")}});
  const someEvent1 = new SpotEvent(20, {action:()=>{console.log("おまち！")}});
  const someEvent2 = new SpotEvent(40, {action:()=>{console.log("あがり！")}});
  const someSequencer = new DiscreteSequencer({loop:false, duration:60});
  // 登録は配列でもいいし列挙でもいい
  someSequencer.addEvents(someEvent0, someEvent1, someEvent2);
  someSequencer.reset();
  loopFunction = () => {
    someSequencer.update();
    // ...
  }
```
　reset関数を使うと、登録されたイベントがkeyの順にソートされて、updateのたびにelapsedが更新されて所定のタイミングで登録したイベントが実行される。この例だと0,20,40フレームで適当にコンソールに文字が表示される。loop:falseなので、60フレームが経過したらそこで切れる。以降はupdateを実行しても何にも起きない。再びreset()を実行するとまた最初から実行されるようになる。

```console
へい！
おまち！
あがり！
```
60フレームにこれが実行されて終わり。  
　もう一つの登録方法はイベントの設計図だけを登録するもので、これはSpotEventのクラスなどを使わないので簡明である。ただしイベントの種類をshapeパラメータで明示する必要がある。あとkeyもパラメータに含める。あとは同じ。  
　なお、shapeのデフォルトは'spot'で、バンドイベントの場合は'band'にする。つまりSpotEventの場合はkeyとactionだけでいい。
```js
  const someSequencer = new DiscreteSequencer({loop:false, duration:60});
  someSequencer.addEvents(
    {key:0, action:()=>{ console.log("へい！"); }},
    {key:20, action:()=>{ console.log("あがり！"); }},
    {key:40, action:()=>{ console.log("おまち！"); }},
    {shape:'band', key:40, duration:20, action:(prg)=>{ console.log(prg); }}
  );
  someSequencer.reset();
  loopFunction = () => {
    someSequencer.update();
    // ...
  }
```
こんな感じ
```console
へい！
あがり！
おまち！
0
0.05
0.1
0.15
0.2
0.25
0.3
0.35
0.4
0.45
0.5
0.55
0.6
0.65
0.7
0.75
0.8
0.85
0.9
0.95
```
　Discreteの場合は時間をミリ秒で指定する。基本的な使い方は以上です。

# GunとBulletのマニュアル
　GunとBulletという機能がある。

# ScoreParserのマニュアル
