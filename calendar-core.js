/* Date-only calculations and unlimited non-overlapping event lanes. */
globalThis.CalendarCore = (() => {
  const dayIndex = value => {
    const [y,m,d] = value.split('-').map(Number);
    return Date.UTC(y,m-1,d) / 86400000;
  };
  const shift = (value, days) => new Date((dayIndex(value)+days)*86400000).toISOString().slice(0,10);
  function layout(orders, start) {
    const end = shift(start,6);
    const segments = orders.filter(o => o.planStart && o.planEnd && o.planEnd >= o.planStart && o.planStart <= end && o.planEnd >= start)
      .map(item => ({item,start:Math.max(0,dayIndex(item.planStart)-dayIndex(start)),end:Math.min(6,dayIndex(item.planEnd)-dayIndex(start))}))
      .sort((a,b)=>a.start-b.start || b.end-a.end || String(a.item.id).localeCompare(String(b.item.id)));
    const occupied=[];
    for(const segment of segments){
      let lane=occupied.findIndex(last=>last < segment.start);
      if(lane<0)lane=occupied.length;
      occupied[lane]=segment.end;segment.lane=lane;
    }
    return {segments,lanes:occupied.length};
  }
  function upcoming(orders,start){
    const end=shift(start,6);
    return orders.filter(o=>o.deadline>=start&&o.deadline<=end&&o.status!=='已完成')
      .sort((a,b)=>a.deadline.localeCompare(b.deadline)||String(a.id).localeCompare(String(b.id)));
  }
  function resize(range,edge,delta){
    return edge==='start'?{start:[shift(range.start,delta),range.end].sort()[0],end:range.end}:{start:range.start,end:[shift(range.end,delta),range.start].sort()[1]};
  }
  return {dayIndex,shift,layout,upcoming,resize};
})();
