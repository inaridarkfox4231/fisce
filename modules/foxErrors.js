const foxErrors = (function(){
  const errors = {};

  // E_Type.
  // タイプ関連のエラーを扱う。jsは関数の仕様によっては型チェックしないので。それが便利な場合もあるけどね。
  class E_Type extends Error{
    constructor(data, ...params){
      super(...params);
      // nameとvalueの既定値は不要でしょう。混乱の原因になる。
      const {name, value, info = ""} = data;
      this.type = 'E_Type';
      this.variable_name = name;
      this.variable_value = value;
      this.info = info;
    }
    show(){
      console.error(`種類：${this.type}, 変数名：${this.variable_name}, 変数の値：${this.variable_value}, 詳細：${this.info}`);
    }
  }

  // WebGLのgetErrorのラッパ関数。単にErrorだと分かりにくいのでgetWebGLErrorとする。
  // 結局これしか取得できないので、このまま供用してしまおう。メッセージ出ないんですよ...
  // codeとinfoに分かれているのはcodeを見て0ならスルー、0でないならそこで切る、といったことができると嬉しいので。
  function getWebGLError(gl){
    const errCode = gl.getError();
    switch(errCode){
      case gl.NO_ERROR:
        return {code:gl.NO_ERROR, info: "NO_ERROR: エラーはありません"};
      case gl.INVALID_ENUM:
        return {code:gl.INVALID_ENUM, info: "INVALID_ENUM: 不正な値が設定されました"};
      case gl.INVALID_VALUE:
        return {code:gl.INVALID_VALUE, info: "INVALID_VALUE: 値の範囲が不正です"};
      case gl.INVALID_OPERATION:
        return {code:gl.INVALID_OPERATION, info:"INVALID_OPERATION: その処理は許可されていません"};
      case gl.INVALID_FRAMEBUFFER_OPERATION:
        return {code:gl.INVALID_FRAMEBUFFER_OPERATION, info: "INVALID_FRAMEBUFFER_OPERATION: framebufferの設定に問題がある可能性があります"};
      case gl.OUT_OF_MEMORY:
        return {code:gl.OUT_OF_MEMORY, info: "OUT_OF_MEMORY: メモリ不足です"};
      case gl.CONTEXT_LOST_WEBGL:
        return {code:gl.CONTEXT_LOST_WEBGL, info: "CONTEXT_LOST_WEBGL: コンテキストが破棄されました"};
    }
    return ""; // empty string
  }

  errors.E_Type = E_Type;
  errors.getWebGLError = getWebGLError;

  return errors;
})();
