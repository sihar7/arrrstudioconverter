/**
 * Renderer WebGL2 satu konteks untuk tiga pekerjaan:
 *   1. preview 3D (langit + baseplate + karakter blok) — real time saat slider digeser
 *   2. render 6 sisi skybox dari panorama (supersampling 2×2, mip LOD manual → tanpa garis sambungan)
 *   3. gabung 6 sisi → panorama 2:1
 * Semua proses di GPU klien: tanpa upload ke server, cepat walau panorama 8K.
 */
import { FACE_BASIS, FACES, type FaceId } from "./skyMath";
import type { SkyAtmosphere } from "./atmosphere";

export interface SkyAdjust {
  yaw: number; // derajat, putar arah depan
  horizon: number; // derajat, geser horizon (+ = naik)
  brightness: number; // 1 = asli
  contrast: number; // 1 = asli
  saturation: number; // 1 = asli
  temperature: number; // -1 dingin … 1 hangat
}

export const DEFAULT_ADJUST: SkyAdjust = { yaw: 0, horizon: 0, brightness: 1, contrast: 1, saturation: 1, temperature: 0 };

export interface SkyCamera {
  yaw: number; // radian, 0 = menghadap Ft
  pitch: number; // radian
  distance: number; // stud dari karakter
}

export const DEFAULT_CAMERA: SkyCamera = { yaw: 0, pitch: 0.12, distance: 14 };

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
in vec2 vUv;
out vec4 outColor;
`;

const SKY_FRAG = `${COMMON}
uniform sampler2D uSrc;
uniform int uMode;          // 0 = preview, 1 = render sisi
uniform float uLod;
uniform float uYaw, uHorizon, uBright, uContrast, uSat, uTemp;
uniform int uFlat;          // 1 = gambar biasa: dicerminkan 2× mengelilingi 360°
uniform float uFlatSpan;    // setengah sudut vertikal gambar biasa (radian)
uniform int uSeam;          // 1 = haluskan sambungan tepi kiri-kanan (gambar yang bukan 360° asli)
const float SEAM_W = 0.06;  // lebar area penghalusan (fraksi lebar panorama ≈ 22°)
// sisi
uniform vec3 uDir, uRight, uUp;
uniform float uTexel;       // 1 / ukuran sisi (untuk supersampling)
// preview
uniform vec3 uCamPos, uCamF, uCamR, uCamU;
uniform float uTan, uAspect;
uniform int uScene, uEdges;
// Atmosphere Roblox (perkiraan, hanya preview — tidak ikut dipanggang ke 6 sisi)
uniform int uAtmo;
uniform vec3 uAtmoColor, uAtmoDecay;
uniform float uDensity, uOffset, uHaze, uGlare;
const vec3 SUN = vec3(0.4319, 0.7678, 0.3359); // normalize(0.45, 0.8, 0.35) — sama dengan cahaya adegan
float gDist = 1e9;          // jarak permukaan yang kena (1e9 = langit)

vec3 adjust(vec3 c) {
  c *= uBright;
  c = (c - 0.5) * uContrast + 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c += vec3(0.07, 0.015, -0.07) * uTemp;
  return clamp(c, 0.0, 1.0);
}

vec3 sky(vec3 d) {
  d = normalize(d);
  float lon = atan(d.x, d.z) + uYaw;
  float lat = asin(clamp(d.y, -1.0, 1.0)) - uHorizon;
  float u = fract(0.5 + lon / TAU);
  vec2 uv;
  if (uFlat == 1) {
    // gelombang segitiga: salinan normal + salinan cermin → tepi selalu menyambung, tengah = depan
    float t = u * 2.0 - 0.5;
    uv = vec2(1.0 - abs(mod(t, 2.0) - 1.0), clamp(0.5 - lat / (2.0 * uFlatSpan), 0.0, 1.0));
  } else {
    uv = vec2(u, clamp(0.5 - lat / PI, 0.0, 1.0));
    if (uSeam == 1) {
      // Dekat sambungan: campur dengan titik cerminnya (1 - u) → kedua sisi bertemu di nilai yang sama
      float d = min(uv.x, 1.0 - uv.x);
      if (d < SEAM_W) {
        vec3 a = textureLod(uSrc, uv, uLod).rgb;
        vec3 b = textureLod(uSrc, vec2(1.0 - uv.x, uv.y), uLod).rgb;
        return adjust(mix((a + b) * 0.5, a, smoothstep(0.0, SEAM_W, d)));
      }
    }
  }
  return adjust(textureLod(uSrc, uv, uLod).rgb);
}

