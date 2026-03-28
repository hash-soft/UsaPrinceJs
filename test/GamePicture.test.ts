import { GamePicture } from '../src/GamePicture';

describe('GamePicture', () => {
  it('moveStraight', () => {
    const picture = new GamePicture();
    picture.show(0, 'test', 0, 0, 0);
    picture.move(10, 10, 0, 60);
    const arr: string[] = [];
    while (picture['_duration'] > 0) {
      picture.update();
      arr.push(picture.x + ',' + picture.y);
    }
    console.log(arr);
  });

  it('moveParabolaX', () => {
    const picture = new GamePicture();
    picture.show(0, 'test', 0, 0, 0);
    picture.move(256, 256, 1, 60);
    const arr: string[] = [];
    while (picture['_duration'] > 0) {
      picture.update();
      arr.push(picture.x + ',' + picture.y);
    }
    console.log(arr);
  });

  it('moveParabolaY', () => {
    const picture = new GamePicture();
    picture.show(0, 'test', 0, 0, 0);
    picture.move(10, 10, 2, 60);
    const arr: string[] = [];
    while (picture['_duration'] > 0) {
      picture.update();
      arr.push(picture.x + ',' + picture.y);
    }
    console.log(arr);
  });
});
