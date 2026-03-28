import { RandomXor4096 } from '../src/RandomXor4096';

describe('random', () => {
  it('nextInt', () => {
    const r = new RandomXor4096(0);
    const arr: number[] = [];
    console.log(2 ** 32);
    for (let i = 0; i < 500; i++) {
      arr.push(r.nextInt(80, 121));
    }

    console.log(arr.toString());
  });

  it('next', () => {
    const r = new RandomXor4096(123);
    const arr: number[] = [];
    console.log(2 ** 32);
    for (let i = 0; i < 200; i++) {
      arr.push(r.next());
    }

    console.log(arr.toString());
  });

  it('state', () => {
    const r = new RandomXor4096(0);
    const arr: number[][] = [];
    for (let i = 0; i < 10; i++) {
      arr.push(r.getState());
      r.next();
    }

    console.log(arr);
  });
});