// --- adegan preview: baseplate + karakter blok (satuan stud, kaki di y = 0) ---
float boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out vec3 n) {
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  if (b < max(a, 0.0)) return -1.0;
  n = -sign(rd) * step(tn.yzx, tn.xyz) * step(tn.zxy, tn.xyz);
  return a;
}

void part(vec3 ro, vec3 rd, vec3 c, vec3 h, vec3 col, inout float best, inout vec3 bn, inout vec3 bc) {
  vec3 n;
  float t = boxHit(ro, rd, c - h, c + h, n);
  if (t > 0.0 && t < best) { best = t; bn = n; bc = col; }
}

vec3 scene(vec3 ro, vec3 rd) {
  float best = 1e9; vec3 n = vec3(0.0); vec3 col = vec3(0.0);
  vec3 skin = vec3(0.74), shirt = vec3(0.66), pants = vec3(0.58);
  part(ro, rd, vec3(-0.5, 1.0, 0.0), vec3(0.5, 1.0, 0.5), pants, best, n, col);
  part(ro, rd, vec3(0.5, 1.0, 0.0), vec3(0.5, 1.0, 0.5), pants, best, n, col);
  part(ro, rd, vec3(0.0, 3.0, 0.0), vec3(1.0, 1.0, 0.5), shirt, best, n, col);
  part(ro, rd, vec3(-1.5, 3.0, 0.0), vec3(0.5, 1.0, 0.5), skin, best, n, col);
  part(ro, rd, vec3(1.5, 3.0, 0.0), vec3(0.5, 1.0, 0.5), skin, best, n, col);
  part(ro, rd, vec3(0.0, 4.6, 0.0), vec3(0.6, 0.6, 0.6), skin, best, n, col);

  vec3 horizon = sky(vec3(rd.x, 0.0, rd.z) + vec3(0.0, 0.02, 0.0));
  vec3 sun = SUN;
  vec3 ambient = mix(vec3(0.62), sky(vec3(0.0, 1.0, 0.0)), 0.18);

  if (best < 1e8) gDist = best;
  if (best < 1e8) return col * (ambient * 0.8 + 0.5 * max(dot(n, sun), 0.0) + 0.06 * n.y);

  if (rd.y < -1e-4) {
    float t = -ro.y / rd.y;
    vec3 p = ro + rd * t;
    if (max(abs(p.x), abs(p.z)) < 256.0) {
      // Baseplate abu Roblox + kisi tipis tiap 4 stud, memudar ke langit di kejauhan
      vec2 g = abs(fract(p.xz / 4.0) - 0.5);
      float w = fwidth(p.x / 4.0) + fwidth(p.z / 4.0);
      float line = 1.0 - smoothstep(0.0, max(w, 0.02), 0.5 - max(g.x, g.y));
      vec3 base = vec3(0.39, 0.39, 0.40) * (1.0 - 0.1 * line);
      // bayangan lembut di bawah karakter
      float sh = smoothstep(0.0, 2.6, length(p.xz * vec2(0.8, 1.2)));
      base *= mix(0.72, 1.0, sh);
      base *= ambient * 0.5 + 0.62;
      float fog = smoothstep(40.0, 240.0, t);
      gDist = t;
      return mix(base, horizon, fog);
    }
  }
  return sky(rd);
}

// Kabut atmosphere: langit tertutup dari horizon ke atas (Offset = setinggi apa), benda memudar sesuai jarak
vec3 atmosphere(vec3 c, vec3 rd) {
  if (uAtmo == 0) return c;
  float e = rd.y;
  float sunAmt = max(dot(rd, SUN), 0.0);
  // Decay = warna di arah menjauhi matahari
  vec3 fog = mix(uAtmoDecay, uAtmoColor, 0.35 + 0.65 * sunAmt);
  fog = mix(fog, vec3(1.0), clamp(uHaze * 0.04, 0.0, 0.35) * (1.0 - smoothstep(0.0, 0.35, e)));
  float amt;
  if (gDist > 1e8) {
    float top = mix(0.08, 0.7, uOffset);
    amt = uDensity * (1.0 - smoothstep(-0.05, top, e)) * (1.4 + uHaze * 0.12);
  } else {
    amt = 1.0 - exp(-gDist * uDensity * 0.012);
  }
  c = mix(c, fog, clamp(amt, 0.0, 1.0));
  // Glare: pendar di sekitar arah matahari
  c += uAtmoColor * pow(sunAmt, 12.0) * uGlare * 0.06;
  return c;
}

