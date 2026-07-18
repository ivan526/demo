(function() {
    'use strict';

    var greetForm = document.getElementById('greet-form');
    var nameInput = document.getElementById('name-input');
    var inputError = document.getElementById('input-error');
    var submitBtn = document.getElementById('submit-btn');
    var greetingDisplay = document.getElementById('greeting-display');
    var serverTimeDisplay = document.getElementById('server-time');
    var versionDisplay = document.getElementById('version-display');
    var resultSection = document.getElementById('result-section');
    var errorToast = document.getElementById('error-toast');
    var errorText = document.getElementById('error-text');

    var toastTimeout = null;

    function validateName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: '姓名不能为空' };
        }

        var trimmed = name.trim();

        if (trimmed.length === 0) {
            return { valid: false, message: '姓名不能为空' };
        }

        if (trimmed.length > 20) {
            return { valid: false, message: '姓名最多支持20个字符' };
        }

        // 特殊字符校验黑名单（32个特殊字符）
        var specialChars = /[<>"'\\`~!@#$%^&*()+=|{}[\]:;<>,.?\/]/;
        if (specialChars.test(trimmed)) {
            return { valid: false, message: '姓名包含非法字符' };
        }

        return { valid: true, name: trimmed };
    }

    function showInputError(message) {
        inputError.textContent = message;
        nameInput.classList.add('error');
    }

    function clearInputError() {
        inputError.textContent = '';
        nameInput.classList.remove('error');
    }

    function showToast(message) {
        errorText.textContent = message;
        errorToast.classList.add('show');

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toastTimeout = setTimeout(function() {
            errorToast.classList.remove('show');
        }, 3000);
    }

    function showLoading() {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    }

    function hideLoading() {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }

    function showResult(data) {
        greetingDisplay.textContent = data.greeting;
        serverTimeDisplay.textContent = data.server_time;
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
                showToast(result.msg || '请求失败，请稍后重试');
            }
        } catch (error) {
            if (error.name === 'NetworkError' || error.message.includes('network')) {
                showToast('网络连接失败，请检查网络后重试');
            } else {
                showToast('服务器请求失败，请稍后重试');
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