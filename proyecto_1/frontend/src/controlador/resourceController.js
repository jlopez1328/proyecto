import {useState,useEffect,useRef} from 'react';
import {api} from '../modelo/api';
export function useResource(path) {
  const [data,setData] = useState(null), [error,setError] = useState(''), [loading,setLoading] = useState(true), [version,setVersion] = useState(0);
  useEffect(()=>{let active=true; setLoading(true); setError(''); api(path).then(value=>{if(active)setData(value);}).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;};},[path,version]);
  return {data,error,loading,refresh:()=>setVersion(v=>v+1)};
}
export function useSearch() {
  const [search,setSearch] = useState(''), [term,setTerm] = useState('');
  useEffect(()=>{const timer=setTimeout(()=>setTerm(search),250); return ()=>clearTimeout(timer);},[search]);
  return {search,setSearch,term};
}
export function useRequest() {
  const previous = useRef(null);
  return body => {const value=JSON.stringify(body); if(previous.current?.value !== value) previous.current={value,id:crypto.randomUUID()}; return {...body,requestId:previous.current.id};};
}
