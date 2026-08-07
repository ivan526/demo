(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShipmentRemarkCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(value, mode) {
    var text = value == null ? "" : String(value).trim();
    if (mode === "upper") return text.toUpperCase();
    if (mode === "lower") return text.toLowerCase();
    if (mode === "employeeId") {
      var match = text.match(/^([A-Za-z])\S*\s+(\d+)$/);
      return match ? match[1].toLowerCase() + match[2] : text;
    }
    return text;
  }

  function compare(actual, condition) {
    var expected = condition.value;
    switch (condition.operator || "equals") {
      case "equals": return actual === String(expected);
      case "notEquals": return actual !== String(expected);
      case "in": return expected.map(String).indexOf(actual) !== -1;
      case "notIn": return expected.map(String).indexOf(actual) === -1;
      case "contains": return actual.indexOf(String(expected)) !== -1;
      case "matches": return new RegExp(String(expected), condition.flags || "").test(actual);
      case "notMatches": return !new RegExp(String(expected), condition.flags || "").test(actual);
      case "empty": return actual === "";
      case "notEmpty": return actual !== "";
      default: throw new Error("未知操作符: " + condition.operator);
    }
  }

  function matches(rule, data) {
    var all = rule.all || [];
    var any = rule.any || [];
    return all.every(function (item) { return compare(data[item.field] || "", item); }) &&
      (any.length === 0 || any.some(function (item) { return compare(data[item.field] || "", item); }));
  }

  function render(template, data) {
    return String(template).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, function (_token, field) {
      return data[field] == null ? "" : String(data[field]);
    });
  }

  function validateRequiredFields(rule, data) {
    var missing = (rule.requiredFields || []).filter(function (field) { return !data[field]; });
    if (missing.length) throw new Error("规则“" + (rule.name || rule.id) + "”缺少字段：" + missing.join("、"));
  }

  function generate(data, config) {
    var hitRules = (config.rules || [])
      .filter(function (rule) { return rule.enabled !== false; })
      .sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); })
      .filter(function (rule) { return matches(rule, data); });
    var lines = [];
    if (config.includeExistingRemark && data.existingRemark) lines.push(data.existingRemark);
    hitRules.forEach(function (rule) {
      validateRequiredFields(rule, data);
      var output = render(rule.output, data);
      if (lines.indexOf(output) === -1) lines.push(output);
    });
    return { remark: lines.join(config.separator || "\n"), hitRules: hitRules };
  }

  return { normalize: normalize, compare: compare, matches: matches, render: render, generate: generate };
});
