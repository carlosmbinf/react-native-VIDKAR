import Meteor from '@meteorrn/core';
import { useEffect, useRef, useState } from 'react';
import { createDeliveryAddressClient } from '../services/commerceDeliveryAddresses';

export const deliveryAddressClient = createDeliveryAddressClient({ call: (...args) => Meteor.call(...args), getUserId: () => Meteor.userId() });

export function useDeliveryAddresses(userId, enabled) {
  const requestRef = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ userId: null, addresses: [], loading: true, error: '' });
  useEffect(() => {
    const request = ++requestRef.current;
    if (!enabled || !userId) return undefined;
    let active = true;
    setState({ userId, addresses: [], loading: true, error: '' });
    deliveryAddressClient.list(userId).then((result) => {
      if (active && request === requestRef.current) setState({ userId, addresses: result.addresses, loading: false, error: '' });
    }).catch((error) => {
      if (active && request === requestRef.current) setState({ userId, addresses: [], loading: false, error: error?.reason || error?.message || 'No se pudieron cargar tus direcciones.' });
    });
    return () => { active = false; };
  }, [enabled, userId, attempt]);
  return {
    ...(state.userId === userId ? state : { addresses: [], loading: true, error: '' }),
    refresh: () => setAttempt((value) => value + 1),
  };
}
