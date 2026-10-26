"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Medan gelombang: baris garis sejajar (seperti lapisan waveform) yang diangkat shader vertex
const COLS = 140;
const ROWS = 44;
const WIDTH = 22;
const DEPTH = 16;

const VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying float vDepth;
varying float vHeight;
varying float vEdge;
void main() {
  vec3 p = position;
  float t = uTime;
  // Riak dasar + "amplop" waveform di tengah (puncak lebih tinggi di sumbu tengah, landai ke tepi)
  float h = sin(p.x * 0.55 + t * 0.7) * 0.32
          + sin(p.x * 1.35 - p.z * 0.55 + t * 1.05) * 0.16
          + sin(p.z * 0.85 + t * 0.5) * 0.22;
  float env = exp(-pow(p.x * 0.17, 2.0));
  h *= 0.45 + env * 0.95;
  // Riak dari kursor
  vec2 m = vec2(uMouse.x * 7.0, -4.0 - uMouse.y * 4.0);
  float d = distance(p.xz, m);
  h += sin(d * 2.1 - t * 2.6) * 0.14 * exp(-d * 0.42);
  p.y += h;
  vHeight = h;
  vEdge = smoothstep(${(WIDTH / 2).toFixed(1)}, ${(WIDTH / 2 - 5).toFixed(1)}, abs(p.x));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vDepth;
varying float vHeight;
varying float vEdge;
void main() {
  float fade = smoothstep(19.0, 7.0, vDepth) * smoothstep(1.2, 3.5, vDepth) * vEdge;
  float crest = 0.5 + clamp(vHeight, 0.0, 0.8) * 1.1;
  gl_FragColor = vec4(uColor, uOpacity * fade * crest);
}`;

/** Warna & kekuatan garis per tema (dari token CSS --fg supaya selalu serasi dengan UI) */
function themeLook() {
  const root = document.documentElement;
  const fg = getComputedStyle(root).getPropertyValue("--fg").trim() || "#e3e5e8";
  return { color: fg, opacity: root.dataset.theme === "light" ? 0.5 : 0.42 };
}

/**
 * Latar login app desktop (Three.js): permukaan garis perak yang beriak pelan seperti waveform audio,
 * merespons kursor. three dimuat dinamis (hanya saat komponen ini tampil). Hemat: DPR dibatasi,
 * berhenti saat jendela tersembunyi, satu frame diam bila reduced motion; semua sumber daya dibuang saat unmount.
 */
export default function WaveField({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%;opacity:0;transition:opacity 1.2s ease";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
      camera.position.set(0, 2.4, 7.5);
      camera.lookAt(0, -0.2, -3);

      // Satu geometri LineSegments untuk semua baris → satu draw call
      const positions = new Float32Array(COLS * ROWS * 3);
      const indices: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        const z = 3 - (r / (ROWS - 1)) * DEPTH;
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c;
          positions[i * 3] = (c / (COLS - 1) - 0.5) * WIDTH;
          positions[i * 3 + 2] = z;
          if (c > 0) indices.push(i - 1, i);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(indices);

      const look = themeLook();
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 6 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uColor: { value: new THREE.Color(look.color) },
          uOpacity: { value: look.opacity },
        },
      });
      scene.add(new THREE.LineSegments(geometry, material));

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = el;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (reduced) renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // Kursor dihaluskan (lerp) supaya riak mengikuti dengan lembut
      const target = new THREE.Vector2(0, 0);
      const onPointer = (e: PointerEvent) => target.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);

      // Tema berganti → warna garis ikut
      const themeObserver = new MutationObserver(() => {
        const next = themeLook();
        material.uniforms.uColor.value.set(next.color);
        material.uniforms.uOpacity.value = next.opacity;
        if (reduced) renderer.render(scene, camera);
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      let frame = 0;
      let last = performance.now();
      const tick = (now: number) => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        material.uniforms.uTime.value += dt;
        material.uniforms.uMouse.value.lerp(target, 0.04);
        renderer.render(scene, camera);
      };
      const onVisibility = () => {
        cancelAnimationFrame(frame);
        if (!document.hidden) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        }
      };

      renderer.render(scene, camera);
      requestAnimationFrame(() => (renderer.domElement.style.opacity = "1"));
      if (!reduced) {
        window.addEventListener("pointermove", onPointer, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        frame = requestAnimationFrame(tick);
      }

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        themeObserver.disconnect();
        ro.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} aria-hidden="true" className={cn("pointer-events-none", className)} />;
}
