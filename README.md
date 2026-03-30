# fisce
自作ライブラリのテスト

jsdelivr:

```
https://cdn.jsdelivr.net/npm/fisce.js@1.2.0/src/index.min.js
```

```html
<script src="https://cdn.jsdelivr.net/npm/fisce.js@1.2.0/src/index.min.js"></script>
```

memo  
fisceのフォルダに移動  
npm login  
npm version patch/minor/major -m "コメント"  
npm publish  
npm logout  

## ver 1.0

### 1.0.0  
saveCanvasなどの一連のセーブ関数を導入  
### 1.0.0  
createCanvasやSketchLooperを試験的に導入  
### 1.0.0  
導入したSketchLooperを大幅に仕様変更。ごめんなさい。  
### 1.0.0  
isLoopingのデフォルトをfalseにし、executeとpauseの重ね掛けを回避  

mainFunction内部で再requestするときにisLoopingか否かを確かめていないせいで  
loopFunction内部で実行されるpauseが無意味になっていたバグを修正  

エラー処理を導入。まずは型チェック。createCanvasでdprにundefinedを入れてしまうバグを  
捕捉できなかったので。少なくとも一回しか実行しない関数についてはいくらチェックしてもし足りないと思う。  

一旦すべての番号を1.0.0に戻しました。  

### 1.0.1  
foxConstantsを導入。DPR,WIW,WIH,PI,TAU,HALF_PIを導入。   
foxMathToolsを導入。とりあえずfractとclamp. clampはcssに倣ってmin,val,maxの形であるが、  
もし逆であっても（min>maxであっても）ひっくり返して然るべき値が出せるようにする。  

Noise3D,Noise4Dを導入。p5の模倣だが、それなりに実用性はあると思う。  
RandomSystemの導入。seedも設定できる。二つの数に対して間の値を取るなどのことができる。  

### 1.0.2  
E_Typeのプロパティ名をvariable_nameとvariable_valueに変更（nameだとかぶるため）。  
showメソッドを用意してエラー出力をオブジェクトにやらせるようにする  
さらにSketchLooperでエラーを出した場合にループを止めるように仕様変更（取り消し可能）  
デフォルトはfalseとする。falseの場合エラーが出ても何にも起きない。コンソール出力がキャンセルされる。  

### 1.0.3
エラーを出さないのはまずいので、safe:falseでもエラーは出るようにする。その代わり回数制限を設けて120回でループを止めさせる。  
止めたらカウントをリセットする。無限エラーは負荷がかかるので。  
目的はコンソールをエラーまみれにすることではないので。  

saveCanvasにおいてnullが返る場合に原因が不明瞭である不具合を修正  
png,jpg,jpegは対応しているがPNG,JPG,JPEGは対応していない、などの不具合を修正  

### 1.0.4
saveCanvasのswitch-case分岐を項目別ではなく列挙で書いてしまう凡ミスがあったので修正  

### 1.0.5
createOffscreenを導入。WebWorkerは未定。  
CameraControllerとTRS3ControllerにおいてwheelAction(e)にe.preventDefaultを付与  
これにより画面が一緒に動くのを防ぐ  

## ver 1.1

### 1.1.0
libtessを取り扱うためのfoxTessを導入。基本的にはtriangulateだけ使えば問題ない。  
libtessは別途scriptとして用意する必要がある。  

### 1.1.1
なぜかlibtess用の関数が重すぎるので、中止。  
しばらくは外部メソッドとしての運用をしましょう。  

### 1.1.2
libtess重くなってなかったです。疲れてるので。凡ミス。すみませんでした。  

### 1.1.3
libtessのcallbackを初期化時ではなく任意のタイミングで変更できるように仕様変更  
SketchLooperのloopFunctionでthisを渡す。  
intervalをSketchLooperに導入して実行間隔を変えられるように変更。たとえば100なら1秒10回くらい  
OffscreenCanvasの保存のためにsaveCanvasを非同期化。ついでにsaveTextとsaveJSONも非同期化。  

