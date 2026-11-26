import { createContext, useContext } from 'react';
export const Session = createContext();
export const useSession = () => useContext(Session);
