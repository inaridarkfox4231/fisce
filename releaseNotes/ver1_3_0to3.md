# ver 1.3  

## 1.3.0  
大規模な変更。なんとcreateShaderProgramとuniformXは廃止。  
新たにProgramWrapperを用意して、今後はこれでプログラムを作る。uniformの登録関数も内蔵。  
今後は型指定もglやpgの指定も必要なく、pgから名前と値だけ指定すればいい。構造体にも対応。VectaやMT4もそのままぶちこめる。  
かなり変更点が多いので、順繰りにまとめていく。なお前回導入したcreateVAOもしれっと廃止。VAOWrapperを使ってください。  

### WBOWrapperの導入  
WBOWrapperはWebGLBufferObjectのラッパです。初期化、更新、取得を簡単なメソッドで実行できます。派生としてVBO,IBO,UBOのWrapperも存在します。  
### VAOWrapperの導入  
createVAO, registArrayBuffer, registIndexBufferは廃止。count, vbo, ibo, layoutを指定する。  
layoutではvertexAttribPointerで指定するパラメータの他、divisorなども指定できる。  
いわゆるインターリーブや、行列アトリビュートも扱える。  
### snipetsの導入  
「#snipet snipet名;」で便利なsnipetが使い放題！今のところ使えるのはrotationMatrix, hsv2rgb, overlay, softLight.  
### MT3,MT4のコンストラクタの改変  
配列、型付配列を指定可能にした。  
### ProgramWrapper, UniformWrapperの導入  
つまりcreateShaderProgramとuniformXは廃止。今後はProgramWrapperでプログラムを作る。useやsetUniformで操作する。  
### shaderごとに複数のProgramを生成可能  
RenderSystem系の関数でプログラムを作る際に、同じシェーダーから複数のプログラムを作り、名前で管理したりできる。  
### shaderの書き方を刷新  
write関数を用いてまとめて指定する。つまりmainとかdeclarationとかで個別に指定しない。そうするとp5のようだが、p5と違って変なことはしない。  
glslでshaderを書くのに慣れた人に寄り添った記述方法を目指して設計した。  
### RenderSystemとカメラの分離(CameraSystem)  
RenderSystemがカメラと癒着してると複数のRenderSystemで同じカメラを使いまわせないんで、カメラ部分をCameraSystemとして分離し、  
RenderSystemに登録する仕様とした。これによりたとえばライティングの仕様が異なる複数のRenderSystemで同じカメラを使いまわせる。  
### VAOWrapperの整数対応  
layoutでisIntegerをtrueに指定することで整数アトリビュートが使えるようにした。  
### ライトのオブジェクト化  
複数のプログラムで同じライトを使いまわしたいんで、ライトをオブジェクト化した。  
たとえばSDLでStandardDirectionalLightを作れる。ライトはオブジェクトのまま送られるんで、ライトを外部的にいじることでそれが  
プログラムにダイレクトに反映される。たとえばビュー変換をやめることで常にカメラ視点のライトになるようにしたりできる。いつも明るく元気！  
あ、そのためのメソッドはsetViewMode(true)です。  
### コメント表記  
たとえば「// コメント」を実現したいなら「# コメント」のように書く。「#」のあとの半角スペースは必須。なおコードの後ろでも可能。  
### 初期デスクリプタを改変できる  
declarationやmainなどのデフォルトをいじれる。setInitialDescriptors. ただ基本的にはいじらない方がいいかも。要はテンプレート作りだ。  
### RenderPoints
点描画用。vsにpointSizeがデフォルトで用意されている。これをいじることでサイズ変更できる。  
データの設定に使う場合は常に1ですから、いじる必要はありません。  
### RenderTFF  
TFF用。いわゆるバッファ引き戻し処理で、完全にcomputeShaderと同じというわけではない。  
なおtffLayoutでwboを指定すると勝手にバインドとかいろいろやってくれるんで、今のところTFOの導入予定はないです。あってもいいけどね？  
### WBOWrapper.create  
create関数で同時にinit出来るようにした。たとえばサイズ48バイトのVBOをサクッと生成したりできるよ。  
### uboLayout
プログラムの生成オプションにuboLayoutを追加。uniformBlockの名前にindexを付与して送ることで好きなスロットを使えるようにできる。  
UBOが使いやすくなる。UBOWrapperも作りました。  

