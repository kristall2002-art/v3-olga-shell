/* Ольга Шевелева — визажист-стилист. Живой WebGL-эффект на основе Formwork — Aurelis (MIT, см. /credits.html) + лайтбокс + reveal. Без CDN. */
(() => {
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav backdrop after leaving the hero */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* hero intro is CSS-driven so it never depends on rAF being alive */
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('loaded')));
  setTimeout(() => hero.classList.add('loaded'), 400);

  /* ---------- WebGL aurora (живое сияние), со статичным градиентом-фолбэком ---------- */
  const canvas = document.getElementById('aurora');
  const gl = (!reduce && canvas) ? canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) : null;

  if (canvas && gl) {
    const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;
    const frag = `
      precision highp float;
      uniform float u_time; uniform vec2 u_res; uniform vec2 u_mouse;
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v=0.0, amp=0.55; mat2 m=mat2(1.6,1.2,-1.2,1.6);
        for(int i=0;i<6;i++){ v+=amp*noise(p); p=m*p; amp*=0.5; }
        return v;
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res.xy;
        vec2 p=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;
        float t=u_time*0.045;
        p += (u_mouse-0.5)*0.30;
        vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(3.2,-t)));
        vec2 r=vec2(fbm(p+1.7*q+vec2(1.7,9.2)+0.15*t), fbm(p+1.7*q+vec2(8.3,2.8)-0.12*t));
        float f=fbm(p+2.2*r);
        vec3 A=vec3(0.30,0.09,0.16);   /* глубокое вино */
        vec3 B=vec3(0.66,0.34,0.41);  /* пыльная роза */
        vec3 C=vec3(0.86,0.68,0.40);  /* шампань/золото */
        vec3 col=mix(A,B,smoothstep(0.15,0.75,f+0.15*r.x));
        col=mix(col,C,smoothstep(0.55,1.05,f*1.1+0.35*q.y+0.25*uv.y));
        float band=smoothstep(0.0,0.5,abs(sin((f+r.y)*3.14159+t)));
        col*=0.55+0.75*band;
        col*=0.35+0.9*uv.y;
        col+=0.035*C*pow(1.0-uv.y,3.0);
        float d=hash(gl_FragCoord.xy*0.5)*0.03-0.015;
        gl_FragColor=vec4(col+d,1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, 'u_time');
    const uR = gl.getUniformLocation(prog, 'u_res');
    const uM = gl.getUniformLocation(prog, 'u_mouse');
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; }, { passive: true });

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    function resize(){
      const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; gl.viewport(0,0,w,h); }
    }
    addEventListener('resize', resize);
    const start = performance.now();
    function frame(now){
      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uT, (now - start) / 1000);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    resize();
    requestAnimationFrame(frame);
  }
  /* если WebGL недоступен или prefers-reduced-motion — canvas остаётся со статичным
     CSS-градиентом, заданным инлайново в styles.css (#aurora background) */

  /* ---------- custom cursor ---------- */
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    const cur = document.querySelector('.cursor');
    const pos = { x: innerWidth/2, y: innerHeight/2, tx: innerWidth/2, ty: innerHeight/2 };
    addEventListener('pointermove', e => { pos.tx = e.clientX; pos.ty = e.clientY; });
    (function loop(){ pos.x += (pos.tx-pos.x)*0.18; pos.y += (pos.ty-pos.y)*0.18;
      cur.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.querySelectorAll('a,button,.gallery-item,.service,.cta').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('hot'));
      el.addEventListener('pointerleave', () => cur.classList.remove('hot'));
    });
  }

  /* ---------- scroll reveals (без CDN, IntersectionObserver) ---------- */
  const revealEls = document.querySelectorAll('.reveal:not(.hero .reveal)');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- lightbox для галереи портфолио ---------- */
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.querySelector('.lightbox');
  if (items.length && lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbCap = lightbox.querySelector('.lightbox-cap');
    const btnClose = lightbox.querySelector('.lightbox-close');
    const btnPrev = lightbox.querySelector('.lightbox-prev');
    const btnNext = lightbox.querySelector('.lightbox-next');
    let idx = 0, lastFocus = null;

    function show(i){
      idx = (i + items.length) % items.length;
      const img = items[idx].querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = img.alt;
    }
    function open(i){
      lastFocus = document.activeElement;
      show(i);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      btnClose.focus();
      document.body.style.overflow = 'hidden';
    }
    function close(){
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    items.forEach((el, i) => el.addEventListener('click', () => open(i)));
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }
})();
