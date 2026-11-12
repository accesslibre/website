import {handleProposalRequest, reply} from './proposal-intake.js';
export {ProposalReceipt} from './proposal-intake.js';
export default {
  async fetch(request, env) {
    return await handleProposalRequest(request, env) || reply({error: 'Not found.'}, 404);
  }
};