### 1.1.4
Vecta.validateの引数2個の場合の挙動が色々とまずいので、0を補うように仕様変更。  
divが気になるがあれは基本引数1個でしか使わないから問題ないだろう。  
EasyCanvasSaverを導入。cvsで初期化したら任意のタイミングで名前指定して発火させるだけ。  
foxTessのtriangulateにmergeを導入。出力においては点がマージされている。メッシュ生成に使う。  

### 1.1.5
evenlySpacingに点の個数に基づいたpartitionを導入。autoは変えない。even/oddはパリティになるように調整する。  
smoothingとsmoothingAllを追加。内容はevenly->quad->evenlyというもの。autoなら点の数が使われる。  

### 1.1.6
EasyCanvasSaverを改変。fire関数で発火させられるようにする。またdblclickでsaveされるのを使わない選択肢を  
用意することで柔軟性を増す（デフォルトはdblclickで発火）。  
clampを配列にも適用できるように仕様変更。色の為に。  
foxColorを導入。coulourとcoulour3はそれぞれ長さ4,3の色配列を返す。WebGLの色指定用。  
tessyにsizeを導入。長さ3以上でも使えるようにした。利用するにはtriangulate時にsize指定（デフォルト2）、  
加えてtessCallbacks.combineをいじる必要がある。補助関数tessLerpを用意。data用意時にsize長さずつ用意する。  
mergeに関しては残りの部分を配列の形ですべてzに放り込む。なのでsize=3であっても[0]でアクセスする必要がある。  

### 1.1.7
createShaderProgramのエラー処理を強化。失敗したら文字列が返るようにする。  
これでスマホでもデバッグ出来るかもしれない。  
uniformXでuniformMatrix[234]fvの処理にあたり配列のFloat32化をとりやめ。そのまま使えばいい。  
Vecta.rotateを2次元対応させた。数が1つなら0,0,1周りの回転となる。  
addやsubに関連するVecta.validateのimmutable指定も2次元対応。これで数が2つの場合もtrueを使える。  
getWebGLError. ドローコールの後で実行してエラーをキャッチする。コンソールに出ないエラーを取得できる。  
たとえばattributeの範囲外指定エラーをスマホとかで取得するのに使えそう。Firefox系でも起きるけどね。  
infoとcodeに分かれておりinfoに文字列が入ってる。  

### 1.1.8
QuarternionのgetFromAAとMT4のgetRotationMatrixで引数のベクトルが勝手にnormalizeされちゃうのを回避する  
Interactionでoncontextmenuのpreventの対象をdocumentからcanvasに変更（混在スケッチに対応するため）  
getTextAlignとgetTextBoundingRect. measureTextのラッパ。結局これが使いづらいので。  
なお改行は非対応。絵文字にも対応できるのが強い。  
CameraControllerにおいて平行移動がアスペクト比を考慮していなかったので修正  
具体的には短い方が1となるようにする。これにより長い方に動かしてもすっとんでいかなくなる。  

### 1.1.9
MT4のメソッドにクォータニオンもしくは成分列挙で行列を取得する関数を追加  
インスタンス：localRotationQ, globalRotationQ, setRotationQ  
静的：getRotationMatrixQ, getRotationQ  
ただし単位クォータニオン限定とする。要するにgltfのための関数。あっちもw,x,y,zの並び。  
assert(Vecta,Quarternion,MT4)の第4引数にdirectConsole(=false)を追加  
trueの場合そのままconsole出力される  
createGltfとGltfクラスの実装（準備中）
TimeArrowのgetElapsedDiscreteでmoduloが1の場合に割り算しない処理になっていたが困るので、  
デフォルトを0とし、0の場合に割り算しないことにした。  
フレーム数が1の場合のアニメーション（いわゆるポーズ）の場合にバグるのを防ぐため。   
Counterの方もそうしましょう。そうしましょ。  
createGltf, Gltf, BoneTreeを実装。  
今現在出来ること：通常描画、頂点色描画、テクスチャ描画、シェイプキー（ウェイト）アニメーション、  
スキンメッシュアニメーション。複数のメッシュの描画も可能。できないことはトランスフォームアニメーション、マテリアルなど。  
まあとりあえずこれで充分でしょう。  

