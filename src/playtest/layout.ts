/** Authored row families from the approved Base/Ferocious matrix. Counts come from state. */
export function gameplayLayout(laborId: string, count: number) {
  const rows = count <= 3 ? [Math.max(1,count)] : count === 4 ? [2,2] : count === 5 ? [3,2] : count === 6 ? [3,3] : count === 7 ? [4,3] : count === 8 ? [4,4] : count === 9 ? [3,3,3] : Array.from({length:Math.ceil(count/4)},(_,i)=>Math.min(4,count-i*4));
  const slots=rows.flatMap((n,row)=>Array.from({length:n},(_,col)=>({row:row+2,column:col*(12/n)+1,span:12/n})));
  return { id:`${laborId}-${rows.join('-')}`, rows, slots, trackRows:`minmax(140px,${count>=9?'1.2':'1.15'}fr) ${rows.map(()=> 'minmax(76px,1fr)').join(' ')}` };
}
