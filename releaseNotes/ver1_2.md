## ver 1.2

### 1.2.0
まずClockについて  
Clock以外のクラスはすべて廃止。Clockのみとし、機能もシンプルに「離散と連続で数を数えるだけ」とする。  
パラメータはtype, duration, loopのみとする。typeで時間かカウントか分けて、durationで一定時間ごとにリセットして、  
loopはデフォルトはfalseで、計測が終わるとactiveでなくなる。初めに戻る。つまりワンショット。  
コンストラクトはcreateでできる。文字列でmsを付けるとcontinuous,lを付けるとloop.つまり  
Clock.create('60l')とかすると60カウントを繰り返す感じになるわけね。Infinityの場合は-1.  
デフォルトではループでないので今まで通り使う場合はClock.create('-1msl')とする。  
ただ時間決めて何かやる場合、これ以降はシーケンサーに頼ることになるので、おそらくあんま使われない。  
申し訳程度にupdateはdurationの区切り以外はfalse,区切りでtrueを返すようにしました。せいぜいそのくらいで。  
単に時間使って何かするときのために色々用意しました。  
getElapsed: 普通にelapsedを返す。durationを決めると戻り理がループする。時間の場合はいちいち0にリセットする。  
durationを引いてもいいが、誤差が累積するのでやめた。  
getElapsedScaled: スケールで割り算する。たとえばミリ秒で1000指定すると秒になる。秒数で何かするとき用。  
getElapsedDiscrete: スケールで割った整数部分を取る。更にモジュロを取る場合は第二引数を指定する。  
getElapsedSeparate: スケールで割って整数部分と小数部分をfloor,fractの形でオブジェクトに込めて出力する。  
こちらもモジュロを一応用意してある。これですべて。  
switchActiveState,pause,start.強制リセット。  
主な利用法としては今まで通りアニメーションのデータに使うなど。  

Sequencerについて
色々考えた結果delayは廃止。使わないし。  
DiscreteとContinuousの区別を廃止。typeプロパティで分ける。Bulletでそうしているので。  
イベントはSpotEventのみとしBandEventを廃止。GunとBulletの機構の方が自由度が高いので、使う場合は分業すればいい。  
addEventsの中身はオブジェクト前提とする。一応shape:'spot'で分けるが、デフォルト'spot'なので基本的にはactionだけでいい。  
SpotEventにpriority:数値を追加。小さいほど先に実行される。  
シーケンサーでこれを使う場合はusePriorityをtrueにする。必要ない場合の方が多いので。負荷懸念。  
loopのデフォルトは引き続きfalseなので繰り返し実行する場合はloop:trueを指定。  
これについては音楽や動画の再生も基本無限ループはしないという「通例」に基づいてるつもり。  
変更点が多いが、たとえば曲の演奏もSpotしか使ってないし、軽微な変更で普通に動くはず。  

ScoreParserについて
EventSeedのクラスを廃止。オブジェクトのみとする。ただ概念的には残す。  
add系メソッドはaddEventSeedのみとし、第一引数はシンボル。第二引数は関数かオブジェクト。関数の場合はpresetsからレシピを作る。  
レシピはshapeとあとはSpotEventのプロパティからkeyだけ引っこ抜いたもの。つまりactionと、あればpriority.  
そしてshapeは'spot'がデフォなので結局基本的にはactionか、presetsからactionを決めるだけという形になる。  
それでも今後のことを考えて関数のみにするのは避け、オブジェクトに限定する。というか形式が複数あると迷うというのもある。  
自由度が高いのは良い事だけど、形式が決まっているのもそれはそれで大事という判断になった。  
変更点はそこだけ。なおaddLibにおいても戻り値はレシピ限定とする。これも関数を指定する形であるから、  
関数が関数を返す、とかなると話がややこしくなるため、戻り値はオブジェクトに限定することになった。  
ついでに  
parseChordを導入。たとえば従来の"C+^lf"とかは普通に使えて、さらに"Cmajor"とかmajor,minor,dim,aug及びそれらの7を付けると  
「そういう」形のレシピを作ってくれる。これはそのままplayOscillatorに入れられる。  
static parseChord(code, step(ミリ秒), type)で指定。  
```js
const chordDict = {
  "major":[4,7], "minor":[3,7], "dim":[3,6], "aug":[4,8],
  "major7":[4,7,11], "minor7":[3,7,10], "dim7":[3,6,9], "aug7":[4,8,10]
};
```
一応これで。おそらく存在しないものも含まれるが、あんま気にしないことにする。  
majorやminorを指定しなければ今まで通りの使い方もできる。そのままplayOscillatorに入れられるので、今までより使いやすいかもしれない。  
処理の速さについては未検証だけど...  

