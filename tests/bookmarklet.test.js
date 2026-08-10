const fs = require("fs");
const path = require("path");
const vm = require("vm");
const core = require("../bookmarklet/core");

function loadBookmarkletConfig() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../bookmarklet/config.js"), "utf8"), context);
  return context.window.SHIPMENT_BOOKMARKLET_CONFIG;
}


const config = {
  includeExistingRemark: true,
  separator: "\n",
  rules: [
    { id: "low", priority: 1, all: [{ field: "country", operator: "notIn", value: ["CN"] }], output: "B" },
    { id: "high", priority: 10, all: [{ field: "purpose", operator: "in", value: ["Demo"] }], output: "A" }
  ]
};

test("generates remarks in priority order and retains existing remark", () => {
  expect(core.generate({ purpose: "Demo", country: "DE", existingRemark: "Existing" }, config)).toEqual({
    remark: "Existing\nA\nB",
    hitRules: [config.rules[1], config.rules[0]]
  });
});

test("does not duplicate an existing generated line", () => {
  expect(core.generate({ purpose: "Demo", country: "CN", existingRemark: "A" }, config).remark).toBe("A");
});

test("supports normalization and condition operators", () => {
  expect(core.normalize(" de ", "upper")).toBe("DE");
  expect(core.compare("Germany", { operator: "contains", value: "man" })).toBe(true);
  expect(core.compare("DE", { operator: "matches", value: "^[A-Z]{2}$" })).toBe(true);
  expect(core.compare("Munich", { operator: "notMatches", value: "[\\u4E00-\\u9FFF]" })).toBe(true);
  expect(core.compare("慕尼黑", { operator: "notMatches", value: "[\\u4E00-\\u9FFF]" })).toBe(false);
});

test("renders entrusted shipment and process identifiers", () => {
  const entrustedConfig = {
    rules: [{
      id: "entrusted-shipment-identifiers",
      name: "具体单号标识",
      priority: -100,
      all: [{ field: "shippingMethod", operator: "equals", value: "委托发货" }],
      output: "走委托：{{entrustedShipmentNo}}，{{processCode}}",
      requiredFields: ["entrustedShipmentNo", "processCode"]
    }]
  };
  expect(core.generate({
    shippingMethod: "委托发货",
    entrustedShipmentNo: "WTCCD12345",
    processCode: "A123456"
  }, entrustedConfig).remark).toBe("走委托：WTCCD12345，A123456");
});

test("rejects incomplete identifiers for a matched rule", () => {
  expect(() => core.generate({ shippingMethod: "委托发货" }, {
    rules: [{
      id: "entrusted",
      all: [{ field: "shippingMethod", operator: "equals", value: "委托发货" }],
      output: "{{entrustedShipmentNo}}",
      requiredFields: ["entrustedShipmentNo"]
    }]
  })).toThrow("缺少字段：entrustedShipmentNo");
});

test("renders only identifier values exactly as read from the supplied elements", () => {
  expect(core.render("{{entrustedShipmentNo}}，{{processCode}}", {
    entrustedShipmentNo: "123",
    processCode: "A050202608040006"
  })).toBe("123，A050202608040006");
});

test("appends entrusted identifiers after other matched rules", () => {
  const result = core.generate({
    shippingMethod: "委托发货",
    entrustedShipmentNo: "WTCCD12345",
    processCode: "A123456"
  }, {
    separator: "，",
    rules: [
      { id: "other", priority: 0, output: "其他规则备注" },
      {
        id: "entrusted",
        priority: -100,
        all: [{ field: "shippingMethod", operator: "equals", value: "委托发货" }],
        output: "走委托：{{entrustedShipmentNo}}，{{processCode}}"
      }
    ]
  });
  expect(result.remark).toBe("其他规则备注，走委托：WTCCD12345，A123456");
});

