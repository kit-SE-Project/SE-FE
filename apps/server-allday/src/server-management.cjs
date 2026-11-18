

function serverDraft(server) {
  return {
    displayName: server?.displayName || server?.name || '',
    cpuModel: server?.cpuModel || server?.cpu || '',
    memoryGb: String(server?.memoryGb || parseInt(server?.ram, 10) || ''),
    gpuModel: server?.gpuModel || server?.gpu || '-',
    categoryId: server?.categoryId ?? null,
    nodeName: server?.nodeName || '',
    reason: '',
  };
}

function validateServer(draft, categories, servers, editingId, requireNode = false) {
  const errors = {};
  const name = draft.displayName.trim();
  if (!name) errors.displayName = '서버명을 입력하세요.';
  else if (name.length > 100) errors.displayName = '서버명은 100자 이내로 입력하세요.';
  if (!draft.cpuModel.trim()) errors.cpuModel = 'CPU 사양을 입력하세요.';
  else if (draft.cpuModel.trim().length > 200) errors.cpuModel = 'CPU 사양은 200자 이내로 입력하세요.';
  if (!/^\d+$/.test(draft.memoryGb.trim()) || !Number.isSafeInteger(Number(draft.memoryGb)) || Number(draft.memoryGb) < 1 || Number(draft.memoryGb) > 2147483647) errors.memoryGb = '메모리를 1 이상의 정수(GB)로 입력하세요.';
  if (!draft.gpuModel.trim()) errors.gpuModel = 'GPU 사양을 입력하세요. GPU가 없으면 -를 입력하세요.';
  else if (draft.gpuModel.trim().length > 200) errors.gpuModel = 'GPU 사양은 200자 이내로 입력하세요.';
  if (!categories.some(c => c.id === draft.categoryId)) errors.categoryId = '카테고리를 선택하세요.';
  if (requireNode && !/^[A-Za-z0-9_-]{1,100}$/.test(draft.nodeName.trim())) errors.nodeName = '관리 노드명을 영문, 숫자, 밑줄 또는 하이픈으로 입력하세요 (100자 이내).';
  if (editingId != null && (!draft.reason?.trim() || draft.reason.trim().length > 500)) errors.reason = '변경 사유를 1~500자로 입력하세요.';
  return errors;
}

function serverPayload(draft) {
  return { displayName: draft.displayName.trim(), cpuModel: draft.cpuModel.trim(), memoryGb: Number(draft.memoryGb), gpuModel: draft.gpuModel.trim(), categoryId: draft.categoryId, nodeName: draft.nodeName.trim() };
}

function serverEditPayload(draft) {
  const {nodeName,...fields} = serverPayload(draft);
  return {...fields,reason:draft.reason.trim()};
}
module.exports = { serverDraft, validateServer, serverPayload, serverEditPayload };
