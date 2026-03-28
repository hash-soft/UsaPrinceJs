const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

window.addEventListener('DOMContentLoaded', () => {
  numerics.value = 100;
  text.value = 'test';
  numerics.addEventListener('blur', onNumericsBlur.bind(numerics));
  ok.addEventListener('click', onOk.bind(ok));
  cancel.addEventListener('click', onCancel.bind(cancel));
  //tabText.checked = true;
});

function onNumericsBlur(e) {
  const newValue = clamp(e.target.value, -9999999, 9999999);
  this.value = newValue;
}

function onOk() {
  const result = getValue();
  console.log(result);
}

const getValue = () => {
  if (tabNumerics.checked) {
    return numerics.value;
  }
  if (tabText.checked) {
    return text.value;
  }
  return 0;
};

function onCancel() {
  console.log('cancel');
}
