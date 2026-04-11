import React from 'react';
import { router } from 'expo-router';
import Meteor from '@meteorrn/core';

import ModeShell from './ModeShell';

const ModeShellNative = (props) => {
  return (
    <ModeShell
      {...props}
      onLogout={() => {
        Meteor.logout(() => {
          router.replace('/(auth)');
        });
      }}
    />
  );
};

export default ModeShellNative;