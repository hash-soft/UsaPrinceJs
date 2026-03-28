
const inputKey = (keyCode) => {
  down.textContent += ` ${keyCode}`
}

const _preventDefaultKey = [8, 9];

const _onKeyDown = (e) => {
  
  inputKey(e.keyCode);
  inputKey(e.code);

  if(_preventDefaultKey.includes(e.keyCode)) {
    e.preventDefault();
  }
}

const _onKeyUp = (e) => {
  up.textContent += ` ${e.keyCode}`;
  up.textContent += ` ${e.code}`
}

const _onFocusOff = (e) => {
  focus.textContent += ` focus`;
  console.log('off');
}

document.addEventListener('keydown', _onKeyDown, false);
document.addEventListener('keyup', _onKeyUp, false);
window.addEventListener('blur', _onFocusOff, false);


window.addEventListener("gamepadconnected", function(e) {
  var gp = navigator.getGamepads()[e.gamepad.index];
  console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
    gp.index, gp.id,
    gp.buttons.length, gp.axes.length);
});

window.addEventListener("gamepaddisconnected", function(e) {
  console.log("Gamepad disconnected from index %d: %s",
    e.gamepad.index, e.gamepad.id);
});

const pollGamepads = () => {
  const gamepads = navigator.getGamepads();
  const buttons = gamepads[1].buttons;
  const axes = gamepads[1].axes;
  const states = buttons.map((button, index) => {
    return `${index}: p=${button.pressed} t=${button.touched} v=${button.value}`;
  });
  key.innerHTML = states.join('<br>');
  const states2 = axes.map((ax, index) => {
    return `${index}: p=${ax}`;
  });
  dir.innerHTML = states2.join('<br>');

  for(const gamepad of gamepads) {
    console.log(gamepad);
  }

  let test = [true, false, false];
  test[2] |= true;
  console.log(test);
}