こんなところですね。いずれマニュアルを作りたいところです。  

## 1.3.1
主に1.3.0で見つかったさらなる仕様変更アイデアの実装です。
テクスチャやフレームバッファは今後の課題となります。  
GltfがVBOなどの機構を使っているのでその辺りの変更がメインです。ジオメトリは見送りになりました。  
大きな変更点はGltfのVAO出力、ウェイトアニメとスキンアニメの実装変更です。WBOWrapperを整備したのでそれに基づいての書き換えを実行しました。  
またVAOWrapperのcreateが刷新され、文字列で実行できるようになりました。従来のlayoutプロパティの書き方ではエラーになるので気を付けてください。  
使えるのは配列と文字列だけです。  

### setUBOLayoutをインスタンスメソッド化  
UBOのlayoutをshaderでの名前の宣言に従って指定する。これをメソッド化できてなかったのでメソッド化してあとから変更できるようにした。  
TFFのvaryingとかと違ってこれはリンク後に設定するので、その方が合理的。  
### VAOWrapperにcountプロパティを用意  
そういうわけでIBO作る際はこれが使われる。VBOが無い場合は0だが、0なので普通にSHORTで扱う形になる。  
0でも理屈の上ではINTが使えるだろうって？そうかもね。getCountで取得。  
countのデフォルトは0に設定。  
### initIBOの引数からcountを削除  
さっきの実装の関連で、IBOの初期化の際にcount（頂点数）をいじることは許されない形になる。  
もし何らかの事情でIBOのみのVAOを扱いたいなら最後まで頂点は使えない。  
あとから使う予定ならバッファだけでも用意しておくこと。  
### シェーダーソースの空行処理  
冒頭と末尾の空行、さらに連続する空行の2行目以降をカット。さらに空行をはじく処理も削除。  
### シェーダーソースのインデント処理  
インデントを整える処理を追加。これによりソースを書く際に左端が揃ってさえいれば綺麗に出力される。  
### glEnumの導入  
関数です。たとえばgl.ARRAY_BUFFERでも'array_buffer'でも同じgl定数が返る。glを内部的に使わないで実装してある。　　
一部エイリアスを用意。たとえばgl.UNSIGNED_BYTEは'ubyte'で取得できるし、gl.TEXTURE_CUBE_MAP_POSITIVE_Xは'cube_px'で取得できる。  
### ShaderPrototypeの改変とRenderFreeの用意  
ShaderPrototypeでvsのoutputを空行にした。fsの方は残した。そしてRenderFreeを用意。全部自分で用意する。  
2Dのattrとかで遊びたい場合のためのサンドボックス。  
### getShaderSource  
ProgramもしくはRenderSystemの関数として実装。その時に走ってるプログラムのソースが返る。  
'vs','fs'で個別に。デフォルトは'both'で{vs,fs}で両方返る。  
### VAOWrapperのコンストラクタで文字列指定できる
VAOWrapperのlayoutの指定方法を変更。まず従来のやり方の場合、layoutは配列とする。bufferで使うバッファを指定する。  
というのも従来のバッファ主導の書き方だと、バッファに紐つく形でdivisorなどを指定する。これは具合が悪い。  
そういうわけでindexベースにした。配列の場合はindexがそのまま使われるが、個別にparamsにindexを指定することもできる。  
bufferでバッファ名を指定する。後は同じ。  
文字列の場合は書き方があって...  
```js
const vaoTorus2 = VAOWrapper.create(gl, {
  count:torusGeom.v.length/3,
  layout:`
  @buffer
  path:torusGeom, offsets // これでパスを元に検索される
  <vbo>
  aPosition v; aNormal n; aOffsetPosition op; aOffsetRotation or;
  <ibo> iFaces f;

  @layout
  <pointer> 0 aPosition 3; 1 aNormal 3; 2 aOffsetPosition 3; 3 aOffsetRotation 4;
  <divisor> 2 1; 3 1;
  <enable> 0; 1; 2; 3;
  `,
  dict:{
    torusGeom,
    offsets:{
      op:offsetPositions, or:offsetRotations
    }
  }
});
```
こんな感じ。DESIGNという概念を新しく用意して、シェーダー解釈と同じ枠組みで実行できるようにした。  
### VAOWrapperのinitVBO,initIBOの第二引数をdataにする  
dataだけ切り離した。なぜかというとWBOWrapperサイドと引数の仕組みが違うせいで混乱するため。  
### Clockの値取得メソッドにNaNチェックを追加  
Clockでハマったので。jsはNaNにエラーを出してくれないので、この種の調整は今後増える可能性がある。  
### WBOWrapper系の関数でdataにWebGLBufferを許す  
内容は丸ごとコピーするもの。無いと不便なので作った。  
### SkinMeshAnimationのbindで引数チェック  
引数がsingle/doubleでnumber/arrayと違うので、そこをチェックすることで書き間違いを防ぐ。  
### setMatricesのoptionsでresetを導入  
デフォルトはfalse. これをtrueにすると、uniformをセットした後でmodel行列がリセットされる。  
### VAOWrapper.scanの導入  
これを実行するタイミングのVAAの状態とIBOに基づいてVAOWrapperを作る関数。要するに盗むわけ。  
p5とかでこれを使ってinstance attributeを簡単に追加したりできる。なお内容を見るだけの使い方も可能。  
### WBOWrapperのバッファ操作関数を静的メソッドに委譲  
gl,bufを引数とする形で一般のWebGLBufferに対しても実行可能なようにした。  
initBuffer,updateBuffer,outputBuffer,showBufferすべて可能。その方が柔軟性が高いので。  
もちろんクラス化する意味はあって、TFFやUBOの連携など。そういうのはインスタンスでやるメリットが強いですね。  
### Gltfのバッファ関連の3つのメソッドの内容更新  
WBO関連の整備をしたので、それに基づいて大幅に書き換え。  
たとえば作った後のバッファの追加などが容易になる。以前は面倒だった。
また、従来の方法でスキンメッシュが扱えなくなった（TFFしないといけなくなった）ので、そういう裏事情もある。  
### Render3Dのfsにおけるビュー関連の変数名をPBRとSDで統一  
PBRの方は変な構造体だったんですが、StandardLightの方と同じくviewNormalとかにしました。  
たとえばbump mappingではviewNormalをいじるんですが同じコードを書くことができます。  

