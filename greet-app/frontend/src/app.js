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
    var resultErrorTimeout = null;
    var originalBtnText = '获取问候';
    var REQUEST_TIMEOUT_MS = 5000;

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

        // 特殊字符校验黑名单（30个特殊字符，与PRD完全一致）
        var specialChars = /[`~!@#$%^&*()_+{}\[\]|\\:;"'<>,.?\/]/;
        if (specialChars.test(trimmed)) {
            return { valid: false, message: '姓名不能包含特殊字符，请重新输入' };
        }

        return { valid: true, name: trimmed };
    }

    function showInputError(message) {
        inputError.textContent = message;
        nameInput.classList.add('error');

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

    function clearResultErrorTimeout() {
        if (resultErrorTimeout) {
            clearTimeout(resultErrorTimeout);
            resultErrorTimeout = null;
        }
    }

    function showResultError(message) {
        clearResultErrorTimeout();
        resultContent.className = 'result-content error';
        greetingDisplay.textContent = message;
        serverTimeDisplay.textContent = '';
        if (resultVersionDisplay) {
            resultVersionDisplay.textContent = '';
        }
        resultSection.classList.remove('hidden');

        // 3秒后自动隐藏错误
        resultErrorTimeout = setTimeout(function() {
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
        clearResultErrorTimeout();
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
        clearResultErrorTimeout();
        resultSection.classList.add('hidden');
    }

    function isNetworkError(error) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return true;
        }
        if (error && error instanceof TypeError) {
            var msg = (error.message || '').toLowerCase();
            return /fetch|network|load failed|failed to fetch/i.test(error.message || '') ||
                   msg.indexOf('network') !== -1 ||
                   msg.indexOf('fetch') !== -1 ||
                   msg.indexOf('load failed') !== -1;
        }
        return false;
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

        var controller = null;
        var timeoutId = null;
        if (typeof AbortController !== 'undefined') {
            controller = new AbortController();
            timeoutId = setTimeout(function() {
                controller.abort();
            }, REQUEST_TIMEOUT_MS);
        }

        try {
            var fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: validation.name })
            };
            if (controller) {
                fetchOptions.signal = controller.signal;
            }

            var response = await fetch('/api/greet', fetchOptions);

            var result = await response.json();

            if (response.ok && result.code === 0) {
                showResult(result.data);
            } else {
                showResultError(result.msg || '服务异常，请稍后重试');
            }
        } catch (error) {
            if (error && error.name === 'AbortError') {
                showResultError('网络异常，请稍后重试');
            } else if (isNetworkError(error)) {
                showResultError('网络异常，请稍后重试');
            } else {
                showResultError('服务异常，请稍后重试');
            }
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
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

        nameInput.focus();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