BulletとGunについて  
Bulletに新しいパラメータ、delayとvanishを導入。これらはlifeと同じく予約プロパティで、自由に使うことはできず、内部処理に利用する。  
delayはこれを設定するとelapsedの開始前の余裕ができ、その間のprogressは-1～0と計算される。  
vanishは逆で、これを設定するとlifeが尽きても延命し、その間のprogressは1～2と計算される。  
なぜこのようにしているかというと「余計なフラグを作るのが面倒」なのと「lifeを分割するのが面倒」だから。  
基本的に両方ゼロなので問題はない。具体的にはフェードインアウトの演出などで使う。もしくはステルス弾幕。  
lifeの前と後に余裕を作ろうとするとlifeを分割して汚い場合分けをしないといけなくなるので。まあするかどうか分かんないけれど。  
Gunは2つメソッドを追加。countはグループごとのBulletの個数をカウント。getBulletsはグループごとにBulletの集合を取得。  

変更は以上です。これで1.2.0で、目立ったバグが無ければ更新はしばらくしないです。  

### 1.2.1
Clock.createでdurationにパース前の値を使ってしまって-1でInfinityにならないバグがあったので修正。  

### 1.2.2
今回は機能追加だけなのでバグの心配は無いです。  
#### RandomSystem関連
randomIntを導入。たとえばrandomInt(8)とすると0～7の整数が返る。FALさんが使ってて便利そうだったので入れる。  
randomPとrandomCは配列が対象のランダム関数。randomPは重複を許して配列から指定個数だけ取得。randomCは重複を許さないで配列から指定個数だけ取得。  
#### TextとContour関連
drawTextを作りました。ctx,txt,x,yで描画する。options={}はxAlignとyAlignのデフォルトがcenter,centerとなっている。  
getPartialTextとdrawPartialTextも一応。segmenterの存在を要求するのであれだけど。  
function getPartialText(segmenter, txt, prg=1)  
function drawPartialText(ctx, segmenter, txt, x, y, prg=1, options = {})  
segmenterの用意：new Intl.Segmenter('ja', {granularity:'grapheme'});  
そんな感じで使うわけだが、まあダイレクト描画用だわね。そこでMTS(MeasurableTexts)というわけ。これを使うと指定したテキストの改行込みでの部分描画ができる。それが徐々に描画されていく様子を記述できるわけ。  
new MTS(なんかテキスト)  
setでも用意できるがそのあとinitしないと更新されない。addで追加する場合も同様。  
使い方もシンプルでdisplay時にctxを渡すだけ。  
display(ctx, x, y, prg = 1, options = {})  
x, y, prgはそれぞれの意味で、optionsでxAlignとyAlignの他にleadingもいじれる。  シンプルイズベスト。  
prgをカットしたdisplayAllも存在する。  
もうひとつの新機能がMCSとMCSArrayですね。  
MCSはいわゆるcontour描画用の機能ですね。プログレスベースで徐々に描画されていく...  
コンストラクタでは配列を入れて初期化...するのもありだし、contoursをそのまま入れることもできる。  
ただ注意点があって、ループの場合始点と終点が一致してないといけない。  
svgも使える優れもの。  
MCSArrayはmcs単位で個別に描画オプションをいじれるのでますます便利。  
いずれマニュアルとかの形でまとめようかと思います。デモ作れるといいね。  

### 1.2.3
MCSにsquareとroundSquareを導入  
さらにroundRectの角の半径の大きさを個別に決められるように仕様変更  
統計周りと反時計回りのそれぞれの場合に指定した順に半径が指定される。少ない場合は途中から一緒。  

