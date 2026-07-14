const validator = require('../../utils/validator');

Component({
  properties: {
    targetSentence: {
      type: String,
      value: ''
    },
    value: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    },
    showHint: {
      type: Boolean,
      value: true
    }
  },

  data: {
    inputValue: '',
    result: {
      chars: [],
      wrongIndexes: [],
      completed: false,
      accuracy: 0
    }
  },

  observers: {
    'targetSentence, value': function syncValue() {
      this.refreshValidation(this.properties.value || this.data.inputValue);
    }
  },

  lifetimes: {
    attached() {
      this.refreshValidation(this.properties.value);
    }
  },

  methods: {
    onInput(event) {
      const value = event.detail.value;
      const result = this.refreshValidation(value);

      this.triggerEvent('input', {
        value,
        result
      });

      if (result.completed) {
        this.triggerEvent('complete', {
          value,
          result
        });
      }
    },

    refreshValidation(value) {
      const result = validator.compareInput(value, this.properties.targetSentence);
      this.setData({
        inputValue: value,
        result
      });
      return result;
    },

    clear() {
      this.refreshValidation('');
    }
  }
});
