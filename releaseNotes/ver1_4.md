# ver 1.4  

## 1.4.0  
　カメラとライトが用意しやすくなったり、色んな更新があるんですが、最大の目玉はfoxGeometryToolsです。  
　長すぎて入れると長くなってしまうのでとりあえず別枠にしました。更新もそっちでおこなっていきます。  
　ここではそれ以外の内容について色々と説明したいと思います。  
　内容的にはジオメトリ関連を使いやすくするための仕様改善、カメラヘルパーの導入などですね。  

### coulour255, coulour3_255の導入  
coulourとcoulour3の値が0～255の整数になるバージョン。255倍してroundを取るだけの単純な処理。  
### Vecta.setの2D対応  
Vecta.setの引数が長さ2の配列の場合に第3成分が未定義になってしまうバグを修正。0が入るようにする。  
### CameraControllerクラスにgetCamera()  
CameraControllerは仕様変更で複数のカメラを扱えるようにする計画が、無くは無かったけど、CameraSystemManagerができたので正式に廃止。  
そこで管理する唯一のカメラを返す関数としてgetCameraを正式に実装。  
### InteractionクラスにgetCanvas()  
Interactionクラスはキャンバスを取得できなかったが、取得できるように仕様変更した。  
### CameraSystemのgetCamをgetCameraに名称変更  
おそらく使われなかったと思うが、getCamは中途半端だろう。getCameraに変更。  
### CameraSystemのeasySettingを廃止  
場合分けがパニックになるほど複雑で、残しておくとバグの温床になりかねないeasySettingを正式に廃止。そもそもこれは開発用で、供用すべきでなかった。  
利用にはcvs,cam,ccを用意することになる...が、ccを指定する場合cvsとcamはccから取るため、CameraControllerを用いるなら、ccのみでよい。  
### CameraSystemにcreateCameraとcreateControllerを導入  
CameraSystemからcamとccを作れるようにしました。createCameraはtype:'perse/ortho'で残りのパラメータは一緒。  
createControllerも一緒。  
### Render3Dの第二引数からcameraSystemを分離  
必須だし、いちいち「cameraSystem」って書くのが面倒なのでやめた。第二で確定引数。それで必要なのはカメラなのでカメラでOKにする。  
cameraSystemやcameraControllerも指定できるが、そこからカメラを取得する。後は全部同じ。保持するのはカメラだけ。カメラだけが必要。  
### Render3Dにcreateを導入  
内容は通常のコンストラクトと同じ。一気にbuildに行きたい場合。
### CameraControllerの第二引数のエラー処理  
無駄な{}を省いたが、これによるバグだと気づかないとデバッグで不便なのでエラー処理を追加。  

### LightRender3DにsetLightを導入  
setLightは第一引数のライトの種類に応じて第二引数のlocationにライトを入れてくれる処理です。  
なお第一引数を配列にし[{light:l0, location:0}, ...]とかするとまとめてぶちこめる。  
### Render3D.createToolsを導入  
createToolsはカメラ、コントローラー、ライトをまとめて生成できる。@camera,@standard,@pbrに分かれている。
カメラ：name, eye, center,top, fov, aspect, near, far. <perse>と<ortho>で指定。  
コントローラー：name, canvas, cameraName, rotationMode, topAxis. <controller>で指定。  
コントローラーには色んなオプションがあるがそういうのが欲しい場合は別途用意すればよく、柔軟に対応できる。  
ライト：directionalLightはname,direction,diffuseColor,specularColor,specularPowerなどなど。  
spotLightはposition,directionで指定する。まあいろいろ、いろいろ。  
戻り値はcameraとstandard,pbrで、それらに名前で指定したカメラやライトが入ってるので、  
```js
const tools = StandardLightRender3D.createTools(`
  @camera
    // perse/orthoでタイプを指定
    // 名前、eye,center,top,fov,aspect,near,far
    <perse> cam [0,0,6] [0,0,0] [0,1,0] 1 1 0.01 100;
    // 名前、canvas, カメラ名, 回転モード、topAxis
    <controller> cc cvs cam free [0,1,0]
  @standard
    <directional>
      // standardとpbrで違うが、standardの場合は名前、direcion,diffuseColor,specularColor,specularPowerです
      l [0,0,1] [0.25,0.5,1] [0.5,0.5,0.5] 40;