test("renders applicant and charge-account identifiers for PO shipment", () => {
  const result = core.generate({
    shippingMethod: "PO发货",
    applicantId: "xxx00928523",
    chargeAccountId: "XXXX00728523"
  }, {
    rules: [{
      id: "po-shipment-applicant-identifiers",
      name: "具体申请人标识",
      priority: -100,
      all: [{ field: "shippingMethod", operator: "equals", value: "PO发货" }],
      output: "粘贴“申请人：{{applicantId}}, 挂账人： {{chargeAccountId}}”标签",
      requiredFields: ["applicantId", "chargeAccountId"]
    }]
  });
  expect(result.remark).toBe("粘贴“申请人：xxx00928523, 挂账人： XXXX00728523”标签");
});

test("does not apply applicant rule to entrusted shipment", () => {
  const result = core.generate({
    shippingMethod: "委托发货",
    applicantId: "xxx00928523",
    chargeAccountId: "XXXX00728523"
  }, {
    rules: [{
      id: "po-applicant",
      all: [{ field: "shippingMethod", operator: "equals", value: "PO发货" }],
      output: "{{applicantId}},{{chargeAccountId}}"
    }]
  });
  expect(result.remark).toBe("");
});

test("PO applicant rule rejects an empty account holder", () => {
  expect(() => core.generate({
    shippingMethod: "PO发货",
    applicantId: "xxx00928523",
    chargeAccountId: ""
  }, {
    rules: [{
      id: "po-applicant",
      all: [{ field: "shippingMethod", operator: "equals", value: "PO发货" }],
      output: "{{applicantId}},{{chargeAccountId}}",
      requiredFields: ["applicantId", "chargeAccountId"]
    }]
  })).toThrow("缺少字段：chargeAccountId");
});

test("normalizes employee display names to employee IDs", () => {
  expect(core.normalize("wutong 00975566", "employeeId")).toBe("w00975566");
  expect(core.normalize("WUTONG   00975566", "employeeId")).toBe("w00975566");
  expect(core.normalize("Mario Ivan Martinez Chavarria 00371300", "employeeId")).toBe("m00371300");
  expect(core.normalize("Archana Gobind 84345750", "employeeId")).toBe("a84345750");
  expect(core.normalize("Lucas Ucciferri WX1435456", "employeeId")).toBe("lWX1435456");
  expect(core.normalize("w00975566", "employeeId")).toBe("w00975566");
});

test("renders normalized PO applicant labels", () => {
  const applicantId = core.normalize("wutong 00975566", "employeeId");
  const chargeAccountId = core.normalize("wutong 00975566", "employeeId");
  expect(core.render("粘贴“申请人：{{applicantId}}, 挂账人： {{chargeAccountId}}”标签", {
    applicantId,
    chargeAccountId
  })).toBe("粘贴“申请人：w00975566, 挂账人： w00975566”标签");
});

test("renders stocking contact when process history identifies a handler", () => {
  const result = core.generate({ stockingContact: "x00123456" }, {
    rules: [{
      id: "stocking-contact",
      name: "备货接口人",
      all: [{ field: "stockingContact", operator: "notEmpty" }],
      output: "备货接口人：{{stockingContact}}",
      requiredFields: ["stockingContact"]
    }]
  });
  expect(result.remark).toBe("备货接口人：x00123456");
});

const apkRule = {
  id: "install-sample-management-apk",
  name: "安装样机管理软件",
  priority: 0,
  all: [
    {
      field: "samplePurpose",
      operator: "notIn",
      value: ["seeding sample", "MKT-媒体评测", "店员评测", "GTM-测试样机", "零售演示样机", "消费者营销活动", "异业合作", "随身样机"]
    },
    {
      field: "accountRegion",
      operator: "notIn",
      value: ["欧洲终端业务部", "中国终端业务部", "总部", "IoT GTM部", "电商平台部", "平板与PC GTM部", "全球服务部", "手机GTM部", "运动健康GTM部", "终端BG Marketing部", "终端BG零售业务部", "终端BG渠道部"]
    },
    { field: "apkInstallation", operator: "equals", value: "✔" }
  ],
  output: "预装APK",
  requiredFields: ["samplePurpose", "accountRegion", "apkInstallation"]
};

