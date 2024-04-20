import React, { useState, useEffect, useRef } from 'react';
import './Client.scss';

import { initHotkeys } from '../../../client/event/hotkeys';
import { initRoomListListener } from '../../../client/event/roomList';

import Text from '../../atoms/text/Text';
import Spinner from '../../atoms/spinner/Spinner';
import Navigation from '../../organisms/navigation/Navigation';
import ContextMenu, { MenuItem } from '../../atoms/context-menu/ContextMenu';
import IconButton from '../../atoms/button/IconButton';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import JitsiRoom from '../../organisms/room/JitsiRoom';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';

import initMatrix from '../../../client/initMatrix';
import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';

import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';
import { ClientContent } from './ClientContent';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function Client() {
  const [isLoading, changeLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Heating up');
  const [dragCounter, setDragCounter] = useState(0);
  const [isJitsiRoom, setIsJitsiRoom] = useState(false);
  const [jitsiCallId, setJitsiCallId] = useState(null);
  const classNameHidden = 'client__item-hidden';

  const navWrapperRef = useRef(null);
  const roomWrapperRef = useRef(null);

  function onRoomSelected() {
    navWrapperRef.current?.classList.add(classNameHidden);
    roomWrapperRef.current?.classList.remove(classNameHidden);
  }
  function onNavigationSelected() {
    navWrapperRef.current?.classList.remove(classNameHidden);
    roomWrapperRef.current?.classList.add(classNameHidden);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.ROOM_SELECTED, onRoomSelected);
    navigation.on(cons.events.navigation.NAVIGATION_OPENED, onNavigationSelected);

    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, onRoomSelected);
      navigation.removeListener(cons.events.navigation.NAVIGATION_OPENED, onNavigationSelected);
    };
  }, []);

  useEffect(() => {
    changeLoading(true);
    let counter = 0;
    const iId = setInterval(() => {
      const msgList = ['Almost there...', 'Looks like you have a lot of stuff to heat up!'];
      if (counter === msgList.length - 1) {
        setLoadingMsg(msgList[msgList.length - 1]);
        clearInterval(iId);
        return;
      }
      setLoadingMsg(msgList[counter]);
      counter += 1;
    }, 15000);
    initMatrix.once('init_loading_finished', () => {
      clearInterval(iId);
      initHotkeys();
      initRoomListListener(initMatrix.roomList);
      changeLoading(false);
    });
    initMatrix.init();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-display">
        <div className="loading__menu">
          <ContextMenu
            placement="bottom"
            content={
              <>
                <MenuItem onClick={() => initMatrix.clearCacheAndReload()}>
                  Clear cache & reload
                </MenuItem>
                <MenuItem onClick={() => initMatrix.logout()}>Logout</MenuItem>
              </>
            }
            render={(toggle) => (
              <IconButton size="extra-small" onClick={toggle} src={VerticalMenuIC} />
            )}
          />
        </div>
        <Spinner />
        <Text className="loading__message" variant="b2">
          {loadingMsg}
        </Text>

        <div className="loading__appname">
          <Text variant="h2" weight="medium">
            Cinny
          </Text>
        </div>
      </div>
    );
  }

  const JITSI_ROOM_CLASS = 'jitsi_pip'
  const ROOM_CLASS = `room__wrapper ${classNameHidden}`
  let jitsiPip = '';
  if (isJitsiRoom) jitsiPip = ROOM_CLASS;
  else if (jitsiCallId) jitsiPip = JITSI_ROOM_CLASS;

  return (
    <MatrixClientProvider value={initMatrix.matrixClient}>
      <div className="client-container">
        <div className="navigation__wrapper" ref={navWrapperRef}>
          <Navigation jitsiCallId={jitsiCallId} />
        </div>
        <div className={jitsiPip}>
          <JitsiRoom
            isJitsiRoom={isJitsiRoom}
            setIsJitsiRoom={setIsJitsiRoom}
            jitsiCallId={jitsiCallId}
            setJitsiCallId={setJitsiCallId}
          />
        </div>
        <div className={isJitsiRoom ? 'hidden' : ROOM_CLASS} ref={roomWrapperRef}>
          <ClientContent />
        </div>
        <Windows />
        <Dialogs />
        <ReusableContextMenu />
        <SystemEmojiFeature />
      </div>
    </MatrixClientProvider>
  );
}

export default Client;