以上。  

## 1.3.2  
　ジオメトリは見送り。内容的には1.3.0～1.3.1において導入された内容の利便性を図るパッチ処理がメイン。  
　真新しいフィーチャーはリサイズとかその辺か。全体的に使いやすくする処理。  
　一部やや破壊的な変更点もあるので、順繰りにまとめていく。  

### CameraSystemのreset機能をGunで書き直し  
　リセットを内部的に泥臭い処理で書いていたが、fisceのスケッチ集でGunでやっていて綺麗な処理だったので採用することにした。  
### CameraSystemManager  
　いわゆる複数カメラの仕様だが、p5wgex時代と違って複数のカメラをひとつのコントローラーでまとめて...というのは無し。  
　システム単位での管理となる。レンダーシステムとの連携については、これを登録しておくことでカレントが変更された際にまとめて更新される仕組み。  
　なおこれに伴い、cameraSystemプロパティはRender3Dから破棄されている。カメラのみを保持する。  
　一応{systems:{},targets:{}}というオブジェクト式での定義だが、いずれ配列になるかもしれない。ひとまずこれで。  
### CameraSystemにpause,start,resetを用意  
　これらはccがある場合のみ、ccに対して実行される。nullなら何にも起きない。  
### Gunにmuzzleプロパティを用意  
　muzzle:true/falseでfire系関数を実行するかどうか決める。デフォルトはtrueで、falseだと一切弾丸が発射されない（たとえばリセットが発動しない）。  
　muzzleOn,muzzleOff,switchMuzzleで切り替え。  
### ResizeModuleの導入  
　カメラのリサイズを簡単に実行するためのResizeModuleの導入。サイズ変更時にサイズをどうするかの処理と、カメラの処理の仕方を決める内容。  
　複数のカメラにリサイズさせる場合、モジュールを個別に用意し、個別に登録することで、リサイズ時に問題なくすべてのカメラがリサイズされる。  
　もちろん種類が違ってもカメラのいじり方を変えれば問題ない。  
　ビューポート関数も用意。ビューポートを適切にいじらないと問題が発生する。  
### E_Typeを廃止してErrorCatcherを導入  
　E_Typeがクソだったので廃止。代わりにErrorCatcherを導入。内容的にはエラーを出すだけ。ループ内で出すならthrowして終わり。  
　ループ外の場合はcatchErrorという補助関数を使う。  
　たとえばTypeErrorCatcher.throw(n, 'number', 'number型ではないぞ！');とかループ内に書く。  
### Errorの回数上限を減らす  
　120では多すぎるので16に制限。  
### ProgramWrapperと各種RenderSystemにbuildを導入  
　addShaderからcreateProgramまでの流れが冗長で面倒だという場合のためにbuildを導入。一気にプログラム生成まで行ける。  
　layoutで文字列を用意してprogramで色々な下準備をする。後は一気にゴールまで行ける。  
　同じ内容のシェーダーを改変しながら使いまわすユースケースがあんまないだろうということでの処置。従来の方法は残してある。  
### Render2Dの改変  
　今までoriginal_uvとかなっていたところをpositionに変更。内部でuvとともにいじれる。uvとは別に表示位置をいじるためのもの。  
　さらに今までrenderにはオプションは無かったが初めて{count:個数}を導入。1以上だとインスタンシングになる。  
### EasyCanvasSaverの軽微な改変  
　easySaveでないマニュアル利用の場合にInspectorを用意しないように仕様変更。  
### シェーダーコンパイルエラーの改善  
　エラー出力時にソースコード全文を「エラー箇所が赤字になる」形で出力するように仕様変更。どこがあやしいか一目でわかる。  
### CameraSystemのreset記述を変更  
　今まで「autoReset:true」とかしていたと思うが、reset:'none'/'manual'/'auto'に変更。デフォルトはnoneで、これだとリセットが機能しない。  
　manualの場合はcameraReset関数で手動でリセットする。autoの場合にダブルクリックで自動リセットする。  
　というのもダブルクリック系のアクションが競合している場合でもリセットしたいという要望があったので。保存とかね。併用しやすくする。  
　CameraSystemManagerの場合はカレントカメラのが発動する。  
### 各種snipetの導入  
　transform関連のtransform,scale,rotation,translation,rotationQ,quarternionを導入。slerpQやmultQやgetQuarternionFromAAが使える。  
　multQ(q0,q1)は外部と掛け算順が逆だが、これは内部では作用が右から来るため。q0から作用することが分かりやすいように、逆にしてある。  
　getRotationQでクォータニオンから一瞬で回転行列を作れる。  
### VAOWrapper.scanのibo名のデフォルトを'f'に変更
　ibo_0の合理性は分かる（vboは通し番号でvbo_0,vbo_1,...）のだが、ほとんどの場合'f'で運用するため、それが自然ということで変更。  
　showIndexBufferのオプションでibo名を出すようにした。分かりやすいので。  
### VAOWrapperに関するいくつかの変更  
　まずunbindIBO()を導入。これによりカレントVAOのiboがnullになる。需要があるかは不明。  
　複数VAOを導入。同じvboやiboから複数のVAOを生成して切り替えたりできる。やり方はaddVAOで名前とレイアウト、あれば辞書。おそらく使わないが。  
　このときその名前とレイアウトで新しいvaoが作られ、自動的にセットされる。  
　従来の処理はカレントVAOに対するものになる。setVAOで切り替えられる。  
　なおbindで名前を指定するとbindされると同時にカレントがそのvaoになり、これでもいい。  

