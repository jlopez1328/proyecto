import {useState} from 'react';

import {useResource, useSearch} from './resourceController';
export function useHistoryController({type}) {
const purchase=type==='purchases', [page,setPage]=useState(1),[selected,setSelected]=useState(null);
  const {search,setSearch,term}=useSearch(),r=useResource(`/${type}?page=${page}&search=${encodeURIComponent(term)}`);

return {purchase,page,setPage,selected,setSelected,search,setSearch,term,r};
}
