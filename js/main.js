(function () {
  var cfg = window.TF3D_CONFIG || {};

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var status = form.querySelector(".status");
    var btn = form.querySelector("button[type=submit]");

    function show(kind, msg) {
      status.className = "status " + kind;
      status.textContent = msg;
    }

    // Show/hide a section based on a select's value. Hidden sections are also
    // disabled, so their fields are skipped by validation and never submitted.
    form.querySelectorAll("[data-controls]").forEach(function (sel) {
      var target = document.getElementById(sel.dataset.controls);
      var values = sel.dataset.revealOn.split("|");
      function update() {
        var on = values.indexOf(sel.value) !== -1;
        target.hidden = !on;
        target.disabled = !on;
      }
      sel.addEventListener("change", update);
      update();
    });

    var fileInput = form.querySelector("input[type=file]");
    var MAX = 10 * 1024 * 1024;

    function readBase64(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(",")[1]); };
        r.onerror = function () { reject(new Error("The file could not be read.")); };
        r.readAsDataURL(file);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector(".hp input").value) return; // honeypot
      if (!form.reportValidity()) return;

      var file = fileInput && fileInput.files[0];
      if (file && file.size > MAX) { show("err", "That file is over 10 MB. Please send a smaller file or a ZIP."); return; }

      var fd = new FormData(form);
      fd.delete("website");
      fd.delete("File");
      var data = new URLSearchParams();
      var order = [];
      data.append("formType", form.dataset.form);
      fd.forEach(function (v, k) {
        if (String(v).trim() !== "") { data.append(k, v); order.push(k); }
      });
      data.append("_fields", JSON.stringify(order));

      var ready = file
        ? readBase64(file).then(function (b64) {
            data.append("fileData", b64);
            data.append("fileName", file.name);
            data.append("fileType", file.type || "application/octet-stream");
          })
        : Promise.resolve();

      ready.then(function () { send(data, !!file); }).catch(function (err) { show("err", err.message); });
    });

    function send(data, hasFile) {

      // No endpoint configured yet: fall back to the visitor's email app.
      if (!cfg.ENDPOINT) {
        var lines = [];
        data.forEach(function (v, k) {
          if (k !== "formType" && k !== "_fields" && k.indexOf("file") !== 0) lines.push(k + ": " + v);
        });
        if (hasFile) lines.push("(Please attach your file to this email.)");
        location.href = "mailto:" + cfg.EMAIL +
          "?subject=" + encodeURIComponent(form.dataset.subject || "Website request") +
          "&body=" + encodeURIComponent(lines.join("\n"));
        show("ok", "Your email app should open with the request filled in. Press send to finish.");
        return;
      }

      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Sending...";
      fetch(cfg.ENDPOINT, { method: "POST", mode: "no-cors", body: data })
        .then(function () {
          form.reset();
          form.querySelectorAll("[data-controls]").forEach(function (s) { s.dispatchEvent(new Event("change")); });
          show("ok", "Thanks, your request was sent. We will reply by email, usually within a day or two.");
        })
        .catch(function () {
          show("err", "Something went wrong sending that. Please email us directly at " + cfg.EMAIL + ".");
        })
        .finally(function () { btn.disabled = false; btn.textContent = label; });
    }
  });
})();