Verticeの仕様を変更して、イベントを実行できるようにした。詳細：  
#### createTree  
confirmEvent: 辺が確定した場合のイベントを実行する。cur（現在の頂点）,next（辺の向こうの頂点）,edge（結ぶ辺）を引数に持つ。  
removeEvent: 辺の不採用が決まった場合のイベントを実行する。cur（現在の頂点）,next（辺の向こうの頂点）,edge（消去する辺）を引数に持つ。  
backEvent: 戻る場合のイベントを実行する。cur（現在の頂点）,next（戻った先の頂点）を引数に持つ。  
finishEvent: Tree完成時のイベントを実行する。まあ別に使うことは無いだろうが、curで終了時の頂点。  
#### createHierarchy  
setDepthEvent: depthが確定した時のイベント。cur（該当する頂点）,depth（深度）を引数に持つ。  
forwardEvent: 潜っていくときのイベント。cur（現在の頂点）,next（次の頂点）,edge（たどる辺）.  
backEvent: 浮上するときのイベント。cur（現在の頂点）,next（戻る先の頂点）,edge（たどる辺）.
finishEvent: 終わった時。curで一応頂点。  

注意：removeEventが適切に実行されるためには、createTreeの直前にすべてのedgeのresetを実行してください。以前は不要でした。  
1回こっきりなら不要ですが、繰り返しやる場合は必須です。  

parseCmdToTextのバグを修正。なぜか末尾をカットしていたので。そのせいでメッシュのスケッチの一部がおかしなことになってました。  

MCSのsvgにおいてH（水平）,V（垂直）,T（Qの対蹠点接続）,S（Cの対蹠点接続）,A（arcToに準じる）を導入。  
MCS.create()を導入。ここからrectやcircleにつなげていける。  

#### createVAO  
glと頂点数とattrsとindicesから作ります。内容は任意です。面でも辺でも何でもあり。  
attrsのプロパティ：  
data:配列。location:ロケーション。usage:基本STATIC_DRAW. arrayType:基本Float32Array.  
size,type,normalize,stride,offset:いろいろ。まあ基本いじらないっすね。  
arrayOutput:型付配列が必要な場合。srcでアクセスできるようになる。  
indicesのプロパティ：  
data:配列。基本これだけでいい。あとはusageとarrayOutputだがまあ使わないだろう。  
出力されたvaoオブジェクトにはbufsというプロパティがあり、登録時と同じ名前でバッファにアクセスできる。  
それにより動的更新とかもできる。その辺の機構も作れるといいっすね。どうしましょうね。まあそのうち作るか。  

#### ShaderPrototypeとRenderSystemの系列  
一応4種類作りました。2D,ライトを使わない3D,StandardLightの3D,PBRLightの3D.  
シェーダーの改変機構ですね。precision,declaration,global,mainに分かれてる。あとポストプロセスとか。  
プログラムを複数用意してあれこれできる。  
#### Render2D  
板ポリ芸用。uvが予めvaryingとして用意されている。fsでvec2のuvとvec4のcolorが用意され、mainでいじって色々できる。  
vsでuvをいじって送ったりできる。デフォルトは左上(0,0)のleftUpで、右下は(1,1).  
あと3種類ある。leftDownは左下(0,0)の右上(1,1). center_yUpとcenter_yDownは中心が(0,0)で、それぞれ左下か左上が(-1,-1).   
#### NoLightRender3D  
ライトを使わない3D. 色はcolorを使って好きに決める。normalが必要な場合はuseNormal:trueとする。  
matcapやcubemapはライティングしない場合もあるのでそれ用、後は線描画など。  
#### StandardLightRender3D  
基本ライティング用。directional,point,spotの3種類。通常のライティング。  
#### PBRLightRender3D
PBRライティング用。directional,point,spotの3種類だが微妙にプロパティが異なり、あとmetallicがある。  

Vectaにslerpを導入。円補間。方向が近いなら線形補間。真反対の場合は、2Dなら(0,0,1)で回す。3Dでも何かしら返すようにする。  
