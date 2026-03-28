const getFilename = () => {
  return document.getElementById("file").value;
};

Audio.play = () => {
  AudioManager.playBgm(getFilename());
};

Audio.pause = () => {
  AudioManager.pauseBgm();
}

Audio.stop = () => {
  AudioManager.stopBgm();
}

Audio.resume = () => {
  AudioManager.resumeBgm();
}

Audio.interrupt = () => {
  AudioManager.interruptBgm(getFilename(), 0, 0, () => {
    alert('end');
  });
}

Audio.paused = () => {
  alert(AudioManager._bgm.paused);
}


const getFilenameSE = () => {
  return document.getElementById("filese").value;
};

Audio.loadSystemSe = () => {
  AudioManager.loadSystemSe(getFilenameSE());
};

Audio.playSystemSe = () => {
  AudioManager.playSystemSe(getFilenameSE());
};

Audio.playSe = () => {
  AudioManager.playSe(getFilenameSE());
};

Audio.stopSe = () => {
  AudioManager.stopSe(getFilenameSE());
};