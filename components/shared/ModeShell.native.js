import Meteor from '@meteorrn/core';
import { router } from 'expo-router';

import ModeShell from './ModeShell.js';
import { clearMCPConfiguration } from '../../services/mcp/mcpClient.js';

const ModeShellNative = (props) => {
  return (
    <ModeShell
      {...props}
      onLogout={() => {
        clearMCPConfiguration().finally(() => {
          Meteor.logout(() => router.replace('/(auth)'));
        });
      }}
    />
  );
};

export default ModeShellNative;