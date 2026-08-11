/* eslint-env browser */
window.SHIPMENT_BOOKMARKLET_CONFIG = {
  title: "发货备注助手",
  fields: {
    shippingMethod: {
      label: "发货方式",
      selector: "a.copy[onclick*='copySendWay']",
      ancestorLevels: 2,
      targetSelector: ":scope > span:first-child",
      value: "text"
    },
    entrustedShipmentNo: { label: "委托发货单号", selector: "td[field='entrustNo']", attribute: "val", selectedRowSelector: ".grid-row.igrid-selected", defaultRowSelector: ".grid-row", selectedRowKeyAttribute: "_row", optional: true },
    productModel: { label: "产品型号", selector: "td[field='prodModel']", selectedRowSelector: ".grid-row.igrid-selected", defaultRowSelector: ".grid-row", selectedRowKeyAttribute: "_row", optional: true },
    productModelLocked: { label: "产品型号带锁", selector: ".jalor-icon.lock", presentValue: "✔", selectedRowSelector: ".grid-row.igrid-selected", defaultRowSelector: ".grid-row", rowContainsSelector: "td[field='prodModel']", selectedRowKeyAttribute: "_row", optional: true },
    countryRegion: { label: "国家/地区", selector: "input[name='countryName'],input[name='countryRegionName'],input[name='country'],input[name='countryAreaName'],td[field='countryName'],td[field='countryRegionName'],td[field='country'],td[field='countryAreaName']", value: "value", optional: true },
    receiverCity: { label: "收货城市", selector: "input#cityName[name='baseLastConsigneeInfoVO.cityName'],td[field='consigneeVO.cityName']", value: "value", ignoreValues: ["收货城市"], revealSelector: "li[tabid='goodsInfoTab'] a", revealTimeout: 5000, optional: true },
    processCode: { label: "流程编号", selector: "input[name='rdSampleApplyId']", value: "value", optional: true },
    applicantId: { label: "申请人ID", selector: "input[name='applyUserName']", value: "value", normalize: "employeeId", optional: true },
    chargeAccountId: { label: "挂账人", selector: "input[name='reqUserName']", value: "value", normalize: "employeeId", optional: true },
    samplePurpose: { label: "样机用途", selector: "input[name='sampleUseName']", value: "value", optional: true },
    accountRegion: { label: "挂账人地区部", selector: "input#regionName[name='regionName']", value: "value", optional: true },
    apkInstallation: { label: "APK安装", selector: "a.jalor-icon.yes[title='是']", presentValue: "✔", selectedRowSelector: ".grid-row.igrid-selected", defaultRowSelector: ".grid-row", selectedRowKeyAttribute: "_row", optional: true },
    stockingContact: {
      label: "备货接口人",
      source: "historyHandler",
      rowSelector: "tr.grid-row",
      opinionSelector: "td[field='DESCRIPTION'],td[field='dealOpinion'],td[field='handleOpinion'],td[field='processOpinion'],td[field='opinion']",
      nodeSelector: "td[field='TASKDEFNAME'],td[field='nodeName'],td[field='activityName'],td[field='node']",
      handlerSelector: "td[field='ASSIGNEE'],td[field='handler'],td[field='handlerName'],td[field='dealUserName'],td[field='processUserName'],td[field='operatorName']",
      opinionContainsField: "productModel",
      nodeEquals: "备货接口人确认",
      normalize: "employeeId",
      optional: true
    }
  },
  rules: [
    {
      id: "entrusted-shipment-identifiers",
      name: "具体单号标识",
      enabled: true,
      priority: 100,
      all: [
        { field: "shippingMethod", operator: "equals", value: "委托发货" }
      ],
      output: "走委托：{{entrustedShipmentNo}}，{{processCode}}",
      requiredFields: ["entrustedShipmentNo", "processCode"]
    },
    {
      id: "po-shipment-applicant-identifiers",
      name: "具体申请人标识",
      enabled: true,
      priority: 100,
      all: [
        { field: "shippingMethod", operator: "equals", value: "PO发货" }
      ],
      output: "粘贴“申请人：{{applicantId}}, 挂账人： {{chargeAccountId}}”标签",
      requiredFields: ["applicantId", "chargeAccountId"]
    },
    {
      id: "not-for-sale-sample-label-1",
      name: "非销售样机标签1",
      enabled: true,
      priority: 200,
      all: [
        { field: "samplePurpose", operator: "in", value: ["seeding sample", "MKT-媒体评测", "店员评测"] },
        { field: "accountRegion", operator: "notIn", value: ["欧洲终端业务部", "总部"] }
      ],
      output: "粘贴\"not for sale\"标签",
      requiredFields: ["samplePurpose", "accountRegion", "countryRegion"]
    },
    {
      id: "not-for-sale-sample-label-2",
      name: "非销售样机标签2",
      enabled: true,
      priority: 200,
      all: [
        { field: "accountRegion", operator: "in", value: ["欧洲终端业务部", "总部"] },
        { field: "countryRegion", operator: "notIn", value: ["土耳其"] }
      ],
      output: "粘贴“not for sale\"标签，进口清关发票写上“SAMPLE ONLY, NOT FOR SALE”",
      requiredFields: ["accountRegion", "countryRegion"]
    },
    {
      id: "special-shipping-label",
      name: "特殊发货标签",
      enabled: true,
      priority: 400,
      all: [
        { field: "productModelLocked", operator: "equals", value: "✔" },
        { field: "countryRegion", operator: "notIn", value: ["日本"] },
        { field: "receiverCity", operator: "notMatches", value: "[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF]" }
      ],
      output: "特殊发货",
      requiredFields: ["productModelLocked", "countryRegion", "receiverCity"]
    },
    {
      id: "stocking-contact",
      name: "备货接口人",
      enabled: true,
      priority: 0,
      all: [
        { field: "stockingContact", operator: "notEmpty" }
      ],
      output: "备货接口人：{{stockingContact}}",
      requiredFields: ["stockingContact"]
    },
    {
      id: "install-sample-management-apk",
      name: "安装样机管理软件",
      enabled: true,
      priority: 300,
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
    }
  ],
  separator: "，",
  includeExistingRemark: false
};
