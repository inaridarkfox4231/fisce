# foxUtils
　ユーティリティ。2Dとか3Dとかではなく、コーディングを円滑に進めるための便利ツール。  

---

## Classes
　クラス一覧。

### Damper
　減衰を表現するツール。何らかのトリガーにより発火し、値が設定されるが、走査しなければ減衰してやがて閾値以下になり、0になる。orbitControlなどの滑らかな変化に使う。インタラクションと組み合わせるのが基本で、それ以外の用途で使用されることはほぼ無い。

### ArrayWrapper
　Arrayのラッパクラス。コンストラクタはArrayと同じものを用いている。Arrayのコンストラクト関数のfromとofをstaticの形で継承しており、これを継承してできる派生クラスに容易に継承させることができる仕組みになっている。

### LoopArray
　getという関数を持つ。それだけだが、そのindexは自然に配列の長さの範囲に収まるようにループする。たとえば長さ10だとして10,11,12,...は0,1,2,...になるし、-20,-19,-18,...も0,1,2,...として扱われる。

### RoundRobinArray
　配列の要素をpickと呼ばれる関数で順繰りに吐き出していく関数。indexを保持する必要が無いのが利点。resetの際にループして取り出し続けるかどうかをフラグで指定する。

### RandomChoiceArray
　配列の要素をランダムに取得していき、取りつくすとループ指定をしない限り終了する。

### CrossReferenceArray
　相互参照配列。要素をpushではなくaddで登録すると、値が登録されると同時に配列への参照が付与される。そのためこの配列はオブジェクトの登録しか許さない。そのオブジェクトも基本的にあるクラスのインスタンスであることが常に想定されており、それらに同時に特定のメソッドを実行させるなどのことを容易に実行できる仕組みになっている。

### Bullet

### Gun

### Tree

### Vertice

### Edge

### Clock

### Sequencer

### SpotEvent

### ScoreParser

### Easing

### ResourceLoader

---

## Functions
　関数一覧。

### morton16

### morton16Symmetry

### parseValue

### loadImageData

### loadTextData

### loadJSONData

### saveCanvas

### saveText

### saveJSON

### getTextBoundingRect

### getTextAlign
