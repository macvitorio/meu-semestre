# Gera as páginas de guias (SEO). Rode: python3 guias/_gerar.py
import json, html, os

BASE = 'https://www.meusemestre.com.br'
DATA = '2026-11-15'
LOGO = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z" fill="#fff"/><path d="M6 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3z" fill="#ffc83d"/></svg>'

CALC_FALTAS = '''<div class="calc" id="calc-faltas"><h3>🧮 Calculadora de faltas</h3><div class="campos">
<div><label for="cf-ch">Carga horária (horas-aula)</label><input id="cf-ch" type="number" inputmode="numeric" value="72"></div>
<div><label for="cf-pm">Presença mínima (%)</label><input id="cf-pm" type="number" inputmode="numeric" value="75"></div>
<div><label for="cf-ft">Faltas que já tenho</label><input id="cf-ft" type="number" inputmode="numeric" value="0"></div></div>
<div class="res" id="cf-res" aria-live="polite"></div></div>
<script>(function(){function c(){var ch=+document.getElementById('cf-ch').value||0,pm=+document.getElementById('cf-pm').value||75,ft=+document.getElementById('cf-ft').value||0,m=Math.floor(ch*(1-pm/100)),r=m-ft;document.getElementById('cf-res').innerHTML=!ch?'Informe a carga horária.':r>=0?'Você ainda pode faltar<b>'+r+' aula'+(r===1?'':'s')+'</b>de '+m+' faltas permitidas no total.':'Você passou do limite em<b>'+(-r)+' falta'+(-r===1?'':'s')+'</b>Procure o professor ou a coordenação.';}['cf-ch','cf-pm','cf-ft'].forEach(function(i){document.getElementById(i).addEventListener('input',c)});c()})();</script>'''

CALC_MEDIA = '''<div class="calc" id="calc-media"><h3>🧮 Calculadora de média ponderada</h3><div class="campos">
<div><label for="cm-n1">Nota 1</label><input id="cm-n1" inputmode="decimal" value="7"></div><div><label for="cm-p1">Peso 1 (%)</label><input id="cm-p1" inputmode="decimal" value="35"></div>
<div><label for="cm-n2">Nota 2</label><input id="cm-n2" inputmode="decimal" value="5,5"></div><div><label for="cm-p2">Peso 2 (%)</label><input id="cm-p2" inputmode="decimal" value="35"></div>
<div><label for="cm-n3">Nota 3 (vazio = ainda não fiz)</label><input id="cm-n3" inputmode="decimal" value=""></div><div><label for="cm-p3">Peso 3 (%)</label><input id="cm-p3" inputmode="decimal" value="30"></div>
<div><label for="cm-ma">Média para aprovar</label><input id="cm-ma" inputmode="decimal" value="6"></div></div>
<div class="res" id="cm-res" aria-live="polite"></div></div>
<script>(function(){var n=function(id){var v=document.getElementById(id).value.replace(',','.');return v===''?null:parseFloat(v)};var f=function(x){return x.toFixed(1).replace('.',',')};function c(){var s=0,w=0,wr=0;for(var i=1;i<=3;i++){var nota=n('cm-n'+i),p=n('cm-p'+i)||0;if(nota==null)wr+=p;else{s+=nota*p;w+=p}}var ma=n('cm-ma')||6,tot=w+wr,el=document.getElementById('cm-res');if(!tot){el.textContent='Preencha os pesos.';return}if(!wr){var m=s/tot;el.innerHTML='Sua média final é<b>'+f(m)+'</b>'+(m>=ma?'Aprovado(a) 🎉':'Abaixo de '+f(ma)+': confira a regra de recuperação.');return}var precisa=(ma*tot-s)/wr;el.innerHTML='Para fechar com '+f(ma)+', você precisa tirar<b>'+(precisa<=0?'qualquer nota 🎉':precisa>10?'mais de 10 😬':f(precisa))+'</b>na avaliação que falta (média parcial: '+(w?f(s/w):'—')+').'}['cm-n1','cm-p1','cm-n2','cm-p2','cm-n3','cm-p3','cm-ma'].forEach(function(i){document.getElementById(i).addEventListener('input',c)});c()})();</script>'''

CALC_CR = '''<div class="calc" id="calc-cr"><h3>🧮 Calculadora de CR / IRA</h3><p style="margin:0 0 12px;opacity:.9;font-size:15px">Preencha a nota final e os créditos (ou a carga horária) de cada disciplina.</p><div id="cr-linhas" class="campos" style="grid-template-columns:1fr 1fr"></div>
<button type="button" id="cr-add" style="margin-top:12px;background:#fff;color:#4f46e5;border:0;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer">+ Disciplina</button>
<div class="res" id="cr-res" aria-live="polite"></div></div>
<script>(function(){var L=document.getElementById('cr-linhas'),ini=[[8.5,4],[6,4],[9,2],[7,6]];function add(n,c){L.insertAdjacentHTML('beforeend','<div><label>Nota final</label><input class="cr-n" inputmode="decimal" value="'+(n==null?'':n)+'"></div><div><label>Créditos ou horas</label><input class="cr-c" inputmode="decimal" value="'+(c==null?'':c)+'"></div>');}ini.forEach(function(x){add(x[0],x[1])});function v(e){var t=e.value.replace(',','.');return t===''?null:parseFloat(t)}function c(){var ns=L.querySelectorAll('.cr-n'),cs=L.querySelectorAll('.cr-c'),s=0,t=0;for(var i=0;i<ns.length;i++){var n=v(ns[i]),k=v(cs[i]);if(n!=null&&k){s+=n*k;t+=k}}document.getElementById('cr-res').innerHTML=t?'Seu CR/IRA estimado é<b>'+(s/t).toFixed(2).replace('.',',')+'</b>com base em '+t+' créditos/horas.':'Preencha pelo menos uma disciplina.'}L.addEventListener('input',c);document.getElementById('cr-add').onclick=function(){add(null,null);c()};c()})();</script>'''

