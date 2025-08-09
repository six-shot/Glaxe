"use client";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type DynamicBackgroundProps = {
  logoPath?: string;
  width?: number; // CSS px
  height?: number; // CSS px
  className?: string;
  style?: CSSProperties;
  pointSize?: number; // GL point size
  sampleStep?: number; // pixel sampling stride for particle density
  color?: string; // particle color hex, defaults to white
  animateGradient?: boolean; // animate brightness gradient across particles
  gradientSpeed?: number; // multiplier for animation speed (seconds)
};

type Rgb = { r: number; g: number; b: number };

type Particle = {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
};

type GeometryBuffers = {
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  vertexCount: number;
};

const DynamicBackground = ({
  logoPath = "/logo.png",
  width = 320,
  height = 214,
  className,
  style,
  pointSize = 2.5,
  sampleStep = 3,
  color = "#ffffff",
  animateGradient = true,
  gradientSpeed = 0.8,
}: DynamicBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const geometryRef = useRef<GeometryBuffers | null>(null);
  const timeUniformRef = useRef<WebGLUniformLocation | null>(null);
  const particleGridRef = useRef<Particle[]>([]);
  const posArrayRef = useRef<Float32Array | null>(null);
  const colorArrayRef = useRef<Float32Array | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const execCountRef = useRef<number>(0);
  const isCleanedUpRef = useRef<boolean>(false);
  const isMobileRef = useRef<boolean>(false);

  const CONFIG = {
    // Logo rasterization size in pixels for particle generation.
    // We will clamp this to the canvas dimensions later.
    logoSize: 1024,
    logoColor: "#999999",
    canvasBg: "#000000",
    forceStrength: 0.003,
    maxDisplacement: 80,
    returnForce: 0.025,
  } as const;

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const canvasEl: HTMLCanvasElement = canvasNode;

    const checkMobile = () => window.innerWidth < 768;
    isMobileRef.current = checkMobile();

    if (isMobileRef.current) {
      return;
    }

    isCleanedUpRef.current = false;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasEl.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      canvasEl.width = Math.floor(cssW * dpr);
      canvasEl.height = Math.floor(cssH * dpr);
    };
    // Initial size from props (fallback if not styled externally)
    canvasEl.style.width = `${width}px`;
    canvasEl.style.height = `${height}px`;
    resizeCanvas();

    const glMaybe = canvasEl.getContext("webgl", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });

    if (!glMaybe) {
      console.error("WebGL not supported");
      return;
    }

    const glCtx: WebGLRenderingContext = glMaybe;
    glRef.current = glCtx;
    glCtx.enable(glCtx.BLEND);
    glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);

    function hexToRgb(hex: string): Rgb {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
          }
        : { r: 1, g: 1, b: 1 };
    }

    const vertexShaderSource = `
      precision highp float;
      uniform vec2 u_resolution;
      varying vec2 v_uv;
      attribute vec2 a_position;
      attribute vec4 a_color;
      varying vec4 v_color;
      void main() {
         vec2 zeroToOne = a_position / u_resolution;
         vec2 clipSpace = (zeroToOne * 2.0 - 1.0);
         v_uv = zeroToOne;
         v_color = a_color;
         gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
         gl_PointSize = ${pointSize.toFixed(1)};
     }
    `;

    const waveExpr = animateGradient
      ? `0.65 + 0.35 * sin((v_uv.x + v_uv.y) * 8.0 + u_time * ${gradientSpeed.toFixed(
          2
        )})`
      : `1.0`;

    const fragmentShaderSource = `
      precision highp float;
      uniform float u_time;
      varying vec2 v_uv;
      varying vec4 v_color;
      void main() {
          if (v_color.a < 0.01) discard;
          
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          float wave = ${waveExpr};
          vec3 rgb = v_color.rgb * wave;
          gl_FragColor = vec4(rgb, v_color.a * alpha);
      }
    `;

    function createShader(
      gl: WebGLRenderingContext | null,
      type: number,
      source: string
    ): WebGLShader | null {
      if (!gl || isCleanedUpRef.current) return null;

      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    function createProgram(
      gl: WebGLRenderingContext | null,
      vertexShader: WebGLShader | null,
      fragmentShader: WebGLShader | null
    ): WebGLProgram | null {
      if (!gl || !vertexShader || !fragmentShader || isCleanedUpRef.current)
        return null;

      const program = gl.createProgram();
      if (!program) return null;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Error linking program:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }

      return program;
    }

    const vertexShader = createShader(
      glCtx,
      glCtx.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = createShader(
      glCtx,
      glCtx.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(glCtx, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    const positionAttributeLocation = glCtx.getAttribLocation(
      program,
      "a_position"
    );
    const colorAttributeLocation = glCtx.getAttribLocation(program, "a_color");
    const resolutionUniformLocation = glCtx.getUniformLocation(
      program,
      "u_resolution"
    );
    const timeUniformLocation = glCtx.getUniformLocation(program, "u_time");
    timeUniformRef.current = timeUniformLocation;

    const loadLogo = () => {
      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        if (isCleanedUpRef.current) return;

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        // Clamp logo raster size to smallest canvas dimension
        const dim = Math.min(canvasEl.width, canvasEl.height, CONFIG.logoSize);
        tempCanvas.width = dim;
        tempCanvas.height = dim;

        if (!tempCtx) return;

        tempCtx.clearRect(0, 0, CONFIG.logoSize, CONFIG.logoSize);

        const scale = 0.9;
        const scaledSize = dim * scale;
        const offset = (dim - scaledSize) / 2;

        tempCtx.drawImage(image, offset, offset, scaledSize, scaledSize);
        const imageData = tempCtx.getImageData(0, 0, dim, dim);

        initParticleSystem(imageData.data, dim);
      };

      image.onerror = () => {
        console.error("Failed to load logo image:", logoPath);
      };

      image.src = logoPath;
    };

    function initParticleSystem(pixels: Uint8ClampedArray, dim: number) {
      if (isCleanedUpRef.current) return;

      const centerX = canvasEl.width / 2;
      const centerY = canvasEl.height / 2;

      particleGridRef.current = [];
      const validParticles = [];
      const validPositions = [];
      const validColors = [];

      const logoTint = hexToRgb(color);

      for (let i = 0; i < dim; i += Math.max(1, sampleStep)) {
        for (let j = 0; j < dim; j += Math.max(1, sampleStep)) {
          const pixelIndex = (i * dim + j) * 4;
          const alpha = pixels[pixelIndex + 3];

          if (alpha > 10) {
            // Map sampled pixel to canvas pixel space around center
            const x = centerX + (j - dim / 2);
            const y = centerY + (i - dim / 2);

            validPositions.push(x, y);

            // Force solid alpha for bright white appearance
            const originalA = 1;

            validColors.push(logoTint.r, logoTint.g, logoTint.b, originalA);

            validParticles.push({
              ox: x,
              oy: y,
              vx: 0,
              vy: 0,
            });
          }
        }
      }

      particleGridRef.current = validParticles;
      posArrayRef.current = new Float32Array(validPositions);
      colorArrayRef.current = new Float32Array(validColors);

      const positionBuffer = glCtx.createBuffer();
      const colorBuffer = glCtx.createBuffer();

      if (
        !positionBuffer ||
        !colorBuffer ||
        !posArrayRef.current ||
        !colorArrayRef.current
      ) {
        return;
      }

      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, positionBuffer);
      glCtx.bufferData(
        glCtx.ARRAY_BUFFER,
        posArrayRef.current,
        glCtx.DYNAMIC_DRAW
      );

      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, colorBuffer);
      glCtx.bufferData(
        glCtx.ARRAY_BUFFER,
        colorArrayRef.current,
        glCtx.STATIC_DRAW
      );

      geometryRef.current = {
        positionBuffer,
        colorBuffer,
        vertexCount: validParticles.length,
      };

      console.log(`Created ${validParticles.length} particles`);
      startAnimation();
    }

    function startAnimation() {
      const startTime = performance.now();
      function animate() {
        if (
          isCleanedUpRef.current ||
          !glCtx ||
          !programRef.current ||
          !geometryRef.current
        ) {
          return;
        }

        if (!posArrayRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (execCountRef.current > 0) {
          execCountRef.current -= 1;

          const dynamicRadius =
            Math.max(canvasEl.width, canvasEl.height) * 0.35;
          const rad = dynamicRadius * dynamicRadius;
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;

          for (let i = 0, len = particleGridRef.current.length; i < len; i++) {
            const x = posArrayRef.current[i * 2];
            const y = posArrayRef.current[i * 2 + 1];
            const d = particleGridRef.current[i];

            const dx = mx - x;
            const dy = my - y;
            const dis = dx * dx + dy * dy;

            if (dis < rad && dis > 0) {
              const f = -rad / dis;
              const t = Math.atan2(dy, dx);

              const distFromOrigin = Math.sqrt(
                (x - d.ox) * (x - d.ox) + (y - d.oy) * (y - d.oy)
              );

              const forceMultiplier = Math.max(
                0.1,
                1 - distFromOrigin / (CONFIG.maxDisplacement * 2)
              );

              d.vx += f * Math.cos(t) * CONFIG.forceStrength * forceMultiplier;
              d.vy += f * Math.sin(t) * CONFIG.forceStrength * forceMultiplier;
            }

            const newX = x + (d.vx *= 0.82) + (d.ox - x) * CONFIG.returnForce;
            const newY = y + (d.vy *= 0.82) + (d.oy - y) * CONFIG.returnForce;

            const dx_origin = newX - d.ox;
            const dy_origin = newY - d.oy;
            const distFromOrigin = Math.sqrt(
              dx_origin * dx_origin + dy_origin * dy_origin
            );

            if (distFromOrigin > CONFIG.maxDisplacement) {
              const excess = distFromOrigin - CONFIG.maxDisplacement;
              const scale = CONFIG.maxDisplacement / distFromOrigin;
              const dampedScale =
                scale + (1 - scale) * Math.exp(-excess * 0.02);

              posArrayRef.current[i * 2] = d.ox + dx_origin * dampedScale;
              posArrayRef.current[i * 2 + 1] = d.oy + dy_origin * dampedScale;

              d.vx *= 0.7;
              d.vy *= 0.7;
            } else {
              posArrayRef.current[i * 2] = newX;
              posArrayRef.current[i * 2 + 1] = newY;
            }
          }

          glCtx.bindBuffer(
            glCtx.ARRAY_BUFFER,
            geometryRef.current.positionBuffer
          );
          glCtx.bufferSubData(glCtx.ARRAY_BUFFER, 0, posArrayRef.current);
        }

        const bgColor = hexToRgb(CONFIG.canvasBg);
        glCtx.viewport(0, 0, canvasEl.width, canvasEl.height);
        // Keep transparent background so canvas sits nicely within container
        glCtx.clearColor(bgColor.r, bgColor.g, bgColor.b, 0.0);
        glCtx.clear(glCtx.COLOR_BUFFER_BIT);

        glCtx.useProgram(programRef.current);

        glCtx.uniform2f(
          resolutionUniformLocation,
          canvasEl.width,
          canvasEl.height
        );
        if (timeUniformRef.current) {
          const t = (performance.now() - startTime) / 1000.0;
          glCtx.uniform1f(timeUniformRef.current, t);
        }

        glCtx.bindBuffer(
          glCtx.ARRAY_BUFFER,
          geometryRef.current.positionBuffer
        );
        glCtx.enableVertexAttribArray(positionAttributeLocation);
        glCtx.vertexAttribPointer(
          positionAttributeLocation,
          2,
          glCtx.FLOAT,
          false,
          0,
          0
        );

        glCtx.bindBuffer(glCtx.ARRAY_BUFFER, geometryRef.current.colorBuffer);
        glCtx.enableVertexAttribArray(colorAttributeLocation);
        glCtx.vertexAttribPointer(
          colorAttributeLocation,
          4,
          glCtx.FLOAT,
          false,
          0,
          0
        );

        glCtx.drawArrays(glCtx.POINTS, 0, geometryRef.current.vertexCount);

        animationFrameRef.current = requestAnimationFrame(animate);
      }

      animate();
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (isCleanedUpRef.current) return;

      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      mouseRef.current.x = (event.clientX - rect.left) * dpr;
      mouseRef.current.y = (event.clientY - rect.top) * dpr;
      execCountRef.current = 300;
    };

    // Observe the canvas element for size changes (responsive containers)
    const resizeObserver = new ResizeObserver(() => {
      if (isCleanedUpRef.current) return;
      const prevW = canvasEl.width;
      const prevH = canvasEl.height;
      resizeCanvas();
      // Translate particles so the logo stays centered on resize
      if (
        geometryRef.current &&
        particleGridRef.current.length > 0 &&
        posArrayRef.current
      ) {
        const dx = canvasEl.width / 2 - prevW / 2;
        const dy = canvasEl.height / 2 - prevH / 2;
        for (let i = 0; i < particleGridRef.current.length; i++) {
          const p = particleGridRef.current[i];
          p.ox += dx;
          p.oy += dy;
          posArrayRef.current[i * 2] += dx;
          posArrayRef.current[i * 2 + 1] += dy;
        }
        glCtx.bindBuffer(
          glCtx.ARRAY_BUFFER,
          geometryRef.current.positionBuffer
        );
        glCtx.bufferSubData(glCtx.ARRAY_BUFFER, 0, posArrayRef.current);
      }
    });
    resizeObserver.observe(canvasEl);

    document.addEventListener("mousemove", handleMouseMove);
    // No window resize listener; we rely on ResizeObserver

    loadLogo();

    return () => {
      isCleanedUpRef.current = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      document.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();

      if (glCtx && !glCtx.isContextLost()) {
        try {
          if (geometryRef.current) {
            glCtx.deleteBuffer(geometryRef.current.positionBuffer);
            glCtx.deleteBuffer(geometryRef.current.colorBuffer);
            geometryRef.current = null;
          }

          if (programRef.current) {
            const program = programRef.current as WebGLProgram;
            const shaders = glCtx.getAttachedShaders(program);
            if (shaders) {
              shaders.forEach((shader: WebGLShader) => {
                glCtx.detachShader(program, shader);
                glCtx.deleteShader(shader);
              });
            }
            glCtx.deleteProgram(program);
            programRef.current = null;
          }
        } catch (error) {
          console.warn("Error during WebGL cleanup:", error);
        }
      }

      particleGridRef.current = [];
      posArrayRef.current = null;
      colorArrayRef.current = null;
      mouseRef.current = { x: 0, y: 0 };
      execCountRef.current = 0;
    };
  }, [logoPath]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "relative",
        width: style?.width ?? `${width}px`,
        height: style?.height ?? `${height}px`,
        pointerEvents: "none",
        backgroundColor: "transparent",
        mixBlendMode: "normal",
        ...(style ?? {}),
      }}
    />
  );
};

export default DynamicBackground;
