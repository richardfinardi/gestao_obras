/**
 * Recursos V4: frentes, equipes e vínculos com atividades.
 */
function listarFrentes_(idObra) {
  return listObjects_('FRENTES').filter(function(x) {
    return String(x.ID_OBRA) === String(idObra) && asBoolean_(x.ATIVA, true);
  }).sort(function(a,b){ return Number(a.ORDEM||0)-Number(b.ORDEM||0); });
}

function listarEquipes_() {
  return listObjects_('EQUIPES').filter(function(x) { return asBoolean_(x.ATIVA, true); });
}

function listarAtividadeEquipes_(idObra) {
  return listObjects_('ATIVIDADE_EQUIPES').filter(function(x) {
    return String(x.ID_OBRA) === String(idObra) && asBoolean_(x.ATIVA, true);
  });
}

function obterOuCriarFrenteMap_(idObra, nomes) {
  const existentes = listarFrentes_(idObra);
  const map = {};
  existentes.forEach(function(f) { map[String(f.NOME||'').trim().toLowerCase()] = f.ID_FRENTE; });

  const novas = [];
  let ordem = existentes.length;
  nomes.forEach(function(nome) {
    const clean = String(nome||'').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (map[key]) return;
    ordem++;
    const id = uid_('FRT');
    map[key] = id;
    novas.push({
      ID_FRENTE:id, ID_OBRA:idObra, CODIGO:'FRT-'+String(ordem).padStart(2,'0'),
      NOME:clean, ORDEM:ordem, ATIVA:true, CRIADO_EM:now_(), ATUALIZADO_EM:now_()
    });
  });
  appendObjectsBulk_('FRENTES', novas);
  return map;
}

function salvarEquipe_(payload) {
  const nome = String(payload.nome || payload.NOME || '').trim();
  if (!nome) throw new Error('NOME_EQUIPE_OBRIGATORIO');
  const atual = listarEquipes_().find(function(x){ return String(x.NOME||'').trim().toLowerCase() === nome.toLowerCase(); });
  if (atual) return atual;

  const equipes = listarEquipes_();
  const item = {
    ID_EQUIPE:uid_('EQP'), ID_ORGANIZACAO:APP.DEFAULT_ORGANIZATION_ID,
    CODIGO:'EQ-'+String(equipes.length+1).padStart(3,'0'), NOME:nome,
    COR:String(payload.cor||payload.COR||''), ATIVA:true, CRIADO_EM:now_(), ATUALIZADO_EM:now_()
  };
  appendObject_('EQUIPES', item);
  return item;
}

function salvarTipoAtividade_(payload) {
  const nome = String(payload.nome || payload.NOME || '').trim();
  if (!nome) throw new Error('NOME_TIPO_OBRIGATORIO');
  const tipos = listObjects_('TIPOS_ATIVIDADE').filter(function(x){ return asBoolean_(x.ATIVO,true); });
  const atual = tipos.find(function(x){ return String(x.NOME||'').trim().toLowerCase() === nome.toLowerCase(); });
  if (atual) return atual;

  const item = {
    ID_TIPO_ATIVIDADE:uid_('TIP'), ID_ORGANIZACAO:APP.DEFAULT_ORGANIZATION_ID,
    NOME:nome, COR:String(payload.cor||payload.COR||''), ATIVO:true,
    CRIADO_EM:now_(), ATUALIZADO_EM:now_()
  };
  appendObject_('TIPOS_ATIVIDADE', item);
  return item;
}

function obterCadastros_() {
  return {
    tiposAtividade:listObjects_('TIPOS_ATIVIDADE').filter(function(x){ return asBoolean_(x.ATIVO,true); }),
    equipes:listarEquipes_()
  };
}