　modifyのデフォルトをすべてtrueに変更。理由は外部的に使う場合ほとんどtrueでの運用が主なため。  
　仮に全ての処理をmodifyフラグ無しで実行したとしてもすべて問題なく改変は実行される。  
　ユースケースとしてはどうしてもbind/unbindを繰り返しやる事による負荷が気になる場合に限られるが、レアケースだろうから。内部では使っている。  

　VAO_DESIGNの@layoutの枠に\<ibo\>を追加。使えるのは文字が1つだけ。ibo名を指定することで、そのiboが使われる。複数あっても0番しか作用しない。  
### VAOWrapperにTFOを導入  
　逐次更新などでTFFを使いたい場合のためにregistTFO,bindTFO,unbindTFOを導入。  
　registTFOは('tfo0', ['v','n'])でもいいが('tfo0', 'v, n')といった簡易記法も使える。  
　純粋なTFOの導入ではなく、あくまで「VAOWrapperインスタンスに登録されたvboの更新用」の補助機能としての位置づけである。  
　TFFの制約でVAAに同じバッファがあると失敗するのでそれを回避するために使われる。  
　これを用いてRenderTFFを使う場合、tffLayoutの指定は必要なく、bind/unbindTFOで挟めばよい。  
### buildで文字列のみを許す  
　文字列とプログラム名を順に指定するだけでその名前のプログラムができるようにした。究極の簡易版。  
　もちろんTFFやUBOを使いたいなら別途。ただUBOに関していえば作ったあとでの指定も可能。   
　TFFは「リンク前」という強い制約があるので、UBOのように後から用意することはできない。  

