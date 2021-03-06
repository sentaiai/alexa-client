import { Node } from '@voiceflow/general-types/build/nodes/capture';
import { HandlerFactory } from '@voiceflow/runtime';
import _ from 'lodash';
import wordsToNumbers from 'words-to-numbers';

import { T } from '@/lib/constants';

import { IntentRequest, RequestType } from '../types';
import { addRepromptIfExists } from '../utils';
import CommandHandler from './command';
import RepeatHandler from './repeat';

const utilsObj = {
  wordsToNumbers,
  addRepromptIfExists,
  commandHandler: CommandHandler(),
  repeatHandler: RepeatHandler(),
};

export const CaptureHandler: HandlerFactory<Node, typeof utilsObj> = (utils) => ({
  canHandle: (node) => !!node.variable,
  handle: (node, context, variables) => {
    const request = context.turn.get<IntentRequest>(T.REQUEST);

    if (request?.type !== RequestType.INTENT) {
      utils.addRepromptIfExists(node, context, variables);
      // quit cycleStack without ending session by stopping on itself
      return node.id;
    }

    let nextId: string | null = null;

    // check if there is a command in the stack that fulfills intent
    if (utils.commandHandler.canHandle(context)) {
      return utils.commandHandler.handle(context, variables);
    }
    if (utils.repeatHandler.canHandle(context)) {
      return utils.repeatHandler.handle(context);
    }

    // "input" is only passed through the prototype tool
    const { intent, input } = request.payload;

    // try to match the first slot of the intent to the variable
    const value = (_.keys(intent.slots).length === 1 && _.values(intent.slots)[0]?.value) || input;

    if (value) {
      const num = utils.wordsToNumbers(value);

      if (typeof num !== 'number' || Number.isNaN(num)) {
        variables.set(node.variable, value);
      } else {
        variables.set(node.variable, num);
      }
    }

    ({ nextId = null } = node);

    // request for this turn has been processed, delete request
    context.turn.delete(T.REQUEST);

    return nextId;
  },
});

export default () => CaptureHandler(utilsObj);
