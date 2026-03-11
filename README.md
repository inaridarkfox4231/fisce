# fisce
自作ライブラリのテスト

jsdelivr:

```
https://cdn.jsdelivr.net/npm/fisce.js@1.1.13/src/index.min.js
```

```html
<script src="https://cdn.jsdelivr.net/npm/fisce.js@1.1.13/src/index.min.js"></script>
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
補足できなかったので。少なくとも一回しか実行しない関数についてはいくらチェックしてもし足りないと思う。  

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