GUIAS = [
dict(slug='quantas-faltas-posso-ter', emo='✅', tag='Frequência',
 title='Quantas faltas posso ter na faculdade? Calculadora e regra dos 75%',
 desc='Descubra quantas faltas você pode ter na faculdade: a regra dos 75% de presença, como calcular pela carga horária, exemplos prontos e calculadora grátis.',
 h1='Quantas faltas posso ter na faculdade?',
 lead='A conta é mais simples do que parece, mas um erro nela pode custar uma reprovação. Veja a regra, exemplos e calcule as suas faltas agora.',
 resposta='Na maioria das faculdades você precisa de <b>75% de presença</b>, então pode faltar até <b>25% das aulas</b> de cada disciplina. Em uma matéria de 72 horas-aula, isso dá <b>18 faltas</b>; em uma de 36 horas-aula, <b>9 faltas</b>.',
 calc='faltas',
 corpo='''<h2>Por que existe o limite de 75%?</h2>
<p>No ensino superior brasileiro, a Lei de Diretrizes e Bases da Educação (LDB) torna a frequência obrigatória. Quem define o mínimo exigido é cada instituição, no seu regimento, e a grande maioria adota <b>75% de presença</b>. Quem fica abaixo disso costuma ser reprovado por frequência, mesmo com notas altas.</p>
<div class="dica">💡 Confira o regimento ou o plano de ensino da sua disciplina: alguns cursos e atividades práticas (como estágios e laboratórios) podem exigir presença maior.</div>
<h2>Como calcular quantas faltas você pode ter</h2>
<ol><li>Descubra a <b>carga horária</b> da disciplina em horas-aula (está no plano de ensino ou no portal da faculdade).</li><li>Multiplique por <b>0,25</b> (ou por 1 menos a presença mínima da sua faculdade).</li><li>Arredonde para baixo: esse é o número máximo de faltas.</li></ol>
<p>Lembre que, na maioria das faculdades, <b>cada aula de 50 minutos conta como uma falta</b>. Se a disciplina tem duas aulas seguidas no mesmo dia e você não vai, são <b>duas faltas</b>, não uma.</p>
<div class="tab-wrap"><table><tr><th>Carga horária</th><th>Faltas permitidas (75%)</th><th>Faltas permitidas (70%)</th></tr>
<tr><td>36 h/a</td><td>9</td><td>10</td></tr><tr><td>54 h/a</td><td>13</td><td>16</td></tr><tr><td>72 h/a</td><td>18</td><td>21</td></tr><tr><td>90 h/a</td><td>22</td><td>27</td></tr><tr><td>108 h/a</td><td>27</td><td>32</td></tr></table></div>
<h2>Faltas podem ser abonadas?</h2>
<p>Em geral, falta não é "abonada": ela continua contando no limite de 25%. Existem, porém, situações previstas em lei em que o aluno pode ter um <b>regime especial</b>, com atividades feitas em casa no lugar das aulas, como em casos de saúde que impedem a presença ou de gestação. Cada faculdade tem um procedimento próprio, normalmente com prazo para apresentar documentos. Procure a coordenação do curso assim que precisar.</p>
<div class="alerta">⚠️ Atestado médico, na maioria das faculdades, <b>não apaga a falta</b>: ele serve para pedir regime especial ou segunda chamada de prova. Não conte com ele para "zerar" o limite.</div>
<h2>Dicas para não estourar o limite</h2>
<ul><li>Registre cada falta no dia em que ela acontece. Contar de cabeça no fim do semestre é a receita do susto.</li><li>Guarde suas faltas "de reserva" para imprevistos, não gaste tudo no começo.</li><li>Fique de olho em feriados e aulas canceladas: elas não deveriam contar como falta, mas mudam o total de aulas.</li><li>Use um app que avise quando você estiver perto do limite.</li></ul>''',
 faq=[('Uma aula dupla conta como uma ou duas faltas?','Normalmente como duas: cada aula de 50 minutos é uma hora-aula. Se você perde um dia com duas aulas seguidas, ficam duas faltas.'),
      ('Quantas faltas posso ter em uma matéria de 60 horas?','Com presença mínima de 75%, até 15 faltas (60 × 0,25).'),
      ('Atestado médico abona falta na faculdade?','Na maioria das faculdades não. Ele permite pedir regime especial ou segunda chamada, conforme o regimento da instituição.')]),

dict(slug='como-calcular-media-faculdade', emo='📝', tag='Notas',
 title='Como calcular a média da faculdade (com pesos) e quanto preciso tirar',
 desc='Aprenda a calcular a média da faculdade com e sem pesos, descubra quanto precisa tirar na próxima prova para passar e use a calculadora grátis.',
 h1='Como calcular a média da faculdade',
 lead='Média simples, média ponderada, nota mínima na próxima prova: entenda de uma vez e faça a conta em segundos.',
 resposta='Para a <b>média ponderada</b>, multiplique cada nota pelo seu peso, some os resultados e divida pela soma dos pesos. Exemplo: provas com 7 (peso 35%), 5,5 (peso 35%) e trabalho 8 (peso 30%) dão média <b>6,8</b>.',
 calc='media',
 corpo='''<h2>Média simples x média ponderada</h2>
<p>Na <b>média simples</b>, todas as avaliações valem o mesmo: some as notas e divida pela quantidade. Na <b>média ponderada</b>, cada avaliação tem um peso diferente, o que é o mais comum na faculdade (por exemplo, provas valendo mais que trabalhos).</p>
<h3>Exemplo de média ponderada</h3>
<div class="tab-wrap"><table><tr><th>Avaliação</th><th>Nota</th><th>Peso</th><th>Nota × peso</th></tr>
<tr><td>Prova 1</td><td>7,0</td><td>35%</td><td>2,45</td></tr><tr><td>Prova 2</td><td>5,5</td><td>35%</td><td>1,93</td></tr><tr><td>Trabalho</td><td>8,0</td><td>30%</td><td>2,40</td></tr><tr><td colspan="3"><b>Média</b></td><td><b>6,78</b></td></tr></table></div>
<p>Como os pesos somam 100%, basta somar a última coluna. Se os pesos forem números como 2, 3 e 5, divida a soma pelo total dos pesos (10).</p>
<h2>Quanto preciso tirar na próxima prova?</h2>
<p>Use a fórmula: <b>nota necessária = (média para aprovar × soma de todos os pesos − pontos que você já tem) ÷ peso da avaliação que falta</b>.</p>
<p>No exemplo acima, sem o trabalho: você tem 2,45 + 1,93 = 4,38 pontos. Para fechar com 6,0 precisa de 6,0 − 4,38 = 1,62 ponto no trabalho, que vale 30%. Então precisa tirar <b>5,4</b> no trabalho.</p>
<div class="dica">💡 A calculadora acima faz isso para você: deixe vazia a nota da avaliação que ainda não fez.</div>
<h2>E a recuperação?</h2>
<p>Muitas faculdades oferecem recuperação (ou exame final) para quem fica com média entre um mínimo e a nota de aprovação, por exemplo entre 3,0 e 5,9. Uma regra comum é <b>média final = (média do semestre + nota da recuperação) ÷ 2</b>. Veja o guia completo sobre <a href="/guias/recuperacao-faculdade">como funciona a recuperação</a>.</p>
<h2>Cuidados para não errar a conta</h2>
<ul><li>Confira os pesos no plano de ensino, não no "acho que era assim".</li><li>Veja se a faculdade arredonda a média (por exemplo, para 0,5) e em qual direção.</li><li>Lembre que, mesmo com média alta, você reprova se passar do limite de faltas.</li></ul>''',
 faq=[('Qual a média para passar na faculdade?','Depende da instituição: as mais comuns são 6,0 e 7,0, e algumas usam 5,0. Confira o regimento ou o plano de ensino.'),
      ('Como calcular média com pesos 2, 3 e 5?','Multiplique cada nota pelo peso, some e divida por 10 (a soma 2 + 3 + 5).'),
      ('Média 5,9 arredonda para 6?','Só se o regimento da faculdade prever arredondamento. Muitas instituições não arredondam ou arredondam apenas para múltiplos de 0,5.')]),

dict(slug='recuperacao-faculdade', emo='🔁', tag='Notas',
 title='Recuperação na faculdade: como funciona e quanto preciso tirar',
 desc='Entenda como funciona a recuperação (exame final) na faculdade, quem tem direito, como é calculada a média final e quanto você precisa tirar para passar.',
 h1='Recuperação na faculdade: como funciona',
 lead='Ficou com a média abaixo do necessário? Ainda dá. Veja quem tem direito, como a nota final é calculada e quanto você precisa tirar.',
 resposta='Na regra mais comum, tem direito à recuperação quem fica com média entre <b>3,0 e a nota de aprovação</b> (por exemplo, 5,9) e com <b>presença suficiente</b>. A média final costuma ser <b>(média do semestre + nota da recuperação) ÷ 2</b>, e é preciso chegar à média de aprovação.',
 calc=None,
 corpo='''<h2>Quem tem direito à recuperação?</h2>
<p>As regras variam entre faculdades, mas o padrão mais usado é:</p>
<ul><li><b>Média do semestre</b> igual ou acima de um mínimo (geralmente 3,0) e abaixo da média de aprovação.</li><li><b>Frequência</b> igual ou acima do mínimo exigido (geralmente 75%). Quem reprova por falta normalmente <b>não</b> tem direito à recuperação.</li></ul>
<h2>Como é calculada a média final</h2>
<p>A fórmula mais comum é a média aritmética entre a média do semestre e a nota da recuperação:</p>
<div class="resposta" style="margin:16px 0">Média final = (média do semestre + recuperação) ÷ 2</div>
<h3>Quanto preciso tirar na recuperação?</h3>
<p>Isolando a nota da recuperação: <b>nota necessária = 2 × média de aprovação − média do semestre</b>.</p>
<div class="tab-wrap"><table><tr><th>Média do semestre</th><th>Precisa na REC (aprovação 6,0)</th><th>Precisa na REC (aprovação 7,0)</th></tr>
<tr><td>3,0</td><td>9,0</td><td>11,0 (impossível)</td></tr><tr><td>4,0</td><td>8,0</td><td>10,0</td></tr><tr><td>5,0</td><td>7,0</td><td>9,0</td></tr><tr><td>5,5</td><td>6,5</td><td>8,5</td></tr></table></div>
<div class="alerta">⚠️ Algumas faculdades usam outra regra (por exemplo, a recuperação substitui a menor nota, ou a média final precisa ser 5,0). Sempre confira o regimento.</div>
<h2>Como se preparar</h2>
<ul><li>A recuperação costuma cobrar <b>todo o conteúdo</b> do semestre: use o conteúdo programático do plano de ensino como roteiro.</li><li>Comece pelos tópicos em que você foi pior nas provas.</li><li>Faça as contas antes: se precisar de 9,0, vale conversar com o professor sobre o formato da prova.</li></ul>
<p>Quer evitar chegar lá? Veja <a href="/guias/como-calcular-media-faculdade">como calcular sua média ao longo do semestre</a> e saber cedo quanto precisa em cada prova.</p>''',
 faq=[('Quem reprovou por falta pode fazer recuperação?','Na maioria das faculdades não: a recuperação é só para quem tem frequência suficiente e média abaixo da aprovação.'),
      ('Quanto preciso tirar na recuperação com média 4?','Com aprovação 6,0 e a regra (média + REC) ÷ 2, você precisa de 8,0.'),
      ('Recuperação substitui a nota?','Depende da faculdade. Em muitas, a nota da recuperação entra numa média com a do semestre; em outras, substitui a menor nota.')]),

dict(slug='como-organizar-semestre-faculdade', emo='🗂️', tag='Organização',
 title='Como organizar o semestre da faculdade: guia passo a passo',
 desc='Guia prático para organizar o semestre da faculdade: plano de ensino, grade horária, calendário de provas, controle de faltas e rotina de estudos.',
 h1='Como organizar o semestre da faculdade',
 lead='Um semestre organizado começa na primeira semana. Siga estes 6 passos e chegue nas provas sem susto.',
 resposta='Para organizar o semestre: <b>1)</b> leia o plano de ensino de cada disciplina, <b>2)</b> monte sua grade horária, <b>3)</b> anote todas as datas de provas e entregas, <b>4)</b> calcule o limite de faltas, <b>5)</b> transforme o conteúdo em lista de estudos e <b>6)</b> revise tudo uma vez por semana.',
 calc=None,
 corpo='''<h2>1. Leia o plano de ensino de cada disciplina</h2>
<p>O plano de ensino é o documento mais subestimado da faculdade. Nele estão a <b>carga horária</b>, os <b>horários</b>, o <b>conteúdo programático</b>, as <b>avaliações com pesos</b> e, muitas vezes, o <b>cronograma</b> com as datas. Baixe todos na primeira semana.</p>
<h2>2. Monte sua grade horária</h2>
<p>Coloque todas as aulas numa grade semanal com horário e sala. Ver a semana inteira ajuda a encontrar <b>janelas para estudar</b> e a planejar deslocamento, trabalho e estágio.</p>
<h2>3. Centralize as datas de provas e entregas</h2>
<p>Provas, trabalhos, seminários, feriados e o fim do semestre: tudo num único calendário. Datas espalhadas entre portal, grupo da turma e e-mail são a principal causa de "essa prova era hoje?".</p>
<h2>4. Calcule o limite de faltas de cada matéria</h2>
<p>Com a carga horária em mãos, calcule quantas faltas você pode ter (em geral 25%). Veja <a href="/guias/quantas-faltas-posso-ter">como calcular as faltas</a> e registre cada falta no dia.</p>
<h2>5. Transforme o conteúdo em lista de estudos</h2>
<p>Cada tópico do conteúdo programático vira um item de checklist. Marcar o que já revisou mostra seu progresso real e evita a maratona na véspera.</p>
<h2>6. Faça uma revisão semanal de 15 minutos</h2>
<ul><li>O que tem de prova ou entrega nas próximas duas semanas?</li><li>Em qual matéria estou com mais faltas?</li><li>Quanto preciso tirar nas próximas avaliações?</li></ul>
<div class="dica">💡 Fazer tudo isso à mão funciona, mas dá trabalho. O Meu Semestre lê o plano de ensino (PDF ou print) e monta grade, faltas permitidas, provas e lista de estudos automaticamente.</div>''',
 faq=[('O que é plano de ensino?','É o documento de cada disciplina com objetivos, conteúdo, carga horária, critérios de avaliação e, muitas vezes, o cronograma do semestre.'),
      ('Qual o melhor app para organizar a faculdade?','O ideal é um que reúna grade, faltas, notas e provas no mesmo lugar e funcione no celular. O Meu Semestre faz isso a partir do plano de ensino.')]),

dict(slug='grade-horaria-faculdade', emo='🗓️', tag='Organização',
 title='Como montar a grade horária da faculdade (e não se perder)',
 desc='Veja como montar sua grade horária da faculdade, entender os códigos de horário dos portais, encaixar estudos e evitar choques de horário.',
 h1='Como montar a grade horária da faculdade',
 lead='Grade bem montada é semana mais leve. Veja como transformar os horários do portal numa grade clara e encaixar seus estudos.',
 resposta='Para montar a grade horária, liste <b>dia, horário de início, número de aulas e sala</b> de cada disciplina, distribua numa tabela de segunda a sábado e destaque as <b>janelas livres</b> entre as aulas para estudar ou descansar.',
 calc=None,
 corpo='''<h2>Entendendo os horários do portal</h2>
<p>Muitos portais acadêmicos usam códigos compactos. Alguns exemplos comuns:</p>
<ul><li><b>2.1010-2</b>: segunda-feira (dia 2), começando às 10h10, com 2 aulas seguidas.</li><li><b>35T12</b> (formato tipo SIGAA): terças e quintas (3 e 5), turno da tarde, 1ª e 2ª aulas.</li><li><b>Segunda 08:20–10:00</b>: formato por extenso, o mais simples de ler.</li></ul>
<p>Na dúvida, o plano de ensino ou a secretaria do curso explicam o padrão da sua faculdade.</p>
<h2>Passo a passo</h2>
<ol><li>Liste todas as disciplinas com dia, horário, número de aulas e sala.</li><li>Monte uma tabela com os dias da semana nas colunas e os horários nas linhas.</li><li>Use uma cor por disciplina: o cérebro reconhece cor mais rápido que texto.</li><li>Marque as janelas entre aulas e decida o que fazer nelas (estudo, almoço, deslocamento).</li><li>Confira choques de horário antes do fim do período de ajuste de matrícula.</li></ol>
<h2>Dicas para uma grade mais leve</h2>
<ul><li>Evite três disciplinas pesadas no mesmo dia, quando puder escolher.</li><li>Use janelas curtas para revisar a aula que acabou de acontecer: 15 minutos ali economizam horas depois.</li><li>Deixe a grade sempre à mão, no celular, com sala e horário.</li></ul>
<div class="dica">💡 No Meu Semestre, a grade é montada sozinha a partir do plano de ensino, com cores por disciplina, e pode ser compartilhada como imagem no grupo da turma.</div>
<p>Depois de montar a grade, aproveite para <a href="/guias/como-organizar-semestre-faculdade">organizar o resto do semestre</a>.</p>''',
 faq=[('O que significa 2.1010-2 no horário?','Em portais como o da UFSC, é dia 2 (segunda-feira), início às 10h10 e 2 aulas seguidas.'),
      ('Como encaixar horário de estudo na grade?','Use as janelas entre as aulas para revisões curtas e reserve blocos fixos de 1 a 2 horas nos dias mais leves.')]),
dict(slug='cr-ira-como-calcular', emo='🎯', tag='Notas',
 title='O que é CR, IRA e IAA e como calcular (com calculadora)',
 desc='Entenda o que é CR, IRA, IAA e coeficiente de rendimento na faculdade, para que servem, como calcular com créditos ou carga horária e use a calculadora grátis.',
 h1='O que é CR/IRA e como calcular',
 lead='Coeficiente de rendimento, índice de rendimento acadêmico, IAA: o nome muda de faculdade para faculdade, mas a conta é parecida. Veja como funciona e calcule o seu.',
 resposta='CR (coeficiente de rendimento), IRA ou IAA é a <b>média das suas notas finais ponderada pelos créditos</b> (ou pela carga horária) de cada disciplina. Multiplique cada nota pelos créditos, some tudo e divida pelo total de créditos.',
 calc='cr',
 corpo=""" <h2>Para que serve o CR/IRA?</h2>
<p>O coeficiente resume seu desempenho acadêmico em um número. Ele costuma ser usado em:</p>
<ul><li><b>Bolsas</b> de iniciação científica, monitoria e extensão;</li><li><b>Intercâmbio</b> e mobilidade acadêmica;</li><li><b>Prioridade na matrícula</b> em algumas faculdades;</li><li><b>Estágios e programas de trainee</b>, que às vezes pedem um coeficiente mínimo.</li></ul>
<h2>Como calcular o CR/IRA</h2>
<ol><li>Pegue a <b>nota final</b> de cada disciplina cursada.</li><li>Multiplique pela quantidade de <b>créditos</b> (ou horas) da disciplina.</li><li>Some todos os resultados.</li><li>Divida pela <b>soma dos créditos</b>.</li></ol>
<div class="tab-wrap"><table><tr><th>Disciplina</th><th>Nota</th><th>Créditos</th><th>Nota × créditos</th></tr>
<tr><td>Cálculo I</td><td>8,5</td><td>4</td><td>34</td></tr><tr><td>Física I</td><td>6,0</td><td>4</td><td>24</td></tr><tr><td>Metodologia</td><td>9,0</td><td>2</td><td>18</td></tr><tr><td>Programação</td><td>7,0</td><td>6</td><td>42</td></tr>
<tr><td colspan="2"><b>Total</b></td><td><b>16</b></td><td><b>118</b></td></tr></table></div>
<p>CR = 118 ÷ 16 = <b>7,38</b>.</p>
<h2>Reprovações entram na conta?</h2>
<p>Depende da faculdade. Em muitas, <b>reprovações por nota e por falta entram</b> no cálculo (às vezes com nota zero para quem reprovou por frequência), e disciplinas trancadas ou validadas ficam de fora. Algumas instituições também diferenciam o coeficiente do semestre e o acumulado. Confira a regra no regimento ou na secretaria.</p>
<div class="alerta">⚠️ Reprovar por falta pode pesar mais do que uma nota baixa: em várias faculdades a disciplina entra com nota zero. Fique de olho no <a href="/guias/quantas-faltas-posso-ter">limite de faltas</a>.</div>
<h2>Como melhorar o CR</h2>
<ul><li>Priorize as disciplinas com <b>mais créditos</b>: elas pesam mais na média.</li><li>Evite reprovações por falta, que podem entrar como zero.</li><li>Acompanhe sua <a href="/guias/como-calcular-media-faculdade">média em cada matéria</a> durante o semestre, não só no final.</li></ul>""",
 faq=[('CR e IRA são a mesma coisa?','Na prática, sim: são nomes diferentes que cada faculdade dá ao coeficiente de rendimento. IAA, CRA e MGP também aparecem.'),
      ('Qual é um CR bom?','Depende do curso e da faculdade, mas muitas bolsas e programas pedem pelo menos 7,0.'),
      ('Disciplina trancada entra no CR?','Normalmente não. Trancamentos dentro do prazo costumam ficar fora do cálculo.')]),

dict(slug='trancamento-de-matricula', emo='⏸️', tag='Vida acadêmica',
 title='Trancamento de matrícula na faculdade: como funciona e quando vale a pena',
 desc='Entenda a diferença entre trancar uma disciplina e trancar a matrícula, prazos, efeitos no histórico, no CR e na bolsa, e o passo a passo para pedir.',
 h1='Trancamento de matrícula: como funciona',
 lead='Trancar pode salvar seu semestre ou complicar sua formatura. Entenda as opções e os cuidados antes de pedir.',
 resposta='Existem dois tipos: <b>trancar uma disciplina</b> (você sai só daquela matéria) e <b>trancar a matrícula</b> (você suspende o curso por um período). Os dois têm <b>prazo definido no calendário acadêmico</b> e regras próprias de cada faculdade, por isso o primeiro passo é consultar o calendário e a coordenação.',
 calc=None,
 corpo=""" <h2>Trancar disciplina x trancar matrícula</h2>
<div class="tab-wrap"><table><tr><th></th><th>Trancar disciplina</th><th>Trancar matrícula</th></tr>
<tr><td><b>O que acontece</b></td><td>Você deixa só aquela matéria</td><td>Você suspende o curso inteiro por um tempo</td></tr>
<tr><td><b>Quando</b></td><td>Até a data do calendário acadêmico</td><td>Em períodos definidos pela faculdade</td></tr>
<tr><td><b>Histórico</b></td><td>Costuma aparecer como trancada, sem nota</td><td>O período fica registrado como trancado</td></tr>
<tr><td><b>Limite</b></td><td>Algumas faculdades limitam quantas vezes</td><td>Costuma haver limite de semestres trancados</td></tr></table></div>
<h2>Quando pode valer a pena</h2>
<ul><li>Você já passou do limite de faltas ou não tem como alcançar a média, e a reprovação pesaria no seu coeficiente.</li><li>Problemas de saúde, trabalho ou família que impedem acompanhar o semestre.</li><li>Carga excessiva de disciplinas que está prejudicando todas as outras.</li></ul>
<h2>Cuidados antes de trancar</h2>
<ul><li><b>Pré-requisitos:</b> trancar uma disciplina pode atrasar outras que dependem dela.</li><li><b>Bolsas e financiamentos:</b> bolsa, auxílio estudantil ou financiamento estudantil podem exigir número mínimo de créditos por semestre. Consulte o órgão responsável antes.</li><li><b>Tempo máximo de curso:</b> semestres trancados podem contar ou não para o prazo de integralização.</li><li><b>Faculdades particulares:</b> veja no contrato como fica a mensalidade e se há multa ou prazo para aviso.</li></ul>
<div class="dica">💡 Antes de trancar por causa de faltas ou notas, faça as contas: às vezes ainda dá para passar. Use a <a href="/guias/quantas-faltas-posso-ter">calculadora de faltas</a> e a de <a href="/guias/como-calcular-media-faculdade">média</a>.</div>
<h2>Passo a passo para pedir</h2>
<ol><li>Confira o <b>prazo</b> no calendário acadêmico.</li><li>Veja no portal da faculdade se o pedido é online ou na secretaria.</li><li>Converse com a coordenação se tiver dúvida sobre pré-requisitos e formatura.</li><li>Guarde o <b>comprovante</b> do pedido.</li><li>Confira no portal se o trancamento foi registrado.</li></ol>""",
 faq=[('Trancar disciplina afeta o CR?','Normalmente não: disciplinas trancadas dentro do prazo costumam ficar fora do coeficiente. Confira a regra da sua faculdade.'),
      ('Perco a vaga se trancar a matrícula?','Não, desde que você respeite o limite de períodos trancados e faça a rematrícula no prazo.'),
      ('Posso trancar depois do prazo?','Em geral só em casos excepcionais, com justificativa e aprovação da coordenação.')]),

dict(slug='como-pedir-revisao-de-prova', emo='🔍', tag='Notas',
 title='Como pedir revisão de prova na faculdade (com modelo de pedido)',
 desc='Veja quando pedir revisão de prova na faculdade, prazos, como argumentar e um modelo de pedido de revisão de nota pronto para adaptar.',
 h1='Como pedir revisão de prova na faculdade',
 lead='Achou um erro na correção ou um critério que não ficou claro? Você pode pedir revisão. Veja como fazer do jeito certo.',
 resposta='Para pedir revisão de prova: <b>1)</b> veja a prova corrigida e o gabarito, <b>2)</b> confira o prazo no regimento (costuma ser de poucos dias após a divulgação da nota), <b>3)</b> converse primeiro com o professor e, se precisar, <b>4)</b> faça o pedido formal na secretaria ou no portal, explicando questão por questão o que deve ser revisto.',
 calc=None,
 corpo=""" <h2>Você tem direito de ver a prova corrigida</h2>
<p>Na maioria das faculdades, o aluno pode ver a prova corrigida e entender os critérios usados. É o primeiro passo antes de qualquer pedido.</p>
<h2>Quando vale pedir revisão</h2>
<ul><li>Erro de soma das notas das questões.</li><li>Questão correta corrigida como errada, ou com critério diferente de outros colegas.</li><li>Questão sem correção.</li><li>Conteúdo cobrado fora do que estava no plano de ensino.</li></ul>
<div class="alerta">⚠️ Revisão não é negociação de pontos. Pedidos genéricos ("acho que mereço mais") quase sempre são negados. Seja específico e objetivo.</div>
<h2>Passo a passo</h2>
<ol><li><b>Veja a prova e o gabarito</b> com calma e anote cada ponto que quer revisar.</li><li><b>Confira o prazo</b> no regimento ou no calendário: costuma ser curto, de poucos dias úteis após a nota.</li><li><b>Converse com o professor</b> com educação. Muitos erros se resolvem aqui.</li><li><b>Pedido formal:</b> se não resolver, protocole na secretaria, na coordenação ou no portal, com os argumentos por escrito.</li><li><b>Acompanhe</b> a resposta e guarde o protocolo.</li></ol>
<h2>Modelo de pedido de revisão</h2>
<div class="dica" style="font-size:16px;line-height:1.6">À Coordenação do Curso de [curso],<br><br>Eu, [nome], matrícula [número], aluno(a) da disciplina [nome e código], turma [turma], venho solicitar a revisão da avaliação [nome da avaliação], aplicada em [data], cuja nota foi divulgada em [data].<br><br>Solicito a revisão das seguintes questões:<br>• Questão [número]: [explique objetivamente por que a resposta deveria ser considerada correta, citando o gabarito, o material da disciplina ou o critério usado].<br>• Questão [número]: [idem].<br><br>Peço que a avaliação seja revista conforme os critérios apresentados.<br><br>[Cidade], [data].<br>[Assinatura]</div>
<h2>Dicas para aumentar as chances</h2>
<ul><li>Use o material da própria disciplina (slides, livro indicado, gabarito) como argumento.</li><li>Mantenha um tom respeitoso: o objetivo é corrigir um erro, não acusar.</li><li>Depois da revisão, atualize sua nota e veja <a href="/guias/como-calcular-media-faculdade">quanto ainda precisa</a> nas próximas avaliações.</li></ul>""",
 faq=[('Qual o prazo para pedir revisão de prova?','Cada faculdade define o seu, normalmente poucos dias úteis após a divulgação da nota. Confira no regimento ou no calendário acadêmico.'),
      ('A nota pode diminuir na revisão?','Em algumas faculdades sim, porque a prova inteira é corrigida de novo. Confira a regra antes de pedir.'),
      ('Preciso falar com o professor antes?','Não é obrigatório em todas as faculdades, mas costuma resolver mais rápido e é bem-visto.')]),

dict(slug='como-estudar-para-prova-faculdade', emo='🧠', tag='Estudos',
 title='Como estudar para prova da faculdade: método em 7 passos',
 desc='Aprenda a estudar para provas da faculdade com técnicas que funcionam: prática de recuperação, revisão espaçada, cronograma reverso e simulados.',
 h1='Como estudar para prova da faculdade',
 lead='Ler e grifar dá a sensação de estudo, mas rende pouco. Veja um método em 7 passos baseado nas técnicas que a pesquisa em aprendizagem mais recomenda.',
 resposta='As técnicas mais eficazes são <b>praticar lembrar o conteúdo</b> (exercícios e perguntas sem consultar), <b>espalhar as revisões</b> ao longo dos dias em vez de estudar tudo na véspera e <b>fazer simulados</b> no formato da prova. Comece pelo conteúdo programático e monte um cronograma de trás para frente a partir da data da prova.',
 calc=None,
 corpo=""" <h2>1. Descubra exatamente o que cai</h2>
<p>Use o <b>conteúdo programático</b> do plano de ensino e o que o professor disse em aula. Transforme em uma lista de tópicos: é o seu checklist.</p>
<h2>2. Faça um cronograma reverso</h2>
<p>Parta da data da prova e volte no calendário: distribua os tópicos pelos dias disponíveis e reserve os dois últimos dias para revisão e simulado.</p>
<div class="tab-wrap"><table><tr><th>Quando</th><th>O que fazer</th></tr><tr><td>2 semanas antes</td><td>Primeira passada em todos os tópicos, com exercícios</td></tr><tr><td>1 semana antes</td><td>Revisão dos tópicos difíceis</td></tr><tr><td>3 dias antes</td><td>Simulado no formato da prova</td></tr><tr><td>Véspera</td><td>Revisão leve dos erros do simulado e sono</td></tr></table></div>
<h2>3. Pratique lembrar, não só reler</h2>
<p>Feche o material e tente explicar o tópico, resolver exercícios ou responder perguntas. Esse esforço de lembrar (prática de recuperação) fixa muito mais do que reler ou grifar.</p>
<h2>4. Espalhe as revisões</h2>
<p>Estudar o mesmo tópico em dias diferentes (revisão espaçada) rende mais do que uma maratona na véspera. Revisões curtas e frequentes vencem uma sessão longa.</p>
<h2>5. Faça exercícios e provas antigas</h2>
<p>Se o professor disponibiliza provas anteriores ou listas, elas mostram o estilo de cobrança. Resolva no tempo da prova.</p>
<h2>6. Estude em blocos com pausas</h2>
<p>Blocos de 25 a 50 minutos com pausas curtas ajudam a manter a concentração. Deixe o celular longe, exceto para o cronômetro.</p>
<h2>7. Durma antes da prova</h2>
<p>O sono ajuda a consolidar o que você estudou. Virar a noite costuma piorar o desempenho.</p>
<div class="dica">💡 No Meu Semestre, o conteúdo programático vira uma lista de estudos com progresso, e as datas das provas aparecem com antecedência na agenda e nos lembretes.</div>
<p>Antes de estudar, vale saber <a href="/guias/como-calcular-media-faculdade">quanto você precisa tirar</a> para focar no que mais pesa.</p>""",
 faq=[('Quantas horas por dia devo estudar para a prova?','Depende da matéria e do quanto você já sabe, mas sessões diárias de 1 a 2 horas, com revisões espaçadas, costumam render mais que muitas horas na véspera.'),
      ('Fazer resumo funciona?','Funciona melhor quando você escreve sem copiar do material, tentando lembrar. Copiar trechos rende pouco.'),
      ('Vale a pena estudar de madrugada antes da prova?','Em geral não: perder sono prejudica a memória e a atenção no dia da prova.')]),
]

