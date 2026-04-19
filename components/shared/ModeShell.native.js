import Meteor from '@meteorrn/core';
import { router } from 'expo-router';

import ModeShell from './ModeShell.js';

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