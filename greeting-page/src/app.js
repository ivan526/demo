// 配置
const CONFIG = {
    API_BASE_URL: '/api',
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 20
};

// DOM元素
const elements = {
    inputPage: document.getElementById('input-page'),
    resultPage: document.getElementById('result-page'),
    greetForm: document.getElementById('greet-form'),
    nameInput: document.getElementById('name'),
    nameError: document.getElementById('name-error'),
    submitBtn: document.getElementById('submit-btn'),
    buttonText: document.querySelector('.button-text'),
    buttonLoading: document.querySelector('.button-loading'),
    globalError: document.getElementById('global-error'),
    errorText: document.getElementById('error-text'),
    greetingText: document.getElementById('greeting-text'),
    serverTime: document.getElementById('server-time'),
    version: document.getElementById('version'),
    backBtn: document.getElementById('back-btn')
};

// 状态管理
let isLoading = false;

// 工具函数
function showLoading() {
    isLoading = true;
    elements.submitBtn.disabled = true;
    elements.buttonText.style.display = 'none';
    elements.buttonLoading.style.display = 'flex';
}

function hideLoading() {
    isLoading = false;
    elements.submitBtn.disabled = false;
    elements.buttonText.style.display = 'block';
    elements.buttonLoading.style.display = 'none';
}

function showInputError(message) {
    elements.nameInput.classList.add('error');
    elements.nameError.textContent = message;
}

function clearInputError() {
    elements.nameInput.classList.remove('error');
    elements.nameError.textContent = '';
}

function showGlobalError(message) {
    elements.errorText.textContent = message;
    elements.globalError.style.display = 'flex';
}

function clearGlobalError() {
    elements.globalError.style.display = 'none';
}

// 输入校验
function validateName(name) {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
        return { valid: false, message: '姓名不能为空' };
    }
    
    if (trimmedName.length < CONFIG.MIN_NAME_LENGTH) {
        return { valid: false, message: `姓名至少需要${CONFIG.MIN_NAME_LENGTH}个字符` };
    }
    
    if (trimmedName.length > CONFIG.MAX_NAME_LENGTH) {
        return { valid: false, message: `姓名不能超过${CONFIG.MAX_NAME_LENGTH}个字符` };
    }
    
    return { valid: true };
}

// 页面路由
function showInputPage() {
    elements.inputPage.classList.add('active');
    elements.resultPage.classList.remove('active');
    elements.nameInput.value = '';
    clearInputError();
    clearGlobalError();
}

function showResultPage(data) {
    elements.greetingText.textContent = data.greeting;
    elements.serverTime.textContent = data.serverTime;
    elements.version.textContent = data.version;
    
    elements.inputPage.classList.remove('active');
    elements.resultPage.classList.add('active');
}

// API调用
async function submitGreeting(name) {
    try {
        // 模拟后端API响应（实际项目中替换为真实API调用）
        // const response = await fetch(`${CONFIG.API_BASE_URL}/greet`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({ name: name.trim() })
        // });
        
        // if (!response.ok) {
        //     const errorData = await response.json().catch(() => ({}));
        //     throw new Error(errorData.message || '服务器响应异常');
        // }
        
        // return await response.json();
        
        // 模拟API响应
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const now = new Date();
        const serverTime = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');
        
        return {
            greeting: `你好，${name.trim()}！欢迎使用云端问候服务 🌟`,
            serverTime: serverTime,
            version: 'v1.0.0'
        };
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('网络连接失败，请检查网络后重试');
        }
        throw error;
    }
}

// 事件处理
async function handleSubmit(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    clearInputError();
    clearGlobalError();
    
    const name = elements.nameInput.value;
    const validation = validateName(name);
    
    if (!validation.valid) {
        showInputError(validation.message);
        return;
    }
    
    showLoading();
    
    try {
        const result = await submitGreeting(name);
        showResultPage(result);
    } catch (error) {
        console.error('Greeting submission failed:', error);
        showGlobalError(error.message || '服务暂时不可用，请稍后重试');
    } finally {
        hideLoading();
    }
}

function handleInputChange() {
    if (elements.nameInput.classList.contains('error')) {
        clearInputError();
    }
}

function handleBackClick() {
    showInputPage();
    elements.nameInput.focus();
}

function handlePageRefresh() {
    // 如果刷新时在结果页面，自动跳回输入页面
    if (elements.resultPage.classList.contains('active')) {
        showInputPage();
    }
}

// 初始化事件监听
function initEventListeners() {
    elements.greetForm.addEventListener('submit', handleSubmit);
    elements.nameInput.addEventListener('input', handleInputChange);
    elements.backBtn.addEventListener('click', handleBackClick);
    
    // 页面加载/刷新时处理
    window.addEventListener('load', handlePageRefresh);
    window.addEventListener('pageshow', handlePageRefresh);
    
    // 回车键提交
    elements.nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    });
}

// 初始化应用
function init() {
    initEventListeners();
    elements.nameInput.focus();
    console.log('🚀 云端问候页面已加载');
}

// 启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
