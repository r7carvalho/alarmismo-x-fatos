/* Painel Alarmismo × Fatos — renderização a partir de window.DADOS (data/dados.js) */
(function () {
  "use strict";

  var PAGES = [
    { id: "index", href: "index.html", nome: "Visão geral" },
    { id: "A", href: "divida.html", nome: "Dívida" },
    { id: "B", href: "mercado.html", nome: "Mercado" },
    { id: "C", href: "economia.html", nome: "Economia real" },
    { id: "D", href: "costumes.html", nome: "Costumes" },
    { id: "E", href: "regime.html", nome: "Regime" },
    { id: "F", href: "eleicao-2026.html", nome: "Eleição 2026" },
    { id: "G", href: "whatsapp.html", nome: "WhatsApp" },
    { id: "H", href: "relatos.html", nome: "Relatos" },
    { id: "metodo", href: "metodo.html", nome: "Método" }
  ];
  var VEREDITOS = {
    nao_ocorreu: "Não ocorreu",
    ocorreu_parcialmente: "Ocorreu em parte",
    ocorreu: "Ocorreu",
    em_aberto: "Em aberto"
  };
  var ORDEM_V = ["nao_ocorreu", "ocorreu_parcialmente", "ocorreu", "em_aberto"];
  var GOVERNOS = [
    { de: 2016.37, ate: 2019, cls: "band-t", nome: "Temer" },
    { de: 2019, ate: 2023, cls: "band-b", nome: "Bolsonaro" },
    { de: 2023, ate: 2027, cls: "band-l", nome: "Lula 3" }
  ];

  var D = window.DADOS || { frentes: {} };
  var page = document.body.getAttribute("data-page");

  /* utilidades ---------------------------------------------------------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "cls") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function safeUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u) ? u : null; }
  function link(u, txt) {
    var s = safeUrl(u);
    if (!s) return el("span", { text: u ? String(u) : "" });
    var host = s.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0];
    return el("a", { href: s, target: "_blank", rel: "noopener noreferrer", text: txt || host });
  }
  function svg(tag, attrs) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function toYear(t) {
    var m = String(t).match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
    if (!m) return NaN;
    var y = +m[1], mo = m[2] ? +m[2] : 12, d = m[3] ? +m[3] : 28;
    return y + (mo - 1) / 12 + (d - 1) / 365;
  }
  function fmt(v) {
    if (typeof v !== "number") return String(v);
    var a = Math.abs(v);
    var dec = a >= 1000 ? 0 : a >= 100 ? 1 : 2;
    return v.toLocaleString("pt-BR", { maximumFractionDigits: dec });
  }
  function contar(alegs) {
    var c = { nao_ocorreu: 0, ocorreu_parcialmente: 0, ocorreu: 0, em_aberto: 0 };
    (alegs || []).forEach(function (a) { if (c[a.veredito] !== undefined) c[a.veredito]++; else c.em_aberto++; });
    return c;
  }
  function badge(v) {
    var k = VEREDITOS[v] ? v : "em_aberto";
    return el("span", { cls: "badge v-" + k }, [el("i"), VEREDITOS[k]]);
  }

  /* tema --------------------------------------------------------------- */
  function aplicarTema(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  try { aplicarTema(localStorage.getItem("tema")); } catch (e) {}

  /* cabeçalho ----------------------------------------------------------- */
  function header() {
    var nav = el("nav", { cls: "tabs", "aria-label": "Seções" });
    PAGES.forEach(function (p) {
      var a = el("a", { href: p.href, text: p.nome });
      if (p.id === page) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
    var btn = el("button", { id: "theme", type: "button", title: "Alternar tema", text: "◐" });
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      var nxt = dark ? "light" : "dark";
      aplicarTema(nxt);
      try { localStorage.setItem("tema", nxt); } catch (e) {}
    });
    var h = el("header", { cls: "top" }, [el("div", { cls: "wrap" }, [
      el("a", { cls: "brand", href: "index.html" }, ["Alarmismo × Fatos ", el("span", { text: "2022–2026" })]),
      nav, btn
    ])]);
    document.body.insertBefore(h, document.body.firstChild);
    var cur = nav.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function footer() {
    var f = el("footer", {}, [el("div", { cls: "wrap" }, [
      el("p", { text: "Levantamento de " + (D.gerado_em || "") + ". Cada número traz fonte e data; dados de 2026 podem ter sido revistos depois. Mensagens de WhatsApp aparecem anonimizadas." }),
      el("p", {}, ["Método e limites: ", el("a", { href: "metodo.html", text: "como este painel foi feito" }), "."])
    ])]);
    document.body.appendChild(f);
  }

  /* gráfico de linha ---------------------------------------------------- */
  function lineChart(s) {
    var pts = (s.pontos || []).map(function (p) { return { x: toYear(p.t), y: +p.v, t: p.t }; })
      .filter(function (p) { return isFinite(p.x) && isFinite(p.y); })
      .sort(function (a, b) { return a.x - b.x; });
    var box = el("div", { cls: "card chart" });
    box.appendChild(el("div", { cls: "ttl", text: s.nome }));
    var sub = el("div", { cls: "sub" }, [(s.unidade ? s.unidade + " · " : "") + "fonte: ", link(s.fonte)]);
    box.appendChild(sub);
    var repetido = pts.some(function (p, i) { return i && p.x === pts[i - 1].x; });
    if (pts.length < 4 || pts.length < (s.pontos || []).length || repetido) {
      var dl = el("div", { cls: "vals" });
      (s.pontos || []).forEach(function (p) {
        dl.appendChild(el("div", { cls: "val" }, [
          el("span", { cls: "vt", text: String(p.t) }),
          el("span", { cls: "vv", text: fmt(+p.v) + (s.unidade && s.unidade.length < 14 ? " " + s.unidade : "") })
        ]));
      });
      box.appendChild(dl);
      return box;
    }

    var W = window.innerWidth < 600 ? 380 : 560, H = window.innerWidth < 600 ? 220 : 230, m = { l: 44, r: 12, t: 18, b: 26 };
    var x0 = Math.floor(pts[0].x), x1 = Math.ceil(pts[pts.length - 1].x + 0.001);
    var ys = pts.map(function (p) { return p.y; });
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var pad = (y1 - y0) * 0.08 || Math.abs(y1) * 0.1 || 1;
    var lo = y0 >= 0 && y0 - pad < 0 ? 0 : y0 - pad, hi = y1 + pad;
    var raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var tick = [1, 2, 2.5, 5, 10].map(function (f) { return f * mag; }).filter(function (t) { return t >= raw; })[0];
    y0 = Math.floor(lo / tick) * tick; y1 = Math.ceil(hi / tick) * tick;
    function X(v) { return m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r); }
    function Y(v) { return H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b); }

    var g = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": s.nome });
    GOVERNOS.forEach(function (gv) {
      var a = Math.max(gv.de, x0), b = Math.min(gv.ate, x1);
      if (b <= a) return;
      g.appendChild(svg("rect", { x: X(a), y: m.t, width: X(b) - X(a), height: H - m.t - m.b, "class": gv.cls }));
      if (X(b) - X(a) > 46) {
        var tl = svg("text", { x: X(a) + 4, y: m.t + 11 }); tl.textContent = gv.nome; g.appendChild(tl);
      }
    });
    for (var v = y0; v <= y1 + tick / 1000; v += tick) {
      g.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), "class": "grid-l" }));
      var tt = svg("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end" }); tt.textContent = fmt(v); g.appendChild(tt);
    }
    var step = Math.max(1, Math.ceil((x1 - x0) / 8));
    for (var yr = x0; yr <= x1; yr += step) {
      var tx = svg("text", { x: X(yr), y: H - 8, "text-anchor": "middle" }); tx.textContent = yr; g.appendChild(tx);
    }
    var d = pts.map(function (p, k) { return (k ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1); }).join(" ");
    g.appendChild(svg("path", { d: d, "class": "ln" }));
    var last = pts[pts.length - 1];
    g.appendChild(svg("circle", { cx: X(last.x), cy: Y(last.y), r: 4, "class": "dot" }));
    var lt = svg("text", { x: X(last.x) - 6, y: Y(last.y) - 8, "text-anchor": "end" });
    lt.textContent = fmt(last.y); lt.style.fill = "var(--text)"; lt.style.fontWeight = "600"; g.appendChild(lt);

    var xh = svg("line", { y1: m.t, y2: H - m.b, "class": "xh", visibility: "hidden" });
    var hd = svg("circle", { r: 4, "class": "dot", visibility: "hidden" });
    g.appendChild(xh); g.appendChild(hd);
    var hit = svg("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
    g.appendChild(hit);
    var tip = el("div", { cls: "tip" });
    function mover(ev) {
      var r = g.getBoundingClientRect();
      var cx = (ev.clientX - r.left) / r.width * W;
      var best = pts[0];
      pts.forEach(function (p) { if (Math.abs(X(p.x) - cx) < Math.abs(X(best.x) - cx)) best = p; });
      xh.setAttribute("x1", X(best.x)); xh.setAttribute("x2", X(best.x)); xh.setAttribute("visibility", "visible");
      hd.setAttribute("cx", X(best.x)); hd.setAttribute("cy", Y(best.y)); hd.setAttribute("visibility", "visible");
      tip.textContent = best.t + " · " + fmt(best.y) + (s.unidade ? " " + s.unidade : "");
      tip.style.left = (X(best.x) / W * r.width) + "px";
      tip.style.top = (Y(best.y) / H * r.height) + "px";
      tip.style.opacity = 1;
    }
    function sair() { xh.setAttribute("visibility", "hidden"); hd.setAttribute("visibility", "hidden"); tip.style.opacity = 0; }
    hit.addEventListener("pointermove", mover);
    hit.addEventListener("pointerdown", mover);
    hit.addEventListener("pointerleave", sair);
    var holder = el("div", { style: "position:relative" }, [g, tip]);
    box.appendChild(holder);

    var ol = el("ol");
    pts.forEach(function (p) { ol.appendChild(el("li", { text: p.t + ": " + fmt(p.y) })); });
    box.appendChild(el("details", { cls: "tbl" }, [el("summary", { text: "Ver os valores" }), ol]));
    return box;
  }

  /* blocos da página de frente ----------------------------------------- */
  function alegacoes(list) {
    var sec = el("section");
    sec.appendChild(el("h2", { text: "Alegações e o que aconteceu (" + list.length + ")" }));
    if (!list.length) { sec.appendChild(el("p", { cls: "meta", text: "Nenhuma alegação registrada nesta frente." })); return sec; }
    var c = contar(list);
    var filtros = el("div", { cls: "filters", role: "group", "aria-label": "Filtrar por veredito" });
    var box = el("div", { cls: "claims" });
    var atual = "todos";
    function desenhar() {
      box.innerHTML = "";
      list.filter(function (a) { return atual === "todos" || a.veredito === atual; }).forEach(function (a) {
        var src = el("div", { cls: "src" });
        if (a.fonte_alegacao) src.appendChild(el("span", {}, ["alegação: ", link(a.fonte_alegacao)]));
        if (a.fonte_fato) src.appendChild(el("span", {}, ["fato: ", link(a.fonte_fato)]));
        box.appendChild(el("article", { cls: "card claim" }, [
          el("div", { cls: "head" }, [
            el("div", {}, [
              el("div", { cls: "quote", text: a.alegacao || "" }),
              el("div", { cls: "who", text: [a.quem, a.quando].filter(Boolean).join(" · ") })
            ]),
            badge(a.veredito)
          ]),
          a.o_que_aconteceu ? el("div", { cls: "fact", text: a.o_que_aconteceu }) : null,
          a.nota ? el("div", { cls: "note", text: a.nota }) : null,
          src
        ]));
      });
    }
    [["todos", "Todas (" + list.length + ")"]].concat(ORDEM_V.filter(function (k) { return c[k]; }).map(function (k) {
      return [k, VEREDITOS[k] + " (" + c[k] + ")"];
    })).forEach(function (p) {
      var b = el("button", { type: "button", "aria-pressed": p[0] === atual ? "true" : "false", text: p[1] });
      b.addEventListener("click", function () {
        atual = p[0];
        filtros.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        desenhar();
      });
      filtros.appendChild(b);
    });
    sec.appendChild(filtros);
    sec.appendChild(box);
    desenhar();
    return sec;
  }

  function comparativo(rows) {
    var sec = el("section", {}, [el("h2", { text: "Bolsonaro × Lula 3, lado a lado" })]);
    var wrap = el("div", { cls: "card cmp" });
    wrap.appendChild(el("div", { cls: "row hdr" }, [
      el("div", { text: "Indicador" }),
      el("div", {}, [el("span", { cls: "sw b" }), "Bolsonaro (2019–2022)"]),
      el("div", {}, [el("span", { cls: "sw l" }), "Lula 3 (2023–2026)"])
    ]));
    rows.forEach(function (r) {
      wrap.appendChild(el("div", { cls: "row" }, [
        el("div", { text: r.indicador }),
        el("div", {}, [el("span", { cls: "lbl", text: "Bolsonaro" }), r.bolsonaro || "—"]),
        el("div", {}, [el("span", { cls: "lbl", text: "Lula 3" }), r.lula3 || "—"]),
        r.leitura ? el("div", { cls: "read", text: r.leitura }) : null
      ]));
    });
    sec.appendChild(wrap);
    return sec;
  }

  function fontes(list) {
    var ul = el("ul", { cls: "fontes" });
    list.forEach(function (u) { ul.appendChild(el("li", {}, [link(u, u)])); });
    return el("section", {}, [el("h2", { text: "Fontes (" + list.length + ")" }), ul]);
  }

  function kpisFrente(f) {
    var c = contar(f.alegacoes);
    var g = el("div", { cls: "grid k" });
    ORDEM_V.forEach(function (k) {
      g.appendChild(el("div", { cls: "card kpi" }, [el("div", { cls: "v", text: String(c[k]) }), el("div", { cls: "l" }, [badge(k)])]));
    });
    return g;
  }

  function paginaFrente(id) {
    var f = D.frentes[id];
    var main = document.querySelector("main .wrap");
    if (!f) { main.appendChild(el("p", { text: "Frente ainda sem dados." })); return; }
    main.appendChild(el("h1", { text: f.titulo }));
    if (f.resumo) {
      var lede = el("p", { cls: "lede clamp", text: f.resumo });
      main.appendChild(lede);
      if (f.resumo.length > 420) {
        var mais = el("button", { cls: "mais", type: "button", "aria-expanded": "false", text: "Ler o resumo completo" });
        mais.addEventListener("click", function () {
          var aberto = lede.classList.toggle("clamp") === false;
          mais.setAttribute("aria-expanded", String(aberto));
          mais.textContent = aberto ? "Recolher" : "Ler o resumo completo";
        });
        main.appendChild(mais);
      } else lede.classList.remove("clamp");
    }
    if (id === "A" && D.video) {
      main.appendChild(el("h2", { text: "O vídeo que motivou o painel" }));
      var vid = String(D.video.id).replace(/[^\w-]/g, "");
      var capa = el("button", { cls: "video capa", type: "button", "aria-label": "Assistir: " + D.video.titulo }, [
        el("img", { src: "https://i.ytimg.com/vi/" + vid + "/hqdefault.jpg", alt: "", loading: "lazy" }),
        el("span", { cls: "play", text: "▶" })
      ]);
      capa.addEventListener("click", function () {
        capa.replaceWith(el("iframe", {
          cls: "video", src: "https://www.youtube-nocookie.com/embed/" + vid + "?autoplay=1", title: D.video.titulo,
          allow: "autoplay; encrypted-media; picture-in-picture", allowfullscreen: ""
        }));
      });
      main.appendChild(capa);
      main.appendChild(el("p", { cls: "meta", text: D.video.titulo + " · " + D.video.canal }));
    }
    if ((f.alegacoes || []).length) main.appendChild(kpisFrente(f));
    if ((f.series || []).length) {
      main.appendChild(el("h2", { text: "Séries" }));
      main.appendChild(el("div", { cls: "legend-bands" }, [
        el("span", { cls: "t", text: "Temer" }), el("span", { cls: "b", text: "Bolsonaro" }), el("span", { cls: "l", text: "Lula 3" })
      ]));
      var g = el("div", { cls: "grid c2" });
      f.series.forEach(function (s) { g.appendChild(lineChart(s)); });
      main.appendChild(g);
    }
    if ((f.relatos || []).length) {
      var rs = el("section", {}, [el("h2", { text: "Relatos anteriores" })]);
      var rg = el("div", { cls: "grid c2" });
      f.relatos.filter(function (r) { return r.publicavel !== false; }).forEach(function (r) {
        rg.appendChild(el("article", { cls: "card" }, [
          el("h3", { text: r.titulo }),
          el("div", { cls: "meta", text: [r.data, r.origem].filter(Boolean).join(" · ") }),
          el("p", { text: r.tese || "" }),
          safeUrl(r.url) ? el("p", {}, [link(r.url, "Abrir a página")]) : null
        ]));
      });
      rs.appendChild(rg); main.appendChild(rs);
    }
    main.appendChild(alegacoes(f.alegacoes || []));
    if ((f.comparativo_bolsonaro || []).length) main.appendChild(comparativo(f.comparativo_bolsonaro));
    if (f.contraponto) {
      main.appendChild(el("h2", { text: "Onde o alarme tinha fundamento" }));
      main.appendChild(el("div", { cls: "card contra" }, [el("p", { text: f.contraponto })]));
    }
    if ((f.fontes || []).length) main.appendChild(fontes(f.fontes));
  }

  /* visão geral -------------------------------------------------------- */
  function paginaIndex() {
    var main = document.querySelector("main .wrap");
    var tot = { nao_ocorreu: 0, ocorreu_parcialmente: 0, ocorreu: 0, em_aberto: 0 }, n = 0;
    PAGES.forEach(function (p) {
      var f = D.frentes[p.id]; if (!f) return;
      var c = contar(f.alegacoes); ORDEM_V.forEach(function (k) { tot[k] += c[k]; n += c[k]; });
    });
    var k = el("div", { cls: "grid k" });
    k.appendChild(el("div", { cls: "card kpi" }, [el("div", { cls: "v", text: String(n) }), el("div", { cls: "l", text: "alegações checadas" })]));
    ORDEM_V.forEach(function (v) {
      var pct = n ? Math.round(tot[v] / n * 100) : 0;
      k.appendChild(el("div", { cls: "card kpi" }, [el("div", { cls: "v", text: tot[v] + " " }, [el("span", { cls: "meta", text: pct + "%" })]), el("div", { cls: "l" }, [badge(v)])]));
    });
    main.appendChild(k);

    if (D.sintese && D.sintese.length) {
      main.appendChild(el("h2", { text: "O que o levantamento mostra" }));
      var sc = el("div", { cls: "card" });
      D.sintese.forEach(function (p) { sc.appendChild(el("p", { text: p })); });
      main.appendChild(sc);
    }

    main.appendChild(el("h2", { text: "Frentes" }));
    var g = el("div", { cls: "grid c2" });
    PAGES.forEach(function (p) {
      var f = D.frentes[p.id]; if (!f) return;
      var c = contar(f.alegacoes), t = (f.alegacoes || []).length;
      var bar = el("div", { cls: "stack", role: "img", "aria-label": ORDEM_V.map(function (v) { return VEREDITOS[v] + ": " + c[v]; }).join(", ") });
      ORDEM_V.forEach(function (v) { if (c[v]) bar.appendChild(el("div", { cls: v, style: "flex:" + c[v], title: VEREDITOS[v] + ": " + c[v] })); });
      var counts = el("div", { cls: "counts" });
      ORDEM_V.forEach(function (v) { if (c[v]) counts.appendChild(el("span", {}, [badge(v), " " + c[v]])); });
      g.appendChild(el("a", { cls: "card frente-card", href: p.href }, [
        el("h3", { text: f.titulo }),
        el("div", { cls: "meta", text: t + " alegações · " + (f.series || []).length + " séries" }),
        t ? bar : null, t ? counts : null,
        el("p", { cls: "meta", text: (f.resumo || "").slice(0, 260) + ((f.resumo || "").length > 260 ? "…" : "") })
      ]));
    });
    main.appendChild(g);
  }

  function paginaMetodo() {
    var main = document.querySelector("main .wrap");
    (D.metodo || []).forEach(function (b) {
      main.appendChild(el("h2", { text: b.titulo }));
      var c = el("div", { cls: "card" });
      (b.paragrafos || []).forEach(function (p) { c.appendChild(el("p", { text: p })); });
      main.appendChild(c);
    });
    if (D.alertas) {
      main.appendChild(el("h2", { text: "Divergências entre fontes registradas" }));
      main.appendChild(el("pre", { cls: "card", style: "white-space:pre-wrap;font-size:13px", text: D.alertas }));
    }
  }

  header();
  if (page === "index") paginaIndex();
  else if (page === "metodo") paginaMetodo();
  else paginaFrente(page);
  footer();
})();
