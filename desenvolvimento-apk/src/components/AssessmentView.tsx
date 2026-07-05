/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  FileCheck,
  Pencil,
  Printer,
  RotateCcw,
  Scale,
  Share2,
} from 'lucide-react';
import { CattleRecord, UserProfile } from '../types';

interface AssessmentViewProps {
  record?: CattleRecord;
  onSaveToHistory: (record: CattleRecord) => void;
  onClose: () => void;
  isSavedInDb: boolean;
  userProfile?: UserProfile;
}

export default function AssessmentView({
  record,
  onSaveToHistory,
  onClose,
  isSavedInDb,
  userProfile,
}: AssessmentViewProps) {
  const [layersMode, setLayersMode] = useState<0 | 1 | 2>(2);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [localWeight, setLocalWeight] = useState<number | null>(null);
  const [localIsRealWeight, setLocalIsRealWeight] = useState<boolean | null>(null);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [weightInputVal, setWeightInputVal] = useState('');

  useEffect(() => {
    setLocalWeight(null);
    setLocalIsRealWeight(null);
    setIsEditingWeight(false);
    setWeightInputVal('');
  }, [record?.id]);

  if (!record) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-center font-sans">
        <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
        <h3 className="mb-2 text-lg font-bold text-gray-900">Nenhum Bovino Selecionado</h3>
        <p className="mb-6 max-w-md text-sm text-gray-500">
          Selecione um registro para revisar o peso estimado e o veredito do animal.
        </p>
        <button
          onClick={onClose}
          className="h-10 rounded-md bg-[#1e3a8a] px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const currentWeight = localWeight ?? record.weight;
  const currentIsRealWeight = localIsRealWeight ?? !!record.isRealWeight;
  const displayAnimalId = record.animalId || record.id;

  const verdictStyle = {
    'APTO PARA ABATE': {
      bg: 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/25 dark:text-blue-100',
      verdictText: 'APTO PARA ABATE',
      desc: 'O animal atingiu a faixa esperada para o fluxo de registro e acompanhamento.',
      circleTheme: 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-sky-300',
      textTitleColor: 'text-[#1e3a8a] dark:text-sky-300',
      textDescColor: 'text-gray-600 dark:text-sky-200',
      systemLabelColor: 'text-[#1e3a8a] dark:text-sky-450',
    },
    'NÃO APTO': {
      bg: 'border-red-500 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-100',
      verdictText: 'NÃO APTO',
      desc: 'O animal ficou fora da faixa esperada e merece revisão do histórico.',
      circleTheme: 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400',
      textTitleColor: 'text-red-950 dark:text-red-300',
      textDescColor: 'text-gray-600 dark:text-red-200',
      systemLabelColor: 'text-red-800 dark:text-red-400',
    },
  }[record.verdict as 'APTO PARA ABATE' | 'NÃO APTO'] || {
    bg: 'border-red-500 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-100',
    verdictText: 'NÃO APTO',
    desc: 'Registro fora da faixa esperada.',
    circleTheme: 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400',
    textTitleColor: 'text-red-950 dark:text-red-300',
    textDescColor: 'text-gray-600 dark:text-red-200',
    systemLabelColor: 'text-red-800 dark:text-red-400',
  };

  const getWireframeLines = () => {
    if (!record.landmarkPoints || record.landmarkPoints.length < 2) return null;
    const sortedPoints = [...record.landmarkPoints].sort((a, b) => a.x - b.x);
    const elements: Array<JSX.Element> = [];

    elements.push(
      <polyline
        key="spine"
        points={sortedPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#4cf5a6"
        strokeWidth="1.2"
        strokeDasharray="1.5,1.5"
        className="animate-pulse"
      />,
    );

    const upperPoints = record.landmarkPoints.filter((p) => p.y <= 45);
    const lowerPoints = record.landmarkPoints.filter((p) => p.y > 45);

    upperPoints.forEach((up, uIdx) => {
      lowerPoints.forEach((low, lIdx) => {
        if (Math.abs(up.x - low.x) < 25) {
          elements.push(
            <line
              key={`rib-${uIdx}-${lIdx}`}
              x1={up.x}
              y1={up.y}
              x2={low.x}
              y2={low.y}
              stroke="#aeeecb"
              strokeWidth="0.8"
              strokeDasharray="2,2"
              opacity="0.8"
            />,
          );
        }
      });
    });

    return (
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {elements}
      </svg>
    );
  };

  const handleShare = async () => {
    const text = `BovinoVision AI - Brinco #${displayAnimalId}\nPeso estimado: ${currentWeight.toFixed(1)} kg\nStatus: ${record.verdict}`;
    const shareData = { title: `BovinoVision AI: Brinco #${displayAnimalId}`, text };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShowSharePopup(true);
      setTimeout(() => setShowSharePopup(false), 2200);
    } catch (e) {
      console.warn('Share fallback failed', e);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      window.print();
    } catch (e) {
      console.warn('Print failed', e);
    }
    setTimeout(() => setIsPrinting(false), 600);
  };

  return (
    <div id={`assessment-view-${record.id}`} className="space-y-6 animate-fade-in print:bg-white print:p-0 print:space-y-4">
      <div className="hidden border-b border-gray-400 pb-4 text-center print:block">
        <h1 className="font-serif text-2xl font-black text-gray-900">BovinoVision AI</h1>
        <p className="text-xs font-mono uppercase text-gray-500">REGISTRO DE AVALIAÇÃO - BRINCO #{displayAnimalId}</p>
        <div className="mt-1 text-[10px] font-mono text-gray-400">
          Data: {record.date} | Responsável: {userProfile?.name || 'Dr. Pedro Almeida'}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-[#aeeecb]"
          >
            ← Voltar para a lista
          </button>
          <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
            <span>Identificador Único:</span>
            <span className="font-bold text-[#1e3a8a] dark:text-sky-400">Brinco #{displayAnimalId}</span>
          </div>
        </div>
        <span className="inline-flex rounded px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
          ✓ PROCESSADO
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.03)] dark:border-gray-800 dark:bg-[#0e1320] lg:col-span-7 print:col-span-12 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-gray-950 dark:text-white">Resultado da Análise</h2>
            <div className="text-xs font-mono text-gray-400 dark:text-gray-500">
              Brinco: <span className="font-bold text-gray-900 dark:text-gray-100">{displayAnimalId}</span>
            </div>
          </div>

          <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-black shadow-inner">
            <div className="relative h-full w-full origin-center transition-transform duration-300" style={{ transform: `scale(${zoomLevel})` }}>
              <img
                src={record.photoUrl}
                alt="Análise Multimodal"
                className="h-full w-full object-cover object-[center_35%]"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(14,81,56,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,81,56,0.03)_1px,transparent_1px)] bg-[size:16px_16px]" />
              {layersMode === 2 && getWireframeLines()}
              {(layersMode === 1 || layersMode === 2) &&
                record.landmarkPoints?.map((p, idx) => {
                  const theme = p.type === 'skeleton'
                    ? 'bg-amber-500 ring-amber-300'
                    : p.type === 'fat'
                      ? 'bg-emerald-500 ring-emerald-300'
                      : 'bg-blue-500 ring-blue-300';
                  return (
                    <div key={idx} className="absolute group/point" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className={`relative z-10 h-3.5 w-3.5 animate-pulse rounded-full ${theme} ring-4 ring-offset-0 ring-opacity-40 cursor-help`} />
                      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded border border-gray-750 bg-black/90 px-2 py-0.5 text-[10px] font-mono whitespace-nowrap text-white shadow-lg opacity-100 transition-all scale-100">
                        {p.label}
                      </div>
                    </div>
                  );
                })}
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 animate-bounce bg-gradient-to-r from-transparent via-blue-400/40 to-transparent shadow-[0_0_10px_#3b82f6]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 print:hidden">
            <button
              id="assessment-btn-toggle-layers"
              onClick={() => setLayersMode((prev) => (prev === 2 ? 1 : prev === 1 ? 0 : 2))}
              className={`flex h-10 items-center justify-center gap-1.5 rounded border text-xs font-mono font-bold transition-all ${
                layersMode === 2
                  ? 'border-blue-900 bg-[#1e3a8a] text-white dark:border-blue-950 dark:bg-blue-800'
                  : layersMode === 1
                    ? 'border-blue-200 bg-blue-50 text-[#1e3a8a] dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-sky-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{layersMode === 2 ? 'Modo: Esqueleto' : layersMode === 1 ? 'Modo: Marcadores' : 'Fotos Limpas'}</span>
            </button>

            <button
              id="assessment-btn-zoom-anatomico"
              onClick={() => setZoomLevel((z) => (z === 1.3 ? 1.6 : z === 1.6 ? 1 : 1.3))}
              className="flex h-10 items-center justify-center gap-1.5 rounded border border-gray-200 bg-white text-xs font-mono font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Zoom: {zoomLevel === 1 ? '1x' : zoomLevel === 1.3 ? '1.3x' : '1.6x'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5 print:col-span-12">
          <div className={`flex flex-col items-center justify-center overflow-hidden rounded-lg border-2 p-6 text-center shadow-md ${verdictStyle.bg}`}>
            <span className={`mb-4 block text-[10px] font-mono font-bold uppercase tracking-widest ${verdictStyle.systemLabelColor}`}>
              Veredito do Sistema
            </span>
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-md dark:border-slate-800 ${verdictStyle.circleTheme}`}>
              <CheckCircle className="h-9 w-9 shrink-0" />
            </div>
            <h3 className={`mb-2 text-2xl font-black leading-none tracking-tight ${verdictStyle.textTitleColor}`}>
              {verdictStyle.verdictText}
            </h3>
            <p className={`mt-2 max-w-sm text-xs font-medium ${verdictStyle.textDescColor}`}>
              {record.notes || verdictStyle.desc}
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.03)] dark:border-gray-800 dark:bg-[#0e1320]">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Métricas Extraídas
            </h4>

            <div className="flex flex-col justify-between gap-2 border-b border-gray-100 py-3 dark:border-gray-800 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <Scale className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold leading-none text-gray-900 dark:text-gray-100">
                    {currentIsRealWeight ? (
                      <>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Peso de Balança</span>
                        <span id="label-verified-scale" className="rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-mono font-black uppercase text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Confirmado
                        </span>
                      </>
                    ) : (
                      <span>Volume Estimado</span>
                    )}
                  </div>
                  <span className="mt-1 inline-block text-[10px] font-mono text-gray-400 dark:text-gray-500">
                    {currentIsRealWeight ? 'Massa física aferida na balança da fazenda' : 'Massa Corporal Estimada por Visão Computacional'}
                  </span>
                </div>
              </div>

              {isEditingWeight ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="100"
                    max="1000"
                    step="0.1"
                    value={weightInputVal}
                    onChange={(e) => setWeightInputVal(e.target.value)}
                    placeholder={currentWeight.toFixed(1)}
                    className="h-8 w-24 rounded border border-emerald-500 bg-white px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-emerald-600 dark:bg-gray-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(weightInputVal);
                      if (!isNaN(val) && val > 0) {
                        setLocalWeight(val);
                        setLocalIsRealWeight(true);
                        setIsEditingWeight(false);
                      } else {
                        setIsEditingWeight(false);
                      }
                    }}
                    className="h-8 rounded bg-emerald-600 px-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                    title="Confirmar peso de balança"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingWeight(false)}
                    className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-450"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-right font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {currentWeight.toFixed(1)} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWeightInputVal(currentWeight.toFixed(1));
                      setIsEditingWeight(true);
                    }}
                    className="rounded-lg p-1.5 text-gray-450 transition-colors hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-gray-850 dark:hover:text-emerald-400"
                    title="Informar peso real de balança"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3.5 print:hidden">
              {!isSavedInDb ? (
                <button
                  id="assessment-btn-save-to-history"
                  onClick={() => {
                    onSaveToHistory({
                      ...record,
                      weight: currentWeight,
                      isRealWeight: currentIsRealWeight,
                    });
                    setLocalWeight(null);
                    setLocalIsRealWeight(null);
                    setIsEditingWeight(false);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1e3a8a] text-sm font-sans font-bold text-white shadow-sm transition-colors hover:bg-blue-900 dark:bg-blue-800 dark:hover:bg-blue-900"
                >
                  <FileCheck className="h-4.5 w-4.5 text-sky-300" />
                  <span>Salvar no Histórico</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-center text-xs font-medium text-emerald-700 shadow-xs dark:bg-emerald-500/5 dark:text-emerald-450">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Laudo sincronizado com o histórico</span>
                  </div>
                  {(localWeight !== null || localIsRealWeight !== null) && (
                    <button
                      onClick={() => {
                        onSaveToHistory({
                          ...record,
                          weight: currentWeight,
                          isRealWeight: currentIsRealWeight,
                        });
                        setLocalWeight(null);
                        setLocalIsRealWeight(null);
                        setIsEditingWeight(false);
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-750 text-xs font-sans font-semibold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-indigo-850 hover:shadow-lg active:scale-98 dark:from-sky-700 dark:to-blue-800"
                    >
                      <FileCheck className="h-4 w-4 text-sky-200" />
                      <span>Atualizar Registro no Histórico</span>
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="assessment-btn-print"
                  onClick={handlePrint}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 text-xs font-sans font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:from-blue-800 hover:to-blue-900 hover:scale-[1.01] hover:shadow-lg active:scale-98 dark:from-blue-800 dark:to-indigo-900"
                >
                  <Printer className="h-4 w-4 text-sky-200" />
                  <span>{isPrinting ? 'Preparando...' : 'Imprimir Registro'}</span>
                </button>

                <button
                  id="assessment-btn-share"
                  onClick={handleShare}
                  className="relative flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-200/50 bg-white text-xs font-sans font-bold uppercase tracking-wider text-blue-900 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-gray-50/80 hover:scale-[1.01] hover:shadow-md active:scale-98 dark:border-blue-900/40 dark:bg-gray-950 dark:text-sky-300 dark:hover:bg-gray-900"
                >
                  <Share2 className="h-4 w-4 text-blue-700 dark:text-sky-400" />
                  <span>Compartilhar</span>
                  {showSharePopup && (
                    <span className="absolute -top-11 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-[10px] text-white shadow-xl whitespace-nowrap animate-bounce dark:bg-gray-800">
                      ✓ Registro copiado para compartilhar!
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