### 1.1.10
createBufをcreateBufferに改名。createWeightAnimationsをvaoを引数にbind関数を用いてattributeで表現するように変更。  
createWeightAnimationsとcreateSkinMeshAnimationsのoptionにincludeDataを加えてtrueの場合に頂点とか行列データを出せるように  
そんでテクスチャに入れたりできると嬉しい。  
createTransformAnimationsを追加。これでアニメーションは一通り再生できるようになった。  
encodeMeshesとencodeMaterialsを追加。それに基づいてcreateVAOとcreateWeightAnimationsを書き直し。  
以降はlocation必須となる。locationが用意されたattrのみが使われる。つまり何でもあり。セマンティクス指定必須。  
MT4にaddScalarを追加、さらにinitの引数にスカラーを設定するとそのスカラーの行列になる（ゼロ行列で初期化できる）。  
デフォルトは1です！！なので引数が無い場合は単位行列になります。  
ついでにコンストラクタに配列を許す（足りない部分は0埋め）。加えてスカラー倍（mult）を追加。  
createTransformAnimationsにupdateの他にupdateFloatを追加。小数でやると補間される。  
アニメーションで内部的に「% frames」とすることで整数をそのまま渡せるように仕様変更。  
createWeightAnimationsにdoubleのoptionを導入して補間ができるように仕様変更  
VectaとQuarternionも配列引数で生成できるように仕様変更  

### 1.1.11
createGlbを導入。glbのオールインワンを解釈できるようになった。  
CrossReferenceArrayを導入。addでまとめて列挙や配列で登録できる。loopやloopReverseで走査も容易。removeで排除。  
要素サイドでもremoveを命令できるのが強い。  
Sequencer. DiscreteSequencerはフレームベース制御、ContinuousSequencerは時間制御のシーケンサー  
SpotEventをkeyでぶち込むと並び替えられて順番に実行される  
foxAudio  
Audio関連。一応今のところはWebAudioAPIで遊べる必要最低限の機能だけ用意しました  
p5.Soundっぽくとかそういうことではなくて自分が使いたい機能をミニマムで揃えました  
今できるのはNoise,Oscillator,AudioBuffer再生,エフェクトはDopplerとConvolverだけ。そんなところ。  

### 1.1.12
簡単なvibratoを実装。registVibratoで登録してfrequencyFunctionに設定する。  
frequencyFunctionで配列を可能にした。複数適用できる。  
cubaseがA3=440らしいのでA3=440Hzにした。以前はA5=440Hzだったので2つ上がる形。2つ下げてください。  
ナチュラルを追加。An,Bn,...,GnはA,B,...,Gと同じ高さだが、調号の影響を回避するために用意する。  
調号は無印に対してしか機能しないのでそこが違う。  
defaultADSRのduration相当の部分を2倍にした。音が切れるまで大体duration*0.55しかかからないため、感覚とずれる。  
それを補正するために2倍にする。こうすることで「つながる」ので。ひとまずこれでいってみる。  
playOscillator関連のメソッドでgetFreqを実装してそれで振動数を取得できるように仕様変更。  
いずれ調号とか反映できるようにする。  
standardParseCodeで記号表記をcodeと演奏時間にできる。引数はcodeとstep.  
たとえばAなら440Hz(A3)の、stepが250msなら250ms. +-nで臨時記号。^で1オクターブ上げる、_で下げる。  
lで2倍、sで0.5倍、dで1.5倍（dは1つまで）。fで強さ1.5倍、pで強さ0.666倍。基本は1です。  
{code, duration, volume}を返す。あとは好きなように。   
BulletとGunの仕様を作りました。これを使うと勝手に生成して消える処理を作れます。楽しいね。  
使い方？基本Gunしか使わないです。いずれ機能ごとにページ作ろうか...（自サイトの方で）  
名付けてfisceUsersManual. いずれ、いずれね...  

