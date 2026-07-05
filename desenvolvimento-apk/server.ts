/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { handleCriticalBcsAlert, testSmtpConnection } from './server/emailService';


dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body payload size limits to safely handle large bovine base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 1. Live feedback health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', datetime: new Date().toISOString() });
});

// 2. IA Insights API for herd summaries
app.post('/api/insights', async (req, res) => {
  const { totalAnimals, readyForSlaughter, underMonitoring } = req.body;

  const readyLabel = Number(readyForSlaughter || 0) > 0 ? 'com animais em avaliação' : 'sem registros destacados';
  const monitoringLabel = Number(underMonitoring || 0) > 0 ? 'alguns animais precisam de revisão' : 'nenhum registro urgente no momento';

  res.json({
    insight: `Resumo local: ${totalAnimals || 0} registros foram avaliados, ${readyForSlaughter || 0} com resultado favorável e ${underMonitoring || 0} em acompanhamento. O fluxo atual está ${readyLabel} e ${monitoringLabel}.`
  });
});

function get2026DateTimeLong(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[now.getMonth()];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day} ${month} 2026, ${hours}:${minutes}`;
}

// 3. Análise via modelos treinados: segmentação (recorte interno) + peso (Edge Impulse).
// Retorna só peso previsto e status (apto/não apto), calculado por threshold de peso.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const WEIGHT_THRESHOLD_KG = 380;

app.post('/api/analyze', async (req, res) => {
  const { imageBase64, earTag, clientDate } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
  }

  if (!earTag || !String(earTag).trim()) {
    return res.status(400).json({ error: 'Número do brinco é obrigatório.' });
  }

  const mimeMatch = /^data:(image\/\w+);base64,/.exec(imageBase64);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  try {
    const form = new FormData();
    form.append('file', new Blob([imageBuffer], { type: mimeType }), 'image.jpg');

    const mlRes = await fetch(`${ML_SERVICE_URL}/infer/analyze`, {
      method: 'POST',
      body: form,
    });

    if (!mlRes.ok) {
      throw new Error(`ml-service respondeu ${mlRes.status}`);
    }

    const { weight, animalDetected } = await mlRes.json();

    if (!animalDetected) {
      // Não inventa peso em cima de uma foto onde o boi nem foi localizado —
      // devolve 200 (pra não cair no fallback offline/fictício do front-end)
      // com um sinal claro de que não há resultado confiável.
      return res.json({
        animalDetected: false,
        message: 'Não foi possível identificar o animal com clareza nesta foto. Tente novamente com o animal melhor enquadrado, de lado, e com boa iluminação.',
      });
    }

    const predictedWeight = Number(weight);
    const verdict = predictedWeight >= WEIGHT_THRESHOLD_KG ? 'APTO PARA ABATE' : 'NÃO APTO';

    const record = {
      id: 'NP-' + Math.floor(1000 + Math.random() * 9000),
      animalId: String(earTag).trim(),
      photoUrl: imageBase64,
      date: clientDate || get2026DateTimeLong(),
      lot: '',
      weight: predictedWeight,
      verdict: verdict,
      animalDetected: animalDetected,
      // Campos abaixo não têm modelo próprio ainda (ver decisão do time). Mantidos com
      // valores neutros só pra não quebrar Dashboard/Relatórios/Histórico/Supabase, que
      // ainda esperam esses campos existirem. Não são estimativas — são placeholders vazios.
      breed: '',
      score: 1.0, // placeholder no mínimo permitido pela validação (schemas.ts exige 1.0–5.0); não é uma estimativa real
      fatProgress: 0,
      extractionFocus: '',
      landmarkPoints: [],
      aiConfidence: 0,
      notes: '',
    };

    // Alerta por e-mail (handleCriticalBcsAlert) desativado por enquanto: ele foi
    // construído em cima do score de condição corporal legado, que não existe mais
    // neste fluxo. Reativar exige adaptar o template do e-mail pro critério de peso
    // — decisão pendente.
    return res.json(record);
  } catch (error: any) {
    console.error('Erro ao chamar o ml-service:', error.message || error);
    return res.status(502).json({
      error: 'Falha ao processar a imagem no serviço de modelos (ml-service). Verifique se ele está rodando em ' + ML_SERVICE_URL + '.',
    });
  }
});

// 3b. Test SMTP Connection Live: Autheticates credentials and reports actual outcomes
app.post('/api/test-smtp', async (req, res) => {
  const { smtp, recipient } = req.body;
  if (!smtp) {
    return res.status(400).json({ error: 'Configuração SMTP não fornecida.' });
  }

  try {
    const result = await testSmtpConnection(smtp, recipient || 'veterinario@bovinovision.com');
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Falha de comunicação ou autenticação SMTP.'
    });
  }
});

// 4. BovinoVision support assistant
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const lastMessage = Array.isArray(messages) ? messages[messages.length - 1]?.text || '' : '';

  const response = lastMessage.toLowerCase().includes('peso')
    ? 'Para melhorar a estimativa de peso, use uma foto nítida da região traseira, com o animal bem enquadrado, boa iluminação e o brinco visível.'
    : lastMessage.toLowerCase().includes('brinco')
      ? 'Registre o número do brinco com precisão e confirme que o animal aparece inteiro na imagem para facilitar a identificação.'
      : lastMessage.toLowerCase().includes('histórico')
        ? 'O histórico fica organizado por data, brinco e peso estimado, o que ajuda na revisão rápida de avaliações anteriores.'
        : 'Estou aqui para orientar sobre identificação do animal, captura da foto, estimativa de peso e revisão do histórico.';

  res.json({ response });
});

// Configure Express and Vite Server Context
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded under dev environment.');
  } else {
    // Serve production packaged folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bovine server actively running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