float edges(vec3 d) {
  vec3 a = abs(normalize(d));
  float m = max(max(a.x, a.y), a.z);
  float mid = a.x + a.y + a.z - m - min(min(a.x, a.y), a.z);
  return 1.0 - smoothstep(0.0, 0.006, (m - mid) / m);
}

void main() {
  if (uMode == 1) {
    vec3 c = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 o = (vec2(float(i & 1), float(i >> 1)) - 0.5) * uTexel;
      vec2 st = vec2(vUv.x + o.x, vUv.y + o.y) * 2.0 - 1.0;
      // baris 0 hasil readPixels = atas gambar → t = +1 di vUv.y = 0
      c += sky(uDir + uRight * st.x + uUp * -st.y);
    }
    outColor = vec4(c * 0.25, 1.0);
    return;
  }
  vec2 p = (vUv * 2.0 - 1.0) * vec2(uTan * uAspect, uTan);
  vec3 rd = normalize(uCamF + uCamR * p.x + uCamU * p.y);
  vec3 c = uScene == 1 ? scene(uCamPos, rd) : sky(rd);
  c = atmosphere(c, rd);
  if (uEdges == 1) c = mix(c, vec3(1.0), edges(rd) * 0.5);
  outColor = vec4(c, 1.0);
}`;

const MERGE_FRAG = `${COMMON}
uniform sampler2D uFace[6];
uniform vec3 uDir[6], uRight[6], uUp[6];

vec3 faceSample(int i, vec3 d) {
  float k = dot(d, uDir[i]);
  vec2 st = vec2(dot(d, uRight[i]), dot(d, uUp[i])) / k;
  vec2 uv = vec2(st.x + 1.0, 1.0 - st.y) * 0.5;
  // indeks sampler harus konstan di GLSL ES
  if (i == 0) return texture(uFace[0], uv).rgb;
  if (i == 1) return texture(uFace[1], uv).rgb;
  if (i == 2) return texture(uFace[2], uv).rgb;
  if (i == 3) return texture(uFace[3], uv).rgb;
  if (i == 4) return texture(uFace[4], uv).rgb;
  return texture(uFace[5], uv).rgb;
}