Sequencerの補助機能として、ScoreParserを導入。  
使い方は別ページでまとめようと思います。ざっくりいうと楽譜を翻訳してシーケンサーを作るためのもの。  
通常のシーケンサーとしても使えますが、楽譜としての使い方を想定しています。お手柔らかに...  
追加仕様としてSpotEventとBandEventでkeyが使えるようになりました。  
SpotEventのactionの引数はkeyのみ、BandEventは第一引数が引き続きprogressで第二引数がkeyです。  
たとえば表示位置をkeyでいじってほいほい！とかできるでしょう。多分ね。  

SequencerのオプションにhiddenPauseを追加。できるだけシンプルにしたかったんだけど仕方ない。  
これがあると画面遷移の際に自動でpauseが発動する。  
ほんとはスケジューリングすれば画面遷移で音が止まることはなく、  
たとえばp5.Soundがこれをやっているが、  
ぶっちゃけYoutubeとかに上げた動画やaudioタグの音声を再生しているならともかく、  
インタラクティブアクションや見て楽しむコンテンツを音「だけ」再生し続けるメリットは皆無なので、  
どうでもいいです。  
フレームアニメーションは止まるんですよ。音だけ動いてても仕方ないでしょ。  

### 1.1.13
Gunの使い勝手が悪い（Bulletを隠蔽できない）のが不便なので改良。  
registWeaponの対象は関数のみとし、引数はオブジェクトに限定せず何でもありとする。  
さらに、用途を明示した個別の関数も用意。  
ScoreParserにisActiveを追加。シーケンサーのアクティブ状態を取得できる。  
getFreq()で翻訳できないときに440Hzを返すように変更  
CrossReferenceArrayにおいてremoveでindexOfの結果が-1でも削除する仕様になってたのを修正  
Bulletのkillで親のremoveを使わないように修正  
SequencerのhiddenPauseをやめてhidden:"pause"に変更。さらにhidden:"reset"の場合reset,pauseの順に両方実行される  
もともとresetも実行するつもりだったがpauseだけに、しかし選べるようにした方がいいことになった。  
SequencerにbandEventAlwaysを追加。デフォルトfalse. これがtrueだとpause中もbandEventが実行される。  
イベントの内容によっては不具合が生じるので注意だが、ポーズ中に描画が実行されないと具合が悪い場合があるのでそのための処置。  
hidden, bandEventAlwaysのいずれもcreateSequencerでオプションとして利用できる。  
AudioPlayer.isValidCodeでコード表記になってるかどうか調べる  
ScoreParser.isValidScoreでスコア表記になってるかどうか調べる  
こうしないと新しく文字を追加する際に困るので  
まああり得ないことを祈るけどね...これで充分だと思ってる。  
Bulletにpause/start/switchActiveStateを追加。それと同時にGunの方にまとめて適用する関数を追加。  
「消えない」Bulletとかで役に立つかも。それと「group」を追加。これらのメソッドの適用対象を絞る。  
これにより消えないBulletに消えるBulletを発射させて、それをやったりやんなかったり、そういうことができるようになる。  
majorとminorを一通り用意。文字列で音を出す場合に、オシレータの出力振動数に変化を加えられる。  
+-nが付与されている場合は変更されない。  

gainFunctionを文字列から呼び出せるようにし、reverb_curve0を追加。  
従来のそれより割とうまくADSRを表現できてるかと思います。多分ね。  
これでリリース出来ます。よし。  
noiseとwaveTableのpresetを用意  
使うにはinitializeのあとでawaitでpresetInitializeを実行する  
ただしデフォルトではすべてfalseなので何にも用意されない。勝手に全部用意されたら困る場合もあるので。  
noiseを使う場合はcreatePresetNoises:true, waveTableを使う場合はcreatePresetWaveTables:trueしてください。  
ついでにshowAvailable:trueにすると使える一覧を取得できるので。  
使う場合はtype:'custom'でname:'waveTable'名です。おわり。おわりです。  

ああそうだ。  
gainFunctionのデフォルトをreverb_curve0にする。一応ね。  
defaultADSRは'default'に入ってるので、使う場合はgainFunction:'default'してください。今回の更新は以上です。  

### 1.1.14
ScoreParserのインスタンスメソッドであるisActiveについて。this.sequencer"s"の"s"が抜けてました。  
そういうわけでこのメソッドは使えません。this.sequencersにアクセスできないので。  
まあ仕方ないですね。そういうこともある。どうせ素人のお遊びだし。  
ScoreParserの各種シーケンサー対象メソッドについて、引数が無しの場合は全てに適用されるように仕様変更。

