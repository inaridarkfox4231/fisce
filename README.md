# fisce
自作ライブラリのテスト

jsdelivr:

```
https://cdn.jsdelivr.net/npm/fisce.js@1.0.2/src/index.min.js
```

```html
<script src="https://cdn.jsdelivr.net/npm/fisce.js@1.0.2/src/index.min.js"></script>
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

### 1.1.0
libtessを取り扱うためのfoxTessを導入。基本的にはtriangulateだけ使えば問題ない。  
libtessは別途scriptとして用意する必要がある。  