test("adds APK remark when all management-software conditions match", () => {
  const result = core.generate({
    samplePurpose: "研发验证",
    accountRegion: "亚太终端业务部",
    apkInstallation: "✔"
  }, { rules: [apkRule] });
  expect(result.remark).toBe("预装APK");
});

test.each([
  ["seeding sample", "亚太终端业务部", "✔"],
  ["研发验证", "欧洲终端业务部", "✔"],
  ["研发验证", "中国终端业务部", "✔"],
  ["研发验证", "总部", "✔"],
  ["研发验证", "IoT GTM部", "✔"],
  ["研发验证", "电商平台部", "✔"],
  ["研发验证", "平板与PC GTM部", "✔"],
  ["研发验证", "全球服务部", "✔"],
  ["研发验证", "手机GTM部", "✔"],
  ["研发验证", "运动健康GTM部", "✔"],
  ["研发验证", "终端BG Marketing部", "✔"],
  ["研发验证", "终端BG零售业务部", "✔"],
  ["研发验证", "终端BG渠道部", "✔"],
  ["研发验证", "亚太终端业务部", ""]
])("does not add APK remark for excluded values", (samplePurpose, accountRegion, apkInstallation) => {
  expect(core.generate({ samplePurpose, accountRegion, apkInstallation }, { rules: [apkRule] }).remark).toBe("");
});

test("places APK remark before lower-priority identifier rules", () => {
  const identifierRule = { id: "identifier", priority: -100, output: "WTCCD123，A123" };
  const result = core.generate({
    samplePurpose: "研发验证",
    accountRegion: "亚太终端业务部",
    apkInstallation: "✔"
  }, { separator: "\n", rules: [identifierRule, apkRule] });
  expect(result.remark).toBe("预装APK\nWTCCD123，A123");
});

test("APK rule accepts the normalized value represented by a yes icon", () => {
  expect(core.matches(apkRule, {
    samplePurpose: "研发验证",
    accountRegion: "亚太终端业务部",
    apkInstallation: "✔"
  })).toBe(true);
});


test("selected-row fields are scoped to the first checked grid row", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.separator).toBe("，");
  expect(runtimeConfig.fields.entrustedShipmentNo.selectedRowSelector).toBe(".grid-row.igrid-selected");
  expect(runtimeConfig.fields.entrustedShipmentNo.selector).toBe("td[field='entrustNo']");
  expect(runtimeConfig.fields.entrustedShipmentNo.selectedRowKeyAttribute).toBe("_row");
  expect(runtimeConfig.fields.entrustedShipmentNo.defaultRowSelector).toBe(".grid-row");
  expect(runtimeConfig.fields.apkInstallation.selectedRowSelector).toBe(".grid-row.igrid-selected");
  expect(runtimeConfig.fields.apkInstallation.selectedRowKeyAttribute).toBe("_row");
  expect(runtimeConfig.fields.apkInstallation.defaultRowSelector).toBe(".grid-row");
});

test("runtime APK rule excludes the expanded account-region blacklist", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const runtimeApkRule = runtimeConfig.rules.find((rule) => rule.id === "install-sample-management-apk");
  ["总部", "IoT GTM部", "电商平台部", "平板与PC GTM部", "全球服务部", "手机GTM部", "运动健康GTM部", "终端BG Marketing部", "终端BG零售业务部", "终端BG渠道部"].forEach((accountRegion) => {
    expect(core.generate({
      samplePurpose: "研发验证",
      accountRegion,
      apkInstallation: "✔"
    }, { rules: [runtimeApkRule] }).remark).toBe("");
  });
});