void main() {
  float lon = (vUv.x - 0.5) * TAU;
  float lat = (0.5 - vUv.y) * PI;
  vec3 d = vec3(sin(lon) * cos(lat), sin(lat), cos(lon) * cos(lat));
  int best = 0; float bk = -2.0;
  for (int i = 0; i < 6; i++) { float k = dot(d, uDir[i]); if (k > bk) { bk = k; best = i; } }
  outColor = vec4(faceSample(best, d), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
    gl.attachShader(prog, sh);
    gl.deleteShader(sh);
  }
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
  return prog;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export class SkyRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly maxTexture: number;
  private sky: WebGLProgram;
  private merge: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buf: WebGLBuffer;
  private src: WebGLTexture | null = null;
  private srcWidth = 1;
  private srcHeight = 1;
  /** true = gambar biasa (bukan panorama 360°) */
  private flat = false;
  private seam = false;
  private uni = new Map<string, WebGLUniformLocation | null>();

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false, alpha: false });
    if (!gl || gl.isContextLost()) throw new Error("webgl2");
    this.gl = gl;
    this.maxTexture = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 8192);
    this.sky = compile(gl, VERT, SKY_FRAG);
    this.merge = compile(gl, VERT, MERGE_FRAG);
    this.vao = gl.createVertexArray()!;
    this.buf = gl.createBuffer()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  private u(prog: WebGLProgram, name: string) {
    const key = `${prog === this.sky ? "s" : "m"}:${name}`;
    if (!this.uni.has(key)) this.uni.set(key, this.gl.getUniformLocation(prog, name));
    return this.uni.get(key)!;
  }

  private texture(img: TexImageSource, mip: boolean) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mip ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
  }

  /** Panorama sumber (sudah diperkecil ≤ maxTexture oleh pemanggil) */
  setSource(img: TexImageSource & { width: number; height: number }) {
    if (this.src) this.gl.deleteTexture(this.src);
    this.src = this.texture(img, true);
    this.srcWidth = img.width;
    this.srcHeight = img.height;
  }

  /** Lebar setara panorama (gambar biasa hanya menutupi 180° → kerapatan texel 2×) */
  private get panoWidth() {
    return this.flat ? this.srcWidth * 2 : this.srcWidth;
  }

  setFlat(flat: boolean) {
    this.flat = flat;
  }

  setSeam(seam: boolean) {
    this.seam = seam;
  }

  get hasSource() {
    return this.src !== null;
  }

  private bindSky(a: SkyAdjust, lod: number) {
    const gl = this.gl;
    const p = this.sky;
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.src);
    gl.uniform1i(this.u(p, "uSrc"), 0);
    gl.uniform1f(this.u(p, "uLod"), Math.max(0, lod));
    gl.uniform1f(this.u(p, "uYaw"), rad(a.yaw));
    gl.uniform1f(this.u(p, "uHorizon"), rad(a.horizon));
    gl.uniform1f(this.u(p, "uBright"), a.brightness);
    gl.uniform1f(this.u(p, "uContrast"), a.contrast);
    gl.uniform1f(this.u(p, "uSat"), a.saturation);
    gl.uniform1f(this.u(p, "uTemp"), a.temperature);
    gl.uniform1i(this.u(p, "uFlat"), this.flat ? 1 : 0);
    gl.uniform1i(this.u(p, "uSeam"), this.seam && !this.flat ? 1 : 0);
    gl.uniform1f(this.u(p, "uFlatSpan"), Math.min(Math.PI / 2, (Math.PI * this.srcHeight) / (2 * this.srcWidth)));
  }

  private draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Satu frame preview ke canvas (ukuran canvas diatur pemanggil sesuai DPR) */
  renderPreview(a: SkyAdjust, cam: SkyCamera, opts: { scene: boolean; edges: boolean; fov?: number; atmosphere?: SkyAtmosphere | null }) {
    if (!this.src) return;
    const gl = this.gl;
    const { width, height } = this.canvas;
    const fov = rad(opts.fov ?? 70);
    const tan = Math.tan(fov / 2);
    // texel per piksel layar → LOD mip (sudut per piksel × texel per radian)
    this.bindSky(a, Math.log2(((2 * tan) / height) * (this.panoWidth / (2 * Math.PI))));

    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const f = [sy * cp, sp, cy * cp];
    const r = [cy, 0, -sy];
    const up = [-sp * sy, cp, -sp * cy];
    const target = opts.scene ? [0, 3, 0] : [0, 0, 0];
    const dist = opts.scene ? cam.distance : 0;
    const pos = target.map((v, i) => v - f[i] * dist);
    if (opts.scene && pos[1] < 0.4) pos[1] = 0.4; // kamera tidak menembus baseplate

    const p = this.sky;
    gl.uniform1i(this.u(p, "uMode"), 0);
    gl.uniform3fv(this.u(p, "uCamPos"), pos);
    gl.uniform3fv(this.u(p, "uCamF"), f);
    gl.uniform3fv(this.u(p, "uCamR"), r);
    gl.uniform3fv(this.u(p, "uCamU"), up);
    gl.uniform1f(this.u(p, "uTan"), tan);
    gl.uniform1f(this.u(p, "uAspect"), width / height);
    gl.uniform1i(this.u(p, "uScene"), opts.scene ? 1 : 0);
    gl.uniform1i(this.u(p, "uEdges"), opts.edges ? 1 : 0);
    const atmo = opts.atmosphere;
    gl.uniform1i(this.u(p, "uAtmo"), atmo ? 1 : 0);
    if (atmo) {
      gl.uniform3fv(this.u(p, "uAtmoColor"), atmo.color.map((v) => v / 255));
      gl.uniform3fv(this.u(p, "uAtmoDecay"), atmo.decay.map((v) => v / 255));
      gl.uniform1f(this.u(p, "uDensity"), atmo.density);
      gl.uniform1f(this.u(p, "uOffset"), atmo.offset);
      gl.uniform1f(this.u(p, "uHaze"), atmo.haze);
      gl.uniform1f(this.u(p, "uGlare"), atmo.glare);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    this.draw();
  }

  /** Render ke framebuffer offscreen lalu baca piksel (baris 0 = atas) */
  private offscreen(w: number, h: number, render: () => void) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    render();
    const px = new Uint8ClampedArray(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
    return new ImageData(px, w, h);
  }

  renderFace(face: FaceId, size: number, a: SkyAdjust) {
    if (!this.src) throw new Error("no source");
    const b = FACE_BASIS[face];
    return this.offscreen(size, size, () => {
      // sisi 90° ≈ seperempat lebar panorama; supersampling 2×2 menutup sisa aliasing
      this.bindSky(a, Math.log2(this.panoWidth / 4 / size) - 1);
      const p = this.sky;
      const gl = this.gl;
      gl.uniform1i(this.u(p, "uMode"), 1);
      gl.uniform3fv(this.u(p, "uDir"), b.dir);
      gl.uniform3fv(this.u(p, "uRight"), b.right);
      gl.uniform3fv(this.u(p, "uUp"), b.up);
      gl.uniform1f(this.u(p, "uTexel"), 0.5 / size);
      this.draw();
    });
  }

  /** 6 sisi → panorama 2:1 (sisi kosong = abu netral) */
  mergeFaces(faces: Partial<Record<FaceId, TexImageSource>>, width: number) {
    const gl = this.gl;
    const w = Math.min(width, this.maxTexture);
    const h = Math.round(w / 2);
    const blank = new ImageData(new Uint8ClampedArray([40, 40, 44, 255]), 1, 1);
    const texes = FACES.map((f) => this.texture(faces[f] ?? blank, false));
    const p = this.merge;
    const out = this.offscreen(w, h, () => {
      gl.useProgram(p);
      FACES.forEach((f, i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texes[i]);
        const b = FACE_BASIS[f];
        gl.uniform1i(this.u(p, `uFace[${i}]`), i);
        gl.uniform3fv(this.u(p, `uDir[${i}]`), b.dir);
        gl.uniform3fv(this.u(p, `uRight[${i}]`), b.right);
        gl.uniform3fv(this.u(p, `uUp[${i}]`), b.up);
      });
      this.draw();
    });
    texes.forEach((t) => gl.deleteTexture(t));
    // merge-shader memetakan vUv.y = 0 ke atas panorama → baris readPixels sudah urut atas→bawah
    return out;
  }

  dispose() {
    const gl = this.gl;
    if (this.src) gl.deleteTexture(this.src);
    gl.deleteProgram(this.sky);
    gl.deleteProgram(this.merge);
    gl.deleteBuffer(this.buf);
    gl.deleteVertexArray(this.vao);
    // Sengaja TIDAK loseContext(): canvas yang sama dipakai lagi saat remount (StrictMode / navigasi balik),
    // konteks yang sudah "lost" tidak bisa dihidupkan dan renderer berikutnya akan gagal.
    this.uni.clear();
  }
}

