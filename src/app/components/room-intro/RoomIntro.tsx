import React, { useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage, Box, Button, Spinner, Text, as, color } from 'folds';
import { Room } from 'matrix-js-sdk';
import { openInviteUser, selectRoom } from '../../../client/action/navigation';
import { useStateEvent } from '../../hooks/useStateEvent';
import { IRoomCreateContent, Membership, StateEvent } from '../../../types/matrix/room';
import { getMemberDisplayName, getStateEvent } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdLocalPart } from '../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';

export type RoomIntroProps = {
  room: Room;
};

export const RoomIntro = as<'div', RoomIntroProps>(({ room, ...props }, ref) => {
  const mx = useMatrixClient();
  const createEvent = getStateEvent(room, StateEvent.RoomCreate);
  const avatarEvent = useStateEvent(room, StateEvent.RoomAvatar);
  const nameEvent = useStateEvent(room, StateEvent.RoomName);
  const topicEvent = useStateEvent(room, StateEvent.RoomTopic);
  const createContent = createEvent?.getContent<IRoomCreateContent>();

  const ts = createEvent?.getTs();
  const creatorId = createEvent?.getSender();
  const creatorName =
    creatorId && (getMemberDisplayName(room, creatorId) ?? getMxIdLocalPart(creatorId));
  const prevRoomId = createContent?.predecessor?.room_id;
  const avatarMxc = (avatarEvent?.getContent().url as string) || undefined;
  const avatarHttpUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc) : undefined;
  const name = (nameEvent?.getContent().name || room.name) as string;
  const topic = (topicEvent?.getContent().topic as string) || undefined;

  const [prevRoomState, joinPrevRoom] = useAsyncCallback(
    useCallback(async (roomId: string) => mx.joinRoom(roomId), [mx])
  );

  return (
    <Box direction="Column" grow="Yes" gap="500" {...props} ref={ref}>
      <Box>
        <Avatar size="500">
          {avatarHttpUrl ? (
            <AvatarImage src={avatarHttpUrl} alt={name} />
          ) : (
            <AvatarFallback
              style={{
                backgroundColor: color.SurfaceVariant.Container,
                color: color.SurfaceVariant.OnContainer,
              }}
            >
              <Text size="H2">{name[0]}</Text>
            </AvatarFallback>
          )}
        </Avatar>
      </Box>
      <Box direction="Column" gap="300">
        <Box direction="Column" gap="100">
          <Text size="H3" priority="500">
            {name}
          </Text>
          <Text size="T400" priority="400">
            {typeof topic === 'string' ? topic : 'This is the beginning of conversation.'}
          </Text>
          {creatorName && ts && (
            <Text size="T200" priority="300">
              {'Created by '}
              <b>@{creatorName}</b>
              {` on ${timeDayMonthYear(ts)} ${timeHourMinute(ts)}`}
            </Text>
          )}
        </Box>
        <Box gap="200" wrap="Wrap">
          <Button
            onClick={() => openInviteUser(room.roomId)}
            variant="Secondary"
            size="300"
            radii="300"
          >
            <Text size="B300">Invite Member</Text>
          </Button>
          {typeof prevRoomId === 'string' &&
            (mx.getRoom(prevRoomId)?.getMyMembership() === Membership.Join ? (
              <Button
                onClick={() => selectRoom(prevRoomId)}
                variant="Success"
                size="300"
                fill="Soft"
                radii="300"
              >
                <Text size="B300">Open Old Room</Text>
              </Button>
            ) : (
              <Button
                onClick={() => joinPrevRoom(prevRoomId)}
                variant="Secondary"
                size="300"
                fill="Soft"
                radii="300"
                disabled={prevRoomState.status === AsyncStatus.Loading}
                after={
                  prevRoomState.status === AsyncStatus.Loading ? (
                    <Spinner size="50" variant="Secondary" fill="Soft" />
                  ) : undefined
                }
              >
                <Text size="B300">Join Old Room</Text>
              </Button>
            ))}
        </Box>
      </Box>
    </Box>
  );
});