test("entrusted shipment selector does not require a val attribute", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.fields.entrustedShipmentNo.selector).toBe("td[field='entrustNo']");
  expect(runtimeConfig.fields.entrustedShipmentNo.attribute).toBe("val");
});


test("selected-row fields can fall back to split grid rows with the same row key", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.fields.entrustedShipmentNo.selectedRowKeyAttribute).toBe("_row");
  expect(runtimeConfig.fields.apkInstallation.selectedRowKeyAttribute).toBe("_row");
});


test("selected-row fields default to the first grid row when no row is selected", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.fields.entrustedShipmentNo.defaultRowSelector).toBe(".grid-row");
  expect(runtimeConfig.fields.apkInstallation.defaultRowSelector).toBe(".grid-row");
});


test("runtime entrusted rule prefixes entrusted shipments and comma-joins matched rules", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const entrustedRule = runtimeConfig.rules.find((rule) => rule.id === "entrusted-shipment-identifiers");
  expect(entrustedRule.output).toBe("走委托：{{entrustedShipmentNo}}，{{processCode}}");
  expect(runtimeConfig.separator).toBe("，");
});


test("runtime PO applicant rule outputs the requested paste label text", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const applicantRule = runtimeConfig.rules.find((rule) => rule.id === "po-shipment-applicant-identifiers");
  expect(applicantRule.output).toBe("粘贴“申请人：{{applicantId}}, 挂账人： {{chargeAccountId}}”标签");
});


test("runtime stocking contact rule is configured from process history", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const stockingRule = runtimeConfig.rules.find((rule) => rule.id === "stocking-contact");
  expect(runtimeConfig.fields.productModel.selector).toBe("td[field='prodModel']");
  expect(runtimeConfig.fields.productModel.selectedRowSelector).toBe(".grid-row.igrid-selected");
  expect(runtimeConfig.fields.productModel.defaultRowSelector).toBe(".grid-row");
  expect(runtimeConfig.fields.productModel.selectedRowKeyAttribute).toBe("_row");
  expect(runtimeConfig.fields.stockingContact.source).toBe("historyHandler");
  expect(runtimeConfig.fields.stockingContact.rowSelector).toBe("tr.grid-row");
  expect(runtimeConfig.fields.stockingContact.opinionSelector).toContain("td[field='DESCRIPTION']");
  expect(runtimeConfig.fields.stockingContact.nodeSelector).toContain("td[field='TASKDEFNAME']");
  expect(runtimeConfig.fields.stockingContact.handlerSelector).toContain("td[field='ASSIGNEE']");
  expect(runtimeConfig.fields.stockingContact.opinionContainsField).toBe("productModel");
  expect(runtimeConfig.fields.stockingContact.nodeEquals).toBe("备货接口人确认");
  expect(runtimeConfig.fields.stockingContact.normalize).toBe("employeeId");
  expect(stockingRule.output).toBe("备货接口人：{{stockingContact}}");
});


test("normalizes the provided stocking contact assignee sample", () => {
  expect(core.normalize("wuqiulan 00977287", "employeeId")).toBe("w00977287");
});


test("product model field uses selected row, default first row, and split-row fallback", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.fields.productModel).toMatchObject({
    selector: "td[field='prodModel']",
    selectedRowSelector: ".grid-row.igrid-selected",
    defaultRowSelector: ".grid-row",
    selectedRowKeyAttribute: "_row"
  });
});