/** ImageData → Blob PNG lewat canvas sementara */
export async function imageDataToPng(data: ImageData): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  c.getContext("2d")!.putImageData(data, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("png"))), "image/png"));
}

/** File gambar → ImageBitmap, diperkecil bila melebihi batas tekstur GPU */
export async function loadBitmap(file: Blob, maxWidth: number) {
  const probe = await createImageBitmap(file);
  if (probe.width <= maxWidth && probe.height <= maxWidth) return { bitmap: probe, scaled: false, original: { w: probe.width, h: probe.height } };
  const original = { w: probe.width, h: probe.height };
  const k = Math.min(maxWidth / probe.width, maxWidth / probe.height);
  const bitmap = await createImageBitmap(probe, { resizeWidth: Math.round(probe.width * k), resizeHeight: Math.round(probe.height * k), resizeQuality: "high" });
  probe.close();
  return { bitmap, scaled: true, original };
}

/** Seberapa beda kolom paling kiri & paling kanan (0–255). Panorama 360° asli ≈ 0–8; foto biasa jauh lebih besar. */
export function edgeMismatch(img: ImageBitmap) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 128, 64);
  const px = g.getImageData(0, 0, 128, 64).data;
  let sum = 0;
  for (let y = 8; y < 56; y++) {
    const l = y * 128 * 4;
    const r = l + 127 * 4;
    sum += Math.abs(px[l] - px[r]) + Math.abs(px[l + 1] - px[r + 1]) + Math.abs(px[l + 2] - px[r + 2]);
  }
  return sum / (48 * 3);
}
