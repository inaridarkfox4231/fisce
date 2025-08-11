# fisce
自作ライブラリのテスト

1.0.0  
saveCanvasなどの一連のセーブ関数を導入  
1.0.0  
createCanvasやSketchLooperを試験的に導入  
1.0.0  
導入したSketchLooperを大幅に仕様変更。ごめんなさい。  
1.0.0  
isLoopingのデフォルトをfalseにし、executeとpauseの重ね掛けを回避  

mainFunction内部で再requestするときにisLoopingか否かを確かめていないせいで  
loopFunction内部で実行されるpauseが無意味になっていたバグを修正  

エラー処理を導入。まずは型チェック。createCanvasでdprにundefinedを入れてしまうバグを  
補足できなかったので。少なくとも一回しか実行しない関数についてはいくらチェックしてもし足りないと思う。  

一旦すべての番号を1.0.0に戻しました。
