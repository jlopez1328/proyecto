import {useState} from 'react';

import {useSession} from '../modelo/session';
import {useResource} from './resourceController';
export function useDashboardController() {
const {user}=useSession(), [year,setYear]=useState(new Date().getFullYear());
  const r=useResource(`/reports?year=${year}`), report=r.data;
  const seller=user.role==='vendedor', buyer=user.role!=='vendedor', canSell=user.role!=='comprador';
  const sales=report?.months.reduce((s,m)=>s+m.sales,0)||0, purchases=report?.months.reduce((s,m)=>s+(m.purchases||0),0)||0;
  const max=Math.max(1,...(report?.months||[]).flatMap(m=>[m.sales,m.purchases||0]));

return {user,year,setYear,r,report,seller,buyer,canSell,sales,purchases,max};
}
