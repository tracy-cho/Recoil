/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 *
 * Recoil DevTools browser extension.
 *
 * @emails oncall+recoil
 * @flow strict-local
 * @format
 * @oncall recoil
 */
'use strict';

import type {BackgroundPostMessage} from '../../types/DevtoolsTypes';

const {RecoilDevToolsActions} = require('../../constants/Constants');
const {debug, warn} = require('../../utils/Logger');
const Store = require('../../utils/Store');

const store = (window.store = new Store());

const getConnectionId = ({sender}: chrome$Port): number => {
  // If this is a devtool connection, there's no tab.id
  // But that ID is not required so we return 0
  return sender?.tab?.id ?? 0;
};
const getConnectionName = ({name}: chrome$Port): string => {
  let id = name ?? 'Recoil Connection';
  return id;
};

function onConnect(port: chrome$Port): void {
  const connectionId = getConnectionId(port);
  const displayName = getConnectionName(port);
  let isPopupConnection = false;
  const chunksBuffer = new Map<number, string>();

  const msgHandler = (msg: BackgroundPostMessage) => {
    // ignore invalid message formats
    if (msg?.action == null) {
      return;
    }
    if (msg.action === RecoilDevToolsActions.UPDATE) {
      store.processMessage(msg, connectionId);
    } else if (msg.action === RecoilDevToolsActions.INIT) {
      store.connect(
        connectionId,
        msg.data?.persistenceLimit,
        msg.data?.initialValues,
        displayName,
        msg.data?.devMode,
        port,
      );
      debug('CONNECT', connectionId);
      // This is only needed if we want to display a popup banner
      // in addition to the devpanel.
      // chrome.pageAction.show(connectionId);
    } else if (msg.action === RecoilDevToolsActions.SUBSCRIBE_POPUP) {
      isPopupConnection = true;
      store.subscribe(port);
    } else if (msg.action === RecoilDevToolsActions.UPLOAD_CHUNK) {
      const chunkSoFar = (chunksBuffer.get(msg.txID) ?? '') + (msg.chunk ?? '');
      chunksBuffer.set(msg.txID, chunkSoFar);
      if (Boolean(msg.isFinalChunk)) {
        try {
          const data = JSON.parse(chunkSoFar);
          msgHandler(data);
        } catch (e) {
          warn('Recoil DevTools: Message failed due to "`${e.message}`"');
        } finally {
          chunksBuffer.delete(msg.txID);
        }
      }
    }
  };

  port.onMessage.addListener(msgHandler);

  port.onDisconnect.addListener(() => {
    debug('DISCONNECT', connectionId);
    if (isPopupConnection) {
      store.unsubscribe(port);
    } else {
      store.disconnect(connectionId);
    }
  });
}

chrome.runtime.onConnect.addListener(onConnect);

module.exports = {onConnect};