`, {cvs});
// camera,standard,pbrにそれぞれのオブジェクトが入っているので取り出します。
const {cam, cc} = tools.camera;
const {l} = tools.standard;
```
こんな感じで取り出す。  
### transform系のsnipetから「~N」を排除  
Nだけ変える場面がおそらく無いので、排除。  
### codeSnipetsのrotationMatrixをカット  
まあ使わんだろう。  
### codeSnipetsのimport禁止  
この後紹介するcodeLibraryもimport禁止。  
### codeSnipetsのtransformからローカル用の簡易関数を排除  
なんか色々あったと思うが、カットします。  
### transform系のsnipetを切り売り方式に変更  
今までは#snipet scaleとかするだけで使いもしない関数がじゃらじゃらと導入されたが、それを廃止。  
今後はscale,rotation,translation,rotationQのget,set,local,global,apply合計20通りを個別に指定する。  
心配せずともオーバーロードはすべて導入される。  
個別が可能になったのはlibという、複数の宣言があっても1箇所しか翻訳されない特殊な宣言を用いている。  
### CameraHelperを導入  
new CameraHelper(gl,cam)で作れるが、CameraSystemでglとhelper:true(default:false)を指定すると勝手に作ってくれる。  
updateでカメラの状態に応じて変更される。displayは内容的にはlines命令の線描画で、線の色はプログラムで自由に変更できる。  
csの場合、getCameraでCameraSystemからhelperを取得しdisplayで描画できる。csのupdateでhelperは自動的に更新される。  
なのでcsだと便利だが、個別にも運用可能なのが強い。  
NoLightRender3Dを想定している。デフォルトでは白色描画なので無修正で運用できる。  
### Render2Dなどにもcreateを導入  
内容はコンストラクタと一緒。  
### uniform型にSAMPLER_2D_SHADOWを導入  
uniformでこれを使おうとしたらエラーになった。SAMPLER_2D_SHADOWは特定の条件を満たす2Dのテクスチャを特定の方法で運用したい場合に便宜的に用いられる。  
つまりテクスチャの型ではなくあくまで「uniformの型」である。  
ついでに扱っていないuniform型が現れた場合のエラー処理を追加。こっぴどくハメられたのでもう懲りた。  
### glEnum, glTypedArray関連の拡張及び仕様変更  
shadowやframebuffer関連のgl定数が足りなかったので追加。さらにリストにない場合は変な処理をせず素直に「知らん！！」って返すようにした。  
そうしないと新規追加できないですからね。  

### modifyShaderSourceをProgramWrapperの関数に格上げ  
たとえばsnipetなどは今まではカスタムシェーダー系の関数でしか使えなかったが、今後は生シェーダーでも扱える。  
当然頭の空白続きを弾く処理もやってくれるので、空行の後から#versionを始めてもエラーを食らわずに済む。ストレス無いって最高。  
### executeProProcessをfirstFormattizeに改名  
まあ使ってなかったと思うけれど。  
改行区切りの配列を返す。コメントアウトを消す。タブと全角スペースを半角で置き換える、頭とおしりの無駄な空行を消す、そのくらい。  
### separateWithCommaを供用  
内容は文字列を,で区切るものだがその際に[]内の半角スペースを排除する。また、[]内の,は対象外。そういう利点がある。  
### createProcessをfoxParseに導入  
オブジェクトと関数名のあとで列挙、これを並べることでプロセスを作って並べて実行する仕組みを作れる。  
executorで作用主を指定したり、commandで関数名を固定したりできる。両方指定すると同じ関数で引数列挙を並べるだけにできる。  
### Render3Dの3種すべてでvGlobalPositionのところを分割  
globalPositionとvGlobalPositionに分離。これによりポストプロセスでglobalPositionを使って遊んだりできる。  
具体的には他のカメラによるビュープロジェクションに使う。  
### QCameraにgetViewProjを導入  
内容的にはviewとprojをこの順で適用するもの。prohMatrix * viewMatrixの形。  
これをvertex shaderのpostProcessでglobalPositionのvec4化に当てるとNDCが出る。  
これのx,y座標を加工して4次元とし、textureProjに入れれば、射影テクスチャマッピングができる。  

### foxGeometryの導入  
ついに自動メッシュが実装。内容が膨大すぎるので、別途紹介する。  
### MT4のrotation系で引数が2個の場合に軸を0,0,1にする  
2次元対応。2次元で扱う際にいちいち0,0,1とするのが面倒なので。  
### MT4にscale,translation,rotation,rotationQを導入  
ローカル処理のエイリアス。Geometryの方でこれを使いたいので。  
### ライトのsetterから「set_」を排除  
今までは
```js
l0.set_diffuseColor = 'red';
```
とかしていたと思うが、今後は
```js
l0.diffuseColor = 'red';
```
などと書いてよい。  
### Render3Dの3種すべてで「defaultAttribute」のオプションを追加  
position:true,normal:trueがデフォルト。falseにすると、アトリビュートの宣言がカットされ、positionとnormalのmain冒頭の宣言がデフォルト指定になる。  
つまりこの場合、独自に何らかのアトリビュートを用意するかなんかして、positionとnormalの基準値を用意する必要がある。uvからメッシュ構築してもいい。自由。  
もちろんこの場合独自に宣言する必要があるため、layoutにおける省略は許されない。  
positionにvec4を使ったうえでxyzでposition, などとしてもよい。  
### addVAOとsetVAOLayoutでdictの列挙を可能に  
addVAOはname,layout,dictでいいし、setVAOLayoutもlayout,dict,targetでいい。  
### WBOWrapperのgetProperDataにおいて、Vecta,Quarternion,MT4などの指定が可能に  
それぞれ自動的にコンバートされる。この恩恵はVAOWrapperの構築時にも助かるもので、dataで行列配列を指定しても、自動的に数配列にコンバートされる。  
### RenderSystemのbuild関数で第一引数が文字列の場合、第二引数にprogram指定を置くことが可能に  
従来は文字列を置いて名前にすることしかできなかったが、第一引数が文字列（＝ソースレイアウト）の場合に限りprogramObjectとして解釈されるようにした。  
おそらくもっとも使うオプションなので、頻繁に使えるようにハードルを下げることにした。

