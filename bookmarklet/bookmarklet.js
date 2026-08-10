/* eslint-env browser */
(function () {
  "use strict";
  var config = window.SHIPMENT_BOOKMARKLET_CONFIG;
  var core = window.ShipmentRemarkCore;
  if (!config || !core) return alert("发货备注助手配置加载失败");
  var old = document.getElementById("shipment-bookmarklet-panel");
  if (old) old.remove();

  function copyText(textarea, onSuccess, onFailure) {
    function fallback() {
      textarea.focus();
      textarea.select();
      return document.execCommand("copy");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textarea.value).then(onSuccess, function () {
        fallback() ? onSuccess() : onFailure();
      });
    } else {
      fallback() ? onSuccess() : onFailure();
    }
  }

  function readRaw(element, spec) {
    return spec.presentValue !== undefined ? spec.presentValue :
      (spec.attribute ? (element.getAttribute(spec.attribute) || element.textContent) :
        (spec.value === "value" && element.value != null ? element.value : element.textContent));
  }

  function findElement(root, spec) {
    var elements = Array.prototype.slice.call(root.querySelectorAll(spec.selector));
    if (spec.matchText) {
      return elements.find(function (candidate) { return candidate.textContent.trim() === spec.matchText; });
    }
    return elements.find(function (candidate) {
      return String(readRaw(candidate, spec)).trim() !== "";
    }) || elements[0];
  }

  function findElementInSameKeyRows(selectedRow, spec) {
    if (!spec.selectedRowKeyAttribute) return null;
    var key = selectedRow.getAttribute(spec.selectedRowKeyAttribute);
    if (!key) return null;
    var selector = ".grid-row[" + spec.selectedRowKeyAttribute + "='" + key.replace(/'/g, "\\'") + "']";
    var rows = Array.prototype.slice.call(document.querySelectorAll(selector));
    var first = null;
    for (var i = 0; i < rows.length; i += 1) {
      var candidate = findElement(rows[i], spec);
      if (!candidate) continue;
      if (!first) first = candidate;
      if (String(readRaw(candidate, spec)).trim()) return candidate;
    }
    return first;
  }

  function findRow(selector, spec) {
    var rows = Array.prototype.slice.call(document.querySelectorAll(selector));
    return spec.rowContainsSelector
      ? rows.find(function (row) { return row.querySelector(spec.rowContainsSelector); })
      : rows[0];
  }


  function readHistoryHandler(spec, data) {
    var expectedOpinionText = data[spec.opinionContainsField] || spec.opinionContains || "";
    var rows = Array.prototype.slice.call(document.querySelectorAll(spec.rowSelector || "tr"));
    for (var i = 0; i < rows.length; i += 1) {
      var opinion = findElement(rows[i], { selector: spec.opinionSelector });
      var node = findElement(rows[i], { selector: spec.nodeSelector });
      var handler = findElement(rows[i], { selector: spec.handlerSelector });
      var opinionText = opinion ? String(readRaw(opinion, { value: opinion.value !== undefined ? "value" : "text" })).trim() : "";
      var nodeText = node ? String(readRaw(node, { value: node.value !== undefined ? "value" : "text" })).trim() : "";
      if (expectedOpinionText && opinionText.indexOf(String(expectedOpinionText).trim()) === -1) continue;
      if (spec.nodeEquals && nodeText !== spec.nodeEquals) continue;
      if (handler) return readRaw(handler, { value: handler.value !== undefined ? "value" : "text" });
    }
    return "";
  }

  function readField(key, spec, data) {
    if (spec.source === "historyHandler") return core.normalize(readHistoryHandler(spec, data || {}), spec.normalize);
    var root = document;
    var selectedRow = null;
    if (spec.selectedRowSelector) {
      selectedRow = findRow(spec.selectedRowSelector, spec);
      if (!selectedRow && spec.defaultRowSelector) selectedRow = findRow(spec.defaultRowSelector, spec);
      root = selectedRow;
      if (!root) {
        if (spec.optional) return "";
        throw new Error("找不到已勾选行或默认首行：" + spec.selectedRowSelector);
      }
    }
    var element = findElement(root, spec);
    if (selectedRow && (!element || !String(readRaw(element, spec)).trim())) {
      element = findElementInSameKeyRows(selectedRow, spec) || element;
    }
    var levels = spec.ancestorLevels || 0;
    while (element && levels > 0) {
      element = element.parentElement;
      levels -= 1;
    }
    if (element && spec.targetSelector) element = element.querySelector(spec.targetSelector);
    if (!element) {
      if (spec.optional) return "";
      throw new Error("找不到“" + spec.label + "”：" + spec.selector);
    }
    return core.normalize(readRaw(element, spec), spec.normalize);
  }

  function revealDeferredFields(done) {
    var deferred = Object.keys(config.fields).map(function (key) { return config.fields[key]; }).filter(function (spec) {
      if (!spec.revealSelector) return false;
      var element = findElement(document, spec);
      return !element || !String(readRaw(element, spec)).trim();
    });
    if (!deferred.length) return done();
    deferred.forEach(function (spec) {
      var trigger = document.querySelector(spec.revealSelector);
      if (trigger) trigger.click();
    });
    var timeout = Math.max.apply(null, deferred.map(function (spec) { return spec.revealTimeout || 3000; }));
    var deadline = Date.now() + timeout;
    function check() {
      var ready = deferred.every(function (spec) {
        var element = findElement(document, spec);
        return element && String(readRaw(element, spec)).trim();
      });
      if (ready || Date.now() >= deadline) return done();
      window.setTimeout(check, 100);
    }
    check();
  }

  function run() {
    try {
      var data = {};
      Object.keys(config.fields).forEach(function (key) { data[key] = readField(key, config.fields[key], data); });
      var result = core.generate(data, config);
      var panel = document.createElement("section");
      panel.id = "shipment-bookmarklet-panel";
      panel.style.cssText = "position:fixed;z-index:2147483647;right:24px;top:24px;width:380px;padding:18px;background:#fff;color:#172033;border:1px solid #ccd3df;border-radius:12px;box-shadow:0 12px 40px #0004;font:14px/1.5 sans-serif";
      var title = document.createElement("strong"); title.textContent = config.title || "发货备注助手";
      var close = document.createElement("button"); close.textContent = "×"; close.title = "关闭"; close.style.cssText = "float:right;border:0;background:none;font-size:22px;cursor:pointer"; close.onclick = function () { panel.remove(); };
      var info = document.createElement("div"); info.style.cssText = "margin:10px 0;color:#526071";
      info.textContent = result.hitRules.length ? "命中规则：" + result.hitRules.map(function (r) { return r.name || r.id; }).join("、") : "没有命中规则，请核对页面信息。";
      var textarea = document.createElement("textarea"); textarea.value = result.remark; textarea.style.cssText = "box-sizing:border-box;width:100%;min-height:130px;padding:10px;border:1px solid #aeb8c8;border-radius:7px;resize:vertical";
      var copy = document.createElement("button"); copy.textContent = "正在自动复制…"; copy.style.cssText = "margin-top:10px;width:100%;padding:9px;border:0;border-radius:7px;background:#1769e0;color:#fff;cursor:pointer";
      copy.onclick = function () {
        copyText(textarea, function () { copy.textContent = "已复制，可再次点击复制"; }, function () { copy.textContent = "复制失败，请手工复制"; });
      };
      panel.append(close, title, info, textarea, copy); document.body.appendChild(panel);
      if (result.remark) {
        copyText(textarea, function () { copy.textContent = "已自动复制，可再次点击复制"; }, function () { copy.textContent = "自动复制失败，请点击复制"; });
      } else {
        copy.textContent = "没有可复制的备注";
      }
    } catch (error) {
      alert("发货备注助手：" + error.message);
    }
  }

  revealDeferredFields(run);
})();
