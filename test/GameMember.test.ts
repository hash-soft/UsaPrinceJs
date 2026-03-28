import { GameMember } from '../src/GameMember';
import members from '../assets/data/members.json';
import memberParts from '../assets/data/memberParts.json';
import items from '../assets/data/items.json';
import system from '../assets/data/system.json';
import {
  setItems,
  setMemberParts,
  setMembers,
  setSystem,
} from '../src/DataStore';
import { Item, Member, MemberParts, Parameter, System } from '../src/DataTypes';

// 関数Mockバージョン
//import { next } from '../src/Random';
//jest.mock('../src/Random');
//const nextMock = next as jest.MockedFunction<typeof next>;
//nextMock.mockReturnValue(0.3);

describe('member', () => {
  // jest
  //   .spyOn(Random, 'nextInt')
  //   .mockImplementation((min, max) => Math.floor((min + max) / 2));

  beforeAll(() => {
    setSystem(system as unknown as System);
  });

  it('levelToParamInfo', () => {
    const results: Array<{
      rateIndex: number;
      refIndex: number;
      pos: number;
      baseValue: number;
    }> = [];
    // for (let i = 0; i < 3; i++) {
    //   const result = GameMember['_calcBaseParam'](
    //     memberParts.parameters[1] as Parameter,
    //     10 * i + 9
    //   );
    //   results.push(result);
    // }
    for (let i = 0; i < 11; i++) {
      const result = GameMember['_levelToParamInfo'](
        memberParts.parameters[1] as Parameter,
        i + 19
      );
      results.push(result);
    }

    console.log(results);
    //expect(result).toBe(19);
  });

  it('calcUpParam', () => {
    const results: Array<{ lv: number; result: number }> = [];
    const parameter = memberParts.parameters[1] as Parameter;
    const info = GameMember['_levelToParamInfo'](parameter, 18);
    console.log(info);
    for (let i = 0; i < 11; i++) {
      const lv = i + 19;
      const result = GameMember['_calcUpParam'](parameter, lv, info.baseValue);
      results.push({ lv, result });
      info.baseValue += result;
    }
    console.log(results);
  });

  it('setExpAndLevelUp', () => {
    setMembers(members as unknown as Member[]);
    setMemberParts(memberParts as unknown as MemberParts);
    setItems(items as unknown as Item[]);
    for (let count = 0; count < 20; count++) {
      const list: number[] = [];
      for (let i = 0; i < 3; i++) {
        members[i + 1]!.initialLevel = 1;
        const member = new GameMember();
        member.setup(0, i + 1);
        member.changeExp(7184 * (count + 1));
        const lv = member.applyLevelUp();
        list.push(lv);
      }
      console.log(list);
    }
  });
});
