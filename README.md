# fisce
自作ライブラリのテスト

jsdelivr:

```
https://cdn.jsdelivr.net/npm/fisce.js@1.1.6/src/index.min.js
```

```html
<script src="https://cdn.jsdelivr.net/npm/fisce.js@1.1.6/src/index.min.js"></script>
```

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
