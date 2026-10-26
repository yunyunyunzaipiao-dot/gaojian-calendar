import test from 'node:test';
import assert from 'node:assert/strict';
import '../calendar-core.js';
const {layout,shift,dayIndex}=globalThis.CalendarCore;
test('same-day overlaps get unlimited distinct lanes',()=>{
  const orders=Array.from({length:7},(_,i)=>({id:String(i),planStart:'2026-10-19',planEnd:'2026-10-21'}));
  const result=layout(orders,'2026-10-19');
  assert.equal(result.lanes,7);assert.equal(result.segments.length,7);
  assert.equal(new Set(result.segments.map(x=>x.lane)).size,7);
});
test('inclusive dates never share a lane when they touch',()=>{
  const result=layout([{id:'a',planStart:'2026-10-19',planEnd:'2026-10-21'},{id:'b',planStart:'2026-10-21',planEnd:'2026-10-22'},{id:'c',planStart:'2026-10-22',planEnd:'2026-10-23'}],'2026-10-19');
  assert.equal(result.segments[0].lane,0);assert.equal(result.segments[1].lane,1);assert.equal(result.segments[2].lane,0);
});
test('multiweek range is clipped to correct seven-day columns',()=>{
  const order={id:'a',planStart:'2026-10-30',planEnd:'2026-11-03'};
  assert.deepEqual(layout([order],'2026-10-26').segments.map(x=>[x.start,x.end]),[[4,6]]);
  assert.deepEqual(layout([order],'2026-11-02').segments.map(x=>[x.start,x.end]),[[0,1]]);
});
test('moving a range across a year preserves duration',()=>{
  const start='2026-12-29',end='2027-01-03';
  assert.equal(shift(start,4),'2027-01-02');assert.equal(shift(end,4),'2027-01-07');
  assert.equal(dayIndex(shift(end,4))-dayIndex(shift(start,4)),dayIndex(end)-dayIndex(start));
  assert.equal(shift('2028-02-28',1),'2028-02-29');
});
test('upcoming covers exactly today plus six days, excludes completed orders and sorts deadlines',()=>{
  const orders=[{id:'last',deadline:'2026-11-01',status:'未开始'},{id:'today',deadline:'2026-10-26',status:'进行中'},{id:'outside',deadline:'2026-11-02',status:'未开始'},{id:'past',deadline:'2026-10-25',status:'进行中'},{id:'done',deadline:'2026-10-28',status:'已完成'}];
  assert.deepEqual(CalendarCore.upcoming(orders,'2026-10-26').map(o=>o.id),['today','last']);
});
test('resizing either endpoint keeps the other fixed and clamps crossing dates',()=>{
  const range={start:'2026-10-28',end:'2026-11-02'};
  assert.deepEqual(CalendarCore.resize(range,'start',2),{start:'2026-10-30',end:'2026-11-02'});
  assert.deepEqual(CalendarCore.resize(range,'end',-2),{start:'2026-10-28',end:'2026-10-31'});
  assert.deepEqual(CalendarCore.resize(range,'start',20),{start:'2026-11-02',end:'2026-11-02'});
  assert.deepEqual(CalendarCore.resize(range,'end',-20),{start:'2026-10-28',end:'2026-10-28'});
});
