// Formulário de cotação de seguro auto · Imperatriz Seguros
// Nada é salvo: o texto é montado aqui e vai pelo link wa.me para o WhatsApp da corretora.
// A ordem da mensagem segue as abas do Aggilizador: Segurado, Condutor, Veículo, Questionário, Seguro.

const WHATSAPP = "5567984090410";

const form = document.getElementById("form");
const $ = (nome) => form.elements[nome];
const valor = (nome) => {
  const el = $(nome);
  if (!el) return "";
  if (el instanceof RadioNodeList) return el.value || "";
  return (el.value || "").trim();
};

/* ------------------------------------------------------------ máscaras */
const MASCARAS = {
  cpf: (d) => d.slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4"),
  data: (d) => d.slice(0, 8).replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3"),
  cep: (d) => d.slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
};
form.querySelectorAll("[data-mask]").forEach((el) => {
  el.addEventListener("input", () => {
    el.value = MASCARAS[el.dataset.mask](el.value.replace(/\D/g, ""));
  });
});
["v_fab", "v_mod"].forEach((n) => $(n).addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); }));
$("v_placa").addEventListener("input", (e) => { e.target.value = e.target.value.toUpperCase(); });

/* ------------------------------------------------------------ validações */
function cpfValido(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += +d[i] * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== +d[t]) return false;
  }
  return true;
}
function dataValida(txt) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt);
  if (!m) return false;
  const [_, dd, mm, aa] = m.map(Number);
  const dt = new Date(aa, mm - 1, dd);
  return dt.getDate() === dd && dt.getMonth() === mm - 1 && aa > 1900;
}
function idade(txt) {
  const [dd, mm, aa] = txt.split("/").map(Number);
  const hoje = new Date();
  let i = hoje.getFullYear() - aa;
  if (hoje.getMonth() + 1 < mm || (hoje.getMonth() + 1 === mm && hoje.getDate() < dd)) i--;
  return i;
}

/* ------------------------------------------------------------ CEP → cidade (ViaCEP) */
form.querySelectorAll("[data-cidade-de]").forEach((info) => {
  const campo = $(info.dataset.cidadeDe);
  campo.addEventListener("input", async () => {
    const d = campo.value.replace(/\D/g, "");
    info.textContent = ""; info.className = "cidade"; campo.dataset.cidade = "";
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (campo.value.replace(/\D/g, "") !== d) return;
      if (j.erro) { info.textContent = "CEP não encontrado. Confira os números."; return; }
      const cidade = `${j.localidade}/${j.uf}`;
      campo.dataset.cidade = [j.bairro, cidade].filter(Boolean).join(", ");
      info.textContent = "✓ " + campo.dataset.cidade;
      info.className = "cidade ok";
    } catch { /* sem internet ou ViaCEP fora: segue sem a cidade */ }
  });
});

/* ------------------------------------------------------------ partes condicionais */
const blocoCondutor = document.getElementById("condutor");
const blocoSeguro = document.getElementById("seguro");
const blocoVeiculo = document.getElementById("veiculo");
const campoPernoite = document.getElementById("campo-pernoite");
const fotoDoc = document.getElementById("foto-doc");
const mesmoCep = document.getElementById("mesmo-cep");

function atualizar() {
  blocoCondutor.hidden = valor("c_mesmo") !== "nao";
  blocoSeguro.hidden = valor("seg") !== "sim";
  blocoVeiculo.hidden = fotoDoc.checked;
  campoPernoite.hidden = mesmoCep.checked;
}
form.addEventListener("change", atualizar);
atualizar();

// tira o vermelho assim que a pessoa corrige o campo
["input", "change"].forEach((ev) => form.addEventListener(ev, (e) => {
  e.target.classList.remove("invalido");
  e.target.closest(".pergunta")?.classList.remove("invalido");
}));