addLibにおいてSpotEventSeedとBandEventSeedを明示しなくてもOKとした。戻り値は関数かオブジェクトが許される。  
関数の場合はそれでSpotEventSeedを生成してくれる。オブジェクトの場合、shapeプロパティでSpotかBandかを"spot","band"という  
文字列で決める。デフォルトは"spot"である。なお従来通りEventSeedを戻しても良いので破壊的ではない変更である。  
createNoisesを用意。white,pink,brownの長さ別のノイズバッファを簡単に作れるようにした。  
{white:{w0:1, w1:0.5, w2:0.25},pink:{p0,1,...}} まあこんな風  
GunのderiveMethodでkillを使用可能にした。kill()で全部消える。kill(groupName)で特定のグループだけ消す。  
その際loopReverseになってたバグを修正。あんしんしてください。ぜんめつできます。  

playNoiseとplaySimpleNoiseの仕様を変更。具体的にはuseFilterのデフォルトをfalseにしてfilter関連のパラメータをすべて排除、  
さらにfiltersを追加。これはフィルターパラメータの配列。useFilterも配列が取れる。useFilterの各成分がfiltersの成分に対応してて、  
使うかどうか決まる感じ。  
playSimpleNoiseもname, volume, useFilter, filtersの4つのみとする。これでいく。順番変わってるので注意。  
Noiseに関しては分かんないことが多いです。今回も破壊的変更ですがご了承ください。  
filtersのデフォルトは従来通りなので、従来と同じ挙動は簡単に実現でき、実は破壊的でも何でもないです。  

endmodとendlibの引数を無しでOKにする。というか現状、使う予定がない。それで、これらは単純に、最後に入ってきたmodないしlibを排除する内容とする。  
さらにmodとlibの適用順を後ろからとする。これにより、内容が競合する場合、一番最後に入ってきたものが適用される。  
つまり内容がかぶる場合はpush～popのような様相となる。以上です。  

Bulletの定義オブジェクトに「methods」を許す。ここにはJSON定義の形でユーザー定義メソッドをおける。  
ただし引数はthis固定（インスタンス自身）  
実行するのに例によってGunが使える（Bullet単体でももちろん使える）。  
execute(methodName, groupName)で、第二引数が空っぽの場合は全適用（ただしメソッドがすべてのBulletに定義されてなければだめ）。  
groupNameが定義されている場合は個別にループして適用する。この場合は対象でないならばメソッドを持たなくてもよい。  
というかグループ名のチェックが先なので関数があるかどうか調べる前にスルーされる。  

firstParseにおいて改行の後半角スペースのみを置いて「|」がある場合に、この改行をなくす。  
どういうことかというと、同じ小節でパートを段落で分けたい場合に、次の行に書ける（|で始める）。  
パートが長くても別立てで書きたい場合に重宝するかもしれない。  

SequencerのaddEventsで、従来はSpotEventとBandEventのオブジェクトでなければならなかったが、  
オブジェクト定義を許すことにした。Sequencerサイドでイベントを作ってくれる。その際shape:'spot'/'band'を指定する。  
デフォルトは'spot'なのでSpotEventの場合はkeyとactionだけ指定すればよい（nameが不要な場合）。  

addLibとaddModにおいて、指定する適用関数の引数を、今まではcodeのうしろにじゃらじゃら並べていたが、  
必須のcodeだけ残して残りをオブジェクトにした。以降はstepもbeatもここから取ることになる。  
なおプリセットとして次の3つを追加。
partIndex: partが分かれている場合の通し番号。3つなら0,1,2など。  
codeOffset: codeに割り当てられたパート内の位置。4等分なら0,0.25,0.5,0.75  
blockIndex: 小節番号。何番めの小節かというその番号。  
さらに...その前に,区切りで=で定義して最後に@でmodやlibの名前を書くことで、modやlibに文字列を送ることができる。  
具体的には第二引数のdataに込められる。例：#mod color=red@changeColorとか、 #lib duration=2,type=custom,name=celeste@std_osc  
とかそんな感じ。なおdurationとは基準となる音の長さ...lで2倍、sで0.5倍するあれ。勝手な想像。  

