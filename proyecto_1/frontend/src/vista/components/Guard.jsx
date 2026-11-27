import React from 'react';
import {Navigate,Outlet} from 'react-router-dom';
import {useSession} from '../../modelo/session';
export function Guard({roles}) {
  const {user} = useSession();
  if (!user) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace/>;
  return <Outlet/>;
}
