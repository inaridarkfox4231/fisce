const webglUtils = (function(){
  const utils = {};
  const {parseDesignDescription} = foxParse;
  const {Vecta, MT3, MT4, Quarternion} = fox3Dtools;

  // gl定数
  const gls = {
    depth_buffer_bit: 256,
    stencil_buffer_bit: 1024,
    color_buffer_bit: 16384,
    points: 0,
    lines: 1,
    line_loop: 2,
    line_strip: 3,
    triangles: 4,
    triangle_strip: 5,
    triangle_fan: 6,
    zero: 0,
    one: 1,
    src_color: 768,
    one_minus_src_color: 769,
    src_alpha: 770,
    one_minus_src_alpha: 771,
    dst_alpha: 772,
    one_minus_dst_alpha: 773,
    dst_color: 774,
    one_minus_dst_color: 775,
    src_alpha_saturate: 776,
    constant_color: 32769,
    one_minus_constant_color: 32770,
    constant_alpha: 32771,
    one_minus_constant_alpha: 32772,
    func_add: 32774,
    func_subtract: 32778,
    func_reverse_subtract: 32779,
    static_draw: 35044,
    stream_draw: 35040,
    dynamic_draw: 35048,
    array_buffer: 34962,
    element_array_buffer: 34963,
    buffer_size: 34660,
    buffer_usage: 34661,
    current_vertex_attrib: 34342,
    vertex_attrib_array_enabled: 34338,
    vertex_attrib_array_size: 34339,
    vertex_attrib_array_stride: 34340,
    vertex_attrib_array_type: 34341,
    vertex_attrib_array_normalized: 34922,
    vertex_attrib_array_pointer: 34373,
    vertex_attrib_array_buffer_binding: 34975,
    cull_face: 2884,
    front: 1028,
    back: 1029,
    front_and_back: 1032,
    blend: 3042,
    depth_test: 2929,
    dither: 3024,
    polygon_offset_fill: 32823,
    sample_alpha_to_coverage: 32926,
    sample_coverage: 32928,
    scissor_test: 3089,
    stencil_test: 2960,
    byte: 5120,
    unsigned_byte: 5121,
    short: 5122,
    unsigned_short: 5123,
    int: 5124,
    unsigned_int: 5125,
    float: 5126,
    depth_component: 6402,
    alpha: 6406,
    rgb: 6407,
    rgba: 6408,
    luminance: 6409,
    luminance_alpha: 6410,
    unsigned_byte: 5121,
    unsigned_short_4_4_4_4: 32819,
    unsigned_short_5_5_5_1: 32820,
    unsigned_short_5_6_5: 33635,
    fragment_shader: 35632,
    vertex_shader: 35633,
    compile_status: 35713,
    delete_status: 35712,
    link_status: 35714,
    validate_status: 35715,
    attached_shaders: 35717,
    active_attributes: 35721,
    active_uniforms: 35718,
    max_vertex_attribs: 34921,
    max_vertex_uniform_vectors: 36347,
    max_varying_vectors: 36348,
    max_combined_texture_image_units: 35661,
    max_vertex_texture_image_units: 35660,
    max_texture_image_units: 34930,
    max_fragment_uniform_vectors: 36349,
    shader_type: 35663,
    shading_language_version: 35724,
    current_program: 35725,
    never: 512,
    less: 513,
    equal: 514,
    lequal: 515,
    greater: 516,
    notequal: 517,
    gequal: 518,
    always: 519,
    keep: 7680,
    replace: 7681,
    incr: 7682,
    decr: 7683,
    invert: 5386,
    incr_wrap: 34055,
    decr_wrap: 34056,
    nearest: 9728,
    linear: 9729,
    nearest_mipmap_nearest: 9984,
    linear_mipmap_nearest: 9985,
    nearest_mipmap_linear: 9986,
    linear_mipmap_linear: 9987,
    texture_mag_filter: 10240,
    texture_min_filter: 10241,
    texture_wrap_s: 10242,
    texture_wrap_t: 10243,
    texture_2d: 3553,
    texture: 5890,
    texture_cube_map: 34067,
    texture_binding_cube_map: 34068,
    texture_cube_map_positive_x: 34069,
    texture_cube_map_negative_x: 34070,
    texture_cube_map_positive_y: 34071,
    texture_cube_map_negative_y: 34072,
    texture_cube_map_positive_z: 34073,
    texture_cube_map_negative_z: 34074,
    max_cube_map_texture_size: 34076,
    texture0: 33984,
    texture1: 33985,
    texture2: 33986,
    texture3: 33987,
    texture4: 33988,
    texture5: 33989,
    texture6: 33990,
    texture7: 33991,
    texture8: 33992,
    texture9: 33993,
    texture10: 33994,
    texture11: 33995,
    texture12: 33996,
    texture13: 33997,
    texture14: 33998,
    texture15: 33999,
    texture16: 34000,
    texture17: 34001,
    texture18: 34002,
    texture19: 34003,
    texture20: 34004,
    texture21: 34005,
    texture22: 34006,
    texture23: 34007,
    texture24: 34008,
    texture25: 34009,
    texture26: 34010,
    texture27: 34011,
    texture28: 34012,
    texture29: 34013,
    texture30: 34014,
    texture31: 34015,
    active_texture: 34016,
    repeat: 10497,
    clamp_to_edge: 33071,
    mirrored_repeat: 33648,
    float_vec2: 35664,
    float_vec3: 35665,
    float_vec4: 35666,
    int_vec2: 35667,
    int_vec3: 35668,
    int_vec4: 35669,
    bool: 35670,
    bool_vec2: 35671,
    bool_vec3: 35672,
    bool_vec4: 35673,
    float_mat2: 35674,
    float_mat3: 35675,
    float_mat4: 35676,
    sampler_2d: 35678,
    sampler_cube: 35680,
    red: 6403,
    rgb8: 32849,
    rgba8: 32856,
    rgb10_a2: 32857,
    texture_3d: 32879,
    texture_wrap_r: 32882,
    texture_min_lod: 33082,
    texture_max_lod: 33083,
    texture_base_level: 33084,
    texture_max_level: 33085,
    texture_compare_mode: 34892,
    texture_compare_func: 34893,
    srgb: 35904,
    srgb8: 35905,
    srgb8_alpha8: 35907,
    compare_ref_to_texture: 34894,
    rgba32f: 34836,
    rgb32f: 34837,
    rgba16f: 34842,
    rgb16f: 34843,
    texture_2d_array: 35866,
    texture_binding_2d_array: 35869,
    r11f_g11f_b10f: 35898,
    rgb9_e5: 35901,
    rgba32ui: 36208,
    rgb32ui: 36209,
    rgba16ui: 36214,
    rgb16ui: 36215,
    rgba8ui: 36220,
    rgb8ui: 36221,
    rgba32i: 36226,
    rgb32i: 36227,
    rgba16i: 36232,
    rgb16i: 36233,
    rgba8i: 36238,
    rgb8i: 36239,
    red_integer: 36244,
    rgb_integer: 36248,
    rgba_integer: 36249,
    r8: 33321,
    rg8: 33323,
    r16f: 33325,
    r32f: 33326,
    rg16f: 33327,
    rg32f: 33328,
    r8i: 33329,
    r8ui: 33330,
    r16i: 33331,
    r16ui: 33332,
    r32i: 33333,
    r32ui: 33334,
    rg8i: 33335,
    rg8ui: 33336,
    rg16i: 33337,
    rg16ui: 33338,
    rg32i: 33339,
    rg32ui: 33340,
    r8_snorm: 36756,
    rg8_snorm: 36757,
    rgb8_snorm: 36758,
    rgba8_snorm: 36759,
    rgb10_a2ui: 36975,
    texture_immutable_format: 37167,
    texture_immutable_levels: 33503,
    float_mat2x3: 35685,
    float_mat2x4: 35686,
    float_mat3x2: 35687,
    float_mat3x4: 35688,
    float_mat4x2: 35689,
    float_mat4x3: 35690,
    unsigned_int_vec2: 36294,
    unsigned_int_vec3: 36295,
    unsigned_int_vec4: 36296,
    unsigned_normalized: 35863,
    signed_normalized: 36764,
    depth_component24: 33190,
    stream_read: 35041,
    stream_copy: 35042,
    static_read: 35045,
    static_copy: 35046,
    dynamic_read: 35049,
    dynamic_copy: 35050,
    depth_component32f: 36012,
    depth32f_stencil8: 36013,
    invalid_index: 4294967295,
    timeout_ignored: -1,
    max_client_wait_timeout_webgl: 37447,
    cube_px: 34069,
    cube_nx: 34070,
    cube_py: 34071,
    cube_ny: 34072,
    cube_pz: 34073,
    cube_nz: 34074,
    ubyte: 5121,
    ushort: 5123,
    uint: 5125,
    mat2x3: 35685,
    mat2x4: 35686,
    mat3x2: 35687,
    mat3x4: 35688,
    mat4x2: 35689,
    mat4x3: 35690,
    vec2: 35664,
    vec3: 35665,
    vec4: 35666,
    ivec2: 35667,
    ivec3: 35668,
    ivec4: 35669,
    bvec2: 35671,
    bvec3: 35672,
    bvec4: 35673,
    mat2: 35674,
    mat3: 35675,
    mat4: 35676,
    sampler2D: 35678,
    sampler3D: 35679,
    samplerCube: 35680,
    sampler2DArray: 36289,
    DBB: 256,
    SBB: 1024,
    CBB: 16384,
  };

  // 運用上は「glEnum」という関数にしよう。そんで、数の場合はそのまま。
  // 余談ですが「enum」という変数名はタブーなので使わないように...「glEnum」はセーフのようです。まあぎりぎりね。
  function glEnum(value = '', defaultValue = 0){
    // 数の場合はそのまま返す
    if(typeof(value) === 'number'){ return value; }
    // stringの場合は検索して返す。undefinedの場合はデフォルト値が返る。
    // さらにデフォルト値に対しても、stringであればglsから返せるようにする。
    if(typeof(value) === 'string'){
      const v = gls[value];
      if(v !== undefined){ return v; }
    }
    if(typeof(defaultValue) === 'number'){ return defaultValue; }
    // typoですね。stringがstirngになってた。それで-1が返ったのか。
    if(typeof(defaultValue) === 'string'){
      const d = gls[defaultValue];
      if(d !== undefined){ return d; }
    }
    return -1;
  }
  // 運用事例：const drawCallEnum = glEnum(drawCall, 'triangles');

  const glt = {
    Int8Array:Int8Array,
    Uint8Array:Uint8Array,
    Uint8ClampedArray:Uint8ClampedArray,
    Int16Array:Int16Array,
    Uint16Array:Uint16Array,
    Int32Array:Int32Array,
    Uint32Array:Uint32Array,
    Float32Array:Float32Array,
    Float64Array:Float64Array,
    BigInt64Array:BigInt64Array,
    BigUint64Array:BigUint64Array,
    TypedArray:Object.getPrototypeOf(Float32Array),
    isTypedArray: (value) => { return Object.getPrototypeOf(value) === glt.TypedArray; }
  };

  // 'Float32Array' -> Float32Array
  function glTypedArray(value = '', defaultValue = Float32Array){
    // 型付配列の場合はそのまま返す
    if(glt.isTypedArray(value)){ return value; }
    // 文字列の場合は調べてそれを返す。
    if(typeof(value) === 'string'){
      const v = glt[value];
      if(v !== undefined){ return v; }
    }
    // 無い場合はdefaultが返る。文字列の場合とそうでない場合で分ける
    if(glt.isTypedArray(defaultValue)){ return defaultValue; }
    if(typeof(defaultValue) === 'string'){
      const d = glt[defaultValue];
      if(d !== undefined){ return d; }
    }
    return null;
  }

  class UniformWrapper{
    constructor(gl, pg, uniform, location){
      this.gl = gl;
      this.pg = pg;
      this.name = uniform.name;
      // uniformBlock関連の場合locationがnullになるので、それを回避するために引数にlocationを追加しました。
      this.location = location;
      //this.location = gl.getUniformLocation(pg, this.name);
      // typeはここでvec3とかmat2x4とかにする。
      this.type = UniformWrapper.parseUniformType(gl, uniform.type);
      // size. 1,2,3,4とか。samplerは1でいいっすね。matは2x3とかにする。つまり文字列。サイズ文字列。
      // uniform.sizeははっきり言って使い道が無いので無視。typeはパース後の文字列を使う。当然ですが。
      this.size = UniformWrapper.parseUniformSize(gl, this.type);
      const splittedName = this.name.split(".");
      const tail = splittedName.at(-1);
      // 配列かどうか
      this.isArray = (tail.match(/[0]/) !== null);
      // 行列かどうか（行列はいずれにせよ配列を使うんで、バリデーションで失敗するのを防ぐ）
      this.isMatrix = (this.type.match(/mat/) !== null);
      // 関数登録
      this.uniformFunction = UniformWrapper.getUniformFunction(gl, this.location, this.size, this.type, this.isArray);
    }
    setValue(value){
      // 配列が来るんで、ばらすかどうか決める。
      // 構造体の場合はObjectを指定するが、ここにObjectが来ることはない。
      // なお行列の場合は配列「ではない」場合でも配列を用意するので、そこだけ注意する。サンプラはそもそも配列にできない。
      if(this.isArray || this.isMatrix){
        this.uniformFunction(value);
      }else{
        this.uniformFunction(...value);
      }
    }
    show(){
      const detail = `name:${this.name}, size:${this.size}, type:${this.type}, isArray:${this.isArray}, isMatrix:${this.isMatrix}`;
      console.log(detail);
      return detail;
    }
    getValue(index = 0){
      // 値取得の関数があったはずなので一応用意しとく。
      // 配列の場合、まとめて取得することはできない。ロケーションをあらかじめ用意しておくのは冗長なので、その場で取得する。
      if(this.isArray){
        const properName = this.name.replace(/(?<=.*)\[[0-9]{1}\](?=$)/, `[${index}]`);
        const tmpLocation = this.gl.getUniformLocation(this.pg, properName);
        return this.gl.getUniform(this.pg, tmpLocation);
      }else{
        return this.gl.getUniform(this.pg, this.location);
      }
      return null;
    }
    static create(gl, pg, uniform, location){
      return new this(gl, pg, uniform, location);
    }
    static parseUniformType(gl, type){
      switch(type){
        case gl.FLOAT: return 'float1';
        case gl.FLOAT_VEC2: return 'float2';
        case gl.FLOAT_VEC3: return 'float3';
        case gl.FLOAT_VEC4: return 'float4';
        case gl.INT: return 'int1';
        case gl.INT_VEC2: return 'int2';
        case gl.INT_VEC3: return 'int3';
        case gl.INT_VEC4: return 'int4';
        case gl.UNSIGNED_INT: return 'uint1';
        case gl.UNSIGNED_INT_VEC2: return 'uint2';
        case gl.UNSIGNED_INT_VEC3: return 'uint3';
        case gl.UNSIGNED_INT_VEC4: return 'uint4';
        case gl.BOOL: return 'bool1';
        case gl.BOOL_VEC2: return 'bool2';
        case gl.BOOL_VEC3: return 'bool3';
        case gl.BOOL_VEC4: return 'bool4';
        case gl.SAMPLER_2D: return 'sampler2D';
        case gl.SAMPLER_3D: return 'sampler3D';
        case gl.SAMPLER_CUBE: return 'samplerCube';
        case gl.SAMPLER_2D_ARRAY: return 'sampler2DArray';
        case gl.FLOAT_MAT2: return 'mat2';
        case gl.FLOAT_MAT3: return 'mat3';
        case gl.FLOAT_MAT4: return 'mat4';
        case gl.FLOAT_MAT2x3: return 'mat2x3';
        case gl.FLOAT_MAT2x4: return 'mat2x4';
        case gl.FLOAT_MAT3x2: return 'mat3x2';
        case gl.FLOAT_MAT3x4: return 'mat3x4';
        case gl.FLOAT_MAT4x2: return 'mat4x2';
        case gl.FLOAT_MAT4x3: return 'mat4x3';
      }
      return 'null';
    }
    static parseUniformSize(gl, type){
      // samplerは1で。
      if(type.match(/sampler/) !== null){ return '1'; }
      // matはそれ以降
      if(type.match(/mat/) !== null){
        return type.match(/(?<=mat).*/)[0];
      }
      // 他の場合は単純に数を取る
      const numbers = type.match(/[0-9]{1}/);
      if(numbers === null){ return null; }
      return numbers[0];
    }
    static getUniformFunction(gl, location, size, type, isArray = false){
      if(type.match(/float/) !== null){
        if(!isArray){
          switch(size){
            case '1': return (v0) => { gl.uniform1f(location, v0); }
            case '2': return (v0, v1) => { gl.uniform2f(location, v0, v1); }
            case '3': return (v0, v1, v2) => { gl.uniform3f(location, v0, v1, v2); }
            case '4': return (v0, v1, v2, v3) => { gl.uniform4f(location, v0, v1, v2, v3); }
          }
        }else{
          switch(size){
            case '1': return (data) => { gl.uniform1fv(location, data); }
            case '2': return (data) => { gl.uniform2fv(location, data); }
            case '3': return (data) => { gl.uniform3fv(location, data); }
            case '4': return (data) => { gl.uniform4fv(location, data); }
          }
        }
      }
      if(type.match(/int/) !== null || type.match(/bool/) !== null){
        if(!isArray){
          switch(size){
            case '1': return (i0) => { gl.uniform1i(location, i0); }
            case '2': return (i0, i1) => { gl.uniform2i(location, i0, i1); }
            case '3': return (i0, i1, i2) => { gl.uniform3i(location, i0, i1, i2); }
            case '4': return (i0, i1, i2, i3) => { gl.uniform4i(location, i0, i1, i2, i3); }
          }
        }else{
          switch(size){
            case '1': return (data) => { gl.uniform1iv(location, data); }
            case '2': return (data) => { gl.uniform2iv(location, data); }
            case '3': return (data) => { gl.uniform3iv(location, data); }
            case '4': return (data) => { gl.uniform4iv(location, data); }
          }
        }
      }
      if(type.match(/uint/) !== null){
        if(!isArray){
          switch(size){
            case '1': return (ui0) => { gl.uniform1ui(location, ui0); }
            case '2': return (ui0, ui1) => { gl.uniform2ui(location, ui0, ui1); }
            case '3': return (ui0, ui1, ui2) => { gl.uniform3ui(location, ui0, ui1, ui2); }
            case '4': return (ui0, ui1, ui2, ui3) => { gl.uniform4ui(location, ui0, ui1, ui2, ui3); }
          }
        }else{
          switch(size){
            case '1': return (data) => { gl.uniform1uiv(location, data); }
            case '2': return (data) => { gl.uniform2uiv(location, data); }
            case '3': return (data) => { gl.uniform3uiv(location, data); }
            case '4': return (data) => { gl.uniform4uiv(location, data); }
          }
        }
      }
      if(type.match(/sampler/) !== null){
        return (i0) => { gl.uniform1i(location, i0); }
      }
      if(type.match(/mat/) !== null){
        switch(size){
          case '2': return (data) => { gl.uniformMatrix2fv(location, false, data); }
          case '3': return (data) => { gl.uniformMatrix3fv(location, false, data); }
          case '4': return (data) => { gl.uniformMatrix4fv(location, false, data); }
          case '2x3': return (data) => { gl.uniformMatrix2x3fv(location, false, data); }
          case '2x4': return (data) => { gl.uniformMatrix2x4fv(location, false, data); }
          case '3x2': return (data) => { gl.uniformMatrix3x2fv(location, false, data); }
          case '3x4': return (data) => { gl.uniformMatrix3x4fv(location, false, data); }
          case '4x2': return (data) => { gl.uniformMatrix4x2fv(location, false, data); }
          case '4x3': return (data) => { gl.uniformMatrix4x3fv(location, false, data); }
        }
      }
      return () => {};
    }
  }

  class ProgramWrapper{
    constructor(gl, params = {}){
      this.gl = gl;
      // nameを付けることでバグっているshaderを探しやすくする
      const {
        vs, fs, name = "default", layout = {},
        outVaryings = [], separate = true, uboLayout = {}
      } = params;
      this.vs = vs;
      this.fs = fs;
      this.vsShader = null;
      this.fsShader = null;
      this.name = name;
      this.layout = layout;
      this.outVaryings = outVaryings;
      this.separate = separate;
      this.uboLayout = uboLayout;
      this.uniforms = {}; // uniform
      this.attributes = {}; // attribute
      this.program = null;
    }
    compile(){
      const {gl, vs, fs} = this;
      const vsShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vsShader, vs);
      gl.compileShader(vsShader);

      if(!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:create vertex shader failed...`);
        const infoLog = gl.getShaderInfoLog(vsShader);
        console.error(infoLog);
        return this;
      }
      this.vsShader = vsShader;

      const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fsShader, fs);
      gl.compileShader(fsShader);

      if(!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)){
        console.log(`${name}:create fragment shader failed...`);
        const infoLog = gl.getShaderInfoLog(fsShader);
        console.error(infoLog);
        return this;
      }
      this.fsShader = fsShader;

      return this;
    }
    attach(){
      const {gl, vsShader, fsShader} = this;
      const program = gl.createProgram();
      gl.attachShader(program, vsShader);
      gl.attachShader(program, fsShader);
      this.program = program;
      return this;
    }
    link(){
      const {gl, program, layout, outVaryings, separate} = this;

      // この辺の処理はアタッチしてからリンクするまでに実行する
      ProgramWrapper.setAttributeLayout(gl, program, layout);
      ProgramWrapper.setOutVaryings(gl, program, outVaryings, separate);

      gl.linkProgram(this.program);

      if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        console.log(`${this.name}: link failed...`);
        const infoLog = gl.getProgramInfoLog(program);
        console.error(infoLog);
        return this;
      }
      console.log(`${this.name} created successfully.`);

      // この処理はリンク済みでなければ実行できない！知らんかったわ。
      // あとから変更できるようにインスタンスメソッドにしよう。
      this.setUBOLayout();

      return this;
    }
    registActiveUniforms(showInformation = false){
      const {gl, program} = this;
      this.uniforms = {};
      // active uniformの個数を取得。
      const numActiveUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      if(showInformation){
        console.log(`active uniform count:${numActiveUniforms}`);
      }
      for(let i=0; i<numActiveUniforms; i++){
        const u = gl.getActiveUniform(program, i);
        const loc = gl.getUniformLocation(program, u.name);
        // uniformBlock関連の場合ここはnullになるので、とばす。いずれUBOの仕様も作るが...
        if(loc === null){ continue; }
        // nullではないlocにより、UniformWrapperを構築する。まあnullじゃ何もできんからな。
        const uniform = new UniformWrapper(gl, program, u, loc);
        if(uniform.isArray){
          // 末尾の[0]を取り除いてできる名前で登録
          const properName = uniform.name.replace(/(?<=.*)\[[0-9]{1}\](?=$)/, ``);
          this.uniforms[properName] = uniform;
        }else{
          this.uniforms[u.name] = uniform;
        }
        if(showInformation){ uniform.show(); }
      }
      return this;
    }
    registActiveAttributes(showInformation = false){
      const {gl, program} = this;
      this.attributes = {};
      // active attributeの個数を取得。
      const numActiveAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
      if(showInformation){
        console.log(`active attribute count:${numActiveAttributes}`);
      }
      for(let i=0; i<numActiveAttributes; i++){
        // 取得は難しくない。uniformと似てる。なおiはただの通し番号で、ロケーションとか関係ない。
        const attribute = gl.getActiveAttrib(program, i);
        const location = gl.getAttribLocation(program, attribute.name);
        const attrType = ProgramWrapper.parseAttributeType(gl, attribute.type);
        const isInteger = ProgramWrapper.integerAttributeTypes.includes(attrType);
        if(showInformation){
          console.log(`name:${attribute.name}, location:${location}, type:${attrType}, isInteger:${isInteger}`);
        }

        this.attributes[name] = {name:attribute.name, location:location, type:attrType, isInteger:isInteger};
      }
      return this;
    }
    setUBOLayout(uboLayout){
      if(arguments.length === 0){
        // 引数が無い場合は自前のそれを使う
        this.setUBOLayout(this.uboLayout);
        return;
      }else{
        // 引数によりuboLayoutを更新する
        this.uboLayout = {};
        for(const [name, index] of Object.entries(uboLayout)){
          this.uboLayout[name] = index;
        }
      }
      const gl = this.gl;
      for(const [name, index] of Object.entries(uboLayout)){
        const ubi = gl.getUniformBlockIndex(this.program, name);
        gl.uniformBlockBinding(this.program, ubi, index);
      }
    }
    createProgram(params = {}){
      // まとめてやる
      const {showUniforms = false, showAttributes = false} = params;
      this.compile();
      this.attach();
      this.link();
      this.registActiveUniforms(showUniforms);
      this.registActiveAttributes(showAttributes);
      return this;
    }
    use(){
      this.gl.useProgram(this.program);
      return this;
    }
    clear(){
      this.gl.useProgram(null);
      return this;
    }
    setValue(name, value){
      // ダイレクトにセットするための簡易関数
      // 存在しない場合は何もしない。
      if(this.uniforms[name] === undefined){ return this; }
      this.uniforms[name].setValue(value);
      return this;
    }
    setUniform(name){
      const {gl, program} = this;
      const args = [...arguments].slice(1);
      const arg = args[0];
      if(typeof(arg) === 'number' || typeof(arg) === 'boolean'){
        return this.setValue(name, args);
        //this.uniforms[name].setValue(args);
        //return this;
      }
      if(arg instanceof Vecta || arg instanceof MT3 || arg instanceof MT4 || arg instanceof Quarternion){
        const flattened = args.reduce((u, v) => { u.push(...v.array()); return u; }, []);
        //this.uniforms[name].setValue(flattened);
        //return this;
        return this.setValue(name, flattened);
      }
      if(ArrayBuffer.isView(arg) && !(arg instanceof DataView)){
        //this.uniforms[name].setValue(arg);
        //return this;
        return this.setValue(name, arg);
      }
      if(Array.isArray(arg)){
        const x = arg[0];
        if(typeof(x) === 'number' || typeof(x) === 'boolean'){
          //this.uniforms[name].setValue(x);
          //return this;
          return this.setValue(name, arg);
        }
        if(x instanceof Vecta || x instanceof MT3 || x instanceof MT4 || x instanceof Quarternion){
          const flattened = arg.reduce((u, v) => { u.push(...v.array()); return u; }, []);
          //this.uniforms[name].setValue(flattened);
          //return this;
          this.setValue(name, flattened);
        }
        if(typeof(x) === 'object'){
          for(let i=0; i<arg.length; i++){
            for(const [key, value] of Object.entries(arg[i])){
              this.setUniform(`${name}[${i}].${key}`, value);
            }
          }
          return this;
        }
      }
      if(typeof(arg) === 'object'){
        for(const [key, value] of Object.entries(arg)){
          this.setUniform(`${name}.${key}`, value);
        }
      }
      return this;
    }
    getUniform(name, index = 0){
      // 構造体の場合は末端まで全て指定します
      return this.uniforms[name].getValue(index);
    }
    show(){
      for(const uniform of Object.values(this.uniforms)){
        uniform.show();
      }
      for(const attribute of Object.values(this.attributes)){
        console.log(`name:${attribute.name}, location:${attribute.location}, type:${attribute.type}, isInteger:${attribute.isInteger}`);
      }
      return this;
    }
    getShaderSource(type = 'both'){
      // ソースの取得
      const {gl, program} = this;
      if(program === null) return null;

      const shaders = gl.getAttachedShaders(program);
      switch(type){
        case 'vs':
          return gl.getShaderSource(shaders[0]);
        case 'fs':
          return gl.getShaderSource(shaders[1]);
        default:
          return {vs:gl.getShaderSource(shaders[0]), fs:gl.getShaderSource(shaders[1])};
      }
      return null;
    }
    static create(gl, params = {}){
      return new this(gl, params);
    }
    static setAttributeLayout(gl, pg, layout = {}){
      for(const [name, index] of Object.entries(layout)){
        gl.bindAttribLocation(pg, index, name);
      }
    }
    static setOutVaryings(gl, pg, outVaryings = [], separate = true){
      if(outVaryings.length === 0) return;
      gl.transformFeedbackVaryings(pg, outVaryings, (separate ? gl.SEPARATE_ATTRIBS : gl.INTERLEAVED_ATTRIBS));
    }
    static parseAttributeType(gl, type){
      // プログラム内での名称
      switch(type){
        case gl.FLOAT: return 'float';
        case gl.FLOAT_VEC2: return 'vec2';
        case gl.FLOAT_VEC3: return 'vec3';
        case gl.FLOAT_VEC4: return 'vec4';
        case gl.INT: return 'int';
        case gl.INT_VEC2: return 'ivec2';
        case gl.INT_VEC3: return 'ivec3';
        case gl.INT_VEC4: return 'ivec4';
        case gl.UNSIGNED_INT: return 'uint';
        case gl.UNSIGNED_INT_VEC2: return 'uvec2';
        case gl.UNSIGNED_INT_VEC3: return 'uvec3';
        case gl.UNSIGNED_INT_VEC4: return 'uvec4';
        case gl.FLOAT_MAT2: return 'mat2';
        case gl.FLOAT_MAT3: return 'mat3';
        case gl.FLOAT_MAT4: return 'mat4';
        case gl.FLOAT_MAT2x3: return 'mat2x3';
        case gl.FLOAT_MAT2x4: return 'mat2x4';
        case gl.FLOAT_MAT3x2: return 'mat3x2';
        case gl.FLOAT_MAT3x4: return 'mat3x4';
        case gl.FLOAT_MAT4x2: return 'mat4x2';
        case gl.FLOAT_MAT4x3: return 'mat4x3';
      }
      return 'null';
    }
    static getCurrentShaderSource(gl, type = 'vs'){
      // このプログラムとは全く無関係な、他の枠組みで動いているプログラムのソースを横取りする関数
      // もちろんこっちのでも可だが、そのプログラムは動いている必要がある。動いてなければ取れない
      const program = gl.getParameter(gl.CURRENT_PROGRAM);
      if(program === null){
        console.error("no current Program.");
        return null;
      }

      const shaders = gl.getAttachedShaders(program);
      switch(type){
        case 'vs':
          return gl.getShaderSource(shaders[0]);
        case 'fs':
          return gl.getShaderSource(shaders[1]);
        default:
          return {vs:gl.getShaderSource(shaders[0]), fs:gl.getShaderSource(shaders[1])};
      }
      console.error("invalid type.");
      return null;
    }
  }
  ProgramWrapper.integerAttributeTypes = ['int', 'ivec2', 'ivec3', 'ivec4', 'uint', 'uvec2', 'uvec3', 'uvec4'];

  // WBOのWrapper. 動的更新などをやりやすくする。
  // VBOWrapperとIBOWrapperっていう風に分けた方がいいかもですね。そうですね...
  // というのもregistIndexBufferでそういう風なことをしているので。面倒だろう。lengthとtypeはVBOには不要なので。
  // 逆にIBOの方はstrideやoffsetと無縁なので、まとめて扱うのはやや難ありかな、という話。
  // target2種類しかないんで、bindBufferBaseTFF/UBO作りましょう
  // なおIBOはこれを使えません。残念。
  class WBOWrapper{
    constructor(gl){
      this.gl = gl;
      this.buf = gl.createBuffer();
      this.target = null;
    }
    bind(target){
      this.gl.bindBuffer(target, this.buf);
      return this;
    }
    unbind(target){
      this.gl.bindBuffer(target, null);
      return this;
    }
    bindBufferBaseTFF(index){
      this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, this.buf);
      return this;
    }
    unbindBufferBaseTFF(index){
      this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, null);
      return this;
    }
    bindBufferBaseUBO(index){
      this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, index, this.buf);
      return this;
    }
    unbindBufferBaseUBO(index){
      this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, index, null);
      return this;
    }
    init(target, data = null, options = {}){
      // dataがnullの場合は何にもしない
      if(data === null){ return this; }

      // bufferDataを実行する。
      const {gl, buf} = this;

      WBOWrapper.initBuffer(gl, buf, target, data, options);
      return this;
    }
    update(target, data = null, options = {}){
      // dataがnullの場合は何にもしない
      if(data === null){ return this; }

      // bufferSubDataを実行する。
      const {gl, buf} = this;

      WBOWrapper.updateBuffer(gl, buf, target, data, options);
      return this;
    }
    output(target, data = null, options = {}){
      // dataがnullの場合は何にもしない
      if(data === null){ return this; }

      // getBufferSubDataを実行する。
      const {gl, buf} = this;

      WBOWrapper.outputBuffer(gl, buf, target, data, options);
      return this;
    }
    show(target, options = {}){
      // getBufferSubDataにより中身を確認する。
      const {gl, buf} = this;

      return WBOWrapper.showBuffer(gl, buf, target, options);
    }
    static getProperData(data, arrayType = Float32Array){
      // arrayTypeは文字列OKにしよう
      const properArrayType = glTypedArray(arrayType, 'Float32Array');

      // dataがDataViewもしくは型付配列の場合、arrayTypeは無視され、そのままdataが返る
      if(ArrayBuffer.isView(data)){ return data; }
      // 通常配列の場合はarrayTypeに応じた型付配列が返る
      if(Array.isArray(data)){ return new properArrayType(data); }
      // まあなんか返すか
      return new Uint8Array(1);
    }
    static create(gl, target = null, data = null, options = {}){
      const wbo = new this(gl);
      if(target === null){
        return wbo;
      }
      wbo.init(target, data, options);
      return wbo;
    }
    static initBuffer(gl, buf, target, data = null, options = {}){
      // 一般のWebGLBufferを対象とする初期化関数

      const {offset = -1, size = -1, usage = gl.STATIC_DRAW, arrayType = Float32Array} = options;

      // usageは文字列OKにしよう
      const properUsage = glEnum(usage, 'static_draw');
      // arrayTypeも文字列OKにしよう
      const properArrayType = glTypedArray(arrayType, 'Float32Array');

      gl.bindBuffer(target, buf);

      if(typeof(data) === 'number'){
        // 数の場合はメモリ確保だけ
        gl.bufferData(target, data, properUsage);
      }else if(data instanceof WebGLBuffer){
        // WebGLBufferの場合はメモリを同じバイト数だけ確保して丸ごとコピーする
        gl.bindBuffer(gl.COPY_READ_BUFFER, data);
        const byteLength = gl.getBufferParameter(gl.COPY_READ_BUFFER, gl.BUFFER_SIZE);
        gl.bufferData(target, byteLength, properUsage);
        gl.copyBufferSubData(gl.COPY_READ_BUFFER, target, 0, 0, byteLength);
        gl.bindBuffer(gl.COPY_READ_BUFFER, null);
      }else{
        // 型付配列の場合はそのまま
        // 通常配列の場合はarrayTypeに基づいて生成する
        const properData = WBOWrapper.getProperData(data, properArrayType);
        if(properData === null){
          gl.bindBuffer(target, null);
          return;
        }
        if(offset < 0){
          gl.bufferData(target, properData, properUsage);
        }else if(size < 0){
          gl.bufferData(target, properData, properUsage, offset);
        }else{
          gl.bufferData(target, properData, properUsage, offset, size);
        }
      }
      gl.bindBuffer(target, null);
      return;
    }
    static updateBuffer(gl, buf, target, data = null, options = {}){
      // 一般のWebGLBufferを対象とする更新関数

      // sizeはdataの方の範囲指定ですね。indexか、もしくはバイト単位。DataViewでなければindexですね。
      const {offset = {}, size = -1, arrayType = Float32Array} = options;
      const {cpu = 0, gpu = 0} = offset;

      // arrayTypeは文字列OKにしよう
      const properArrayType = glTypedArray(arrayType, 'Float32Array');

      gl.bindBuffer(target, buf);
      const properData = WBOWrapper.getProperData(data, properArrayType);
      if(properData === null){
        gl.bindBuffer(target, null);
        return;
      }
      if(size < 0){
        gl.bufferSubData(target, gpu, properData, cpu);
      }else{
        gl.bufferSubData(target, gpu, properData, cpu, size);
      }
      gl.bindBuffer(target, null);
      return;
    }
    static outputBuffer(gl, buf, target, data = null, options = {}){
      // 一般のWebGLBufferを対象とする取得関数

      // sizeはdataの方の範囲指定で、どのくらいの長さをデータで置き換えるかっていう、それの指定。
      const {offset = {}, size = -1, arrayType = Float32Array} = options;
      const {cpu = 0, gpu = 0} = offset;

      // arrayTypeは文字列OKにしよう
      const properArrayType = glTypedArray(arrayType, 'Float32Array');

      gl.bindBuffer(target, buf);
      const properData = WBOWrapper.getProperData(data, properArrayType);
      if(properData === null){
        gl.bindBuffer(target, null);
        return;
      }
      if(size < 0){
        gl.getBufferSubData(target, gpu, properData, cpu);
      }else{
        gl.getBufferSubData(target, gpu, properData, cpu, size);
      }
      gl.bindBuffer(target, null);
      return;
    }
    static showBuffer(gl, buf, target, options = {}){
      // 一般のWebGLBufferを対象とする中身を見せる関数

      // arrayTypeオンリーなのでsizeも配列の長さオンリーとする。バイト長はarrayTypeから出す。
      // offsetはgpuサイドのバイト長に限定します。だってcpuサイドは0固定だからね。
      const {arrayType = Float32Array, byteOffset = 0, size = -1} = options;
      gl.bindBuffer(target, buf);

      // arrayTypeは文字列OKにしよう
      const properArrayType = glTypedArray(arrayType, 'Float32Array');

      const bytesPerElement = properArrayType.BYTES_PER_ELEMENT;
      const properSize = (size < 0 ? gl.getBufferParameter(target, gl.BUFFER_SIZE) / bytesPerElement : size);
      const data = new properArrayType(properSize);

      if(size < 0){
        gl.getBufferSubData(target, byteOffset, data, 0);
      }else{
        gl.getBufferSubData(target, byteOffset, data, 0, properSize);
      }

      gl.bindBuffer(target, null);
      let result = "";
      for(let i=0; i<data.length; i++){
        result += data[i].toString();
        if(i < data.length-1){ result += ", "; }
      }
      console.log(result);
      return data;
    }
  }

  // init～showの個別定義は廃止
  class VBOWrapper extends WBOWrapper{
    constructor(gl){
      super(gl);
      this.target = gl.ARRAY_BUFFER;
    }
    bind(){
      super.bind(this.target);
      return this;
    }
    unbind(){
      super.unbind(this.target);
      return this;
    }
    init(data, options = {}){ super.init(this.target, data, options); return this; }
    update(data, options = {}){ super.update(this.target, data, options); return this; }
    output(data, options = {}){ super.output(this.target, data, options); return this; }
    show(options = {}){ return super.show(this.target, options); }
    static create(gl, data = null, options = {}){
      // 作成と同時に初期化できるようにする
      const vbo = new this(gl);
      if(data === null){
        return vbo;
      }
      vbo.init(data, options);
      return vbo;
      //return new this(gl);
    }
  }

  // init～showの個別定義は廃止
  class IBOWrapper extends WBOWrapper{
    constructor(gl){
      super(gl);
      this.target = gl.ELEMENT_ARRAY_BUFFER;
      this.length = 0;
      this.type = gl.UNSIGNED_SHORT;
    }
    setParam(data = [], count = 0){
      // dataは配列、もしくは配列の長さ
      this.length = (typeof(data) === 'number' ? data : data.length);
      this.type = (count <= 65536 ? this.gl.UNSIGNED_SHORT : this.gl.UNSIGNED_INT);
      return this;
    }
    bind(){
      super.bind(this.target);
      return this;
    }
    unbind(){
      super.unbind(this.target);
      return this;
    }
    init(data, options = {}){ super.init(this.target, data, options); return this; }
    update(data, options = {}){ super.update(this.target, data, options); return this; }
    output(data, options = {}){ super.output(this.target, data, options); return this; }
    show(options = {}){ return super.show(this.target, options); }
    static create(gl, data = null, options = {}){
      // 作成と同時に初期化できるようにする
      const ibo = new this(gl);
      if(data === null){
        return ibo;
      }
      ibo.init(data, options);
      return ibo;
    }
  }

  // とりあえずこれだけ特別扱いでbindBufferBaseとunbindBufferBaseを用意しておきます
  // まあUBOだけね
  // TFFBOWrapperは作りません。おそらく使う機会が無いです。
  class UBOWrapper extends WBOWrapper{
    constructor(gl){
      super(gl);
      this.target = gl.UNIFORM_BUFFER;
    }
    bind(){
      super.bind(this.target);
      return this;
    }
    unbind(){
      super.unbind(this.target);
      return this;
    }
    bindBufferBase(index){ super.bindBufferBaseUBO(index); return this; }
    unbindBufferBase(index){ super.unbindBufferBaseUBO(index); return this; }
    init(data, options = {}){ super.init(this.target, data, options); return this; }
    update(data, options = {}){ super.update(this.target, data, options); return this; }
    output(data, options = {}){ super.output(this.target, data, options); return this; }
    show(options = {}){ return super.show(this.target, options); }
    static create(gl, data = null, options = {}){
      // 作成と同時に初期化できるようにする
      const ubo = new this(gl);
      if(data === null){
        return ubo;
      }
      ubo.init(data, options);
      return ubo;
    }
  }

  // VAO関連
  // VAOのWrapperを作ろう。その関数としてcreateVAOを移植すればいい。
  // vaoにあんまあれこれくっつけるくらいならその方がいいでしょ。
  // registVBOとregistIBOはこれのstaticとする。createも追加しよう。
  // そしてジオメトリはこれを出力するのだ。
  // modifyは面倒なのでやめて、個別にbind～unbindしよう。
  // initVBO/initIBOは無ければ作る仕様に変更
  // インターリーブに対応するための仕様変更
  // getVBO/getIBO
  // VAOを作る場合、こっちサイドでvboやiboを作るんで、たとえばTFOとかと絡めたい場合、
  // こっちからvboを抽出する必要があるんで、それをね。無い場合はnullを返す。
  // ついでにcountを持たせよう。これで色々便利になると思う。getCountで取得。
  // ...
  // count固定にするか？別にいいと思うけど。その場合IBOとかの処理でcountが引数から消えるんで、若干破壊的になるが、
  // 1.3.0以前はVAOWrapper無かったんで、そこまで問題にはならないだろ。なくしちゃえ。
  class VAOWrapper{
    constructor(gl, params = {}){
      this.gl = gl;
      this.vao = gl.createVertexArray();
      this.vbos = {};
      this.ibos = {};
      const {count = 1, vbo = {}, ibo = {}, layout = [], dict = {}} = params;
      this.count = count; // VAOWrapperがcountを持ってればいいんよな。

      // もしlayoutが文字列の場合は別メソッドで全部用意する
      if(typeof(layout) === 'string'){
        this.setVAOLayout(layout, dict, true);
        return;
      }

      this.bind();
      // VBOの準備
      for(const [key, value] of Object.entries(vbo)){
        this.initVBO(key, value.data, value);
      }
      // IBOの準備
      for(const [key, value] of Object.entries(ibo)){
        this.initIBO(key, value.data, value);
        // IBOは最後に作ったものが暫定的に採用される
        this.setIBO(key);
      }

      // VBOLayoutを作る
      if(Array.isArray(layout)){
        this.setVBOLayout(layout);
      }
      this.unbind();
      /*
      // VBOを使ってレイアウトを作る
      for(const [key, value] of Object.entries(layout)){
        // 同じVBOを複数のスロットで使う（インターリーブなどの）場合、それぞれ実行する。
        // valueが配列の場合の分岐はあっちでやることにしました。
        this.registVBO(key, value);
      }
      */
    }
    bind(){
      this.gl.bindVertexArray(this.vao);
      return this;
    }
    unbind(){
      this.gl.bindVertexArray(null);
      return this;
    }
    getVBO(name){ if(this.vbos[name] === undefined){ return null; } return this.vbos[name]; }
    getIBO(name){ if(this.ibos[name] === undefined){ return null; } return this.ibos[name]; }
    getCount(){ return this.count; }
    initVBO(name, data, params = {}){
      // data別にしろよ。馬鹿か。何でWBOの方と違う書き方にするんだよクソが
      // 無ければ作る
      if(this.vbos[name] === undefined){
        this.vbos[name] = new VBOWrapper(this.gl);
      }
      const vbo = this.vbos[name];
      const {
        usage = this.gl.STATIC_DRAW, arrayType = Float32Array
      } = params;

      // WBOWrapperの方でusageとarrayTypeをいいように解釈するんで、ここでのパースは不要。
      vbo.init(data, {usage, arrayType});

      return this;
    }
    setVBOLayout(vboLayout = [], modify = false){
      if(modify){ this.bind(); }
      for(let index = 0; index < vboLayout.length; index++){
        const params = vboLayout[index];
        // null/undefinedの場合はスルー
        if(params === null || params === undefined){ continue; }
        this.setIndexedVBOLayout(index, params);
      }
      if(modify){ this.unbind(); }
      return this;
    }
    setIndexedVBOLayout(index = 0, params = {}, modify = false){
      // おそらくほとんど使われないが、配列でnullを頭に並べるのが気になるんで、
      // paramsがindexを持っている場合にはそれを採用する形にしようか。まあ使わないだろうけど。
      const {gl} = this;
      if(modify){ this.bind(); }
      const {
        index:customIndex = -1, // 手動でindexを決めたい場合
        buffer = "",
        size = 3, type = this.gl.FLOAT, normalized = false, stride = 0, offset = 0, isInteger = false,
        divisor = 0, enable = true
      } = params;
      // paramsがindexを持っているならそれに従う
      const properIndex = (customIndex < 0 ? index : customIndex);

      // 専用関数で書き換える
      this.pointer(properIndex, {buffer, size, type, normalized, stride, offset, isInteger});
      this.divisor(properIndex, divisor);
      if(enable){
        this.enable(properIndex);
      }else{
        this.disable(properIndex);
      }

      if(modify){ this.unbind(); }
      return this;
    }
    setVAOLayout(vaoLayout = '', dict = {}, modify = false){
      const parsed = VAOWrapper.parse(vaoLayout, dict);
      //const parsed = parseDesignDescription(vaoLayout, VAO_DESIGN, {dict});
      //console.log(parsed);

      // bufferとlayoutに分かれてる。bufferのvboとiboのcontentで個別に、
      // nameだけ切り離して残りで作る。
      // layoutの方も同様でpointerはindexだけ切り離してbufferで名前であと残りで作る
      // divisorとenableについても同じようにする

      if(modify){ this.bind(); }

      const {vbo = null, ibo = null} = parsed.buffer;
      if(vbo !== null){
        for(const data of vbo.content){
          this.initVBO(data.name, data.data, data);
        }
      }
      if(ibo !== null){
        for(const data of ibo.content){
          this.initIBO(data.name, data.data, data);
          // IBOは最後に作ったものが暫定的に採用される
          this.setIBO(data.name);
        }
      }

      const {pointer = null, divisor = null, enable = null} = parsed.layout;
      if(pointer !== null){
        for(const data of pointer.content){
          this.pointer(data.index, data);
          // pointerと同時に基本的にenableにする。
          // もし何らかの理由であとからdisableにしたい場合に<enable>タグでfalseを指定する
          // divisorと違ってデフォルトでは利用できないのでこの仕様は必須
          this.enable(data.index);
        }
      }
      if(divisor !== null){
        // divisorのデフォルトは0である。指定がある場合のみ、逐次的に上書きする。
        for(const data of divisor.content){
          this.divisor(data.index, data.divisor);
        }
      }
      if(enable !== null){
        // 基本的に使われないが、指示がある場合のみ特定のindexに対して実行する。
        // デフォルトでfalseにしたところをenableする、もしくは何らかの理由でdisableにするときに使う
        for(const data of enable.content){
          if(data.enable){
            this.enable(data.index);
          }else{
            this.disable(data.index);
          }
        }
      }

      if(modify){ this.unbind(); }
      return this;
    }
    initIBO(name, data, params = {}){
      // data別にしました。バカすぎるので。
      // 無ければ作る
      if(this.ibos[name] === undefined){
        this.ibos[name] = new IBOWrapper(this.gl);
      }
      const ibo = this.ibos[name];
      // byteLengthを追加。WebGLBufferをソースとする場合にも正しくlengthを計算するため。
      // 用途は限定的。言ってしまうとscanのため。
      const {
        usage = this.gl.STATIC_DRAW, byteLength = 0
      } = params;

      const arrayType = (this.count <= 65536 ? Uint16Array : Uint32Array);
      if(typeof(data) === 'number'){
        // dataが配列の長さの場合
        ibo.init(data*arrayType.BYTES_PER_ELEMENT, {usage, arrayType});
      }else{
        // dataが配列の場合、もしくはWebGLBufferの場合
        ibo.init(data, {usage, arrayType});
      }
      if(byteLength === 0){
        ibo.setParam(data, this.count);
      }else{
        // byteLengthはwebGLBufferをsourceとする場合に指定する。その場合、この式でlengthを計算する
        const properLength = byteLength / (this.count <= 65536 ? 2 : 4);
        ibo.setParam(properLength, this.count);
      }

      return this;
    }
    setIBO(name, modify = false){
      // modifyがtrueの場合にサンドイッチする。これはvaoのバインド中に呼び出すことが多いので、そのようにする。
      if(this.ibos[name] === undefined){ console.log('not found'); return this; }
      if(modify){ this.bind(); }
      this.ibos[name].bind();
      if(modify){ this.unbind(); }
      return this;
    }
    pointer(index, params = {}, modify = false){
      // index主体に書き換える。vboの名前はbufferという形でparamsに含める
      const {buffer = ""} = params;
      if(this.vbos[buffer] === undefined){ console.log('not found'); return this; }
      const vbo = this.vbos[buffer];

      const {
        size = 3, type = this.gl.FLOAT, normalized = false, stride = 0, offset = 0,
        isInteger = false
      } = params;
      // typeは文字列OKにしよう
      const properType = glEnum(type, 'float');

      if(modify){ this.bind(); }
      vbo.bind();
      // isIntegerをtrueにすると整数で登録できる
      if(!isInteger){
        this.gl.vertexAttribPointer(index, size, properType, normalized, stride, offset);
      }else{
        this.gl.vertexAttribIPointer(index, size, properType, stride, offset);
      }
      vbo.unbind();
      if(modify){ this.unbind(); }

      return this;
    }
    divisor(index = 0, divisor = 0, modify = false){
      if(modify){ this.bind(); }
      this.gl.vertexAttribDivisor(index, divisor);
      if(modify){ this.unbind(); }
      return this;
    }
    enable(index = 0, modify = false){
      if(modify){ this.bind(); }
      this.gl.enableVertexAttribArray(index);
      if(modify){ this.unbind(); }
      return this;
    }
    disable(index = 0, modify = false){
      if(modify){ this.bind(); }
      this.gl.disableVertexAttribArray(index);
      if(modify){ this.unbind(); }
      return this;
    }
    updateVBO(name, data, options = {}){
      if(this.vbos[name] === undefined){ console.log('not found'); return this; }
      this.vbos[name].update(data, options);
      return this;
    }
    updateIBO(name, data, options = {}){
      if(this.ibos[name] === undefined){ console.log('not found'); return this; }
      this.ibos[name].update(data, options);
      return this;
    }
    outputVBO(name, data, options = {}){
      if(this.vbos[name] === undefined){ console.log('not found'); return this; }
      this.vbos[name].output(data, options);
      return this;
    }
    outputIBO(name, data, options = {}){
      if(this.ibos[name] === undefined){ console.log('not found'); return this; }
      this.ibos[name].output(data, options);
      return this;
    }
    showVBO(name, options = {}){
      if(this.vbos[name] === undefined){ console.log('not found'); return null; }
      return this.vbos[name].show(options);
    }
    showIBO(name, options = {}){
      if(this.ibos[name] === undefined){ console.log('not found'); return null; }
      return this.ibos[name].show(options);
    }
    drawArrays(drawCall = 'triangles', options = {}){
      // size,offsetはあっちで言うところのcountとfirstです。countはインスタンスカウントです。
      // sizeに頂点数などを指定します。sizeが未指定の場合、頂点数（自身のカウント）が使われます。
      // 通常、sizeがいじられることは無いので、countってどっちだ！？とかなることは無いです。
      const {count = 0, offset = 0, size = this.count} = options;
      const drawCallEnum = glEnum(drawCall, 'triangles');
      if(count === 0){
        this.gl.drawArrays(drawCallEnum, offset, size);
      }else{
        this.gl.drawArraysInstanced(drawCallEnum, offset, size, count);
      }
      return this;
    }
    drawElements(name, drawCall = 'triangles', options = {}){
      if(this.ibos[name] === undefined){ console.log('not found'); return this; }
      const ibo = this.ibos[name];
      const {count = 0, offset = 0, size = ibo.length, type = ibo.type} = options;
      //const properDrawCall = VAOWrapper.parseDrawCall(this.gl, drawCall);
      // glEnum使いましょう
      const drawCallEnum = glEnum(drawCall, 'triangles');
      if(count === 0){
        this.gl.drawElements(drawCallEnum, size, type, offset);
      }else{
        this.gl.drawElementsInstanced(drawCallEnum, size, type, offset, count);
      }
      return this;
    }
    static parse(vaoLayout = "", dict = {}){
      return parseDesignDescription(vaoLayout, this.VAO_DESIGN, {dict});
    }
    static create(){
      return new this(...arguments);
    }
    static scan(gl, options = {}){
      // iboName: 紐付けられているIBOがある場合、それの名前を指定する
      // showVAAState: VAAの状態を表示するオプション
      // scanOnly: showVAAStateと同時にtrueにすることで、VAAの状態を確認するだけの関数になる。
      const {
        iboName = 'ibo_0', showVAAState = false, scanOnly = false,
        showArrayBuffer = false, showIndexBuffer = false
      } = options;

      // そのタイミングでのVAAの状態からVAOWrapperを生成する
      // その都合上、そのときbindされているVAOが無い場合は良いが、ある場合は後で復元する
      // それも取得すれば大丈夫
      // 一応取得し、nullでない場合は最後にこれを戻す
      const curVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);

      // 順に取得していく。まずスロット数の上限を取得（基本16）
      const vaaCount = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      const vboData = {};
      const iboData = {};
      const vaaLayout = Array(vaaCount).fill(null); // 基本長さ16
      let properVAOcount = 0;
      for(let index = 0; index < vaaCount; index++){
        const buffer = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        if(buffer === null){
          // バッファが無い場合はスルー。
          if(showVAAState){ console.log(`${index}: null`); }
          continue;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const bufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
        const bufferUsage = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_USAGE);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        const size = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_SIZE);
        const type = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_TYPE);
        const normalized = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED);
        const stride = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_STRIDE);
        const offset = gl.getVertexAttribOffset(index, gl.VERTEX_ATTRIB_ARRAY_POINTER);
        const isInteger = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_INTEGER);
        const divisor = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_DIVISOR);
        const enabled = gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_ENABLED);

        if(showArrayBuffer){
          const properArrayType = VAOWrapper.getAttributeArrayType(type);
          WBOWrapper.showBuffer(gl, buffer, gl.ARRAY_BUFFER, {arrayType:properArrayType});
        }

        vboData[`vbo_${index}`] = {data:buffer, usage:bufferUsage};
        vaaLayout[index] = {buffer:`vbo_${index}`, size, type, normalized, stride, offset, isInteger, divisor, enabled};
        if(showVAAState){ console.log(`${index}: size:${size}, type:${type}, normalized:${normalized}, stride:${stride}, offset:${offset}, isInteger:${isInteger}, divisor:${divisor}, enabled:${enabled}`); }
        const attributeTypeByteLength = VAOWrapper.getAttributeTypeByteLength(vaaLayout[index].type);

        const arrayCount = bufferSize / (attributeTypeByteLength*size);
        // インスタンスアトリビュートは無視。足りないのも無視。
        if(divisor === 0){ properVAOcount = Math.max(properVAOcount, arrayCount); }
      }

      if(showVAAState){ console.log(`vaoCount:${properVAOcount}`); }

      // 情報を格納していく。
      // binding buffer(wboかnull), type, size, normalize, stride, offset, isInteger, divisor, enabled
      // cf: https://www.fisce.net/webGL/article/article4-11/
      // countについてだが、まずバッファのバイト数とデータのtypeやsizeからスロットごとに割り出す。
      // そしてインスタンスアトリビュートを考慮し、それらの最大値を取る形。最大値ならとりあえず安全だと思われる。
      // もちろんバッファの存在しないスロットは無視する。

      // バッファが無い、IBOだけのVAOも存在するのでそれでも可能。何にもない場合は空っぽができるだけ。

      // 次にIBOのチェック。nullでなければコピーを作りバインドする形。名前はibo_0とするが...手動で決める？？
      const curIBO = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
      if(curIBO !== null){
        // WebGLBufferからiboを作る場合、初期化の都合上、byteLengthパラメータが必須
        // これは取得できる。なにせこのときbindされているからな。
        iboData[iboName] = {
          data:curIBO, byteLength:gl.getBufferParameter(gl.ELEMENT_ARRAY_BUFFER, gl.BUFFER_SIZE)
        };

        if(showIndexBuffer){
          WBOWrapper.showBuffer(gl, curIBO, gl.ELEMENT_ARRAY_BUFFER, {arrayType:(properVAOcount <= 65536 ? Uint16Array : Uint32Array)});
          // 見せる過程でバッファをクリアしてしまうので、戻しておく。
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, curIBO);
        }
      }else{
        if(showIndexBuffer){ console.log(`no index buffer.`); }
      }

      if(scanOnly){
        // scanしたいだけの場合は、ここで離脱する。
        return null;
      }

      // 情報が揃ったのでVAOWrapperを生成する。その過程で、最初に紐付けられていたVAOはクリアされてしまう。
      // const vao = this.create(gl, {...})...
      const vao = this.create(gl, {count:properVAOcount, vbo:vboData, ibo:iboData, layout:vaaLayout});

      // なので、もしそれがあったのなら、最後に復元する。
      if(curVAO !== null){
        gl.bindVertexArray(curVAO);
      }
      return vao;
    }
    static getAttributeTypeByteLength(type){
      // アトリビュートタイプのバイト長を取得する。typeはenumもしくは文字列、いずれも可。
      // アトリビュートのtypeは10種類しかない。
      // BYTE, SHORT, UNSIGNED_BYTE, UNSIGNED_SHORT, FLOAT, HALF_FLOAT, INT, UNSIGNED_INT
      // 残り2つはマイナーなので省く。バイト長：1,2,1,2,4,2,4,4(,4,4).
      switch(glEnum(type)){
        case glEnum('byte'):
        case glEnum('unsigned_byte'):
          return 1;
        case glEnum('short'):
        case glEnum('unsigned_short'):
        case glEnum('half_float'):
          return 2;
        case glEnum('float'):
        case glEnum('int'):
        case glEnum('unsigned_int'):
          return 4;
      }
      // default.
      return 4;
    }
    static getAttributeArrayType(type){
      // attributeのtypeに応じた適切なarrayTypeを取得する
      switch(glEnum(type)){
        case glEnum('float'): return Float32Array;
        case glEnum('half_float'): return Float16Array;
        case glEnum('byte'): return Int8Array;
        case glEnum('unsigned_byte'): return Uint8Array;
        case glEnum('short'): return Int16Array;
        case glEnum('unsigned_short'): return Uint16Array;
        case glEnum('int'): return Int32Array;
        case glEnum('unsigned_int'): return Uint32Array;
      }
      // default.
      return Float32Array;
    }
  }

  // @bufferのname,あと@layoutのbufferについては文字列前提とし、パースはしない。
  // iboのパラメータにbyteLengthを追加。これはWebGLBufferのIBOから作る際にsetParamを実行するのに使う。
  // これがないとdrawElementsを実行する際に不具合が生じる。まあこっちで使うことはあんまないかもな...
  VAOWrapper.VAO_DESIGN = {
    layout:{
      buffer:{
        vbo:{
          type:'enum',
          keys:['name', 'data', 'usage', 'arrayType'],
          values:['v', [], 'static_draw', 'Float32Array']
        },
        ibo:{
          type:'enum',
          keys:['name', 'data', 'byteLength'],
          values:['f', [], 0]
        }
      },
      layout:{
        pointer:{
          type:'enum',
          keys:['index', 'buffer', 'size', 'type', 'normalized', 'stride', 'offset', 'isInteger'],
          values:[0, 'v', 3, 'float', false, 0, 0, false]
        },
        divisor:{
          type:'enum',
          keys:['index', 'divisor'],
          values:[0, 0]
        },
        enable:{
          type:'enum',
          keys:['index', 'enable'],
          values:[0, true]
        }
      }
    }
  };

  // glConstants
  utils.glEnum = glEnum;
  utils.glTypedArray = glTypedArray;

  // uniform/program wrapper
  utils.UniformWrapper = UniformWrapper;
  utils.ProgramWrapper = ProgramWrapper;

  // WebglBuffer wrapper & VAO
  utils.WBOWrapper = WBOWrapper;
  utils.VBOWrapper = VBOWrapper;
  utils.IBOWrapper = IBOWrapper;
  utils.UBOWrapper = UBOWrapper;
  utils.VAOWrapper = VAOWrapper;

  return utils;
})();
