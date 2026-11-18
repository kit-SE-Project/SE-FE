const EMPTY_SELECTION = { mode: null, serverId: null };

function serverSelection(state, action) {
  switch (action.type) {
    case 'begin':
      if (!['edit', 'delete'].includes(action.mode)) return state;
      return state.mode === action.mode ? EMPTY_SELECTION : { mode: action.mode, serverId: null };
    case 'select':
      if (!state.mode || !Number.isSafeInteger(action.serverId)) return state;
      return { ...state, serverId: action.serverId };
    case 'reset': return EMPTY_SELECTION;
    default: return state;
  }
}

function rentalMemberLabel(rental) {
  return Number.isSafeInteger(rental.memberId) ? `회원 ID ${rental.memberId}` : '대여자 정보 없음';
}

const FORCE_RETURN_STATES = ['RESERVED', 'PROVISIONING', 'READY', 'ACTIVE', 'RETAINED'];
function canForceReturn(rental) { return !!rental && FORCE_RETURN_STATES.includes(rental.status); }
function serverOpenRentals(rentals, serverId) {
  return rentals.filter(rental => rental.serverId === serverId && (canForceReturn(rental) || rental.status === 'RETURNING'));
}
function forceReturnTarget(rentals, serverId, rentalId) {
  return rentals.find(rental => rental.serverId === serverId && rental.id === rentalId && canForceReturn(rental)) || null;
}

module.exports = { EMPTY_SELECTION, serverSelection, rentalMemberLabel, canForceReturn, serverOpenRentals, forceReturnTarget };