いわゆる値渡しです...が...  
数の場合はNumber()で数にしないと意図しない挙動になる可能性があるので注意してください。  

繰り返し記号...  
たとえばABC.ABC.ABC.ABC.を(ABC.)*4と書ける。()内部は従来のスコア記法に基づく文字列でなければならない。   
*で繰り返し回数を指定する。  

modeを導入。記述はmode=evenとmode=step「のみ」。一行（;で区切っても可）にこれが書いてある場合にのみ機能する。  
evenはデフォルトで、step*beatで小節の長さを計算する。  
stepは新しいモードで、step*symbolCountで小節の長さを計算する。  
symbolCountというのはシンボルの個数である。たとえば{}や[]でくくられたものは1とカウントする。つまりoffsetの計算は据え置き。  
そうなるとパートごとに小節の長さが違う場合が出てくるので、その場合は一番長いのに合わせる。  
ついでに、小節ごとにstep,beat,modeを,区切りで指定できるようにした。  
例えば特定の小節だけstepを変えたりできるわけ。再び@で分ける。@以降に楽譜を書いて、@以前の指定が臨時で使われる。  
これにより、臨時のmodやlibはmod～endmodやlib～endlibで挟めばよく、  
臨時のstepとかも小節に書けばいいので、柔軟性が増す。もちろん@が無ければ従来通りで、後方互換性はバッチリ。  

最後に、今回の後方互換性のないポイントをまとめておく。  
- playNoise,playSimpleNoise  
filterParameterは廃止で、filtersで適用したいフィルターを配列で定義する。useFilterも配列が使えるがbool値も今まで通り使える。  
ただしデフォルトはfalseになりました。  
playSimpleNoiseの引数はname,volume,useFilter,filtersです。volumeとuseFilterの順が逆になり、  
useFilterのデフォルトはfalseになりました。playSimpleNoiseを使ってる場合は気を付けてください。  
- addMod,addLib  
今まではcode,step,beatでしたがcode,dataになりました。dataにはstepやbeatを含めcodeOffsetなどの新しいプリセットプロパティ、  
さらにユーザー定義のプロパティが使えます。  
- endMod,endLib  
今まではライブラリ名を指定していましたが、それが困難になったので廃止されました。代わりに一番最後に入れたmodないしlibが排除されます。  
これによって使いづらくなる可能性は今のところ考えられませんが、何かあったら対応します。挙動的にはpush～popに近いものです。  
なおこれに関連してmodやlibの適用順が後ろからになりました。つまり最後に入れたものから優先して適用されます...  
しかし同時適用の場合なるべく対象は分けてください。それと、適用したくない場合にnullを返さなければならないのも従来通りです。  
addModの方でnullではなく元のcode値を返すとバグる可能性があるので注意してください。  

今回の変更は以上です。

追加  
まず、playOscillatorの和音対応。frequencyを配列にするとその数だけ一緒に鳴ります。で、useFilterを追加しました。  
Noiseと違って1つまでですが、いずれ複数になる可能性...わかんないです。とりあえず1つだけ。  
convolverとかfrequencyいじるのとかは全てに適用されます。すべて。  
filterParametersでtype,frequency,gain,qをいじれます。好きに。とても簡単に和音を出せます。楽しいね。  
三和音や四和音も考えたんですが、仕様の策定が難航しそうなので保留です。  
というかスケールの理解も進んでないのですべて保留です。  

次にmodの複数適用が出来るようにしました。nullを返す場合は次のmod,仮に適用できた場合、それに対してさらなるmodの適用を試みます。  
適用できるだけ適用したらlibを探します。libは従来通り1つまでです。  
繰り返しになりますが、最後に定義したものから順に適用されます。  
たとえば複数のmodで前と後ろから処理する場合とか...  
とはいえおそらくですが今やってるような「square:を付与する」とかは無くなるかな。  
libで引数取ればいいんだよあれは...modはもっと別のことをするべきだと思います。  

