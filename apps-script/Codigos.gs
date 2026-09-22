/**
 * Geração automática de códigos visíveis.
 * IDs internos continuam UUIDs e não são expostos como campos de entrada.
 */

function proximoCodigoObra_() {
  const obras = listObjects_('OBRAS');
  let maior = 0;

  obras.forEach(function(obra) {
    const match = String(obra.CODIGO || '').match(/^OBR-(\d+)$/i);
    if (match) maior = Math.max(maior, Number(match[1]));
  });

  return 'OBR-' + String(maior + 1).padStart(4, '0');
}

function proximoCodigoWbs_(idObra, idWbsPai) {
  const wbs = listarWbs_(idObra);
  const paiId = String(idWbsPai || '');
  const irmaos = wbs.filter(function(item) {
    return String(item.ID_WBS_PAI || '') === paiId;
  });

  let maior = 0;
  irmaos.forEach(function(item) {
    const codigo = String(item.CODIGO_WBS || '');
    const segmento = codigo.split('.').pop();
    if (/^\d+$/.test(segmento)) maior = Math.max(maior, Number(segmento));
  });

  const proximo = String(maior + 1);

  if (!paiId) return proximo;

  const pai = wbs.find(function(item) {
    return String(item.ID_WBS) === paiId;
  });

  if (!pai || !pai.CODIGO_WBS) throw new Error('WBS_PAI_INVALIDA');
  return String(pai.CODIGO_WBS) + '.' + proximo;
}

function proximoCodigoAtividade_(idObra, idWbs) {
  const atividades = listarAtividades_(idObra);
  const wbsId = String(idWbs || '');

  if (!wbsId) {
    let maiorSemWbs = 0;
    atividades
      .filter(function(a) { return !String(a.ID_WBS || ''); })
      .forEach(function(a) {
        const match = String(a.CODIGO || '').match(/^A-(\d+)$/i);
        if (match) maiorSemWbs = Math.max(maiorSemWbs, Number(match[1]));
      });
    return 'A-' + String(maiorSemWbs + 1).padStart(3, '0');
  }

  const wbs = findObjectById_('WBS', 'ID_WBS', wbsId);
  if (!wbs || String(wbs.ID_OBRA) !== String(idObra)) throw new Error('WBS_INVALIDA');

  const prefixo = String(wbs.CODIGO_WBS || '').trim();
  if (!prefixo) throw new Error('WBS_SEM_CODIGO');

  let maior = 0;
  atividades
    .filter(function(a) { return String(a.ID_WBS || '') === wbsId; })
    .forEach(function(a) {
      const codigo = String(a.CODIGO || '');
      const segmento = codigo.split('.').pop();
      if (/^\d+$/.test(segmento)) maior = Math.max(maior, Number(segmento));
    });

  return prefixo + '.' + String(maior + 1);
}
