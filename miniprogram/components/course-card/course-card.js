Component({
  properties: {
    course: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('select', {
        course: this.properties.course
      });
    }
  }
});
