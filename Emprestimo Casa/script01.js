let sistemaAmortizacao = 'Price';

// Sincroniza o painel simples com o complexo
function sincronizarEAtualizar() {
    const qCasa = document.getElementById('quick-val-casa').value;
    const qSalario = document.getElementById('quick-salario').value;
    const qPrazo = document.getElementById('quick-prazo').value;

    if (qCasa) {
        document.getElementById('val-imovel').value = qCasa;
        // Gera uma entrada padrão automática de 20% se o usuário mexer no valor
        document.getElementById('val-entrada').value = Math.round(parseFloat(qCasa) * 0.2);
    }
    if (qSalario) document.getElementById('sal-mensal').value = qSalario;
    if (qPrazo) document.getElementById('prazo-anos').value = qPrazo;

    calcularTudo();
}

function setSistema(sistema) {
    sistemaAmortizacao = sistema;
    document.getElementById('btn-price').classList.toggle('active', sistema === 'Price');
    document.getElementById('btn-sac').classList.toggle('active', sistema === 'SAC');
    calcularTudo();
}

function atualizarGeral(mudarEntradaProporcional = false) {
    const valImovel = parseFloat(document.getElementById('val-imovel').value) || 0;
    
    // Mantém a entrada fixa em 20% se mudar o valor global do imóvel principal
    if (mudarEntradaProporcional && valImovel > 0) {
        document.getElementById('val-entrada').value = Math.round(valImovel * 0.2);
    }
    calcularTudo();
}

function focarResultados() {
    document.getElementById('resultados-ancora').scrollIntoView({ behavior: 'smooth' });
}

function calcularTudo() {
    const valImovel = parseFloat(document.getElementById('val-imovel').value) || 0;
    const entrada = parseFloat(document.getElementById('val-entrada').value) || 0;
    const salario = parseFloat(document.getElementById('sal-mensal').value) || 1;
    const dividas = parseFloat(document.getElementById('outras-dividas').value) || 0;
    const taxaAnualBase = parseFloat(document.getElementById('taxa-anual').value) || 0;
    const prazoAnos = parseInt(document.getElementById('prazo-anos').value) || 1;
    const score = document.getElementById('score-credito').value;

    // Configurações do Score
    let ajusteScore = 0;
    let txtScore = "Score Bom ajusta a taxa em +0% a.a.";
    if (score === 'excelente') { ajuste = -0.25; txtScore = "Score Excelente reduz a taxa em -0.25% a.a. 🎉"; }
    if (score === 'regular') { ajuste = 1.0; txtScore = "Score Regular aumenta o risco: taxa +1.00% a.a."; }
    document.getElementById('text-banner-score').innerText = txtScore;

    const taxaAnualAjustada = taxaAnualBase + ajusteScore;
    const valorFinanciado = valImovel - entrada;
    const ltv = valImovel > 0 ? (valorFinanciado / valImovel) * 100 : 0;
    const prazoMeses = prazoAnos * 12;
    const taxaMensal = (taxaAnualAjustada / 100) / 12;
    
    const seguroMensal = 150.00; 
    const itbi = valImovel * 0.02;

    let prestacaoMensal = 0;
    let totalJuros = 0;
    let custoFinanc = 0;

    if (valorFinanciado > 0 && prazoMeses > 0) {
        if (sistemaAmortizacao === 'Price') {
            if (taxaMensal > 0) {
                const pmtBase = valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) / (Math.pow(1 + taxaMensal, prazoMeses) - 1);
                prestacaoMensal = pmtBase + seguroMensal;
                custoFinanc = pmtBase * prazoMeses;
                totalJuros = custoFinanc - valorFinanciado;
            }
        } else {
            const amortConstante = valorFinanciado / prazoMeses;
            prestacaoMensal = amortConstante + (valorFinanciado * taxaMensal) + seguroMensal;
            totalJuros = taxaMensal * valorFinanciado * (prazoMeses + 1) / 2;
            custoFinanc = valorFinanciado + totalJuros;
        }
    }

    const custoTotalComEntrada = custoFinanc + entrada + itbi;
    const limite30 = salario * 0.30;
    const comprometimento = ((prestacaoMensal + dividas) / salario) * 100;

    const formatar = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Render na Tela
    document.getElementById('res-financiado').innerText = formatar(valorFinanciado);
    document.getElementById('res-prestacao').innerText = formatar(prestacaoMensal);
    document.getElementById('res-limite').innerText = formatar(limite30);
    document.getElementById('res-juros').innerText = formatar(totalJuros);
    document.getElementById('res-custo-financ').innerText = formatar(custoFinanc);
    document.getElementById('res-itbi').innerText = formatar(itbi);
    document.getElementById('res-custo-total').innerText = formatar(custoTotalComEntrada);
    
    document.getElementById('res-taxa-mensal').innerText = (taxaMensal * 100).toFixed(1) + "%";
    document.getElementById('res-taxa-score').innerText = taxaAnualAjustada.toFixed(1) + "% a.a.";
    document.getElementById('res-ltv').innerText = ltv.toFixed(1) + "% / máx 80.0%";

    // Validações de Cores (CSS classes)
    document.getElementById('res-ltv').className = ltv > 80 ? "card-value value-red" : "card-value value-green";
    document.getElementById('res-prestacao').className = prestacaoMensal > limite30 ? "card-value value-red" : "card-value value-green";

    // Progress bar
    document.getElementById('text-comprometimento').innerText = comprometimento.toFixed(1) + "%";
    const barFill = document.getElementById('bar-comprometimento');
    barFill.style.width = Math.min(comprometimento, 100) + "%";
    barFill.style.backgroundColor = comprometimento > 30 ? 'var(--accent-red)' : 'var(--accent-orange)';
}

// Start
calcularTudo();