def cabeca(titulo, desc, url, extra_ld):
    return f'''<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(titulo)} | Meu Semestre</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#fffaf3"><link rel="icon" href="/icon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article"><meta property="og:site_name" content="Meu Semestre"><meta property="og:locale" content="pt_BR">
<meta property="og:url" content="{url}"><meta property="og:title" content="{html.escape(titulo)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{BASE}/og.png?v=4"><meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/guias/guia.css">
<script type="application/ld+json">{json.dumps(extra_ld, ensure_ascii=False)}</script>
</head><body>
<header><div class="w nav"><a class="logo" href="/"><img class="mark" src="/icon.svg" alt="">Meu Semestre</a><span class="sp"></span>
<nav class="links"><a href="/guias">Guias</a><a href="/#calculadora">Calculadora</a><a href="/#precos">Preços</a></nav><a class="btn pr" href="/app">Começar grátis</a></div></header>'''

RODAPE = f'''<footer><div class="w"><a class="logo" href="/"><img class="mark" src="/icon.svg" alt="" style="width:28px;height:28px;border-radius:8px">Meu Semestre</a>
<span>Projeto independente feito por estudantes, pra estudantes. Sem vínculo com nenhuma instituição de ensino.</span><span class="sp"></span>
<a href="/guias">Guias</a><a href="/marca">Marca</a><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a><a href="/app">Entrar</a></div></footer></body></html>'''