　今回の更新は以上です。

## 1.3.3  
　今回の更新は主にVAOWrapperの使いやすさを改善するのと、いくつかのパッチです。大きな変更もあります。ResourceLoaderはこれ以降廃止。  
　理由はリソースの一元管理がぶっちゃけ役に立たない、アドレスからリソース想定するのも役に立たない、あれもこれも役に立たないので。  
　いちいちResourceLoader.ほにゃららでアクセスするのが面倒、ついloadImageなどと書いてしまう、その辺です。  
　いくつかの新機能も盛り込まれました。  
　vaoまわりはdrawElementsの第一引数の廃止こそ大きいですが、それほどの大きな変更はありません。ほぼ従来通りの挙動です。  

### cameraResetでdurationとeaseTypeをマニュアル化  
　cameraReset関数でカメラをリセットする際、durationとeaseTypeを自由に決められるようにしました。順に指定します。  
　マニュアルだけです。オートの方は引き続き20とeaseInOutQuadです。まあマニュアルですから、自由に決められる方がいいだろうというわけです。  
　autoの方もいじれるようにするかどうかは未定です。まあオートですから、勝手に決めてくれって感じでいいと思います。  
### parseDesignDescriptionとcreateTFOの軽微な改善  
　半角スペースが連続するときに通常のスペースとして扱われない不具合を改善しました。  
### GltfのcreateVAOの分割処理  
　従来の仕様では、locationが指定されたバッファのみ用意される仕組みだったが、スキンメッシュなどの場合に不便だった。  
　それを改善するため、バッファはすべて用意し、ロケーション指定があった場合にそこだけレイアウトが決まる仕組みにした。  
　これにより、たとえばまずバッファだけ一通り用意してから、頂点色ごとにvaoで切り分けたり、スキンメッシュのようにupdate部分だけ切り離したりできる。  
  なおレイアウトについては手動でもいいが、createVBOLayoutという関数で別途バッファ名以降だけ取り出すことができる。  