### parseDataを改造してAを利用可能にした  
A コントロール点のx,y 終点のx,y 半径を指定。本来のA命令は高性能ではあるが複雑怪奇なので、arcToに準じた内容で実装することにした。  
### createFSSを導入  
点列から滑らかなクォータニオンの列、もしくは点の位置情報を加味したトランスフォーム(MT4)の列を返す。  
なおyUpである。つまり曲線の進行方向にyが向く。たとえばyUpのトーラスに使うと、曲線を囲むようにトーラスが並ぶ。  
### parseSVGを導入  
parseDataは名前が中途半端、2Dしか対応してないなどの理由で廃止予定。parseSVGで今後は置き換えていきます。  
基本的にはparseDataと同じだが、第一引数がdataになったのと、dimension:3で3次元の点列も出せるようになったのが違いです。  
その際、L命令で始点が前の点と被るバグを直しました。あっちもこっちも直すのは手間なので、parseDataはもう管理せず、parseSVGを更新していきます。  
いずれ...いずれですが、Contourクラスに統合され、個別のグローバル関数もメソッドとして定式化されます。それまでの移行処置です。  

更新は以上です。  

## 1.4.1  
1.4.0でみつかったいくつかのバグを修正。他、いくつかの機能追加。  

### roundCuboidのdetailsのデフォルトを[1,1,1,1]に変更  
まあ1でもいいだろうってわけです。1,1,1,1の場合、角ばった感じになりますね。  
### Attributeのtypeにbooleanを追加  
なおデフォルトはfalseとする。名前の通りbool値で、セットする際は自動的にBooleanで変換され、代入される。  
おそらくこの後紹介するsubCopyと組み合わせてknifeやbisectで使うんだろう。  
### Geometryのgetterとしてv,aを用意  
vは単純にthis.verticesを返す。いちいち「vertices」って書きたくないときに便利。  
aは単純にObject.keys(this.types)を返す。まあアトリビュートの一覧があると便利だろう。  
### Geometryのsetterであるf,lについてflat(Infinity)に変更  
結局引数が完全フラットしか取れないのでは、addIBOの劣化になってしまうんで、フラトンしてから整形する場合もOKにした。  
fは3, lは2と決まっているので、問題なく処理できる。  
### createToolsでpbrの取得をする際のtypoを修正
なんとstandardの方になってました。コピペしたから気付かなかった。つまり1.4.0ではcreateToolsでPBRが使えない。致命的...
### createWeightAnimationsにおけるVAOWrapper関連の処理の仕様変更を反映  
まあfalseって普通に書いてありましたね。pointerとenableが。それを直しました。  
### Quarternionが無いせいでcreateFSSが使えない問題を解消  
つまり1.4.0ではcreateFSSが使えないわけです。あーあ...仕様上、Quarternionを導入してれば使えるが、まあそういう問題ではない。　　
というわけでcreateFSSは（意外にも）Quarternionを明示的に使う最初の関数になった。
### GeometryクラスにsubCopyを導入  
どう使うかというと、アトリビュート名と値を指定してアトリビュートがその値の頂点、またそれらの頂点のみからなる部分IBOを全て選んでジオメトリを作る。  
なお値のデフォルトは「true」であるゆえ、アトリビュート名だけ指定してそれがtrueのやつだけ抜き出す、という使い方もできる。  
フィルター関数でもいいんだろうが、それとmodify組み合わせてフラグを付与した後は同じ処理なので、要らんだろうと。そういうわけです。  
どうせアトリビュートなんていつでも破棄すればいいんで。
### Render3Dの関数であるcreateToolsをRenderSystemに格上げ
根っこクラスの関数に格上げです。理由は2つ。まず2Dでもレイマーチングなどでカメラを使う機会があるということ。もうひとつは、今後これを機能拡張して、  
textureやframebufferを作れるようにしていきたいんですね。そのための下準備です。

以上です。さっさとパッチ適用して安心したいです。またバグが見つかったら更新します。
