// GBÈ — client (PWA) : interface chat, offline-first, audio natif (micro).
// Les données passent par le serveur-relais (server.js). Tout ce qui est publié
// est gardé localement et envoyé dès que le réseau revient.

(function () {
  "use strict";
  var CATS = [
    { k: "info", emo: "💬", label: "Info", c: "var(--green)" },
    { k: "inondation", emo: "🌊", label: "Inondation", c: "var(--blue)" },
    { k: "incendie", emo: "🔥", label: "Incendie", c: "var(--red)" },
    { k: "secours", emo: "🚑", label: "Secours", c: "var(--red)" },
    { k: "securite", emo: "🛡️", label: "Sécurité", c: "var(--amber)" },
    { k: "violence", emo: "🆘", label: "Violence / abus", c: "var(--purple)" },
    { k: "denonciation", emo: "📢", label: "Dénoncer", c: "var(--green-700)" }
  ];
  var CBY = {}; CATS.forEach(function (c) { CBY[c.k] = c; });
  var DEPTS = ["Alibori","Atacora","Atlantique","Borgou","Collines","Couffo","Donga","Littoral","Mono","Ouémé","Plateau","Zou","Autre"];
  var LS = { pref: "gbe_pref", cache: "gbe_cache", out: "gbe_out", vid: "gbe_vid" };

  function lget(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid() { try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  var $ = function (s) { return document.querySelector(s); };

  var viewerId = lget(LS.vid, null); if (!viewerId) { viewerId = uid(); lset(LS.vid, viewerId); }
  var pref = lget(LS.pref, { dept: "", type: "info" });
  var feed = lget(LS.cache, []);
  var outbox = lget(LS.out, []);
  var selected = pref.type || "info";
  var pendingAudio = null, atBottom = true, since = 0;

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function timeAgo(ts) {
    var s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "à l'instant";
    var m = Math.round(s / 60); if (m < 60) return "il y a " + m + " min";
    var h = Math.round(m / 60); if (h < 24) return "il y a " + h + " h";
    return "il y a " + Math.round(h / 24) + " j";
  }

  function buildCats() {
    $("#cats").innerHTML = CATS.map(function (c) {
      return '<button type="button" class="pill" data-k="' + c.k + '" aria-pressed="' + (c.k === selected) + '" style="--c:' + c.c + '">' + c.emo + ' ' + c.label + '</button>';
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll(".pill"), function (b) {
      b.addEventListener("click", function () {
        selected = b.getAttribute("data-k"); pref.type = selected; lset(LS.pref, pref);
        Array.prototype.forEach.call(document.querySelectorAll(".pill"), function (x) { x.setAttribute("aria-pressed", x === b); });
      });
    });
  }
  function buildDepts() {
    $("#dept").innerHTML = '<option value="">📍 Région…</option>' + DEPTS.map(function (d) { return '<option>' + d + '</option>'; }).join("");
    if (pref.dept) $("#dept").value = pref.dept;
    $("#dept").addEventListener("change", function () { pref.dept = $("#dept").value; lset(LS.pref, pref); });
  }

  function mergeInto(items) {
    var known = {}; feed.forEach(function (f) { known[f.id] = true; });
    items.forEach(function (it) { if (!known[it.id]) { feed.push(it); known[it.id] = true; } if (it.createdAt > since) since = it.createdAt; });
    feed = feed.slice(-300); lset(LS.cache, feed);
  }

  function render() {
    var map = {};
    feed.forEach(function (it) { map[it.id] = { it: it, pending: false }; });
    outbox.forEach(function (it) { if (!map[it.id]) map[it.id] = { it: it, pending: true }; });
    var items = Object.keys(map).map(function (k) { return map[k]; });
    items.sort(function (a, b) { return a.it.createdAt - b.it.createdAt; });

    var th = $("#thread");
    Array.prototype.slice.call(th.querySelectorAll(".bubble")).forEach(function (n) { n.remove(); });
    $("#empty").hidden = items.length > 0;

    items.forEach(function (e) {
      var p = e.it, cat = CBY[p.type] || { label: p.type, c: "var(--muted)" };
      var mine = p.authorId === viewerId;
      var loc = [p.commune, p.zone].filter(Boolean).join(" · ");
      var li = document.createElement("div");
      li.className = "bubble" + (mine ? " me" : "") + (e.pending ? " pending" : "");
      li.style.setProperty("--c", cat.c);
      li.innerHTML =
        '<div class="b-top"><span class="chip-cat">' + esc(cat.label) + '</span>' +
          '<span class="b-who">' + esc(p.author || "Anonyme") + (loc ? ' · ' + esc(loc) : '') + (mine ? ' · toi' : '') + '</span></div>' +
        (p.text ? '<div class="b-text">' + esc(p.text) + '</div>' : '') +
        (p.audioUrl ? '<audio controls preload="none" src="' + esc(p.audioUrl) + '"></audio>' : '') +
        '<div class="b-meta">' + timeAgo(p.createdAt) + (e.pending ? ' · envoi…' : '') + '</div>';
      th.appendChild(li);
    });
    if (atBottom) th.scrollTop = th.scrollHeight;
  }
  $("#thread").addEventListener("scroll", function () {
    var th = $("#thread"); atBottom = (th.scrollHeight - th.scrollTop - th.clientHeight) < 60;
  });

  function setNet(online) { var n = $("#net"); n.className = "net" + (online ? "" : " off"); n.title = online ? "En ligne" : "Hors-ligne — envoi en attente"; }

  // ---- synchronisation avec le serveur ----
  var syncing = false;
  function sync() {
    if (syncing) return; syncing = true;
    var chain = Promise.resolve();
    if (outbox.length) {
      var payload = outbox.map(function (o) { return o; });
      chain = fetch("api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (r.ok) { feed = feed.concat(outbox); outbox = []; lset(LS.out, outbox); lset(LS.cache, feed.slice(-300)); } });
    }
    chain.then(function () {
      return fetch("api/feed?since=0").then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.items) { mergeInto(j.items); render(); }
        setNet(true);
      });
    }).catch(function () { setNet(false); }).then(function () { syncing = false; });
  }

  function publish(type, text) {
    var t = (text || "").trim();
    if (type !== "secours" && !t && !pendingAudio) { $("#msg").focus(); return; }
    var it = { id: uid(), type: type, text: t, author: "Anonyme", zone: $("#dept").value || "", commune: "", createdAt: Date.now(), authorId: viewerId };
    if (pendingAudio) { it.audioUrl = pendingAudio.url; it.audioId = pendingAudio.id; }
    outbox.push(it); lset(LS.out, outbox);
    atBottom = true; render();
    $("#msg").value = ""; $("#msg").style.height = "auto"; clearAudio();
    sync();
  }

  // ---- audio natif (MediaRecorder) ----
  var mediaRec = null, chunks = [], recording = false, recTimer = null, recStart = 0;
  function clearAudio() { pendingAudio = null; $("#audioTag").style.display = "none"; }
  function stopStream(stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }

  function startRec() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { $("#warn").textContent = "Ton téléphone ne permet pas l'enregistrement ici. Tu peux écrire."; return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      chunks = []; mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      mediaRec.onstop = function () {
        stopStream(stream);
        var blob = new Blob(chunks, { type: (mediaRec.mimeType || "audio/webm") });
        uploadAudio(blob);
      };
      mediaRec.start();
      recording = true; recStart = Date.now();
      $("#micBtn").classList.add("recording"); $("#micBtn").textContent = "⏹";
      $("#warn").textContent = "🎙️ Enregistrement… appuie à nouveau pour arrêter.";
      recTimer = setTimeout(function () { if (recording) stopRec(); }, 60000); // 60 s max
    }).catch(function () { $("#warn").textContent = "Micro refusé. Autorise le micro, ou écris ton message."; });
  }
  function stopRec() {
    recording = false; if (recTimer) { clearTimeout(recTimer); recTimer = null; }
    $("#micBtn").classList.remove("recording"); $("#micBtn").textContent = "🎤";
    try { if (mediaRec && mediaRec.state !== "inactive") mediaRec.stop(); } catch (e) {}
  }
  function uploadAudio(blob) {
    $("#micBtn").textContent = "⏳";
    fetch("api/audio", { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        $("#micBtn").textContent = "🎤";
        if (j && j.ok && j.url) { pendingAudio = { id: j.id, url: j.url }; $("#audioTag").style.display = "flex"; $("#warn").textContent = "Vocal prêt. ⚠️ La voix peut te faire reconnaître."; }
        else { $("#warn").textContent = "Échec du vocal. Réessaie ou écris."; }
      })
      .catch(function () { $("#micBtn").textContent = "🎤"; $("#warn").textContent = "Vocal non envoyé (hors-ligne ?). Écris ton message."; });
  }
  $("#micBtn").addEventListener("click", function () { if (recording) stopRec(); else startRec(); });
  $("#audioRemove").addEventListener("click", clearAudio);

  // ---- événements ----
  $("#msg").addEventListener("input", function () { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });
  $("#sendBtn").addEventListener("click", function () { publish(selected, $("#msg").value); });
  $("#sosBtn").addEventListener("click", function () { publish("secours", $("#msg").value || "SOS — besoin de secours immédiat"); });
  $("#helpBtn").addEventListener("click", function () { $("#help").hidden = false; });
  $("#helpClose").addEventListener("click", function () { $("#help").hidden = true; });
  window.addEventListener("online", sync);
  window.addEventListener("offline", function () { setNet(false); });

  // ---- init ----
  buildCats(); buildDepts(); render();
  setInterval(render, 30000);          // rafraîchir les horodatages
  setInterval(function () { if (navigator.onLine) sync(); }, 15000);
  sync();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