### VAOWrapper.scanにまつわるいくつかの変更  
　VAOWrapper.scanの変種として、showVAAを用意。中を見るだけ。引数はglだけでいい。追加オプションとしてshowArrayBufferとshowIndexBufferがある。  
　VAOWrapper.scanについて、中身は全て見れるが、生成される際にはそのときenableなものに対してしかバッファを作らないとした。  
　さらにcountの計算にもenableでないものは寄与しないとする。  
　ついでに閲覧のみについて、WebGL1対応を実装。中を見るだけであればWebGL1でも出来るようにした。  
### 複数vaoの管理方法を変更  
　VAOWrapperで複数vaoを管理する際に単にvaoだけにしていたが、それだとibo情報を取り出せないので、そのときにbindされているiboの情報をセットで扱うことにした。  
　これにより、drawElementsにおいてibo名を指定する必要がなくなった。つまり単独IBOの場合は何にも指定しなくていい。  
　マルチIBOの場合はbind処理で切り替えることになる。  
　その関連でsetVAOLayoutとaddVAOの指定方法を変更。layout,dictとなっていたところはオブジェクト形式とした。  
　理由はいずれも基本事後的に使われるため、dictがあまり仕事しないから。単に文字列の場合、dictが存在せず、それをlayoutとして処理される。  
### modifyを廃止してtargetに変更  
　さっきの内容に関連するが、modifyを廃止。代わりにtarget. デフォルトは'default'で、これは基本vaoの名前。  
　つまり指定が無い場合は常に、ひとつだけ最初にできるvaoである。なぜならマルチvaoはやはりマイナーケースで、メジャーな場合に対応させるため。  
　要するに以前のtrueと挙動の違いは無いので、デフォルトがbindされunbindされる。なおnullにすると従来のfalse指定の挙動になる。  
　名前を指定することで特定のvaoをいじることができる。  
　すなわちcurrentVAOの挙動が変わっている。以前と違い、bindされている場合のみcurrentVAOはnullではないということ。  
### snipetのtransformに関数を追加  
　transformのsnipetにtranslation,scale,rotation,rotationQを追加。すべてローカル、オーバーロードなし。たとえばrotationはvec3とfloat.  
　ちなみにmat4(1.0)で単位行列がセットされる。これを元に、ローカル変換で行列を作っていける。  
### multV,multNの名称変更  
　MT4,MT3のmultV,multNを改名してapplyP,applyNに変更。  
　理由は、position,normalならp,nが自然だろう、というもの。これに応じてtransform関連のsnipetもVをPに変更してある。  
　なおQuarternionのapplyVのVは「Vecta(vector)」のVなので据え置き。  
### NullErrorCatcherを追加  
　nullかどうか見るだけ。  
### VAOWrapperのエラー処理強化  
　vbo指定で間違ってロケーション番号を書いちゃうバグが発生したのでその辺も含めてエラー処理を強化。  
### WBOWrapper.byteLengthの追加  
　WBOWrapperのinitが実行されるたびにbyteLengthが更新されるように仕様変更。いつでも取り出せる。用途は今のところ未定。  
### domUtilsにEasyConsoleを実装  
　使い方？そのままnewで作って、addTextやwriteTextで追加するだけ。左上のコンフィグは最低限。  
　隠すやつと、自動更新やめるやつと、全消去。  
　addとwriteは第二引数でstyleをいじれる。たとえばfontWeight:'bold'で太字にできる。  
### foxUtilsにgetPerformanceLevelを実装  
　文字列high/lowでパフォーマンスを取得する。iPhoneやAndroidでlowが出る仕様のはず。スマホ向けにパフォーマンスを落としたい場合用。  
### fox3DtoolsのVecta以外の様々なクラスにcreateを実装  
　たとえばQuarternion.createを実装。引数は列挙で4つの数字であれば従来通りだが、ベクトルと数の場合はAAだったり、ベクトル3本で正規直交基底の場合はAxesだったり。  
　いくつかのオーバーロードが用意されている。MT4のcreateもrotationMatrixをサクッと作ったりできる。MT3,QCameraPerseなどは通常のコンストラクション。  
### ResourceLoaderの廃止  
　長らくResourceLoaderはstatic関数しか使われてこなかった。見積ミス。今後はこれらのstatic関数を改名した「load～～」のみ使うものとし、クラスは廃止。  
　たとえばResourceLoader.getImageはloadImageでサクッと書ける。まあ要らなかったですね。一元管理なんて出来なくていいんです。  
### CameraControllerの第二引数のoptionsを廃止  
　ここは長らく「{}」が使われていた。しかし中に何か入れたことはないし、これから先もおそらく何にも入らない。  
  そこで廃止することとした。この仕様を作った頃、コンストラクタの仕様をきちんと理解していなかったことが原因（必須だと思っていた）。  
　今後はキャンバスとパラメータ群のみで作るとする。若干の影響があるかもですけど、改善にはなってると思います。  

更新は以上です。  
