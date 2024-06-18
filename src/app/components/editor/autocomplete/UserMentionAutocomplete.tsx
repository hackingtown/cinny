import React, { useEffect, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Editor } from 'slate';
import { Avatar, AvatarFallback, AvatarImage, MenuItem, Text, color } from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';

import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';
import { createMentionElement, moveCursor, replaceWithElement } from '../utils';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { getMxIdLocalPart, getMxIdServer, validMxId } from '../../../utils/matrix';
import { getMemberDisplayName, getMemberSearchStr } from '../../../utils/room';

type MentionAutoCompleteHandler = (userId: string, name: string) => void;

const userIdFromQueryText = (mx: MatrixClient, text: string) =>
  validMxId(`@${text}`)
    ? `@${text}`
    : `@${text}${text.endsWith(':') ? '' : ':'}${getMxIdServer(mx.getUserId() ?? '')}`;

function UnknownMentionItem({
  query,
  userId,
  name,
  handleAutocomplete,
}: {
  query: AutocompleteQuery<string>;
  userId: string;
  name: string;
  handleAutocomplete: MentionAutoCompleteHandler;
}) {
  return (
    <MenuItem
      as="button"
      radii="300"
      onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
        onTabPress(evt, () => handleAutocomplete(userId, name))
      }
      onClick={() => handleAutocomplete(userId, name)}
      before={
        <Avatar size="200">
          <AvatarFallback
            style={{
              backgroundColor: color.Secondary.Container,
              color: color.Secondary.OnContainer,
            }}
          >
            <Text size="H6">{query.text[0]}</Text>
          </AvatarFallback>
        </Avatar>
      }
    >
      <Text style={{ flexGrow: 1 }} size="B400">
        {name}
      </Text>
    </MenuItem>
  );
}

type UserMentionAutocompleteProps = {
  room: Room;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 20,
  matchOptions: {
    contain: true,
  },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
  getMemberSearchStr(m, query, mxIdToName);

export function UserMentionAutocomplete({
  room,
  editor,
  query,
  requestClose,
}: UserMentionAutocompleteProps) {
  const mx = useMatrixClient();
  const roomId: string = room.roomId!;
  const roomAliasOrId = room.getCanonicalAlias() || roomId;
  const members = useRoomMembers(mx, roomId);

  const [result, search, resetSearch] = useAsyncSearch(members, getRoomMemberStr, SEARCH_OPTIONS);
  const autoCompleteMembers = result ? result.items : members.slice(0, 20);

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  const handleAutocomplete: MentionAutoCompleteHandler = (uId, name) => {
    const mentionEl = createMentionElement(
      uId,
      name.startsWith('@') ? name : `@${name}`,
      mx.getUserId() === uId || roomAliasOrId === uId
    );
    replaceWithElement(editor, query.range, mentionEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onTabPress(evt, () => {
      if (query.text === 'room') {
        handleAutocomplete(roomAliasOrId, '@room');
        return;
      }
      if (autoCompleteMembers.length === 0) {
        const userId = userIdFromQueryText(mx, query.text);
        handleAutocomplete(userId, userId);
        return;
      }
      const roomMember = autoCompleteMembers[0];
      handleAutocomplete(roomMember.userId, roomMember.name);
    });
  });

  const getName = (member: RoomMember) =>
    getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Mentions</Text>} requestClose={requestClose}>
      {query.text === 'room' && (
        <UnknownMentionItem
          query={query}
          userId={roomAliasOrId}
          name="@room"
          handleAutocomplete={handleAutocomplete}
        />
      )}
      {autoCompleteMembers.length === 0 ? (
        <UnknownMentionItem
          query={query}
          userId={userIdFromQueryText(mx, query.text)}
          name={userIdFromQueryText(mx, query.text)}
          handleAutocomplete={handleAutocomplete}
        />
      ) : (
        autoCompleteMembers.map((roomMember) => {
          const avatarUrl = roomMember.getAvatarUrl(mx.baseUrl, 32, 32, 'crop', undefined, false);
          return (
            <MenuItem
              key={roomMember.userId}
              as="button"
              radii="300"
              onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                onTabPress(evt, () => handleAutocomplete(roomMember.userId, getName(roomMember)))
              }
              onClick={() => handleAutocomplete(roomMember.userId, getName(roomMember))}
              after={
                <Text size="T200" priority="300" truncate>
                  {roomMember.userId}
                </Text>
              }
              before={
                <Avatar size="200">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={getName(roomMember)} />
                  ) : (
                    <AvatarFallback
                      style={{
                        backgroundColor: color.Secondary.Container,
                        color: color.Secondary.OnContainer,
                      }}
                    >
                      <Text size="H6">{getName(roomMember)[0]}</Text>
                    </AvatarFallback>
                  )}
                </Avatar>
              }
            >
              <Text style={{ flexGrow: 1 }} size="B400" truncate>
                {getName(roomMember)}
              </Text>
            </MenuItem>
          );
        })
      )}
    </AutocompleteMenu>
  );
}
