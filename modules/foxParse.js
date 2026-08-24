// パーサー。基本的に内部でしか使わないが、供用も出来るようにしておく。
// parseDesignDescription
// parseVariable;
// いずれいろんなパーサーが増えるといいですね。parseVariableは使いまわしが効くと思う．
const foxParse = (function(){
  const parser = {};

  // コメントなどをカットする。タブを半角スペースにしたりする。最終的に改行で区切り、配列を出力する。
  function executePreProcess(code = ""){
    let result = code;
    // 全角スペースがあったら半角スペースにする
    result = result.replaceAll("　", " ");
    // タブがあったら半角スペース2つ分にする
    result = result.replaceAll(/\t/g, "  ");
    // まず改行記号をエスケープ変換して一行にする
    result = result.replaceAll("\n", "\\n");
    // スターコメントの中身を排除する
    result = result.replaceAll(/(?<=\/\*).*?(?=\*\/)/g, "");
    // 無意味な改行を追加し、行コメント記号から改行エスケープまでの部分を排除する。
    result = result.concat("\\n").replaceAll(/(?<=\/\/).*?(?=\\n)/g, "");
    // セミコロンは残す
    // コメント記号の残骸を削除。半角スペースは残す。
    result = result.replaceAll(/\/\*\*\//g,"").replaceAll(/\/\//g,"");
    // おわり。
    // \\nでsplitして配列を返す。空行を弾く仕様だったが、別に不要なのでやめよう。
    // 好きにスペースを空けたいときに不便だろう。
    const array = result.split("\\n");
    // 冒頭と末尾の空行の連続を排除
    for(let i=array.length-1; i>=0; i--){
      if(array[i].trim().length > 0) break;
      array.splice(i, 1);
    }
    array.reverse();
    for(let i=array.length-1; i>=0; i--){
      if(array[i].trim().length > 0) break;
      array.splice(i, 1);
    }
    array.reverse();
    // 出力
    return array;
  }

  /*
    designの記述方法
    design = {layout:{}, flagDefinition:{}}
    layout:{ category0:{ tag0:{}, tag1:{}, ... }, category1:{ tag0:{}, ... } }
    tagには2種類。type:'enum'は列挙する。keysとvaluesでデフォルトを用意する。
    keys:['key0','key1','key2'],values:[0,1,2]
    とするとデフォルトが{key0:0,key1:1,key2:2}となり、半角スペース区切りで並べると左から順に上書きされる。
    なお、,で区切ってkey2:999とかするとピンポイントでプロパティをいじれる。いじる順は並べる順で順に上書き。
    要するに全部プロパティごとに指定もできるし、列挙でまとめて、もできる。
    たとえばshaderのuniformとかの場合普通に宣言するように「type,name」なので列挙の方が楽な場合もあるわけ。
    type:'text'はテキスト記述。自動左詰めされる。「# ～～～」はコメント形式「// ～～～」になる。
    dict機能
    dict:{a:[0,1,2],b:'usagi'}とかあると列挙定義のaやbがこれになる。なおaやbそのままで提示したい場合は'a'とか'b'と書けば文字列扱いになる。
    path機能
    dict:{group0:{a:[3,4],b:'wani'}}とかなっている場合に「path:group0」とかするとaやbは「group0.a」とか「group0.b」という扱いになる。
    つまりこれが無い場合aやbはそのまま文字列扱いになる。そういう使い分けもできる。path宣言はカテゴリーごとに適用される。
    基本的にカテゴリー宣言の直後に書く。
    記述方法の例
    @category0
    <tag0>
    0 1 2; // セミコロンで記述
    <tag1>
    今日はとてもいい天気 # うそこけ！
    @category1
    <tag2> float vVal; // 列挙のタグは同じ行の記述が可能
    フラグ機能
    タグに_続きで文字列を書くとフラグを付与できる。たとえば初期化するかどうかを_Iみたいに指定できる。
    関数を指定するのが一般的だがオブジェクト列挙も可能とする（関数の場合は戻り値は自由）
    フラグ無し('')の場合はその場合にはdefaultという固有プロパティ名で内容を指定できる
    出力は{name:フラグ名, value:値}で返される。
    例：(name) => {if(name < 100){ return 'small'; } else { return 'big'; }}
    例：{default:0, A:1, B:2, C:3}
    使い方
    const result = parseDesignDescription(code, design = {layout:{}, flagDefinition:{}}, options = {dict:{}})
  */

  // layout[currentCategory][currentTag]にtype(enum/text),keys,valuesが入ってる。
  // enumの場合はkeysとvaluesが入っているがtextの場合は入ってないです。

  function parseDesignDescription(code = "", design = {}, options = {}){
    const {layout = {}, flagDefinition = {}} = design;
    const {dict = {}} = options;

    const result = {};

    // 名前の採取
    const categoryNames = Object.keys(layout);
    const tagNames = {};
    for(const category of categoryNames){
      tagNames[category] = Object.keys(layout[category]);
      result[category] = {};
    }
    // 一行ずつ見ていく
    let currentCategory = "";
    let currentTag = "";
    const currentPath = [];

    // 最初の整形
    const array = executePreProcess(code);

    // resultの計算ここから
    for(let i=0; i<array.length; i++){
      const s = array[i];

      // 「@~~~」だけの行。trimして「@~~~」のみになる場合だけ認識
      const categoryCheck = s.trim().match(/(?<=^@).*(?=$)/);
      if(categoryCheck !== null){
        const categoryName = categoryCheck[0];
        if(!categoryNames.includes(categoryName)){
          console.error("invalid category name.");
          break;
        }
        currentCategory = categoryName;
        // カテゴリーが変わったらpathを初期化する
        currentPath.length = 0;
        // さらにタグかぶりを防ぐためタグも初期化する
        currentTag = "";
        continue;
      }

      // パスは「,」区切りで指定する。セミコロンは不要。カテゴリーごとに認識される。
      // これを使う場合、宣言してからカテゴリーが変わるまでの間に現れたすべてのタグに適用されるので、
      // 全てのタグに適用する場合はカテゴリー宣言の直後（タグ外）で指定する。
      // 2回以上同じカテゴリー内で宣言した場合、単純に追加される。
      const pathCheck = s.trim().match(/(?<=^path:).*(?=$)/);
      if(pathCheck !== null){
        const pathDescription = pathCheck[0];
        // 「;」が入ってる場合はNG
        if(pathDescription.match(/;/) === null){
          const pathNames = pathDescription.split(',');
          // 念のためtrimする
          for(const pathName of pathNames){
            if(pathName.trim().length === 0) continue;
            currentPath.push(pathName.trim());
          }
          continue;
        }
      }

      // 「<~~~>」の行。tagにはフラグを_で付与できる。_の後ろの1つだけ。なお<>のうしろに定義を置ける。
      // あとこの時点でなんらかのカテゴリーに入っていることが想定されている。
      const tagCheck = s.trim().match(/(?<=^\<).*(?=\>)/);
      if(tagCheck !== null){
        const splitted = tagCheck[0].split("_");
        const tagName = splitted[0];
        if(!tagNames[currentCategory].includes(tagName)){
          console.error("invalid tag name.");
          break;
        }
        currentTag = tagName;
        const flagName = (splitted.length > 1 ? splitted[1] : "");
        if(result[currentCategory][currentTag] === undefined){
          // その時のパスが適用される
          result[currentCategory][currentTag] = {flag:parseFlag(flagName, flagDefinition), content:[], path:[...currentPath]};
        }
        // 同じ行になんか書いてあったらそれも入れる感じ
        const sameLineDescription = s.trim().replace(/(?<=^\<).*(?=\>)/, "").replace("<>", "");
        if(sameLineDescription !== ""){
          result[currentCategory][currentTag].content.push(sameLineDescription);
        }
        continue;
      }

      if(currentCategory === "")continue;
      if(currentTag === "")continue;

      result[currentCategory][currentTag].content.push(s);
    }
    // resultの計算ここまで

    const parsed = {};

    for(const [category, categoryValue] of Object.entries(result)){
      parsed[category] = {};
      for(const [tag, tagValue] of Object.entries(categoryValue)){
        // flag, content, path, layoutMetaData, dict.
        parsed[category][tag] = parseTagDescription(tagValue, layout[category][tag], dict);
      }
    }

    return parsed;
  }

  // フラグのパース。
  // definitionが関数の場合はnameを解釈してなんか返す。何でもあり。
  // definitionがobjectの場合は列挙してある値をvalueとして付与して返す。無ければnull.
  // なおその場合空文字に対しては'default'が設定されていればそれを参照する。それでも名前は''とする。
  // 存在しない場合はnullとする。
  function parseFlag(name = "", definition = {}){
    // definitionは関数でもいいとしましょう。その場合は単純に関数を適用するだけです。
    if(typeof(definition) === 'function'){
      return definition(name);
    }

    // 以下、列挙の場合。
    const result = {name:name};
    // 定義が無い場合は、名前そのまんま
    // definitionが'object'ではない場合もこれにする。
    if(typeof(definition) !== 'object' || Object.keys(definition).length === 0){
      result.value = null;
      return result;
    }

    // ""の場合はdefaultを参照する。あればそれをvalueにおく。無ければnullで。
    const properName = (name === "" ? 'default' : name);
    result.value = (definition[properName] !== undefined ? definition[name] : null);

    return result;
  }

  function parseTagDescription(tagData, layoutMetaData, dict = {}){
    const {flag, content, path} = tagData;
    const {type} = layoutMetaData;
    const result = {flag};
    if(type === 'enum'){
      const properContent = [];
      // 「;」で区切る。あとでtrimして扱う。空行は無視される。
      for(const line of content){
        properContent.push(...line.split(";"));
      }
      result.content = parseEnumTagDescription(properContent, layoutMetaData, dict, path);
      return result;
    }
    if(type === 'text'){
      result.content = parseTextTagDescription(content);
      return result;
    }
  }

  // 記述の仕方には2通りある。
  // key名:value名
  // 半角スペース区切りでa b c ...
  // 混在させる場合は「,」で区切る。
  // つまりピンポイントで値を決めてもいいし順繰りに指定するのもありというわけ
  // なおkey名にpathは使えないですね...まあ使うこともないか。予約語なんてどんな環境にもあるからね。

  // 提案なんだけど、配列内で「,」って使用可能じゃん。セパレータなのに。
  // 「 」も使用可能にしてくれませんかね？その、可読性が...パースでなくしちゃえばいいと思うんだけど。
  // separateWithCommaで消しちゃえばいいと思う。
  function parseEnumTagDescription(content, metaData, dict, path){
    const result = [];
    const {keys = [], values = []} = metaData;
    for(const line of content){
      // 空行無視
      if(line.trim().length === 0) continue;
      // keysに従って順番に...
      const props = {};
      for(let i=0; i<keys.length; i++){
        props[keys[i]] = values[i];
      }
      // 「,」で区切る処理。内容的には配列内の「,」と区別するための面倒な処理。
      const descriptions = separateWithComma(line);
      for(let i=0; i<descriptions.length; i++){
        const description = descriptions[i].trim();
        if(description.match(/:/) !== null){
          const defs = description.split(":");
          props[defs[0]] = parseVariable(defs[1], dict, path);
        }else{
          const splitted = description.split(" ");
          for(let k=0; k<Math.min(keys.length, splitted.length); k++){
            props[keys[k]] = parseVariable(splitted[k], dict, path);
          }
        }
      }
      result.push(props);
    }
    return result;
  }

  // 「@」を使わない正規品
  // この時に配列内の半角スペースを排除することで、配列で半角スペースを使えるようにする。
  function separateWithComma(s){
    let parenthesisCount = 0;
    const properSplitted = [];
    let t = "";
    for(let i=0; i<s.length; i++){
      const letter = s[i];
      if(letter === '['){ parenthesisCount++; t += '['; continue; }
      if(letter === ']'){ parenthesisCount--; t += ']'; continue; }
      if(letter === ','){
        if(parenthesisCount === 0){
          // 外側の「,」はセパレータ
          properSplitted.push(t);
          t = "";
        }else{
          // 内側の「,」は通常の「,」とみなす
          t += ',';
        }
        continue;
      }
      // []内部の半角スペースを無視
      if(parenthesisCount > 0 && letter === ' '){ continue; }
      t += letter;
    }
    if(t !== ""){ properSplitted.push(t); }
    return properSplitted;
  }

  // @使うインチキをやめた正規品
  // 調べる順
  // 文字列->特殊ケース->数->配列
  function parseVariable(s, dict = {}, path = []){
    // 文字列の場合
    const isSingleQuote = s.match(/(?<=^\').*(?=\'$)/);
    if(isSingleQuote !== null){ return isSingleQuote[0]; }
    const isDoubleQuote = s.match(/(?<=^\").*(?=\"$)/);
    if(isDoubleQuote !== null){ return isDoubleQuote[0]; }
    const isBackQuote = s.match(/(?<=^\`).*(?=\`$)/);
    if(isBackQuote !== null){ return isBackQuote[0]; }

    // 特殊ケース
    if(s === "true"){ return true; }
    if(s === "false"){ return false; }
    if(s === "NaN"){ return NaN; }
    if(s === "null"){ return null; }
    if(s === "undefined"){ return undefined; }
    if(s === "Infinity"){ return Infinity; }
    if(s === "-Infinity"){ return -Infinity; }

    // 数の場合
    const isNumber = s.match(/^[0-9xeob\+\-\.].*$/);
    if((isNumber !== null) && !isNaN(Number(s))){ return Number(s); }

    // 配列の場合
    const isParenthesis = s.match(/(?<=^\[).*(?=\]$)/);
    // 配列でないなら処理は終わり
    if(isParenthesis === null){
      return applyDict(s, dict, path);
    }else{
      const t = isParenthesis[0];

      let parenthesisCount = 0;
      let parenthesisIsValid = true;
      const properSplitted = [];
      let ss = "";

      for(let i=0; i<t.length; i++){
        const letter = t[i];
        if(letter==='['){
          parenthesisCount++;
          ss += '[';
          continue;
        }
        if(letter===']'){
          parenthesisCount--;
          // 負になる可能性があるのはここだけ
          if(parenthesisCount < 0){
            parenthesisIsValid = false;
            break;
          }
          ss += ']';
          continue;
        }
        if(letter===','){
          if(parenthesisCount === 0){
            // 外部の「,」はセパレータとみなす
            // 確定
            properSplitted.push(ss);
            ss = "";
          }else{
            // 内部の「,」は普通に「,」とみなす
            ss += ',';
          }
          continue;
        }
        ss += letter;
      }
      // 最後にできたssも確定させる
      if(ss !== ""){
        properSplitted.push(ss);
      }

      // 配列もどきの場合（例：'[[0,1,2]'）
      // parenthesisCountが0でない -> そのまま文字列出力
      // parenthesisIsValidがfalse -> そのまま文字列出力
      if(parenthesisCount !== 0){ return applyDict(s, dict, path); }
      if(!parenthesisIsValid){ return applyDict(s, dict, path); }

      // 各々の成分に再帰処理
      return properSplitted.map((x) => parseVariable(x, dict, path));
    }

    // それ以外。
    return applyDict(s, dict, path);
  }

  /*
   const a = {b:{c:0,d:1,hohoho:999}};
   console.log(a['b']['c']); // 0
   存在しない場合にnullを返す改訂版
   const value = 'b.hohoho'.split('.').reduce((cur, next) => {
     if(cur === null || cur[next] === undefined){ return null; }
     return cur[next];
   }, a);
   console.log(value); // 999
  */

  // まあdictが先だろ。普通pathなんか使わんし。あると便利だけど。
  function applyDict(s, dict = {}, path = []){
    // dictを見る
    const dictCheck = s.split('.').reduce((cur, next) => {
     if(cur === null || cur[next] === undefined){ return null; }
     return cur[next];
    }, dict);
    if(dictCheck !== null){
     return dictCheck;
    }
    // pathを見る
    for(let i=0; i<path.length; i++){
     const pathCheck = s.split('.').reduce((cur, next) => {
       if(cur === null || cur[next] === undefined){ return null; }
       return cur[next];
     }, dict[path[i]]);
     if(pathCheck !== null){
       return pathCheck;
     }
    }
    // 通常文字列
    return s;
  }

  function parseTextTagDescription(lines){
    // ホワイトスペースの最小値を確認
    let whiteSpaceCount = Infinity;
    for(let i=0; i<lines.length; i++){
      const line = lines[i];
      if(line.trim() === '') continue;
      whiteSpaceCount = Math.min(whiteSpaceCount, line.match(/^\s*/)[0].length);
    }
    const modifiedLines = [];
    // 頭から最小分のスペースを削除。いわゆる「左詰め」
    const spaceRemover = new RegExp(`^\\s{${whiteSpaceCount}}`);
    for(let i=0; i<lines.length; i++){
      const line = lines[i];
      if(line.trim().length === 0){ modifiedLines.push(''); continue; }
      const modifiedLine = line.replace(spaceRemover, '');
      modifiedLines.push(modifiedLine);
    }
    // くっつける
    const reducedText = modifiedLines.reduce((s, t) => s.concat(t).concat('\n'), ``);
    // コメント化
    const result = reducedText.replaceAll(/(?<=.*)# .*(?=$|\n)/g, (t) => t.replace('#', '//'));
    return result;
  }

  parser.parseDesignDescription = parseDesignDescription;
  parser.parseVariable = parseVariable;

  return parser;
})();