ここまでですね。  

### 1.1.15
SequencerのメソッドにgetElapsedを追加。elapsedを返す。フレーム制御のアニメーションで色々やりたいときに便利かもしれない。  
noteKeyDictを導入。要するにA0に0で、通し番号で12ずつ増えていく値を返す。%で割ってビジュアライズとかに使える。  
地味に無いと不便だったので導入しました。例のMusicalScaleでもFALさんが使っていました。  

ArrayWrapperをリニューアルして、コンストラクタはArrayを援用。Cross...の方は、空っぽで作るのが基本なのであれでいい。  
そもそもArrayWrapperの系列ではない。Gunもね。  
LoopArrayでループ参照、RoundRobinArrayで逐次参照（pickで次々と出す）、RandomChoiceArrayでランダムに次々と出す。  
resetの際にloopをtrue/falseどっちにするか決める。どっちも役に立ちます。  
SweepArrayはRoundRobinのno resetでしかないので廃止。BooleanArrayはeveryとsomeで同じことができるので廃止。  
RandomChoiceArrayについてaddを廃止しました。普通にpushで入れてください...というか基本的に通常の配列として扱えます。  
fromとtoをArrayから拝借しました。全く同じように使えます。  

firstParseで全角スペースを半角スペース、タブを半角スペース2つ分にする処理を追加。てか使ってほしくないです。  
playOscillatorにおいてカスタム周期振動を使う際に、typeに直接カスタム名を指定できるようにした。  
いちいちcustomと処理分けるのめんどくさいんだよ。   

isValidCodeでA-Gが1つと+-n, それ以降の順序を不問にしました。しかもdの個数も制限をなくしました。  
これでlibやmodによる調節がしやすくなります。まあそこら辺の整備が遅れているんで。  

ScoreParserにaddEventSeedを導入。SpotかBandかは設計図で指定できる。  
さらに、関数でもいいとし、戻り値はEventSeed,設計図、関数（関数の場合はSpotEventSeed限定）なんでもあり。  
関数の引数はpresetsである。たとえば同じシンボルであってもcodeOffsetやpartIndexで処理を変えることができる。  

Gunのfire系関数がBulletを返すように仕様変更。リズムジェネレータの際に、Bulletに個別に命令を出した。  
もちろんグループ分けでも個別に命令は出せるんだけど、1つ1つ違うグループ名を与えるより、配列で一括管理した方が  
スマートなのでそれに準じた形。  
ついでにBulletのカスタムメソッドで任意の引数オブジェクトを、Bulletに個別命令を出す場合に限り、使えるようにした。  
たとえば位置情報とか色々渡すことができる。  

Sequencerのhiddenにcustomを追加。hiddenFunctionで色々できる。  
もっとも、対象を特定しないとイベントが積み重なっていくので乱用注意。  
hiddenの場合の処理を柔軟に決めたい場合向け。!activeの際のreturnすらやってくれない。  

RandomChoiceArrayとRoundRobinArrayについて、isReturnable関数を追加。これは値を返せなくなるとfalseを返す。  
falseになるのは最後の値をpickで出力した「直後」なので、出力した値が使えるかどうかはpickする「直前」に判定する必要がある。  
なぜ導入したのか？  
nullかどうかで判定するのが具合が悪い場合がある。nullも含めて値とみなしたい場合である。それに対応するため。  

ScoreParserのoption（初！）としてautoParse:true/falseを導入。デフォルトはfalse.  
これをtrueにすると値渡しで勝手にパースされる。いわゆる「型変換」です。たとえば222なら222（数）、'222'なら"222"（文字列）になる。
一応配列も渡せる。その関連と言っても難だけど、  

区切り記号が「&」になりました（破壊的変更）  

まあしかたない、URLパラメータとか&だからね。これが普通。いちいちNumberかますの面倒だし、配列だと不可能。  

RandomSystemのインスタンスメソッドとしてshuffleを導入。seedにも対応しているので、seed設定後の結果は常に同じ。  

今回は以上です。priorityは当面は必要ないので見送りです。  
parseValue供用しとこう。使うかなぁ...  

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