test("renders not-for-sale and special shipping labels", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(core.generate({
    samplePurpose: "seeding sample",
    accountRegion: "中国终端业务部",
    countryRegion: "德国"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-1")] }).remark).toBe("粘贴\"not for sale\"标签");
  expect(core.generate({
    samplePurpose: "seeding sample",
    accountRegion: "欧洲终端业务部",
    countryRegion: "德国"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-2")] }).remark).toBe("粘贴“not for sale\"标签，进口清关发票写上“SAMPLE ONLY, NOT FOR SALE”");
  expect(core.generate({
    productModelLocked: "✔",
    countryRegion: "德国",
    receiverCity: "Munich"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "special-shipping-label")] }).remark).toBe("特殊发货管理");
});

test("excludes Turkey and Japan from the new label rules", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(core.generate({
    samplePurpose: "seeding sample",
    accountRegion: "中国终端业务部",
    countryRegion: "土耳其"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-1")] }).remark).toBe("");
  expect(core.generate({
    samplePurpose: "研发验证",
    accountRegion: "欧洲终端业务部",
    countryRegion: "土耳其"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-2")] }).remark).toBe("");
  expect(core.generate({
    productModelLocked: "✔",
    countryRegion: "日本",
    receiverCity: "Tokyo"
  }, { rules: [runtimeConfig.rules.find((rule) => rule.id === "special-shipping-label")] }).remark).toBe("");
});

test("special shipping label requires a receiver city without Chinese characters", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const rule = runtimeConfig.rules.find((item) => item.id === "special-shipping-label");

  expect(core.generate({
    productModelLocked: "✔",
    countryRegion: "德国",
    receiverCity: "慕尼黑 Munich"
  }, { rules: [rule] }).remark).toBe("");
  expect(() => core.generate({
    productModelLocked: "✔",
    countryRegion: "德国"
  }, { rules: [rule] })).toThrow("规则“特殊发货标签”缺少字段：receiverCity");
});

test("applies the updated account-region conditions to not-for-sale labels", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const label1 = runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-1");
  const label2 = runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-2");

  expect(core.generate({
    samplePurpose: "seeding sample",
    accountRegion: "欧洲终端业务部",
    countryRegion: "德国"
  }, { rules: [label1] }).remark).toBe("");
  expect(core.generate({
    samplePurpose: "seeding sample",
    accountRegion: "欧洲终端业务部",
    countryRegion: "德国"
  }, { rules: [label2] }).remark).toBe("粘贴“not for sale\"标签，进口清关发票写上“SAMPLE ONLY, NOT FOR SALE”");
});

test("outputs matched runtime rules in the required business order", () => {
  const runtimeConfig = loadBookmarkletConfig();
  const rules = runtimeConfig.rules.map((rule) => ({
    id: rule.id,
    priority: rule.priority,
    all: [],
    output: rule.id
  }));
  const result = core.generate({}, { rules, separator: "，" });

  expect(result.hitRules.map((rule) => rule.id)).toEqual([
    "special-shipping-label",
    "install-sample-management-apk",
    "not-for-sale-sample-label-1",
    "not-for-sale-sample-label-2",
    "entrusted-shipment-identifiers",
    "po-shipment-applicant-identifiers",
    "stocking-contact"
  ]);
});

test("runtime config contains country and model-lock fields for label rules", () => {
  const runtimeConfig = loadBookmarkletConfig();
  expect(runtimeConfig.fields.countryRegion.label).toBe("国家/地区");
  expect(runtimeConfig.fields.receiverCity).toMatchObject({
    label: "收货城市",
    selector: "input#cityName[name='baseLastConsigneeInfoVO.cityName'],td[field='consigneeVO.cityName']",
    value: "value",
    revealSelector: "li[tabid='goodsInfoTab'] a",
    revealTimeout: 5000
  });
  expect(runtimeConfig.fields.productModelLocked).toMatchObject({
    selector: "td[field='prodModel'] .jalor-icon.lock",
    presentValue: "✔"
  });
  expect(runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-1").name).toBe("非销售样机标签1");
  expect(runtimeConfig.rules.find((rule) => rule.id === "not-for-sale-sample-label-2").name).toBe("非销售样机标签2");
  expect(runtimeConfig.rules.find((rule) => rule.id === "special-shipping-label").name).toBe("特殊发货标签");
});
