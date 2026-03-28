import memberParts from '../assets/data/memberParts.json';

describe('exp', () => {
  it('list', () => {
    const data = memberParts.exps[3];
    if (!data) {
      console.log('no id');
      return;
    }
    const list: number[] = [];
    let last = data.baseValue;
    let exp = last;
    list.push(exp);
    for (let i = 0; i < data.list.length; i++) {
      const info = data.list[i];
      for (let c = 0; c < info.times; c++) {
        last = Math.floor(last * info.rate);
        exp += last;
        list.push(exp);
      }
    }
    const view: Array<{ lv: number; exp: number }> = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 98) {
        break;
      }
      view.push({ lv: i + 1, exp: list[i] });
    }
    console.log(view);
  });
});
