# Rayvora Vision Pro — Sistema Inteligente de Estimativa de Peso Bovino

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/Python-3.12-blue.svg)
![React](https://img.shields.io/badge/React-18--Vite-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs)
![PWA](https://img.shields.io/badge/PWA-Suportado-orange?logo=pwa)
![Status: Em Desenvolvimento](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow.svg)

**Autores:** Ludivino José Da Silva, Lucas Teixeira e Pedro Omna  
**Disciplina:** Projeto Integrador I (2026.1) – Engenharia de Computação (UFSC)  

---

## Sobre o Projeto

O **Rayvora Vision Pro** é um ecossistema inteligente de pecuária de precisão focado na estimativa de peso de bovinos a partir de imagens. Desenvolvido como parte do Projeto Integrador da UFSC, o objetivo é oferecer ao produtor rural uma alternativa móvel, de baixo custo e não invasiva à pesagem mecânica tradicional, utilizando apenas a câmera de um smartphone e modelos avançados de **Machine Learning (TinyML)**.

Recentemente, a arquitetura do projeto evoluiu de um protótipo em Streamlit para uma aplicação robusta baseada em **Progressive Web App (PWA)** utilizando React e Vite. O sistema agora é dividido em:

1. **Frontend PWA (React + Vite + TypeScript):** Interface ágil, instalável no celular do produtor e otimizada para uso no campo.
2. **Serviço de IA Backend (`ml-service` em Python):** API assíncrona (FastAPI/Uvicorn) dedicada a carregar o motor de inferência LiteRT e executar a visão computacional.
3. **Persistência em Nuvem (Firebase/Supabase):** Sincronização de dados e autenticação de usuários estruturada para manter o histórico de medições em tempo real.

---

## Arquitetura e Pipeline de IA

O projeto segue um fluxo distribuído em módulos independentes:

```text
[ Celular / PWA ] ──(Foto do Bovino)──> [ Backend API:8001 ] ──> [ YOLOv8s-Seg ]
                                                                        │
[ Peso na Tela ] <──(Retorno KG + Erro) <── [ LiteRT / MobileNet ] <────┘

## Estrutura do Repositório Inicial

Projeto_Bois_IA/



├── src/



│   ├── app.py              # Aplicação principal (Streamlit) — Durante os Sprints



│   └── main.py              # Script auxiliar (em avaliação)



│



├── models/



│   ├── segmentation/         # Modelo YOLOv8 de segmentação do boi na imagem



│   ├── edge-impulse/         # Modelo de regressão em PRODUÇÃO (Transfer Learning, MAE 32.87 kg)



│   └── fine-tuning/          # Modelo experimental via Fine-Tuning (MAE 47.82 kg)



│



├── data/



│   └── dataset/              # Dataset de imagens + pesos reais (fora do Git, ver README da pasta)



│



├── external/



│   └── TCC_V2-master.zip     # Projeto de referência (TCC de outro grupo) usado como base do Fine-Tuning



│



├── requirements.txt



├── .gitignore



└── README.md

Módulo de Segmentação (YOLOv8): Antes da estimativa, a rede YOLOv8s-Seg isola o animal na imagem, removendo ruídos de fundo (pastagem, cercas).Módulo de Estimativa via Edge Impulse (Produção): Modelo de regressão (MobileNet) treinado via Transfer Learning, executado no backend. MAE atual: 32.87 kg.Módulo de Estimativa via Fine-Tuning (Experimental): Frente de pesquisa utilizando ajuste fino sobre dataset proprietário. MAE atual: 47.82 kg.FuncionalidadesCaptura Nativa e Upload: Otimizado para bater fotos diretamente do curral pelo navegador do celular.Instalação PWA: Adição à tela inicial do Android/iOS como um aplicativo nativo (ícone, modo tela cheia, service workers).Autenticação: Sistema de login seguro para controle de operadores da fazenda.Histórico Sincronizado: Avaliações salvas em banco de dados em tempo real (Firestore/Supabase).Análise de Evolução: Painéis e gráficos para acompanhar o Ganho
Médio Diário (GMD) de cada animal identificado.Estrutura do RepositórioAbaixo está a organização atual do código-fonte, contemplando tanto a stack web quanto a inteligência artificial:PlaintextBovinoVision_AI_System/
├── assets/                   # Imagens e recursos estáticos do projeto

├── dev-dist/ / dist/         # Builds de desenvolvimento e produção gerados pelo Vite

├── docs/                     # Documentação adicional do projeto

├── ml-service/               # 🧠 Backend Python (API de IA, Modelos LiteRT, YOLO)

├── public/                   # Arquivos públicos para o Frontend (ícones PWA, manifest)

├── src/                      # 💻 Frontend React (Componentes, Views, Estilos, Hooks)

├── server/                   # Utilitários do servidor customizado

├── scripts/                  # Scripts auxiliares para execução e deploy

├── supabase/                 # Configurações e schemas do banco de dados relacional

├── Protótipo das telas/      # Designs e mockups de interface

├── .env / .env.example       # Variáveis de ambiente

├── firebase-*.json           # Configurações do Firebase/Firestore

├── firestore.rules           # Regras de segurança do banco de dados

├── package.json              # Dependências do Node.js (React, Vite, etc.)

├── server.ts                 # Ponto de entrada do servidor Vite em modo dev/SSR

├── tsconfig.json             # Configuração do compilador TypeScript

├── vite.config.ts            # Configurações de build e plugins PWA do Vite

└── README.md

Requisitos de Hardware e SoftwareNode.js: Versão 18.x ou superior (para o Frontend React/Vite).Python: Versão 3.12+ (para o Backend ml-service).Smartphone/Navegador: Chrome (Android) ou Safari (iOS) atualizados.

Rede: Dispositivos na mesma rede Wi-Fi para testes locais.🛠️ Passo a Passo: Instalação e ConfiguraçãoComo a arquitetura agora é dividida, você precisará configurar o frontend e o backend em paralelo.

Passo 1: Clonar o repositórioAbra seu terminal e clone o projeto:Bashgit clone [https://github.com/seu-usuario/BovinoVision_AI_System.git](https://github.com/seu-usuario/BovinoVision_AI_System.git)
cd BovinoVision_AI_System

Passo 2: Configurar o Backend de Inteligência Artificial (ml-service)Este serviço em Python processa as imagens e calcula os pesos.Abra um terminal e acesse a pasta do serviço:Bashcd ml-service

Crie e ative um ambiente virtual:Bashpython -m venv venv

# No Windows:
venv\Scripts\activate

# No Linux/Mac:
source venv/bin/activate

Instale as dependências de IA:Bashpip install -r requirements.txt

Inicie o servidor FastAPI/Uvicorn na porta 8001:Bashuvicorn main:app --host 0.0.0.0 --port 8001

(Deixe este terminal aberto rodando em segundo plano).

Passo 3: Configurar o Frontend Web e PWA (React)Volte para a raiz do projeto (ou abra um segundo terminal na raiz
C:\BovinoVision_AI_System).Instale as dependências do Node.js:Bashnpm install

Configure as Variáveis de Ambiente:Copie o arquivo .env.example e renomeie para .env.Preencha com as chaves do Firebase/Supabase e defina a URL da API do backend local (ex: VITE_API_URL=http://<SEU_IP_AQUI>:8001).Inicie o servidor de desenvolvimento Vite (server.ts):Bashnpm run dev
O frontend estará acessível em http://localhost:3000.

Passo 4: Como Testar no Celular (Rede Local)Para usar a câmera do celular e testar o PWA na mesma rede Wi-Fi que o seu computador:Descubra o IP do PC: Abra um terminal e rode ipconfig (Windows). Anote o IPv4 (ex: 192.168.0.105).Libere o Firewall (Apenas Windows): Abra o PowerShell como Administrador e rode:PowerShellNew-NetFirewallRule -DisplayName "Rayvora Dev 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Rayvora Dev 8001" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow

Acesse no Smartphone: Abra o navegador e digite: http://SEU_IP:3000.Instale o App: Toque no menu do navegador e selecione "Adicionar à Tela Inicial".Modelos e MétricasMóduloTécnicaStatusErro Absoluto Médio (MAE)Edge ImpulseTransfer Learning (MobileNet)✅ Produção32.87 kgFine-TuningAjuste fino customizado (MobileNet)🧪 Experimental47.82 kgSegmentaçãoYOLOv8s-Seg✅ ValidadomAP50: 0.9948 / mAP50-95: 0.9735LicençaEste projeto está licenciado sob a MIT License. Veja o arquivo LICENSE para mais detalhes.
