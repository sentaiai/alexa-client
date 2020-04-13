import { expect } from 'chai';
import sinon from 'sinon';

import ReminderHandler from '@/lib/services/test/handlers/reminder';

describe('Test ReminderHandler unit tests', () => {
  describe('canHandle', () => {
    it('false', () => {
      expect(ReminderHandler.canHandle({} as any, null as any, null as any, null as any)).to.eql(false);
    });

    it('true', () => {
      expect(ReminderHandler.canHandle({ reminder: {} } as any, null as any, null as any, null as any)).to.eql(true);
    });
  });

  describe('handle', () => {
    it('no success_id or fail_id', () => {
      const context = { trace: { debug: sinon.stub() } };
      expect(ReminderHandler.handle({} as any, context as any, null as any, null as any)).to.eql(null);
      expect(context.trace.debug.args).to.eql([['__Reminder__ - entered']]);
    });

    it('success_id', () => {
      const block = { success_id: 'success-id' };
      const context = { trace: { debug: sinon.stub() } };
      expect(ReminderHandler.handle(block as any, context as any, null as any, null as any)).to.eql(block.success_id);
      expect(context.trace.debug.args).to.eql([['__Reminder__ - entered'], ['Reminder - redirecting to the success block']]);
    });

    it('fail_id', () => {
      const block = { fail_id: 'fail-id' };
      const context = { trace: { debug: sinon.stub() } };
      expect(ReminderHandler.handle(block as any, context as any, null as any, null as any)).to.eql(block.fail_id);
      expect(context.trace.debug.args).to.eql([
        ['__Reminder__ - entered'],
        ['Reminder - success link is not provided, redirecting to the fail block'],
      ]);
    });
  });
});