CTA = '''<div class="cta"><h3>Faça isso automaticamente 🚀</h3><p>Mande o plano de ensino e o Meu Semestre calcula faltas, médias e provas de todas as matérias. 30 dias de Premium grátis, sem cartão.</p><a class="btn" href="/app">Começar grátis →</a></div>'''

def pagina(g):
    url = f'{BASE}/guias/{g["slug"]}'
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": g['h1'], "description": g['desc'], "inLanguage": "pt-BR", "datePublished": DATA, "dateModified": DATA,
         "mainEntityOfPage": url, "image": f'{BASE}/og.png?v=4', "author": {"@type": "Organization", "name": "Meu Semestre", "url": BASE},
         "publisher": {"@type": "Organization", "name": "Meu Semestre", "logo": {"@type": "ImageObject", "url": f'{BASE}/icons/icon-512.png'}}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": BASE + '/'},
            {"@type": "ListItem", "position": 2, "name": "Guias", "item": BASE + '/guias'},
            {"@type": "ListItem", "position": 3, "name": g['h1'], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in g['faq']]}]}
    calc = {'faltas': CALC_FALTAS, 'media': CALC_MEDIA, 'cr': CALC_CR}.get(g['calc'], '')
    outros = ''.join(f'<li><a href="/guias/{o["slug"]}">{o["emo"]} {o["h1"]}</a></li>' for o in GUIAS if o is not g)
    faq = ''.join(f'<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in g['faq'])
    return cabeca(g['title'], g['desc'], url, ld) + f'''
<main class="w">
<p class="migalha"><a href="/">Início</a> › <a href="/guias">Guias</a> › {g['h1']}</p>
<div class="topo"><span class="tag">{g['emo']} {g['tag']}</span><h1>{g['h1']}</h1><p class="lead">{g['lead']}</p>
<div class="meta"><span>Atualizado em 15/11/2026</span><span>Leitura de 4 min</span></div></div>
<div class="grid"><article>
<div class="resposta"><b>Resposta rápida:</b> {g['resposta']}</div>
{calc}
{g['corpo']}
<h2>Perguntas frequentes</h2><div class="faq">{faq}</div>
{CTA}
</article>
<aside><div class="caixa"><h3>Outros guias</h3><ul>{outros}</ul><a class="btn pr" style="width:100%" href="/app">Testar grátis</a></div></aside></div>
</main>''' + RODAPE

def indice():
    url = f'{BASE}/guias'
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Guias para universitários", "url": url, "inLanguage": "pt-BR",
          "hasPart": [{"@type": "Article", "headline": g['h1'], "url": f'{BASE}/guias/{g["slug"]}'} for g in GUIAS]}
    cards = ''.join(f'<a class="card" href="/guias/{g["slug"]}"><span class="emo">{g["emo"]}</span><h2>{g["h1"]}</h2><p>{g["desc"]}</p></a>' for g in GUIAS)
    return cabeca('Guias para universitários: faltas, média, recuperação e organização', 'Guias práticos e calculadoras grátis para universitários: quantas faltas posso ter, como calcular a média, recuperação, grade horária e organização do semestre.', url, ld) + f'''
<main class="w"><p class="migalha"><a href="/">Início</a> › Guias</p>
<div class="topo"><span class="tag">📚 Guias</span><h1>Guias para universitários</h1><p class="lead">Respostas diretas para as dúvidas mais comuns da faculdade, com calculadoras grátis.</p></div>
<div class="cards">{cards}</div>{CTA}</main>''' + RODAPE

aqui = os.path.dirname(os.path.abspath(__file__))
for g in GUIAS:
    open(os.path.join(aqui, g['slug'] + '.html'), 'w').write(pagina(g))
open(os.path.join(aqui, 'index.html'), 'w').write(indice())
# sitemap
raiz = os.path.dirname(aqui)
urls = [('/', '1.0', 'weekly'), ('/guias', '0.8', 'weekly')] + [('/guias/' + g['slug'], '0.8', 'monthly') for g in GUIAS] + [('/marca', '0.4', 'monthly'), ('/privacidade', '0.3', 'yearly'), ('/termos', '0.3', 'yearly')]
open(os.path.join(raiz, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{BASE}{u}</loc><lastmod>{DATA}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority></url>\n' for u, p, c in urls) + '</urlset>\n')
print('ok', len(GUIAS), 'guias')
