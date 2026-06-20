  // ============================================================
  // CONSTANTES — REGRAS DE NEGÓCIO (mesmas das versões Python/C)
  // ============================================================
  const IDADE_MINIMA = 21;
  const ANOS_MINIMOS_CNH = 2;
  const SCORE_CREDITO_MINIMO = 500;

  const CNH_CATEGORIAS_PARA_LUXO = ["B", "AB", "C", "D", "E"];

  const DIARIA = { popular: 90.00, luxo: 150.00 };
  const KM_LIMITE = { popular: 100, luxo: 200 };
  const KM_PRECO_ATE = { popular: 0.20, luxo: 0.30 };
  const KM_PRECO_ACIMA = { popular: 0.10, luxo: 0.25 };

  const DESCONTO_LOCACAO_LONGA = 0.10;
  const DIAS_PARA_DESCONTO = 7;

  const TAXA_SEGURO_DIARIA = 15.00;

  const CAPACIDADE_TANQUE = { popular: 45, luxo: 60 };
  const PRECO_LITRO_COMBUSTIVEL = 6.20;
  const TAXA_SERVICO_REABASTECIMENTO = 25.00;

  // ============================================================
  // ESTADO DA UI (toggles)
  // ============================================================
  let tipoCarro = "popular";
  let incluirSeguro = false;
  let tanqueCheio = true;

  function setupPillGroup(groupId, onChange, classWhenActive) {
    const group = document.getElementById(groupId);
    const pills = group.querySelectorAll(".pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => p.classList.remove("active", "danger", "good"));
        pill.classList.add("active");
        if (classWhenActive) pill.classList.add(classWhenActive(pill.dataset.value));
        onChange(pill.dataset.value);
      });
    });
  }

  setupPillGroup("tipoCarroGroup", v => tipoCarro = v);
  setupPillGroup("seguroGroup", v => incluirSeguro = (v === "sim"));
  setupPillGroup("tanqueGroup", v => {
    tanqueCheio = (v === "sim");
    document.getElementById("tankRow").classList.toggle("show", !tanqueCheio);
  }, v => v === "sim" ? "good" : "danger");

  const tankRange = document.getElementById("tankRange");
  const tankValueLabel = document.getElementById("tankValueLabel");
  tankRange.addEventListener("input", () => {
    tankValueLabel.textContent = tankRange.value + "%";
  });

  // ============================================================
  // FUNÇÕES DE REGRA DE NEGÓCIO
  // ============================================================
  function obterFaixaCredito(score) {
    if (score >= 800) return { nome: "Excelente", taxa: 0.00 };
    if (score >= 650) return { nome: "Bom", taxa: 0.05 };
    if (score >= SCORE_CREDITO_MINIMO) return { nome: "Regular", taxa: 0.12 };
    return { nome: "Insuficiente", taxa: null };
  }

  function verificarElegibilidade({ idade, anosCnh, categoriaCnh, scoreCredito, tipoCarro }) {
    const motivos = [];

    if (idade < IDADE_MINIMA) {
      motivos.push(`Idade mínima exigida é ${IDADE_MINIMA} anos (informado: ${idade}).`);
    }
    if (anosCnh < ANOS_MINIMOS_CNH) {
      motivos.push(`É necessário ter no mínimo ${ANOS_MINIMOS_CNH} anos de CNH (informado: ${anosCnh}).`);
    }
    if (tipoCarro === "luxo" && !CNH_CATEGORIAS_PARA_LUXO.includes(categoriaCnh)) {
      motivos.push(`Para carros de luxo é necessária CNH categoria ${CNH_CATEGORIAS_PARA_LUXO.join(", ")}.`);
    }
    if (scoreCredito < SCORE_CREDITO_MINIMO) {
      motivos.push(`Avaliação de crédito insuficiente (mínimo ${SCORE_CREDITO_MINIMO} pontos, informado: ${scoreCredito}).`);
    }
    return motivos;
  }

  function calcularValorKm(tipoCarro, km) {
    const limite = KM_LIMITE[tipoCarro];
    const precoAte = KM_PRECO_ATE[tipoCarro];
    const precoAcima = KM_PRECO_ACIMA[tipoCarro];

    if (km <= limite) return km * precoAte;
    const excedente = km - limite;
    return (limite * precoAte) + (excedente * precoAcima);
  }

  function calcularValorDiaria(tipoCarro, dias) {
    const base = DIARIA[tipoCarro];
    let valor = base * dias;
    let desconto = 0;
    if (dias >= DIAS_PARA_DESCONTO) {
      desconto = valor * DESCONTO_LOCACAO_LONGA;
      valor -= desconto;
    }
    return { valor, desconto };
  }

  function calcularTaxaCombustivel(tipoCarro, tanqueCheio, fracaoRestante) {
    if (tanqueCheio) return { combustivel: 0, servico: 0 };
    const capacidade = CAPACIDADE_TANQUE[tipoCarro];
    const litrosFaltantes = capacidade * (1 - fracaoRestante);
    return {
      combustivel: litrosFaltantes * PRECO_LITRO_COMBUSTIVEL,
      servico: TAXA_SERVICO_REABASTECIMENTO
    };
  }

  function brl(valor) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ============================================================
  // RENDERIZAÇÃO DO RESULTADO
  // ============================================================
  function renderReprovado(motivos, nomeCliente) {
    const html = `
      <div class="result-sheet">
        <div class="stamp reprovado">Reprovado</div>
        <p class="result-title">Resultado da Análise${nomeCliente ? " — " + nomeCliente : ""}</p>
        <p class="result-sub">A locação não pôde ser aprovada pelos seguintes motivos:</p>
        <ul class="motivo-list">
          ${motivos.map(m => `<li>${m}</li>`).join("")}
        </ul>
      </div>
    `;
    return html;
  }

  function renderAprovado(dados) {
    const {
      nomeCliente, idade, anosCnh, categoriaCnh, scoreCredito, faixaCredito,
      tipoCarro, dias, km, incluirSeguro, tanqueCheio,
      valorDiarias, desconto, valorKm, valorSeguro,
      valorCombustivel, taxaServico, taxaRisco, valorTaxaRisco, total
    } = dados;

    let combustivelHtml;
    if (tanqueCheio) {
      combustivelHtml = `
        <div class="line-item muted">
          <span class="label">Combustível</span>
          <span class="value">Tanque devolvido cheio — sem custo</span>
        </div>`;
    } else {
      combustivelHtml = `
        <div class="line-item">
          <span class="label">Reabastecimento (combustível)</span>
          <span class="value">R$ ${brl(valorCombustivel)}</span>
        </div>
        <div class="line-item">
          <span class="label">Taxa de serviço (reabastecimento)</span>
          <span class="value">R$ ${brl(taxaServico)}</span>
        </div>`;
    }

    const html = `
      <div class="result-sheet">
        <div class="stamp aprovado">Aprovado</div>
        <p class="result-title">Resultado da Análise${nomeCliente ? " — " + nomeCliente : ""}</p>
        <p class="result-sub">Cliente elegível. Veja o detalhamento do valor abaixo.</p>

        <div class="meta-row">
          <span>Cliente: <b>${idade} anos</b></span>
          <span>CNH cat. <b>${categoriaCnh}</b> há <b>${anosCnh} ano(s)</b></span>
          <span>Crédito: <b>${scoreCredito} pts</b><span class="badge-credito ${faixaCredito}">${faixaCredito}</span></span>
        </div>

        <div class="meta-row">
          <span>Veículo: <b>${tipoCarro === "luxo" ? "Luxo" : "Popular"}</b></span>
          <span>Locação: <b>${dias} dia(s)</b></span>
          <span>Rodagem: <b>${km} km</b></span>
        </div>

        <div class="line-item">
          <span class="label">Diárias (sem desconto)</span>
          <span class="value">R$ ${brl(valorDiarias + desconto)}</span>
        </div>
        ${desconto > 0 ? `
        <div class="line-item">
          <span class="label">Desconto locação longa (10%)</span>
          <span class="value neg">− R$ ${brl(desconto)}</span>
        </div>` : ""}
        <div class="line-item">
          <span class="label">Quilometragem</span>
          <span class="value">R$ ${brl(valorKm)}</span>
        </div>
        ${incluirSeguro ? `
        <div class="line-item">
          <span class="label">Seguro diário (${dias} dia(s))</span>
          <span class="value">R$ ${brl(valorSeguro)}</span>
        </div>` : ""}
        ${combustivelHtml}
        ${taxaRisco > 0 ? `
        <div class="line-item">
          <span class="label">Taxa de risco de crédito (${(taxaRisco * 100).toFixed(0)}%)</span>
          <span class="value">R$ ${brl(valorTaxaRisco)}</span>
        </div>` : ""}

        <div class="divider-thick"></div>
        <div class="total-row">
          <span class="label">Valor total a pagar</span>
          <span class="value">R$ ${brl(total)}</span>
        </div>
      </div>
    `;
    return html;
  }

  // ============================================================
  // HANDLER PRINCIPAL
  // ============================================================
  document.getElementById("btnCalcular").addEventListener("click", () => {
    const nomeCliente = document.getElementById("nomeCliente").value.trim();
    const idade = parseInt(document.getElementById("idade").value);
    const anosCnh = parseInt(document.getElementById("anosCnh").value);
    const categoriaCnh = document.getElementById("categoriaCnh").value;
    const scoreCredito = parseInt(document.getElementById("scoreCredito").value);
    const dias = parseInt(document.getElementById("dias").value);
    const km = parseFloat(document.getElementById("km").value);

    // validação simples de campos obrigatórios
    const campos = [
      ["idade", idade], ["anosCnh", anosCnh], ["scoreCredito", scoreCredito],
      ["dias", dias], ["km", km]
    ];
    let primeiroInvalido = null;
    for (const [id, val] of campos) {
      if (isNaN(val) || val < 0) { primeiroInvalido = id; break; }
    }
    if (primeiroInvalido) {
      document.getElementById(primeiroInvalido).style.borderColor = "#B23A2E";
      document.getElementById(primeiroInvalido).focus();
      return;
    }

    const fracaoRestante = tanqueCheio ? 1.0 : (parseFloat(tankRange.value) / 100);

    const motivos = verificarElegibilidade({ idade, anosCnh, categoriaCnh, scoreCredito, tipoCarro });

    const resultWrap = document.getElementById("resultWrap");

    if (motivos.length > 0) {
      resultWrap.innerHTML = renderReprovado(motivos, nomeCliente);
    } else {
      const { nome: faixaCredito, taxa: taxaRisco } = obterFaixaCredito(scoreCredito);
      const { valor: valorDiarias, desconto } = calcularValorDiaria(tipoCarro, dias);
      const valorKm = calcularValorKm(tipoCarro, km);
      const valorSeguro = incluirSeguro ? TAXA_SEGURO_DIARIA * dias : 0;
      const { combustivel: valorCombustivel, servico: taxaServico } = calcularTaxaCombustivel(tipoCarro, tanqueCheio, fracaoRestante);

      const subtotal = valorDiarias + valorKm + valorSeguro + valorCombustivel + taxaServico;
      const valorTaxaRisco = subtotal * taxaRisco;
      const total = subtotal + valorTaxaRisco;

      resultWrap.innerHTML = renderAprovado({
        nomeCliente, idade, anosCnh, categoriaCnh, scoreCredito, faixaCredito,
        tipoCarro, dias, km, incluirSeguro, tanqueCheio,
        valorDiarias, desconto, valorKm, valorSeguro,
        valorCombustivel, taxaServico, taxaRisco, valorTaxaRisco, total
      });
    }

    resultWrap.classList.add("show");
    document.getElementById("btnImprimir").style.display = "inline-block";
    resultWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("btnImprimir").addEventListener("click", () => {
    window.print();
  });