/* ------------------------------------------------------------ checagem antes de enviar */
function checar() {
  form.querySelectorAll(".invalido").forEach((el) => el.classList.remove("invalido"));
  const problemas = [];
  const marcar = (el, msg) => {
    const alvo = el instanceof RadioNodeList ? el[0].closest(".pergunta") : el;
    alvo.classList.add("invalido");
    problemas.push({ alvo, msg });
  };
  const exigir = (nome, msg) => { if (!valor(nome)) marcar($(nome), msg); };

  // segurado
  exigir("s_nome", "Preencha o seu nome.");
  if (!cpfValido(valor("s_cpf"))) marcar($("s_cpf"), "Confira o seu CPF.");
  if (!dataValida(valor("s_nasc"))) marcar($("s_nasc"), "Confira a sua data de nascimento.");
  exigir("s_civil", "Escolha o seu estado civil.");
  exigir("s_prof", "Preencha a sua profissão.");
  if (valor("s_cep").replace(/\D/g, "").length !== 8) marcar($("s_cep"), "Confira o CEP de onde mora.");

  // condutor
  exigir("c_mesmo", "Diga se o principal condutor é você.");
  if (valor("c_mesmo") === "nao") {
    exigir("c_nome", "Preencha o nome do condutor.");
    if (!cpfValido(valor("c_cpf"))) marcar($("c_cpf"), "Confira o CPF do condutor.");
    if (!dataValida(valor("c_nasc"))) marcar($("c_nasc"), "Confira a data de nascimento do condutor.");
    exigir("c_civil", "Escolha o estado civil do condutor.");
    exigir("c_prof", "Preencha a profissão do condutor.");
    exigir("c_rel", "Diga o que o condutor é seu.");
  }
  exigir("jovem", "Responda sobre condutores de 18 a 25 anos.");

  // veículo
  if (!fotoDoc.checked) {
    exigir("v_placa", "Preencha a placa ou o chassi (ou marque que vai mandar a foto do documento).");
    exigir("v_modelo", "Preencha a marca e o modelo do carro.");
    if (!/^\d{4}$/.test(valor("v_fab"))) marcar($("v_fab"), "Confira o ano de fabricação.");
    if (!/^\d{4}$/.test(valor("v_mod"))) marcar($("v_mod"), "Confira o ano do modelo.");
  }
  exigir("v_zero", "Diga se o carro é zero km.");

  // uso e garagem
  if (!mesmoCep.checked && valor("p_cep").replace(/\D/g, "").length !== 8) marcar($("p_cep"), "Confira o CEP onde o carro dorme.");
  exigir("g_res_tipo", "Escolha o tipo de residência.");
  exigir("g_res", "Responda sobre a garagem onde mora.");
  exigir("g_trab", "Responda sobre a garagem no trabalho.");
  exigir("g_est", "Responda sobre a garagem no local de estudo.");
  exigir("uso", "Escolha o tipo de uso do carro.");
  exigir("km", "Escolha quanto o carro roda.");

  // seguro atual
  exigir("seg", "Diga se o carro já tem seguro.");
  if (valor("seg") === "sim") {
    exigir("seg_cia", "Preencha a seguradora atual.");
    if (!dataValida(valor("seg_venc"))) marcar($("seg_venc"), "Confira a data de vencimento do seguro.");
    exigir("seg_sin", "Diga se teve sinistro no último ano.");
  }

  const erro = document.getElementById("erro");
  if (!problemas.length) { erro.hidden = true; return true; }
  erro.textContent = problemas.length === 1 ? problemas[0].msg : `${problemas[0].msg} (e mais ${problemas.length - 1} item(ns) em vermelho)`;
  erro.hidden = false;
  problemas[0].alvo.scrollIntoView({ behavior: "smooth", block: "center" });
  const foco = problemas[0].alvo.matches("input,select") ? problemas[0].alvo : problemas[0].alvo.querySelector("input");
  foco && foco.focus({ preventScroll: true });
  return false;
}

/* ------------------------------------------------------------ mensagem */
function cepComCidade(nome) {
  const c = $(nome).dataset.cidade;
  return valor(nome) + (c ? ` (${c})` : "");
}
function montar() {
  const L = [];
  const linha = (rotulo, v) => v && L.push(`${rotulo}: ${v}`);

  L.push("*COTAÇÃO SEGURO AUTO*", "_enviado pelo formulário_", "");

  L.push("*👤 Segurado*");
  linha("Nome", valor("s_nome"));
  linha("CPF", valor("s_cpf"));
  linha("Nascimento", `${valor("s_nasc")} (${idade(valor("s_nasc"))} anos)`);
  linha("Estado civil", valor("s_civil"));
  linha("Profissão", valor("s_prof"));
  linha("CEP residência", cepComCidade("s_cep"));
  L.push("");

  L.push("*🧑 Principal condutor*");
  if (valor("c_mesmo") === "sim") {
    L.push("O próprio segurado");
  } else {
    linha("Relação", valor("c_rel"));
    linha("Nome", valor("c_nome"));
    linha("CPF", valor("c_cpf"));
    linha("Nascimento", `${valor("c_nasc")} (${idade(valor("c_nasc"))} anos)`);
    linha("Estado civil", valor("c_civil"));
    linha("Profissão", valor("c_prof"));
  }
  linha("Cobertura p/ condutores de 18 a 25 anos", valor("jovem"));
  L.push("");

  L.push("*🚗 Veículo*");
  if (fotoDoc.checked) {
    L.push("📸 Vou mandar a foto do documento (CRLV)");
  } else {
    linha("Placa/chassi", valor("v_placa"));
    linha("Marca/modelo", valor("v_modelo"));
    linha("Ano", `${valor("v_fab")}/${valor("v_mod")}`);
  }
  linha("Zero km", valor("v_zero"));
  const extras = [...form.querySelectorAll('input[name="v_extra"]:checked')].map((e) => e.value);
  linha("Financiado / kit gás / blindagem", extras.length ? extras.join(", ") : "Nenhum");
  L.push("");

  L.push("*🏠 Uso e garagem*");
  linha("CEP pernoite", mesmoCep.checked ? "mesmo da residência" : cepComCidade("p_cep"));
  linha("Tipo de residência", valor("g_res_tipo"));
  linha("Garagem na residência", valor("g_res"));
  linha("Garagem no trabalho", valor("g_trab"));
  linha("Garagem no estudo", valor("g_est"));
  linha("Tipo de uso", valor("uso"));
  linha("Km rodado", valor("km"));
  L.push("");

  L.push("*🛡️ Seguro atual*");
  if (valor("seg") === "sim") {
    linha("Seguradora", valor("seg_cia"));
    linha("Vencimento", valor("seg_venc"));
    linha("Sinistro no último ano", valor("seg_sin"));
  } else {
    L.push("Não tem seguro");
  }
  if (valor("obs")) L.push("", "*💬 Observações*", valor("obs"));

  return L.join("\n");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!checar()) return;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(montar())}`, "_blank", "noopener");
});

document.getElementById("copiar").addEventListener("click", async (e) => {
  if (!checar()) return;
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(montar());
    btn.textContent = "✓ Texto copiado. Cole na conversa do WhatsApp";
  } catch {
    btn.textContent = "Não deu para copiar neste celular. Use o botão verde.";
  }
});
