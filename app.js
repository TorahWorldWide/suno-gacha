(function () {
  "use strict";
  var P = window.PROTOCOLS, BOT = window.BOT_USERNAME;
  var LIMIT = 3800;                       // Telegram trims drafts at 4096 code points
  var TME_MAX = 4000;                     // t.me answers "400 Bad Request" to an address longer than ~4100 characters
  var $ = function (id) { return document.getElementById(id); };
  var textEl = $("text"), reqEl = $("req"), countEl = $("count");
  var machine = $("machine"), balls = $("balls"), outCapsule = $("outCapsule");
  var grid = $("grid"), stage = $("stage"), pullBtn = $("pull");
  var sendBtn = $("send"), sendLabel = $("sendLabel");
  var reveal = $("reveal"), revCard = $("revCard"), confetti = $("confetti"), takeBtn = $("take");
  var toastEl = $("toast");

  var state = { id: null, part: 0, lastPull: null, busy: false };
  var store = {
    get: function (k) { try { return localStorage.getItem("sg:" + k) || ""; } catch (e) { return ""; } },
    set: function (k, v) { try { localStorage.setItem("sg:" + k, v); } catch (e) {} }
  };
  var byId = function (id) { return P.filter(function (p) { return p.id === id; })[0]; };
  var cpLen = function (s) { return Array.from(s).length; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var themeColor = { P1: "#ff2bd6", P2: "#ffd83d", P3: "#0fa3a3", P4: "#f2b32b", P5: "#ff4757", P0: "#c9a227" };

  /* ── decoration: stars in the sky, capsules in the dome ── */
  (function () {
    var s = $("stars"), glyph = ["✦", "✧", "★"], html = "";
    for (var i = 0; i < 16; i++) {
      html += '<i style="left:' + (Math.random() * 96) + "%;top:" + (Math.random() * 70) + "%;font-size:" + (10 + Math.random() * 16) +
        "px;animation-delay:" + (-Math.random() * 2.4) + 's">' + glyph[i % 3] + "</i>";
    }
    s.innerHTML = html;
    var spots = [[18, 118], [66, 132], [118, 126], [164, 112], [40, 78], [92, 84], [142, 74], [70, 40], [116, 36]];
    var cols = P.map(function (p) { return themeColor[p.id] || "#ff3d8b"; });
    balls.innerHTML = spots.map(function (xy, i) {
      return '<div class="capsule" style="left:' + xy[0] + "px;top:" + xy[1] + "px;--c:" + cols[i % cols.length] +
        ";--r:" + (i * 37 % 60 - 30) + "deg;--d:" + (2 + (i % 4) * 0.35) + "s;--dl:" + (-i * 0.3) + 's"></div>';
    }).join("");
  })();

  /* ── collection ── */
  grid.innerHTML = P.map(function (p) {
    return '<button class="mini" data-t="' + p.id + '" data-id="' + p.id + '" aria-label="' + esc(p.name) + '">' +
      '<span class="id">' + p.id + '</span><span class="art"><span class="e">' + p.emoji + '</span></span>' +
      '<span class="label"><span class="n">' + esc(p.name) + '</span><span class="g">' + esc(p.tagline) + "</span></span></button>";
  }).join("");
  grid.addEventListener("click", function (e) {
    var b = e.target.closest(".mini");
    if (b) choose(b.dataset.id, true);
  });

  function pips(n) { var h = ""; for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= n ? "f" : "") + '"></i>'; return '<span class="pips">' + h + "</span>"; }

  function renderStage(p, open) {
    stage.hidden = false;
    stage.innerHTML =
      '<article class="big" data-t="' + p.id + '">' +
        '<div class="decor" data-t="' + p.id + '"><span class="pid">' + p.id + '</span><div class="hero">' + p.emoji + '</div><div class="side">' + p.emoji2 + "</div></div>" +
        '<div class="body">' +
          "<h3>" + esc(p.name) + '</h3><p class="tag">' + esc(p.tagline) + "</p>" +
          '<p class="quote">' + esc(p.analogy) + "</p>" +
          '<details class="more"' + (open ? " open" : "") + "><summary>כל הפרטים על הקלף</summary>" +
          '<div class="meters"><span class="meter">סיכון ' + pips(p.risk) + '</span><span class="meter">הפתעה ' + pips(p.surprise) + "</span></div>" +
          "<h4>איך זה עובד</h4><ol class=\"steps\">" + p.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
          "<h4>מה לוחצים בסונו</h4><div class=\"chips\">" + p.suno.map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("") + "</div>" +
          '<p class="warn">' + esc(p.warn) + "</p>" +
        "</details></div></article>";
  }

  function choose(id, scroll) {
    var p = byId(id); if (!p) return;
    state.id = id; state.part = 0;
    store.set("proto", id);
    document.body.dataset.theme = id;
    Array.prototype.forEach.call(grid.children, function (b) { b.classList.toggle("on", b.dataset.id === id); });
    renderStage(p, !!scroll);   // picked by hand → details open; restored on load → folded
    refresh();
    if (scroll) stage.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── the pull ── */
  pullBtn.addEventListener("click", function () {
    if (state.busy) return;
    var pool = P.filter(function (p) { return p.pull && p.id !== state.lastPull; });
    var p = pool[Math.floor(Math.random() * pool.length)];
    state.busy = true; state.lastPull = p.id;
    outCapsule.classList.remove("drop");
    machine.classList.add("spin");
    if (navigator.vibrate) { try { navigator.vibrate([30, 40, 30, 40, 60]); } catch (e) {} }
    setTimeout(function () {
      machine.classList.remove("spin");
      outCapsule.style.setProperty("--c", themeColor[p.id]);
      void outCapsule.offsetWidth;
      outCapsule.classList.add("drop");
    }, 1100);
    setTimeout(function () { showReveal(p); }, 1750);
  });

  function showReveal(p) {
    reveal.dataset.t = p.id;
    var stars = ""; for (var i = 0; i < Math.max(3, p.surprise); i++) stars += "★";
    revCard.innerHTML = '<div class="rc"><div class="new">NEW!</div><div class="e">' + p.emoji + '</div><div class="n">' + esc(p.name) +
      '</div><div class="g">' + esc(p.tagline) + '</div><div class="st">' + stars + "</div></div>";
    var cols = ["#ff3d8b", "#ffd83d", "#35e0ff", "#7dff3a", "#ffffff", themeColor[p.id]], html = "";
    for (var j = 0; j < 46; j++) {
      html += '<i style="left:' + (Math.random() * 100) + "%;background:" + cols[j % cols.length] + ";animation-duration:" + (1.6 + Math.random() * 1.8) +
        "s;animation-delay:" + (1.2 + Math.random() * 0.9) + 's"></i>';
    }
    confetti.innerHTML = html;
    reveal.hidden = false;
    reveal.dataset.pending = p.id;
  }
  function closeReveal() {
    if (reveal.hidden) return;
    var id = reveal.dataset.pending;
    reveal.hidden = true; state.busy = false;
    choose(id, true);
  }
  takeBtn.addEventListener("click", function (e) { e.stopPropagation(); closeReveal(); });

  /* ── the message ── */
  var TEAMIM = /[֑-ֽ֯]/g;
  function buildParts() {
    var p = byId(state.id), text = textEl.value.trim(), req = reqEl.value.trim();
    if (!p || !text) return [];
    var head = function (k, n) {
      return "🎰 סונו גאצ'ה" + (n > 1 ? " · חלק " + k + "/" + n : "") + "\nפרוטוקול: " + p.id + " · " + p.name + "\n" +
        (req ? "בקשה: " + req + "\n" : "") + "———\n";
    };
    var room = LIMIT - cpLen(head(9, 9));
    if (cpLen(text) > room) text = text.replace(TEAMIM, "");
    var chunks = [];
    if (cpLen(text) <= room) chunks = [text];
    else {
      // split on verse ends (sof pasuq) or line breaks, never mid-verse when avoidable
      var units = text.split(/(?<=[׃\n])/), cur = "";
      units.forEach(function (u) {
        while (cpLen(u) > room) { var a = Array.from(u); chunks.push((cur + a.slice(0, room - cpLen(cur)).join(""))); u = a.slice(room - cpLen(cur)).join(""); cur = ""; }
        if (cpLen(cur) + cpLen(u) > room) { chunks.push(cur); cur = u; } else cur += u;
      });
      if (cur.trim()) chunks.push(cur);
    }
    return chunks.map(function (c, i) { return head(i + 1, chunks.length) + c.trim(); });
  }

  function refresh() {
    var has = textEl.value.trim().length > 0, p = byId(state.id), n = cpLen(textEl.value.trim());
    var parts = has && p ? buildParts() : [];
    countEl.className = "count";
    countEl.textContent = has ? n + " תווים" : "";
    if (parts.length > 1) { countEl.classList.add("warn"); countEl.textContent = "טקסט ארוך — יישלח ב־" + parts.length + " הודעות"; }
    if (!p) { sendBtn.disabled = true; sendLabel.textContent = "קודם בוחרים קלף"; }
    else if (!has) { sendBtn.disabled = true; sendLabel.textContent = "עכשיו מדביקים פסוקים"; }
    else {
      sendBtn.disabled = false;
      if (state.part >= parts.length) state.part = 0;
      sendLabel.textContent = parts.length > 1 ? "שלח חלק " + (state.part + 1) + " מתוך " + parts.length : "שלח להרמס · " + p.name;
    }
  }

  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.remove("act"); toastEl.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 5200);
  }

  sendBtn.addEventListener("click", function () {
    var parts = buildParts(); if (!parts.length) return;
    var msg = parts[state.part], more = state.part < parts.length - 1;
    try { if (navigator.clipboard) navigator.clipboard.writeText(msg).catch(function () {}); } catch (e) {}
    toast(more ? "בטלגרם: בוחרים את הרמס ולוחצים שלח — ואז חוזרים לכאן לחלק הבא." : "בטלגרם: בוחרים את הרמס, ההודעה כבר מחכה בשורה — נשאר ללחוץ שלח.", 8000);
    state.part = more ? state.part + 1 : 0;
    refresh();
    openTelegram(msg);
  });

  // Telegram throws the draft away when the link points at a chat that is already on screen (it only
  // shakes the chat), and this page is normally opened from the Hermes chat itself. A share link has
  // no such case: Telegram asks which chat, then puts the text in that chat's draft.
  // A Hebrew letter or vowel point costs 6 address characters, so anything but a short text is past
  // t.me's limit. Those go straight to the Telegram app with the same link t.me itself hands over.
  function openTelegram(msg) {
    var enc = encodeURIComponent(msg), web = "https://t.me/share/url?url=" + enc;
    if (web.length <= TME_MAX) { window.__gacha.go(web); return; }
    var left = false, mark = function () { left = true; toastEl.classList.remove("show"); };
    window.addEventListener("blur", mark, { once: true });
    document.addEventListener("visibilitychange", mark, { once: true });
    setTimeout(function () { if (!left && !document.hidden) notOpened(); }, 2500);
    window.__gacha.go("tg://msg_url?url=" + enc);
  }
  function notOpened() {
    toast("טלגרם לא נפתח לבד? ההודעה כבר הועתקה — ", 20000);
    var a = document.createElement("a");
    a.href = "https://t.me/" + BOT; a.textContent = "פותחים את הצ'אט ומדביקים";
    toastEl.appendChild(a); toastEl.classList.add("act");
  }

  /* ── wiring + restore ── */
  textEl.value = store.get("text"); reqEl.value = store.get("req");
  textEl.addEventListener("input", function () { store.set("text", textEl.value); state.part = 0; refresh(); });
  reqEl.addEventListener("input", function () { store.set("req", reqEl.value); refresh(); });
  var saved = store.get("proto");
  if (saved && byId(saved)) choose(saved, false); else refresh();

  window.__gacha = { buildParts: buildParts, choose: choose, state: state, go: function (url) { window.location.href = url; } };
})();
