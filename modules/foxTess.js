
  const foxTess = (function(){
    // special thanks: https://github.com/brendankenny/libtess.js
    /*
     Copyright 2000, Silicon Graphics, Inc. All Rights Reserved.
     Copyright 2015, Google Inc. All Rights Reserved.

     Permission is hereby granted, free of charge, to any person obtaining a copy
     of this software and associated documentation files (the "Software"), to
     deal in the Software without restriction, including without limitation the
     rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
     sell copies of the Software, and to permit persons to whom the Software is
     furnished to do so, subject to the following conditions:

     The above copyright notice including the dates of first publication and
     either this permission notice or a reference to http://oss.sgi.com/projects/FreeB/
     shall be included in all copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
     SILICON GRAPHICS, INC. BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
     IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

     Original Code. The Original Code is: OpenGL Sample Implementation,
     Version 1.2.1, released January 26, 2000, developed by Silicon Graphics,
     Inc. The Original Code is Copyright (c) 1991-2000 Silicon Graphics, Inc.
     Copyright in any portions created by third parties is as indicated
     elsewhere herein. All Rights Reserved.
    */
    const tess = {};

    let tessy, tessEnums, tessRules, tessTypes;

    const tessCallbacks = {
      vertex:(data, polyVertArray) => {},
      begin:(type) => {},
      error:(errno) => {},
      combine:(coords, data, weight) => {},
      edge:(flag) => {}
    };

    function initTessy(lib){

      tessy = new lib.GluTesselator();
      tessy.loops = [];
      tessy.size = 2; // 準備。
      tessEnums = lib.gluEnum;
      tessRules = lib.windingRule;
      tessTypes = lib.primitiveType;

      // function called for each vertex of tesselator output
      function cb_vertex(data, polyVertArray) {
        // こっちはしっかりsize長さで取得できるよ。
        tessCallbacks.vertex(data, polyVertArray);
        polyVertArray.push(...data.slice(0, tessy.size));
        if(tessy.loops.length > 0){
          tessy.loops[tessy.loops.length-1].push(...data.slice(0, tessy.size));
        }
      }
      function cb_begin(type) {
        // ここで区切りがつくので、ここで区切るたびにcontourを分離すればいいみたいです。
        tessCallbacks.begin(type);
        if(type === tessTypes.GL_LINE_LOOP){
          tessy.loops.push([]);
        }
      }
      function cb_error(errno) {
        tessCallbacks.error(errno);
        console.error(`error number: ${errno}`);
      }
      // callback for when segments intersect and must be split
      // coordsはサイズの個数でいいっぽい
      // 与えられる段階では長さ3みたいなので、適宜増やす必要がある。dataはちゃんとsize長さの配列が入ってる。
      function cb_combine(coords, data, weight) {
        tessCallbacks.combine(coords, data, weight);
        return coords.slice(0, tessy.size);
      }
      function cb_edge(flag) {
        tessCallbacks.edge(flag);
      }

      tessy.gluTessCallback(tessEnums.GLU_TESS_VERTEX_DATA, cb_vertex);
      tessy.gluTessCallback(tessEnums.GLU_TESS_BEGIN, cb_begin);
      tessy.gluTessCallback(tessEnums.GLU_TESS_ERROR, cb_error);
      tessy.gluTessCallback(tessEnums.GLU_TESS_COMBINE, cb_combine);
      tessy.gluTessCallback(tessEnums.GLU_TESS_EDGE_FLAG, cb_edge);
    }

    // combineのcallbackで使う補助関数。
    function tessLerp(coords, data, weight, n, name = ""){
      if(name === ""){
        coords[n] = data[0][n]*weight[0] + data[1][n]*weight[1] + data[2][n]*weight[2] + data[3][n]*weight[3];
        return;
      }
      coords[n][name] = data[0][n][name]*weight[0] + data[1][n][name]*weight[1] + data[2][n][name]*weight[2] + data[3][n][name]*weight[3];
    }

    /*
      step1: 点列を生成（id:通し番号、rep:代表）
      step2: x,yでsort
      step3: idからソート後の位置を取得する辞書を作る
      step4: マージ後の点列を作ると同時にその元を代表として元の点列に登録する
      step5: 辞書を使ってid -> ソート後の位置 -> そこにある点 -> の、代表 -> の、idという形でindex配列を生成
      step6: v:マージ後の点列、f:indicesという形で出力。マージ後の点列のidもなんかの役には立つだろう。おわり。
    */
    // size=2の場合がデフォルト。size>2の場合はそのデータは別に使わないが...
    // 0,1がいっしょであれば同じ値になることが保証されているので、一つ取ればOKだと思います。
    function _mergeVerts(data, size = 2){
      const points = [];
      for(let k=0; k < data.length; k+=size){
        // 追加分はまとめてzにぶち込む
        const newP = {x:data[k], y:data[k+1], z:data.slice(k+2, k+size), id:points.length, rep:null};
        points.push(newP);
      }

      points.sort((p, q) => {
        if(p.x < q.x){
          return -1;
        }
        if(p.x == q.x && p.y < q.y){
          return -1;
        }
        return 0;
      });

      const idDict = new Array(points.length);
      for(let k=0; k < points.length; k++){
        idDict[points[k].id] = k;
      }

      const mergedPoints = [];
      const registPoint = (p, flag) => {
        if(flag){
          // zも全部一緒なので一つ取ればOK
          const newP = {x:p.x, y:p.y, z:p.z, id:mergedPoints.length};
          p.rep = newP;
          mergedPoints.push(newP);
          return;
        }
        const rep = mergedPoints[mergedPoints.length-1];
        p.rep = rep;
      }
      for(let k=0; k < points.length; k++){
        if(k === 0){
          registPoint(points[0], true);
        }else{
          const cur = points[k];
          const prev = points[k-1];
          if(cur.x !== prev.x || cur.y !== prev.y){
            registPoint(points[k], true);
          }else{
            registPoint(points[k], false);
          }
        }
      }

      const faceIndices = [];
      for(let k=0; k < points.length; k++){
        faceIndices.push(points[idDict[k]].rep.id);
      }

      return {v:mergedPoints, f:faceIndices};
    }

    function triangulate(contours, options = {}) {
      const {boundaryOnly = false, rule = "odd", showPerformance = false, merge = false, size = 2} = options;
      // libtess will take 3d verts and flatten to a plane for tesselation
      // since only doing 2d tesselation here, provide z=1 normal to skip
      // iterating over verts only to get the same answer.
      // comment out to test normal-generation code
      tessy.gluTessNormal(0, 0, 1);
      tessy.size = size; // triangulateのたびにsizeを設定してTessyで使う

      const startTime0 = window.performance.now();
      const triangleVerts = [];
      tessy.gluTessBeginPolygon(triangleVerts);

      for (let i = 0; i < contours.length; i++) {
        tessy.gluTessBeginContour();
        const contour = contours[i];
        for (let j = 0; j < contour.length; j += size) {
          // coordsはサイズの個数でいいっぽい
          const coords = contour.slice(j, j+size);
          tessy.gluTessVertex(coords, coords);
        }
        tessy.gluTessEndContour();
      }

      if(showPerformance){
        console.log(`preparation elapsed:${window.performance.now()-startTime0} milli seconds.`);
      }
      const startTime1 = window.performance.now();

      tessy.loops.length = 0;

      switch(rule){
        case "odd": // evenodd. 奇数のみ。
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_ODD); break;
        case "nonzero": // 0でない場合（一部のフォントパスなどはこれを使う）
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_NONZERO); break;
        case "positive": // 正のみ
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_POSITIVE); break;
        case "negative": // 負のみ
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_NEGATIVE); break;
        case "abs_geq_two": // 絶対値が2以上
          tessy.gluTessProperty(tessEnums.GLU_TESS_WINDING_RULE, tessRules.GLU_TESS_WINDING_ABS_GEQ_TWO); break;
      }

      tessy.gluTessProperty(tessEnums.GLU_TESS_BOUNDARY_ONLY, boundaryOnly);
      tessy.gluTessEndPolygon();

      if(showPerformance){
        console.log(`tessellation elapsed:${window.performance.now()-startTime1} milli seconds.`);
      }

      if(boundaryOnly){
        const result = [];
        for(const eachLoop of tessy.loops){
          result.push(eachLoop.slice());
        }
        return result;
      }

      if(merge){
        // マージする。重複点排除。boundaryの場合は不要。{v,f}
        // vは{x,y,id}の形でマージ後の点列が入ってる。fはそれに準じる形で三角形のindexの配列、つまり面の数は不変。点が減るだけ。
        // sizeを渡す。
        return _mergeVerts(triangleVerts, size);
      }

      return triangleVerts;
    }

    tess.tessy = tessy;
    tess.tessEnums = tessEnums;
    tess.tessRules = tessRules;
    tess.tessTypes = tessTypes;
    tess.initTessy = initTessy; // 必須。libtessを渡して初期化する。
    tess.tessLerp = tessLerp; // combineのcallbackで使う。
    tess.tessCallbacks = tessCallbacks;
    tess.triangulate = triangulate;

    return tess;
  })();
