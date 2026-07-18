(function() {
    'use strict';

    var greetForm = document.getElementById('greet-form');
    var nameInput = document.getElementById('name-input');
    var inputError = document.getElementById('input-error');
    var submitBtn = document.getElementById('submit-btn');
    var btnText = submitBtn.querySelector('.btn-text');
    var greetingDisplay = document.getElementById('greeting-display');
    var serverTimeDisplay = document.getElementById('server-time');
    var versionDisplay = document.getElementById('version-display');
    var resultVersionDisplay = document.getElementById('result-version-display');
    var resultSection = document.getElementById('result-section');
    var resultContent = resultSection.querySelector('.result-content');

    var inputErrorTimeout = null;
    var originalBtnText = '获取问候';

    function validateName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: '请输入您的姓名' };
        }

        var trimmed = name.trim();

        if (trimmed.length === 0) {
            return { valid: false, message: '请输入您的姓名' };
        }

        if (trimmed.length > 20) {
            return { valid: false, message: '姓名最多支持20个字符' };
        }

        // 特殊字符校验黑名单（32个特殊字符，与PRD完全一致）
        var specialChars = /[`~!@#$%^&*()_+{}\[\]|\\:;"'<>,.?\/]/;
        if (specialChars.test(trimmed)) {
            return { valid: false, message: '姓名不能包含特殊字符，请重新输入' };
        }

        return { valid: true, name: trimmed };
    }

    function showInputError(message) {
        inputError.textContent = message;
        nameInput.classList.add('error');

        // 清除旧定时器
        if (inputErrorTimeout) {
            clearTimeout(inputErrorTimeout);
        }

        // PRD §4.2: 输入类错误显示2秒后自动消失
        inputErrorTimeout = setTimeout(function() {
            clearInputError();
        }, 2000);
    }

    function clearInputError() {
        inputError.textContent = '';
        nameInput.classList.remove('error');
        if (inputErrorTimeout) {
            clearTimeout(inputErrorTimeout);
            inputErrorTimeout = null;
        }
    }

    function showResultError(message) {
        resultContent.className = 'result-content error';
        greetingDisplay.textContent = message;
        serverTimeDisplay.textContent = '';
        if (resultVersionDisplay) {
            resultVersionDisplay.textContent = '';
        }
        resultSection.classList.remove('hidden');

        // 3秒后自动隐藏错误
        setTimeout(function() {
            hideResult();
        }, 3000);
    }

    function showLoading() {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        btnText.textContent = '加载中...';
    }

    function hideLoading() {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        btnText.textContent = originalBtnText;
    }

    function showResult(data) {
        resultContent.className = 'result-content';
        greetingDisplay.textContent = data.greeting;
        serverTimeDisplay.textContent = data.server_time;
        if (data.version) {
            versionDisplay.textContent = data.version;
            if (resultVersionDisplay) {
                resultVersionDisplay.textContent = data.version;
            }
        }
        resultSection.classList.remove('hidden');
    }

    function hideResult() {
        resultSection.classList.add('hidden');
    }

    async function submitForm() {
        var name = nameInput.value;
        var validation = validateName(name);

        clearInputError();

        if (!validation.valid) {
            showInputError(validation.message);
            return;
        }

        showLoading();

        try {
            var response = await fetch('/api/greet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: validation.name })
            });

            var result = await response.json();

            if (response.ok && result.code === 0) {
                showResult(result.data);
            } else {
                showResultError(result.msg || '服务异常，请稍后重试');
            }
        } catch (error) {
            if (error.name === 'NetworkError' || error.message.includes('network')) {
                showResultError('网络异常，请稍后重试');
            } else {
                showResultError('服务异常，请稍后重试');
            }
        } finally {
            hideLoading();
        }
    }

    function init() {
        greetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitForm();
        });

        nameInput.addEventListener('input', function() {
            clearInputError();
            hideResult();
        });

        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitForm();
            }
        });

        nameInput.focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
