import { Command, CommandMapping } from '@voiceflow/api-sdk';
import { Command as IntentCommand } from '@voiceflow/general-types/build/nodes/command';
import { Context, extractFrameCommand, Frame, Store } from '@voiceflow/runtime';
import _ from 'lodash';

import { F, T } from '@/lib/constants';

import { IntentName, IntentRequest, RequestType } from '../types';
import { mapSlots } from '../utils';

export const getCommand = (context: Context, extractFrame: typeof extractFrameCommand) => {
  const request = context.turn.get(T.REQUEST) as IntentRequest;

  if (request?.type !== RequestType.INTENT) return null;

  const { intent } = request.payload;
  let intentName = intent.name;

  // don't act on a catchall intent
  if (intentName === IntentName.VOICEFLOW) return null;

  const matcher = (command: Command | null) => command?.intent === intentName;

  // If Cancel Intent is not handled turn it into Stop Intent
  // This first loop is AMAZON specific, if cancel intent is not explicitly used anywhere at all, map it to stop intent
  if (intentName === IntentName.CANCEL) {
    const found = context.stack.getFrames().some((frame) => frame.getCommands().some(matcher));

    if (!found) {
      intentName = IntentName.STOP;
      _.set(request, 'payload.intent.name', intentName);
      context.turn.set(T.REQUEST, request);
    }
  }

  const res = extractFrame<IntentCommand>(context.stack, matcher);
  if (!res) return null;

  return {
    ...res,
    intent,
  };
};

const utilsObj = {
  getCommand: (context: Context) => getCommand(context, extractFrameCommand),
  mapSlots,
  Frame,
};

/**
 * The Command Handler is meant to be used inside other handlers, and should never handle nodes directly
 */
export const CommandHandler = (utils: typeof utilsObj) => ({
  canHandle: (context: Context): boolean => {
    return !!utils.getCommand(context);
  },
  handle: (context: Context, variables: Store): string | null => {
    const res = utils.getCommand(context);
    if (!res) return null;

    let nextId: string | null = null;
    let variableMap: CommandMapping[] | undefined;

    if (res.command) {
      const { index, command } = res;

      variableMap = command.mappings;

      if (command.diagram_id) {
        context.trace.debug(`matched command **${command.intent}** - adding command flow`);

        context.stack.top().storage.set(F.CALLED_COMMAND, true);

        // Reset state to beginning of new diagram and store current line to the stack
        const newFrame = new utils.Frame({ programID: command.diagram_id });
        context.stack.push(newFrame);
      } else if (command.next) {
        if (index < context.stack.getSize() - 1) {
          // otherwise destructive and pop off everything before the command
          context.stack.popTo(index + 1);
          context.stack.top().setNodeID(command.next);

          context.trace.debug(`matched intent **${command.intent}** - exiting flows and jumping to node`);
        } else if (index === context.stack.getSize() - 1) {
          // jumping to an intent within the same flow
          nextId = command.next;

          context.trace.debug(`matched intent **${command.intent}** - jumping to node`);
        }
      }
    }

    context.turn.delete(T.REQUEST);

    if (variableMap && res.intent.slots) {
      // map request mappings to variables
      variables.merge(utils.mapSlots(variableMap, res.intent.slots));
    }

    return nextId;
  },
});

export default () => CommandHandler(utilsObj);
